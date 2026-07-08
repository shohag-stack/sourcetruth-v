'use client'
// components/charts/RevenueAreaChart.tsx
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { DUMMY_DAILY_REVENUE } from '@/lib/dummy-data'

const CHANNELS = [
  { key: 'linkedin', color: '#0077B5' },
  { key: 'instagram', color: '#E1306C' },
  { key: 'twitter', color: '#64748B' },
  { key: 'facebook', color: '#1877F2' },
  { key: 'threads', color: '#0F172A' },
]

export function RevenueAreaChart() {
  const data = DUMMY_DAILY_REVENUE.filter((_, i) => i % 2 === 0) // every other day to avoid crowding
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <defs>
          {CHANNELS.map(c => (
            <linearGradient key={c.key} id={`grad-${c.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={c.color} stopOpacity={0.15} />
              <stop offset="95%" stopColor={c.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E8ECF2" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
        <Tooltip
          contentStyle={{ background: '#fff', border: '1px solid #E8ECF2', borderRadius: 12, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
          labelStyle={{ color: '#94A3B8', fontSize: 11, marginBottom: 4 }}
          formatter={(val: number, name: string) => [`$${val}`, name.charAt(0).toUpperCase() + name.slice(1)]}
        />
        {CHANNELS.map(c => (
          <Area key={c.key} type="monotone" dataKey={c.key} stroke={c.color} strokeWidth={1.5} fill={`url(#grad-${c.key})`} stackId="1" />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
