// components/layout/AppShell.tsx
import { Sidebar, type SidebarData } from "./Sidebar";
import { createClient } from "@/utils/supabase/server";
import { pctChange } from "@/lib/utils";

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
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();

  console.log("showing Users from userPlan", userPlan);

  const { data: site } = await supabase
    .from("sites")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  // In your dashboard page — fetch monthly pageview count
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count: monthlyPageviews } = await supabase
    .from("pageviews")
    .select("id", { count: "exact", head: true })
    .eq("site_id", site?.id)
    .gte("visited_at", startOfMonth.toISOString());

  const LIMITS: Record<string, number> = {
    free: Number(process.env.NEXT_PUBLIC_FREE),
    starter: Number(process.env.NEXT_PUBLIC_STARTER),
    pro: Number(process.env.NEXT_PUBLIC_PRO),
  };

  const limit = LIMITS[userPlan?.plan ?? "free"];
  const usagePct = Math.min(((monthlyPageviews ?? 0) / limit) * 100, 100);

  return {
    name: user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Account",
    // NOTE: still no real subscriptions/billing source anywhere in the
    // codebase — see the same flag left in Sidebar.tsx. Swap this for a
    // real lookup once one exists.
    plan: user.user_metadata?.plan ?? "Free Plan",
    revenueCents: centsThisMonth,
    growthPct: pctChange(centsThisMonth, centsPriorMonth),
    monthlyPageviews: monthlyPageviews ?? 0,
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
