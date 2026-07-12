// app/api/sites/route.ts
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { customAlphabet } from 'nanoid'

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8)

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, domain, site_key } = await request.json()
  if (!name || !domain || !site_key) {
    return NextResponse.json({ error: 'name, domain and site_key required' }, { status: 400 })
  }

  // Check plan limit
  const { data: profile } = await supabase
    .from('users')
    .select('plan, sites_limit')
    .eq('id', user.id)
    .single()

  const { count } = await supabase
    .from('sites')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const limit = profile?.sites_limit ?? 1
  if (limit !== -1 && (count ?? 0) >= limit) {
    return NextResponse.json(
      { error: `Site limit reached. Upgrade your plan to add more sites.` },
      { status: 403 }
    )
  }

  const { data, error } = await supabase
    .from('sites')
    .insert({ user_id: user.id, name, domain, site_key })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, name, domain } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const cleanDomain = domain ? domain.replace(/^https?:\/\//, '').replace(/\/$/, '') : undefined

  const { data, error } = await supabase
    .from('sites')
    .update({ ...(name && { name }), ...(cleanDomain && { domain: cleanDomain }) })
    .eq('id', id)
    .eq('user_id', user.id) // guard against editing someone else's site
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('sites')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id) // RLS double-check — user can only delete own sites

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}