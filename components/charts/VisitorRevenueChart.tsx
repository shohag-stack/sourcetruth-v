'use client'
// components/charts/VisitorRevenueChart.tsx
// Visitors (line/area, left axis) + Revenue (bars, right axis), same
// timeline. Hover any day for the full breakdown.

import {
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'

export interface VisitorRevenueDay {
  date: string           // e.g. "Jul 15"
  fullDate: string        // e.g. "Wednesday, 15 July" — for the tooltip header
  visitors: number
  newVisitors: number
  returningVisitors: number
  revenueCents: number
  newRevenueCents: number
  returningRevenueCents: number
  conversions: number
}

interface Props {
  data: VisitorRevenueDay[]
}

function formatUSD(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100)
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const day: VisitorRevenueDay = payload[0]?.payload
  if (!day) return null

  const newPct = day.visitors > 0 ? (day.newVisitors / day.visitors) * 100 : 0
  const revenuePerVisitor = day.visitors > 0 ? day.revenueCents / day.visitors : 0
  const conversionRate = day.visitors > 0 ? (day.conversions / day.visitors) * 100 : 0

  return (
    <div className="bg-ink text-white rounded-xl p-4 shadow-card-hover text-body-sm min-w-[260px]">
      <p className="font-semibold mb-3">{day.fullDate}</p>

      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: '#93C5FD' }} />
          Visitors
        </span>
        <span className="font-bold tabular">{day.visitors}</span>
      </div>
      {day.visitors > 0 && (
        <>
          <div className="h-1.5 rounded-full bg-white/20 overflow-hidden mb-1.5">
            <div className="h-full bg-[#93C5FD]" style={{ width: `${newPct}%` }} />
          </div>
          <div className="flex items-center justify-between text-[11px] text-white/60 mb-3">
            <span>{day.newVisitors} new</span>
            <span>{day.returningVisitors} returning</span>
          </div>
        </>
      )}

      <div className="border-t border-white/15 pt-2 mb-2">
        <div className="text-[10px] uppercase tracking-wide text-white/50 mb-1.5">Revenue</div>
        <div className="flex items-center justify-between font-bold tabular mb-1">
          <span>Total</span>
          <span>{formatUSD(day.revenueCents)}</span>
        </div>
        {day.revenueCents > 0 && (
          <>
            <div className="flex items-center justify-between text-white/70">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: '#F0A585' }} />
                New
              </span>
              <span className="tabular">{formatUSD(day.newRevenueCents)}</span>
            </div>
            {day.returningRevenueCents > 0 && (
              <div className="flex items-center justify-between text-white/70">
                <span>Returning</span>
                <span className="tabular">{formatUSD(day.returningRevenueCents)}</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="border-t border-white/15 pt-2 space-y-1">
        <div className="flex items-center justify-between text-white/70">
          <span>Revenue/visitor</span>
          <span className="tabular">{formatUSD(revenuePerVisitor)}</span>
        </div>
        <div className="flex items-center justify-between text-white/70">
          <span>Conversion rate</span>
          <span className="tabular">{conversionRate.toFixed(2)}%</span>
        </div>
      </div>
    </div>
  )
}

export function VisitorRevenueChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-56 text-body-sm text-muted">
        No data for this period
      </div>
    )
  }

  // When there's genuinely zero revenue across the whole period, don't
  // give the axis anything to auto-scale against — that's what produced
  // both the "$0.1" artifact and then the "$1" ceiling artifact. Force
  // a single flat $0 tick instead. Once there's real revenue, let it
  // scale normally.
  const hasRevenue = data.some(d => d.revenueCents > 0)

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="grad-visitors" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#93C5FD" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#93C5FD" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} axisLine={false} />
        <YAxis yAxisId="visitors" tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis
          yAxisId="revenue"
          orientation="right"
          tick={{ fontSize: 11, fill: 'var(--muted)' }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          domain={hasRevenue ? [0, 'dataMax'] : [0, 1]}
          ticks={hasRevenue ? undefined : [0]}
          tickFormatter={v => `$${Math.round(v / 100)}`}
        />
        <Tooltip content={<CustomTooltip />} />

        <Area
          yAxisId="visitors"
          type="monotone"
          dataKey="visitors"
          stroke="#93C5FD"
          strokeWidth={2}
          fill="url(#grad-visitors)"
        />
        <Bar yAxisId="revenue" dataKey="revenueCents" fill="#F0A585" radius={[3, 3, 0, 0]} maxBarSize={28} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}