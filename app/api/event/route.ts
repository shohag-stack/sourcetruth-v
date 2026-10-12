// app/api/event/route.ts
// Called by track.js → SourceTruth.track(name, props).
// Usually sent with navigator.sendBeacon (text/plain), so the body is parsed manually.

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";

function withCors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

// Keep event names readable on the dashboard and props small
const NAME_RE = /^[a-zA-Z0-9_\-.: ]{1,64}$/;
const MAX_PROPS = 10;
const MAX_VALUE_LEN = 200;

function cleanProps(input: unknown): Record<string, string | number | boolean> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(input).slice(0, MAX_PROPS)) {
    if (typeof value === "string") out[key.slice(0, 40)] = value.slice(0, MAX_VALUE_LEN);
    else if (typeof value === "number" || typeof value === "boolean") out[key.slice(0, 40)] = value;
  }
  return Object.keys(out).length ? out : null;
}

export async function POST(req: NextRequest) {
  try {
    const { site_key, session_id, name, path, props } = JSON.parse(await req.text());

    if (!site_key || typeof name !== "string" || !NAME_RE.test(name)) {
      return withCors(NextResponse.json({ ok: false }, { status: 400 }));
    }

    const supabase = createServiceClient();
    const { data: site } = await supabase
      .from("sites")
      .select("id, user_id")
      .eq("site_key", site_key)
      .maybeSingle();

    if (!site) return withCors(NextResponse.json({ ok: false }, { status: 404 }));

    await supabase.from("events").insert({
      site_id: site.id,
      user_id: site.user_id,
      session_id: typeof session_id === "string" ? session_id.slice(0, 64) : null,
      name,
      path: typeof path === "string" ? path.slice(0, 300) : null,
      props: cleanProps(props),
    });

    return withCors(NextResponse.json({ ok: true }));
  } catch (err) {
    console.error("[event] error:", err);
    return withCors(NextResponse.json({ ok: true })); // never break the host site
  }
}
