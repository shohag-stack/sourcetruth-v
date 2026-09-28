// app/api/webhook/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// SOURCETRUTH'S OWN BILLING WEBHOOK
//
// Handles events for SourceTruth's own subscription (Starter/Growth plans),
// verified against the single LEMON_SQUEEZY_WEBHOOK_SECRET / STRIPE_WEBHOOK_SECRET
// env vars for YOUR store — not the per-customer stores in `payment_connections`
// (those are handled separately in app/api/webhook/lemonsqueezy/route.ts for
// revenue attribution).
//
// order_created         → currently a no-op for this webhook (see note below)
// subscription_*        → upserts `subscriptions` AND syncs `users.plan` /
//                          `plan_status` / limits, since that's what AppShell
//                          and access-control actually read from.
//
// IMPORTANT: this env var name must match EXACTLY what's in .env.local.
// Earlier this was accidentally typo'd as LEMONSQUEEZY_WEBHOOK_SECRET (no
// underscore between LEMON and SQUEEZY), which silently broke signature
// verification — process.env.LEMON_SQUEEZY_WEBHOOK_SECRET was always
// undefined, so verifyLemonSqueezy() failed before it even ran the HMAC.
//
// Setup:
// Lemon Squeezy: Settings → Webhooks → add https://sourcetruth.io/api/webhook
//   Events to send: subscription_created, subscription_updated,
//   subscription_cancelled, subscription_resumed, subscription_expired,
//   subscription_paused, subscription_unpaused
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/utils/supabase/service";
import { PLANS } from "@/lib/pricing";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AttributionData {
  source: string;
  postId: string;
  campaign: string;
  firstSource: string;
  firstPostId: string;
  siteId: string;
}

// DB check constraints: keep these in sync with the `subscriptions` table.
type DbSubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "trialing"
  | "paused";

// users.plan_status has no 'paused' state.
type DbUserPlanStatus = "active" | "canceled" | "past_due" | "trialing";

// ─── Signature verification ───────────────────────────────────────────────────
function verifyLemonSqueezy(payload: string, signature: string): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] LEMON_SQUEEZY_WEBHOOK_SECRET is not set");
    return false;
  }
  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(payload).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    // Buffers of different length throw instead of returning false
    return false;
  }
}

function verifyStripe(payload: string, signature: string): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return false;
  try {
    const parts = signature.split(",");
    const timestamp = parts.find((p) => p.startsWith("t="))?.split("=")[1];
    const sig = parts.find((p) => p.startsWith("v1="))?.split("=")[1];
    if (!timestamp || !sig) return false;
    const signedPayload = `${timestamp}.${payload}`;
    const hmac = crypto.createHmac("sha256", secret);
    const digest = hmac.update(signedPayload).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(sig));
  } catch {
    return false;
  }
}

// function verifyGumroad(payload: string, signature: string): boolean {
//   const secret = process.env.GUMROAD_WEBHOOK_SECRET
//   if (!secret) return true
//   const hmac = crypto.createHmac('sha256', secret)
//   const digest = hmac.update(payload).digest('hex')
//   try {
//     return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
//   } catch {
//     return false
//   }
// }

// ─── Attribution resolver (unchanged) ─────────────────────────────────────────
async function resolveAttribution(
  customData: Partial<AttributionData>,
  _customerEmail: string,
): Promise<AttributionData> {
  if (customData.siteId && customData.source) {
    return {
      source: customData.source || "direct",
      postId: customData.postId || "",
      campaign: customData.campaign || "",
      firstSource: customData.firstSource || customData.source || "direct",
      firstPostId: customData.firstPostId || customData.postId || "",
      siteId: customData.siteId,
    };
  }
  return {
    source: "unknown",
    postId: "",
    campaign: "",
    firstSource: "unknown",
    firstPostId: "",
    siteId: customData.siteId || "",
  };
}

// ─── Subscription status mapping ───────────────────────────────────────────────
// Lemon Squeezy statuses: on_trial | active | paused | past_due | unpaid | cancelled | expired
// subscriptions.status only allows: active | canceled | past_due | trialing | paused
function mapLemonSqueezyStatus(lsStatus: string): DbSubscriptionStatus {
  switch (lsStatus) {
    case "on_trial":
      return "trialing";
    case "active":
      return "active";
    case "paused":
      return "paused";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "cancelled":
    case "expired":
      return "canceled";
    default:
      console.warn(
        "[webhook] Unrecognized Lemon Squeezy subscription status:",
        lsStatus,
      );
      return "past_due";
  }
}

// users.plan_status has no 'paused' value — a paused subscription is
// treated as no active access until you decide otherwise.
function mapUserPlanStatus(subStatus: DbSubscriptionStatus): DbUserPlanStatus {
  return subStatus === "paused" ? "canceled" : subStatus;
}

// Derive a plan slug from the purchased variant/product name. Matches
// against your actual PLANS config (lib/pricing.ts) rather than a
// hardcoded list, so this never drifts from what you actually sell.
function derivePlan(variantName: string | null, productName: string | null): string {
  const name = (variantName || productName || "").toLowerCase();
  const match = PLANS.find((p) => p.id !== "free" && name.includes(p.id));
  return match?.id ?? "unknown";
}

// sites_limit / links_limit / pageviews_limit come straight from PLANS
// (lib/pricing.ts) — `links_limit` in the DB maps to `posts` in PLANS
// (same concept: tracked links per post). Flag me if these are actually
// different things.
//
// pageviews_limit is nullable in Postgres — NULL means unlimited, since
// Postgres `integer` can't store PLANS' `events: Infinity` (a JS-only
// concept). Infinity is translated to null right here, at the DB boundary,
// so nothing downstream needs its own "is this Infinity" special case.
function planLimits(
  planId: string,
): { sitesLimit: number; linksLimit: number; pageviewsLimit: number | null } {
  const plan = PLANS.find((p) => p.id === planId);
  const free = PLANS.find((p) => p.id === "free");
  const events = plan?.events ?? free?.events ?? 500;
  return {
    sitesLimit: plan?.sites ?? free?.sites ?? 1,
    linksLimit: plan?.posts ?? free?.posts ?? 10,
    pageviewsLimit: events === Infinity ? null : events,
  };
}

// Resolve the internal user_id a subscription event belongs to.
// Primary: custom_data.user_id, set by buildCheckoutUrl() when the checkout
// link is built in app/auth/callback/route.ts. Fallback: look up by email
// against your own `users` table, in case an older checkout link (created
// before user_id was added to custom_data) is still being renewed.
async function resolveSubscriptionUserId(
  supabase: ReturnType<typeof createServiceClient>,
  customData: Record<string, any>,
  email: string | null,
): Promise<string | null> {
  if (customData.user_id) return String(customData.user_id);

  if (email) {
    const { data } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();
    if (data?.id) return data.id;
  }

  return null;
}

// ─── users table sync ──────────────────────────────────────────────────────────
// This is what AppShell / access-control actually read — subscriptions is
// the audit trail, this is the live "what can this user do right now" state.
async function syncUserPlan(
  supabase: ReturnType<typeof createServiceClient>,
  eventName: string,
  attrs: any,
  userId: string,
  plan: string,
  status: DbSubscriptionStatus,
): Promise<void> {
  // subscription_expired = the post-cancellation grace period is over —
  // actually drop them back to Free. Every other event just reflects
  // whatever the current paid-plan state is.
  const isExpired = eventName === "subscription_expired";
  const effectivePlan = isExpired ? "free" : plan;
  const { sitesLimit, linksLimit, pageviewsLimit } = planLimits(effectivePlan);

  const update: Record<string, any> = {
    plan: effectivePlan,
    plan_status: isExpired ? "active" : mapUserPlanStatus(status),
    plan_ends_at: isExpired ? null : (attrs.ends_at ?? null),
    ls_customer_id: attrs.customer_id != null ? String(attrs.customer_id) : null,
    ls_subscription_id: isExpired ? null : String(attrs.id),
    sites_limit: sitesLimit,
    links_limit: linksLimit,
    pageviews_limit: pageviewsLimit,
  };

  const { error } = await supabase.from("users").update(update).eq("id", userId);
  if (error) {
    console.error("[webhook] Failed to sync users.plan:", error.message, update);
  }
}

// ─── Subscription upsert ───────────────────────────────────────────────────────
async function upsertSubscription(
  supabase: ReturnType<typeof createServiceClient>,
  eventName: string,
  attrs: any,
  customData: Record<string, any>,
): Promise<void> {
  const email: string | null = attrs.user_email ?? null;
  const userId = await resolveSubscriptionUserId(supabase, customData, email);

  if (!userId) {
    // Ack the webhook (LS will otherwise retry forever) but log loudly —
    // this means we can't attribute this subscription to any user.
    console.error(
      "[webhook] Could not resolve user_id for subscription",
      attrs.id,
      "email:",
      email,
      "custom_data:",
      customData,
    );
    return;
  }

  const status = mapLemonSqueezyStatus(attrs.status);
  const plan = derivePlan(attrs.variant_name ?? null, attrs.product_name ?? null);
  const nowIso = new Date().toISOString();

  const record: Record<string, any> = {
    user_id: userId,
    provider: "lemon_squeezy",
    subscription_id: String(attrs.id),
    price_id: attrs.variant_id != null ? String(attrs.variant_id) : null,
    plan,
    status,
    trial_ends_at: attrs.trial_ends_at ?? null,
    current_period_end: attrs.renews_at ?? null,
    ends_at: attrs.ends_at ?? null,
    updated_at: nowIso,
  };

  // LS doesn't send an explicit "period start" on every event — only set it
  // when the subscription is first created, so we don't clobber it on renewal.
  if (eventName === "subscription_created") {
    record.current_period_start = attrs.created_at ?? nowIso;
  }

  if (eventName === "subscription_cancelled") {
    record.canceled_at = attrs.updated_at ?? nowIso;
  }

  const { error } = await supabase
    .from("subscriptions")
    .upsert(record, { onConflict: "subscription_id" });

  if (error) {
    console.error("[webhook] Failed to upsert subscription:", error.message, record);
    return; // don't sync users table off a subscriptions write that failed
  }

  await syncUserPlan(supabase, eventName, attrs, userId, plan, status);
}

// ─── LEMON SQUEEZY handler ────────────────────────────────────────────────────
async function handleLemonSqueezy(
  body: string,
  req: NextRequest,
): Promise<NextResponse> {
  const signature = req.headers.get("x-signature") || "";

  if (!verifyLemonSqueezy(body, signature)) {
    console.error("[webhook] LemonSqueezy signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body);
  const eventName = payload?.meta?.event_name;
  const attrs = payload?.data?.attributes;
  const customData = payload?.meta?.custom_data || {};

  // ── Subscription lifecycle events → subscriptions + users ──
  if (typeof eventName === "string" && eventName.startsWith("subscription_")) {
    const supabase = createServiceClient();
    await upsertSubscription(supabase, eventName, attrs, customData);
    return NextResponse.json({
      received: true,
      provider: "lemon_squeezy",
      event: eventName,
    });
  }

  // ── order_created — no-op for this webhook. Subscription events already
  // carry everything needed for billing state; this exists only in case you
  // later want a payment-history log (e.g. "past invoices" in /settings/billing).
  if (eventName !== "order_created") {
    return NextResponse.json({ received: true, skipped: eventName });
  }

  return NextResponse.json({ received: true, provider: "lemon_squeezy" });
}

// ─── STRIPE handler ────────────────────────────────────────────────────────────
async function handleStripe(
  body: string,
  req: NextRequest,
): Promise<NextResponse> {
  const signature = req.headers.get("stripe-signature") || "";

  if (!verifyStripe(body, signature)) {
    console.error("[webhook] Stripe signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body);

  // NOTE: Stripe subscription lifecycle (customer.subscription.created/updated/
  // deleted, invoice.paid, etc.) isn't wired up yet — only one-off checkout
  // sessions are handled below. Say the word if you want Stripe subscriptions
  // mirrored the same way as the Lemon Squeezy ones above.
  if (
    payload.type !== "checkout.session.completed" &&
    payload.type !== "payment_intent.succeeded"
  ) {
    return NextResponse.json({ received: true, skipped: payload.type });
  }

  return NextResponse.json({ received: true, provider: "stripe" });
}

// ─── GUMROAD handler (unchanged) ───────────────────────────────────────────────
async function handleGumroad(
  body: string,
  _req: NextRequest,
): Promise<NextResponse> {
  const params = new URLSearchParams(body);
  const data: Record<string, string> = {};
  params.forEach((v, k) => {
    data[k] = v;
  });

  if (data.refunded === "true") {
    return NextResponse.json({ received: true, skipped: "refund" });
  }

  return NextResponse.json({ received: true, provider: "gumroad" });
}

// ─── PADDLE handler (unchanged) ────────────────────────────────────────────────
async function handlePaddle(
  body: string,
  _req: NextRequest,
): Promise<NextResponse> {
  const payload = JSON.parse(body);
  const eventType = payload?.event_type;

  if (eventType !== "transaction.completed") {
    return NextResponse.json({ received: true, skipped: eventType });
  }

  return NextResponse.json({ received: true, provider: "paddle" });
}

// ─── MAIN ROUTE ───────────────────────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text();

  const isLemonSqueezy = req.headers.has("x-signature");
  const isStripe = req.headers.has("stripe-signature");
  const contentType = req.headers.get("content-type") || "";
  const isGumroad = contentType.includes("application/x-www-form-urlencoded");
  const isPaddle =
    req.headers.has("paddle-signature") ||
    (contentType.includes("application/json") && !isStripe && !isLemonSqueezy);

  try {
    if (isLemonSqueezy) return await handleLemonSqueezy(body, req);
    if (isStripe) return await handleStripe(body, req);
    if (isGumroad) return await handleGumroad(body, req);
    if (isPaddle) return await handlePaddle(body, req);

    console.warn(
      "[webhook] Unknown provider, headers:",
      Object.fromEntries(req.headers),
    );
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  } catch (err) {
    console.error("[webhook] Error processing payment webhook:", err);
    return NextResponse.json(
      { received: true, error: "Processing error" },
      { status: 200 },
    );
  }
}

// Health check
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "ok",
    providers: ["lemon_squeezy", "stripe", "gumroad", "paddle"],
    endpoint: "POST /api/webhook",
  });
}