"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function ActiveFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();  // ← read from URL directly

  const FILTER_LABELS: Record<string, string> = {
    country: "Country",
    device: "Device",
    browser: "Browser",
    os: "OS",
    path: "Page",
    referrer: "Referrer",
  };

  // Only show filters that are actually set in the URL
  const activeFilters = Array.from(searchParams.entries()).filter(
    ([key]) => key in FILTER_LABELS
  );

  if (activeFilters.length === 0) return null;

  function removeFilter(key: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString())
    Object.keys(FILTER_LABELS).forEach((k) => params.delete(k));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap mb-5">
      <span className="text-body-sm text-muted">Filtered by:</span>
      {activeFilters.map(([key, value]) => (
        <button
          key={key}
          onClick={() => removeFilter(key)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-tint border border-primary/20 text-primary text-body-sm rounded-xl font-medium hover:bg-primary hover:text-white transition-all"
        >
          <span className="text-[11px] text-primary/60 uppercase tracking-wide">
            {FILTER_LABELS[key]}:
          </span>
          {value}
          <span className="ml-0.5 opacity-60">✕</span>
        </button>
      ))}
      <button
        onClick={clearAll}
        className="text-body-sm text-muted hover:text-ink transition-colors underline"
      >
        Clear all
      </button>
    </div>
  );
}