// app/analytics/page.tsx
import { AppShell } from "@/components/layout/AppShell";
import { RevenueAreaChart } from "@/components/charts/RevenueAreaChart";
import {
  DUMMY_CHANNEL_STATS,
  DUMMY_POSTS,
  PLATFORM_META,
} from "@/lib/dummy-data";
import { formatMoneyFull, formatNumber, trendLabel } from "@/lib/utils";
import Link from "next/link";

export default function AnalyticsPage() {
  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-heading-lg text-ink mb-0.5">Analytics</h1>
            <p className="text-body-sm text-muted">
              Revenue, conversions and engagement by channel.
            </p>
          </div>

          {/* Tab switcher — Revenue (this page) vs Traffic */}
          <div className="flex gap-1 bg-surface-muted p-1 rounded-xl border border-line">
            <span className="px-4 py-2 rounded-lg text-body-sm font-medium bg-surface text-ink shadow-card">
              Revenue
            </span>
            <Link
              href="/analytics/traffic"
              className="px-4 py-2 rounded-lg text-body-sm font-medium text-muted hover:text-body transition-all"
            >
              Traffic
            </Link>
          </div>
        </div>

        {/* Revenue share chart */}
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-heading-sm text-ink">Revenue share this month</h2>
            <div className="flex items-center gap-3 flex-wrap">
              {[
                { label: "LinkedIn", color: "#0077B5" },
                { label: "Instagram", color: "#E1306C" },
                { label: "Twitter", color: "#000000" },
              ].map((c) => (
                <span key={c.label} className="flex items-center gap-1.5 text-body-sm text-muted">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.label}
                </span>
              ))}
            </div>
          </div>
          <RevenueAreaChart />
        </div>

        {/* Channel cards — 3-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
          {DUMMY_CHANNEL_STATS.sort((a, b) => b.revenue - a.revenue).map((ch) => {
            const meta = PLATFORM_META[ch.platform];
            const positive = ch.trend >= 0;
            return (
              <div key={ch.platform} className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: meta.bgColor, color: meta.color }}
                  >
                    {meta.icon}
                  </div>
                  <span className="font-medium text-ink">{meta.name}</span>
                </div>

                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-heading-lg text-ink tabular">{formatMoneyFull(ch.revenue)}</span>
                  <span className="text-caption text-muted normal-case font-normal">/ Revenue</span>
                </div>
                <div className={`text-caption font-medium normal-case mb-4 ${positive ? "text-success" : "text-primary"}`}>
                  {trendLabel(ch.trend)}
                </div>

                <div className="grid grid-cols-4 gap-2 pt-3 border-t border-line">
                  {[
                    { label: "Posts", value: ch.posts.toString() },
                    { label: "clicks", value: formatNumber(ch.clicks) },
                    { label: "Sales", value: ch.conversions.toString() },
                    { label: "Per post", value: formatMoneyFull(ch.avgRevenuePerPost) },
                  ].map((s) => (
                    <div key={s.label}>
                      <div className="text-body-sm font-bold text-ink tabular">{s.value}</div>
                      <div className="text-[10px] text-muted mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Top posts table */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-line">
            <h2 className="text-heading-sm text-ink">Top Posts by Revenue</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-muted border-b border-line">
                <th className="text-left px-5 py-3 text-caption text-muted font-semibold">Post</th>
                <th className="text-left px-4 py-3 text-caption text-muted font-semibold">Channel</th>
                <th className="text-right px-4 py-3 text-caption text-muted font-semibold">Clicks</th>
                <th className="text-right px-4 py-3 text-caption text-muted font-semibold">Conv.</th>
                <th className="text-right px-5 py-3 text-caption text-muted font-semibold">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {DUMMY_POSTS.filter((p) => p.status === "posted")
                .sort((a, b) => b.revenue_cents - a.revenue_cents)
                .map((post) => {
                  const meta = PLATFORM_META[post.channel];
                  return (
                    <tr key={post.id} className="border-b border-line hover:bg-surface-muted transition-colors last:border-0">
                      <td className="px-5 py-3.5">
                        <p className="text-body-sm text-ink line-clamp-1 max-w-xs">{post.content}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: meta?.bgColor, color: meta?.color }}
                        >
                          {meta?.icon} {meta?.name ?? post.channel}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right text-body-sm text-body tabular">{formatNumber(post.total_clicks)}</td>
                      <td className="px-4 py-3.5 text-right text-body-sm text-body tabular">{post.total_conversions}</td>
                      <td className="px-5 py-3.5 text-right text-body-sm font-bold text-success tabular">
                        {formatMoneyFull(post.revenue_cents)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}