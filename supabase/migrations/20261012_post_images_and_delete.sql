-- Post images (ImageKit) + safe post deletion.
-- Run once in Supabase → SQL Editor (SourceTruth project). Safe to re-run.

alter table public.posts add column if not exists image_url text;
alter table public.posts add column if not exists image_file_id text;  -- ImageKit fileId, used to delete the file

-- Deleting a post:
--   clicks       → deleted with the post (they only describe that post)
--   conversions  → KEPT, post_id set to null (revenue must never disappear)
do $$
declare
  r record;
begin
  for r in
    select con.conname, rel.relname, att.attname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any (con.conkey)
    where con.contype = 'f'
      and con.confrelid = 'public.posts'::regclass
      and ns.nspname = 'public'
      and rel.relname in ('clicks', 'conversions')
  loop
    execute format('alter table public.%I drop constraint %I', r.relname, r.conname);
    execute format(
      'alter table public.%I add constraint %I foreign key (%I) references public.posts(id) on delete %s',
      r.relname, r.conname, r.attname,
      case when r.relname = 'clicks' then 'cascade' else 'set null' end
    );
  end loop;
end $$;
