// app/analytics/loading.tsx

import { AppShell } from "@/components/layout/AppShell";

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-surface-muted ${className}`} />;
}

export default function AnalyticsLoading() {
  return (
    <AppShell>
      <div className="p-8">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-4 w-80" />
          </div>

          <Skeleton className="h-11 w-48 rounded-xl" />
        </div>

        {/* Revenue Chart */}
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-5">
            <Skeleton className="h-6 w-64" />

            <div className="flex gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="w-2 h-2 rounded-full" />
                  <Skeleton className="h-4 w-14" />
                </div>
              ))}
            </div>
          </div>

          <Skeleton className="h-[320px] w-full rounded-2xl" />
        </div>

        {/* Channel Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5">

              <div className="flex items-center gap-3 mb-5">
                <Skeleton className="w-9 h-9 rounded-lg" />
                <Skeleton className="h-5 w-28" />
              </div>

              <Skeleton className="h-9 w-40 mb-2" />
              <Skeleton className="h-4 w-36 mb-5" />

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-line">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j}>
                    <Skeleton className="h-6 w-14 mb-2" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Top Posts Table */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-line">
            <Skeleton className="h-6 w-52" />
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-line">
                {Array.from({ length: 5 }).map((_, i) => (
                  <th key={i} className="px-5 py-3">
                    <Skeleton className="h-4 w-20" />
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {Array.from({ length: 8 }).map((_, row) => (
                <tr key={row} className="border-b border-line">
                  <td className="px-5 py-4">
                    <Skeleton className="h-4 w-64" />
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                  </td>

                  <td className="px-4 py-4 text-right">
                    <Skeleton className="h-4 w-10 ml-auto" />
                  </td>

                  <td className="px-4 py-4 text-right">
                    <Skeleton className="h-4 w-10 ml-auto" />
                  </td>

                  <td className="px-5 py-4 text-right">
                    <Skeleton className="h-4 w-20 ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </AppShell>
  );
}