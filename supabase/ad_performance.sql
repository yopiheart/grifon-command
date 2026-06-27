-- Ad-performance ingestion sink for the Data-Driven Growth Loop (growth_loop.md,
-- Phase 2a). INGEST-ONLY: tools/meta_insights_pull.py reads Meta Marketing/Insights
-- API metrics and upserts them here; Neil still publishes/pauses ads. Joined to the
-- Grifon creative that produced each ad via creative_id (the render jobId parsed
-- from the Meta ad name). Later phases debrief this against the metrics taxonomy.
-- Apply this in the Supabase SQL editor AFTER schema.sql.
-- Idempotent: safe to re-run.

create table if not exists public.ad_performance (
  id uuid primary key default gen_random_uuid(),
  -- Grifon render jobId parsed from the Meta ad name ("grifon-<uuid>"). Nullable:
  -- organic / non-Grifon ads still ingest so totals stay honest.
  creative_id text,
  ad_id text not null,
  adset_id text,
  campaign_id text,
  ad_name text,
  date_start date not null,
  date_stop date,
  -- Attention / reach
  impressions bigint,
  reach bigint,
  frequency numeric,
  -- Cost / click
  spend numeric,
  clicks bigint,
  ctr numeric,
  cpc numeric,
  cpm numeric,
  link_clicks bigint,
  outbound_clicks bigint,
  -- Hook / hold proxies (video)
  video_3s_views bigint,
  thruplays bigint,
  avg_watch_time numeric,
  -- Conversion / money
  purchases bigint,
  purchase_value numeric,
  roas numeric,
  cpa numeric,
  -- Full insights row, so we never lose a field we didn't model yet.
  raw jsonb not null default '{}'::jsonb,
  pulled_at timestamptz not null default now(),
  ts timestamptz not null default now(),
  -- One row per ad per day → re-pulls upsert instead of duplicating.
  unique (ad_id, date_start)
);

create index if not exists ad_perf_creative_id_idx on public.ad_performance(creative_id);
create index if not exists ad_perf_campaign_idx     on public.ad_performance(campaign_id);
create index if not exists ad_perf_date_idx         on public.ad_performance(date_start);

-- Service-role-only, like public.events / public.feedback (NOT user-owned).
-- Written exclusively by tools/meta_insights_pull.py on the service role; analytics
-- reads happen via the service role too. RLS on + no policies = default deny.
alter table public.ad_performance enable row level security;
