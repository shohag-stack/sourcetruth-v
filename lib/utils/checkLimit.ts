// lib/checkLimit.ts
import { createClient } from '@/utils/supabase/server'

const PAGEVIEW_LIMITS: Record<string, number> = {
  free: Number(process.env.NEXT_PUBLIC_FREE),
  starter: Number(process.env.NEXT_PUBLIC_STARTER),
  pro: Number(process.env.NEXT_PUBLIC_PRO),
}

export async function getUsage(userId: string, siteId: string) {
  const supabase = await createClient()

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [{ data: profile }, { count: monthlyPageviews }] = await Promise.all([
    supabase
      .from('users')
      .select('plan, sites_limit, links_limit')
      .eq('id', userId)
      .single(),
    supabase
      .from('pageviews')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .gte('visited_at', startOfMonth.toISOString()),
  ])

  const plan = profile?.plan ?? 'free'
  const limit = PAGEVIEW_LIMITS[plan]
  const usage = monthlyPageviews ?? 0
  const isOverLimit = usage >= limit

  return { plan, limit, usage, isOverLimit }
}