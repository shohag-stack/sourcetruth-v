// types/post.ts
export type PostStatus = 'ready' | 'posted' | 'draft' | 'archived'
export type SocialChannel = 'linkedin' | 'twitter' | 'facebook' | 'instagram' | 'threads' | 'bluesky'
export type PaymentProvider = 'lemon_squeezy' | 'stripe' | 'paddle' | 'gumroad' | 'woocommerce'


// Mirrors public.posts exactly — snake_case, straight from Supabase
export interface DbPost {
  id: string
  content: string
  channels: SocialChannel[]
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