'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

const OPTIONS = [
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: '1y', label: 'Last Year' },
  { value: 'all', label: 'All Time' },
]

export function DateRangePicker() {
  const router = useRouter()
  const params = useSearchParams()

  const [open, setOpen] = useState(false)

  const current = params.get('range') ?? '24h'

  const selected =
    OPTIONS.find(o => o.value === current)?.label ?? 'Last 30 Days'

  function changeRange(value: string) {
    const search = new URLSearchParams(params)

    search.set('range', value)

    router.push(`?${search.toString()}`)

    setOpen(false)
  }

  return (
    <div className="relative">

      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-body-sm font-medium"
      >
        {selected}

        <ChevronDown
          className={`h-4 w-4 transition ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-line bg-surface shadow-xl z-50 overflow-hidden">

          {OPTIONS.map(option => (

            <button
              key={option.value}
              onClick={() => changeRange(option.value)}
              className={`w-full px-4 py-3 text-left text-sm hover:bg-surface-muted transition

                ${
                  option.value === current
                    ? 'bg-surface-muted font-semibold text-primary'
                    : ''
                }

              `}
            >
              {option.label}
            </button>

          ))}

        </div>
      )}
    </div>
  )
}