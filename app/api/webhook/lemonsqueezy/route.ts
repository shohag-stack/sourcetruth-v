// app/api/webhook/lemonsqueezy/route.ts
import { createServiceClient } from "@/utils/supabase/service";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature") ?? "";

  // ── Parse FIRST — we need attrs.store_id to know WHICH connection's
  // webhook_secret to verify against. Every user's own Lemon Squeezy
  // store has its own secret, so the signature can't be checked until
  // we know which store this request claims to be from. ──
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const attrs = payload?.data?.attributes;
  const storeId = attrs?.store_id != null ? String(attrs.store_id) : null;

  if (!storeId) {
    return NextResponse.json({ error: "missing store_id" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Single query for the connection this webhook actually belongs to —
  // previously this was two separate queries, and the FIRST one (for
  // webhook_secret) didn't filter by store_id at all, so it verified
  // every incoming webhook against an arbitrary connection's secret
  // instead of the correct one. With more than one Lemon Squeezy
  // connection in the table, that first query would also outright
  // error, since .maybeSingle() requires 0 or exactly 1 match.
  const { data: conn } = await supabase
    .from("payment_connections")
    .select("webhook_secret, user_id, site_id")
    .eq("provider", "lemon_squeezy")
    .eq("store_id", storeId)
    .maybeSingle();

  if (!conn) {
    console.error("No payment_connections match for store_id:", storeId);
    return NextResponse.json({ ok: true }); // acknowledge receipt so LS doesn't retry forever
  }

  const digest = crypto
    .createHmac("sha256", conn.webhook_secret!)
    .update(rawBody)
    .digest("hex");

  if (signature !== digest) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  if (payload.meta?.event_name !== "order_created") {
    return NextResponse.json({ ok: true });
  }

  const email = attrs.user_email?.toLowerCase().trim();
  const orderId = String(payload.data.id);
  const amountCents = attrs.total; // LS sends total already in cents

  // ── Attribution: custom_data.st_ref is the primary signal now ──
  // This is what track.js writes onto the Lemon.js checkout link before
  // the click happens. It's a direct slug -> post lookup, no dependency
  // on the visitors table or the email ever being identify()'d.
  const customData = payload.meta?.custom_data ?? {};
  const stRef: string | undefined = customData.st_ref;
  // Your track.js now sends two separate sources instead of one:
  //   st_click_source  — source of THIS specific tracked-link click
  //   st_first_source  — the visitor's overall first-touch source
  // clickSource wins when present (matches "credit the post that drove
  // THIS sale"); firstSource is the fallback for the general-attribution
  // (non-post) case.
  const stClickSource: string | undefined = customData.st_click_source;
  const stFirstSource: string | undefined = customData.st_first_source;
  const stCurrentSource: string | undefined = customData.st_current_source;

  // DataFast-style fields, present for every sale now (not just ones
  // with a tracked-link ref).
  const stDevice: string | undefined = customData.st_device;
  const stOs: string | undefined = customData.st_os;
  const stBrowser: string | undefined = customData.st_browser;
  const stFirstSeenMs: string | undefined = customData.st_first_seen;
  const firstSeenAt = stFirstSeenMs
    ? new Date(Number(stFirstSeenMs)).toISOString()
    : null;
  // NEW — real visited-country/city from your own geo lookup (via
  // /api/pageview), more reliable than whatever LS's own payload has
  // (that's typically billing address, not where they actually browsed
  // from). Falls back to LS's attrs.user_country below if absent.
  const stCountry: string | undefined = customData.st_country;
  const stCity: string | undefined = customData.st_city;

  // General visit/session count leading up to this conversion — sent
  // by track.js as of the update that also fixed the missing city field.
  // Defaults to 1 (this visit) if somehow absent, since every conversion
  // implies at least one touchpoint.
  const stTouchpoints: string | undefined = customData.st_touchpoints;

  let post: { id: string; channel: string | null; slug: string } | null = null;

  if (stRef) {
    const { data } = await supabase
      .from("posts")
      .select("id, channel, slug")
      .eq("slug", stRef)
      .maybeSingle();
    post = data ?? null;
  }

  // Fallback: old visitors-based last-touch lookup, for sales that
  // somehow didn't carry custom_data (e.g. a checkout link created
  // before this track.js patch went out, or a manually-shared checkout
  // URL with no ref at all).
  let visitor: {
    first_source: string | null;
    first_post_id: string | null;
    last_source: string | null;
    last_post_id: string | null;
  } | null = null;

  if (!post && email) {
    const { data } = await supabase
      .from("visitors")
      .select("first_source, first_post_id, last_source, last_post_id")
      .eq("email", email)
      .maybeSingle();
    visitor = data ?? null;

    if (visitor?.last_post_id) {
      const { data: fallbackPost } = await supabase
        .from("posts")
        .select("id, channel, slug")
        .eq("id", visitor.last_post_id)
        .maybeSingle();
      post = fallbackPost ?? null;
    }
  }

  const postId = post?.id ?? null;
  const conversionSource = stCurrentSource ?? stClickSource ?? post?.channel ?? visitor?.last_source ?? null;
  const firstSource = stFirstSource ?? visitor?.first_source ?? (post ? post.channel : null);

  // ── days_to_convert — computed here at insert time so it's stored,
  // not derived on every page render. Pinned to the same "now" we use
  // for received_at below so the two stay consistent with each other. ──
  const receivedAt = new Date();
  const daysToConvert = firstSeenAt
    ? Math.round(
        Math.max(
          0,
          (receivedAt.getTime() - new Date(firstSeenAt).getTime()) / 86_400_000,
        ),
      )
    : null;

  const { error } = await supabase.from("conversions").insert({
    user_id: conn.user_id,
    site_id: conn.site_id,
    post_id: postId,
    provider: "lemon_squeezy",
    order_id: orderId,
    customer_email: email,
    amount_cents: amountCents,
    currency: attrs.currency ?? "USD",
    product_name: attrs.first_order_item?.product_name ?? null,
    source: conversionSource,
    first_source: firstSource,
    first_post_id: visitor?.first_post_id ?? postId,
    attribution_model: stRef ? "click_ref" : "last_touch",
    device: stDevice ?? null,
    os: stOs ?? null,
    browser: stBrowser ?? null,
    first_seen_at: firstSeenAt,
    received_at: receivedAt.toISOString(),
    days_to_convert: daysToConvert,
    country: stCountry ?? attrs.user_country ?? null,
    city: stCity ?? null,
    touchpoints: stTouchpoints ? Number(stTouchpoints) : 1,
    raw_payload: payload,
  });

  // unique(provider, order_id) means a duplicate delivery throws here — that's expected, not a bug
  if (error && !error.message.includes("duplicate")) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (postId && !error) {
    await supabase.rpc("increment_post_revenue", {
      p_post_id: postId,
      p_amount_cents: amountCents,
    });
  }

  return NextResponse.json({ ok: true });
}