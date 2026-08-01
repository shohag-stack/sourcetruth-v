// components/analytics/RealtimeVisitors.tsx
"use client";

import { useEffect, useState } from "react";
import { countryFlag } from "@/lib/countryFlag";
import { metaFor } from "@/lib/metaFor";

// ── Deterministic, anonymized visitor identity ───────────────────
// We don't have (and shouldn't show) a real name — session_id is
// hashed into a friendly "Bold Falcon"-style pseudonym + avatar color,
// stable for the life of that session, same idea as Codespaces/PR
// preview names.
const ADJECTIVES = [
  "Bold", "Wise", "Quick", "Bright", "Calm", "Swift",
  "Sharp", "Brave", "Sly", "Kind", "Loud", "Cool",
];
const ANIMALS = [
  "Falcon", "Dolphin", "Raven", "Koala", "Otter", "Panther",
  "Fox", "Owl", "Wolf", "Tiger", "Hawk", "Bear",
];
const AVATAR_COLORS = [
  "#F87171", "#FBBF24", "#34D399", "#60A5FA",
  "#A78BFA", "#F472B6", "#FB923C", "#4ADE80",
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function identityFor(sessionId: string) {
  const hash = hashString(sessionId);
  const adjective = ADJECTIVES[hash % ADJECTIVES.length];
  const animal = ANIMALS[Math.floor(hash / ADJECTIVES.length) % ANIMALS.length];
  const color = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  return {
    name: `${adjective} ${animal}`,
    initials: `${adjective[0]}${animal[0]}`,
    color,
  };
}

const DEVICE_ICON: Record<string, string> = { desktop: "🖥️", mobile: "📱", tablet: "📱" };
const OS_LABEL: Record<string, string> = { mac: "Mac OS", windows: "Windows", ios: "iOS", android: "Android", other: "Unknown OS" };
const BROWSER_LABEL: Record<string, string> = { chrome: "Chrome", safari: "Safari", firefox: "Firefox", other: "Unknown browser" };

type Visitor = {
  sessionId: string;
  path: string | null;
  country: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  referrer: string | null;
  visitedAt: string;
  isNewVisitor: boolean;
};

function sourceFromReferrer(referrer: string | null): string {
  if (!referrer) return "direct";
  try {
    return new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return "direct";
  }
}

const POLL_MS = 10_000;

export function RealtimeVisitors() {
  const [visitors, setVisitors] = useState<Visitor[] | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/realtime-visitors", { cache: "no-store" });
        if (!res.ok) throw new Error("request failed");
        const data = await res.json();
        if (!cancelled) {
          setVisitors(data.visitors ?? []);
          setErrored(false);
        }
      } catch {
        if (!cancelled) setErrored(true);
      }
    }

    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="card p-5 mb-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-primary">☰</span>
        <h2 className="text-heading-sm text-ink">Realtime Visitors</h2>
      </div>
      <p className="text-body-sm text-muted mb-4">
        Follow active sessions as they move through your site, from landing page to pricing page.
      </p>

      {visitors === null ? (
        <p className="text-body-sm text-muted py-6 text-center">Loading…</p>
      ) : errored ? (
        <p className="text-body-sm text-muted py-6 text-center">
          Couldn't load live visitors — retrying…
        </p>
      ) : visitors.length === 0 ? (
        <p className="text-body-sm text-muted py-6 text-center">No one's on your site right now.</p>
      ) : (
        <div className="divide-y divide-line">
          {visitors.map((v) => {
            const identity = identityFor(v.sessionId);
            const source = metaFor(sourceFromReferrer(v.referrer));
            const deviceTitle = [
              v.os && (OS_LABEL[v.os] ?? v.os),
              v.browser && (BROWSER_LABEL[v.browser] ?? v.browser),
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <div key={v.sessionId} className="flex items-center gap-3 py-3 flex-wrap">
                <div className="relative flex-shrink-0">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: identity.color }}
                  >
                    {identity.initials}
                  </div>
                  {v.country && (
                    <span className="absolute -bottom-1 -right-1 text-[11px] leading-none">
                      {countryFlag(v.country)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-body-sm font-semibold text-ink truncate">{identity.name}</span>
                  {v.isNewVisitor && <span className="badge-primary-tint">New</span>}
                  <span className="flex items-center gap-1 text-caption font-medium text-success normal-case flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Live
                  </span>
                  <span className="text-muted flex-shrink-0" title={deviceTitle || undefined}>
                    {DEVICE_ICON[v.device ?? ""] ?? "●"}
                  </span>
                  <code className="text-caption text-muted normal-case font-mono truncate">
                    {v.path ?? "/"}
                  </code>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line text-body-sm font-medium text-ink flex-shrink-0">
                  {source.iconType === "favicon" ? (
                    <img src={source.iconUrl} alt="" className="h-3.5 w-3.5" />
                  ) : source.iconType === "direct" ? (
                    <span>{source.icon}</span>
                  ) : (
                    <span className="text-[10px] font-bold">{source.initials}</span>
                  )}
                  {source.name}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}