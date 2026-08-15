// app/posts/[id]/page.tsx
import { AppShell } from '@/components/layout/AppShell'
import { VisitorRevenueChart, VisitorRevenueDay } from '@/components/charts/VisitorRevenueChart'
import { countryDisplay, countryFlag } from '@/lib/countryFlag'
import { metaFor } from '@/lib/metaFor'
import { formatMoney, formatMoneyFull, formatNumber, timeAgo, timeToConvert } from '@/lib/utils'
import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { RankedList } from '@/components/analytics/RankedList'
import { BROWSER_ICON, BROWSER_LABEL, DEVICE_ICON, DEVICE_LABEL, OS_ICON, OS_LABEL } from '@/lib/analytics'

// ─── Ranked list — same pattern as the Traffic Analytics page, reused
// here scoped to a single post instead of the whole site ──────────

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: post } = await supabase
    .from('posts')
    .select('id, content, tracked_link, status, created_at, posted_at, revenue_cents, total_clicks, unique_clicks, total_conversions')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!post) notFound()

  const [{ data: clicks, error: clicksError }, { data: conversions }] = await Promise.all([
    supabase
      .from('clicks')
      .select('ip_hash, country, device, browser, os, source, referrer, is_unique, clicked_at')
      .eq('post_id', id),
    supabase
      .from('conversions')
      .select('id, amount_cents, customer_email, source, country, provider, first_seen_at, received_at')
      .eq('post_id', id)
      .eq('refunded', false)
      .order('received_at', { ascending: false }),
  ])

console.log('clicks error:', clicksError)
console.log('click rows:', clicks)

  const clickRows = clicks ?? []
  const conversionRows = conversions ?? []

  const conversionRate = post.total_clicks > 0 ? (post.total_conversions / post.total_clicks) * 100 : 0

  // ── Sold via — real sources that drove sales for this post ──
  const soldVia = Array.from(new Set(conversionRows.map(c => c.source ?? 'direct')))


    // ── Top countries ─────────────────────────────────────────
  const countryCounts = new Map<string, number>();
  clickRows.forEach((r) => {
    const c = r.country ?? "unknown";
    countryCounts.set(c, (countryCounts.get(c) ?? 0) + 1);
  });


  const topCountries = Array.from(countryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([code, value]) => ({
      label: code === "unknown" ? "Unknown" : countryDisplay(code) ,
      value,
      filterValue: code,
    }));




      // ── Top browsers ──────────────────────────────────────────
      const browserCounts = new Map<string, number>();
      clickRows.forEach((r) => {
        const b = r.browser ?? "unknown";
        browserCounts.set(b, (browserCounts.get(b) ?? 0) + 1);
      });
    // Browsers — chrome, safari, firefox
    const topBrowsers = Array.from(browserCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({
        label: BROWSER_LABEL[label] ?? label,
        value,
        icon: BROWSER_ICON[label] ?? null,
        filterValue: label,
      }))
    
      // ── Top OS ────────────────────────────────────────────────
      const osCounts = new Map<string, number>();
      clickRows.forEach((r) => {
        const o = r.os ?? "unknown";
        osCounts.set(o, (osCounts.get(o) ?? 0) + 1);
      });
    const topOS = Array.from(osCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({
        label: OS_LABEL[label] ?? label,
        value,
        icon: OS_ICON[label] ?? null,
        filterValue: label,
      }))





      const deviceCounts = new Map<string, number>();
      clickRows.forEach((r) => {
        const d = r.device ?? "unknown";
        deviceCounts.set(d, (deviceCounts.get(d) ?? 0) + 1);
      });
      const topDevices = Array.from(deviceCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([label, value]) => ({
          label: DEVICE_LABEL[label],
          value,
          icon: DEVICE_ICON[label]
        }));

  // ── Clicks + Revenue combo chart, last 30 days, daily buckets —
  // reuses VisitorRevenueChart: "visitors" here means clicks on this
  // post's link specifically (unique vs repeat, from clicks.is_unique),
  // not site-wide traffic. ──
  const now = new Date()
  const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const dayBuckets = new Map<string, {
    fullDate: string
    uniqueClicks: number
    repeatClicks: number
    revenueCents: number
    newRevenueCents: number
    returningRevenueCents: number
    conversions: number
  }>()
  const dayKeys: string[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    dayKeys.push(key)
    dayBuckets.set(key, {
      fullDate: d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' }),
      uniqueClicks: 0,
      repeatClicks: 0,
      revenueCents: 0,
      newRevenueCents: 0,
      returningRevenueCents: 0,
      conversions: 0,
    })
  }
  clickRows.forEach(c => {
    if (new Date(c.clicked_at) < since30) return
    const key = c.clicked_at.slice(0, 10)
    const bucket = dayBuckets.get(key)
    if (!bucket) return
    if (c.is_unique) bucket.uniqueClicks += 1
    else bucket.repeatClicks += 1
  })
  const seenEmails = new Set<string>()
  conversionRows.forEach(c => {
    if (new Date(c.received_at) < since30) return
    const key = c.received_at.slice(0, 10)
    const bucket = dayBuckets.get(key)
    if (!bucket) return
    bucket.revenueCents += c.amount_cents
    bucket.conversions += 1
    const isNew = c.customer_email ? !seenEmails.has(c.customer_email) : true
    if (c.customer_email) seenEmails.add(c.customer_email)
    if (isNew) bucket.newRevenueCents += c.amount_cents
    else bucket.returningRevenueCents += c.amount_cents
  })
  const chartData: VisitorRevenueDay[] = dayKeys.map(key => {
    const b = dayBuckets.get(key)!
    const visitors = b.uniqueClicks + b.repeatClicks
    return {
      date: new Date(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: b.fullDate,
      visitors,
      newVisitors: b.uniqueClicks,
      returningVisitors: b.repeatClicks,
      revenueCents: b.revenueCents,
      newRevenueCents: b.newRevenueCents,
      returningRevenueCents: b.returningRevenueCents,
      conversions: b.conversions,
    }
  })


  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-6">
          <Link href="/posts" className="text-body-sm text-muted hover:text-primary transition-colors mb-2 inline-block">
            ← Back to Posts
          </Link>
          <h1 className="text-heading-lg text-ink mb-1">Post Analytics</h1>
          <p className="text-body-sm text-body leading-relaxed max-w-2xl">{post.content}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-[11px] text-primary font-mono bg-primary-tint px-2 py-1 rounded-lg">{post.tracked_link}</span>
            <span className="text-caption text-muted normal-case font-normal">
              {post.status === 'posted' ? `Posted ${timeAgo(post.posted_at ?? post.created_at)}` : 'Not posted yet'}
            </span>
          </div>
        </div>

        {/* Stat cards */}
        <div className="card mb-6 grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-line">
          <div className="p-5">
            <div className="text-body-sm text-body mb-2">Revenue</div>
            <div className="text-2xl font-bold text-ink tabular mb-1">{formatMoneyFull(post.revenue_cents / 100)}</div>
            <div className="text-caption text-muted normal-case font-normal">{post.total_conversions} sales</div>
          </div>
          <div className="p-5">
            <div className="text-body-sm text-body mb-2">Clicks</div>
            <div className="text-2xl font-bold text-ink tabular mb-1">{formatNumber(post.total_clicks)}</div>
            <div className="text-caption text-muted normal-case font-normal">{formatNumber(post.unique_clicks)} unique</div>
          </div>
          <div className="p-5">
            <div className="text-body-sm text-body mb-2">Conversion Rate</div>
            <div className="text-2xl font-bold text-ink tabular mb-1">{conversionRate.toFixed(2)}%</div>
            <div className="text-caption text-muted normal-case font-normal">clicks → sales</div>
          </div>
          <div className="p-5">
            <div className="text-body-sm text-body mb-2">Sold via</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {soldVia.length > 0 ? (
                soldVia.map(src => {
                  const meta = metaFor(src)
                  return (
                    <span key={src} className="text-[10px] font-bold px-1.5 py-0.5 rounded">
                       {meta.name}
                    </span>
                  )
                })
              ) : (
                <span className="text-body-sm text-muted">No sales yet</span>
              )}
            </div>
          </div>
        </div>

        {/* Clicks + Revenue chart */}
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-heading-sm text-ink">Clicks & Revenue — last 30 days</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5 text-body-sm text-muted">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#93C5FD' }} />
                Clicks
              </span>
              <span className="flex items-center gap-1.5 text-body-sm text-muted">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#F0A585' }} />
                Revenue
              </span>
            </div>
          </div>
          <VisitorRevenueChart data={chartData} />
        </div>

        {/* Country / device / browser / OS breakdown for this post */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <RankedList title="Countries" rows={topCountries} filterKey='country' />
          <RankedList title="Devices" rows={topDevices} filterKey='device' />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <RankedList title="Browsers" rows={topBrowsers} filterKey='browser' />
          <RankedList title="OS" rows={topOS} filterKey='os' />
        </div>

        {/* Sales for this post */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-line">
            <h2 className="text-heading-sm text-ink">Sales from this post</h2>
          </div>
          {conversionRows.length === 0 ? (
            <div className="p-8 text-center text-body-sm text-muted">No sales yet from this post.</div>
          ) : (
            <div className="divide-y divide-line">
              {conversionRows.map(c => {
                const meta = metaFor(c.source ?? 'direct')
                const convertTime = timeToConvert(c.first_seen_at, c.received_at)
                return (
                  <div key={c.id} className="p-4 flex items-center gap-3 flex-wrap">
                    <div className="w-8 h-8 rounded-full bg-surface-muted flex items-center justify-center text-body-sm font-bold text-body flex-shrink-0">
                      {(c.customer_email ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-[160px] flex-1">
                      <div className="text-body-sm font-medium text-ink truncate">{c.customer_email ?? 'Unknown'}</div>
                      <div className="text-caption text-muted normal-case font-normal flex items-center gap-1.5 mt-0.5">
                        {c.country && <span>{countryFlag(c.country)} {c.country}</span>}
                        <span> {meta.name}</span>
                      </div>
                    </div>
                    <div className="text-body-sm font-bold text-success tabular">+{formatMoney(c.amount_cents / 100)}</div>
                    <div className="text-body-sm text-body min-w-[70px]">{convertTime ?? <span className="text-muted">—</span>}</div>
                    <div className="text-caption text-muted normal-case font-normal ml-auto">{timeAgo(c.received_at)}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}