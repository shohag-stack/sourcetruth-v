// app/auth/callback/route.ts
// Handles both magic link and Google OAuth redirects.
// Supabase redirects here after auth with a `code` param.
// We exchange it for a session then redirect to dashboard —
// OR, if a `plan` param was carried through from the pricing page,
// straight into that plan's checkout instead, so signup → payment
// happens as one continuous flow rather than a detour through
// /settings/billing.

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { CHECKOUT_URLS, buildCheckoutUrl } from '@/lib/checkout'
import type { PlanId } from '@/lib/pricing'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  // Carried over from the pricing page via the login page's ?plan=
  // param. Only 'starter' and 'growth' are ever purchasable — 'free'
  // has no checkout URL, so it's simply ignored below if present.
  const requestedPlan = searchParams.get('plan') as PlanId | null

  // Handle auth errors from provider
  if (error) {
    console.error('[auth/callback] OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(errorDescription || error)}`
    )
  }

  if (code) {
    const cookieStore = await cookies()
    const supabase = await createClient()

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('[auth/callback] Code exchange error:', exchangeError.message)
      return NextResponse.redirect(
        `${origin}/auth/login?error=${encodeURIComponent(exchangeError.message)}`
      )
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // ── Straight-to-checkout for pricing-page signups ──────────
      // Runs before the onboarding/dashboard check below — if they
      // came here to buy Starter/Growth, that takes priority over
      // "do they have a site set up yet."
      const checkoutBase = requestedPlan ? CHECKOUT_URLS[requestedPlan] : undefined
      if (checkoutBase) {
        return NextResponse.redirect(
          buildCheckoutUrl(checkoutBase, user.id, user.email ?? null),
        )
      }

      // Check if user has a site set up yet
      // If not, redirect to onboarding instead of dashboard
      const { data: sites } = await supabase
        .from('sites')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      // New user — no sites yet — send to onboarding
      if (!sites || sites.length === 0) {
        return NextResponse.redirect(`${origin}/dashboard`)
      }
    }

    // Existing user — go to dashboard
    return NextResponse.redirect(`${origin}${next}`)
  }

  // No code — something went wrong
  return NextResponse.redirect(`${origin}/auth/login?error=missing_code`)
}