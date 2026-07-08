// app/api/identify/route.ts
import { createServiceClient } from '@/utils/supabase/service'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email, slug, site_key } = await request.json()
  if (!email || !site_key) return withCors(NextResponse.json({ error: 'missing fields' }, { status: 400 }))

  const supabase = createServiceClient()

  const { data: site } = await supabase.from('sites').select('id, user_id').eq('site_key', site_key).single()
  if (!site) return withCors(NextResponse.json({ error: 'invalid site' }, { status: 404 }))

  let postId: string | null = null
  if (slug) {
    const { data: post } = await supabase.from('posts').select('id').eq('slug', slug).single()
    postId = post?.id ?? null
  }

  const normalizedEmail = email.toLowerCase().trim()
  const now = new Date().toISOString()

  const { data: existing } = await supabase
    .from('visitors')
    .select('id, first_source, first_post_id')
    .eq('site_id', site.id)
    .eq('email', normalizedEmail)
    .single()

  if (existing) {
    // update last-touch, never overwrite first-touch
    await supabase.from('visitors').update({
      last_source: slug ? 'link' : existing.first_source,
      last_post_id: postId,
      last_seen_at: now,
      page_views: undefined, // let a trigger or separate increment handle this if you want it precise
    }).eq('id', existing.id)
  } else {
    await supabase.from('visitors').insert({
      site_id: site.id,
      user_id: site.user_id,
      email: normalizedEmail,
      first_source: slug ? 'link' : null,
      first_post_id: postId,
      first_seen_at: now,
      last_source: slug ? 'link' : null,
      last_post_id: postId,
      last_seen_at: now,
    })
  }

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