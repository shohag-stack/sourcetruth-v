// app/api/track/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// SHORT LINK REDIRECT HANDLER
//
// This is the most important file for attribution accuracy.
// Instead of sharing: yoursite.com?utm_source=linkedin (gets stripped on mobile)
// You share:          sourcetruth.io/r/abc123  (server sets cookie, then redirects)
//
// Because the cookie is set SERVER-SIDE before the redirect,
// mobile browsers (including Safari ITP) cannot strip it.
//
// Flow:
// 1. User posts sourcetruth.io/r/abc123 on LinkedIn
// 2. Follower clicks the link
// 3. This handler fires, reads the link metadata from DB
// 4. Sets a server-side cookie with source/post data
// 5. Redirects to the real destination URL
// 6. When they buy → webhook reads cookie → revenue attributed to that post
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'

// TODO: import your real DB client here
// import { prisma } from '@/lib/prisma'

// Dummy link store — replace with real DB query
const DUMMY_LINKS: Record<string, {
  destination: string
  siteId: string
  postId: string
  source: string
  medium: string
  campaign: string
  createdBy: string
}> = {
  'abc123': {
    destination: 'https://raysa.studio/design-pricing-guide',
    siteId: 'st_demo_4f8a2b9c',
    postId: 'p1',
    source: 'linkedin',
    medium: 'social',
    campaign: 'pricing-post-jun24',
    createdBy: 'user_1',
  },
  'xyz789': {
    destination: 'https://raysa.studio/figma-library',
    siteId: 'st_demo_4f8a2b9c',
    postId: 'p2',
    source: 'instagram',
    medium: 'social',
    campaign: 'figma-launch-jun21',
    createdBy: 'user_1',
  },
}

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug

  // ── 1. Look up the link ────────────────────────────────────────────────────
  // TODO: replace with real DB query:
  // const link = await prisma.trackedLink.findUnique({ where: { slug } })
  const link = DUMMY_LINKS[slug]

  if (!link) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // ── 2. Build session payload ───────────────────────────────────────────────
  const now = new Date().toISOString()
  const session = {
    siteId: link.siteId,
    firstSource: link.source,
    firstMedium: link.medium,
    firstCampaign: link.campaign,
    firstPostId: link.postId,
    firstSeenAt: now,
    lastSource: link.source,
    lastMedium: link.medium,
    lastCampaign: link.campaign,
    lastPostId: link.postId,
    lastSeenAt: now,
    pageViews: 1,
    touchpoints: [{ source: link.source, postId: link.postId, campaign: link.campaign, at: now }],
  }

  // ── 3. Build destination URL with UTM params ───────────────────────────────
  const dest = new URL(link.destination)
  dest.searchParams.set('utm_source', link.source)
  dest.searchParams.set('utm_medium', link.medium)
  dest.searchParams.set('utm_campaign', link.campaign)
  dest.searchParams.set('st_post', link.postId)

  // ── 4. Track the click in DB ───────────────────────────────────────────────
  // TODO: save click event
  // await prisma.click.create({
  //   data: {
  //     linkId: link.id,
  //     siteId: link.siteId,
  //     postId: link.postId,
  //     source: link.source,
  //     userAgent: req.headers.get('user-agent') || '',
  //     referer: req.headers.get('referer') || '',
  //     ip: req.ip || '',
  //     clickedAt: new Date(),
  //   }
  // })

  console.log(`[track] click on slug=${slug} → source=${link.source} post=${link.postId}`)

  // ── 5. Set server-side cookie + redirect ──────────────────────────────────
  const response = NextResponse.redirect(dest.toString(), { status: 302 })

  // Server-set cookie survives Safari ITP (unlike JS-set cookies)
  response.cookies.set('__st_session', JSON.stringify(session), {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
    sameSite: 'lax',
    httpOnly: false, // needs to be readable by track.js on destination site
    secure: process.env.NODE_ENV === 'production',
  })

  return response
}
