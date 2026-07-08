// public/track.js
(function() {
  const STORAGE_KEY = 'st_ref';
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const SITE_KEY = document.currentScript?.getAttribute('data-site') || window.ST_SITE_KEY;

  const params = new URLSearchParams(window.location.search);
  const ref = params.get('st');

  if (ref) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ slug: ref, captured_at: Date.now() }));

    fetch('https://sourcetruth.io/api/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: ref, site_key: SITE_KEY, referrer: document.referrer }),
    }).catch(() => {});
  }

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

  window.SourceTruth = {
    identify: async function(email) {
      const slug = getStoredSlug();
      if (!email) return;
      try {
        await fetch('https://sourcetruth.io/api/identify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, slug, site_key: SITE_KEY }),
        });
      } catch (e) {}
    }
  };

  document.addEventListener('submit', function(e) {
    const emailInput = e.target.querySelector && e.target.querySelector('input[type="email"]');
    if (emailInput && emailInput.value) window.SourceTruth.identify(emailInput.value);
  });
})();