// lib/checkout.ts
// Shared checkout-URL builder for SourceTruth's OWN Starter/Growth
// subscription products (not customers' connected stores). Used by
// both /auth/callback (straight-to-checkout right after a pricing-page
// signup) and /settings/billing (manual upgrade from inside the app),
// so there's one place defining how a checkout URL gets built instead
// of two copies that could drift apart.
import type { PlanId } from '@/lib/pricing'

export const CHECKOUT_URLS: Partial<Record<PlanId, string>> = {
  starter: process.env.NEXT_PUBLIC_LEMONSQUEEZY_STARTER_CHECKOUT_URL,
  growth: process.env.NEXT_PUBLIC_LEMONSQUEEZY_GROWTH_CHECKOUT_URL,
}

// Embeds the user's id in custom_data so the billing webhook can match
// the resulting subscription back to a specific account, plus
// prefills their email so they don't have to retype it at checkout.
export function buildCheckoutUrl(
  base: string,
  userId: string,
  email: string | null,
): string {
  const url = new URL(base)
  url.searchParams.set('checkout[custom][user_id]', userId)
  if (email) url.searchParams.set('checkout[email]', email)
  return url.toString()
}