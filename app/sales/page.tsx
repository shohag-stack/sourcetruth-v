// app/revenue/sales/page.tsx
import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { metaFor } from '@/lib/metaFor'
import { countryDisplay} from '@/lib/countryFlag'
import { UpgradeWall } from '@/components/upgrade/Upgrade'
import {
    formatMoney,
  formatMoneyFull,
  formatNumber,
  maskEmail,
  timeAgo,
  timeToConvert,
} from '@/lib/utils'
import {
  DEVICE_ICON,
  BROWSER_LABEL,
  BROWSER_ICON,
  OS_LABEL,
  OS_ICON,
} from '@/lib/analytics'
import { PROVIDER_META } from '@/lib/provider'
import { avatarUrl } from '@/lib/avatarUrl'
import { SourceBadge } from '@/lib/sourceBadge'
import { Monitor } from 'lucide-react'
import { getUsage } from '@/lib/utils/checkLimit'

const PAGE_SIZE = 4

const GRID_COLS =
  'md:grid md:grid-cols-[minmax(200px,1.5fr)_minmax(160px,1fr)_minmax(140px,1fr)_minmax(100px,0.7fr)_minmax(80px,0.5fr)_minmax(80px,0.5fr)_minmax(80px,0.5fr)] md:gap-4'


export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    provider?: string
    source?: string
    q?: string
  }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const filterProvider = params.provider ?? null
  const filterSource = params.source ?? null
  const filterQuery = params.q ?? null

  // ── Active site ──────────────────────────────────────────
  const { data: site } = await supabase
    .from('sites')
    .select('id, name, domain')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!site) {
    return (
      <AppShell>
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="text-4xl mb-3">💰</div>
            <h2 className="text-heading-sm text-ink mb-2">No site connected</h2>
            <p className="text-body-sm text-muted mb-4">Add a site in Settings first.</p>
            <Link href="/settings" className="btn-primary">Go to Settings →</Link>
          </div>
        </div>
      </AppShell>
    )
  }

  // ── Build query ──────────────────────────────────────────
  let query = supabase
    .from('conversions')
    .select(`
      id, provider, order_id, customer_email,first_source,first_seen_at,
      amount_cents, currency, product_name,
      source, country, device, os, browser,
      days_to_convert, received_at, post_id,
      posts ( id, content, channel, slug )
    `, { count: 'exact' })
    .eq('site_id', site.id)
    .eq('refunded', false)

  if (filterProvider) query = query.eq('provider', filterProvider)
  if (filterSource)   query = query.eq('source', filterSource)
  if (filterQuery)    query = query.ilike('customer_email', `%${filterQuery}%`)

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data: conversions, count } = await query
    .order('received_at', { ascending: false })
    .range(from, to)

  const rows = conversions ?? []
  const totalCount = count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // ── Totals for this filter ────────────────────────────────
  const { data: totalsData } = await supabase
    .from('conversions')
    .select('amount_cents')
    .eq('site_id', site.id)
    .eq('refunded', false)

  const totalRevenue = (totalsData ?? []).reduce((s, c) => s + (c.amount_cents ?? 0), 0)

  // ── Available providers for filter ───────────────────────
  const { data: providerList } = await supabase
    .from('conversions')
    .select('provider')
    .eq('site_id', site.id)
    .eq('refunded', false)

  const providers = [...new Set((providerList ?? []).map(p => p.provider))]

  // ── CSV export (current filter, all rows) ─────────────────
  const { data: allForExport } = await supabase
    .from('conversions')
    .select('customer_email, provider, product_name, amount_cents, currency, source, country, device, os, browser, days_to_convert, received_at')
    .eq('site_id', site.id)
    .eq('refunded', false)
    .order('received_at', { ascending: false })

  const csvData = [
    ['Customer', 'Provider', 'Product', 'Amount', 'Currency', 'Source', 'Country', 'Device', 'OS', 'Browser', 'Days to convert', 'Date'],
    ...(allForExport ?? []).map(c => [
      c.customer_email ?? '',
      c.provider,
      c.product_name ?? '',
      ((c.amount_cents ?? 0) / 100).toFixed(2),
      c.currency ?? 'USD',
      c.source ?? '',
      c.country ?? '',
      c.device ?? '',
      c.os ?? '',
      c.browser ?? '',
      String(c.days_to_convert ?? ''),
      new Date(c.received_at).toLocaleDateString(),
    ]),
  ].map(r => r.join(',')).join('\n')
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csvData)}`

  // ── Pagination href builder ───────────────────────────────
  function pageHref(p: number) {
    const ps = new URLSearchParams({
      page: String(p),
      ...(filterProvider && { provider: filterProvider }),
      ...(filterSource && { source: filterSource }),
      ...(filterQuery && { q: filterQuery }),
    })
    return `/sales?${ps.toString()}`
  }

  function filterHref(overrides: Record<string, string>) {
    const ps = new URLSearchParams({
      page: '1',
      ...(filterProvider && { provider: filterProvider }),
      ...(filterSource && { source: filterSource }),
      ...(filterQuery && { q: filterQuery }),
      ...overrides,
    })
    return `/sales?${ps.toString()}`
  }


  const firstSeenEmail = new Set<string>();
  const isReturning = new Map<string, boolean>();
  [...rows].reverse().forEach((c) => {    if (!c.customer_email) return;
    isReturning.set(c.id, firstSeenEmail.has(c.customer_email));
    firstSeenEmail.add(c.customer_email);  });

          const { plan, usage, isOverLimit } = await getUsage(user.id)
  
      if (isOverLimit) {
      return (
        <AppShell>
          <UpgradeWall isOverLimit={isOverLimit} usage={usage} plan={plan} />
        </AppShell>
      )
    }



  return (
    <AppShell>
      <div className="p-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/revenue" className="text-body-sm text-muted hover:text-ink transition-colors">
                Revenue
              </Link>
              <span className="text-muted">/</span>
              <span className="text-body-sm text-ink font-medium">All Sales</span>
            </div>
            <h1 className="text-heading-lg text-ink">
              Sales
              <span className="text-body-sm text-muted font-normal ml-2">
                {formatNumber(totalCount)} total
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <a href={csvHref} download="sales.csv" className="btn-secondary text-body-sm py-2">
              ↓ Export CSV
            </a>
          </div>
        </div>

        {/* Summary strip */}
        <div className="card mb-5 grid grid-cols-3 divide-x divide-line">
          <div className="p-4">
            <div className="text-body-sm text-muted mb-1">Total Revenue</div>
            <div className="text-xl font-bold text-ink tabular">{formatMoneyFull(totalRevenue)}</div>
          </div>
          <div className="p-4">
            <div className="text-body-sm text-muted mb-1">Total Sales</div>
            <div className="text-xl font-bold text-ink tabular">{formatNumber(totalCount)}</div>
          </div>
          <div className="p-4">
            <div className="text-body-sm text-muted mb-1">Avg Order</div>
            <div className="text-xl font-bold text-ink tabular">
              {totalCount > 0 ? formatMoneyFull(totalRevenue / totalCount) : '—'}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {/* Search by email */}
          <form method="GET" action="/sales" className="flex-1 min-w-[200px] max-w-xs">
            <input
              name="q"
              defaultValue={filterQuery ?? ''}
              placeholder="Search by email..."
              className="w-full border border-line focus:border-primary focus:ring-2 focus:ring-primary-tint rounded-xl px-3.5 py-2 text-body-sm outline-none transition-all bg-surface"
            />
            {filterProvider && <input type="hidden" name="provider" value={filterProvider} />}
            {filterSource && <input type="hidden" name="source" value={filterSource} />}
          </form>

          {/* Provider filter */}
          <div className="flex gap-1">
            <Link
              href={filterHref({ provider: '' })}
              className={`px-3 py-2 rounded-xl text-body-sm font-medium transition-all ${
                !filterProvider ? 'bg-primary text-white' : 'bg-surface border border-line text-body hover:border-strong'
              }`}
            >
              All
            </Link>
            {providers.map(p => {
              const meta = PROVIDER_META[p] ?? { name: p, icon: '◈' }
              return (
                <Link
                  key={p}
                  href={filterHref({ provider: p })}
                  className={`px-3 py-2 rounded-xl text-body-sm font-medium transition-all flex items-center gap-1.5 ${
                    filterProvider === p ? 'bg-primary text-white' : 'bg-surface border border-line text-body hover:border-strong'
                  }`}
                >
                  <span className="w-3 h-3"> {meta.icon} </span> {meta.name}
                </Link>
              )
            })}
          </div>

          {/* Active filters */}
          {(filterQuery || filterSource) && (
            <Link href="/revenue/sales" className="text-body-sm text-muted hover:text-ink underline transition-colors">
              Clear filters
            </Link>
          )}
        </div>

        {/* Empty state */}
        {rows.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="text-heading-sm text-ink mb-2">No sales found</h3>
            <p className="text-body-sm text-muted">
              {filterQuery || filterProvider
                ? 'Try clearing your filters.'
                : 'Sales appear here once your payment webhook fires.'}
            </p>
          </div>
        ) : (
          <>
            {/* Table */}
            
              <div className="bg-white rounded-xl pt-4 border border-separate">
                <div
                  className={`hidden ${GRID_COLS} px-4 text-sm font-medium text-muted normal-case tracking-wide border-b pb-4`}
                >
                  <div>Customer</div>
                  <div>Journey</div>
                  <div>Provider</div>
                  <div>Amount</div>
                  <div>Converted</div>
                  <div className="text-right">When</div>
                </div>
                {rows.map((conv) => {
                  const providerMeta = PROVIDER_META[conv.provider] ?? {
                    name: conv.provider,
                    icon: "◈",
                  };
                  const post = Array.isArray(conv.posts)
                    ? conv.posts[0]
                    : conv.posts;
                  const firstSrc = metaFor(conv.first_source ?? conv.source);
                  const finalSrc = metaFor(conv.source);
                  const sameSource =
                    (conv.first_source ?? conv.source) ===
                    (conv.source ?? null);
                  const returning = isReturning.get(conv.id) ?? false;
                  const convertLabel = timeToConvert(
                    conv.first_seen_at,
                    conv.received_at,
                  );

                  return (
                    <div
                      key={conv.id}
                      className={`p-4 border-b flex flex-wrap items-center gap-4 hover:bg-surface-muted ${GRID_COLS}`}
                    >
                      {/* Customer + device row — links to the full journey page */}
                      <Link
                        href={`/sales/customers/${encodeURIComponent(
                          conv.customer_email ?? "",
                        )}`}
                        className="flex items-center gap-3 group"
                      >
                        <div className="w-11 h-11 rounded-full bg-surface-muted flex items-center justify-center text-sm font-bold text-body flex-shrink-0">
                          <img
                            src={avatarUrl(conv.customer_email ?? conv.id)}
                            alt={conv.customer_email}
                            width={40}
                            height={40}
                            className="w-11 h-11 rounded-full bg-surface-muted"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-body-sm font-semibold text-ink truncate group-hover:text-primary group-hover:underline transition-colors">
                              {maskEmail(conv.customer_email)}
                            </span>
                            <span
                              className={
                                returning
                                  ? "badge-success"
                                  : "badge-primary-tint"
                              }
                            >
                              {returning ? "Returning" : "New"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[13px] text-muted normal-case font-normal mt-0.5 flex-wrap">
                            {conv.country && (
                              <span>{countryDisplay(conv.country)}</span>
                            )}
                            {conv.device && (
                              <span className="inline-flex items-center gap-1">
                                {DEVICE_ICON[conv.device] ?? (
                                  <Monitor className="h-3.5 w-3.5" />
                                )}{" "}
                                {conv.device}
                              </span>
                            )}
                            {conv.os && (
                              <span
                                className="inline-flex items-center gap-1"
                                title={OS_LABEL[conv.os] ?? conv.os}
                              >
                                {OS_ICON[conv.os] ?? null}{" "}
                                {OS_LABEL[conv.os] ?? conv.os}
                              </span>
                            )}
                            {conv.browser && (
                              <span className="inline-flex items-center gap-1">
                                {BROWSER_ICON[conv.browser] ?? null}{" "}
                                {BROWSER_LABEL[conv.browser] ?? conv.browser}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>

                      {/* Journey: where they first landed → where they actually
                          bought — this pair is SourceTruth's own differentiator
                          on top of the DataFast-style fields. Collapses to a
                          single badge when the two sources are the same. */}
                      <div>
                        <div className="flex text-muted items-center gap-1 flex-wrap">
                          <SourceBadge
                            fontSize={13}
                            size={18}
                            meta={firstSrc}
                          />
                          {!sameSource && (
                            <>
                              <span className="text-muted text-[12px]">→</span>
                              <SourceBadge
                                fontSize={13}
                                size={18}
                                meta={finalSrc}
                              />
                            </>
                          )}
                        </div>
                        {/* <div className="text-[12px] text-muted normal-case font-normal mt-1">
                          {sameSource ? 'Landed & purchased here' : 'Landed → purchased'}
                        </div> */}
                        {post?.content && (
                          <p
                            className="text-[11px] text-success font-medium truncate max-w-[180px] mt-1"
                            title={post.content}
                          >
                            {post.content.slice(0, 40)}
                            {post.content.length > 40 ? "…" : ""}
                          </p>
                        )}
                      </div>

                      {/* Provider + product */}
                      <div className="text-body-sm text-body">
                        <div className="flex items-center gap-1.5 mb-3">
                          <span className="w-3.5 h-3.5">
                            {" "}
                            {providerMeta.icon}
                          </span>
                          {providerMeta.name}
                        </div>
                        <div className="text-caption text-blue-400 normal-case font-normal mt-0.5">
                          {conv.product_name ?? "—"}
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-body-sm font-bold text-success tabular">
                        +{formatMoney(conv.amount_cents)}
                      </div>

                      {/* Time to convert */}
                      <div className="text-body-sm text-body">
                        {convertLabel ?? <span className="text-muted">—</span>}
                      </div>

                      {/* When */}
                      <div className="text-[13px] text-muted normal-case font-normal text-right">
                        {timeAgo(conv.received_at)}
                      </div>
                    </div>
                  );
                })}
              </div>
            

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-body-sm text-muted">
                  Showing {from + 1}–{Math.min(to + 1, totalCount)} of {formatNumber(totalCount)} sales
                </p>
                <div className="flex items-center gap-1">
                  {/* Prev */}
                  {page > 1 ? (
                    <Link href={pageHref(page - 1)}
                      className="px-3 py-2 rounded-xl border border-line text-body-sm text-body hover:border-strong hover:text-ink transition-all">
                      ← Prev
                    </Link>
                  ) : (
                    <span className="px-3 py-2 rounded-xl border border-line text-body-sm text-muted opacity-40 cursor-not-allowed">
                      ← Prev
                    </span>
                  )}

                  {/* Page numbers */}
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 7) {
                      pageNum = i + 1
                    } else if (page <= 4) {
                      pageNum = i + 1
                    } else if (page >= totalPages - 3) {
                      pageNum = totalPages - 6 + i
                    } else {
                      pageNum = page - 3 + i
                    }
                    return (
                      <Link key={pageNum} href={pageHref(pageNum)}
                        className={`px-3 py-2 rounded-xl text-body-sm font-medium transition-all ${
                          pageNum === page
                            ? 'bg-primary text-white'
                            : 'border border-line text-body hover:border-strong hover:text-ink'
                        }`}>
                        {pageNum}
                      </Link>
                    )
                  })}

                  {/* Next */}
                  {page < totalPages ? (
                    <Link href={pageHref(page + 1)}
                      className="px-3 py-2 rounded-xl border border-line text-body-sm text-body hover:border-strong hover:text-ink transition-all">
                      Next →
                    </Link>
                  ) : (
                    <span className="px-3 py-2 rounded-xl border border-line text-body-sm text-muted opacity-40 cursor-not-allowed">
                      Next →
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}