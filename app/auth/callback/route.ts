// app/auth/callback/route.ts
// Handles both magic link and Google OAuth redirects.
// Supabase redirects here after auth with a `code` param.
// We exchange it for a session then redirect to dashboard.

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

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

    // Check if user has a site set up yet
    // If not, redirect to onboarding instead of dashboard
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
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
