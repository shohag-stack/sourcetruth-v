// app/api/realtime-visitors/route.ts
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

// Same "online" threshold the Dashboard's stat strip already uses —
// a session with a pageview in the last 5 minutes counts as live.
const LIVE_WINDOW_MS = 5 * 60 * 1000;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // TODO: replace with site switcher when multi-site UI is ready — same
  // "first site" convention used on Revenue/Traffic/Dashboard.
  const { data: site } = await supabase
    .from("sites")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!site) return NextResponse.json({ visitors: [] });

  const since = new Date(Date.now() - LIVE_WINDOW_MS).toISOString();

  // NOTE: assumes `pageviews.referrer` exists and holds the raw referrer
  // URL track.js posts to /api/pageview. If that column doesn't exist
  // (or is named differently), drop it from the select below — the
  // source badge will just fall back to "Direct" for everyone without it.
  const { data: pageviews } = await supabase
    .from("pageviews")
    .select(
      "session_id, path, country, device, browser, os, referrer, visited_at, is_new_visitor",
    )
    .eq("site_id", site.id)
    .gte("visited_at", since)
    .order("visited_at", { ascending: false });

  const rows = pageviews ?? [];

  // Keep only the latest pageview per session — that's their current page.
  const bySession = new Map<string, (typeof rows)[number]>();
  rows.forEach((r) => {
    if (!bySession.has(r.session_id)) bySession.set(r.session_id, r);
  });

  const visitors = Array.from(bySession.values())
    .sort(
      (a, b) => new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime(),
    )
    .slice(0, 12)
    .map((r) => ({
      sessionId: r.session_id,
      path: r.path,
      country: r.country,
      device: r.device,
      browser: r.browser,
      os: r.os,
      referrer: r.referrer ?? null,
      visitedAt: r.visited_at,
      isNewVisitor: r.is_new_visitor,
    }));

  return NextResponse.json({ visitors });
}