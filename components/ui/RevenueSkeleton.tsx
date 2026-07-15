export default function RevenueSkeleton() {
  return (
    <div className="p-8 animate-pulse">
      {/* Header */}
      <div className="mb-6">
        <div className="h-8 w-44 rounded-lg bg-surface-muted mb-3" />
        <div className="h-4 w-72 rounded bg-surface-muted" />
      </div>

      {/* Summary Cards */}
      <div className="card mb-6 grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-line">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-5">
            <div className="h-4 w-24 rounded bg-surface-muted mb-3" />
            <div className="h-8 w-28 rounded bg-surface-muted mb-2" />
            <div className="h-3 w-20 rounded bg-surface-muted" />
          </div>
        ))}
      </div>

      {/* Attribution Notice */}
      <div className="rounded-2xl bg-surface-muted h-20 mb-6" />

      {/* Table */}
      <div className="card overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <div className="h-6 w-36 rounded bg-surface-muted" />
          <div className="h-9 w-28 rounded-lg bg-surface-muted" />
        </div>

        {/* Column Headers */}
        <div className="grid grid-cols-7 gap-4 px-5 py-3 border-b border-line bg-surface-muted">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-4 rounded bg-surface" />
          ))}
        </div>

        {/* Rows */}
        {Array.from({ length: 8 }).map((_, row) => (
          <div
            key={row}
            className="grid grid-cols-7 gap-4 px-5 py-4 border-b border-line items-center"
          >
            {/* Customer */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-surface-muted" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-24 rounded bg-surface-muted" />
                <div className="h-3 w-14 rounded bg-surface-muted" />
              </div>
            </div>

            {/* Source Post */}
            <div className="h-4 w-full rounded bg-surface-muted" />

            {/* Channel */}
            <div className="h-6 w-20 rounded-full bg-surface-muted" />

            {/* Provider */}
            <div className="h-4 w-24 rounded bg-surface-muted" />

            {/* Product */}
            <div className="h-4 w-28 rounded bg-surface-muted" />

            {/* Amount */}
            <div className="h-5 w-20 rounded bg-surface-muted" />

            {/* Time */}
            <div className="h-4 w-14 rounded bg-surface-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}