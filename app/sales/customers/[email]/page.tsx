// app/revenue/customers/[email]/page.tsx
import Link from 'next/link'
import { AppShell } from '@/components/layout/AppShell'
import { countryFlag } from '@/lib/countryFlag'
import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'

// ─── Helpers (mirrors app/revenue/page.tsx — worth extracting to
// lib/revenueFormat.ts once a third page needs these) ───────────
function formatMoney(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function timeToConvert(firstSeenAt: string | null, receivedAt: string): string | null {
  if (!firstSeenAt) return null
  const ms = new Date(receivedAt).getTime() - new Date(firstSeenAt).getTime()
  if (ms < 0) return null
  const seconds = ms / 1000
  if (seconds < 3600) return 'Same visit'
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`
  return `${Math.round(seconds / 86400)}d`
}

// Gap between two purchases, for the "returning after X" timeline label
function gapBetween(prevReceivedAt: string, receivedAt: string): string {
  const seconds = (new Date(receivedAt).getTime() - new Date(prevReceivedAt).getTime()) / 1000
  if (seconds < 86400) return `${Math.max(1, Math.round(seconds / 3600))}h later`
  if (seconds < 86400 * 30) return `${Math.round(seconds / 86400)}d later`
  return `${Math.round(seconds / (86400 * 30))}mo later`
}

function maskEmail(email: string | null): string {
  if (!email) return 'Unknown'
  const [local, domain] = email.split('@')
  if (!domain) return email
  const visible = local.slice(0, 3)
  return `${visible}${'*'.repeat(Math.max(local.length - 3, 3))}@${domain}`
}

const PROVIDER_META: Record<string, { name: string; icon: string }> = {
  lemon_squeezy: { name: 'Lemon Squeezy', icon: '🍋' },
  stripe: { name: 'Stripe', icon: '◈' },
  paddle: { name: 'Paddle', icon: '◉' },
  gumroad: { name: 'Gumroad', icon: '◆' },
  woocommerce: { name: 'WooCommerce', icon: '◇' },
}

const CHANNEL_META: Record<string, { name: string; color: string; bgColor: string; icon: string }> = {
  linkedin: { name: 'LinkedIn', color: '#0077B5', bgColor: '#EFF7FF', icon: 'in' },
  twitter: { name: 'Twitter / X', color: '#000000', bgColor: '#F7F7F7', icon: '𝕏' },
  facebook: { name: 'Facebook', color: '#1877F2', bgColor: '#EEF4FF', icon: 'f' },
  instagram: { name: 'Instagram', color: '#E1306C', bgColor: '#FFF0F5', icon: '◎' },
  threads: { name: 'Threads', color: '#000000', bgColor: '#F5F5F5', icon: '@' },
  bluesky: { name: 'Bluesky', color: '#0085FF', bgColor: '#EFF6FF', icon: '🦋' },
  direct: { name: 'Direct', color: '#5B5B5B', bgColor: '#F7F6F4', icon: '→' },
}

function sourceMeta(source: string | null) {
  if (!source) return { name: 'Unknown', color: '#5B5B5B', bgColor: '#F7F6F4', icon: '●' }
  return CHANNEL_META[source] ?? { name: source, color: '#5B5B5B', bgColor: '#F7F6F4', icon: '🔗' }
}

const DEVICE_ICON: Record<string, string> = { desktop: '🖥️', mobile: '📱', tablet: '📱' }
const OS_LABEL: Record<string, string> = { mac: 'Mac OS', windows: 'Windows', ios: 'iOS', android: 'Android', other: 'Unknown OS' }
const BROWSER_LABEL: Record<string, string> = { chrome: 'Chrome', safari: 'Safari', firefox: 'Firefox', other: 'Unknown browser' }

export default async function CustomerJourneyPage({
  params,
}: {
  params: Promise<{ email: string }>
}) {
  const { email: encodedEmail } = await params
  const email = decodeURIComponent(encodedEmail)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: site } = await supabase
    .from('sites')
    .select('id, name, domain')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!site) redirect('/revenue')

  // ── Every purchase this customer has made on this site, oldest first
  // so the timeline reads as an actual journey ──
  const { data: conversions } = await supabase
    .from('conversions')
    .select(`
      id,
      provider,
      order_id,
      customer_email,
      amount_cents,
      currency,
      product_name,
      source,
      country,
      device,
      first_source,
      os,
      browser,
      first_seen_at,
      received_at,
      post_id,
      posts (
        id,
        content,
        channel,
        slug
      )
    `)
    .eq('site_id', site.id)
    .eq('customer_email', email)
    .eq('refunded', false)
    .order('received_at', { ascending: true })

  const rows = conversions ?? []

  if (rows.length === 0) notFound()

  const totalCents = rows.reduce((sum, c) => sum + (c.amount_cents ?? 0), 0)
  const first = rows[0]
  const last = rows[rows.length - 1]

  // Country / device most associated with this customer — just the value
  // seen on their first conversion, since that's their "acquisition" context
  const acquisitionSrc = sourceMeta(first.first_source ?? first.source)
  const acquisitionConvertTime = timeToConvert(first.first_seen_at, first.received_at)

  const distinctPosts = new Map<string, { content: string; channel: string | null; slug: string | null }>()
  rows.forEach(c => {
    const post = Array.isArray(c.posts) ? c.posts[0] : c.posts
    if (post?.id) distinctPosts.set(post.id, { content: post.content, channel: post.channel, slug: post.slug })
  })

  return (
    <AppShell>
      <div className="p-8 max-w-4xl mx-auto">

        <Link href="/revenue" className="text-body-sm text-muted hover:text-primary transition-colors inline-flex items-center gap-1 mb-4">
          ← Back to Revenue
        </Link>

        {/* ── Customer header ── */}
        <div className="card p-6 mb-6 flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-surface-muted flex items-center justify-center text-xl font-bold text-body flex-shrink-0">
            {email.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-heading-lg text-ink mb-0.5 truncate">{maskEmail(email)}</h1>
            <div className="flex items-center gap-2 text-caption text-muted normal-case font-normal flex-wrap">
              {first.country && <span>{countryFlag(first.country)} {first.country}</span>}
              <span>Customer since {formatDateTime(first.received_at)}</span>
              {rows.length > 1 && <span className="badge-success">Returning customer</span>}
            </div>
          </div>
        </div>

        {/* ── Summary stats ── */}
        <div className="card mb-6 grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-line">
          <div className="p-5">
            <div className="text-body-sm text-body mb-2">Lifetime Value</div>
            <div className="text-2xl font-bold text-ink tabular">{formatMoney(totalCents)}</div>
          </div>
          <div className="p-5">
            <div className="text-body-sm text-body mb-2">Purchases</div>
            <div className="text-2xl font-bold text-ink tabular">{rows.length}</div>
          </div>
          <div className="p-5">
            <div className="text-body-sm text-body mb-2">Acquired via</div>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold"
                style={{ backgroundColor: acquisitionSrc.bgColor, color: acquisitionSrc.color }}
              >
                {acquisitionSrc.icon} {acquisitionSrc.name}
              </span>
            </div>
          </div>
          <div className="p-5">
            <div className="text-body-sm text-body mb-2">First converted in</div>
            <div className="text-2xl font-bold text-ink tabular">{acquisitionConvertTime ?? '—'}</div>
          </div>
        </div>

        {/* ── Posts that drove this customer ── */}
        {distinctPosts.size > 0 && (
          <div className="bg-primary-tint rounded-2xl p-4 mb-6 flex items-start gap-3">
            <span className="text-primary text-lg">📝</span>
            <div className="text-body-sm text-primary leading-relaxed">
              <strong>{distinctPosts.size === 1 ? 'Driven by this post: ' : `Touched ${distinctPosts.size} tracked posts: `}</strong>
              {Array.from(distinctPosts.values()).map((p, i) => (
                <span key={i}>
                  {i > 0 && ', '}
                  "{p.content.slice(0, 50)}{p.content.length > 50 ? '…' : ''}"
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Journey timeline ── */}
        <h2 className="text-heading-sm text-ink mb-3">Purchase Timeline</h2>
        <div className="relative">
          {/* connecting line */}
          {rows.length > 1 && (
            <div className="absolute left-5 top-5 bottom-5 w-px bg-line" aria-hidden="true" />
          )}

          <div className="space-y-4">
            {rows.map((conv, i) => {
              const providerMeta = PROVIDER_META[conv.provider] ?? { name: conv.provider, icon: '◈' }
              const post = Array.isArray(conv.posts) ? conv.posts[0] : conv.posts
              const src = sourceMeta(conv.first_source ?? conv.source)
              const convertTime = timeToConvert(conv.first_seen_at, conv.received_at)
              const prev = i > 0 ? rows[i - 1] : null

              return (
                <div key={conv.id} className="relative pl-12">
                  <div className="absolute left-0 top-1 w-10 h-10 rounded-full bg-surface flex items-center justify-center text-sm font-bold text-body border-2 border-line z-10">
                    {i + 1}
                  </div>

                  {prev && (
                    <div className="text-caption text-muted normal-case font-normal mb-1.5">
                      {gapBetween(prev.received_at, conv.received_at)}
                    </div>
                  )}

                  <div className="card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold"
                          style={{ backgroundColor: src.bgColor, color: src.color }}
                        >
                          {src.icon} {src.name}
                        </span>
                        <span className="text-body-sm text-body">{providerMeta.icon} {providerMeta.name}</span>
                      </div>
                      <div className="text-body-sm font-bold text-success tabular">
                        +{formatMoney(conv.amount_cents)}
                      </div>
                    </div>

                    <div className="text-body-sm text-ink font-medium mb-1">
                      {conv.product_name ?? 'Purchase'}
                    </div>

                    {post?.content && (
                      <p className="text-[11px] text-success font-medium truncate mt-1" title={post.content}>
                        via "{post.content.slice(0, 60)}{post.content.length > 60 ? '…' : ''}"
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-caption text-muted normal-case font-normal mt-2 flex-wrap">
                      {conv.device && <span>{DEVICE_ICON[conv.device] ?? '●'} {conv.device}</span>}
                      {conv.os && <span>{OS_LABEL[conv.os] ?? conv.os}</span>}
                      {conv.browser && <span>{BROWSER_LABEL[conv.browser] ?? conv.browser}</span>}
                      {convertTime && <span>⏱ {convertTime} to convert</span>}
                      <span title={formatDateTime(conv.received_at)}>{timeAgo(conv.received_at)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </AppShell>
  )
}