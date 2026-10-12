-- Short version of a post for X (free accounts: 280 chars incl. the 23-char link).
-- Run once in Supabase → SQL Editor (SourceTruth project). Safe to re-run.
alter table public.posts add column if not exists x_content text;
