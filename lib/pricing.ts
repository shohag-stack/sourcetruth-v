// lib/plans.ts
// Single source of truth for plan limits. Import this everywhere a
// plan's price/events/retention/sites is needed — the marketing
// pricing slider, the pageview event-limit check, and the usage/
// retention enforcement below. Duplicating these numbers in multiple
// files is exactly how the pageview route ended up saying Free=10,000
// while the pricing page said Free=5,000 — one edit here, both places
// change together.

export type PlanId = 'free' | 'starter' | 'growth'

export interface PlanConfig {
  id: PlanId
  name: string
  price: number
  events: number,
  posts: number,
  retentionDays: number
  sites: number
  cta: string
  href: string
}

export const PLANS: PlanConfig[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    events: Number(process.env.NEXT_PUBLIC_FREE),
    retentionDays: 15,
    sites: 1,
    posts: 5,
    cta: 'Get started free',
    href: '/auth/login',
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 15,
    events: Number(process.env.NEXT_PUBLIC_STARTER),
    retentionDays: 90,
    sites: 1,
    posts: 100,
    cta: 'Get started now',
    href: '/auth/login?plan=starter',
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 39,
    posts: 500,
    events: Number(process.env.NEXT_PUBLIC_GROWTH),
    retentionDays: 365,
    sites: 400,
    cta: 'Get started now',
    href: '/auth/login?plan=growth',
  },
]

export const FEATURES = [
  'Real revenue attribution, per post',
  'Device, browser, OS & geo breakdown',
  'Realtime visitors feed',
]

export function getPlanConfig(planId: string | null | undefined): PlanConfig {
  return PLANS.find((p) => p.id === planId) ?? PLANS[0]
}