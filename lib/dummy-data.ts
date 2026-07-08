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

// Mirrors public.posts exactly — snake_case, straight from Supabase
export interface DbPost {
  id: string
  content: string
  channel: SocialChannel
  destination: string
  campaign: string | null
  slug: string
  tracked_link: string
  status: PostStatus
  posted_at: string | null
  created_at: string
  total_clicks: number
  unique_clicks: number
  total_conversions: number
  revenue_cents: number
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
export const DUMMY_POSTS: SocialPost[] = [
  {
    id: 'p1',
    content: "After 3 years of freelancing, here's what I learned about pricing your design work:\n\n→ Charge for the outcome, not the hours\n→ Your rate should make you slightly uncomfortable\n→ Scope creep is a pricing problem, not a client problem\n→ Double your rate and see what happens\n\nThe day I raised my prices 3x was the day I started working with better clients.\n\nWhat's your biggest pricing lesson?",
    channels: ['linkedin', 'twitter'],
    status: 'ready',
    publishedAt: '2024-06-24T09:00:00Z',
    link: 'https://raysa.studio/design-pricing-guide',
    utmCampaign: 'pricing-post-jun24',
    likes: 847, comments: 142, shares: 203, clicks: 1840, impressions: 28400,
    revenue: 3240, conversions: 41,
    revenueByProvider: { lemon_squeezy: 2100, stripe: 890, gumroad: 250 },
    revenueByChannel: { linkedin: 2680, twitter: 560 },
  },
  {
    id: 'p2',
    content: "I just launched my Figma component library — 400+ components, dark + light mode, fully responsive.\n\nBuilt it over 6 months while working with clients. Now it saves me 10+ hours per project.\n\nGetting it for the price of a coffee ☕\n\nLink in bio 👇",
    channels: ['instagram', 'threads'],
    status: 'ready',
    publishedAt: '2024-06-21T14:00:00Z',
    link: 'https://raysa.studio/figma-library',
    utmCampaign: 'figma-launch-jun21',
    likes: 1204, comments: 89, shares: 312, clicks: 2240, impressions: 41200,
    revenue: 2890, conversions: 36,
    revenueByProvider: { lemon_squeezy: 1940, gumroad: 950 },
    revenueByChannel: { instagram: 2200, threads: 690 },
  },
  {
    id: 'p3',
    content: "Hot take: Most SaaS landing pages fail because they explain features, not outcomes.\n\nYour customer doesn't want \"advanced analytics\" — they want to know which LinkedIn post made them money.\n\nRewrite your headline as a transformation:\nFrom: [current state] → To: [desired state]\n\nFull breakdown in my newsletter 👇",
    channels: ['linkedin', 'twitter', 'facebook'],
    status: 'posted',
    publishedAt: '2024-06-18T10:30:00Z',
    link: 'https://raysa.studio/newsletter',
    utmCampaign: 'newsletter-jun18',
    likes: 623, comments: 98, shares: 167, clicks: 980, impressions: 19800,
    revenue: 1760, conversions: 22,
    revenueByProvider: { lemon_squeezy: 1200, stripe: 560 },
    revenueByChannel: { linkedin: 1340, twitter: 280, facebook: 140 },
  },
  {
    id: 'p4',
    content: "5 Figma shortcuts I use 100x per day:\n\n1. Ctrl+R → Rename layers fast\n2. Ctrl+G → Group instantly  \n3. Alt+drag → Duplicate in place\n4. Ctrl+Shift+H → Hide/show UI\n5. Ctrl+/ → Quick actions\n\nSave this for later 🔖\n\nWhat's your most-used shortcut?",
    channels: ['instagram', 'twitter', 'threads'],
    status: 'posted',
    publishedAt: '2024-06-15T08:00:00Z',
    utmCampaign: 'figma-tips-jun15',
    likes: 2140, comments: 341, shares: 892, clicks: 3240, impressions: 67800,
    revenue: 940, conversions: 12,
    revenueByProvider: { lemon_squeezy: 620, gumroad: 320 },
    revenueByChannel: { instagram: 620, twitter: 240, threads: 80 },
  },
  {
    id: 'p5',
    content: "The design system that took my freelance income from $3k to $12k/month:\n\nThread 🧵👇",
    channels: ['twitter', 'linkedin'],
    status: 'draft',
    scheduledAt: '2024-07-02T09:00:00Z',
    link: 'https://raysa.studio/design-system-course',
    utmCampaign: 'design-system-jul02',
    likes: 0, comments: 0, shares: 0, clicks: 0, impressions: 0,
    revenue: 0, conversions: 0,
    revenueByProvider: {},
    revenueByChannel: {},
  },
  {
    id: 'p6',
    content: "What nobody tells you about shipping your first digital product...",
    channels: ['linkedin'],
    status: 'draft',
    utmCampaign: 'draft-product-launch',
    likes: 0, comments: 0, shares: 0, clicks: 0, impressions: 0,
    revenue: 0, conversions: 0,
    revenueByProvider: {},
    revenueByChannel: {},
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
