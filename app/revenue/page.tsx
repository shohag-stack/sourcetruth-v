// app/revenue/page.tsx
import { AppShell } from '@/components/layout/AppShell'
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

  // ── Conversions joined with posts ──────────────────────────
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

  const totalCents = rows.reduce((sum, c) => sum + (c.amount_cents ?? 0), 0)

  const byProvider = rows.reduce<Record<string, number>>((acc, c) => {
    acc[c.provider] = (acc[c.provider] ?? 0) + (c.amount_cents ?? 0)
    return acc
  }, {})

  const csvRows = [
    ['Customer', 'Provider', 'Product', 'Amount', 'Source', 'Country', 'Date'],
    ...rows.map(c => [
      c.customer_email ?? '',
      c.provider,
      c.product_name ?? '',
      formatMoney(c.amount_cents),
      c.source ?? '',
      c.country ?? '',
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
            Every payment attributed to the post that drove it.
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
                <strong>First-touch attribution.</strong> Revenue is credited to
                the post the customer first clicked, even if they returned days
                later to buy.
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-line flex items-center justify-between">
                <h2 className="text-heading-sm text-ink">
                  All Sales
                  {rows.length > 0 && (
                    <span className="text-body-sm text-muted font-normal ml-2">
                      ({rows.length})
                    </span>
                  )}
                </h2>
                {rows.length > 0 && (
                  <a
                    href={csvHref}
                    download="revenue.csv"
                    className="btn-secondary text-xs py-1.5"
                  >
                    ↓ Export CSV
                  </a>
                )}
              </div>

              {rows.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-4xl mb-3">🎯</div>
                  <h3 className="text-heading-sm text-ink mb-2">No sales yet</h3>
                  <p className="text-body-sm text-muted max-w-sm mx-auto">
                    Sales will appear here once your payment provider fires a
                    webhook. Make sure your webhook URL is set to{' '}
                    <code className="bg-surface-muted px-1 rounded font-mono text-xs">
                      /api/webhook
                    </code>
                    .
                  </p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-muted border-b border-line">
                      {['Customer', 'Source Post', 'Channel', 'Provider', 'Product', 'Amount', 'When'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-caption text-muted font-semibold first:pl-5 last:pr-5">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(conv => {
                      const providerMeta = PROVIDER_META[conv.provider] ?? { name: conv.provider, icon: '◈' }
                      const post = Array.isArray(conv.posts) ? conv.posts[0] : conv.posts

                      // FIX: prioritize the real, actual source (conv.source —
                      // comes from the referrer at click time, via webhook
                      // custom_data) over the post's *declared/planned* channel.
                      // Before, this always showed post.channel because a post
                      // almost always exists, so the real source never won,
                      // even when it disagreed with reality (the bug you found).
                      const channelMeta = conv.source
                        ? CHANNEL_META[conv.source] ?? { name: conv.source, color: '#5B5B5B', bgColor: '#F7F6F4', icon: '●' }
                        : post?.channel
                          ? CHANNEL_META[post.channel]
                          : null

                      const postPreview = post?.content
                        ? post.content.slice(0, 60) + (post.content.length > 60 ? '...' : '')
                        : null

                      return (
                        <tr key={conv.id} className="border-b border-line hover:bg-surface-muted transition-colors last:border-0">

                          <td className="pl-5 pr-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-surface-muted flex items-center justify-center text-[11px] font-bold text-body flex-shrink-0">
                                {(conv.customer_email ?? '?').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-body-sm font-medium text-ink">
                                  {conv.customer_email ?? 'Unknown'}
                                </div>
                                <div className="text-caption text-muted normal-case font-normal">
                                  {conv.country ?? '—'}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 max-w-[180px]">
                            {postPreview ? (
                              <p className="text-[12px] text-success font-medium truncate" title={post?.content}>
                                {postPreview}
                              </p>
                            ) : (
                              <span className="text-caption text-muted normal-case font-normal">
                                {conv.source ?? 'Direct'}
                              </span>
                            )}
                          </td>

                          {/* Channel — now shows the real, actual source */}
                          <td className="px-4 py-3.5">
                            {channelMeta ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold"
                                style={{ backgroundColor: channelMeta.bgColor, color: channelMeta.color }}
                              >
                                {channelMeta.icon} {channelMeta.name}
                              </span>
                            ) : (
                              <span className="text-caption text-muted normal-case font-normal">—</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="text-body-sm text-body">
                              {providerMeta.icon} {providerMeta.name}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-body-sm text-body">
                            {conv.product_name ?? '—'}
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="text-body-sm font-bold text-success tabular">
                              +{formatMoney(conv.amount_cents)}
                            </span>
                          </td>

                          <td className="px-4 pr-5 py-3.5 text-caption text-muted normal-case font-normal">
                            {timeAgo(conv.received_at)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}