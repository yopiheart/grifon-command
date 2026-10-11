-- TEST DATABASE ONLY. Minimal subscription shape for isolated PostgreSQL/PGlite.
-- Then execute supabase/rate_limit.sql, credits.sql, finished_ad_meter.sql,
-- followed by tests/sql/finished-ad-meter.sql. Never run against a live database.
create role anon;
create role authenticated;
create role service_role;
create table public.subscriptions (
  user_id uuid primary key,
  plan_id text not null,
  status text not null,
  updated_at timestamptz not null default now()
);
