-- Rate limiting infra for API endpoints.
-- Apply this in the Supabase SQL editor AFTER schema.sql.
-- Idempotent: safe to re-run.

create table if not exists public.rate_limits (
  key text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);

-- Only service_role touches this table. RLS on + no policies = default deny for anon/authenticated.
alter table public.rate_limits enable row level security;

-- Atomic sliding-window check-and-increment.
-- Returns true if the call is within the limit (allowed), false if rate-limited.
-- Single-statement INSERT ... ON CONFLICT makes this atomic per key.
create or replace function public.rate_limit_check(
  p_key text,
  p_limit int,
  p_window_seconds int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.rate_limits (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update
    set
      count = case
        when now() - public.rate_limits.window_start > make_interval(secs => p_window_seconds)
          then 1
        else public.rate_limits.count + 1
      end,
      window_start = case
        when now() - public.rate_limits.window_start > make_interval(secs => p_window_seconds)
          then now()
        else public.rate_limits.window_start
      end
  returning count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.rate_limit_check(text, int, int) from public, anon, authenticated;
grant execute on function public.rate_limit_check(text, int, int) to service_role;
