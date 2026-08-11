'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn, formatMoneyFull, formatNumber, trendLabel } from '@/lib/utils'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/client'

const NAV_MAIN = [
  { href: '/dashboard', label: 'Overview', icon: '◈' },
  { href: '/links', label: 'New Post', icon: '+', highlight: true },
  { href: '/posts', label: 'My Posts', icon: '◧' },
  // { href: '/analytics', label: 'Analytics', icon: '◉' },
  { href: '/visitors', label: 'Visitors', icon: '◉' },
  { href: '/revenue', label: 'Revenue', icon: '$' },
  { href: '/sales', label: 'Sales', icon: '$' },
]

const NAV_BOTTOM = [
  { href: '/connect', label: 'Connections', icon: '⚡' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
]

// Provided by AppShell (fetched server-side, no client round trip / no
// loading-skeleton flash). Exported so AppShell can share the same type.
export type SidebarData = {
  name: string
  plan: string
  revenueCents: number
  growthPct: number
  monthlyPageviews: number,
  usagePct: number,
  limit: number,

}

export function Sidebar({ data }: { data: SidebarData | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  // NEW — real sign out, not just a static user block
  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh() // clears any cached client state tied to the old session
  }



  return (
    <aside className="w-[220px] bg-white border-r border-[#E8ECF2] flex flex-col min-h-screen fixed top-0 left-0 z-40">
      <div className="px-5 pt-6 pb-4">
        <div className="flex w-full items-center justify-center gap-2.5">
          <div>
            <Image src={'/logo-icon.svg'} alt='sourcetruth-logo' width={40} height={40} />
          </div>
          <div className=''>
            <div className="font-bold text-[16px] text-[#0F172A] leading-none tracking-tight">SourceTruth</div>
            <div className="text-[#94A3B8] text-[12px] mt-0.5">Revenue Attribution</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-0.5">
        <div className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-widest px-3 pb-2 pt-1">Workspace</div>
        {NAV_MAIN.map((item) => {
          const active = isActive(item.href)
          if (item.highlight) {
            return (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all gradient-brand text-white shadow-sm mb-1">
                <span className="w-4 text-center font-bold text-base">{item.icon}</span>
                {item.label}
              </Link>
            )
          }
          return (
            <Link key={item.href} href={item.href}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
                active ? 'bg-[#EEF2FF] text-[#6366F1] font-medium' : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F8F9FC]'
              )}>
              <span className={cn('w-4 text-center text-sm', active ? 'text-[#6366F1]' : 'text-[#94A3B8]')}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}

        <div className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-widest px-3 pb-2 pt-4">System</div>
        {NAV_BOTTOM.map((item) => {
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
                active ? 'bg-[#EEF2FF] text-[#6366F1] font-medium' : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F8F9FC]'
              )}>
              <span className={cn('w-4 text-center text-sm', active ? 'text-[#6366F1]' : 'text-[#94A3B8]')}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}

        {/* NEW — Sign out, same nav-item styling as everything above it */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-[#475569] hover:text-[#EF4444] hover:bg-[#FEF2F2]"
        >
          <span className="w-4 text-center text-sm text-[#94A3B8]">⏻</span>
          Sign out
        </button>
      </nav>

      {/* Revenue this month — real number, fetched server-side by
          AppShell and passed down. No client fetch, no loading flash. */}
      <div className="mx-3 mb-3 p-3.5 rounded-xl bg-[#F8F9FC] border border-[#E8ECF2]">
        <div className="text-[11px] text-[#94A3B8] mb-1">Revenue this month</div>
        <div className="text-lg font-bold text-[#0F172A] tabular">
          {formatMoneyFull((data?.revenueCents ?? 0) / 100)}
        </div>
        <div
          className="text-[11px] font-medium mt-0.5"
          style={{ color: (data?.growthPct ?? 0) >= 0 ? '#10B981' : '#EF4444' }}
        >
          {trendLabel(data?.growthPct ?? 0)} vs last month
        </div>
      </div>

      <div className="px-4 pb-5 pt-2 border-t border-[#E8ECF2]">
        <div className="flex items-center gap-2.5 mt-3">
          <div className="w-7 h-7 rounded-full gradient-brand flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {(data?.name ?? '?').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-[#0F172A] truncate">
              {data?.name ?? 'Account'}
            </div>
            <div className="text-[11px] text-[#94A3B8] truncate">
              {data?.plan ?? 'Free Plan'}
            </div>
          </div>
        </div>
      </div>


      {/* USAGE BAR DISPLAY */}

      {/* Usage bar in sidebar or dashboard */}
        <div className="card p-4">
          <div className="flex justify-between text-body-sm mb-2">
            <span className="text-muted">Monthly pageviews</span>
            <span className="text-ink font-medium tabular">
              {formatNumber(data?.monthlyPageviews ?? 0)} / {formatNumber(data?.limit ?? 0)}
            </span>
          </div>
          <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                (data?.usagePct ?? 0) > 90 ? 'bg-red-500' :
                (data?.usagePct ?? 0) > 70 ? 'bg-amber-500' : 'bg-primary'
              }`}
              style={{ width: `${data?.usagePct}%` }}
            />
          </div>
          {(data?.usagePct?? 0) > 80 && (
            <p className="text-caption text-amber-600 mt-2">
              Approaching limit — <a href="/pricing" className="underline">upgrade</a>
            </p>
          )}
        </div>
    </aside>
  )
}