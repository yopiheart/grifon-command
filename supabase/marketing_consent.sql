-- Marketing / retargeting consent — record-of-consent for sharing an account's
-- hashed email (PII) with advertising partners (Meta Custom Audiences).
-- This is a DIFFERENT legal act from the Phase-0 pixel cookie banner
-- (device-level, anonymous, localStorage). See workflows/consent_capture_plan.md.
--
-- Gating prerequisite for the Phase-3 retargeting-briefs loop: no hashed-email
-- roster may be uploaded to a Meta Custom Audience without a row here showing
-- current, un-withdrawn consent. tools/segment_pull.py reads this table to
-- hard-exclude non-consented users and to emit removal rosters for
-- consented→withdrawn users (Meta Custom Audience Terms §4).
--
-- Apply this in the Supabase SQL editor AFTER schema.sql.
-- Idempotent: safe to re-run.

create table if not exists public.marketing_consent (
  -- One mutable current-state row per user (decision: not an append-only log).
  -- user_id is the PK, which also enforces the unique(user_id) upsert target.
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- Timestamp of the LAST grant. Set on grant; left intact on withdrawal so the
  -- historical grant time is preserved. NULL only if consent was never granted.
  consent_at timestamptz,
  -- Supporting metadata only (x-forwarded-for first hop). The real proof of
  -- consent is the server-stamped consent_at + policy_version + recorded action.
  consent_ip text,
  -- Timestamp of the LAST withdrawal. NULL while consent is currently active.
  -- Current consent  := consent_at IS NOT NULL AND withdrawn_at IS NULL.
  -- Removal-roster target (genuinely consented→withdrawn, Meta §4) :=
  --   consent_at IS NOT NULL AND withdrawn_at IS NOT NULL.  segment_pull.py MUST
  --   require consent_at IS NOT NULL so an explicit opt-out with no prior consent
  --   (consent_at NULL, withdrawn_at set) is NOT misread as someone to remove
  --   from an audience they were never in.
  withdrawn_at timestamptz,
  -- Which privacy-policy version was agreed to (services/consentConstants.ts).
  -- Bumped on a material policy change; proves WHAT the user consented to.
  policy_version text not null,
  updated_at timestamptz not null default now()
);

-- Defense-in-depth: the service-role proxy (api/consent.ts) bypasses RLS, but
-- anon/authenticated clients using the public Supabase client may only READ
-- their own row and may NOT write it. The record-of-consent is server-stamped;
-- a client must never be able to forge or backdate its own consent.
alter table public.marketing_consent enable row level security;

drop policy if exists "users_read_own_consent" on public.marketing_consent;

create policy "users_read_own_consent"
  on public.marketing_consent for select
  using (auth.uid() = user_id);

-- No insert/update/delete policies for anon/authenticated → default deny.
-- All writes go through api/consent.ts on the service role (consistent with
-- this app's "all writes via api/" architecture).
