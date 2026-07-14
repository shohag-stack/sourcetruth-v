// app/dashboard/page.tsx
import { AppShell } from '@/components/layout/AppShell'
import { RevenueAreaChart } from '@/components/charts/RevenueAreaChart'
import { PLATFORM_META } from '@/lib/dummy-data' // static branding lookup only
import { countryFlag } from '@/lib/countryFlag'
import { formatMoney, formatMoneyFull, formatNumber, timeAgo, trendLabel } from '@/lib/utils'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { metaFor } from '@/lib/metaFor'


function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const now = new Date()
  const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const since60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()

  const { data: sites } = await supabase.from('sites').select('id').eq('user_id', user.id)
  const siteIds = (sites ?? []).map(s => s.id)

  const [
    { count: totalPosts },
    { count: postedCount },
    { data: conversions60 }, // single query, sliced in JS for 30d/prior-30d/chart/leaderboard/recent-sales
    { data: bestPostsRaw },
    { data: pageviews60 }, // for visitor counts — see note below
  ] = await Promise.all([
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'posted'),
    supabase
      .from('conversions')
      .select('id, source, amount_cents, post_id, customer_email, provider, received_at')
      .eq('user_id', user.id)
      .gte('received_at', since60)
      .order('received_at', { ascending: false }),
    // no `channel` column selected here anymore — declared channel isn't
    // shown on this page at all now, only real conversions.source is
    supabase
      .from('posts')
      .select('id, content, tracked_link, status, created_at, revenue_cents, total_clicks, unique_clicks, total_conversions')
      .eq('user_id', user.id)
      .eq('status', 'posted')
      .order('revenue_cents', { ascending: false })
      .limit(2),
    // "Visitors" = distinct session_id in pageviews (real, general traffic
    // log, populated on every page load) — NOT the `visitors` table, which
    // is actually an email-keyed leads table only populated when someone
    // submits an email via identify(). That mismatch was why this stat
    // showed 0 despite real traffic existing (see Traffic Analytics page,
    // which was already counting pageviews correctly).
    siteIds.length
      ? supabase.from('pageviews').select('session_id, visited_at').in('site_id', siteIds).gte('visited_at', since60)
      : Promise.resolve({ data: [] as { session_id: string; visited_at: string }[] }),
  ])

  const pageviewRows = pageviews60 ?? []
  const visitors30 = new Set(pageviewRows.filter(p => p.visited_at >= since30).map(p => p.session_id)).size
  const visitorsPrior30 = new Set(pageviewRows.filter(p => p.visited_at < since30).map(p => p.session_id)).size

  const allConversions = conversions60 ?? []
  const conversionsThis30 = allConversions.filter(c => c.received_at >= since30)
  const conversionsPrior30 = allConversions.filter(c => c.received_at < since30)

  const totalRevenueCents30 = conversionsThis30.reduce((s, c) => s + c.amount_cents, 0)
  const totalRevenuePrior30 = conversionsPrior30.reduce((s, c) => s + c.amount_cents, 0)
  const revenueGrowth = pctChange(totalRevenueCents30, totalRevenuePrior30)
  const visitorsGrowth = pctChange(visitors30 ?? 0, visitorsPrior30 ?? 0)

  const avgRevenuePerPostCents = (postedCount ?? 0) > 0 ? totalRevenueCents30 / (postedCount ?? 1) : 0

  // ── Best-post top-clicked countries (unchanged — this is real geo
  // data from clicks, not a channel question) ──
  const bestPostIds = (bestPostsRaw ?? []).map(p => p.id)
  const { data: bestPostClicks } = bestPostIds.length
    ? await supabase.from('clicks').select('post_id, country').in('post_id', bestPostIds)
    : { data: [] as { post_id: string; country: string | null }[] }

  const countryCountByPost = new Map<string, Record<string, number>>()
  bestPostClicks?.forEach(c => {
    if (!c.country) return
    const entry = countryCountByPost.get(c.post_id) ?? {}
    entry[c.country] = (entry[c.country] ?? 0) + 1
    countryCountByPost.set(c.post_id, entry)
  })

  // ── Real source(s) each best-post actually sold through — replaces
  // the old declared-channel badge entirely ──
  const sourcesByPost = new Map<string, Set<string>>()
  allConversions.forEach(c => {
    if (!c.post_id) return
    const set = sourcesByPost.get(c.post_id) ?? new Set<string>()
    set.add(c.source ?? 'direct')
    sourcesByPost.set(c.post_id, set)
  })

  // ── Channel leaderboard — grouped by REAL source (conversions.source),
  // not declared post.channel. This used to group by declared channel,
  // same bug as everywhere else. ──
  const channelTotals = new Map<string, number>()
  conversionsThis30.forEach(c => {
    const src = c.source ?? 'direct'
    channelTotals.set(src, (channelTotals.get(src) ?? 0) + c.amount_cents)
  })
  const channelLeaderboard = Array.from(channelTotals.entries())
    .map(([source, revenue_cents]) => ({ source, revenue_cents }))
    .sort((a, b) => b.revenue_cents - a.revenue_cents)

  // ── Daily revenue series for the chart, grouped by REAL source ──
  const CHART_CHANNELS = ['linkedin', 'instagram', 'twitter', 'facebook', 'threads'] as const
  const dayBuckets = new Map<string, Record<string, any>>()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const row: Record<string, number> = { total: 0 }
    CHART_CHANNELS.forEach(ch => { row[ch] = 0 })
    dayBuckets.set(key, { ...row, __label: label })
  }
  conversionsThis30.forEach(c => {
    const key = c.received_at.slice(0, 10)
    const bucket = dayBuckets.get(key)
    if (!bucket) return
    const dollars = c.amount_cents / 100
    bucket.total += dollars
    const src = c.source ?? 'direct'
    if (CHART_CHANNELS.includes(src as any)) bucket[src] += dollars
  })
  const chartData = Array.from(dayBuckets.values()).map(row => {
    const { __label, ...rest } = row
    return { date: __label, ...rest }
  })

  const recentSales = allConversions.slice(0, 4)

  const statCards = [
    { label: 'Visitors', value: formatNumber(visitors30 ?? 0), trend: `${trendLabel(visitorsGrowth)} vs prior 30d` },
    { label: 'Revenues', value: formatMoneyFull(totalRevenueCents30 / 100), trend: `${trendLabel(revenueGrowth)} vs last month` },
    { label: 'Posts', value: (totalPosts ?? 0).toString(), trend: `${conversionsThis30.length} conversions (30d)` },
    { label: 'Revenue / Post', value: formatMoney(avgRevenuePerPostCents / 100), trend: 'avg across posted' },
    // Bounce Rate / Online — still no session or presence tracking exists.
    { label: 'Bounce Rate', value: '—', trend: 'not tracked yet' },
    { label: 'Online', value: '—', trend: 'not tracked yet' },
  ]

  return (
    <AppShell>
      <div className="p-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-heading-lg text-ink mb-0.5">
              Good morning{user.user_metadata?.name ? `, ${user.user_metadata.name}` : ''} 👋
            </h1>
            <p className="text-body-sm text-muted">
              {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} · Live from your account
            </p>
          </div>
          <Link href="/links" className="btn-primary">New Post</Link>
        </div>

        {/* ── Stat strip ── */}
        <div className="card mb-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 divide-y xl:divide-y-0 xl:divide-x divide-line">
          {statCards.map(s => (
            <div key={s.label} className="p-5">
              <div className="text-body-sm text-body mb-2">{s.label}</div>
              <div className="text-2xl font-bold text-ink tabular mb-1">{s.value}</div>
              <div className="text-caption font-medium text-muted normal-case">{s.trend}</div>
            </div>
          ))}
        </div>

        {/* ── Revenue by source chart — grouped by real conversions.source ── */}
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-heading-sm text-ink">Revenue by Source</h2>
            <div className="flex items-center gap-3 flex-wrap">
              {CHART_CHANNELS.map(ch => {
                const meta = metaFor(ch)
                return (
                  <span key={ch} className="flex items-center gap-1.5 text-body-sm text-muted">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
                    {meta.name}
                  </span>
                )
              })}
            </div>
          </div>
          <RevenueAreaChart data={chartData} />
        </div>

        {/* ── Best performing posts ── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-heading-sm text-ink">Best performing posts</h2>
            <Link href="/posts" className="text-body-sm text-primary hover:text-primary-hover transition-colors">See all</Link>
          </div>
          {(bestPostsRaw ?? []).length === 0 ? (
            <div className="card p-8 text-center text-body-sm text-muted">
              No posted links yet — once you mark a post as posted, it'll show up here.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {bestPostsRaw!.map(post => {
                const countries = Object.entries(countryCountByPost.get(post.id) ?? {})
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 4)
                  .map(([country]) => country)
                const conversionRate = post.total_clicks > 0
                  ? (post.total_conversions / post.total_clicks) * 100
                  : 0
                const actualSources = Array.from(sourcesByPost.get(post.id) ?? [])

                return (
                  <div key={post.id} className="card p-4">
                    {/* Real source(s), not declared channel */}
                    <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {actualSources.length > 0 ? (
                          actualSources.map(src => {
                            const meta = metaFor(src)
                            return (
                              <span key={src} className="badge-gray">
                                {meta.icon} {meta.name}
                              </span>
                            )
                          })
                        ) : (
                          <span className="text-caption text-muted normal-case font-normal">No sales yet</span>
                        )}
                      </div>
                      {countries.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-caption text-muted normal-case font-normal">Top clicks:</span>
                          <div className="flex gap-1 text-base">
                            {countries.map((c, i) => <span key={i} title={c}>{countryFlag(c)}</span>)}
                          </div>
                        </div>
                      )}
                    </div>

                    <p className="text-body-sm text-body leading-relaxed line-clamp-2 mb-3">{post.content}</p>

                    <div className="border-t border-line -mx-4 mb-3" />

                    <div className="flex items-baseline justify-between mb-3">
                      <span className="text-heading-sm text-ink tabular">{formatMoneyFull(post.revenue_cents / 100)}</span>
                      <span className="text-caption text-muted normal-case font-normal">/ Revenue earned</span>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'Clicks', value: formatNumber(post.total_clicks) },
                        { label: 'Unique', value: formatNumber(post.unique_clicks) },
                        { label: 'Sales', value: post.total_conversions.toString() },
                        { label: 'Conv. rate', value: `${conversionRate.toFixed(1)}%`, highlight: conversionRate > 2 },
                      ].map(s => (
                        <div key={s.label} className="text-center">
                          <div className={`text-body-sm font-bold tabular ${s.highlight ? 'text-success' : 'text-ink'}`}>{s.value}</div>
                          <div className="text-[10px] text-muted mt-0.5">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Best performing source — grouped by real conversions.source ── */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-heading-sm text-ink">Best performing Source</h2>
              <Link href="/analytics" className="text-body-sm text-primary hover:text-primary-hover transition-colors">Full breakdown →</Link>
            </div>
            {channelLeaderboard.length === 0 ? (
              <p className="text-body-sm text-muted">No revenue yet.</p>
            ) : (
              <div className="space-y-1">
                {channelLeaderboard.map(ch => {
                  const meta = metaFor(ch.source)
                  return (
                    <div key={ch.source} className="flex items-center gap-3 py-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ backgroundColor: meta.bgColor, color: meta.color }}>
                        {meta.icon}
                      </div>
                      <span className="flex-1 text-body-sm font-medium text-ink">{meta.name}</span>
                      <span className="text-body-sm font-bold text-ink tabular">{formatMoney(ch.revenue_cents / 100)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Recent sales — real source, not declared channel ── */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-heading-sm text-ink">Recent Sales</h2>
              <Link href="/revenue" className="text-body-sm text-primary hover:text-primary-hover transition-colors">See all</Link>
            </div>
            {recentSales.length === 0 ? (
              <p className="text-body-sm text-muted">No sales yet.</p>
            ) : (
              <div className="space-y-1">
                {recentSales.map(event => {
                  const meta = metaFor(event.source ?? 'direct')
                  return (
                    <div key={event.id} className="flex items-center gap-3 py-2.5 border-b border-line last:border-0">
                      <div className="w-8 h-8 rounded-full bg-surface-muted flex items-center justify-center text-body-sm font-bold text-body flex-shrink-0">
                        {(event.customer_email ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-body-sm text-ink font-medium truncate">{event.customer_email ?? 'Unknown'}</div>
                        <div className="text-caption text-muted normal-case font-normal flex items-center gap-1.5 mt-0.5">
                          <span style={{ color: meta.color }}>{meta.icon} {meta.name}</span>
                          <span>·</span>
                          <span>{timeAgo(event.received_at)}</span>
                        </div>
                      </div>
                      <span className="text-body-sm font-bold text-success tabular flex-shrink-0">
                        +{formatMoneyFull(event.amount_cents / 100)}
                      </span>
                      {event.post_id && (
                        <Link href={`/posts?highlight=${event.post_id}`}
                          className="btn-ghost !py-1.5 !px-2.5 text-[12px] border border-line flex-shrink-0">
                          View post
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}