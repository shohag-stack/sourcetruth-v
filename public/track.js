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

  if (ref) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ slug: ref, captured_at: Date.now() }))
    fetch(`${ORIGIN}/api/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: ref, site_key: SITE_KEY, referrer: document.referrer }),
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
})()