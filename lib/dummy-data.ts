import { DbPost } from "@/types/posts"
// lib/dummy-data.ts

// types/post.ts
export type PostStatus = 'ready' | 'posted' | 'draft' | 'archived'
export type SocialChannel = 'linkedin' | 'twitter' | 'facebook' | 'instagram' | 'threads' | 'bluesky'
export type PaymentProvider = 'lemon_squeezy' | 'stripe' | 'paddle' | 'gumroad' | 'woocommerce'

export interface ConnectedChannel {
  id: string
  platform: SocialChannel
  handle: string
  avatar?: string
  connected: boolean
  followers: number
  postsThisMonth: number
}

export interface ConnectedPayment {
  id: string
  provider: PaymentProvider
  accountName: string
  connected: boolean
  totalRevenue: number
  currency: string
}

export interface RevenueEvent {
  id: string
  customerEmail: string
  amount: number
  provider: PaymentProvider
  product: string
  postId: string
  postPreview: string
  channel: SocialChannel
  country: string
  createdAt: string
}

export interface ChannelStat {
  platform: SocialChannel
  posts: number
  clicks: number
  conversions: number
  revenue: number
  avgRevenuePerPost: number
  trend: number
}

export interface DailyRevenue {
  date: string
  linkedin: number
  twitter: number
  facebook: number
  instagram: number
  threads: number
  bluesky: number
  total: number
}

// ─── Connected Channels ───────────────────────────────────────────────────────
export const DUMMY_CHANNELS: ConnectedChannel[] = [
  { id: 'ch1', platform: 'linkedin', handle: 'raysa-studio', connected: true, followers: 4820, postsThisMonth: 12 },
  { id: 'ch2', platform: 'twitter', handle: '@raysadesigns', connected: true, followers: 2310, postsThisMonth: 34 },
  { id: 'ch3', platform: 'facebook', handle: 'Raysa Studio', connected: true, followers: 1240, postsThisMonth: 8 },
  { id: 'ch4', platform: 'instagram', handle: '@raysa.studio', connected: true, followers: 6750, postsThisMonth: 18 },
  { id: 'ch5', platform: 'threads', handle: '@raysa.studio', connected: false, followers: 0, postsThisMonth: 0 },
  { id: 'ch6', platform: 'bluesky', handle: 'raysa.bsky.social', connected: false, followers: 0, postsThisMonth: 0 },
]

// ─── Connected Payments ───────────────────────────────────────────────────────
export const DUMMY_PAYMENTS: ConnectedPayment[] = [
  { id: 'pay1', provider: 'lemon_squeezy', accountName: 'Raysa Studio Store', connected: true, totalRevenue: 9840, currency: 'USD' },
  { id: 'pay2', provider: 'stripe', accountName: 'raysa@studio.io', connected: true, totalRevenue: 4290, currency: 'USD' },
  { id: 'pay3', provider: 'gumroad', accountName: 'Raysa Studio', connected: true, totalRevenue: 1640, currency: 'USD' },
  { id: 'pay4', provider: 'paddle', accountName: '', connected: false, totalRevenue: 0, currency: 'USD' },
  { id: 'pay5', provider: 'woocommerce', accountName: '', connected: false, totalRevenue: 0, currency: 'USD' },
]

// ─── Social Posts ─────────────────────────────────────────────────────────────
export const DUMMY_POSTS: DbPost[] = [
  {
    id: "p1",
    content:
      "After 3 years of freelancing, here's what I learned about pricing your design work...",
    channels: ["linkedin", "twitter"],
    destination: "Raysa Studio LinkedIn",
    campaign: "pricing-post-jun24",
    slug: "design-pricing-guide",
    tracked_link: "https://raysa.studio/design-pricing-guide",
    status: "posted",
    posted_at: "2024-06-24T09:00:00Z",
    created_at: "2024-06-24T08:30:00Z",
    total_clicks: 1840,
    unique_clicks: 1512,
    total_conversions: 41,
    revenue_cents: 324000,
  },
  {
    id: "p2",
    content:
      "I just launched my Figma component library — 400+ components...",
    channels: ["instagram", "threads"],
    destination: "Instagram",
    campaign: "figma-launch-jun21",
    slug: "figma-library",
    tracked_link: "https://raysa.studio/figma-library",
    status: "posted",
    posted_at: "2024-06-21T14:00:00Z",
    created_at: "2024-06-21T13:40:00Z",
    total_clicks: 2240,
    unique_clicks: 1870,
    total_conversions: 36,
    revenue_cents: 289000,
  },
  {
    id: "p3",
    content:
      "Hot take: Most SaaS landing pages fail because they explain features, not outcomes.",
    channels: ["linkedin", "twitter", "facebook"],
    destination: "Newsletter",
    campaign: "newsletter-jun18",
    slug: "newsletter-june",
    tracked_link: "https://raysa.studio/newsletter",
    status: "posted",
    posted_at: "2024-06-18T10:30:00Z",
    created_at: "2024-06-18T09:55:00Z",
    total_clicks: 980,
    unique_clicks: 811,
    total_conversions: 22,
    revenue_cents: 176000,
  },
  {
    id: "p4",
    content:
      "5 Figma shortcuts I use 100x per day...",
    channels: ["instagram", "twitter", "threads"],
    destination: "Instagram",
    campaign: "figma-tips-jun15",
    slug: "figma-shortcuts",
    tracked_link: "",
    status: "posted",
    posted_at: "2024-06-15T08:00:00Z",
    created_at: "2024-06-15T07:45:00Z",
    total_clicks: 3240,
    unique_clicks: 2820,
    total_conversions: 12,
    revenue_cents: 94000,
  },
  {
    id: "p5",
    content:
      "The design system that took my freelance income from $3k to $12k/month.",
    channels: ["twitter", "linkedin"],
    destination: "Twitter",
    campaign: "design-system-jul02",
    slug: "design-system-course",
    tracked_link: "https://raysa.studio/design-system-course",
    status: "draft",
    posted_at: null,
    created_at: "2024-06-30T10:00:00Z",
    total_clicks: 0,
    unique_clicks: 0,
    total_conversions: 0,
    revenue_cents: 0,
  },
  {
    id: "p6",
    content:
      "What nobody tells you about shipping your first digital product...",
    channels: ["linkedin"],
    destination: "LinkedIn",
    campaign: null,
    slug: "first-digital-product",
    tracked_link: "",
    status: "draft",
    posted_at: null,
    created_at: "2024-06-29T12:00:00Z",
    total_clicks: 0,
    unique_clicks: 0,
    total_conversions: 0,
    revenue_cents: 0,
  },
]

// ─── Revenue events ───────────────────────────────────────────────────────────
export const DUMMY_REVENUE_EVENTS: RevenueEvent[] = [
  { id: 'r1', customerEmail: 'alex@startup.io', amount: 79, provider: 'lemon_squeezy', product: 'Pro Plan', postId: 'p1', postPreview: 'After 3 years of freelancing...', channel: 'linkedin', country: 'US', createdAt: '2024-06-28T14:32:00Z' },
  { id: 'r2', customerEmail: 'sara@agency.co', amount: 149, provider: 'stripe', product: 'Agency Plan', postId: 'p1', postPreview: 'After 3 years of freelancing...', channel: 'linkedin', country: 'GB', createdAt: '2024-06-28T11:20:00Z' },
  { id: 'r3', customerEmail: 'james@design.com', amount: 29, provider: 'lemon_squeezy', product: 'Figma Library', postId: 'p2', postPreview: 'I just launched my Figma...', channel: 'instagram', country: 'CA', createdAt: '2024-06-27T18:45:00Z' },
  { id: 'r4', customerEmail: 'priya@saas.dev', amount: 79, provider: 'lemon_squeezy', product: 'Pro Plan', postId: 'p1', postPreview: 'After 3 years of freelancing...', channel: 'twitter', country: 'IN', createdAt: '2024-06-27T09:10:00Z' },
  { id: 'r5', customerEmail: 'nina@studio.de', amount: 29, provider: 'gumroad', product: 'Figma Library', postId: 'p2', postPreview: 'I just launched my Figma...', channel: 'instagram', country: 'DE', createdAt: '2024-06-26T16:22:00Z' },
  { id: 'r6', customerEmail: 'tom@growth.io', amount: 149, provider: 'stripe', product: 'Agency Plan', postId: 'p3', postPreview: 'Hot take: Most SaaS landing...', channel: 'linkedin', country: 'US', createdAt: '2024-06-26T12:05:00Z' },
  { id: 'r7', customerEmail: 'mike@freelance.co', amount: 79, provider: 'lemon_squeezy', product: 'Pro Plan', postId: 'p2', postPreview: 'I just launched my Figma...', channel: 'instagram', country: 'AU', createdAt: '2024-06-25T20:18:00Z' },
]

// ─── Daily revenue chart data ────────────────────────────────────────────────
export const DUMMY_DAILY_REVENUE: DailyRevenue[] = Array.from({ length: 30 }, (_, i) => {
  const d = new Date('2024-06-01')
  d.setDate(d.getDate() + i)
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const base = Math.random() * 300 + 100
  return {
    date: dateStr,
    linkedin: Math.round(base * (0.4 + Math.random() * 0.2)),
    twitter: Math.round(base * (0.1 + Math.random() * 0.1)),
    facebook: Math.round(base * (0.05 + Math.random() * 0.05)),
    instagram: Math.round(base * (0.15 + Math.random() * 0.1)),
    threads: Math.round(base * (0.03 + Math.random() * 0.03)),
    bluesky: Math.round(base * (0.01 + Math.random() * 0.02)),
    total: Math.round(base),
  }
})

// ─── Channel stats ────────────────────────────────────────────────────────────
export const DUMMY_CHANNEL_STATS: ChannelStat[] = [
  { platform: 'linkedin', posts: 12, clicks: 4820, conversions: 74, revenue: 6240, avgRevenuePerPost: 520, trend: 34.2 },
  { platform: 'instagram', posts: 18, clicks: 5460, conversions: 48, revenue: 3820, avgRevenuePerPost: 212, trend: 18.7 },
  { platform: 'twitter', posts: 34, clicks: 3240, conversions: 22, revenue: 1760, avgRevenuePerPost: 51, trend: -8.3 },
  { platform: 'facebook', posts: 8, clicks: 980, conversions: 11, revenue: 890, avgRevenuePerPost: 111, trend: 5.1 },
  { platform: 'threads', posts: 6, clicks: 420, conversions: 4, revenue: 340, avgRevenuePerPost: 56, trend: 22.0 },
  { platform: 'bluesky', posts: 3, clicks: 180, conversions: 2, revenue: 120, avgRevenuePerPost: 40, trend: 0 },
]

// ─── Overview stats ───────────────────────────────────────────────────────────
export const DUMMY_OVERVIEW = {
  totalRevenue: 13170,
  totalPosts: 81,
  totalConversions: 161,
  totalClicks: 15100,
  avgRevenuePerPost: 162.5,
  bestPost: DUMMY_POSTS[0],
  revenueGrowth: 23.4,
  conversionRate: 1.07,
}

// ─── Social platform meta ─────────────────────────────────────────────────────
export const PLATFORM_META: Record<SocialChannel, { name: string; color: string; bgColor: string; icon: string }> = {
  linkedin: { name: 'LinkedIn', color: '#0077B5', bgColor: '#EFF7FF', icon: 'in' },
  twitter: { name: 'Twitter / X', color: '#000000', bgColor: '#F7F7F7', icon: '𝕏' },
  facebook: { name: 'Facebook', color: '#1877F2', bgColor: '#EEF4FF', icon: 'f' },
  instagram: { name: 'Instagram', color: '#E1306C', bgColor: '#FFF0F5', icon: '◎' },
  threads: { name: 'Threads', color: '#000000', bgColor: '#F5F5F5', icon: '@' },
  bluesky: { name: 'Bluesky', color: '#0085FF', bgColor: '#EFF6FF', icon: '🦋' },
}

export const PAYMENT_META: Record<PaymentProvider, { name: string; color: string; icon: string }> = {
  lemon_squeezy: { name: 'Lemon Squeezy', color: '#FFC233', icon: '🍋' },
  stripe: { name: 'Stripe', color: '#635BFF', icon: '◈' },
  paddle: { name: 'Paddle', color: '#0EA5E9', icon: '◉' },
  gumroad: { name: 'Gumroad', color: '#FF90E8', icon: '◆' },
  woocommerce: { name: 'WooCommerce', color: '#7F54B3', icon: '◇' },
}
