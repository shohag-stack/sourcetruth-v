// components/analytics/FunnelBuilder.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { eventLabel, stepLabel } from "@/lib/visitorIdentity";

const MAX_STEPS = 5;

export function FunnelBuilder({
  steps,
  eventNames,
  pages,
}: {
  steps: string[];
  eventNames: string[];
  pages: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setSteps(next: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.length) params.set("steps", next.join(","));
    else params.delete("steps");
    router.push(`${pathname}?${params.toString()}`);
  }

  const available = (list: string[]) => list.filter((s) => !steps.includes(s));

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {steps.map((step, i) => (
        <span key={step} className="flex items-center gap-2">
          {i > 0 && <span className="text-muted">→</span>}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-body-sm font-medium text-ink">
            {stepLabel(step)}
            <button
              type="button"
              onClick={() => setSteps(steps.filter((s) => s !== step))}
              className="text-muted hover:text-ink"
              aria-label={`Remove ${stepLabel(step)}`}
            >
              ×
            </button>
          </span>
        </span>
      ))}

      {steps.length < MAX_STEPS && (
        <select
          value=""
          onChange={(e) => e.target.value && setSteps([...steps, e.target.value])}
          className="rounded-full border border-dashed border-line bg-surface px-3 py-1 text-body-sm text-muted cursor-pointer"
          aria-label="Add funnel step"
        >
          <option value="">+ Add step</option>
          {available(eventNames).length > 0 && (
            <optgroup label="Events">
              {available(eventNames).map((name) => (
                <option key={name} value={name}>
                  {eventLabel(name)}
                </option>
              ))}
            </optgroup>
          )}
          {available(pages).length > 0 && (
            <optgroup label="Pages">
              {available(pages).map((p) => (
                <option key={p} value={p}>
                  Visited {p.slice(5)}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      )}
    </div>
  );
}
