'use client'
// app/page.tsx
// Full landing page — hero, how it works, features, pricing, reviews, FAQ, newsletter, footer

import Link from 'next/link'

// ─── Data ─────────────────────────────────────────────────────

const PLANS = [
  {
    name: 'Free',
    price: 0,
    sub: 'Forever free',
    sites: 1,
    mav: '5,000',
    links: 10,
    history: '30 days',
    highlight: false,
    cta: 'Start free',
    href: '/auth/login',
    features: [
      '1 site',
      '5,000 visitors/month',
      '10 tracked post links',
      '30 days history',
      'Visitor analytics',
      'Post revenue attribution',
      'Community support',
    ],
    missing: ['Custom domain links', 'API access', 'Priority support'],
  },
  {
    name: 'Starter',
    price: 19,
    sub: 'Per month',
    sites: 3,
    mav: '50,000',
    links: 100,
    history: '90 days',
    highlight: false,
    cta: 'Start free trial',
    href: '/auth/login',
    features: [
      '3 sites',
      '50,000 visitors/month',
      '100 tracked post links',
      '90 days history',
      'Visitor analytics',
      'Post revenue attribution',
      'Email support',
    ],
    missing: ['Custom domain links', 'API access'],
  },
  {
    name: 'Pro',
    price: 49,
    sub: 'Per month',
    sites: 10,
    mav: '200,000',
    links: -1,
    history: '1 year',
    highlight: true,
    cta: 'Start free trial',
    href: '/auth/login',
    features: [
      '10 sites',
      '200,000 visitors/month',
      'Unlimited tracked links',
      '1 year history',
      'Visitor analytics',
      'Post revenue attribution',
      'Custom domain links',
      'API access',
      'Priority support',
    ],
    missing: [],
  },
  {
    name: 'Agency',
    price: 99,
    sub: 'Per month',
    sites: -1,
    mav: '500,000',
    links: -1,
    history: '2 years',
    highlight: false,
    cta: 'Start free trial',
    href: '/auth/login',
    features: [
      'Unlimited sites',
      '500,000 visitors/month',
      'Unlimited tracked links',
      '2 years history',
      'Visitor analytics',
      'Post revenue attribution',
      'Custom domain links',
      'API access',
      'White-label reports',
      'Dedicated support',
    ],
    missing: [],
  },
]

const REVIEWS = [
  {
    name: 'Alex Morgan',
    handle: '@alexmorgan',
    role: 'Indie Hacker',
    avatar: 'AM',
    text: "I was posting on LinkedIn every day with no idea what was working. SourceTruth showed me one post drove $2,400 in a week. I write that type of post exclusively now.",
    stars: 5,
  },
  {
    name: 'Priya Sharma',
    handle: '@priyabuilds',
    role: 'SaaS Founder',
    avatar: 'PS',
    text: "Finally replaced my spreadsheet-GA4-Stripe juggling act. Everything I need to know about where my revenue comes from is in one dashboard.",
    stars: 5,
  },
  {
    name: 'Tom Eriksen',
    handle: '@tomdesigns',
    role: 'Freelance Designer',
    avatar: 'TE',
    text: "Set it up in 5 minutes. The next morning I could see my Instagram post sent 3 clients to my pricing page. That data alone is worth the subscription.",
    stars: 5,
  },
  {
    name: 'Nina Kovács',
    handle: '@ninacreates',
    role: 'Digital Creator',
    avatar: 'NK',
    text: "The bounce rate and session data help me know which pages convert visitors. Combined with post attribution I finally know what's actually working.",
    stars: 5,
  },
  {
    name: 'James Wu',
    handle: '@jameswudev',
    role: 'Developer & Blogger',
    avatar: 'JW',
    text: "I tried GA4, Plausible, Fathom. None of them told me which specific tweet made me money. SourceTruth does. It's the missing layer I needed.",
    stars: 5,
  },
  {
    name: 'Sara Mitchell',
    handle: '@sarabuilds',
    role: 'Agency Owner',
    avatar: 'SM',
    text: "We use it for 8 client sites now. The multi-site dashboard is clean and the visitor analytics rival what we were paying $80/mo for elsewhere.",
    stars: 5,
  },
]

const FAQS = [
  {
    q: 'How is SourceTruth different from Google Analytics?',
    a: "GA4 tells you traffic came from LinkedIn. SourceTruth tells you your June 24th post about pricing specifically earned $3,240. It connects individual social posts to real revenue — something GA4 can't do without hours of manual UTM setup that still breaks on mobile.",
  },
  {
    q: 'How does post attribution work?',
    a: "You generate a tracked link for your post in SourceTruth. Share that link anywhere — LinkedIn, Twitter, email, wherever. When someone clicks it we store where they came from. When they buy via Lemon Squeezy, Stripe, Gumroad, or Paddle the payment gets attributed back to that exact post.",
  },
  {
    q: 'Does it work with Instagram and TikTok where links don\'t work in posts?',
    a: "Yes. Put the tracked link in your bio or story. Anyone who clicks from your content gets attributed. For Instagram specifically the link-in-bio approach works perfectly — we track which profile visitors convert.",
  },
  {
    q: 'What is a Monthly Active Visitor (MAV)?',
    a: "An MAV is a unique person who visits your site in a given month, counted by a privacy-first fingerprint — no cookies, no personal data. If the same person visits 10 times in a month they count as 1 MAV. Your limit resets on the 1st of every month.",
  },
  {
    q: 'Do I need to install anything complicated?',
    a: "Just one script tag before </head> on your site. Copy it from Settings, paste it in. Takes 2 minutes. Works with any website — Next.js, Framer, Webflow, WordPress, custom HTML.",
  },
  {
    q: 'Which payment providers do you support?',
    a: "Lemon Squeezy, Stripe, Gumroad, and Paddle. Connect your provider in Settings with your API key — we register a webhook automatically and every payment gets attributed to its source post within seconds.",
  },
  {
    q: 'Is visitor data private and GDPR compliant?',
    a: "Yes. We use a salted IP hash for unique visitor detection — we never store raw IPs or personal data. No cookies are used for tracking. Visitor analytics are aggregated and anonymised. You can add SourceTruth to your site without a cookie banner.",
  },
  {
    q: 'What happens if I go over my MAV limit?',
    a: "We don't cut off tracking. We show an upgrade prompt in your dashboard. Your data keeps recording — we just flag that you've exceeded the limit so you can upgrade at your own pace. No surprise data gaps.",
  },
]

// ─── Components ────────────────────────────────────────────────

function Stars({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} className="w-4 h-4 text-amber-400 fill-amber-400" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
      ))}
    </div>
  )
}

function Check() {
  return (
    <svg className="w-4 h-4 text-success flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
    </svg>
  )
}

function Cross() {
  return (
    <svg className="w-4 h-4 text-muted flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="bg-bg min-h-screen font-sans">

      {/* ── NAV ──────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-line bg-bg/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">S</div>
            <span className="font-semibold text-ink">SourceTruth</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-body-sm text-body">
            <a href="#how-it-works" className="hover:text-ink transition-colors">How it works</a>
            <a href="#features"     className="hover:text-ink transition-colors">Features</a>
            <a href="#pricing"      className="hover:text-ink transition-colors">Pricing</a>
            <a href="#faq"          className="hover:text-ink transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/auth/login"  className="text-body-sm text-body hover:text-ink transition-colors px-3 py-2">Sign in</Link>
            <Link href="/auth/login"  className="btn-primary text-body-sm">Start free →</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-success-tint border border-success/20 text-success px-3.5 py-1.5 rounded-full text-body-sm font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse flex-shrink-0" />
          Works with Lemon Squeezy, Stripe, Gumroad & Paddle
        </div>

        <h1 className="text-[52px] md:text-[64px] font-bold text-ink leading-[1.08] tracking-tight mb-6">
          Which post made
          <br />
          <span className="text-primary">you money?</span>
        </h1>

        <p className="text-[18px] text-body max-w-2xl mx-auto mb-4 leading-relaxed">
          SourceTruth connects every social post to real revenue and gives you full visitor analytics — so you stop guessing and start knowing what works.
        </p>
        <p className="text-body-sm text-muted mb-10">
          One script tag. No cookies. GDPR compliant. Setup in 2 minutes.
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/auth/login" className="btn-primary text-[15px] px-7 py-3">
            Start free — no card needed →
          </Link>
          <Link href="#how-it-works" className="text-[15px] px-7 py-3 border border-line rounded-xl text-body hover:text-ink hover:border-strong transition-all">
            See how it works
          </Link>
        </div>

        {/* Social proof numbers */}
        <div className="mt-14 flex items-center justify-center gap-8 flex-wrap text-center">
          {[
            { value: '$2.4M+', label: 'Revenue attributed' },
            { value: '1,200+', label: 'Sites tracked' },
            { value: '4.9/5',  label: 'Average rating'   },
          ].map(s => (
            <div key={s.label}>
              <div className="text-2xl font-bold text-ink tabular">{s.value}</div>
              <div className="text-body-sm text-muted mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAKE DASHBOARD PREVIEW ───────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="card overflow-hidden shadow-card-hover">
          {/* Fake browser chrome */}
          <div className="bg-surface-muted border-b border-line px-4 py-3 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 bg-surface border border-line rounded-lg px-3 py-1 text-caption text-muted text-center">
              sourcetruth.io/dashboard
            </div>
          </div>
          {/* Fake dashboard */}
          <div className="p-6 bg-surface">
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Revenue', value: '$14,830', trend: '+23%', positive: true  },
                { label: 'Visitors', value: '8,420',  trend: '+11%', positive: true  },
                { label: 'Top source', value: 'LinkedIn', trend: '42% share', positive: true },
                { label: 'Conv. rate', value: '2.21%', trend: 'This month', positive: true },
              ].map(s => (
                <div key={s.label} className="card p-4">
                  <div className="text-caption text-muted mb-1">{s.label}</div>
                  <div className="text-[18px] font-bold text-ink tabular">{s.value}</div>
                  <div className={`text-caption font-medium mt-0.5 ${s.positive ? 'text-success' : 'text-muted'}`}>{s.trend}</div>
                </div>
              ))}
            </div>
            {/* Fake post rows */}
            <div className="card overflow-hidden">
              <div className="px-4 py-2.5 border-b border-line bg-surface-muted grid grid-cols-[1fr_80px_80px_90px] gap-4 text-caption text-muted font-semibold uppercase tracking-widest">
                <span>Post</span><span>Clicks</span><span>Sales</span><span className="text-right">Revenue</span>
              </div>
              {[
                { content: 'After 3 years of freelancing here\'s what I learned about pricing your design work...', channel: 'LinkedIn', clicks: '1.8k', sales: 41, rev: '$3,240' },
                { content: 'I just launched my Figma component library — 400+ components, dark + light mode...', channel: 'Instagram', clicks: '2.2k', sales: 36, rev: '$2,890' },
                { content: 'Hot take: Most SaaS landing pages fail because they explain features, not outcomes...', channel: 'LinkedIn', clicks: '980',  sales: 22, rev: '$1,760' },
              ].map((row, i) => (
                <div key={i} className="px-4 py-3 border-b border-line last:border-0 grid grid-cols-[1fr_80px_80px_90px] gap-4 items-center">
                  <div>
                    <p className="text-body-sm text-ink truncate">{row.content}</p>
                    <span className="text-caption text-primary font-medium">{row.channel}</span>
                  </div>
                  <span className="text-body-sm text-body tabular">{row.clicks}</span>
                  <span className="text-body-sm text-body tabular">{row.sales}</span>
                  <span className="text-body-sm font-bold text-success tabular text-right">{row.rev}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── LOGOS / INTEGRATIONS ─────────────────────────────── */}
      <section className="border-y border-line bg-surface-muted py-10">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-caption text-muted uppercase tracking-widest mb-6">Works with your existing stack</p>
          <div className="flex items-center justify-center gap-6 flex-wrap">
            {[
              { icon: '🍋', name: 'Lemon Squeezy' },
              { icon: '◈',  name: 'Stripe'         },
              { icon: '◆',  name: 'Gumroad'        },
              { icon: '◉',  name: 'Paddle'         },
              { icon: '💼', name: 'LinkedIn'       },
              { icon: '𝕏',  name: 'Twitter / X'   },
              { icon: '◎',  name: 'Instagram'      },
              { icon: 'f',  name: 'Facebook'       },
              { icon: '@',  name: 'Threads'        },
            ].map(p => (
              <div key={p.name} className="flex items-center gap-1.5 text-body-sm text-body px-3 py-2 bg-surface border border-line rounded-xl">
                <span>{p.icon}</span>{p.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <p className="text-caption text-primary uppercase tracking-widest font-semibold mb-3">How it works</p>
          <h2 className="text-heading-lg text-ink text-[36px] font-bold mb-3">Set up in 3 steps</h2>
          <p className="text-body-sm text-muted max-w-md mx-auto">No developer needed. No complex config. Works on any website.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: '01',
              icon: '📋',
              title: 'Paste one script',
              desc: 'Add a single script tag before </head> on your site. Works with Next.js, Framer, Webflow, WordPress — anything.',
              code: '<script src="sourcetruth.io/track.js"\n  data-site="st_abc123"></script>',
            },
            {
              step: '02',
              icon: '🔗',
              title: 'Generate tracked links',
              desc: 'Write your post in SourceTruth, generate a tracked link, copy it, and paste it into LinkedIn, Twitter, or wherever you post.',
              code: 'sourcetruth.io/r/x7k9mq\n→ yoursite.com/product\n   ?utm_source=linkedin',
            },
            {
              step: '03',
              icon: '💰',
              title: 'See what earned',
              desc: 'Every click and every payment is attributed to the exact post that drove it. See revenue per post, per channel, per day.',
              code: 'LinkedIn post Jun 24\n→ 1,840 clicks\n→ 41 sales → $3,240',
            },
          ].map(s => (
            <div key={s.step} className="card p-6">
              <div className="text-caption text-primary font-bold tracking-widest mb-3">{s.step}</div>
              <div className="text-3xl mb-3">{s.icon}</div>
              <h3 className="text-heading-sm text-ink mb-2">{s.title}</h3>
              <p className="text-body-sm text-body mb-4 leading-relaxed">{s.desc}</p>
              <pre className="bg-surface-muted border border-line rounded-xl p-3 text-[11px] font-mono text-primary leading-relaxed whitespace-pre-wrap">
                {s.code}
              </pre>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section id="features" className="bg-surface-muted border-y border-line">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <div className="text-center mb-14">
            <p className="text-caption text-primary uppercase tracking-widest font-semibold mb-3">Features</p>
            <h2 className="text-[36px] font-bold text-ink mb-3">Everything you need. Nothing you don't.</h2>
            <p className="text-body-sm text-muted max-w-md mx-auto">Two products in one — post revenue attribution and full visitor analytics.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: '📊', title: 'Revenue per post',        desc: 'See exactly how much each LinkedIn post, tweet, or Instagram caption earned. Not channel-level — post-level.' },
              { icon: '👥', title: 'Visitor analytics',       desc: 'Page views, unique visitors, bounce rate, session duration, top pages, countries, devices, browsers.' },
              { icon: '🔗', title: 'Tracked short links',     desc: 'Generate branded tracked links for any post. Solve mobile UTM stripping with server-side cookies.' },
              { icon: '🌍', title: 'Multi-channel',           desc: 'LinkedIn, Twitter, Instagram, Facebook, Threads, Bluesky — track revenue from every platform.' },
              { icon: '💳', title: 'Multi-provider',          desc: 'Lemon Squeezy, Stripe, Gumroad, and Paddle all connect via webhook. Revenue attributed automatically.' },
              { icon: '🔁', title: 'Full attribution journey', desc: 'First-touch, last-touch, and linear attribution models. See customers who took 5 visits before buying.' },
              { icon: '🏷️', title: 'UTM auto-tagging',       desc: 'Links are auto-tagged with UTM params. No manual setup. Works even on mobile where params get stripped.' },
              { icon: '🔒', title: 'Privacy-first',           desc: 'No cookies. No personal data stored. IP addresses are hashed and salted. GDPR compliant by default.' },
              { icon: '⚡', title: 'Real-time',               desc: 'Sales appear in your dashboard within seconds of a webhook firing. No waiting, no batch processing.' },
            ].map(f => (
              <div key={f.title} className="card p-5 bg-surface">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="text-heading-sm text-ink mb-1.5">{f.title}</h3>
                <p className="text-body-sm text-body leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REVIEWS ──────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <p className="text-caption text-primary uppercase tracking-widest font-semibold mb-3">Reviews</p>
          <h2 className="text-[36px] font-bold text-ink mb-3">Loved by indie hackers and agencies</h2>
          <div className="flex items-center justify-center gap-2">
            <Stars />
            <span className="text-body-sm text-body">4.9 out of 5 from 200+ reviews</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {REVIEWS.map(r => (
            <div key={r.handle} className="card p-5 flex flex-col gap-4">
              <Stars count={r.stars} />
              <p className="text-body-sm text-body leading-relaxed flex-1">"{r.text}"</p>
              <div className="flex items-center gap-3 pt-3 border-t border-line">
                <div className="w-9 h-9 rounded-full bg-primary-tint flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                  {r.avatar}
                </div>
                <div>
                  <div className="text-body-sm font-semibold text-ink">{r.name}</div>
                  <div className="text-caption text-muted normal-case font-normal">{r.role} · {r.handle}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────── */}
      <section id="pricing" className="bg-surface-muted border-y border-line">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <div className="text-center mb-14">
            <p className="text-caption text-primary uppercase tracking-widest font-semibold mb-3">Pricing</p>
            <h2 className="text-[36px] font-bold text-ink mb-3">Grow into your plan</h2>
            <p className="text-body-sm text-muted max-w-md mx-auto">
              Priced by Monthly Active Visitors — not pageviews. Pay for real people, not bot traffic.
              All plans include a 14-day free trial.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map(plan => (
              <div key={plan.name}
                className={`rounded-2xl p-6 flex flex-col ${
                  plan.highlight
                    ? 'bg-primary text-white relative'
                    : 'card bg-surface'
                }`}>
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-success text-white text-[11px] font-bold px-3 py-1 rounded-full">
                    Most popular
                  </div>
                )}

                <div className="mb-5">
                  <div className={`text-body-sm font-semibold mb-1 ${plan.highlight ? 'text-white/70' : 'text-muted'}`}>
                    {plan.name}
                  </div>
                  <div className="flex items-baseline gap-1 mb-0.5">
                    <span className={`text-[32px] font-bold tabular ${plan.highlight ? 'text-white' : 'text-ink'}`}>
                      {plan.price === 0 ? 'Free' : `$${plan.price}`}
                    </span>
                    {plan.price > 0 && (
                      <span className={`text-body-sm ${plan.highlight ? 'text-white/60' : 'text-muted'}`}>/mo</span>
                    )}
                  </div>
                  <div className={`text-caption ${plan.highlight ? 'text-white/60' : 'text-muted'} normal-case font-normal`}>
                    {plan.sites === -1 ? 'Unlimited' : plan.sites} sites · {plan.mav} MAV/mo
                  </div>
                </div>

                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-body-sm">
                      {plan.highlight ? (
                        <svg className="w-4 h-4 text-white flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                      ) : <Check />}
                      <span className={plan.highlight ? 'text-white' : 'text-body'}>{f}</span>
                    </li>
                  ))}
                  {plan.missing.map(f => (
                    <li key={f} className="flex items-start gap-2 text-body-sm opacity-40">
                      <Cross />
                      <span className="text-body">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link href={plan.href}
                  className={`text-center py-2.5 rounded-xl font-medium text-body-sm transition-all ${
                    plan.highlight
                      ? 'bg-white text-primary hover:bg-white/90'
                      : 'btn-primary'
                  }`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-body-sm text-muted mt-6">
            All paid plans include a 14-day free trial. No credit card required to start.
            Cancel anytime.
          </p>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <p className="text-caption text-primary uppercase tracking-widest font-semibold mb-3">FAQ</p>
          <h2 className="text-[36px] font-bold text-ink">Common questions</h2>
        </div>

        <div className="space-y-3">
          {FAQS.map(faq => (
            <details key={faq.q} className="card p-5 group">
              <summary className="flex items-center justify-between cursor-pointer list-none text-heading-sm text-ink">
                {faq.q}
                <span className="text-muted text-xl ml-4 flex-shrink-0 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="text-body-sm text-body leading-relaxed mt-4 pt-4 border-t border-line">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* ── NEWSLETTER ───────────────────────────────────────── */}
      <section className="bg-surface-muted border-y border-line">
        <div className="max-w-xl mx-auto px-6 py-20 text-center">
          <div className="text-3xl mb-4">📬</div>
          <h2 className="text-[28px] font-bold text-ink mb-3">Get updates and tips</h2>
          <p className="text-body-sm text-body mb-8 leading-relaxed">
            We write about revenue attribution, social media strategy, and building in public.
            No spam. Unsubscribe anytime.
          </p>
          <form
            action="#"
            className="flex gap-2"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="email"
              placeholder="you@example.com"
              className="flex-1 border border-line focus:border-primary focus:ring-2 focus:ring-primary-tint rounded-xl px-4 py-3 text-body-sm text-ink bg-surface outline-none transition-all placeholder:text-muted"
            />
            <button type="submit" className="btn-primary px-5 py-3 text-body-sm flex-shrink-0">
              Subscribe
            </button>
          </form>
          <p className="text-caption text-muted normal-case font-normal mt-3">
            Join 1,200+ founders and creators
          </p>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-24 text-center">
        <h2 className="text-[40px] font-bold text-ink mb-4 leading-tight">
          Stop guessing.<br />
          <span className="text-primary">Start knowing.</span>
        </h2>
        <p className="text-body-sm text-body max-w-md mx-auto mb-8">
          Set up in 2 minutes. See your first revenue attribution today.
          Free forever — no card required.
        </p>
        <Link href="/auth/login" className="btn-primary text-[15px] px-8 py-3.5 inline-block">
          Start free →
        </Link>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-line bg-surface-muted">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">S</div>
                <span className="font-semibold text-ink">SourceTruth</span>
              </div>
              <p className="text-body-sm text-muted leading-relaxed">
                Revenue attribution and visitor analytics for creators and founders.
              </p>
            </div>

            {/* Product */}
            <div>
              <div className="text-caption text-muted font-semibold uppercase tracking-widest mb-3">Product</div>
              <ul className="space-y-2 text-body-sm text-body">
                {['Features', 'Pricing', 'Changelog', 'Roadmap'].map(l => (
                  <li key={l}><a href="#" className="hover:text-ink transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>

            {/* Integrations */}
            <div>
              <div className="text-caption text-muted font-semibold uppercase tracking-widest mb-3">Integrations</div>
              <ul className="space-y-2 text-body-sm text-body">
                {['Lemon Squeezy', 'Stripe', 'Gumroad', 'Paddle'].map(l => (
                  <li key={l}><a href="#" className="hover:text-ink transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <div className="text-caption text-muted font-semibold uppercase tracking-widest mb-3">Legal</div>
              <ul className="space-y-2 text-body-sm text-body">
                {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR'].map(l => (
                  <li key={l}><a href="#" className="hover:text-ink transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-line pt-6 flex items-center justify-between flex-wrap gap-3">
            <p className="text-caption text-muted normal-case font-normal">
              © {new Date().getFullYear()} SourceTruth. Built for creators who want to know what works.
            </p>
            <div className="flex items-center gap-4">
              {[
                { label: 'Twitter', href: '#' },
                { label: 'LinkedIn', href: '#' },
                { label: 'GitHub', href: '#' },
              ].map(l => (
                <a key={l.label} href={l.href} className="text-caption text-muted hover:text-ink transition-colors normal-case font-normal">
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}