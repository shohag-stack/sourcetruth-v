// app/api/realtime-visitors/route.ts
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

// Same "online" threshold idea as the Dashboard's stat strip — a
// pageview inside this window counts as live.
const LIVE_WINDOW_MS = 1 * 60 * 1000;
const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;

// How many rows the feed shows at once. Older pageviews naturally roll
// off the bottom as new ones push in ahead of them (list is sorted
// newest-first and sliced to this length) — no separate "collapse"
// logic needed, it's just a cap on the sorted result.
const MAX_VISIBLE = 5;

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
    .select("id, domain")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!site) return NextResponse.json({ visitors: [], isLive: false });

  const since = new Date(Date.now() - LIVE_WINDOW_MS).toISOString();
  const recentSince = new Date(Date.now() - RECENT_WINDOW_MS).toISOString();

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
  const isLive = rows.length > 0;

  const finalRows = isLive
    ? rows
    : await (async () => {
        const { data: recent } = await supabase
          .from("pageviews")
          .select(
            "session_id, path, country, device, browser, os, referrer, visited_at, is_new_visitor",
          )
          .eq("site_id", site.id)
          .gte("visited_at", recentSince)
          .order("visited_at", { ascending: false })
          .limit(MAX_VISIBLE);
        return recent ?? [];
      })();

  // Same-site referrers (browsing from one page on your own site to
  // another) aren't a real acquisition source — document.referrer just
  // reflects the previous page they were on, on the SAME domain. This
  // catches historical rows recorded before track.js was fixed to stop
  // sending its own domain as a source in the first place.
  const ownDomain = site.domain?.replace(/^www\./, "") ?? null;

  function isSameSiteReferrer(referrer: string | null): boolean {
    if (!referrer || !ownDomain) return false;
    try {
      const host = new URL(referrer).hostname.replace(/^www\./, "");
      return host === ownDomain;
    } catch {
      return false;
    }
  }

  // ── One card per pageview, not one card per session ──────────────
  // The same visitor navigating to a new page shows up as its own new
  // card (same identity, different path), not merged into one row.
  //
  // "Source" is still grouped by session: every pageview from a
  // session shows that session's ORIGINAL (first) EXTERNAL referrer,
  // not whatever internal page they came from.
  const firstReferrerBySession = new Map<string, string | null>();
  const pageviewCountBySession = new Map<string, number>();
  finalRows.forEach((r) => {
    if (!firstReferrerBySession.has(r.session_id)) {
      const referrer = isSameSiteReferrer(r.referrer) ? null : r.referrer ?? null;
      firstReferrerBySession.set(r.session_id, referrer);
    }
    pageviewCountBySession.set(
      r.session_id,
      (pageviewCountBySession.get(r.session_id) ?? 0) + 1,
    );
  });

  const sortedRows = finalRows
    .slice()
    .sort(
      (a, b) => new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime(),
    )
    .slice(0, MAX_VISIBLE);

  // ── Real customer email for sessions that have converted ──────────
  // session_id on conversions is only populated for purchases made
  // AFTER track.js started sending st_session_id on checkout links —
  // older conversions won't match here, which just means they fall
  // back to the anonymized pseudonym like everyone else.
  const sessionIds = Array.from(new Set(sortedRows.map((r) => r.session_id)));
  const emailBySession = new Map<string, string>();

  if (sessionIds.length > 0) {
    const { data: matchingConversions } = await supabase
      .from("conversions")
      .select("session_id, customer_email")
      .eq("site_id", site.id)
      .in("session_id", sessionIds);

    matchingConversions?.forEach((c) => {
      if (c.session_id && c.customer_email) {
        emailBySession.set(c.session_id, c.customer_email);
      }
    });
  }

  const visitors = sortedRows.map((r) => ({
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
    // how many pages this session has hit within the current window —
    // a quick read on engagement depth ("browsing around" vs. a single
    // drive-by pageview)
    pageviewsThisSession: pageviewCountBySession.get(r.session_id) ?? 1,
    customerEmail: emailBySession.get(r.session_id) ?? null,
  }));

  return NextResponse.json({ visitors, isLive });
}