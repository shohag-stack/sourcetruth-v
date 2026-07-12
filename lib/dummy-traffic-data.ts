// lib/dummy-traffic-data.ts

export interface TrafficStat {
  label: string
  value: string
  trend: string
  positive: boolean
}

export interface MapPin {
  id: string
  country: string
  flag: string
  x: number // percentage from left
  y: number // percentage from top
  count: number
}

export interface RankedRow {
  label: string
  value: string | number
  pct: number
  flag?: string
}

// ─────────────────────────────────────────────────────────────
// Overview Stats
// ─────────────────────────────────────────────────────────────

export const TRAFFIC_STATS: TrafficStat[] = [
  {
    label: 'Total Visitors',
    value: '24,861',
    trend: '18.4%',
    positive: true,
  },
  {
    label: 'Unique Visitors',
    value: '18,294',
    trend: '12.1%',
    positive: true,
  },
  {
    label: 'Avg. Session',
    value: '3m 42s',
    trend: '7.6%',
    positive: true,
  },
  {
    label: 'Bounce Rate',
    value: '34.8%',
    trend: '2.3%',
    positive: false,
  },
]

// ─────────────────────────────────────────────────────────────
// World Map Pins
// x/y are percentages inside the map container
// ─────────────────────────────────────────────────────────────

export const MAP_PINS: MapPin[] = [
  {
    id: 'us',
    country: 'United States',
    flag: '🇺🇸',
    x: 25,
    y: 38,
    count: 4,
  },
  {
    id: 'ca',
    country: 'Canada',
    flag: '🇨🇦',
    x: 24,
    y: 25,
    count: 2,
  },
  {
    id: 'uk',
    country: 'United Kingdom',
    flag: '🇬🇧',
    x: 48,
    y: 28,
    count: 3,
  },
  {
    id: 'de',
    country: 'Germany',
    flag: '🇩🇪',
    x: 53,
    y: 31,
    count: 2,
  },
  {
    id: 'fr',
    country: 'France',
    flag: '🇫🇷',
    x: 50,
    y: 34,
    count: 1,
  },
  {
    id: 'bd',
    country: 'Bangladesh',
    flag: '🇧🇩',
    x: 69,
    y: 49,
    count: 5,
  },
  {
    id: 'in',
    country: 'India',
    flag: '🇮🇳',
    x: 66,
    y: 52,
    count: 4,
  },
  {
    id: 'au',
    country: 'Australia',
    flag: '🇦🇺',
    x: 84,
    y: 76,
    count: 2,
  },
]

// ─────────────────────────────────────────────────────────────
// Top Pages
// ─────────────────────────────────────────────────────────────

export const TOP_PAGES: RankedRow[] = [
  {
    label: '/pricing',
    value: '6,420',
    pct: 100,
  },
  {
    label: '/templates/victio',
    value: '5,180',
    pct: 81,
  },
  {
    label: '/blog/design-pricing',
    value: '4,320',
    pct: 67,
  },
  {
    label: '/blog',
    value: '3,180',
    pct: 50,
  },
  {
    label: '/',
    value: '2,910',
    pct: 45,
  },
]

// ─────────────────────────────────────────────────────────────
// Top Locations
// ─────────────────────────────────────────────────────────────

export const TOP_LOCATIONS: RankedRow[] = [
  {
    flag: '🇺🇸',
    label: 'United States',
    value: '7,890',
    pct: 100,
  },
  {
    flag: '🇬🇧',
    label: 'United Kingdom',
    value: '4,180',
    pct: 53,
  },
  {
    flag: '🇧🇩',
    label: 'Bangladesh',
    value: '3,940',
    pct: 50,
  },
  {
    flag: '🇮🇳',
    label: 'India',
    value: '2,980',
    pct: 38,
  },
  {
    flag: '🇩🇪',
    label: 'Germany',
    value: '1,860',
    pct: 24,
  },
]

// ─────────────────────────────────────────────────────────────
// Operating Systems
// ─────────────────────────────────────────────────────────────

export const TOP_OS: RankedRow[] = [
  {
    label: 'macOS',
    value: '8,220',
    pct: 42,
  },
  {
    label: 'Windows',
    value: '6,950',
    pct: 36,
  },
  {
    label: 'iOS',
    value: '2,980',
    pct: 15,
  },
  {
    label: 'Android',
    value: '1,820',
    pct: 9,
  },
  {
    label: 'Linux',
    value: '680',
    pct: 3,
  },
]

// ─────────────────────────────────────────────────────────────
// Browsers
// ─────────────────────────────────────────────────────────────

export const TOP_BROWSERS: RankedRow[] = [
  {
    label: 'Chrome',
    value: '12,460',
    pct: 62,
  },
  {
    label: 'Safari',
    value: '4,620',
    pct: 23,
  },
  {
    label: 'Edge',
    value: '1,920',
    pct: 10,
  },
  {
    label: 'Firefox',
    value: '860',
    pct: 4,
  },
  {
    label: 'Brave',
    value: '420',
    pct: 2,
  },
]