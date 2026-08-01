// app/api/realtime-visitors/route.ts
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

// Same "online" threshold idea as the Dashboard's stat strip — a
// pageview inside this window counts as live.
const LIVE_WINDOW_MS = 1 * 60 * 1000;

// How many rows the feed shows at once. Older pageviews naturally roll
// off the bottom as new ones push in ahead of them (list is sorted
// newest-first and sliced to this length) — no separate "collapse"
// logic needed, it's just a cap on the sorted result.
const MAX_VISIBLE = 7;

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
    .order("visited_at", { ascending: true }); // ascending so "first row per session" below is really the first

  const rows = pageviews ?? [];

  // ── One card per pageview, not one card per session ──────────────
  // Previously this collapsed every pageview for a session into a
  // single row with a "journey" trail. Per your spec: the same visitor
  // navigating to a new page should show up as its own new card (same
  // name/avatar, different path), not merged into one row. This is now
  // just a flat, most-recent-first list of individual pageviews.
  //
  // The one thing still grouped by session: which "source" a pageview
  // gets credited to. Internal navigation's document.referrer is just
  // the site's own previous page, which would otherwise show up as its
  // own domain instead of "Direct"/"Google"/etc. So every pageview from
  // a session shows that session's ORIGINAL (first) referrer, not
  // whatever internal page they came from.
  const firstReferrerBySession = new Map<string, string | null>();
  const pageviewCountBySession = new Map<string, number>();
  rows.forEach((r) => {
    if (!firstReferrerBySession.has(r.session_id)) {
      firstReferrerBySession.set(r.session_id, r.referrer ?? null);
    }
    pageviewCountBySession.set(
      r.session_id,
      (pageviewCountBySession.get(r.session_id) ?? 0) + 1,
    );
  });

  const visitors = rows
    .slice()
    .sort(
      (a, b) => new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime(),
    )
    .slice(0, MAX_VISIBLE)
    .map((r) => ({
      // unique per pageview now (not per session), since the same
      // session can legitimately appear more than once in the list
      id: `${r.session_id}-${r.visited_at}`,
      sessionId: r.session_id,
      path: r.path,
      country: r.country,
      device: r.device,
      browser: r.browser,
      os: r.os,
      referrer: firstReferrerBySession.get(r.session_id) ?? null,
      visitedAt: r.visited_at,
      isNewVisitor: r.is_new_visitor,
      // how many pages this session has hit within the current live
      // window — a quick read on engagement depth ("browsing around"
      // vs. a single drive-by pageview)
      pageviewsThisSession: pageviewCountBySession.get(r.session_id) ?? 1,
    }));

  return NextResponse.json({ visitors });
}