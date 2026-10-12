-- One row per image-upload signature handed out (each ImageKit token is single-use),
-- so /api/imagekit/auth can enforce a monthly upload quota per plan.
-- Run once in Supabase → SQL Editor (SourceTruth project). Safe to re-run.

create table if not exists public.image_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  created_at timestamptz not null default now()
);

create index if not exists image_uploads_user_created_idx on public.image_uploads (user_id, created_at desc);

-- Only the server (service role) reads/writes this table
alter table public.image_uploads enable row level security;
