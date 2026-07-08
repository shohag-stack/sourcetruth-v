// app/api/sites/route.ts
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { customAlphabet } from 'nanoid'

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8)

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, domain } = await request.json()
  if (!name || !domain) {
    return NextResponse.json({ error: 'name and domain required' }, { status: 400 })
  }

  // domain stored without protocol per your schema's check constraint
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const site_key = `st_${nanoid()}`

  const { data, error } = await supabase
    .from('sites')
    .insert({ user_id: user.id, name, domain: cleanDomain, site_key })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
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