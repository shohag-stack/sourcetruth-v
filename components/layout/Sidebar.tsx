'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import Image from 'next/image'

const NAV_MAIN = [
  { href: '/dashboard', label: 'Overview', icon: '◈' },
  { href: '/links', label: 'New Post', icon: '+', highlight: true },
  { href: '/posts', label: 'My Posts', icon: '◧' },
  { href: '/analytics', label: 'Analytics', icon: '◉' },
  { href: '/visitors', label: 'Visitors', icon: '◉' },
  { href: '/revenue', label: 'Revenue', icon: '$' },
]

const NAV_BOTTOM = [
  { href: '/connect', label: 'Connections', icon: '⚡' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
]

export function Sidebar() {
  const pathname = usePathname()
  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  return (
    <aside className="w-[220px] bg-white border-r border-[#E8ECF2] flex flex-col min-h-screen fixed top-0 left-0 z-40">
      <div className="px-5 pt-6 pb-4">
        <div className="flex w-full items-center justify-center gap-2.5">
          <div>
            <Image src={'./logo-icon.svg'} alt='sourcetruth-logo' width={40} height={40} />
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
      </nav>

      <div className="mx-3 mb-3 p-3.5 rounded-xl bg-[#F8F9FC] border border-[#E8ECF2]">
        <div className="text-[11px] text-[#94A3B8] mb-1">Revenue this month</div>
        <div className="text-lg font-bold text-[#0F172A] tabular">$13,170</div>
        <div className="text-[11px] text-[#10B981] font-medium mt-0.5">↑ 23.4% vs last month</div>
      </div>

      <div className="px-4 pb-5 pt-2 border-t border-[#E8ECF2]">
        <div className="flex items-center gap-2.5 mt-3">
          <div className="w-7 h-7 rounded-full gradient-brand flex items-center justify-center text-white text-xs font-bold flex-shrink-0">R</div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-[#0F172A] truncate">Raysa Studio</div>
            <div className="text-[11px] text-[#94A3B8] truncate">Pro Plan</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
