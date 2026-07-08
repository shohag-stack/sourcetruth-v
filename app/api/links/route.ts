// app/api/links/route.ts
import { createClient } from '@/utils/supabase/client'
import { NextResponse } from 'next/server'
import { customAlphabet } from 'nanoid'

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 7)

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, destination_url, channel, campaign, site_id } = await request.json()
  if (!destination_url) {
    return NextResponse.json({ error: 'destination_url required' }, { status: 400 })
  }

  const slug = nanoid()

  const { data, error } = await supabase
    .from('links')
    .insert({ user_id: user.id, site_id, slug, title, destination_url, channel, campaign })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const url = new URL(destination_url)
  url.searchParams.set('st', slug)

  return NextResponse.json({
    ...data,
    tracked_url: url.toString(),
  })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('links')
    .select('*, conversions(amount)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}