// app/dashboard/page.tsx
import { AppShell } from '@/components/layout/AppShell'
import { RevenueAreaChart } from '@/components/charts/RevenueAreaChart'
import { DUMMY_OVERVIEW, DUMMY_POSTS, DUMMY_CHANNEL_STATS, DUMMY_REVENUE_EVENTS, PLATFORM_META, PAYMENT_META } from '@/lib/dummy-data'
import { formatMoney, formatMoneyFull, formatNumber, timeAgo, trendLabel } from '@/lib/utils'
import Link from 'next/link'

export default function DashboardPage() {
  const publishedPosts = DUMMY_POSTS.filter(p => p.status === 'published')
  const topPost = publishedPosts.sort((a, b) => b.revenue - a.revenue)[0]

  return (
    <AppShell>
      <div className="p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[22px] font-bold text-[#0F172A] mb-0.5">Good morning, Raysa 👋</h1>
            <p className="text-[#94A3B8] text-sm">June 2024 · Last sync 2 min ago</p>
          </div>
          <Link href="/links" className="btn-primary">+ New Post</Link>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Revenue', value: formatMoneyFull(DUMMY_OVERVIEW.totalRevenue), trend: `${trendLabel(DUMMY_OVERVIEW.revenueGrowth)} vs last month`, positive: true },
            { label: 'Posts Published', value: DUMMY_OVERVIEW.totalPosts.toString(), trend: `${DUMMY_OVERVIEW.totalConversions} conversions`, positive: true },
            { label: 'Revenue / Post', value: formatMoney(DUMMY_OVERVIEW.avgRevenuePerPost), trend: 'avg across all channels', positive: true },
            { label: 'Click → Buy Rate', value: `${DUMMY_OVERVIEW.conversionRate}%`, trend: `${formatNumber(DUMMY_OVERVIEW.totalClicks)} total clicks`, positive: true },
          ].map(s => (
            <div key={s.label} className="card shadow-card p-5">
              <div className="text-[12px] text-[#94A3B8] mb-2">{s.label}</div>
              <div className="text-2xl font-bold text-[#0F172A] tabular mb-1">{s.value}</div>
              <div className={`text-[12px] font-medium ${s.positive ? 'text-[#10B981]' : 'text-[#94A3B8]'}`}>{s.trend}</div>
            </div>
          ))}
        </div>

        {/* Best post callout */}
        {topPost && (
          <div className="card shadow-card p-5 mb-6 border-l-4 border-l-[#6366F1]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-[#6366F1] uppercase tracking-widest mb-2">⭐ Best performing post</div>
                <p className="text-[13px] text-[#475569] line-clamp-2 mb-2">{topPost.content}</p>
                <div className="flex items-center gap-3 flex-wrap">
                  {topPost.channels.map(ch => (
                    <span key={ch} className="text-[11px] text-[#94A3B8]">{PLATFORM_META[ch].name}</span>
                  ))}
                  <span className="text-[#E8ECF2]">·</span>
                  <span className="text-[11px] text-[#94A3B8]">{topPost.conversions} conversions</span>
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-2xl font-bold text-[#0F172A] tabular">{formatMoneyFull(topPost.revenue)}</div>
                <div className="text-[12px] text-[#94A3B8]">earned</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
          {/* Revenue chart */}
          <div className="lg:col-span-3 card shadow-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-[#0F172A]">Revenue by Channel</h2>
              <div className="flex items-center gap-3 flex-wrap">
                {[
                  { label: 'LinkedIn', color: '#0077B5' },
                  { label: 'Instagram', color: '#E1306C' },
                  { label: 'Twitter', color: '#64748B' },
                ].map(c => (
                  <span key={c.label} className="flex items-center gap-1.5 text-[11px] text-[#94A3B8]">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                    {c.label}
                  </span>
                ))}
              </div>
            </div>
            <RevenueAreaChart />
          </div>

          {/* Channel leaderboard */}
          <div className="lg:col-span-2 card shadow-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-[#0F172A]">By Channel</h2>
              <Link href="/analytics" className="text-[11px] text-[#6366F1] hover:text-[#4F46E5] transition-colors">Full breakdown →</Link>
            </div>
            <div className="space-y-3">
              {DUMMY_CHANNEL_STATS.sort((a, b) => b.revenue - a.revenue).map((ch, i) => {
                const meta = PLATFORM_META[ch.platform]
                const maxRev = DUMMY_CHANNEL_STATS[0].revenue
                return (
                  <div key={ch.platform} className="flex items-center gap-3">
                    <span className="text-[#94A3B8] text-xs w-4 tabular">{i + 1}</span>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: meta.bgColor, color: meta.color }}>
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] font-medium text-[#0F172A]">{meta.name}</span>
                        <span className="text-[13px] font-bold text-[#0F172A] tabular">{formatMoney(ch.revenue)}</span>
                      </div>
                      <div className="h-1.5 bg-[#F1F4F9] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${(ch.revenue / maxRev) * 100}%`, backgroundColor: meta.color }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Recent revenue events */}
        <div className="card shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[#0F172A]">Recent Sales</h2>
            <Link href="/revenue" className="text-[11px] text-[#6366F1] hover:text-[#4F46E5]">View all →</Link>
          </div>
          <div className="space-y-2">
            {DUMMY_REVENUE_EVENTS.slice(0, 5).map(event => {
              const channelMeta = PLATFORM_META[event.channel]
              const paymentMeta = PAYMENT_META[event.provider]
              return (
                <div key={event.id} className="flex items-center gap-3 py-2.5 border-b border-[#F1F4F9] last:border-0">
                  <div className="w-7 h-7 rounded-full bg-[#F1F4F9] flex items-center justify-center text-[11px] font-bold text-[#475569] flex-shrink-0">
                    {event.customerEmail.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-[#0F172A] font-medium truncate">{event.customerEmail}</div>
                    <div className="text-[11px] text-[#94A3B8] flex items-center gap-1.5 mt-0.5">
                      <span style={{ color: channelMeta.color }}>{channelMeta.name}</span>
                      <span>·</span>
                      <span>{paymentMeta.icon} {paymentMeta.name}</span>
                      <span>·</span>
                      <span className="truncate">{event.postPreview}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-[13px] font-bold text-[#10B981] tabular">+{formatMoneyFull(event.amount)}</span>
                    <span className="text-[11px] text-[#94A3B8]">{timeAgo(event.createdAt)}</span>
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
