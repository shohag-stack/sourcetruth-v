// components/UpgradeWall.tsx
import Link from 'next/link'
import { formatNumber } from '@/lib/utils'

export function UpgradeWall({
  usage,
  limit,
  plan,
}: {
  usage: number
  limit: number
  plan: string
}) {
  return (
    <div className="relative min-h-[70vh] overflow-hidden rounded-2xl">

      {/* ── Blurred fake background ───────────────────────── */}
      <div className="absolute inset-0 pointer-events-none select-none" aria-hidden>
        {/* Fake stat cards */}
        <div className="p-8">
          <div className="grid grid-cols-4 gap-4 mb-6">
            {['$12,840', '8,420', '2.4%', '3m 12s'].map((v, i) => (
              <div key={i} className="card p-5">
                <div className="h-3 w-20 bg-surface-muted rounded mb-3" />
                <div className="text-2xl font-bold text-ink tabular">{v}</div>
                <div className="h-2 w-16 bg-surface-muted rounded mt-2" />
              </div>
            ))}
          </div>
          {/* Fake chart */}
          <div className="card p-5 mb-6">
            <div className="h-3 w-32 bg-surface-muted rounded mb-4" />
            <div className="flex items-end gap-1 h-32">
              {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 100, 65, 80].map((h, i) => (
                <div key={i} className="flex-1 rounded-t"
                  style={{ height: `${h}%`, background: 'linear-gradient(to top, var(--primary-hex, #6366f1), #a5b4fc)' }} />
              ))}
            </div>
          </div>
          {/* Fake table rows */}
          <div className="card overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4 border-b border-line last:border-0">
                <div className="w-8 h-8 rounded-full bg-surface-muted flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 bg-surface-muted rounded w-40" />
                  <div className="h-2 bg-surface-muted rounded w-24" />
                </div>
                <div className="h-3 bg-surface-muted rounded w-16" />
                <div className="h-3 bg-emerald-100 rounded w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Blur overlay ──────────────────────────────────── */}
      <div className="absolute inset-0 backdrop-blur-md bg-bg/60" />

      {/* ── Upgrade card — centered on top ────────────────── */}
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="card p-8 text-center max-w-sm w-full shadow-card-hover relative">

          {/* Usage ring */}
          <div className="relative w-20 h-20 mx-auto mb-5">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="var(--border)" strokeWidth="8" />
              <circle cx="40" cy="40" r="34" fill="none"
                stroke="#ef4444" strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={0}
                strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-red-500">100%</span>
            </div>
          </div>

          <h2 className="text-heading-lg text-ink mb-2">
            Limit reached
          </h2>

          <p className="text-body-sm text-muted mb-1">
            You've used <strong className="text-ink">{formatNumber(usage)}</strong> of{' '}
            <strong className="text-ink">{formatNumber(limit)}</strong> monthly pageviews
          </p>
          <p className="text-body-sm text-muted mb-6">
            on the <span className="capitalize font-medium text-ink">{plan}</span> plan.
            New visitors are no longer being tracked.
          </p>

          {/* Plan comparison teaser */}
          <div className="bg-surface-muted rounded-xl p-3 mb-5 text-left space-y-2">
            <div className="flex items-center justify-between text-body-sm">
              <span className="text-muted">Current ({plan})</span>
              <span className="text-ink font-medium tabular">{formatNumber(limit)} pv/mo</span>
            </div>
            <div className="flex items-center justify-between text-body-sm">
              <span className="text-success font-medium">Starter ↑</span>
              <span className="text-success font-medium tabular">100,000 pv/mo</span>
            </div>
            <div className="flex items-center justify-between text-body-sm">
              <span className="text-primary font-medium">Pro ↑↑</span>
              <span className="text-primary font-medium tabular">1,000,000 pv/mo</span>
            </div>
          </div>

          <Link href="/pricing"
            className="btn-primary w-full block py-3 mb-3 text-center">
            Upgrade now →
          </Link>

          <p className="text-caption text-muted normal-case font-normal">
            Resets 1st of next month · Historical data is safe
          </p>
        </div>
      </div>
    </div>
  )
}