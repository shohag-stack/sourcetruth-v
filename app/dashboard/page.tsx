// app/dashboard/page.tsx
import { AppShell } from '@/components/layout/AppShell'
import { RevenueAreaChart } from '@/components/charts/RevenueAreaChart'
import { DUMMY_OVERVIEW, DUMMY_POSTS, DUMMY_CHANNEL_STATS, DUMMY_REVENUE_EVENTS, PLATFORM_META, PAYMENT_META } from '@/lib/dummy-data'
import { DUMMY_OVERVIEW_PATCH, DUMMY_TOP_COUNTRIES } from '@/lib/dummy-data'
import { formatMoney, formatMoneyFull, formatNumber, timeAgo, trendLabel } from '@/lib/utils'
import Link from 'next/link'
import { SocialChannel } from '@/types/posts'

// Merges in the placeholder fields your mockup needs that DUMMY_OVERVIEW
// doesn't have yet (visitors/bounceRate/onlineNow) — see
// lib/dummy-data-patch.ts. Not real tracking logic, just enough to render.
const overview = { ...DUMMY_OVERVIEW, ...DUMMY_OVERVIEW_PATCH }

export default function DashboardPage() {
  const publishedPosts = DUMMY_POSTS.filter(p => p.status === 'posted')
  // mockup shows two "best performing" cards, not one — top 2 by revenue
  const bestPosts = [...publishedPosts].sort((a, b) => b.revenue_cents - a.revenue_cents).slice(0, 2)

  const statCards = [
    { label: 'Visitors', value: formatNumber(overview.totalVisitors), trend: `+${overview.visitorsGrowth}%` },
    { label: 'Revenues', value: formatMoneyFull(overview.totalRevenue), trend: `${trendLabel(overview.revenueGrowth)} vs last month` },
    { label: 'Posts', value: overview.totalPosts.toString(), trend: `${overview.totalConversions} conversions` },
    { label: 'Revenue / Post', value: formatMoney(overview.avgRevenuePerPost), trend: 'avg across all channels' },
    { label: 'Bounce Rate', value: `${overview.bounceRate}%`, trend: `+${overview.bounceRateGrowth}%` },
    { label: 'Online', value: overview.onlineNow.toString(), live: true },
  ]

  return (
    <AppShell>
      <div className="p-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-heading-lg text-ink mb-0.5">Good morning, Raysa 👋</h1>
            <p className="text-body-sm text-muted">June 2024 · Last sync 2 min ago</p>
          </div>
          <Link href="/links" className="btn-primary">New Post</Link>
        </div>

        {/* ── Stat strip — single card, divided columns ── */}
        <div className="card mb-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 divide-y xl:divide-y-0 xl:divide-x divide-line">
          {statCards.map(s => (
            <div key={s.label} className="p-5">
              <div className="flex items-center gap-1.5 text-body-sm text-body mb-2">
                {s.label}
                {s.live && <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />}
              </div>
              <div className="text-2xl font-bold text-ink tabular mb-1">{s.value}</div>
              {s.trend && <div className="text-caption font-medium text-success normal-case">{s.trend}</div>}
            </div>
          ))}
        </div>

        {/* ── Revenue by channel chart ── */}
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-heading-sm text-ink">Revenue by Channel</h2>
            <div className="flex items-center gap-3 flex-wrap">
              {[
                { label: 'LinkedIn', color: '#0077B5' },
                { label: 'Instagram', color: '#E1306C' },
                { label: 'Twitter', color: '#000000' },
              ].map(c => (
                <span key={c.label} className="flex items-center gap-1.5 text-body-sm text-muted">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.label}
                </span>
              ))}
            </div>
          </div>
          <RevenueAreaChart />
        </div>

        {/* ── Best performing posts ── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-heading-sm text-ink">Best performing posts</h2>
            <Link href="/posts" className="text-body-sm text-primary hover:text-primary-hover transition-colors">See all</Link>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {bestPosts.map(post => {
              const countries = DUMMY_TOP_COUNTRIES[post.id] ?? []
              const conversionRate = post.total_clicks > 0
                ? (post.total_conversions / post.total_clicks) * 100
                : 0

              return (
                <div key={post.id} className="card p-4">
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      {post.channels.map((ch: SocialChannel) => (
                        <span key={ch} className="badge-gray">{PLATFORM_META[ch].name}</span>
                      ))}
                    </div>
                    {countries.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-caption text-muted normal-case font-normal">Top clicks:</span>
                        <div className="flex gap-1 text-base">
                          {countries.map((flag, i) => <span key={i}>{flag}</span>)}
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Best performing channel ── */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-heading-sm text-ink">Best performing Channel</h2>
              <Link href="/analytics" className="text-body-sm text-primary hover:text-primary-hover transition-colors">Full breakdown →</Link>
            </div>
            <div className="space-y-1">
              {DUMMY_CHANNEL_STATS.sort((a, b) => b.revenue - a.revenue).map(ch => {
                const meta = PLATFORM_META[ch.platform]
                return (
                  <div key={ch.platform} className="flex items-center gap-3 py-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: meta.bgColor, color: meta.color }}>
                      {meta.icon}
                    </div>
                    <span className="flex-1 text-body-sm font-medium text-ink">{meta.name}</span>
                    <span className="text-body-sm font-bold text-ink tabular">{formatMoney(ch.revenue)}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Recent sales ── */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-heading-sm text-ink">Recent Sales</h2>
              <Link href="/revenue" className="text-body-sm text-primary hover:text-primary-hover transition-colors">See all</Link>
            </div>
            <div className="space-y-1">
              {DUMMY_REVENUE_EVENTS.slice(0, 4).map(event => {
                const channelMeta = PLATFORM_META[event.channel]
                const paymentMeta = PAYMENT_META[event.provider]
                return (
                  <div key={event.id} className="flex items-center gap-3 py-2.5 border-b border-line last:border-0">
                    <div className="w-8 h-8 rounded-full bg-surface-muted flex items-center justify-center text-body-sm font-bold text-body flex-shrink-0">
                      {event.customerEmail.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-body-sm text-ink font-medium truncate">{event.customerEmail}</div>
                      <div className="text-caption text-muted normal-case font-normal flex items-center gap-1.5 mt-0.5">
                        <span style={{ color: channelMeta.color }}>{channelMeta.icon}</span>
                        <span>{paymentMeta.icon} {paymentMeta.name}</span>
                        <span>·</span>
                        <span>{timeAgo(event.createdAt)}</span>
                      </div>
                    </div>
                    <span className="text-body-sm font-bold text-success tabular flex-shrink-0">+{formatMoneyFull(event.amount)}</span>
                    <Link href={`/posts?highlight=${event.postId}`}
                      className="btn-ghost !py-1.5 !px-2.5 text-[12px] border border-line flex-shrink-0">
                      View post
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}