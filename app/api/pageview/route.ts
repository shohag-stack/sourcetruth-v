// app/api/pageview/route.ts
// Called by track.js on every page load.
// Records a pageview and detects unique visitors by ip_hash.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/service'
import crypto from 'crypto'

function hashIp(ip: string): string {
  return crypto
    .createHash('sha256')
    .update(ip + (process.env.IP_HASH_SALT ?? ''))
    .digest('hex')
}

function parseUA(ua: string) {
  const device = /Mobile|Android|iPhone/i.test(ua) ? 'mobile'
    : /iPad|Tablet/i.test(ua) ? 'tablet' : 'desktop'
  const browser = /Edg/i.test(ua) ? 'edge'
    : /Chrome/i.test(ua) ? 'chrome'
    : /Firefox/i.test(ua) ? 'firefox'
    : /Safari/i.test(ua) ? 'safari' : 'other'
  const os = /iPhone|iPad/i.test(ua) ? 'ios'
    : /Android/i.test(ua) ? 'android'
    : /Windows/i.test(ua) ? 'windows'
    : /Mac/i.test(ua) ? 'mac'
    : /Linux/i.test(ua) ? 'linux' : 'other'
  return { device, browser, os }
}

function withCors(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*')
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  return res
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }))
}

export async function POST(req: NextRequest) {
  try {
    const { site_key, session_id, path, referrer, screen_width } = await req.json()

    console.log('showing site key received from POST Request of pageview', site_key)

    if (!site_key || !session_id) {
      return withCors(NextResponse.json({ error: 'site_key and session_id required' }, { status: 400 }))
    }

    // ── 1. Look up site ───────────────────────────────────────
    const { data: site } = await createServiceClient()
      .from('sites')
      .select('id, user_id')
      .eq('site_key', site_key)
      .maybeSingle()

    if (!site) {
      return withCors(NextResponse.json({ ok: false }, { status: 404 }))
    }

    // ── 2. Parse request metadata ─────────────────────────────
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip')
      ?? '0.0.0.0'
    const ua = req.headers.get('user-agent') ?? ''
    const ipHash = hashIp(ip)

    // Vercel provides country for free — no external API needed
    const country = req.headers.get('x-vercel-ip-country') ?? 'unknown'
    const city = req.headers.get('x-vercel-ip-city') ?? null

    const { device, browser, os } = parseUA(ua)

    // ── 3. Detect if this session already has pageviews ───────
    // If yes → previous pageview in this session was NOT a bounce
    const { count: sessionCount } = await createServiceClient()
      .from('pageviews')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', site.id)
      .eq('session_id', session_id)

    const isFirstInSession = (sessionCount ?? 0) === 0

    // If this is NOT the first pageview, mark previous ones as not bounced
    if (!isFirstInSession) {
      await createServiceClient()
        .from('pageviews')
        .update({ is_bounce: false })
        .eq('site_id', site.id)
        .eq('session_id', session_id)
    }

    // ── 4. Detect new vs returning visitor (by ip_hash) ───────
    const { count: prevVisits } = await createServiceClient()
      .from('pageviews')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', site.id)
      .eq('ip_hash', ipHash)

    const isNewVisitor = (prevVisits ?? 0) === 0

    // ── 5. Insert pageview ────────────────────────────────────
    await createServiceClient()
      .from('pageviews')
      .insert({
        site_id: site.id,
        user_id: site.user_id,
        session_id,
        path: path ?? '/',
        referrer: referrer ?? null,
        ip_hash: ipHash,
        country,
        city,
        device,
        browser,
        os,
        screen_width: screen_width ?? null,
        is_bounce: true,       // default true — updated if they visit another page
        is_new_visitor: isNewVisitor,
        visited_at: new Date().toISOString(),
      })

    return withCors(NextResponse.json({ ok: true, new_visitor: isNewVisitor }))

  } catch (err) {
    console.error('[pageview] error:', err)
    return withCors(NextResponse.json({ ok: true })) // always 200 to browser
  }
}