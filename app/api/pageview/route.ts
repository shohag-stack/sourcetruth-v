// app/api/pageview/route.ts
// Called by track.js on every page load.
// Records a pageview and detects unique visitors by ip_hash.

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import crypto from "crypto";

function hashIp(ip: string): string {
  return crypto
    .createHash("sha256")
    .update(ip + (process.env.IP_HASH_SALT ?? ""))
    .digest("hex");
}

function parseUA(ua: string) {
  const device = /Mobile|Android|iPhone/i.test(ua)
    ? "mobile"
    : /iPad|Tablet/i.test(ua)
    ? "tablet"
    : "desktop";
  const browser = /Edg/i.test(ua)
    ? "edge"
    : /Chrome/i.test(ua)
    ? "chrome"
    : /Firefox/i.test(ua)
    ? "firefox"
    : /Safari/i.test(ua)
    ? "safari"
    : "other";
  const os = /iPhone|iPad/i.test(ua)
    ? "ios"
    : /Android/i.test(ua)
    ? "android"
    : /Windows/i.test(ua)
    ? "windows"
    : /Mac/i.test(ua)
    ? "mac"
    : /Linux/i.test(ua)
    ? "linux"
    : "other";
  return { device, browser, os };
}

function withCors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function POST(req: NextRequest) {
  try {
    const { site_key, session_id, path, referrer, source, screen_width } =
      await req.json();

    const supabase = await createServiceClient();

    if (!site_key || !session_id) {
      return withCors(
        NextResponse.json(
          { error: "site_key and session_id required" },
          { status: 400 },
        ),
      );
    }

    // ── 1. Look up site ───────────────────────────────────────
    const { data: site } = await supabase
      .from("sites")
      .select("id, user_id")
      .eq("site_key", site_key)
      .maybeSingle();

    if (!site) {
      return withCors(NextResponse.json({ ok: false }, { status: 404 }));
    }



    {/*  checking subscriptions  */}


    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Plan and this month's usage are independent — fetch together
    const [{ data: userRow }, { count: monthlyCount }] = await Promise.all([
      supabase.from("users").select("plan").eq("id", site.user_id).maybeSingle(),
      supabase
        .from("pageviews")
        .select("id", { count: "exact", head: true })
        .eq("site_id", site.id)
        .gte("visited_at", startOfMonth.toISOString()),
    ]);

    const plan = userRow?.plan ?? "free";

    const LIMITS: Record<string, number> = {
      free: Number(process.env.NEXT_PUBLIC_FREE),
      starter: Number(process.env.NEXT_PUBLIC_STARTER),
      pro: Number(process.env.NEXT_PUBLIC_PRO),
    };

    const limit = LIMITS[plan ?? 'free']

        if ((monthlyCount ?? 0) >= limit) {
          // Still return 200 so track.js doesn't error
          // Just don't insert the pageview
          return withCors(NextResponse.json({ ok: true, limited: true }))
        }

    // ── 2. Parse request metadata ─────────────────────────────
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "0.0.0.0";
    const ua = req.headers.get("user-agent") ?? "";
    const ipHash = hashIp(ip);

    // Vercel provides country for free — no external API needed
    const country = req.headers.get("x-vercel-ip-country") ?? "unknown";
    const city = req.headers.get("x-vercel-ip-city") ?? null;

    const { device, browser, os } = parseUA(ua);

    // ── 3 + 4. Session so far, and new vs returning visitor (by ip_hash) ──
    const [{ count: sessionCount }, { count: prevVisits }] = await Promise.all([
      supabase
        .from("pageviews")
        .select("id", { count: "exact", head: true })
        .eq("site_id", site.id)
        .eq("session_id", session_id),
      supabase
        .from("pageviews")
        .select("id", { count: "exact", head: true })
        .eq("site_id", site.id)
        .eq("ip_hash", ipHash),
    ]);

    const isFirstInSession = (sessionCount ?? 0) === 0;
    const isNewVisitor = (prevVisits ?? 0) === 0;

    // If this is NOT the first pageview, the earlier ones weren't bounces.
    // Only rows before `visitedAt`, so running this alongside the insert
    // below can never touch the new row.
    const visitedAt = new Date().toISOString();
    const markNotBounced = isFirstInSession
      ? Promise.resolve()
      : supabase
          .from("pageviews")
          .update({ is_bounce: false })
          .eq("site_id", site.id)
          .eq("session_id", session_id)
          .lt("visited_at", visitedAt);

    // ── 5. Insert pageview (alongside the bounce update) ──────
    const insertPageview = supabase.from("pageviews").insert({
      site_id: site.id,
      user_id: site.user_id,
      session_id,
      path: path ?? "/",
      referrer: referrer ?? null,
      // What track.js resolved (tag > referrer host > "direct"). Capped
      // since it can come straight from a ?ref= the visitor controls.
      source:
        typeof source === "string" && source.trim()
          ? source.trim().toLowerCase().slice(0, 100)
          : null,
      ip_hash: ipHash,
      country,
      city,
      device,
      browser,
      os,
      screen_width: screen_width ?? null,
      is_bounce: true, // default true — updated if they visit another page
      is_new_visitor: isNewVisitor,
      visited_at: visitedAt,
    });
    await Promise.all([markNotBounced, insertPageview]);

    return withCors(
      NextResponse.json({ ok: true, new_visitor: isNewVisitor, country, city }),
    );
  } catch (err) {
    console.error("[pageview] error:", err);
    return withCors(NextResponse.json({ ok: true })); // always 200 to browser
  }
}
