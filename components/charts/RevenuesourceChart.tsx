'use client'
// components/charts/RevenueSourceChart.tsx
// Stacked area chart — revenue by day, split by "came through a tracked
// post" vs "everything else" (direct/organic/backlinks). This is the
// dollar version of TrafficChart — answers "is post-tracking actually
// worth more than baseline traffic," which is the real product question.

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'

export interface RevenueSourceDay {
  date: string     // e.g. "Jun 24"
  post: number      // revenue in dollars from conversions with a matched post_id
  direct: number    // revenue in dollars from everything else
  total: number
}

interface Props {
  data: RevenueSourceDay[]
}

function formatUSD(v: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s: number, p: any) => s + (p.value ?? 0), 0)
  return (
    <div className="bg-surface border border-line rounded-xl p-3 shadow-card-hover text-body-sm min-w-[160px]">
      <p className="text-caption text-muted normal-case font-normal mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-3 mb-1">
          <span className="flex items-center gap-2 text-body capitalize">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
            {p.dataKey === 'post' ? 'From tracked posts' : 'Direct / other'}
          </span>
          <span className="font-semibold text-ink tabular">{formatUSD(p.value ?? 0)}</span>
        </div>
      ))}
      <div className="border-t border-line mt-2 pt-2 flex items-center justify-between">
        <span className="text-muted">Total</span>
        <span className="font-bold text-ink tabular">{formatUSD(total)}</span>
      </div>
    </div>
  )
}

export function RevenueSourceChart({ data }: Props) {
  if (!data.length || data.every(d => d.total === 0)) {
    return (
      <div className="flex items-center justify-center h-48 text-body-sm text-muted">
        No revenue yet for this period
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="grad-post" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--primary-hex)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="var(--primary-hex)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="grad-direct" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--success-hex)" stopOpacity={0.15} />
            <stop offset="95%" stopColor="var(--success-hex)" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
        <Tooltip content={<CustomTooltip />} />

        <Area type="monotone" dataKey="post" name="post" stroke="var(--primary-hex)" strokeWidth={2} fill="url(#grad-post)" stackId="1" />
        <Area type="monotone" dataKey="direct" name="direct" stroke="var(--success-hex)" strokeWidth={2} fill="url(#grad-direct)" stackId="1" />
      </AreaChart>
    </ResponsiveContainer>
  )
}