-- Custom events (SourceTruth.track) + identify history, per session.
-- Run once in Supabase → SQL Editor.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  user_id uuid not null,              
  session_id text,
  name text not null,
  path text,
  props jsonb,
  created_at timestamptz not null default now()
);

create index if not exists events_site_created_idx on public.events (site_id, created_at desc);
create index if not exists events_site_session_idx on public.events (site_id, session_id);


alter table public.events enable row level security;

drop policy if exists "Owners read own events" on public.events;
create policy "Owners read own events"
  on public.events for select
  using (user_id = auth.uid());
