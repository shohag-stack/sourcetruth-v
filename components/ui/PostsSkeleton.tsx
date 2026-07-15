export default function PostsSkeleton() {
  return (
    <div className="p-8 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-8 w-52 rounded-lg bg-surface-muted mb-3" />
          <div className="h-4 w-44 rounded bg-surface-muted" />
        </div>

        <div className="h-10 w-28 rounded-xl bg-surface-muted" />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-10 w-28 rounded-xl bg-surface-muted"
          />
        ))}
      </div>

      {/* Posts */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card p-4 flex flex-col">

            {/* Top row */}
            <div className="flex justify-between items-center mb-4">
              <div className="h-6 w-28 rounded-full bg-surface-muted" />
              <div className="h-3 w-16 rounded bg-surface-muted" />
            </div>

            {/* Content */}
            <div className="space-y-2 mb-4">
              <div className="h-4 w-full rounded bg-surface-muted" />
              <div className="h-4 w-11/12 rounded bg-surface-muted" />
              <div className="h-4 w-3/4 rounded bg-surface-muted" />
            </div>

            <div className="border-t border-line -mx-4 mb-4" />

            {/* Revenue */}
            <div className="flex justify-between mb-4">
              <div className="h-7 w-28 rounded bg-surface-muted" />
              <div className="h-4 w-24 rounded bg-surface-muted" />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="text-center">
                  <div className="h-5 w-10 mx-auto rounded bg-surface-muted mb-2" />
                  <div className="h-3 w-12 mx-auto rounded bg-surface-muted" />
                </div>
              ))}
            </div>

            {/* Progress */}
            <div className="h-2 rounded-full bg-surface-muted mb-4" />

            {/* Buttons */}
            <div className="flex gap-2 mt-auto">
              <div className="h-8 flex-1 rounded-lg bg-surface-muted" />
              <div className="h-8 flex-1 rounded-lg bg-surface-muted" />
              <div className="h-8 w-28 rounded-lg bg-surface-muted" />
            </div>

            {/* Link */}
            <div className="mt-3 h-7 rounded-lg bg-surface-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}