// app/analytics/page.tsx
import { AppShell } from '@/components/layout/AppShell'
import { DUMMY_CHANNEL_STATS, DUMMY_POSTS, PLATFORM_META, SocialChannel } from '@/lib/dummy-data'
import { formatMoneyFull, formatNumber, trendLabel } from '@/lib/utils'

export default function AnalyticsPage() {
  const total = DUMMY_CHANNEL_STATS.reduce((s, c) => s + c.revenue, 0)

  return (
    <AppShell>
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-[22px] font-bold text-[#0F172A] mb-0.5">Analytics</h1>
          <p className="text-[#94A3B8] text-sm">Revenue, conversions and engagement by channel.</p>
        </div>

        {/* Revenue share bar */}
        <div className="card shadow-card p-5 mb-6">
          <div className="text-[11px] text-[#94A3B8] mb-3">Revenue share this month</div>
          <div className="flex h-5 rounded-full overflow-hidden gap-0.5 mb-3">
            {DUMMY_CHANNEL_STATS.sort((a, b) => b.revenue - a.revenue).map(ch => {
              const meta = PLATFORM_META[ch.platform]
              const pct = (ch.revenue / total) * 100
              return (
                <div key={ch.platform} title={`${meta.name}: ${formatMoneyFull(ch.revenue)}`}
                  style={{ width: `${pct}%`, backgroundColor: meta.color }}
                  className="transition-all cursor-pointer hover:opacity-80 first:rounded-l-full last:rounded-r-full" />
              )
            })}
          </div>
          <div className="flex flex-wrap gap-4">
            {DUMMY_CHANNEL_STATS.sort((a, b) => b.revenue - a.revenue).map(ch => {
              const meta = PLATFORM_META[ch.platform]
              return (
                <div key={ch.platform} className="flex items-center gap-1.5 text-[12px]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
                  <span className="text-[#475569]">{meta.name}</span>
                  <span className="text-[#94A3B8]">{((ch.revenue / total) * 100).toFixed(0)}%</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Channel detail cards */}
        <div className="space-y-3 mb-8">
          {DUMMY_CHANNEL_STATS.sort((a, b) => b.revenue - a.revenue).map((ch, i) => {
            const meta = PLATFORM_META[ch.platform]
            const positive = ch.trend >= 0
            return (
              <div key={ch.platform} className="card shadow-card p-5">
                <div className="flex items-center gap-4">
                  <span className="text-[#94A3B8] text-sm w-5 tabular">#{i + 1}</span>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: meta.bgColor, color: meta.color }}>
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-[#0F172A]">{meta.name}</span>
                      <span className={`badge text-[10px] ${positive ? 'badge-emerald' : 'badge-red'}`}>
                        {trendLabel(ch.trend)}
                      </span>
                    </div>
                    <div className="text-[12px] text-[#94A3B8]">{ch.posts} posts · {formatNumber(ch.clicks)} clicks</div>
                  </div>
                  <div className="grid grid-cols-3 gap-8 flex-shrink-0">
                    <div className="text-center">
                      <div className="text-sm font-bold text-[#0F172A] tabular">{formatMoneyFull(ch.revenue)}</div>
                      <div className="text-[10px] text-[#94A3B8] mt-0.5">Revenue</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-[#0F172A] tabular">{ch.conversions}</div>
                      <div className="text-[10px] text-[#94A3B8] mt-0.5">Sales</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-[#0F172A] tabular">{formatMoneyFull(ch.avgRevenuePerPost)}</div>
                      <div className="text-[10px] text-[#94A3B8] mt-0.5">Per post</div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Top posts table */}
        <div className="card shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E8ECF2]">
            <h2 className="font-semibold text-[#0F172A]">Top Posts by Revenue</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8F9FC] border-b border-[#E8ECF2]">
                <th className="text-left px-5 py-3 text-[11px] text-[#94A3B8] font-semibold uppercase tracking-wider">Post</th>
                <th className="text-left px-4 py-3 text-[11px] text-[#94A3B8] font-semibold uppercase tracking-wider">Channels</th>
                <th className="text-right px-4 py-3 text-[11px] text-[#94A3B8] font-semibold uppercase tracking-wider">Clicks</th>
                <th className="text-right px-4 py-3 text-[11px] text-[#94A3B8] font-semibold uppercase tracking-wider">Conv.</th>
                <th className="text-right px-5 py-3 text-[11px] text-[#94A3B8] font-semibold uppercase tracking-wider">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {DUMMY_POSTS.filter(p => p.status === 'published').sort((a, b) => b.revenue - a.revenue).map(post => (
                <tr key={post.id} className="border-b border-[#F1F4F9] hover:bg-[#F8F9FC] transition-colors last:border-0">
                  <td className="px-5 py-3.5">
                    <p className="text-[13px] text-[#0F172A] line-clamp-1 max-w-xs">{post.content}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-1">
                      {post.channels.map((ch: SocialChannel) => {
                        const meta = PLATFORM_META[ch]
                        return (
                          <span key={ch} className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: meta.bgColor, color: meta.color }}>
                            {meta.icon}
                          </span>
                        )
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right text-[13px] text-[#475569] tabular">{formatNumber(post.clicks)}</td>
                  <td className="px-4 py-3.5 text-right text-[13px] text-[#475569] tabular">{post.conversions}</td>
                  <td className="px-5 py-3.5 text-right text-[13px] font-bold text-[#10B981] tabular">
                    {formatMoneyFull(post.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  )
}
