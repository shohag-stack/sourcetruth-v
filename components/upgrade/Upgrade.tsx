// components/billing/UpgradeWall.tsx
import Link from 'next/link'
import type { UsageSummary } from '@/lib/utils/checkLimit'

export function UpgradeWall({ plan, usage }: UsageSummary) {
  const pct = Math.min(100, Math.round((usage / plan.events) * 100))

  return (
    <div className="p-8 flex items-center justify-center min-h-[70vh]">
      <div className="card max-w-md w-full p-8 text-center">
        <div className="text-4xl mb-3">📈</div>
        <h2 className="text-heading-sm text-ink mb-2">
          You've hit your {plan.name} plan limit
        </h2>
        <p className="text-body-sm text-muted mb-5">
          {usage.toLocaleString()} / {plan.events.toLocaleString()} events used this
          month ({pct}%). Upgrade to keep tracking new visitors and sales without
          interruption.
        </p>
        <div className="h-2 rounded-full bg-surface-muted overflow-hidden mb-6">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <Link href="/settings/billing" className="btn-primary w-full block text-center">
          Upgrade plan →
        </Link>
      </div>
    </div>
  )
}