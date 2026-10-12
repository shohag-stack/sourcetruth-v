// app/events/loading.tsx
import { AppShell } from "@/components/layout/AppShell";

export default function Loading() {
  return (
    <AppShell>
      <div className="p-8 animate-pulse">
        <div className="h-6 w-28 bg-surface-muted rounded mb-2" />
        <div className="h-4 w-56 bg-surface-muted rounded mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5">
              <div className="h-4 w-24 bg-surface-muted rounded mb-3" />
              <div className="h-6 w-16 bg-surface-muted rounded" />
            </div>
          ))}
        </div>
        <div className="card p-5 mb-5 h-56" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-5">
          <div className="card p-5 h-72" />
          <div className="card p-5 h-72" />
        </div>
      </div>
    </AppShell>
  );
}
