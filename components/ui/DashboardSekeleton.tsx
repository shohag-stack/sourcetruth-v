export default function DashboardSkeleton() {
  return (
    <div className="p-8 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-8 w-72 rounded-lg bg-surface-muted mb-3" />
          <div className="h-4 w-56 rounded bg-surface-muted" />
        </div>

        <div className="h-10 w-28 rounded-xl bg-surface-muted" />
      </div>

      {/* Stats */}
      <div className="card mb-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 divide-y xl:divide-y-0 xl:divide-x divide-line">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-5">
            <div className="h-3 w-20 rounded bg-surface-muted mb-3" />
            <div className="h-8 w-24 rounded bg-surface-muted mb-2" />
            <div className="h-3 w-28 rounded bg-surface-muted" />
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="card p-5 mb-6">
        <div className="flex justify-between items-center mb-5">
          <div className="h-6 w-44 rounded bg-surface-muted" />

          <div className="flex gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-5 w-16 rounded bg-surface-muted" />
            ))}
          </div>
        </div>

        <div className="h-80 rounded-xl bg-surface-muted" />
      </div>

      {/* Best Posts */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="h-6 w-52 rounded bg-surface-muted" />
          <div className="h-4 w-16 rounded bg-surface-muted" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="card p-4">
              <div className="flex justify-between mb-4">
                <div className="flex gap-2">
                  <div className="h-6 w-20 rounded-full bg-surface-muted" />
                  <div className="h-6 w-24 rounded-full bg-surface-muted" />
                </div>

                <div className="flex gap-1">
                  <div className="w-5 h-5 rounded-full bg-surface-muted" />
                  <div className="w-5 h-5 rounded-full bg-surface-muted" />
                  <div className="w-5 h-5 rounded-full bg-surface-muted" />
                </div>
              </div>

              <div className="space-y-2 mb-5">
                <div className="h-4 w-full rounded bg-surface-muted" />
                <div className="h-4 w-4/5 rounded bg-surface-muted" />
              </div>

              <div className="border-t border-line -mx-4 mb-4" />

              <div className="flex justify-between mb-4">
                <div className="h-8 w-32 rounded bg-surface-muted" />
                <div className="h-4 w-24 rounded bg-surface-muted" />
              </div>

              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j}>
                    <div className="h-5 w-10 mx-auto rounded bg-surface-muted mb-2" />
                    <div className="h-3 w-12 mx-auto rounded bg-surface-muted" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, card) => (
          <div key={card} className="card p-5">
            <div className="flex justify-between items-center mb-5">
              <div className="h-6 w-44 rounded bg-surface-muted" />
              <div className="h-4 w-20 rounded bg-surface-muted" />
            </div>

            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, row) => (
                <div key={row} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-muted" />

                  <div className="flex-1">
                    <div className="h-4 w-32 rounded bg-surface-muted mb-2" />
                    <div className="h-3 w-20 rounded bg-surface-muted" />
                  </div>

                  <div className="h-5 w-16 rounded bg-surface-muted" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}