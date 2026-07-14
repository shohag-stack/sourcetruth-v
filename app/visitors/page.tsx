// app/analytics/traffic/page.tsx
import { AppShell } from '@/components/layout/AppShell'
import { countryFlag } from '@/lib/countryFlag'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

// ─── Helpers ──────────────────────────────────────────────────
function formatDuration(seconds: number): string {
  if (!seconds || seconds < 1) return '—'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}m ${s}s`
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toString()
}

// ─── Ranked list component ────────────────────────────────────
function RankedList({
  title,
  rows,
}: {
  title: string
  rows: { label: string; value: number; flag?: string }[]
}) {
  const max = rows[0]?.value ?? 1
  return (
    <div className="card p-5">
      <h2 className="text-heading-sm text-ink mb-4">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-body-sm text-muted py-4 text-center">No data yet</p>
      ) : (
        <div className="space-y-1">
          {rows.map((row, i) => {
            const pct = Math.round((row.value / max) * 100)
            return (
              <div
                key={`${row.label}-${i}`}
                className="relative flex items-center justify-between px-2 py-2 rounded-lg overflow-hidden"
              >
                <div
                  className="absolute inset-y-0 left-0 bg-surface-muted rounded-lg"
                  style={{ width: `${pct}%` }}
                />
                <span className="relative text-body-sm text-ink flex items-center gap-2">
                  {row.flag && <span>{row.flag}</span>}
                  {row.label}
                </span>
                <span className="relative text-body-sm text-body flex items-center gap-2 tabular">
                  {formatNumber(row.value)}
                  <span className="text-muted">|</span>
                  {pct}%
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────
export default async function TrafficAnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Get first site for this user
  // TODO: add site switcher when multiple sites UI is ready
  const { data: site } = await supabase
    .from('sites')
    .select('id, name, domain')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  // No site yet
  if (!site) {
    return (
      <AppShell>
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="text-4xl mb-3">📊</div>
            <h2 className="text-heading-sm text-ink mb-2">No site connected yet</h2>
            <p className="text-body-sm text-muted mb-4">Add a site in Settings to start tracking visitors.</p>
            <Link href="/settings" className="btn-primary">Go to Settings →</Link>
          </div>
        </div>
      </AppShell>
    )
  }

  // ── Fetch all pageviews for this site ─────────────────────
  // Last 30 days
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: pageviews } = await supabase
    .from('pageviews')
    .select('session_id, path, country, device, browser, os, is_bounce, is_new_visitor, duration_seconds, visited_at')
    .eq('site_id', site.id)
    .gte('visited_at', since)
    .order('visited_at', { ascending: false })

  const rows = pageviews ?? []

  // ── Aggregate stats ───────────────────────────────────────
  const totalPageviews = rows.length

  // Unique visitors = distinct session_ids
  const uniqueSessions = new Set(rows.map(r => r.session_id))
  const totalVisitors = uniqueSessions.size

  // Bounce rate = sessions where is_bounce is still true
  const bouncedSessions = new Set(
    rows.filter(r => r.is_bounce).map(r => r.session_id)
  )
  const bounceRate = totalVisitors > 0
    ? Math.round((bouncedSessions.size / totalVisitors) * 100)
    : 0

  // Avg session duration — only sessions with duration data
  const durationsPerSession = new Map<string, number[]>()
  rows.forEach(r => {
    if (r.duration_seconds && r.duration_seconds > 0) {
      const existing = durationsPerSession.get(r.session_id) ?? []
      existing.push(r.duration_seconds)
      durationsPerSession.set(r.session_id, existing)
    }
  })
  const allDurations = Array.from(durationsPerSession.values()).map(
    arr => arr.reduce((a, b) => a + b, 0)
  )
  const avgDuration = allDurations.length > 0
    ? allDurations.reduce((a, b) => a + b, 0) / allDurations.length
    : 0

  // New visitors this period
  const newVisitors = rows.filter(r => r.is_new_visitor).length

  // ── Top pages ─────────────────────────────────────────────
  const pageCounts = new Map<string, number>()
  rows.forEach(r => {
    const path = r.path ?? '/'
    pageCounts.set(path, (pageCounts.get(path) ?? 0) + 1)
  })
  const topPages = Array.from(pageCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }))

  // ── Top countries ─────────────────────────────────────────
  const countryCounts = new Map<string, number>()
  rows.forEach(r => {
    const c = r.country ?? 'unknown'
    countryCounts.set(c, (countryCounts.get(c) ?? 0) + 1)
  })
  const topCountries = Array.from(countryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([code, value]) => ({
      label: code === 'unknown' ? 'Unknown' : code,
      value,
      flag: countryFlag(code),
    }))

  // ── Top devices ───────────────────────────────────────────
  const deviceCounts = new Map<string, number>()
  rows.forEach(r => {
    const d = r.device ?? 'unknown'
    deviceCounts.set(d, (deviceCounts.get(d) ?? 0) + 1)
  })
  const topDevices = Array.from(deviceCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      value,
    }))

  // ── Top browsers ──────────────────────────────────────────
  const browserCounts = new Map<string, number>()
  rows.forEach(r => {
    const b = r.browser ?? 'unknown'
    browserCounts.set(b, (browserCounts.get(b) ?? 0) + 1)
  })
  const topBrowsers = Array.from(browserCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      value,
    }))

  // ── Top OS ────────────────────────────────────────────────
  const osCounts = new Map<string, number>()
  rows.forEach(r => {
    const o = r.os ?? 'unknown'
    osCounts.set(o, (osCounts.get(o) ?? 0) + 1)
  })
  const topOS = Array.from(osCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      value,
    }))

  // ── Stat cards data ───────────────────────────────────────
  const STATS = [
    {
      label: 'Total Visitors',
      value: formatNumber(totalVisitors),
      sub: `${formatNumber(newVisitors)} new this month`,
      positive: true,
    },
    {
      label: 'Page Views',
      value: formatNumber(totalPageviews),
      sub: `${totalVisitors > 0 ? (totalPageviews / totalVisitors).toFixed(1) : 0} pages / visit`,
      positive: true,
    },
    {
      label: 'Bounce Rate',
      value: `${bounceRate}%`,
      sub: bounceRate < 50 ? 'Good engagement' : 'High bounce',
      positive: bounceRate < 50,
    },
    {
      label: 'Avg Session',
      value: formatDuration(avgDuration),
      sub: `${allDurations.length} sessions tracked`,
      positive: avgDuration > 30,
    },
  ]

  return (
    <AppShell>
      <div className="p-8">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-heading-lg text-ink mb-0.5">Analytics</h1>
            <p className="text-body-sm text-muted">
              {site.domain} · Last 30 days ·{' '}
              {totalPageviews === 0
                ? 'No data yet — make sure track.js is installed'
                : `${formatNumber(totalPageviews)} pageviews recorded`}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 bg-surface-muted p-1 rounded-xl border border-line">
            <Link
              href="/analytics"
              className="px-4 py-2 rounded-lg text-body-sm font-medium text-muted hover:text-body transition-all"
            >
              Revenue
            </Link>
            <span className="px-4 py-2 rounded-lg text-body-sm font-medium bg-surface text-ink shadow-card">
              Traffic
            </span>
          </div>
        </div>

        {/* Empty state */}
        {totalPageviews === 0 && (
          <div className="card p-10 text-center mb-6">
            <div className="text-4xl mb-3">📡</div>
            <h2 className="text-heading-sm text-ink mb-2">No pageviews yet</h2>
            <p className="text-body-sm text-muted mb-5 max-w-sm mx-auto">
              Make sure your tracking script is installed on{' '}
              <strong>{site.domain}</strong> and visitors are arriving with{' '}
              <code className="bg-surface-muted px-1.5 py-0.5 rounded text-xs font-mono text-primary">
                ?st=
              </code>{' '}
              in their URL.
            </p>
            <Link href="/settings" className="btn-outline-primary text-sm">
              Check tracking script →
            </Link>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {STATS.map(s => (
            <div key={s.label} className="card p-5">
              <div className="text-body-sm text-body mb-2">{s.label}</div>
              <div className="text-2xl font-bold text-ink tabular mb-1">{s.value}</div>
              <div className={`text-caption font-medium ${s.positive ? 'text-success' : 'text-primary'}`}>
                {s.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <RankedList title="Top Pages" rows={topPages} />
          <RankedList title="Countries" rows={topCountries} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <RankedList title="Devices" rows={topDevices} />
          <RankedList title="Browsers" rows={topBrowsers} />
          <RankedList title="OS" rows={topOS} />
        </div>
      </div>
    </AppShell>
  )
}