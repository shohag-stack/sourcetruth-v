// app/settings/loading.tsx

import { AppShell } from "@/components/layout/AppShell";

function SkeletonLine({
  width,
  height = "h-4",
}: {
  width: string;
  height?: string;
}) {
  return <div className={`${height} ${width} bg-surface-muted rounded`} />;
}

function SkeletonInput() {
  return (
    <div className="space-y-2">
      <SkeletonLine width="w-24" />
      <div className="h-11 rounded-xl bg-surface-muted" />
    </div>
  );
}

function SkeletonSiteRow() {
  return (
    <tr className="border-b border-line">
      <td className="px-5 py-4">
        <SkeletonLine width="w-28" />
      </td>
      <td className="px-5 py-4">
        <SkeletonLine width="w-40" />
      </td>
      <td className="px-5 py-4">
        <SkeletonLine width="w-24" />
      </td>
      <td className="px-5 py-4">
        <div className="h-10 rounded-lg bg-surface-muted" />
      </td>
      <td className="px-5 py-4 text-right">
        <div className="ml-auto h-9 w-24 rounded-xl bg-surface-muted" />
      </td>
    </tr>
  );
}

export default function Loading() {
  return (
    <AppShell>
      <div className="p-8 max-w-5xl mx-auto animate-pulse">

        {/* Header */}
        <div className="mb-6">
          <SkeletonLine width="w-40" height="h-8" />
          <div className="mt-2">
            <SkeletonLine width="w-72" />
          </div>
        </div>

        {/* Current Plan */}
        <section className="card p-5 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <SkeletonLine width="w-24" />
              <div className="flex items-center gap-3 mt-3">
                <div className="h-8 w-20 rounded-full bg-surface-muted" />
                <SkeletonLine width="w-36" />
              </div>
            </div>

            <div className="h-10 w-28 rounded-xl bg-surface-muted" />
          </div>
        </section>

        {/* Sites */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <SkeletonLine width="w-24" height="h-6" />
              <div className="mt-2">
                <SkeletonLine width="w-72" />
              </div>
            </div>

            <div className="h-10 w-28 rounded-xl bg-surface-muted" />
          </div>

          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <th key={i} className="px-5 py-3">
                      <SkeletonLine width="w-16" />
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonSiteRow key={i} />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Profile */}
        <section className="card p-5 mb-8">
          <SkeletonLine width="w-24" height="h-6" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 mb-5">
            <SkeletonInput />
            <SkeletonInput />
          </div>

          <div className="h-10 w-36 rounded-xl bg-surface-muted" />
        </section>

        {/* Danger Zone */}
        <section className="card p-5">
          <SkeletonLine width="w-36" height="h-6" />
          <div className="mt-2">
            <SkeletonLine width="w-80" />
          </div>

          <div className="mt-5 h-10 w-40 rounded-xl bg-surface-muted" />
        </section>

      </div>
    </AppShell>
  );
}