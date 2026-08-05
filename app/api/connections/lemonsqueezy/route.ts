// app/api/connections/lemonsqueezy/route.ts
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { store_id, api_key, site_id, webhook_secret } = await request.json()
  if (!store_id || !api_key || !site_id) {
    return NextResponse.json({ error: 'store_id, api_key, and site_id are required' }, { status: 400 })
  }

  // verify the store_id + api_key actually work before saving
  const verifyRes = await fetch(`https://api.lemonsqueezy.com/v1/stores/${store_id}`, {
    headers: {
      Authorization: `Bearer ${api_key}`,
      Accept: 'application/vnd.api+json',
    },
  })

  if (!verifyRes.ok) {
    return NextResponse.json({ error: 'Could not verify this Store ID and API key. Double-check both.' }, { status: 400 })
  }

  const storeData = await verifyRes.json()
  const storeName = storeData.data?.attributes?.name ?? 'Lemon Squeezy Store'

  const { data, error } = await supabase
    .from('payment_connections')
    .upsert({
      user_id: user.id,
      site_id,
      provider: 'lemon_squeezy',
      store_id: String(store_id),
      webhook_secret,
      api_key_encrypted: api_key, // TODO: encrypt before storing — see note below
      account_name: storeName,
      connected: true,
      last_verified_at: new Date().toISOString(),
    }, { onConflict: 'user_id,site_id,provider' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json()

  const { error } = await supabase
    .from('payment_connections')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}