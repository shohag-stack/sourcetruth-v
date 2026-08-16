'use client'
// app/auth/login/page.tsx
import { Suspense, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

// Next.js requires any component that calls useSearchParams() to be
// wrapped in a <Suspense> boundary, or the build fails with
// "useSearchParams() should be wrapped in a suspense boundary" during
// static prerendering. Splitting the page into a thin outer default
// export (no hooks) + this inner component (all the actual logic)
// satisfies that requirement.
function LoginForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()
  const searchParams = useSearchParams()

  // Carried over from the pricing page's "Get started now" links
  // (?plan=starter / ?plan=growth). Forwarded through the whole auth
  // round-trip so /auth/callback can send them straight into checkout
  // for that plan instead of dropping them on the dashboard first.
  const plan = searchParams.get('plan')

  function callbackUrl() {
    const url = new URL('/auth/callback', window.location.origin)
    if (plan) url.searchParams.set('plan', plan)
    return url.toString()
  }

  async function handleMagicLink() {
    if (!email.trim()) return
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl(),
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  async function handleGoogle() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl(),
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  // ── Sent state ─────────────────────────────────────────────
  if (sent) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center px-4">
        <div className="bg-white border border-[#E8ECF2] rounded-2xl p-10 w-full max-w-md text-center shadow-card">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-xl font-bold text-[#0F172A] mb-2">Check your email</h2>
          <p className="text-[#475569] text-sm leading-relaxed mb-6">
            We sent a magic link to <strong>{email}</strong>.
            Click it to sign in — no password needed.
          </p>
          <button
            onClick={() => setSent(false)}
            className="text-[#6366F1] text-sm hover:underline"
          >
            Use a different email
          </button>
        </div>
      </div>
    )
  }

  // ── Login form ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white font-bold text-lg mx-auto mb-3">S</div>
          <h1 className="text-2xl font-bold text-[#0F172A]">
            {plan ? 'Create your account' : 'Sign in to SourceTruth'}
          </h1>
          <p className="text-[#94A3B8] text-sm mt-1">
            {plan
              ? `You're one step away from the ${plan.charAt(0).toUpperCase()}${plan.slice(1)} plan`
              : 'Revenue attribution for your social posts'}
          </p>
        </div>

        <div className="bg-white border border-[#E8ECF2] rounded-2xl p-8 shadow-card">

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 border border-[#E8ECF2] hover:border-[#D1D9E6] hover:bg-[#F8F9FC] rounded-xl py-3 text-sm font-medium text-[#0F172A] transition-all mb-4 disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.3z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-[#E8ECF2]" />
            <span className="text-[#94A3B8] text-xs">or</span>
            <div className="flex-1 h-px bg-[#E8ECF2]" />
          </div>

          {/* Email */}
          <div className="mb-4">
            <label className="block text-[12px] font-medium text-[#475569] mb-1.5">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleMagicLink()}
              placeholder="you@example.com"
              className="w-full border border-[#E8ECF2] focus:border-[#6366F1] focus:ring-2 focus:ring-[#EEF2FF] rounded-xl px-4 py-3 text-sm text-[#0F172A] placeholder-[#94A3B8] outline-none transition-all"
            />
          </div>

          {error && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-3 text-[#DC2626] text-sm mb-4">
              {error}
            </div>
          )}

          <button
            onClick={handleMagicLink}
            disabled={!email.trim() || loading}
            className="w-full bg-[#6366F1] hover:bg-[#4F46E5] text-white font-medium rounded-xl py-3 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send magic link'}
          </button>

          <p className="text-center text-[#94A3B8] text-xs mt-4">
            No password needed. We'll email you a sign-in link.
          </p>
        </div>

        <p className="text-center text-[#94A3B8] text-xs mt-6">
          By signing in you agree to our{' '}
          <a href="/terms" className="text-[#6366F1] hover:underline">Terms</a>
          {' '}and{' '}
          <a href="/privacy" className="text-[#6366F1] hover:underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  )
}

// Lightweight fallback shown for the brief moment before search params
// resolve — same background as the real page so there's no layout
// flash, just no interactive content yet.
function LoginFormFallback() {
  return <div className="min-h-screen bg-[#F8F9FC]" />
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  )
}