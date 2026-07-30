(function () {
  const STORAGE_KEY = "st_ref"; // post-level attribution — SourceTruth's own feature, unchanged behavior
  const TOUCH_KEY = "st_touch"; // NEW — general first-touch record, for every visitor, DataFast-style
  const SESSION_KEY = "st_session_id";
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const ORIGIN = "https://sourcetruth-v.vercel.app";
  const SITE_KEY =
    document.currentScript?.getAttribute("data-site") || window.ST_SITE_KEY;

  // ── Session ID ──────────────────────────────────────────────
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId =
      Math.random().toString(36).substring(2) + Date.now().toString(36);
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }

  function parseReferrerSource(referrer) {
    if (!referrer) return "direct"; // also hit by in-app browsers that strip referrer entirely
    try {
      const host = new URL(referrer).hostname.replace(/^www\./, "");
      return host; // e.g. "marclou.com" — a real backlink, not a recognized platform
    } catch (e) {
      return "direct";
    }
  }

  // Client-side UA parse — mirrors /api/click's server-side parseUA so
  // device/os/browser are known for EVERY visitor, not just ones who
  // hit that endpoint (i.e. arrived via a tracked ?st= link).
  function parseUA(ua) {
    const device = /Mobile|Android|iPhone/i.test(ua)
      ? "mobile"
      : /iPad|Tablet/i.test(ua)
      ? "tablet"
      : "desktop";
    const browser = /Chrome/i.test(ua)
      ? "chrome"
      : /Safari/i.test(ua)
      ? "safari"
      : /Firefox/i.test(ua)
      ? "firefox"
      : "other";
    const os = /iPhone|iPad|iOS/i.test(ua)
      ? "ios"
      : /Android/i.test(ua)
      ? "android"
      : /Windows/i.test(ua)
      ? "windows"
      : /Mac/i.test(ua)
      ? "mac"
      : "other";
    return { device, browser, os };
  }

  // ── NEW: general first-touch record, DataFast-style ─────────
  // Set ONCE per visitor (never overwritten), so first_seen_at gives a
  // real "time to convert" and source/device/os/browser reflect how
  // they ACTUALLY first found the site. This exists for EVERY visitor,
  // not just ones who clicked a tracked link — that's the difference
  // from STORAGE_KEY below, which is SourceTruth's own post-attribution
  // feature and keeps its existing (last-tracked-link) behavior.
  function getTouch() {
    const raw = localStorage.getItem(TOUCH_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  let touch = getTouch();
  if (!touch) {
    const { device, browser, os } = parseUA(navigator.userAgent);
    touch = {
      source: parseReferrerSource(document.referrer),
      device: device,
      browser: browser,
      os: os,
      first_seen_at: Date.now(),
    };
    localStorage.setItem(TOUCH_KEY, JSON.stringify(touch));
  }

  // ── UTM / tracked link — post-level attribution, SourceTruth's own
  // feature. Unchanged: overwrites on every new ?st= link clicked
  // (last-touch for POST credit specifically, separate from the
  // first-touch general record above). ──
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("st");

  if (ref) {
    const source = parseReferrerSource(document.referrer);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ slug: ref, source: source, captured_at: Date.now() }),
    );
    fetch(`${ORIGIN}/api/click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: ref,
        site_key: SITE_KEY,
        referrer: document.referrer,
        source: source,
      }),
    }).catch(() => {});
  }

  // ── Pageview ────────────────────────────────────────────────
  const startTime = Date.now();

  fetch(`${ORIGIN}/api/pageview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      site_key: SITE_KEY,
      session_id: sessionId,
      path: window.location.pathname,
      referrer: document.referrer,
      screen_width: window.screen.width,
    }),
  })
    .then((r) => r.json())
    .then((data) => {
      // Store country/city once when first received
      const existing = getTouch() || touch;
      if (!existing.country && data.country) {
        existing.country = data.country;
        existing.city = data.city ?? null;
        touch = existing;
        localStorage.setItem(TOUCH_KEY, JSON.stringify(existing));
      }
    })

    .catch(() => {});

  // ── Session duration ────────────────────────────────────────
  window.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      const duration = Math.round((Date.now() - startTime) / 1000);
      navigator.sendBeacon(
        `${ORIGIN}/api/session`,
        JSON.stringify({
          site_key: SITE_KEY,
          session_id: sessionId,
          path: window.location.pathname,
          duration,
        }),
      );
    }
  });

  // ── Identify ────────────────────────────────────────────────
  function getStoredSlug() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.captured_at > THIRTY_DAYS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data.slug;
  }

  function getStoredSource() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.captured_at > THIRTY_DAYS) return null;
    return data.source ?? null;
  }

  window.SourceTruth = {
    identify: async function (email) {
      const slug = getStoredSlug();
      if (!email) return;
      try {
        await fetch(`${ORIGIN}/api/identify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, slug, site_key: SITE_KEY }),
        });
      } catch (e) {}
    },
  };

  document.addEventListener("submit", function (e) {
    const emailInput =
      e.target.querySelector && e.target.querySelector('input[type="email"]');
    if (emailInput && emailInput.value)
      window.SourceTruth.identify(emailInput.value);
  });

  // ── Attach attribution to Lemon Squeezy checkout links ───────
  // CHANGED: this used to `return` immediately if there was no tracked-
  // link slug, meaning organic/direct visitors got ZERO attribution data
  // on their purchase. That's the actual gap vs. DataFast — they
  // attribute every visitor, not just ones who clicked a special link.
  // Now: st_ref/st_source (post-level) only attach when a slug exists,
  // but device/os/browser/first_seen ALWAYS attach, for every visitor.
  const LS_LINK_PATTERN = /lemonsqueezy\.com\/(checkout|buy)/i;

  function isLemonSqueezyLink(href) {
    return LS_LINK_PATTERN.test(href);
  }

  function attachRefToCheckoutLinks() {
    const slug = getStoredSlug();
    // post-click source wins if this visit came through a tracked link;
    // otherwise fall back to the general first-touch source


    const clickSource = getStoredSource(); // Source of the tracked link
    const firstSource = touch.source;      // Visitor's first-touch source


    const t = getTouch() || touch;
    const patchTag = slug || "general";

    document.querySelectorAll("a[href]").forEach(function (a) {
      const href = a.getAttribute("href");
      if (!href || !isLemonSqueezyLink(href)) return;
      if (a.dataset.stPatched === patchTag) return;

      try {
        const url = new URL(href, window.location.href);
        if (slug) url.searchParams.set("checkout[custom][st_ref]", slug);
        if (SITE_KEY)
          url.searchParams.set("checkout[custom][st_site]", SITE_KEY);
        
        if (clickSource) {
          url.searchParams.set(
            "checkout[custom][st_click_source]",
            clickSource
          );
        }

        if (firstSource) {
          url.searchParams.set(
            "checkout[custom][st_first_source]",
            firstSource
          );
        }


        if (t) {
          url.searchParams.set("checkout[custom][st_device]", t.device);
          url.searchParams.set("checkout[custom][st_os]", t.os);
          url.searchParams.set("checkout[custom][st_browser]", t.browser);
          url.searchParams.set(
            "checkout[custom][st_first_seen]",
            String(t.first_seen_at),
          );
        };

        // NEW
        if (t.country) {
          url.searchParams.set('checkout[custom][st_country]', t.country)
        }
        if (t.city) {
          url.searchParams.set('checkout[custom][st_city]', t.city)
        }

        a.setAttribute("href", url.toString());
        a.dataset.stPatched = patchTag;
      } catch (e) {
        // malformed href, skip it
      }
    });
  }

  attachRefToCheckoutLinks();

  const observer = new MutationObserver(attachRefToCheckoutLinks);
  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
