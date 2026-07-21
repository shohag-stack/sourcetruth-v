'use client'
// components/charts/TrafficChart.tsx
// Stacked area chart — visitors by day, split by source type

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

export interface TrafficDay {
  date: string        // e.g. "Jun 24"
  linked: number      // came via ?st= tracked link
  direct: number      // no ?st= param
  total: number
}

interface Props {
  data: TrafficDay[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-line rounded-xl p-3 shadow-card-hover text-body-sm">
      <p className="text-caption text-muted normal-case font-normal mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-body capitalize">{p.dataKey}:</span>
          <span className="font-semibold text-ink tabular">{p.value}</span>
        </div>
      ))}
      <div className="border-t border-line mt-2 pt-2 flex items-center justify-between">
        <span className="text-muted">Total</span>
        <span className="font-bold text-ink tabular">
          {payload.reduce((s: number, p: any) => s + (p.value ?? 0), 0)}
        </span>
      </div>
    </div>
  )
}

export function TrafficChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-body-sm text-muted">
        No data for this period
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="grad-linked" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="var(--primary-hex)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="var(--primary-hex)" stopOpacity={0}   />
          </linearGradient>
          <linearGradient id="grad-direct" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="var(--success-hex)" stopOpacity={0.15} />
            <stop offset="95%" stopColor="var(--success-hex)" stopOpacity={0}    />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />

        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: 'var(--muted)' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--muted)' }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />

        <Tooltip content={<CustomTooltip />} />

        <Area
          type="monotone"
          dataKey="linked"
          name="Linked"
          stroke="var(--primary-hex)"
          strokeWidth={2}
          fill="url(#grad-linked)"
          stackId="1"
        />
        <Area
          type="monotone"
          dataKey="direct"
          name="Direct"
          stroke="var(--success-hex)"
          strokeWidth={2}
          fill="url(#grad-direct)"
          stackId="1"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}