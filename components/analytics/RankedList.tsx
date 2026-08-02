'use client'
import { formatNumber } from '@/lib/utils'
// Make this a client component since it uses useSearchParams
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

export function RankedList({
  title,
  rows,
  filterKey,
}: {
  title: string
  filterKey: string  // e.g. "country", "device", "browser", "os", "path"
  rows: { label: string; value: number; flag?: string; icon?: React.ReactNode; filterValue?: string }[]
}) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const max = rows[0]?.value ?? 1
  const activeFilter = searchParams.get(filterKey)

  function handleClick(filterValue: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (params.get(filterKey) === filterValue) {
      params.delete(filterKey)  // click again to remove
    } else {
      params.set(filterKey, filterValue)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="card p-5">
      <h2 className="text-heading-sm text-ink mb-4">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-body-sm text-muted py-4 text-center">No data yet</p>
      ) : (
        <div className="space-y-1">
          {rows.map((row, i) => {
            const pct = Math.round((row.value / max) * 100)
            const filterValue = row.filterValue ?? row.label
            const isActive = activeFilter === filterValue

            return (
              <button
                key={`${row.label}-${i}`}
                onClick={() => handleClick(filterValue)}
                className={`relative flex items-center justify-between px-2 py-2 rounded-lg overflow-hidden w-full text-left transition-all ${
                  isActive
                    ? 'ring-2 ring-primary ring-inset'
                    : 'hover:bg-surface-muted/50'
                }`}
              >
                {/* Background bar */}
                <div
                  className={`absolute inset-y-0 left-0 rounded-lg transition-all ${
                    isActive ? 'bg-primary-tint' : 'bg-surface-muted'
                  }`}
                  style={{ width: `${pct}%` }}
                />
                <span className="relative text-body-sm text-ink flex items-center gap-2">
                  {row.icon}
                  {row.label}
                  {isActive && (
                    <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-full font-medium">
                      filtered
                    </span>
                  )}
                </span>
                <span className="relative text-body-sm text-body flex items-center gap-2 tabular">
                  {formatNumber(row.value)}
                  <span className="text-muted">|</span>
                  {pct}%
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}