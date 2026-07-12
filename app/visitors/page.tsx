// app/analytics/traffic/page.tsx
//
// SCAFFOLD PAGE — see lib/dummy-traffic-data.ts for exactly which
// fields are real (exist in your schema today) vs. placeholder
// (need new columns / a geo-IP service before this is functional).
import { AppShell } from '@/components/layout/AppShell'
import Link from 'next/link'
import { TRAFFIC_STATS, MAP_PINS, TOP_PAGES, TOP_LOCATIONS, TOP_OS, TOP_BROWSERS, RankedRow } from '@/lib/dummy-traffic-data'

function RankedList({ title, rows }: { title: string; rows: RankedRow[] }) {
  return (
    <div className="card p-5">
      <h2 className="text-heading-sm text-ink mb-4">{title}</h2>
      <div className="space-y-1">
        {rows.map((row, i) => (
          <div key={`${row.label}-${i}`} className="relative flex items-center justify-between px-2 py-2 rounded-lg overflow-hidden">
            {/* pct bar behind the row, like the mockup's shaded row background */}
            <div className="absolute inset-y-0 left-0 bg-surface-muted rounded-lg" style={{ width: `${row.pct}%` }} />
            <span className="relative text-body-sm text-ink flex items-center gap-2">
              {row.flag && <span>{row.flag}</span>}
              {row.label}
            </span>
            <span className="relative text-body-sm text-body flex items-center gap-2 tabular">
              {row.value} <span className="text-muted">|</span> {row.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TrafficAnalyticsPage() {
  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-heading-lg text-ink mb-0.5">Analytics</h1>
            <p className="text-body-sm text-muted">Visitor traffic, geography and devices — placeholder data, see file comments.</p>
          </div>

          <div className="flex gap-1 bg-surface-muted p-1 rounded-xl border border-line">
            <Link href="/analytics"
              className="px-4 py-2 rounded-lg text-body-sm font-medium text-muted hover:text-body transition-all">
              Revenue
            </Link>
            <span className="px-4 py-2 rounded-lg text-body-sm font-medium bg-surface text-ink shadow-card">
              Traffic
            </span>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {TRAFFIC_STATS.map(s => (
            <div key={s.label} className="card p-5">
              <div className="text-body-sm text-body mb-2">{s.label}</div>
              <div className="text-2xl font-bold text-ink tabular mb-1">{s.value}</div>
              <div className={`text-caption font-medium normal-case ${s.positive ? 'text-success' : 'text-primary'}`}>
                {s.positive ? '▲' : '▼'} {s.trend}
              </div>
            </div>
          ))}
        </div>

        {/* World map — simplified placeholder, see dummy-traffic-data.ts */}
        <div className="card p-6 mb-6 flex items-center justify-center">
          <div
            className="relative w-full max-w-2xl aspect-square rounded-full overflow-hidden border border-line"
            style={{
              backgroundImage: 'url(https://upload.wikimedia.org/wikipedia/commons/8/83/Equirectangular_projection_SW.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="absolute inset-0 bg-bg/10" />
            {MAP_PINS.map(pin => (
              <div key={pin.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 group"
                style={{ left: `${pin.x}%`, top: `${pin.y}%` }}>
                <div className="w-7 h-7 rounded-full bg-primary text-white text-xs flex items-center justify-center shadow-card border-2 border-surface">
                  {pin.flag}
                </div>
                {pin.count > 1 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-success text-white text-[9px] font-bold flex items-center justify-center border border-surface">
                    {pin.count}
                  </span>
                )}
                <span className="pointer-events-none absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] bg-ink text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  {pin.country}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <RankedList title="Top Pages" rows={TOP_PAGES} />
          <RankedList title="Location" rows={TOP_LOCATIONS} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RankedList title="OS" rows={TOP_OS} />
          <RankedList title="Browsers" rows={TOP_BROWSERS} />
        </div>
      </div>
    </AppShell>
  )
}