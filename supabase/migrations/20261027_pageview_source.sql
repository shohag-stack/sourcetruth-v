-- Tagged source (?ref= / ?utm_source= / ?via=) per pageview, so visits from
-- sites that strip the referrer (rel="noreferrer", e.g. the Sanity template
-- marketplace) don't all collapse into "Direct".
-- Run once in Supabase → SQL Editor (SourceTruth project). Safe to re-run.
alter table public.pageviews add column if not exists source text;
