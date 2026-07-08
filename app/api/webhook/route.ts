// app/api/webhook/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT WEBHOOK HANDLER
//
// This is the file that actually attributes revenue to posts.
// Receives payment events from Lemon Squeezy, Stripe, Gumroad, and Paddle.
// Matches each payment to a source post using:
//   1. Custom checkout params (most reliable — set by track.js on buy button)
//   2. Customer email lookup (cross-device fallback)
//
// Setup for each provider:
// Lemon Squeezy: Settings → Webhooks → add https://sourcetruth.io/api/webhook
// Stripe:        Dashboard → Developers → Webhooks → add same URL
// Gumroad:       Settings → Advanced → Ping URL → add same URL
// Paddle:        Developer Tools → Notifications → add same URL
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// TODO: import real DB
// import { prisma } from '@/lib/prisma'
// TODO: import email sender
// import { sendRevenueAlert } from '@/lib/email'

// ─── Types ────────────────────────────────────────────────────────────────────
interface AttributionData {
  source: string
  postId: string
  campaign: string
  firstSource: string
  firstPostId: string
  siteId: string
}

interface ConversionRecord {
  provider: string
  orderId: string
  customerEmail: string
  amount: number       // in cents
  currency: string
  productName: string
  siteId: string
  // Attribution
  source: string
  postId: string
  campaign: string
  firstSource: string
  firstPostId: string
  attributionModel: string
  // Meta
  rawPayload: object
  receivedAt: string
}

// ─── Signature verification ───────────────────────────────────────────────────
function verifyLemonSqueezy(payload: string, signature: string): boolean {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET
  if (!secret) return false
  const hmac = crypto.createHmac('sha256', secret)
  const digest = hmac.update(payload).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
}

function verifyStripe(payload: string, signature: string): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return false
  try {
    // Stripe uses a timestamp+signature format
    const parts = signature.split(',')
    const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1]
    const sig = parts.find(p => p.startsWith('v1='))?.split('=')[1]
    if (!timestamp || !sig) return false
    const signedPayload = `${timestamp}.${payload}`
    const hmac = crypto.createHmac('sha256', secret)
    const digest = hmac.update(signedPayload).digest('hex')
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(sig))
  } catch { return false }
}

function verifyGumroad(payload: string, signature: string): boolean {
  const secret = process.env.GUMROAD_WEBHOOK_SECRET
  if (!secret) return true // Gumroad doesn't always sign — skip in dev
  const hmac = crypto.createHmac('sha256', secret)
  const digest = hmac.update(payload).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
}

// ─── Attribution resolver ─────────────────────────────────────────────────────
async function resolveAttribution(
  customData: Partial<AttributionData>,
  customerEmail: string
): Promise<AttributionData> {

  // Priority 1: custom checkout params (set by track.js on the buy button)
  // This is the most reliable — survives mobile, cross-browser
  if (customData.siteId && customData.source) {
    return {
      source: customData.source || 'direct',
      postId: customData.postId || '',
      campaign: customData.campaign || '',
      firstSource: customData.firstSource || customData.source || 'direct',
      firstPostId: customData.firstPostId || customData.postId || '',
      siteId: customData.siteId,
    }
  }

  // Priority 2: email lookup — find if we've seen this email before
  // (captured via newsletter signup, free download, etc.)
  // TODO: wire to real DB
  // const visitor = await prisma.visitor.findFirst({
  //   where: { email: customerEmail },
  //   orderBy: { createdAt: 'desc' },
  // })
  // if (visitor) {
  //   return {
  //     source: visitor.lastSource,
  //     postId: visitor.lastPostId,
  //     ...
  //   }
  // }

  // Priority 3: fallback — unknown source
  return {
    source: 'unknown',
    postId: '',
    campaign: '',
    firstSource: 'unknown',
    firstPostId: '',
    siteId: customData.siteId || '',
  }
}

// ─── Save conversion ──────────────────────────────────────────────────────────
async function saveConversion(data: ConversionRecord): Promise<void> {
  // TODO: replace with real DB write
  // await prisma.conversion.create({ data })

  // For now just log it clearly
  console.log('💰 [conversion]', {
    provider: data.provider,
    amount: `$${(data.amount / 100).toFixed(2)} ${data.currency}`,
    email: data.customerEmail,
    product: data.productName,
    source: data.source,
    postId: data.postId,
    campaign: data.campaign,
    siteId: data.siteId,
  })

  // TODO: send real-time alert email to site owner
  // await sendRevenueAlert({ ...data })

  // TODO: update post revenue aggregate
  // if (data.postId) {
  //   await prisma.post.update({
  //     where: { id: data.postId },
  //     data: {
  //       revenue: { increment: data.amount },
  //       conversions: { increment: 1 },
  //     }
  //   })
  // }
}

// ─── LEMON SQUEEZY handler ────────────────────────────────────────────────────
async function handleLemonSqueezy(body: string, req: NextRequest): Promise<NextResponse> {
  const signature = req.headers.get('x-signature') || ''

  if (!verifyLemonSqueezy(body, signature)) {
    console.error('[webhook] LemonSqueezy signature verification failed')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = JSON.parse(body)
  const eventName = payload?.meta?.event_name

  // Only process completed orders
  if (eventName !== 'order_created') {
    return NextResponse.json({ received: true, skipped: eventName })
  }

  const attrs = payload?.data?.attributes
  const customData = payload?.meta?.custom_data || {}

  const attribution = await resolveAttribution(
    {
      source: customData.st_source,
      postId: customData.st_post_id,
      campaign: customData.st_campaign,
      firstSource: customData.st_first_source,
      firstPostId: customData.st_first_post_id,
      siteId: customData.st_site_id,
    },
    attrs?.user_email || ''
  )

  await saveConversion({
    provider: 'lemon_squeezy',
    orderId: String(payload?.data?.id || ''),
    customerEmail: attrs?.user_email || '',
    amount: attrs?.total || 0,           // LS sends cents
    currency: attrs?.currency || 'USD',
    productName: attrs?.first_order_item?.product_name || '',
    ...attribution,
    attributionModel: 'last_touch',
    rawPayload: payload,
    receivedAt: new Date().toISOString(),
  })

  return NextResponse.json({ received: true, provider: 'lemon_squeezy' })
}

// ─── STRIPE handler ────────────────────────────────────────────────────────────
async function handleStripe(body: string, req: NextRequest): Promise<NextResponse> {
  const signature = req.headers.get('stripe-signature') || ''

  if (!verifyStripe(body, signature)) {
    console.error('[webhook] Stripe signature verification failed')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = JSON.parse(body)

  if (payload.type !== 'checkout.session.completed' &&
      payload.type !== 'payment_intent.succeeded') {
    return NextResponse.json({ received: true, skipped: payload.type })
  }

  const session = payload?.data?.object
  const metadata = session?.metadata || {}
  const amount = session?.amount_total || session?.amount || 0
  const email = session?.customer_details?.email || session?.receipt_email || ''

  const attribution = await resolveAttribution(
    {
      source: metadata.st_source,
      postId: metadata.st_post_id,
      campaign: metadata.st_campaign,
      firstSource: metadata.st_first_source,
      firstPostId: metadata.st_first_post_id,
      siteId: metadata.st_site_id,
    },
    email
  )

  await saveConversion({
    provider: 'stripe',
    orderId: session?.id || '',
    customerEmail: email,
    amount,
    currency: (session?.currency || 'usd').toUpperCase(),
    productName: session?.line_items?.data?.[0]?.description || 'Stripe Payment',
    ...attribution,
    attributionModel: 'last_touch',
    rawPayload: payload,
    receivedAt: new Date().toISOString(),
  })

  return NextResponse.json({ received: true, provider: 'stripe' })
}

// ─── GUMROAD handler ────────────────────────────────────────────────────────────
async function handleGumroad(body: string, req: NextRequest): Promise<NextResponse> {
  // Gumroad sends form-encoded data
  const params = new URLSearchParams(body)
  const data: Record<string, string> = {}
  params.forEach((v, k) => { data[k] = v })

  if (data.refunded === 'true') {
    return NextResponse.json({ received: true, skipped: 'refund' })
  }

  // Gumroad doesn't support custom checkout params natively
  // so we rely on email lookup only
  const email = data.email || ''
  const attribution = await resolveAttribution({}, email)

  await saveConversion({
    provider: 'gumroad',
    orderId: data.sale_id || '',
    customerEmail: email,
    amount: Math.round(parseFloat(data.price || '0') * 100), // Gumroad sends dollars
    currency: (data.currency || 'USD').toUpperCase(),
    productName: data.product_name || '',
    ...attribution,
    attributionModel: 'last_touch',
    rawPayload: data,
    receivedAt: new Date().toISOString(),
  })

  return NextResponse.json({ received: true, provider: 'gumroad' })
}

// ─── PADDLE handler ────────────────────────────────────────────────────────────
async function handlePaddle(body: string, _req: NextRequest): Promise<NextResponse> {
  const payload = JSON.parse(body)
  const eventType = payload?.event_type

  if (eventType !== 'transaction.completed') {
    return NextResponse.json({ received: true, skipped: eventType })
  }

  const txn = payload?.data
  const customData = txn?.custom_data || {}
  const email = txn?.customer?.email || ''
  const amount = txn?.details?.totals?.total || 0

  const attribution = await resolveAttribution(
    {
      source: customData.st_source,
      postId: customData.st_post_id,
      campaign: customData.st_campaign,
      siteId: customData.st_site_id,
    },
    email
  )

  await saveConversion({
    provider: 'paddle',
    orderId: txn?.id || '',
    customerEmail: email,
    amount: parseInt(amount),
    currency: txn?.currency_code || 'USD',
    productName: txn?.items?.[0]?.price?.description || 'Paddle Payment',
    ...attribution,
    attributionModel: 'last_touch',
    rawPayload: payload,
    receivedAt: new Date().toISOString(),
  })

  return NextResponse.json({ received: true, provider: 'paddle' })
}

// ─── MAIN ROUTE ───────────────────────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  // Read raw body — must be raw string for signature verification
  const body = await req.text()

  // Detect provider from headers
  const isLemonSqueezy = req.headers.has('x-signature')
  const isStripe = req.headers.has('stripe-signature')
  const contentType = req.headers.get('content-type') || ''
  const isGumroad = contentType.includes('application/x-www-form-urlencoded')
  const isPaddle = req.headers.has('paddle-signature') ||
    (contentType.includes('application/json') && !isStripe && !isLemonSqueezy)

  try {
    if (isLemonSqueezy) return await handleLemonSqueezy(body, req)
    if (isStripe) return await handleStripe(body, req)
    if (isGumroad) return await handleGumroad(body, req)
    if (isPaddle) return await handlePaddle(body, req)

    console.warn('[webhook] Unknown provider, headers:', Object.fromEntries(req.headers))
    return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })

  } catch (err) {
    console.error('[webhook] Error processing payment webhook:', err)
    // Always return 200 to payment providers — otherwise they retry forever
    return NextResponse.json({ received: true, error: 'Processing error' }, { status: 200 })
  }
}

// Health check
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    providers: ['lemon_squeezy', 'stripe', 'gumroad', 'paddle'],
    endpoint: 'POST /api/webhook',
  })
}
