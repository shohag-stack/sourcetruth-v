// app/events/page.tsx
// Custom events sent with SourceTruth.track() / data-st-event: counts, a
// configurable funnel, and a recent-events feed.
import { AppShell } from "@/components/layout/AppShell";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { RankedList } from "@/components/analytics/RankedList";
import { FunnelBuilder } from "@/components/analytics/FunnelBuilder";
import { getSince } from "@/lib/getSince";
import { timeAgo } from "@/lib/utils";
import { eventLabel, identityFor, stepLabel } from "@/lib/visitorIdentity";

type Range = "24h" | "7d" | "30d" | "90d" | "1y" | "all";

type EventRow = {
  session_id: string | null;
  name: string;
  path: string | null;
  props: Record<string, unknown> | null;
  created_at: string;
};

type PageviewRow = { session_id: string; path: string | null; visited_at: string };

// PostgREST caps unbounded selects (default 1000 rows) — page through, same as Visitors
const PAGE_SIZE = 1000;
async function fetchAllRows<T>(buildQuery: () => any, orderColumn: string): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery()
      .order(orderColumn, { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error(`[events] fetch error (${orderColumn}):`, error.message);
      break;
    }
    if (!data?.length) break;
    all.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break;
  }
  return all;
}

const RECENT_LIMIT = 50;

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: Range; event?: string; steps?: string }>;
}) {
  const params = await searchParams;
  const range: Range = params.range ?? "7d";
  const filterEvent = params.event ?? null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Same "first site" convention as the other analytics pages
  const { data: site } = await supabase
    .from("sites")
    .select("id, domain")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!site) {
    return (
      <AppShell>
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h2 className="text-heading-sm text-ink mb-2">No site connected yet</h2>
            <p className="text-body-sm text-muted mb-4">Add a site in Settings to start tracking events.</p>
            <Link href="/settings" className="btn-primary">
              Go to Settings →
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const siteId = site.id;
  const since = getSince(range);

  function buildEventsQuery() {
    let q = supabase.from("events").select("session_id, name, path, props, created_at").eq("site_id", siteId);
    if (since) q = q.gte("created_at", since.toISOString());
    return q;
  }
  function buildPageviewsQuery() {
    let q = supabase.from("pageviews").select("session_id, path, visited_at").eq("site_id", siteId);
    if (since) q = q.gte("visited_at", since.toISOString());
    return q;
  }

  const [allEvents, pageviews] = await Promise.all([
    fetchAllRows<EventRow>(buildEventsQuery, "created_at"),
    fetchAllRows<PageviewRow>(buildPageviewsQuery, "visited_at"),
  ]);

  // identify rows say who a session is; everything else is a real event
  const emailBySession = new Map<string, string>();
  const events: EventRow[] = [];
  for (const e of allEvents) {
    if (e.name === "identify") {
      const email = typeof e.props?.email === "string" ? e.props.email : null;
      if (e.session_id && email) emailBySession.set(e.session_id, email);
    } else {
      events.push(e);
    }
  }

  // ── Stats ─────────────────────────────────────────────────
  const countsByName = new Map<string, number>();
  const sessionsByName = new Map<string, Set<string>>();
  for (const e of events) {
    countsByName.set(e.name, (countsByName.get(e.name) ?? 0) + 1);
    if (e.session_id) {
      const set = sessionsByName.get(e.name) ?? new Set<string>();
      set.add(e.session_id);
      sessionsByName.set(e.name, set);
    }
  }
  const sessionsWithEvents = new Set(events.map((e) => e.session_id).filter(Boolean)).size;
  const identifiedPeople = new Set(emailBySession.values()).size;
  const eventNames = Array.from(countsByName.keys()).sort(
    (a, b) => (countsByName.get(b) ?? 0) - (countsByName.get(a) ?? 0),
  );

  const topEvents = eventNames.slice(0, 10).map((name) => ({
    label: eventLabel(name),
    value: countsByName.get(name) ?? 0,
    filterValue: name,
  }));

  // ── Funnel ────────────────────────────────────────────────
  // First time each session hit each step (event name or "page:/path")
  const firstHit = new Map<string, Map<string, number>>(); // step → session → ms
  function record(step: string, sessionId: string | null, at: string) {
    if (!sessionId) return;
    const bySession = firstHit.get(step) ?? new Map<string, number>();
    const t = new Date(at).getTime();
    if (!bySession.has(sessionId) || t < (bySession.get(sessionId) as number)) bySession.set(sessionId, t);
    firstHit.set(step, bySession);
  }
  for (const e of events) record(e.name, e.session_id, e.created_at);
  for (const p of pageviews) record(`page:${p.path ?? "/"}`, p.session_id, p.visited_at);

  // Pages offered as funnel steps: the most visited ones
  const pageCounts = new Map<string, number>();
  for (const p of pageviews) pageCounts.set(p.path ?? "/", (pageCounts.get(p.path ?? "/") ?? 0) + 1);
  const funnelPages = Array.from(pageCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([path]) => `page:${path}`);

  // Default funnel: the three most common events, in the order sessions usually do them
  function defaultSteps(): string[] {
    const top = eventNames.slice(0, 3);
    const before = (a: string, b: string) => {
      let ab = 0;
      let ba = 0;
      firstHit.get(a)?.forEach((ta, sid) => {
        const tb = firstHit.get(b)?.get(sid);
        if (tb === undefined) return;
        if (ta <= tb) ab++;
        else ba++;
      });
      return ba - ab;
    };
    return top.sort(before);
  }

  const steps = (params.steps ? params.steps.split(",").filter(Boolean) : defaultSteps()).slice(0, 5);

  // A session counts for step N only if it hit steps 1..N in order
  let candidates = new Map<string, number>(firstHit.get(steps[0] ?? "") ?? []);
  const funnel = steps.map((step, i) => {
    if (i > 0) {
      const next = new Map<string, number>();
      const hits = firstHit.get(step);
      candidates.forEach((prevTime, sid) => {
        const t = hits?.get(sid);
        if (t !== undefined && t >= prevTime) next.set(sid, t);
      });
      candidates = next;
    }
    return { step, sessions: candidates.size };
  });
  const funnelTop = funnel[0]?.sessions ?? 0;

  // ── Recent events ─────────────────────────────────────────
  const recent = events
    .filter((e) => !filterEvent || e.name === filterEvent)
    .slice(-RECENT_LIMIT)
    .reverse();

  const rangeText = range === "all" ? "All time" : `Last ${range}`;

  return (
    <AppShell>
      <div className="p-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-heading-lg text-ink mb-0.5">Events</h1>
            <p className="text-body-sm text-muted">
              {site.domain} · {rangeText} ·{" "}
              {events.length === 0 ? "No events yet" : `${events.length.toLocaleString()} events recorded`}
            </p>
          </div>
          <DateRangePicker />
        </div>

        {events.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-3xl mb-3">⚡</div>
            <h2 className="text-heading-sm text-ink mb-2">No events in this period</h2>
            <p className="text-body-sm text-muted mb-4 max-w-md mx-auto">
              Track clicks and form submits with a data attribute, or call the API from your code:
            </p>
            <pre className="inline-block text-left text-xs bg-surface-muted rounded-xl px-4 py-3 text-ink">
              {`<button data-st-event="signup_click">Sign up</button>\n\nSourceTruth.track("signup_click", { plan: "pro" })`}
            </pre>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              {[
                { label: "Total events", value: events.length.toLocaleString() },
                { label: "Visitors with events", value: sessionsWithEvents.toLocaleString() },
                { label: "Identified visitors", value: identifiedPeople.toLocaleString() },
                { label: "Top event", value: eventNames[0] ? eventLabel(eventNames[0]) : "—" },
              ].map((s) => (
                <div key={s.label} className="card p-5">
                  <div className="text-body-sm text-muted mb-1">{s.label}</div>
                  <div className="text-heading-lg text-ink truncate">{s.value}</div>
                </div>
              ))}
            </div>

            {/* Funnel */}
            <div className="card p-5 mb-5">
              <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                <div>
                  <h2 className="text-heading-sm text-ink">Funnel</h2>
                  <p className="text-body-sm text-muted">
                    Visitors who completed each step in order. Add pages or events to build your own.
                  </p>
                </div>
              </div>
              <Suspense fallback={null}>
                <FunnelBuilder steps={steps} eventNames={eventNames} pages={funnelPages} />
              </Suspense>

              {funnel.length > 0 && (
                <div className="mt-5 space-y-3">
                  {funnel.map((f, i) => {
                    const pct = funnelTop ? Math.round((f.sessions / funnelTop) * 100) : 0;
                    const prev = i > 0 ? funnel[i - 1].sessions : f.sessions;
                    const drop = prev - f.sessions;
                    return (
                      <div key={f.step}>
                        <div className="flex items-center justify-between text-body-sm mb-1">
                          <span className="font-medium text-ink">
                            {i + 1}. {stepLabel(f.step)}
                          </span>
                          <span className="text-muted">
                            <strong className="text-ink">{f.sessions}</strong> · {pct}%
                            {i > 0 && drop > 0 && <span className="ml-2 text-red-500">−{drop} dropped</span>}
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-surface-muted overflow-hidden">
                          <div className="h-full rounded-full gradient-brand" style={{ width: `${Math.max(pct, 1)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-5">
              {/* Top events — click to filter the feed */}
              <RankedList title="Top events" rows={topEvents} filterKey="event" />

              {/* Recent feed */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-heading-sm text-ink">
                    Recent events{filterEvent ? ` · ${eventLabel(filterEvent)}` : ""}
                  </h2>
                  {filterEvent && (
                    <Link
                      href={`/events?range=${range}${params.steps ? `&steps=${encodeURIComponent(params.steps)}` : ""}`}
                      className="text-body-sm text-muted hover:text-ink"
                    >
                      Clear filter ×
                    </Link>
                  )}
                </div>
                <div className="divide-y divide-line">
                  {recent.map((e, i) => {
                    const email = e.session_id ? emailBySession.get(e.session_id) : undefined;
                    const who = email ?? (e.session_id ? identityFor(e.session_id).name : "Unknown visitor");
                    const props = e.props
                      ? Object.entries(e.props)
                          .map(([k, v]) => `${k}: ${String(v)}`)
                          .join(" · ")
                      : "";
                    return (
                      <div key={`${e.session_id}-${e.created_at}-${i}`} className="flex items-center gap-3 py-2.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-line text-caption font-medium text-ink normal-case">
                          ⚡ {eventLabel(e.name)}
                        </span>
                        <span className="text-body-sm text-ink font-medium truncate max-w-[220px]">
                          {who}
                          {email && <span className="ml-1.5 badge-success">Identified</span>}
                        </span>
                        {props && <span className="text-caption text-muted normal-case truncate max-w-[200px]">{props}</span>}
                        <code className="ml-auto text-xs text-muted truncate max-w-[160px]">{e.path ?? "/"}</code>
                        <span className="text-caption text-muted normal-case w-16 text-right">{timeAgo(e.created_at)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
