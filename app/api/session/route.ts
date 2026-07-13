// app/api/session/route.ts
// Called by track.js via navigator.sendBeacon when user leaves a page.
// Updates the duration_seconds on the matching pageview row.
// sendBeacon sends text/plain so we parse it manually.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/service'

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
    // sendBeacon sends Content-Type: text/plain
    // so we read raw text and parse it ourselves
    const text = await req.text()
    const { site_key, session_id, path, duration } = JSON.parse(text)

    if (!site_key || !session_id || duration === undefined) {
      return withCors(NextResponse.json({ ok: false }, { status: 400 }))
    }

    // Sanity check — ignore unrealistic durations
    // Less than 1 second = bot / instant bounce, over 2 hours = tab left open
    if (duration < 1 || duration > 7200) {
      return withCors(NextResponse.json({ ok: true }))
    }

    // ── 1. Look up site ───────────────────────────────────────
    const { data: site } = await createServiceClient()
      .from('sites')
      .select('id')
      .eq('site_key', site_key)
      .maybeSingle()

    if (!site) {
      return withCors(NextResponse.json({ ok: false }, { status: 404 }))
    }

    // ── 2. Update the most recent pageview for this session ───
    // Find the pageview that matches this session + path
    // and update its duration
    const { data: pageview } = await createServiceClient()
      .from('pageviews')
      .select('id')
      .eq('site_id', site.id)
      .eq('session_id', session_id)
      .eq('path', path ?? '/')
      .order('visited_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (pageview) {
      await createServiceClient()
        .from('pageviews')
        .update({ duration_seconds: duration })
        .eq('id', pageview.id)
    }

    return withCors(NextResponse.json({ ok: true }))

  } catch (err) {
    console.error('[session] error:', err)
    return withCors(NextResponse.json({ ok: true }))
  }
}