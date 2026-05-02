-- Per-user mapping of cloned ElevenLabs voices.
-- Apply this in the Supabase SQL editor AFTER schema.sql.
-- Idempotent: safe to re-run.

create table if not exists public.user_voices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  elevenlabs_voice_id text not null unique,
  voice_name text not null,
  description text,
  consent_at timestamptz not null default now(),
  consent_ip text,
  created_at timestamptz not null default now()
);

create index if not exists user_voices_user_id_idx on public.user_voices(user_id);

-- Defense-in-depth: service-role proxy bypasses RLS, but anon/authenticated clients
-- cannot read or write voices belonging to other users via the public Supabase client.
alter table public.user_voices enable row level security;

drop policy if exists "users_read_own_voices"   on public.user_voices;
drop policy if exists "users_insert_own_voices" on public.user_voices;
drop policy if exists "users_delete_own_voices" on public.user_voices;

create policy "users_read_own_voices"
  on public.user_voices for select
  using (auth.uid() = user_id);

create policy "users_insert_own_voices"
  on public.user_voices for insert
  with check (auth.uid() = user_id);

create policy "users_delete_own_voices"
  on public.user_voices for delete
  using (auth.uid() = user_id);
