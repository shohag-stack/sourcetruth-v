// app/analytics/traffic/page.tsx
import { AppShell } from "@/components/layout/AppShell";
import {
  VisitorRevenueChart,
  VisitorRevenueDay,
} from "@/components/charts/VisitorRevenueChart";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { getSince } from "@/lib/getSince";

// ─── Helpers ──────────────────────────────────────────────────
function formatDuration(seconds: number): string {
  if (!seconds || seconds < 1) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

// ─── Ranked list component ────────────────────────────────────
function RankedList({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: number; flag?: string }[];
}) {
  const max = rows[0]?.value ?? 1;
  return (
    <div className="card p-5">
      <h2 className="text-heading-sm text-ink mb-4">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-body-sm text-muted py-4 text-center">No data yet</p>
      ) : (
        <div className="space-y-1">
          {rows.map((row, i) => {
            const pct = Math.round((row.value / max) * 100);
            return (
              <div
                key={`${row.label}-${i}`}
                className="relative flex items-center justify-between px-2 py-2 rounded-lg overflow-hidden"
              >
                <div
                  className="absolute inset-y-0 left-0 bg-surface-muted rounded-lg"
                  style={{ width: `${pct}%` }}
                />
                <span className="relative text-body-sm text-ink flex items-center gap-2">
                  {row.flag && <span>{row.flag}</span>}
                  {row.label}
                </span>
                <span className="relative text-body-sm text-body flex items-center gap-2 tabular">
                  {formatNumber(row.value)}
                  <span className="text-muted">|</span>
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Country flag emoji ───────────────────────────────────────
function countryFlag(code: string): string {
  if (!code || code === "unknown") return "🌍";
  const flag = code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
  return flag;
}

type Range = "24h" | "7d" | "30d" | "90d" | "1y" | "all";

// ─── Chart bucketing — granularity adapts to the selected range.
// 24h alone in daily buckets is useless (~1 near-empty bar), so this
// picks hour/day/week/month depending on how wide the window is. ──
type BucketUnit = "hour" | "day" | "week" | "month";

function getBucketUnit(range: Range): BucketUnit {
  switch (range) {
    case "24h":
      return "hour";
    case "7d":
    case "30d":
      return "day";
    case "90d":
      return "week";
    case "1y":
    case "all":
      return "month";
  }
}

function truncate(date: Date, unit: BucketUnit): Date {
  const d = new Date(date);
  if (unit === "hour") {
    d.setMinutes(0, 0, 0);
    return d;
  }
  d.setHours(0, 0, 0, 0);
  if (unit === "day") return d;
  if (unit === "week") {
    d.setDate(d.getDate() - d.getDay()); // back to Sunday
    return d;
  }
  d.setDate(1); // month
  return d;
}

function bucketKey(date: Date, unit: BucketUnit): string {
  if (unit === "hour") return date.toISOString().slice(0, 13); // YYYY-MM-DDTHH
  if (unit === "month") return date.toISOString().slice(0, 7); // YYYY-MM
  return date.toISOString().slice(0, 10); // YYYY-MM-DD (day or week-start)
}

function shortLabel(date: Date, unit: BucketUnit): string {
  if (unit === "hour") return date.toLocaleTimeString("en-US", { hour: "numeric" });
  if (unit === "month") return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fullLabel(date: Date, unit: BucketUnit): string {
  if (unit === "hour") {
    return date.toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric" });
  }
  if (unit === "month") return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  if (unit === "week") return `Week of ${date.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`;
  return date.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" });
}

function advance(date: Date, unit: BucketUnit, steps: number): Date {
  const d = new Date(date);
  if (unit === "hour") d.setHours(d.getHours() + steps);
  else if (unit === "day") d.setDate(d.getDate() + steps);
  else if (unit === "week") d.setDate(d.getDate() + steps * 7);
  else d.setMonth(d.getMonth() + steps);
  return d;
}

const RANGE_PHRASE: Record<Range, string> = {
  "24h": "today",
  "7d": "this week",
  "30d": "this month",
  "90d": "this quarter",
  "1y": "this year",
  all: "all time",
};

// ─── Page ─────────────────────────────────────────────────────
export default async function TrafficAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: Range }>;
}) {
  const params = await searchParams;
  const range: Range = params.range ?? "24h";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Get first site for this user
  // TODO: add site switcher when multiple sites UI is ready
  const { data: site } = await supabase
    .from("sites")
    .select("id, name, domain")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // No site yet
  if (!site) {
    return (
      <AppShell>
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="text-4xl mb-3">📊</div>
            <h2 className="text-heading-sm text-ink mb-2">
              No site connected yet
            </h2>
            <p className="text-body-sm text-muted mb-4">
              Add a site in Settings to start tracking visitors.
            </p>
            <Link href="/settings" className="btn-primary">
              Go to Settings →
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Fetch all pageviews for this site ─────────────────────
  const since = getSince(range);

  let pageviewsQuery = supabase
    .from("pageviews")
    .select(
      "session_id, path, country, device, browser, os, is_bounce, is_new_visitor, duration_seconds, visited_at",
    )
    .eq("site_id", site.id);

  let conversionsQuery = supabase
    .from("conversions")
    .select("amount_cents, customer_email, received_at")
    .eq("site_id", site.id)
    .eq("refunded", false);

  if (since) {
    pageviewsQuery = pageviewsQuery.gte("visited_at", since.toISOString());
    conversionsQuery = conversionsQuery.gte(
      "received_at",
      since.toISOString(),
    );
  }

  const [{ data: pageviews }, { data: conversions }] = await Promise.all([
    pageviewsQuery.order("visited_at", { ascending: false }),
    conversionsQuery.order("received_at", { ascending: true }),
  ]);

  const rows = pageviews ?? [];
  const conversionRows = conversions ?? [];

  // ── Aggregate stats ───────────────────────────────────────
  const totalPageviews = rows.length;

  // Unique visitors = distinct session_ids
  const uniqueSessions = new Set(rows.map((r) => r.session_id));
  const totalVisitors = uniqueSessions.size;

  // Avg session duration — only sessions with duration data
  const durationsPerSession = new Map<string, number[]>();
  rows.forEach((r) => {
    if (r.duration_seconds && r.duration_seconds > 0) {
      const existing = durationsPerSession.get(r.session_id) ?? [];
      existing.push(r.duration_seconds);
      durationsPerSession.set(r.session_id, existing);
    }
  });
  const allDurations = Array.from(durationsPerSession.values()).map((arr) =>
    arr.reduce((a, b) => a + b, 0),
  );
  const avgDuration =
    allDurations.length > 0
      ? allDurations.reduce((a, b) => a + b, 0) / allDurations.length
      : 0;

  // ── Bounce rate — single pageview AND left quickly (<10s), not just
  // single pageview. A visitor who stays 6+ minutes on one page is
  // engaged, not bounced. ──
  const BOUNCE_DURATION_THRESHOLD_SECONDS = 10;
  const pageCountBySession = new Map<string, number>();
  rows.forEach((r) => {
    pageCountBySession.set(r.session_id, (pageCountBySession.get(r.session_id) ?? 0) + 1);
  });
  let realBouncedCount = 0;
  uniqueSessions.forEach((sessionId) => {
    const pageCount = pageCountBySession.get(sessionId) ?? 0;
    const totalDuration = (durationsPerSession.get(sessionId) ?? []).reduce((a, b) => a + b, 0);
    if (pageCount <= 1 && totalDuration < BOUNCE_DURATION_THRESHOLD_SECONDS) {
      realBouncedCount += 1;
    }
  });
  const bounceRate =
    totalVisitors > 0 ? Math.round((realBouncedCount / totalVisitors) * 100) : 0;

  // New visitors this period
  const newVisitors = rows.filter((r) => r.is_new_visitor).length;

  // ── Top pages ─────────────────────────────────────────────
  const pageCounts = new Map<string, number>();
  rows.forEach((r) => {
    const path = r.path ?? "/";
    pageCounts.set(path, (pageCounts.get(path) ?? 0) + 1);
  });
  const topPages = Array.from(pageCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }));

  // ── Top countries ─────────────────────────────────────────
  const countryCounts = new Map<string, number>();
  rows.forEach((r) => {
    const c = r.country ?? "unknown";
    countryCounts.set(c, (countryCounts.get(c) ?? 0) + 1);
  });
  const topCountries = Array.from(countryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([code, value]) => ({
      label: code === "unknown" ? "Unknown" : code,
      value,
      flag: countryFlag(code),
    }));

  // ── Top devices ───────────────────────────────────────────
  const deviceCounts = new Map<string, number>();
  rows.forEach((r) => {
    const d = r.device ?? "unknown";
    deviceCounts.set(d, (deviceCounts.get(d) ?? 0) + 1);
  });
  const topDevices = Array.from(deviceCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      value,
    }));

  // ── Top browsers ──────────────────────────────────────────
  const browserCounts = new Map<string, number>();
  rows.forEach((r) => {
    const b = r.browser ?? "unknown";
    browserCounts.set(b, (browserCounts.get(b) ?? 0) + 1);
  });
  const topBrowsers = Array.from(browserCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      value,
    }));

  // ── Top OS ────────────────────────────────────────────────
  const osCounts = new Map<string, number>();
  rows.forEach((r) => {
    const o = r.os ?? "unknown";
    osCounts.set(o, (osCounts.get(o) ?? 0) + 1);
  });
  const topOS = Array.from(osCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      value,
    }));

  // ── Stat cards data ───────────────────────────────────────
  const STATS = [
    {
      label: "Total Visitors",
      value: formatNumber(totalVisitors),
      sub: `${formatNumber(newVisitors)} new ${RANGE_PHRASE[range]}`,
      positive: true,
    },
    {
      label: "Page Views",
      value: formatNumber(totalPageviews),
      sub: `${
        totalVisitors > 0 ? (totalPageviews / totalVisitors).toFixed(1) : 0
      } pages / visit`,
      positive: true,
    },
    {
      label: "Bounce Rate",
      value: `${bounceRate}%`,
      sub: bounceRate < 50 ? "Good engagement" : "High bounce",
      positive: bounceRate < 50,
    },
    {
      label: "Avg Session",
      value: formatDuration(avgDuration),
      sub: `${allDurations.length} sessions tracked`,
      positive: avgDuration > 30,
    },
  ];

  // ── Visitors + Revenue combo chart data — bucket granularity now
  // matches the selected range instead of always being 30 daily bars. ──
  const unit = getBucketUnit(range);
  const now = new Date();
  const nowBucketStart = truncate(now, unit);

  let bucketStarts: Date[];
  if (range === "all") {
    // no fixed count — span from the earliest real data point to now
    const allTimestamps = [
      ...rows.map((r) => new Date(r.visited_at).getTime()),
      ...conversionRows.map((c) => new Date(c.received_at).getTime()),
    ];
    const earliest = allTimestamps.length ? new Date(Math.min(...allTimestamps)) : now;
    const earliestBucketStart = truncate(earliest, unit);
    bucketStarts = [];
    let cursor = earliestBucketStart;
    // safety cap so a data-entry typo years in the past can't blow up the loop
    let guard = 0;
    while (cursor <= nowBucketStart && guard < 600) {
      bucketStarts.push(cursor);
      cursor = advance(cursor, unit, 1);
      guard += 1;
    }
    if (bucketStarts.length === 0) bucketStarts = [nowBucketStart];
  } else {
    const BUCKET_COUNT: Record<Exclude<Range, "all">, number> = {
      "24h": 24,
      "7d": 7,
      "30d": 30,
      "90d": 13, // ~90 days as weeks
      "1y": 12,
    };
    const count = BUCKET_COUNT[range];
    bucketStarts = Array.from({ length: count }, (_, idx) =>
      advance(nowBucketStart, unit, idx - (count - 1)),
    );
  }

  const dayBuckets = new Map<
    string,
    {
      fullDate: string;
      sessions: Map<string, boolean>; // sessionId -> isNew
      revenueCents: number;
      newRevenueCents: number;
      returningRevenueCents: number;
      conversions: number;
    }
  >();
  const dayKeys: string[] = [];
  bucketStarts.forEach((d) => {
    const key = bucketKey(d, unit);
    dayKeys.push(key);
    dayBuckets.set(key, {
      fullDate: fullLabel(d, unit),
      sessions: new Map(),
      revenueCents: 0,
      newRevenueCents: 0,
      returningRevenueCents: 0,
      conversions: 0,
    });
  });

  rows.forEach((r) => {
    const key = bucketKey(truncate(new Date(r.visited_at), unit), unit);
    const bucket = dayBuckets.get(key);
    if (!bucket) return;
    const existing = bucket.sessions.get(r.session_id);
    bucket.sessions.set(r.session_id, existing || !!r.is_new_visitor);
  });

  const seenEmails = new Set<string>();
  conversionRows.forEach((c) => {
    const key = bucketKey(truncate(new Date(c.received_at), unit), unit);
    const bucket = dayBuckets.get(key);
    if (!bucket) return;
    bucket.revenueCents += c.amount_cents;
    bucket.conversions += 1;
    const isNewCustomer = c.customer_email
      ? !seenEmails.has(c.customer_email)
      : true;
    if (c.customer_email) seenEmails.add(c.customer_email);
    if (isNewCustomer) bucket.newRevenueCents += c.amount_cents;
    else bucket.returningRevenueCents += c.amount_cents;
  });

  const chartData: VisitorRevenueDay[] = bucketStarts.map((d) => {
    const key = bucketKey(d, unit);
    const b = dayBuckets.get(key)!;
    const visitors = b.sessions.size;
    const newVisitorsCount = Array.from(b.sessions.values()).filter(Boolean).length;
    return {
      date: shortLabel(d, unit),
      fullDate: b.fullDate,
      visitors,
      newVisitors: newVisitorsCount,
      returningVisitors: visitors - newVisitorsCount,
      revenueCents: b.revenueCents,
      newRevenueCents: b.newRevenueCents,
      returningRevenueCents: b.returningRevenueCents,
      conversions: b.conversions,
    };
  });

  return (
    <AppShell>
      <div className="p-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-heading-lg text-ink mb-0.5">Analytics</h1>
            <p className="text-body-sm text-muted">
              {site.domain} · {RANGE_PHRASE[range] === "all time" ? "All time" : `Last ${range}`} ·{" "}
              {totalPageviews === 0
                ? "No data yet — make sure track.js is installed"
                : `${formatNumber(totalPageviews)} pageviews recorded`}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center gap-2">
            <DateRangePicker />
          </div>
        </div>

        {/* Empty state */}
        {totalPageviews === 0 && (
          <div className="card p-10 text-center mb-6">
            <div className="text-4xl mb-3">📡</div>
            <h2 className="text-heading-sm text-ink mb-2">No pageviews yet</h2>
            <p className="text-body-sm text-muted mb-5 max-w-sm mx-auto">
              Make sure your tracking script is installed on{" "}
              <strong>{site.domain}</strong> and visitors are arriving with{" "}
              <code className="bg-surface-muted px-1.5 py-0.5 rounded text-xs font-mono text-primary">
                ?st=
              </code>{" "}
              in their URL.
            </p>
            <Link href="/settings" className="btn-outline-primary text-sm">
              Check tracking script →
            </Link>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {STATS.map((s) => (
            <div key={s.label} className="card p-5">
              <div className="text-body-sm text-body mb-2">{s.label}</div>
              <div className="text-2xl font-bold text-ink tabular mb-1">
                {s.value}
              </div>
              <div
                className={`text-caption font-medium ${
                  s.positive ? "text-success" : "text-primary"
                }`}
              >
                {s.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Visitors + Revenue combo chart, right beneath the stat cards */}
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-heading-sm text-ink">Visitors & Revenue</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5 text-body-sm text-muted">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: "#93C5FD" }}
                />
                Visitors
              </span>
              <span className="flex items-center gap-1.5 text-body-sm text-muted">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: "#F0A585" }}
                />
                Revenue
              </span>
            </div>
          </div>
          <VisitorRevenueChart data={chartData} />
        </div>

        {/* Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <RankedList title="Top Pages" rows={topPages} />
          <RankedList title="Countries" rows={topCountries} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <RankedList title="Devices" rows={topDevices} />
          <RankedList title="Browsers" rows={topBrowsers} />
          <RankedList title="OS" rows={topOS} />
        </div>
      </div>
    </AppShell>
  );
}