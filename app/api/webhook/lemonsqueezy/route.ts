// app/api/webhook/lemonsqueezy/route.ts
import { createServiceClient } from '@/utils/supabase/service'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: Request) {

  console.log('showing lemon squeezy order from webhook route', request)
  const rawBody = await request.text()
  const signature = request.headers.get('x-signature') ?? ''
  const digest = crypto.createHmac('sha256', process.env.LEMONSQUEEZY_WEBHOOK_SECRET!).update(rawBody).digest('hex')

  if (signature !== digest) return NextResponse.json({ error: 'invalid signature' }, { status: 401 })

  const payload = JSON.parse(rawBody)
  if (payload.meta?.event_name !== 'order_created') return NextResponse.json({ ok: true })

  const attrs = payload.data.attributes
  const email = attrs.user_email?.toLowerCase().trim()
  const orderId = String(payload.data.id)
  const amountCents = attrs.total // LS sends total already in cents

  const supabase = createServiceClient()

  // find the site via the store, or however you map LS store → your site — depends on payment_connections
  const { data: conn } = await supabase
    .from('payment_connections')
    .select('user_id, site_id')
    .eq('provider', 'lemon_squeezy')
    .eq('account_email', attrs.store_email ?? '')
    .single()

  // attribution lookup: match email to a visitor for first/last touch
  const { data: visitor } = await supabase
    .from('visitors')
    .select('first_source, first_post_id, last_source, last_post_id')
    .eq('email', email)
    .single()

  const postId = visitor?.last_post_id ?? null

  const { error } = await supabase.from('conversions').insert({
    user_id: conn?.user_id,
    site_id: conn?.site_id,
    post_id: postId,
    provider: 'lemon_squeezy',
    order_id: orderId,
    customer_email: email,
    amount_cents: amountCents,
    currency: attrs.currency ?? 'USD',
    product_name: attrs.first_order_item?.product_name ?? null,
    source: visitor?.last_source ?? null,
    first_source: visitor?.first_source ?? null,
    first_post_id: visitor?.first_post_id ?? null,
    attribution_model: 'last_touch',
    raw_payload: payload,
  })

  // unique(provider, order_id) means a duplicate delivery throws here — that's expected, not a bug
  if (error && !error.message.includes('duplicate')) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (postId && !error) {
    await supabase.rpc('increment_post_revenue', { p_post_id: postId, p_amount_cents: amountCents })
  }

  return NextResponse.json({ ok: true })
}