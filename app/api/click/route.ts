// app/api/click/route.ts
import { createServiceClient } from '@/utils/supabase/service'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

function hashIp(ip: string) {
  return crypto.createHash('sha256').update(ip + process.env.IP_HASH_SALT!).digest('hex')
}

function parseUA(ua: string) {
  const device = /Mobile|Android|iPhone/i.test(ua) ? 'mobile' : /iPad|Tablet/i.test(ua) ? 'tablet' : 'desktop'
  const browser = /Chrome/i.test(ua) ? 'chrome' : /Safari/i.test(ua) ? 'safari' : /Firefox/i.test(ua) ? 'firefox' : 'other'
  const os = /iPhone|iPad|iOS/i.test(ua) ? 'ios' : /Android/i.test(ua) ? 'android' : /Windows/i.test(ua) ? 'windows' : /Mac/i.test(ua) ? 'mac' : 'other'
  return { device, browser, os }
}

export async function POST(request: Request) {
  const { slug, site_key, referrer } = await request.json()
  if (!slug) return withCors(NextResponse.json({ error: 'slug required' }, { status: 400 }))

  const supabase = createServiceClient()

  const { data: post } = await supabase
    .from('posts')
    .select('id, user_id, site_id')
    .eq('slug', slug)
    .single()

  if (!post) return withCors(NextResponse.json({ ok: false }, { status: 404 }))

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0'
  const ua = request.headers.get('user-agent') ?? ''
  const ipHash = hashIp(ip)
  const { device, browser, os } = parseUA(ua)

  // has this ip_hash clicked this post before?
  const { count } = await supabase
    .from('clicks')
    .select('id', { count: 'exact', head: true })
    .eq('post_id', post.id)
    .eq('ip_hash', ipHash)

  const isUnique = (count ?? 0) === 0
  const country = request.headers.get('x-vercel-ip-country') || 'unknown'
const city = request.headers.get('x-vercel-ip-city') || null

  await supabase.from('clicks').insert({
    post_id: post.id,
    site_id: post.site_id,
    user_id: post.user_id,
    ip_hash: ipHash,
    device,
    browser,
    os,
    referrer: referrer ?? null,
    user_agent: ua,
    is_unique: isUnique,
    country,
    city,
    // country/city: add a geo lookup here later (e.g. Vercel request.geo, or ipapi.co)
  })

  // bump denormalized counters on the post
  await supabase.rpc('increment_post_click', {
    p_post_id: post.id,
    p_is_unique: isUnique,
  })

  return withCors(NextResponse.json({ ok: true }))
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }))
}

function withCors(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*')
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  return res
}