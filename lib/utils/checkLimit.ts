// lib/getUsage.ts
import { createClient } from '@/utils/supabase/server'
import { getPlanConfig, type PlanConfig } from '@/lib/pricing'

// SERVER-ONLY. This uses the server Supabase client (next/headers under
// the hood). Only import it from an app/ Server Component — the same
// page.tsx files that already safely import '@/utils/supabase/server'
// today. Importing it from a 'use client' file, or from anything
// reachable outside app/, will break the build the same way AppShell
// did when it briefly imported next/headers.
export interface UsageSummary {
  plan: PlanConfig
  usage: number
  isOverLimit: boolean
}

export async function getUsage(userId: string): Promise<UsageSummary> {
  const supabase = await createClient()

  const { data: userRow } = await supabase
    .from('users')
    .select('plan')
    .eq('id', userId)
    .maybeSingle()

  const plan = getPlanConfig(userRow?.plan)

  // Usage is account-wide (summed across every site the user owns),
  // since the plan/limit belongs to the user, not an individual site.
  const { data: sites } = await supabase
    .from('sites')
    .select('id')
    .eq('user_id', userId)

  const siteIds = (sites ?? []).map((s) => s.id)

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count } = siteIds.length
    ? await supabase
        .from('pageviews')
        .select('id', { count: 'exact', head: true })
        .in('site_id', siteIds)
        .gte('visited_at', startOfMonth.toISOString())
    : { count: 0 }

  const usage = count ?? 0

  return {
    plan,
    usage,
    isOverLimit: usage >= plan.events,
  }
}

// Retention cutoff for a plan — the earliest timestamp a user is
// allowed to query/see data for. Use this to clamp any `since` date a
// page computes (Dashboard's 30d window, Traffic page's range picker,
// Revenue page's query) so it never reaches further back than the
// plan allows, regardless of what range was requested.
export function retentionCutoff(plan: PlanConfig): Date {
  return new Date(Date.now() - plan.retentionDays * 24 * 60 * 60 * 1000)
}

// Clamps a requested "since" date to whichever is MORE RECENT: the
// requested date, or the plan's retention cutoff. e.g. Free (15d
// retention) requesting a 30-day window gets clamped down to 15 days.
export function clampSince(requestedSince: Date, plan: PlanConfig): Date {
  const cutoff = retentionCutoff(plan)
  return requestedSince > cutoff ? requestedSince : cutoff
}