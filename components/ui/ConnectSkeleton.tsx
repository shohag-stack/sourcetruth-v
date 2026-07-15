export default function ConnectSkeleton() {
  return (
    <div className="p-8 animate-pulse">
      {/* Header */}
      <div className="mb-8">
        <div className="h-8 w-48 rounded-lg bg-surface-muted mb-3" />
        <div className="h-4 w-80 rounded bg-surface-muted" />
      </div>

      {/* Payment Providers */}
      <section className="mb-10">
        <div className="h-4 w-40 rounded bg-surface-muted mb-5" />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="card p-5 flex flex-col items-center"
            >
              {/* icon */}
              <div className="w-12 h-12 rounded-xl bg-surface-muted mb-4" />

              {/* provider */}
              <div className="h-4 w-24 rounded bg-surface-muted mb-2" />

              {/* description */}
              <div className="h-3 w-28 rounded bg-surface-muted mb-5" />

              {/* button */}
              <div className="h-9 w-24 rounded-xl bg-surface-muted" />
            </div>
          ))}
        </div>
      </section>

      {/* Tracking Script */}
      <section>
        <div className="h-4 w-36 rounded bg-surface-muted mb-5" />

        <div className="card p-5">
          {/* top row */}
          <div className="flex justify-between items-center mb-5">
            <div className="h-5 w-36 rounded bg-surface-muted" />
            <div className="h-6 w-20 rounded-full bg-surface-muted" />
          </div>

          {/* description */}
          <div className="space-y-2 mb-5">
            <div className="h-4 w-full rounded bg-surface-muted" />
            <div className="h-4 w-4/5 rounded bg-surface-muted" />
          </div>

          {/* code block */}
          <div className="relative rounded-xl bg-surface-muted p-4">
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-surface" />
              <div className="h-3 w-5/6 rounded bg-surface" />
              <div className="h-3 w-2/3 rounded bg-surface" />
            </div>

            <div className="absolute top-3 right-3 h-8 w-16 rounded-lg bg-surface" />
          </div>
        </div>
      </section>
    </div>
  );
}