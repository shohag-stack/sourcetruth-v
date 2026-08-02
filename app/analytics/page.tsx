// app/analytics/page.tsx
import { AppShell } from "@/components/layout/AppShell";
import { RevenueAreaChart } from "@/components/charts/RevenueAreaChart";
import { formatMoneyFull, formatNumber, trendLabel } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { metaFor } from "@/lib/metaFor";

// Fallback meta for sources PLATFORM_META doesn't know about — 'direct'
// (no referrer at all) or a bare hostname from an unrecognized platform,
// both real possibilities now that source comes from actual referrers.

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export default async function AnalyticsPage() {


  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: site } = await supabase
    .from("sites")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!site) {
    return (
      <AppShell>
        <div className="p-8">
          <div className="card p-10 text-center">
            <div className="text-4xl mb-3">📊</div>
            <h2 className="text-heading-sm text-ink mb-2">No site connected</h2>
            <p className="text-body-sm text-muted mb-4">Add a site in Settings to start seeing analytics.</p>
            <a href="/settings" className="btn-primary">Go to Settings →</a>
          </div>
        </div>
      </AppShell>
    );
  }

  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const since60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: posts },
    { data: clicks },
    { data: conversions },
  ] = await Promise.all([
    supabase
      .from("posts")
      .select("id, content, channel, revenue_cents, status, total_clicks, total_conversions")
      .eq("site_id", site.id)
      .eq("status", "posted"),
    supabase.from("clicks").select("source, post_id").eq("site_id", site.id),
    // fetch since60 once, slice this-30/prior-30 in JS rather than two queries
    supabase
      .from("conversions")
      .select("source, amount_cents, post_id, received_at")
      .eq("site_id", site.id)
      .gte("received_at", since60),
  ]);

  const postsList = posts ?? [];
  const clicksList = clicks ?? [];
  const conversionsList = conversions ?? [];

  // ── Per-source aggregation. This used to also track a "posts" count
  // per source (the declared post.channel), but that mixed two different
  // things into one card: "you planned X" and "money actually came from
  // Y" under the same label. Channel Cards below are now purely ACTUAL
  // performance — clicks/sales/revenue from real referrer data. Declared
  // channel lives at the post level only (Top Posts table), shown
  // side-by-side with actual source so a mismatch is visible, not hidden. ──
  interface SourceStat {
    source: string;
    clicks: number;
    conversions: number;
    revenueCents: number;
    revenueCents30: number;
    revenueCentsPrior30: number;
  }
  const sourceStats = new Map<string, SourceStat>();

  function getStat(source: string): SourceStat {
    let s = sourceStats.get(source);
    if (!s) {
      s = { source, clicks: 0, conversions: 0, revenueCents: 0, revenueCents30: 0, revenueCentsPrior30: 0 };
      sourceStats.set(source, s);
    }
    return s;
  }

  clicksList.forEach(c => {
    getStat(c.source ?? "direct").clicks += 1;
  });

  conversionsList.forEach(c => {
    const stat = getStat(c.source ?? "direct");
    stat.conversions += 1;
    stat.revenueCents += c.amount_cents;
    if (c.received_at >= since30) {
      stat.revenueCents30 += c.amount_cents;
    } else {
      stat.revenueCentsPrior30 += c.amount_cents;
    }
  });

  const channelStats = Array.from(sourceStats.values())
    .filter(s => s.clicks > 0 || s.conversions > 0)
    .sort((a, b) => b.revenueCents - a.revenueCents);

  // ── Which real sources actually drove sales for each post — for the
  // Top Posts table. A post can have sales from multiple actual sources
  // even though it only has one declared channel. ──

  // ── Daily revenue series for the chart, last 30 days, grouped by
  // real source, filled with zeros so there are no gaps ──
  const CHART_CHANNELS = ["linkedin", "instagram", "twitter", "facebook", "threads"] as const;
  const dayBuckets = new Map<string, Record<string, any>>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const row: Record<string, number> = { total: 0 };
    CHART_CHANNELS.forEach(ch => { row[ch] = 0; });
    dayBuckets.set(key, { ...row, __label: label });
  }
  conversionsList.forEach(c => {
    if (c.received_at < since30) return;
    const key = c.received_at.slice(0, 10);
    const bucket = dayBuckets.get(key);
    if (!bucket) return;
    const dollars = c.amount_cents / 100;
    bucket.total += dollars;
    const src = c.source ?? "direct";
    if (CHART_CHANNELS.includes(src as any)) bucket[src] += dollars;
  });
  const chartData = Array.from(dayBuckets.values()).map(row => {
    const { __label, ...rest } = row;
    return { date: __label, ...rest };
  });

  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-heading-lg text-ink mb-0.5">Analytics</h1>
            <p className="text-body-sm text-muted">
              Revenue, conversions and engagement by real source.
            </p>
          </div>

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
            <h2 className="text-heading-sm text-ink">Revenue share, last 30 days</h2>
            <div className="flex items-center gap-3 flex-wrap">
              {CHART_CHANNELS.map(ch => {
                const meta = metaFor(ch);
                return (
                  <span key={ch} className="flex items-center gap-1.5 text-body-sm text-muted">
                    <span className="w-2 h-2 rounded-full" />
                    {meta.name}
                  </span>
                );
              })}
            </div>
          </div>
          <RevenueAreaChart data={chartData} />
        </div>

        {/* Channel cards — real source, not declared channel */}
        {channelStats.length === 0 ? (
          <div className="card p-8 text-center text-body-sm text-muted mb-8">
            No clicks or sales yet — this fills in once your tracked links start getting traffic.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
            {channelStats.map(ch => {
              const meta = metaFor(ch.source);
              const trend = pctChange(ch.revenueCents30, ch.revenueCentsPrior30);
              const positive = trend >= 0;
              const avgPerSale = ch.conversions > 0 ? ch.revenueCents / ch.conversions / 100 : 0;

              return (
                <div key={ch.source} className="card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                      
                    >
                      {/* {meta.} */}
                    </div>
                    <span className="font-medium text-ink">{meta.name}</span>
                  </div>

                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-heading-lg text-ink tabular">{formatMoneyFull(ch.revenueCents / 100)}</span>
                    <span className="text-caption text-muted normal-case font-normal">/ Revenue</span>
                  </div>
                  <div className={`text-caption font-medium normal-case mb-4 ${positive ? "text-success" : "text-primary"}`}>
                    {trendLabel(trend)} <span className="text-muted">vs prior 30d</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-line">
                    {[
                      { label: "clicks", value: formatNumber(ch.clicks) },
                      { label: "Sales", value: ch.conversions.toString() },
                      { label: "Per sale", value: ch.conversions > 0 ? formatMoneyFull(avgPerSale) : "—" },
                    ].map(s => (
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
        )}
            
      </div>
    </AppShell>
  );
}