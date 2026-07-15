// app/analytics/traffic/loading.tsx

import { AppShell } from "@/components/layout/AppShell";

function SkeletonCard() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="h-4 w-24 bg-surface-muted rounded mb-3" />
      <div className="h-8 w-20 bg-surface-muted rounded mb-2" />
      <div className="h-3 w-32 bg-surface-muted rounded" />
    </div>
  );
}

function SkeletonRankedList() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="h-5 w-32 bg-surface-muted rounded mb-5" />

      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between"
          >
            <div className="h-4 w-32 bg-surface-muted rounded" />
            <div className="h-4 w-14 bg-surface-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <AppShell>
      <div className="p-8">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between flex-wrap gap-4 animate-pulse">
          <div>
            <div className="h-8 w-44 bg-surface-muted rounded mb-2" />
            <div className="h-4 w-72 bg-surface-muted rounded" />
          </div>

          <div className="flex gap-1 bg-surface-muted p-1 rounded-xl border border-line">
            <div className="h-9 w-24 rounded-lg bg-background" />
            <div className="h-9 w-24 rounded-lg bg-surface" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>

        {/* Top panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <SkeletonRankedList />
          <SkeletonRankedList />
        </div>

        {/* Bottom panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SkeletonRankedList />
          <SkeletonRankedList />
          <SkeletonRankedList />
        </div>

      </div>
    </AppShell>
  );
}