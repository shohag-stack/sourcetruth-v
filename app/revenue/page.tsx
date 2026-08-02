// app/revenue/page.tsx
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { countryDisplay, countryFlag } from "@/lib/countryFlag";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import {
  formatMoney,
  formatMoneyFull,
  formatNumber,
  maskEmail,
  pctChange,
  timeAgo,
  timeToConvert,
  trendLabel,
} from "@/lib/utils";
import { metaFor } from "@/lib/metaFor";
import {
  BROWSER_ICON,
  BROWSER_LABEL,
  DEVICE_ICON,
  OS_ICON,
  OS_LABEL,
} from "@/lib/analytics";
import { Monitor } from "lucide-react";
import { PROVIDER_META } from "@/lib/provider";

// Shared column template — used by both the header row and every data
// row so widths can never drift between them. Do not set per-cell
// min-w / flex-1 / ml-auto on individual cells below; the grid template
// is the single source of truth for column sizing.
const GRID_COLS =
  "md:grid md:grid-cols-[minmax(220px,1.5fr)_minmax(190px,1fr)_minmax(140px,0.9fr)_minmax(70px,0.5fr)_minmax(80px,0.5fr)_minmax(80px,0.5fr)] md:gap-4";

// days_to_convert is now a rounded integer stored at insert time (see
// the webhook), so we lost the "Same visit" / "6h" granularity the old
// client-side timeToConvert() had for same-day conversions. This just
// re-adds a readable label on top of the integer we do have — "0" reads
// as "Same day" rather than a bare, slightly confusing "0".

// Renders whatever metaFor() gave us — direct arrow, favicon image, or
// initials fallback for sources with no resolvable hostname. Same logic
// as the Dashboard's Recent Sales card, kept in sync with it.
function SourceIcon({ meta }: { meta: ReturnType<typeof metaFor> }) {
  if (meta.iconType === "direct") {
    return <span className="w-4 h-4">{meta.icon}</span>;
  }
  if (meta.iconType === "favicon") {
    return <img src={meta.iconUrl} alt="" className="h-4 w-4" />;
  }
  return (
    <span className="flex h-4 w-4 items-center justify-center text-[14px] font-bold text-muted">
      {meta.initials}
    </span>
  );
}

function SourceBadge({ meta }: { meta: ReturnType<typeof metaFor> }) {
  return (
    <span className="inline-flex text-muted items-center gap-1 py-1 text-[13px] font-normal">
      <SourceIcon meta={meta} /> {meta.name}
    </span>
  );
}

export default async function RevenuePage() {
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

  interface SourceStat {
    source: string;
    clicks: number;
    conversions: number;
    revenueCents: number;
    revenueCents30: number;
    revenueCentsPrior30: number;
  }

  const sourceStats = new Map<string, SourceStat>();

  // ── Get active site ────────────────────────────────────────
  // TODO: replace with site switcher when multi-site UI is ready
  const { data: site } = await supabase
    .from("sites")
    .select("id, name, domain")
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
            <p className="text-body-sm text-muted mb-4">
              Add a site in Settings to start seeing analytics.
            </p>
            <a href="/settings" className="btn-primary">
              Go to Settings →
            </a>
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Conversions joined with posts — post attribution stays,
  // it's SourceTruth's own differentiator on top of the DataFast-style
  // fields (device/os/browser/first_seen/source) ──
  const { data: conversions } = site
    ? await supabase
        .from("conversions")
        .select(
          `
          id,
          provider,
          order_id,
          customer_email,
          amount_cents,
          currency,
          product_name,
          source,
          country,
          device,
          first_source,
          days_to_convert,
          os,
          browser,
          first_seen_at,
          received_at,
          post_id,
          posts (
            id,
            content,
            channel,
            slug
          )
        `,
        )
        .eq("site_id", site.id)
        .eq("refunded", false)
        .order("received_at", { ascending: false })
        .limit(100)
    : { data: [] };

  const [{ data: clicks }, { data: connections }] = await Promise.all([
    supabase.from("clicks").select("source, post_id").eq("site_id", site.id),
    supabase
      .from("payment_connections")
      .select("provider, account_name, connected")
      .eq("user_id", user.id)
      .eq("connected", true),
    // fetch since60 once, slice this-30/prior-30 in JS rather than two queries
  ]);

  const rows = conversions ?? [];
  const clicksList = clicks ?? [];

  function getStat(source: string): SourceStat {
    let s = sourceStats.get(source);
    if (!s) {
      s = {
        source,
        clicks: 0,
        conversions: 0,
        revenueCents: 0,
        revenueCents30: 0,
        revenueCentsPrior30: 0,
      };
      sourceStats.set(source, s);
    }
    return s;
  }

  clicksList.forEach((c) => {
    getStat(c.source ?? "direct").clicks += 1;
  });

  rows.forEach((c) => {
    const stat = getStat(c.source ?? "direct");
    stat.conversions += 1;
    stat.revenueCents += c.amount_cents;
    if (c.received_at >= since30) {
      stat.revenueCents30 += c.amount_cents;
    } else {
      stat.revenueCentsPrior30 += c.amount_cents;
    }
  });

  // ── New vs. returning — first occurrence (ascending) of an email in
  // this fetched set counts as "new". Approximate beyond the 100-row
  // window, but correct for anything visible on this page. ──
  const firstSeenEmail = new Set<string>();
  const isReturning = new Map<string, boolean>();
  [...rows].reverse().forEach((c) => {
    if (!c.customer_email) return;
    isReturning.set(c.id, firstSeenEmail.has(c.customer_email));
    firstSeenEmail.add(c.customer_email);
  });

  const totalCents = rows.reduce((sum, c) => sum + (c.amount_cents ?? 0), 0);

  const byProvider = rows.reduce<Record<string, number>>((acc, c) => {
    acc[c.provider] = (acc[c.provider] ?? 0) + (c.amount_cents ?? 0);
    return acc;
  }, {});

  const csvRows = [
    [
      "Customer",
      "Provider",
      "Product",
      "Amount",
      "Source",
      "Country",
      "Device",
      "OS",
      "Browser",
      "Date",
    ],
    ...rows.map((c) => [
      c.customer_email ?? "",
      c.provider,
      c.product_name ?? "",
      formatMoney(c.amount_cents),
      c.source ?? "",
      c.country ?? "",
      c.device ?? "",
      c.os ?? "",
      c.browser ?? "",
      new Date(c.received_at).toLocaleDateString(),
    ]),
  ];
  const csvData = csvRows.map((r) => r.join(",")).join("\n");
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csvData)}`;

  const channelStats = Array.from(sourceStats.values())
    .filter((s) => s.clicks > 0 || s.conversions > 0)
    .sort((a, b) => b.revenueCents - a.revenueCents);

  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-heading-lg text-ink mb-0.5">Revenue</h1>
          <p className="text-body-sm text-muted">
            Every payment, where they actually came from, and which post drove
            it.
          </p>
        </div>

        {!site && (
          <div className="card p-10 text-center">
            <div className="text-4xl mb-3">💰</div>
            <h2 className="text-heading-sm text-ink mb-2">No site connected</h2>
            <p className="text-body-sm text-muted mb-4">
              Add a site in Settings to start tracking revenue.
            </p>
            <a href="/settings" className="btn-primary">
              Go to Settings →
            </a>
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

              {(connections ?? []).slice(0, 3).map((conn) => {
                const meta = PROVIDER_META[conn.provider] ?? {
                  name: conn.provider,
                  icon: "◈",
                };
                const providerTotal = byProvider[conn.provider] ?? 0;
                return (
                  <div
                    key={conn.provider}
                    className="flex flex-col items-left justify-center p-5"
                  >
                    <div className="text-2xl font-bold text-ink tabular mb-1">
                      {formatMoney(providerTotal)}
                    </div>

                    {/* <div className="text-caption text-muted normal-case font-normal">
                      {rows.filter(r => r.provider === conn.provider).length} sales
                    </div> */}
                    <div className="flex items-center gap-1.5 text-body-sm text-body">
                      <span>
                        <span className="flex w-6 h-6 gap-0">{meta.icon}</span>
                      </span>{" "}
                      {meta.name}
                    </div>
                  </div>
                );
              })}

              {Array.from({
                length: Math.max(0, 3 - (connections?.length ?? 0)),
              }).map((_, i) => (
                <div key={i} className="p-5 flex items-center justify-center">
                  <a
                    href="/connect"
                    className="text-body-sm text-muted hover:text-primary transition-colors"
                  >
                    + Connect provider
                  </a>
                </div>
              ))}
            </div>

            {(connections ?? []).length === 0 && (
              <div className="bg-primary-tint border border-primary/20 rounded-2xl p-4 mb-6 flex items-start gap-3">
                <span className="text-primary text-lg">⚠️</span>
                <div className="text-body-sm text-primary leading-relaxed">
                  No payment providers connected yet.{" "}
                  <a href="/connect" className="font-semibold underline">
                    Connect Lemon Squeezy
                  </a>{" "}
                  to start seeing revenue data.
                </div>
              </div>
            )}

            {/* Channel cards — real source, not declared channel */}
            {channelStats.length === 0 ? (
              <div className="card p-8 text-center text-body-sm text-muted mb-8">
                No clicks or sales yet — this fills in once your tracked links
                start getting traffic.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
                {channelStats.map((ch) => {
                  const meta = metaFor(ch.source);
                  const trend = pctChange(
                    ch.revenueCents30,
                    ch.revenueCentsPrior30,
                  );
                  const positive = trend >= 0;
                  const avgPerSale =
                    ch.conversions > 0
                      ? ch.revenueCents / ch.conversions / 100
                      : 0;

                  return (
                    <div key={ch.source} className="card p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {/* {meta.} */}
                        </div>
                        <span className="font-medium text-ink">
                          {meta.name}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-heading-lg text-ink tabular">
                          {formatMoneyFull(ch.revenueCents / 100)}
                        </span>
                        <span className="text-caption text-muted normal-case font-normal">
                          / Revenue
                        </span>
                      </div>
                      <div
                        className={`text-caption font-medium normal-case mb-4 ${
                          positive ? "text-success" : "text-primary"
                        }`}
                      >
                        {trendLabel(trend)}{" "}
                        <span className="text-muted">vs prior 30d</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-line">
                        {[
                          { label: "clicks", value: formatNumber(ch.clicks) },
                          { label: "Sales", value: ch.conversions.toString() },
                          {
                            label: "Per sale",
                            value:
                              ch.conversions > 0
                                ? formatMoneyFull(avgPerSale)
                                : "—",
                          },
                        ].map((s) => (
                          <div key={s.label}>
                            <div className="text-body-sm font-bold text-ink tabular">
                              {s.value}
                            </div>
                            <div className="text-[10px] text-muted mt-0.5">
                              {s.label}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between mb-3">
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
              <div className="card bg-white p-12 text-center">
                <div className="text-4xl mb-3">🎯</div>
                <h3 className="text-heading-sm text-ink mb-2">No sales yet</h3>
                <p className="text-body-sm text-muted max-w-sm mx-auto">
                  Sales will appear here once your payment provider fires a
                  webhook. Make sure your webhook URL is set to{" "}
                  <code className="bg-surface-muted px-1 rounded font-mono text-xs">
                    /api/webhook
                  </code>
                  .
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl pt-4 border border-separate">
                <div
                  className={`hidden ${GRID_COLS} px-4 text-sm font-medium text-muted normal-case tracking-wide border-b pb-4`}
                >
                  <div>Customer</div>
                  <div>Journey</div>
                  <div>Provider</div>
                  <div>Amount</div>
                  <div>Converted</div>
                  <div className="text-right">When</div>
                </div>
                {rows.map((conv) => {
                  const providerMeta = PROVIDER_META[conv.provider] ?? {
                    name: conv.provider,
                    icon: "◈",
                  };
                  const post = Array.isArray(conv.posts)
                    ? conv.posts[0]
                    : conv.posts;
                  const firstSrc = metaFor(conv.first_source ?? conv.source);
                  const finalSrc = metaFor(conv.source);
                  const sameSource =
                    (conv.first_source ?? conv.source) ===
                    (conv.source ?? null);
                  const returning = isReturning.get(conv.id) ?? false;
                  const convertLabel = timeToConvert(
                    conv.first_seen_at,
                    conv.received_at,
                  );

                  return (
                    <div
                      key={conv.id}
                      className={`p-4 border-b flex flex-wrap items-center gap-4 hover:bg-surface-muted ${GRID_COLS}`}
                    >
                      {/* Customer + device row — links to the full journey page */}
                      <Link
                        href={`/revenue/customers/${encodeURIComponent(
                          conv.customer_email ?? "",
                        )}`}
                        className="flex items-center gap-3 group"
                      >
                        <div className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center text-sm font-bold text-body flex-shrink-0">
                          {(conv.customer_email ?? "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-body-sm font-semibold text-ink truncate group-hover:text-primary group-hover:underline transition-colors">
                              {maskEmail(conv.customer_email)}
                            </span>
                            <span
                              className={
                                returning
                                  ? "badge-success"
                                  : "badge-primary-tint"
                              }
                            >
                              {returning ? "Returning" : "New"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[13px] text-muted normal-case font-normal mt-0.5 flex-wrap">
                            {conv.country && (
                              <span>{countryDisplay(conv.country)}</span>
                            )}
                            {conv.device && (
                              <span className="inline-flex items-center gap-1">
                                {DEVICE_ICON[conv.device] ?? (
                                  <Monitor className="h-3.5 w-3.5" />
                                )}{" "}
                                {conv.device}
                              </span>
                            )}
                            {conv.os && (
                              <span
                                className="inline-flex items-center gap-1"
                                title={OS_LABEL[conv.os] ?? conv.os}
                              >
                                {OS_ICON[conv.os] ?? null}{" "}
                                {OS_LABEL[conv.os] ?? conv.os}
                              </span>
                            )}
                            {conv.browser && (
                              <span className="inline-flex items-center gap-1">
                                {BROWSER_ICON[conv.browser] ?? null}{" "}
                                {BROWSER_LABEL[conv.browser] ?? conv.browser}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>

                      {/* Journey: where they first landed → where they actually
                          bought — this pair is SourceTruth's own differentiator
                          on top of the DataFast-style fields. Collapses to a
                          single badge when the two sources are the same. */}
                      <div>
                        <div className="flex text-muted items-center gap-1 flex-wrap">
                          <SourceBadge meta={firstSrc} />
                          {!sameSource && (
                            <>
                              <span className="text-muted text-[12px]">→</span>
                              <SourceBadge meta={finalSrc} />
                            </>
                          )}
                        </div>
                        {/* <div className="text-[12px] text-muted normal-case font-normal mt-1">
                          {sameSource ? 'Landed & purchased here' : 'Landed → purchased'}
                        </div> */}
                        {post?.content && (
                          <p
                            className="text-[11px] text-success font-medium truncate max-w-[180px] mt-1"
                            title={post.content}
                          >
                            {post.content.slice(0, 40)}
                            {post.content.length > 40 ? "…" : ""}
                          </p>
                        )}
                      </div>

                      {/* Provider + product */}
                      <div className="text-body-sm text-body">
                        <div className="flex items-center gap-1.5 mb-3">
                          <span className="w-3.5 h-3.5">
                            {" "}
                            {providerMeta.icon}{" "}
                          </span>{" "}
                          {providerMeta.name}
                        </div>
                        <div className="text-caption text-blue-400 normal-case font-normal mt-0.5">
                          {conv.product_name ?? "—"}
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-body-sm font-bold text-success tabular">
                        +{formatMoney(conv.amount_cents)}
                      </div>

                      {/* Time to convert */}
                      <div className="text-body-sm text-body">
                        {convertLabel ?? <span className="text-muted">—</span>}
                      </div>

                      {/* When */}
                      <div className="text-[13px] text-muted normal-case font-normal text-right">
                        {timeAgo(conv.received_at)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
