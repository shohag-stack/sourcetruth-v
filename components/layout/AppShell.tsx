// components/layout/AppShell.tsx
import { Sidebar, type SidebarData } from "./Sidebar";
import { createClient } from "@/utils/supabase/server";
import { pctChange } from "@/lib/utils";
import { pageviewsLimitFromDb } from "@/lib/pricing";

// Fetched once per page render, server-side — same 30d/prior-30d
// revenue math as the Dashboard's "Revenues" stat card and the
// Sidebar's old client-side version, just resolved before the page
// ever reaches the browser instead of after a client fetch.
async function getSidebarData(): Promise<SidebarData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const now = Date.now();
  const since30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const since60 = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString();

  const { data: conversions } = await supabase
    .from("conversions")
    .select("amount_cents, received_at")
    .eq("user_id", user.id)
    .eq("refunded", false)
    .gte("received_at", since60);

  const rows = conversions ?? [];
  const thisMonth = rows.filter((r) => r.received_at >= since30);
  const priorMonth = rows.filter((r) => r.received_at < since30);

  const centsThisMonth = thisMonth.reduce(
    (sum, r) => sum + (r.amount_cents ?? 0),
    0,
  );
  const centsPriorMonth = priorMonth.reduce(
    (sum, r) => sum + (r.amount_cents ?? 0),
    0,
  );

  const { data: userPlan } = await supabase
    .from("users")
    .select("plan, pageviews_limit")
    .eq("id", user.id)
    .maybeSingle();

  const { data: site } = await supabase
    .from("sites")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Guard against site being undefined (new user, no site yet) — passing
  // .eq("site_id", undefined) to supabase-js is not reliably "match nothing".
  let monthlyPageviews = 0;
  if (site?.id) {
    const { count } = await supabase
      .from("pageviews")
      .select("id", { count: "exact", head: true })
      .eq("site_id", site.id)
      .gte("visited_at", startOfMonth.toISOString());
    monthlyPageviews = count ?? 0;
  }

  // pageviews_limit is null in the DB for unlimited plans (Postgres can't
  // store Infinity) — translate that back to Infinity here, once, so
  // nothing downstream (usagePct math, Sidebar's formatNumber) needs its
  // own "is this null" special case. This is the actual fix: the old
  // `Number(limit)` turned null into 0, which made monthlyPageviews / 0
  // evaluate to Infinity, which Math.min(..., 100) then clamped to 100 —
  // an unlimited-plan user showing 100% usage and the red "near limit" banner.
  const limit = pageviewsLimitFromDb(userPlan?.pageviews_limit);
  const usagePct = Math.min((monthlyPageviews / limit) * 100, 100);

  return {
    name: user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Account",
    plan: userPlan?.plan?.toUpperCase() ?? "FREE",
    revenueCents: centsThisMonth,
    growthPct: pctChange(centsThisMonth, centsPriorMonth),
    monthlyPageviews,
    limit,
    usagePct,
  };
}

export async function AppShell({ children }: { children: React.ReactNode }) {
  const sidebarData = await getSidebarData();

  return (
    <div className="flex min-h-screen">
      <Sidebar data={sidebarData} />
      <main className="flex-1 ml-[220px] min-h-screen">{children}</main>
    </div>
  );
}