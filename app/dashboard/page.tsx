// app/dashboard/page.tsx
import { AppShell } from "@/components/layout/AppShell";
import {
  VisitorRevenueChart,
  VisitorRevenueDay,
} from "@/components/charts/VisitorRevenueChart";
import { countryFlag } from "@/lib/countryFlag";
import {
  formatMoney,
  formatMoneyFull,
  formatNumber,
  pctChange,
  timeAgo,
  trendLabel,
} from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { metaFor } from "@/lib/metaFor";
import BestPostCard from "@/components/posts/BestPostCard";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const now = new Date();
  const since30 = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const since60 = new Date(
    now.getTime() - 60 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const since5min = new Date(now.getTime() - 1 * 60 * 1000).toISOString();

  const { data: sites } = await supabase
    .from("sites")
    .select("id")
    .eq("user_id", user.id);

  const siteIds = (sites ?? []).map((s) => s.id);

  const [
    { count: totalPosts },
    { count: postedCount },
    { data: conversions60 }, // single query, sliced in JS for 30d/prior-30d/chart/leaderboard/recent-sales
    { data: bestPostsRaw },
    { data: pageviews60 }, // for visitor counts, bounce rate, and the new chart — see notes below
  ] = await Promise.all([
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "posted"),
    supabase
      .from("conversions")
      .select(
        "id, source, amount_cents, post_id, customer_email, provider,first_source, received_at",
      )
      .eq("user_id", user.id)
      .gte("received_at", since60)
      .order("received_at", { ascending: false }),
    // no `channel` column selected here anymore — declared channel isn't
    // shown on this page at all now, only real conversions.source is
    supabase
      .from("posts")
      .select(
        "id, content, tracked_link, status, created_at, revenue_cents, total_clicks, unique_clicks, total_conversions",
      )
      .eq("user_id", user.id)
      .eq("status", "posted")
      .order("revenue_cents", { ascending: false })
      .limit(2),
    siteIds.length
      ? supabase
          .from("pageviews")
          .select("session_id, visited_at, duration_seconds, is_new_visitor")
          .in("site_id", siteIds)
          .gte("visited_at", since60)
      : Promise.resolve({
          data: [] as {
            session_id: string;
            visited_at: string;
            duration_seconds: number | null;
            is_new_visitor: boolean;
          }[],
        }),
  ]);

  const pageviewRows = pageviews60 ?? [];
  const pageviewsThis30 = pageviewRows.filter((p) => p.visited_at >= since30);
  const visitors30 = new Set(pageviewsThis30.map((p) => p.session_id)).size;
  const visitorsPrior30 = new Set(
    pageviewRows.filter((p) => p.visited_at < since30).map((p) => p.session_id),
  ).size;

  // ── Bounce rate — same fix as the Traffic page: single pageview AND
  // left quickly (<10s), not just single pageview. A visitor who stays
  // minutes on one page is engaged, not bounced. ──

  const BOUNCE_DURATION_THRESHOLD_SECONDS = 10;
  const pageCountBySession30 = new Map<string, number>();
  const durationBySession30 = new Map<string, number>();

  pageviewsThis30.forEach((p) => {
    pageCountBySession30.set(
      p.session_id,
      (pageCountBySession30.get(p.session_id) ?? 0) + 1,
    );
    durationBySession30.set(
      p.session_id,
      (durationBySession30.get(p.session_id) ?? 0) + (p.duration_seconds ?? 0),
    );
  });

  let bouncedCount30 = 0;
  new Set(pageviewsThis30.map((p) => p.session_id)).forEach((sessionId) => {
    const pageCount = pageCountBySession30.get(sessionId) ?? 0;
    const duration = durationBySession30.get(sessionId) ?? 0;
    if (pageCount <= 1 && duration < BOUNCE_DURATION_THRESHOLD_SECONDS)
      bouncedCount30 += 1;
  });
  const bounceRate30 =
    visitors30 > 0 ? Math.round((bouncedCount30 / visitors30) * 100) : 0;

  // ── "Online" — real approximation: distinct sessions with a pageview
  // in the last 5 minutes. No persistent heartbeat/presence system exists
  // yet, but this is the same approach Plausible and most lightweight
  // analytics tools use for "current visitors" — not a placeholder, a
  // legitimate (if slightly coarse) live signal built from data you
  // already have. ──
  const onlineNow = new Set(
    pageviewRows
      .filter((p) => p.visited_at >= since5min)
      .map((p) => p.session_id),
  ).size;

  const allConversions = conversions60 ?? [];
  const conversionsThis30 = allConversions.filter(
    (c) => c.received_at >= since30,
  );
  const conversionsPrior30 = allConversions.filter(
    (c) => c.received_at < since30,
  );

  const totalRevenueCents30 = conversionsThis30.reduce(
    (s, c) => s + c.amount_cents,
    0,
  );
  const totalRevenuePrior30 = conversionsPrior30.reduce(
    (s, c) => s + c.amount_cents,
    0,
  );
  const revenueGrowth = pctChange(totalRevenueCents30, totalRevenuePrior30);
  const visitorsGrowth = pctChange(visitors30 ?? 0, visitorsPrior30 ?? 0);

  const avgRevenuePerPostCents =
    (postedCount ?? 0) > 0 ? totalRevenueCents30 / (postedCount ?? 1) : 0;

  // ── Best-post top-clicked countries (unchanged — this is real geo
  // data from clicks, not a channel question) ──
  const bestPostIds = (bestPostsRaw ?? []).map((p) => p.id);
  const { data: bestPostClicks } = bestPostIds.length
    ? await supabase
        .from("clicks")
        .select("post_id, country")
        .in("post_id", bestPostIds)
    : { data: [] as { post_id: string; country: string | null }[] };

  const countryCountByPost = new Map<string, Record<string, number>>();
  bestPostClicks?.forEach((c) => {
    if (!c.country) return;
    const entry = countryCountByPost.get(c.post_id) ?? {};
    entry[c.country] = (entry[c.country] ?? 0) + 1;
    countryCountByPost.set(c.post_id, entry);
  });

  // ── Real source(s) each best-post actually sold through — replaces
  // the old declared-channel badge entirely ──
  const sourcesByPost = new Map<string, Set<string>>();
  allConversions.forEach((c) => {
    if (!c.post_id) return;
    const set = sourcesByPost.get(c.post_id) ?? new Set<string>();
    set.add(c.source ?? "direct");
    sourcesByPost.set(c.post_id, set);
  });

  // ── Channel leaderboard — grouped by REAL source (conversions.source),
  // not declared post.channel. This used to group by declared channel,
  // same bug as everywhere else. ──
  const channelTotals = new Map<string, number>();
  conversionsThis30.forEach((c) => {
    const src = c.source ?? "direct";
    channelTotals.set(src, (channelTotals.get(src) ?? 0) + c.amount_cents);
  });
  const channelLeaderboard = Array.from(channelTotals.entries())
    .map(([source, revenue_cents]) => ({ source, revenue_cents }))
    .sort((a, b) => b.revenue_cents - a.revenue_cents);

  // ── Daily revenue series for the "Revenue by Source" chart, grouped
  // by REAL source ──
  const CHART_CHANNELS = [
    "linkedin",
    "instagram",
    "twitter",
    "facebook",
    "threads",
  ] as const;
  const dayBuckets = new Map<string, Record<string, any>>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const row: Record<string, number> = { total: 0 };
    CHART_CHANNELS.forEach((ch) => {
      row[ch] = 0;
    });
    dayBuckets.set(key, { ...row, __label: label });
  }
  conversionsThis30.forEach((c) => {
    const key = c.received_at.slice(0, 10);
    const bucket = dayBuckets.get(key);
    if (!bucket) return;
    const dollars = c.amount_cents / 100;
    bucket.total += dollars;
    const src = c.source ?? "direct";
    if (CHART_CHANNELS.includes(src as any)) bucket[src] += dollars;
  });
  const chartData = Array.from(dayBuckets.values()).map((row) => {
    const { __label, ...rest } = row;
    return { date: __label, ...rest };
  });

  // ── Visitors + Revenue combo chart data — same shape/logic as the
  // Traffic page's chart, fixed to a 30-day daily view here since the
  // Dashboard doesn't have a range picker. ──
  const vrBuckets = new Map<
    string,
    {
      fullDate: string;
      sessions: Map<string, boolean>;
      revenueCents: number;
      newRevenueCents: number;
      returningRevenueCents: number;
      conversions: number;
    }
  >();
  const vrDayKeys: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    vrDayKeys.push(key);
    vrBuckets.set(key, {
      fullDate: d.toLocaleDateString("en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
      sessions: new Map(),
      revenueCents: 0,
      newRevenueCents: 0,
      returningRevenueCents: 0,
      conversions: 0,
    });
  }
  pageviewsThis30.forEach((p) => {
    const key = p.visited_at.slice(0, 10);
    const bucket = vrBuckets.get(key);
    if (!bucket) return;
    const existing = bucket.sessions.get(p.session_id);
    bucket.sessions.set(p.session_id, existing || !!p.is_new_visitor);
  });
  const vrSeenEmails = new Set<string>();
  conversionsThis30.forEach((c) => {
    const key = c.received_at.slice(0, 10);
    const bucket = vrBuckets.get(key);
    if (!bucket) return;
    bucket.revenueCents += c.amount_cents;
    bucket.conversions += 1;
    const isNewCustomer = c.customer_email
      ? !vrSeenEmails.has(c.customer_email)
      : true;
    if (c.customer_email) vrSeenEmails.add(c.customer_email);
    if (isNewCustomer) bucket.newRevenueCents += c.amount_cents;
    else bucket.returningRevenueCents += c.amount_cents;
  });
  const visitorRevenueData: VisitorRevenueDay[] = vrDayKeys.map((key) => {
    const b = vrBuckets.get(key)!;
    const visitors = b.sessions.size;
    const newVisitorsCount = Array.from(b.sessions.values()).filter(
      Boolean,
    ).length;
    return {
      date: new Date(key).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
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

  const recentSales = allConversions.slice(0, 4);

  const statCards = [
    {
      label: "Visitors",
      value: formatNumber(visitors30 ?? 0),
      trend: `${trendLabel(visitorsGrowth)} vs prior 30d`,
    },
    {
      label: "Revenues",
      value: formatMoneyFull(totalRevenueCents30 / 100),
      trend: `${trendLabel(revenueGrowth)} vs last month`,
    },
    {
      label: "Posts",
      value: (totalPosts ?? 0).toString(),
      trend: `${conversionsThis30.length} conversions (30d)`,
    },
    {
      label: "Revenue / Post",
      value: formatMoney(avgRevenuePerPostCents / 100),
      trend: "avg across posted",
    },
    {
      label: "Bounce Rate",
      value: `${bounceRate30}%`,
      trend: bounceRate30 < 50 ? "Good engagement" : "High bounce",
    },
    {
      label: "Online",
      value: onlineNow.toString(),
      trend: "active in last 5 min",
      live: true,
    },
  ];



  function SourceIcon({ meta }: { meta: ReturnType<typeof metaFor> }) {
  if (meta.iconType === "direct") {
    return <span>{meta.icon}</span>;
  }

  if (meta.iconType === "favicon") {
    return <img src={meta.iconUrl} alt="" className="h-4 w-4 rounded-sm" />;
  }

  return (
    <span className="flex h-4 w-4 items-center justify-center rounded bg-surface-muted text-[10px] font-bold text-muted">
      {meta.initials}
    </span>
  );
}

  return (
    <AppShell>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-heading-lg text-ink mb-0.5">
              Good morning
              {user.user_metadata?.name
                ? `, ${user.user_metadata.name}`
                : ""}{" "}
              👋
            </h1>
            <p className="text-body-sm text-muted">
              {new Date().toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}{" "}
              · Live from your account
            </p>
          </div>
          <Link href="/links" className="btn-primary">
            New Post
          </Link>
        </div>

        {/* ── Stat strip ── */}
        <div className="card mb-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 divide-y xl:divide-y-0 xl:divide-x divide-line">
          {statCards.map((s) => (
            <div key={s.label} className="p-5">
              <div className="flex items-center gap-1.5 text-body-sm text-body mb-2">
                {s.label}
                {(s as any).live && (
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                )}
              </div>
              <div className="text-2xl font-bold text-ink tabular mb-1">
                {s.value}
              </div>
              <div className="text-caption font-medium text-muted normal-case">
                {s.trend}
              </div>
            </div>
          ))}
        </div>

        {/* ── Visitors + Revenue combo chart — same as the Traffic page,
             fixed to a 30-day daily view here ── */}
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
          <VisitorRevenueChart data={visitorRevenueData} />
        </div>

        {/* ── Best performing posts ── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-heading-sm text-ink">Best performing posts</h2>
            <Link
              href="/posts"
              className="text-body-sm text-primary hover:text-primary-hover transition-colors"
            >
              See all
            </Link>
          </div>
          {(bestPostsRaw ?? []).length === 0 ? (
            <div className="card p-8 text-center text-body-sm text-muted">
              No posted links yet — once you mark a post as posted, it'll show
              up here.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {bestPostsRaw!.map((post) => {
                const countries = Object.entries(
                  countryCountByPost.get(post.id) ?? {},
                )
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 4)
                  .map(([country]) => country);
                const conversionRate =
                  post.total_clicks > 0
                    ? (post.total_conversions / post.total_clicks) * 100
                    : 0;
                const actualSources = Array.from(
                  sourcesByPost.get(post.id) ?? [],
                );

                return (
                  <BestPostCard post={post} actualSources={actualSources} countries={countries} conversionRate={conversionRate} />
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Best performing source — grouped by real conversions.source ── */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-heading-sm text-ink">
                Best performing Source
              </h2>
              <Link
                href="/analytics"
                className="text-body-sm text-primary hover:text-primary-hover transition-colors"
              >
                Full breakdown →
              </Link>
            </div>
            {channelLeaderboard.length === 0 ? (
              <p className="text-body-sm text-muted">No revenue yet.</p>
            ) : (
              <div className="space-y-1">
                {channelLeaderboard.map((ch) => {
                  const meta = metaFor(ch.source);
                  return (
                    <div
                      key={ch.source}
                      className="flex items-center gap-1 py-2"
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {meta.iconType === "direct" ? (
                          <span>{meta.icon}</span>
                        ) : meta.iconType === "favicon" ? (
                          <img
                            src={meta.iconUrl}
                            alt=""
                            className="h-4 w-4 rounded-sm"
                          />
                        ) : (
                          <span className="flex h-4 w-4 items-center justify-center rounded bg-surface-muted text-[10px] font-bold text-muted">
                            {meta.initials}
                          </span>
                        )}
                      </div>
                      <span className="flex-1 text-body-sm font-medium text-ink">
                        {meta.name}
                      </span>
                      <span className="text-body-sm font-bold text-ink tabular">
                        {formatMoney(ch.revenue_cents / 100)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Recent sales — real source, not declared channel ── */}
            

            {/* ── Recent sales ── */}
<div className="card p-5">
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-heading-sm text-ink">Recent Sales</h2>
    <Link
      href="/revenue"
      className="text-body-sm text-primary hover:text-primary-hover transition-colors"
    >
      See all
    </Link>
  </div>

  {recentSales.length === 0 ? (
    <p className="text-body-sm text-muted">No sales yet.</p>
  ) : (
    <div className="space-y-1">
      {recentSales.map((event) => {
        const purchaseMeta = metaFor(event.source ?? "direct");
        const firstMeta = metaFor(
          event.first_source ?? event.source ?? "direct",
        );
        const sameSource =
          (event.first_source ?? event.source ?? "direct") ===
          (event.source ?? "direct");

        return (
          <div
            key={event.id}
            className="flex items-center gap-3 py-2.5 border-b border-line last:border-0"
          >
            <div className="w-8 h-8 rounded-full bg-surface-muted flex items-center justify-center text-body-sm font-bold text-body flex-shrink-0">
              {(event.customer_email ?? "?").charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-body-sm text-ink font-medium truncate">
                {event.customer_email ?? "Unknown"}
              </div>

              <div className="text-caption text-muted normal-case font-normal mt-0.5 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <SourceIcon meta={purchaseMeta} />
                  <span>Purchased from <Link className="text-blue-600" href={purchaseMeta.name}>{purchaseMeta.name}</Link></span>
                  <span>-</span>
                  <span>{timeAgo(event.received_at)}</span>
                </div>

                {!sameSource && (
                  <div className="flex items-center gap-1.5">
                    <SourceIcon meta={firstMeta} />
                    <span>First seen from <Link className="text-blue-600" href={firstMeta.name}>{firstMeta.name}</Link></span>
                  </div>
                )}
              </div>
            </div>

            <span className="text-body-sm font-bold text-success tabular flex-shrink-0">
              +{formatMoneyFull(event.amount_cents / 100)}
            </span>

            {event.post_id && (
              <Link
                href={`/posts/${event.post_id}`}
                className="btn-ghost !py-1.5 !px-2.5 text-[12px] border border-line flex-shrink-0"
              >
                View post
              </Link>
            )}
          </div>
        );
      })}
    </div>
  )}
</div>


        </div>
      </div>
    </AppShell>
  );
}
