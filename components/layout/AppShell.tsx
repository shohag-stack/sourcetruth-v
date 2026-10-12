// components/layout/AppShell.tsx
import { Suspense } from "react";
import { Sidebar, type SidebarData } from "./Sidebar";
import { createClient, getAuthUser } from "@/utils/supabase/server";
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
  } = await getAuthUser();
  if (!user) return null;

  const now = Date.now();
  const since30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const since60 = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // These don't depend on each other — one round trip instead of three
  const [{ data: conversions }, { data: userPlan }, { data: site }] = await Promise.all([
    supabase
      .from("conversions")
      .select("amount_cents, received_at")
      .eq("user_id", user.id)
      .eq("refunded", false)
      .gte("received_at", since60),
    supabase.from("users").select("plan, pageviews_limit").eq("id", user.id).maybeSingle(),
    // First site, same convention as the pages (maybeSingle alone errors when a user has 2+ sites)
    supabase
      .from("sites")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

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

// Sidebar numbers stream in separately so they never hold up the page content.
// The nav renders immediately (fallback has the links, just no numbers yet).
async function SidebarWithData() {
  const data = await getSidebarData();
  return <Sidebar data={data} />;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Suspense fallback={<Sidebar data={null} />}>
        <SidebarWithData />
      </Suspense>
      <main className="flex-1 ml-[220px] min-h-screen">{children}</main>
    </div>
  );
}
