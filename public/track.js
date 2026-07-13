(function() {
  const STORAGE_KEY = 'st_ref'
  const SESSION_KEY = 'st_session_id'
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000
  const ORIGIN = 'https://sourcetruth-v.vercel.app'
  const SITE_KEY = document.currentScript?.getAttribute('data-site') || window.ST_SITE_KEY

  // ── Session ID ──────────────────────────────────────────────
  // sessionStorage clears when tab closes → new session on next visit
  let sessionId = sessionStorage.getItem(SESSION_KEY)
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36)
    sessionStorage.setItem(SESSION_KEY, sessionId)
  }

  // ── UTM / tracked link ──────────────────────────────────────
  const params = new URLSearchParams(window.location.search)
  const ref = params.get('st')

  // Real ground-truth source, parsed from the referring page's hostname
  // at the exact moment they land via the tracked link. This is captured
  // NOW because by the time they reach checkout, document.referrer will
  // just be whatever page on your own site they were last on — not the
  // social platform they actually came from.
  function parseReferrerSource(referrer) {
    if (!referrer) return 'direct' // also hit by in-app browsers that strip referrer entirely
    try {
      const host = new URL(referrer).hostname.replace(/^www\./, '')
      if (/linkedin\.com|lnkd\.in/.test(host)) return 'linkedin'
      if (/twitter\.com|t\.co|x\.com/.test(host)) return 'twitter'
      if (/facebook\.com|fb\.me|fb\.watch/.test(host)) return 'facebook'
      if (/instagram\.com/.test(host)) return 'instagram'
      if (/threads\.net/.test(host)) return 'threads'
      if (/bsky\.app/.test(host)) return 'bluesky'
      return host
    } catch (e) {
      return 'direct'
    }
  }

  if (ref) {
    const source = parseReferrerSource(document.referrer)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ slug: ref, source: source, captured_at: Date.now() }))
    fetch(`${ORIGIN}/api/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: ref, site_key: SITE_KEY, referrer: document.referrer, source: source }),
    }).catch(() => {})
  }

  // ── Pageview ────────────────────────────────────────────────
  const startTime = Date.now()

  fetch(`${ORIGIN}/api/pageview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      site_key: SITE_KEY,
      session_id: sessionId,
      path: window.location.pathname,
      referrer: document.referrer,
      screen_width: window.screen.width,
    }),
  }).catch(() => {})

  // ── Session duration ────────────────────────────────────────
  // sendBeacon works even when page is closing
  window.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
      const duration = Math.round((Date.now() - startTime) / 1000)
      navigator.sendBeacon(
        `${ORIGIN}/api/session`,
        JSON.stringify({
          site_key: SITE_KEY,
          session_id: sessionId,
          path: window.location.pathname,
          duration,
        })
      )
    }
  })

  // ── Identify ────────────────────────────────────────────────
  function getStoredSlug() {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (Date.now() - data.captured_at > THIRTY_DAYS) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return data.slug
  }

  function getStoredSource() {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (Date.now() - data.captured_at > THIRTY_DAYS) return null
    return data.source ?? null
  }

  window.SourceTruth = {
    identify: async function(email) {
      const slug = getStoredSlug()
      if (!email) return
      try {
        await fetch(`${ORIGIN}/api/identify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, slug, site_key: SITE_KEY }),
        })
      } catch (e) {}
    }
  }

  document.addEventListener('submit', function(e) {
    const emailInput = e.target.querySelector && e.target.querySelector('input[type="email"]')
    if (emailInput && emailInput.value) window.SourceTruth.identify(emailInput.value)
  })

  // ── NEW: attach attribution to Lemon Squeezy checkout links ──
  // This is the actual missing link. Without this, nothing ever tells
  // Lemon Squeezy which slug a purchase came from — visitors/identify
  // never sees LS checkout emails (that form lives on LS's own domain/
  // iframe), so this was the only way attribution could have worked.
  //
  // Lemon.js (the overlay embed) reads the href on the <a> at click time,
  // and passes any checkout[custom][...] query params straight through
  // to `meta.custom_data` in the webhook payload. So we just need to make
  // sure the slug is sitting in the href before the click happens.
  const LS_LINK_PATTERN = /lemonsqueezy\.com\/(checkout|buy)/i

  function isLemonSqueezyLink(href) {
    return LS_LINK_PATTERN.test(href)
  }

  function attachRefToCheckoutLinks() {
    const slug = getStoredSlug()
    if (!slug) return
    const source = getStoredSource()

    document.querySelectorAll('a[href]').forEach(function(a) {
      const href = a.getAttribute('href')
      if (!href || !isLemonSqueezyLink(href)) return
      // already patched, don't re-append on repeat DOM scans
      if (a.dataset.stPatched === slug) return

      try {
        const url = new URL(href, window.location.href)
        url.searchParams.set('checkout[custom][st_ref]', slug)
        if (SITE_KEY) url.searchParams.set('checkout[custom][st_site]', SITE_KEY)
        // real ground-truth source (from referrer at click time), NOT
        // the post's configured channel — this is the actual fix for
        // "source shows LinkedIn even though the sale came from Twitter"
        if (source) url.searchParams.set('checkout[custom][st_source]', source)
        a.setAttribute('href', url.toString())
        a.dataset.stPatched = slug
      } catch (e) {
        // malformed href, skip it
      }
    })
  }

  attachRefToCheckoutLinks()

  // Lemon.js buttons are sometimes rendered after this script runs
  // (client-side frameworks, lazy widgets) — catch late arrivals.
  const observer = new MutationObserver(attachRefToCheckoutLinks)
  observer.observe(document.body || document.documentElement, { childList: true, subtree: true })
})()