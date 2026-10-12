-- Indexes for the queries the dashboard and /api/pageview run constantly.
-- Safe to re-run; "if not exists" skips any that already exist.
-- Run once in Supabase → SQL Editor (SourceTruth project).

-- Pageviews: per-site time ranges (every analytics page, monthly usage count)
create index if not exists pageviews_site_visited_idx on public.pageviews (site_id, visited_at desc);
-- Ingestion: "has this session been seen" + bounce update
create index if not exists pageviews_site_session_idx on public.pageviews (site_id, session_id);
-- Ingestion: new vs returning visitor
create index if not exists pageviews_site_iphash_idx on public.pageviews (site_id, ip_hash);

-- Conversions: sidebar revenue (per owner) and per-site ranges
create index if not exists conversions_user_received_idx on public.conversions (user_id, received_at desc);
create index if not exists conversions_site_received_idx on public.conversions (site_id, received_at desc);

-- Sites: looked up by tracking key on every pageview, and "first site" per user
create index if not exists sites_site_key_idx on public.sites (site_key);
create index if not exists sites_user_created_idx on public.sites (user_id, created_at);

-- Clicks: per-post attribution
create index if not exists clicks_post_idx on public.clicks (post_id);
create index if not exists clicks_site_idx on public.clicks (site_id);

analyze public.pageviews;
