// app/revenue/page.tsx
import { AppShell } from '@/components/layout/AppShell'
import { countryFlag } from '@/lib/countryFlag'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

// ─── Helpers ──────────────────────────────────────────────────
function formatMoney(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// Time from first-ever visit to purchase — the "2 days" DataFast shows.
// Only computable when first_seen_at made it through custom_data (every
// sale going forward should have this; older sales before the track.js
// patch won't).

function timeToConvert(firstSeenAt: string | null, receivedAt: string): string | null {
  if (!firstSeenAt) return null
  const ms = new Date(receivedAt).getTime() - new Date(firstSeenAt).getTime()
  if (ms < 0) return null
  const seconds = ms / 1000
  if (seconds < 3600) return 'Same visit'
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`
  return `${Math.round(seconds / 86400)}d`
}

// Masks an email like DataFast masks names: "dor******@example.com" style
// masking for the local part, since we don't reliably have a real name
// field from Lemon Squeezy's payload — worth confirming attrs.billing_name
// or similar exists before switching to a real name.
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
  return CHANNEL_META[source] ?? { name: source, color: '#5B5B5B', bgColor: '#F7F6F4', icon: '🔗' } // bare hostname, e.g. a backlink
}

const DEVICE_ICON: Record<string, string> = { desktop: '🖥️', mobile: '📱', tablet: '📱' }
const OS_ICON: Record<string, string> = { mac: '', windows: '🪟', ios: '', android: '🤖' }
const OS_LABEL: Record<string, string> = { mac: 'Mac OS', windows: 'Windows', ios: 'iOS', android: 'Android', other: 'Unknown OS' }
const BROWSER_ICON: Record<string, string> = { chrome: '🌐', safari: '🧭', firefox: '🦊' }
const BROWSER_LABEL: Record<string, string> = { chrome: 'Chrome', safari: 'Safari', firefox: 'Firefox', other: 'Unknown browser' }

export default async function RevenuePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // ── Get active site ────────────────────────────────────────
  // TODO: replace with site switcher when multi-site UI is ready
  const { data: site } = await supabase
    .from('sites')
    .select('id, name, domain')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  // ── Connected payment providers ────────────────────────────
  const { data: connections } = await supabase
    .from('payment_connections')
    .select('provider, account_name, connected')
    .eq('user_id', user.id)
    .eq('connected', true)

  // ── Conversions joined with posts — post attribution stays,
  // it's SourceTruth's own differentiator on top of the DataFast-style
  // fields (device/os/browser/first_seen/source) ──
  const { data: conversions } = site
    ? await supabase
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
        .eq('refunded', false)
        .order('received_at', { ascending: false })
        .limit(100)
    : { data: [] }

  const rows = conversions ?? []

  // ── New vs. returning — first occurrence (ascending) of an email in
  // this fetched set counts as "new". Approximate beyond the 100-row
  // window, but correct for anything visible on this page. ──
  const firstSeenEmail = new Set<string>()
  const isReturning = new Map<string, boolean>();[...rows].reverse().forEach(c => {
    if (!c.customer_email) return
    isReturning.set(c.id, firstSeenEmail.has(c.customer_email))
    firstSeenEmail.add(c.customer_email)
  })

  const totalCents = rows.reduce((sum, c) => sum + (c.amount_cents ?? 0), 0)

  const byProvider = rows.reduce<Record<string, number>>((acc, c) => {
    acc[c.provider] = (acc[c.provider] ?? 0) + (c.amount_cents ?? 0)
    return acc
  }, {})

  const csvRows = [
    ['Customer', 'Provider', 'Product', 'Amount', 'Source', 'Country', 'Device', 'OS', 'Browser', 'Date'],
    ...rows.map(c => [
      c.customer_email ?? '',
      c.provider,
      c.product_name ?? '',
      formatMoney(c.amount_cents),
      c.source ?? '',
      c.country ?? '',
      c.device ?? '',
      c.os ?? '',
      c.browser ?? '',
      new Date(c.received_at).toLocaleDateString(),
    ]),
  ]
  const csvData = csvRows.map(r => r.join(',')).join('\n')
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csvData)}`

  return (
    <AppShell>
      <div className="p-8">

        <div className="mb-6">
          <h1 className="text-heading-lg text-ink mb-0.5">Revenue</h1>
          <p className="text-body-sm text-muted">
            Every payment, where they actually came from, and which post drove it.
          </p>
        </div>

        {!site && (
          <div className="card p-10 text-center">
            <div className="text-4xl mb-3">💰</div>
            <h2 className="text-heading-sm text-ink mb-2">No site connected</h2>
            <p className="text-body-sm text-muted mb-4">Add a site in Settings to start tracking revenue.</p>
            <a href="/settings" className="btn-primary">Go to Settings →</a>
          </div>
        )}

        {site && (
          <>
            <div className="card mb-6 grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-line">
              <div className="p-5">
                <div className="text-body-sm text-body mb-2">Total Revenue</div>
                <div className="text-2xl font-bold text-ink tabular mb-1">
                  {formatMoney(totalCents)}
                </div>
                <div className="text-caption text-muted normal-case font-normal">
                  {rows.length} sales
                </div>
              </div>

              {(connections ?? []).slice(0, 3).map(conn => {
                const meta = PROVIDER_META[conn.provider] ?? { name: conn.provider, icon: '◈' }
                const providerTotal = byProvider[conn.provider] ?? 0
                return (
                  <div key={conn.provider} className="p-5">
                    <div className="flex items-center gap-1.5 text-body-sm text-body mb-2">
                      <span>{meta.icon}</span> {meta.name}
                    </div>
                    <div className="text-2xl font-bold text-ink tabular mb-1">
                      {formatMoney(providerTotal)}
                    </div>
                    <div className="text-caption text-muted normal-case font-normal">
                      {rows.filter(r => r.provider === conn.provider).length} sales
                    </div>
                  </div>
                )
              })}

              {Array.from({ length: Math.max(0, 3 - (connections?.length ?? 0)) }).map((_, i) => (
                <div key={i} className="p-5 flex items-center justify-center">
                  <a href="/connect" className="text-body-sm text-muted hover:text-primary transition-colors">
                    + Connect provider
                  </a>
                </div>
              ))}
            </div>

            {(connections ?? []).length === 0 && (
              <div className="bg-primary-tint border border-primary/20 rounded-2xl p-4 mb-6 flex items-start gap-3">
                <span className="text-primary text-lg">⚠️</span>
                <div className="text-body-sm text-primary leading-relaxed">
                  No payment providers connected yet.{' '}
                  <a href="/connect" className="font-semibold underline">Connect Lemon Squeezy</a>
                  {' '}to start seeing revenue data.
                </div>
              </div>
            )}

            <div className="bg-primary-tint rounded-2xl p-4 mb-6 flex items-start gap-3">
              <span className="text-primary text-lg">💡</span>
              <div className="text-body-sm text-primary leading-relaxed">
                <strong>Every sale, fully attributed.</strong> Device, source and time-to-convert
                come from the actual visit — and if it came through one of your tracked posts,
                you'll see exactly which one drove it.
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <h2 className="text-heading-sm text-ink">
                All Sales
                {rows.length > 0 && (
                  <span className="text-body-sm text-muted font-normal ml-2">({rows.length})</span>
                )}
              </h2>
              {rows.length > 0 && (
                <a href={csvHref} download="revenue.csv" className="btn-secondary text-xs py-1.5">
                  ↓ Export CSV
                </a>
              )}
            </div>

            {rows.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="text-4xl mb-3">🎯</div>
                <h3 className="text-heading-sm text-ink mb-2">No sales yet</h3>
                <p className="text-body-sm text-muted max-w-sm mx-auto">
                  Sales will appear here once your payment provider fires a
                  webhook. Make sure your webhook URL is set to{' '}
                  <code className="bg-surface-muted px-1 rounded font-mono text-xs">/api/webhook</code>.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {rows.map(conv => {
                  const providerMeta = PROVIDER_META[conv.provider] ?? { name: conv.provider, icon: '◈' }
                  const post = Array.isArray(conv.posts) ? conv.posts[0] : conv.posts
                  const src = sourceMeta(conv.source)
                  const returning = isReturning.get(conv.id) ?? false
                  const convertTime = timeToConvert(conv.first_seen_at, conv.received_at)

                  return (
                    <div key={conv.id} className="card p-4 flex flex-wrap items-center gap-4">

                      {/* Customer + device row */}
                      <div className="flex items-center gap-3 min-w-[220px] flex-1">
                        <div className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center text-sm font-bold text-body flex-shrink-0">
                          {(conv.customer_email ?? '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-body-sm font-semibold text-ink truncate">
                              {maskEmail(conv.customer_email)}
                            </span>
                            <span className={returning ? 'badge-success' : 'badge-primary-tint'}>
                              {returning ? 'Returning' : 'New'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-caption text-muted normal-case font-normal mt-0.5 flex-wrap">
                            {conv.country && <span>{countryFlag(conv.country)} {conv.country}</span>}
                            {conv.device && <span>{DEVICE_ICON[conv.device] ?? '●'} {conv.device}</span>}
                            {conv.os && <span title={OS_LABEL[conv.os] ?? conv.os}>{OS_ICON[conv.os] ?? ''} {OS_LABEL[conv.os] ?? conv.os}</span>}
                            {conv.browser && <span>{BROWSER_ICON[conv.browser] ?? '○'} {BROWSER_LABEL[conv.browser] ?? conv.browser}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Source + post — this row is SourceTruth's own
                          differentiator on top of the DataFast-style fields */}
                      <div className="min-w-[160px]">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold"
                          style={{ backgroundColor: src.bgColor, color: src.color }}
                        >
                          {src.icon} {src.name}
                        </span>
                        {post?.content && (
                          <p className="text-[11px] text-success font-medium truncate max-w-[180px] mt-1" title={post.content}>
                            {post.content.slice(0, 40)}{post.content.length > 40 ? '…' : ''}
                          </p>
                        )}
                      </div>

                      {/* Provider + product */}
                      <div className="min-w-[140px] text-body-sm text-body">
                        <div>{providerMeta.icon} {providerMeta.name}</div>
                        <div className="text-caption text-muted normal-case font-normal mt-0.5">{conv.product_name ?? '—'}</div>
                      </div>

                      {/* Amount */}
                      <div className="text-body-sm font-bold text-success tabular min-w-[70px]">
                        +{formatMoney(conv.amount_cents)}
                      </div>

                      {/* Time to convert */}
                      <div className="text-body-sm text-body min-w-[80px]">
                        {convertTime ?? <span className="text-muted">—</span>}
                      </div>

                      {/* When */}
                      <div className="text-caption text-muted normal-case font-normal min-w-[80px] text-right ml-auto">
                        {timeAgo(conv.received_at)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}