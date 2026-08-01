// components/analytics/RealtimeVisitors.tsx
"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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

// Full country name from a 2-letter code, using the browser's built-in
// locale data — no lookup table or new dependency needed. Falls back to
// nothing if Intl.DisplayNames isn't available (very old browsers).
const regionNames =
  typeof Intl !== "undefined" && "DisplayNames" in Intl
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

function countryName(code: string | null): string | null {
  if (!code || !regionNames) return null;
  try {
    return regionNames.of(code.toUpperCase()) ?? null;
  } catch {
    return null;
  }
}

type Visitor = {
  id: string;
  sessionId: string;
  path: string | null;
  country: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  referrer: string | null;
  visitedAt: string;
  isNewVisitor: boolean;
  pageviewsThisSession: number;
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
  // Ticks every second purely so "time on page" reads live between data
  // polls — doesn't trigger any refetch, just a re-render for the math.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  function elapsedOnPage(visitedAt: string): string {
    const seconds = Math.max(0, Math.round((now - new Date(visitedAt).getTime()) / 1000));
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  }

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
        The latest pages viewed on your site, live.
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
        <div className="relative">
          <AnimatePresence initial={false} mode="popLayout">
            {visitors.map((v) => {
              const identity = identityFor(v.sessionId);
              const source = metaFor(sourceFromReferrer(v.referrer));

              return (
                <motion.div
                  key={v.id}
                  layout
                  initial={{ opacity: 0, y: -16, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className="flex items-center gap-3 py-3 flex-wrap border-b border-line last:border-0 overflow-hidden"
                >
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

                  <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-body-sm font-semibold text-ink truncate">{identity.name}</span>
                      {v.isNewVisitor && <span className="badge-primary-tint">New</span>}
                      <span className="flex items-center gap-1 text-caption font-medium text-success normal-case flex-shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Live
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-caption text-muted normal-case font-normal flex-wrap">
                      <span>{DEVICE_ICON[v.device ?? ""] ?? "●"} {v.device ?? "unknown"}</span>
                      {v.os && <span>{OS_LABEL[v.os] ?? v.os}</span>}
                      {v.browser && <span>{BROWSER_LABEL[v.browser] ?? v.browser}</span>}
                      <span>⏱ {elapsedOnPage(v.visitedAt)} on page</span>
                      {v.pageviewsThisSession > 1 && (
                        <span>👣 {v.pageviewsThisSession} pages this session</span>
                      )}
                    </div>
                  </div>

                  <code className="text-xs font-bold text-muted truncate">
                      {v.path ?? "/"}
                    </code>

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
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}