// lib/visitorIdentity.ts
// Shared by Realtime Visitors and the Events page so a session gets the same
// pseudonym everywhere.

// ── Deterministic, anonymized visitor identity ───────────────────
// Fallback for sessions that haven't converted — session_id is hashed
// into a friendly "Bold Falcon"-style pseudonym + avatar color, stable
// for the life of that session, same idea as Codespaces/PR preview
// names. Sessions that HAVE converted show their real customerEmail
// instead (see `displayName` below).
const ADJECTIVES = [
  "Bold",
  "Wise",
  "Quick",
  "Bright",
  "Calm",
  "Swift",
  "Sharp",
  "Brave",
  "Sly",
  "Kind",
  "Loud",
  "Cool",
];
const ANIMALS = [
  "Falcon",
  "Dolphin",
  "Raven",
  "Koala",
  "Otter",
  "Panther",
  "Fox",
  "Owl",
  "Wolf",
  "Tiger",
  "Hawk",
  "Bear",
];
const AVATAR_COLORS = [
  "#F87171",
  "#FBBF24",
  "#34D399",
  "#60A5FA",
  "#A78BFA",
  "#F472B6",
  "#FB923C",
  "#4ADE80",
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function identityFor(sessionId: string) {
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

// "login_google_click" → "Login google click"
export function eventLabel(name: string): string {
  const text = name.replace(/[_\-.:]+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Funnel steps are an event name ("login_success") or a page ("page:/login")
export function stepLabel(step: string): string {
  return step.startsWith("page:") ? `Visited ${step.slice(5)}` : eventLabel(step);
}
