-- Funnel leads — opt-in submissions from Funnel Forge lead-gen funnels
-- (funnels/<instance>/, one Vercel project each). One table serves ALL funnels
-- (Grifon dogfood + future clients), partitioned logically by client_id/funnel_id.
-- See workflows/funnel_swipe_file.md (system) and the Funnel Forge plan.
--
-- Consent model follows workflows/consent_capture_plan.md doctrine: the proof
-- of consent is SERVER-stamped (created_at + consent_text + policy_version);
-- the client never asserts state the server didn't witness. Funnels are
-- unauthenticated, so there is no user_id — identity is (funnel_id, email).
--
-- Apply in the Supabase SQL editor AFTER schema.sql. Idempotent: safe to re-run.

create table if not exists public.funnel_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Logical partition keys, set by the funnel's own api/lead.ts (never client-supplied
  -- free text — the handler hardcodes its own funnel identity).
  client_id text not null,          -- 'grifon', 'oceanides', ...
  funnel_id text not null,          -- 'grifon-starter-v1', ...

  -- Lead fields (form.fields is a per-funnel subset; email is the identity anchor)
  name text,
  email text not null,
  phone text,

  -- Record of consent (server-stamped; consent_text is the VERBATIM copy shown)
  consent boolean not null default false,
  consent_text text,
  policy_version text,

  -- Supporting metadata (x-forwarded-for first hop, UA). Not proof — context.
  ip text,
  user_agent text,

  -- Attribution captured client-side from location.search at submit time
  utm jsonb,                        -- { source, medium, campaign, content, term }
  referrer text,
  page_url text,

  status text not null default 'new'   -- 'new' | future: 'contacted' | 'converted' | ...
);

-- One row per (funnel, email): repeat submits update the existing lead
-- (api/lead.ts upserts on this index) instead of duplicating. Plain columns
-- (not lower(email)) so PostgREST upsert onConflict can target it —
-- api/lead.ts MUST lowercase+trim email before every write.
create unique index if not exists funnel_leads_dedupe
  on public.funnel_leads (funnel_id, email);

create index if not exists funnel_leads_client_created
  on public.funnel_leads (client_id, created_at desc);

-- Service-role writes ONLY (each funnel's api/lead.ts). No anon/authenticated
-- policies at all → default deny for both read and write: a public funnel page
-- must never be able to read the lead roster or forge/backdate consent.
alter table public.funnel_leads enable row level security;

-- ---------------------------------------------------------------------------
-- UPGRADES — append-only, `if not exists` everywhere. Same doctrine as the rest
-- of this file: safe to re-run against a live table, in any order.
-- ---------------------------------------------------------------------------

-- The ops-tracker columns (/ops, funnels/oceanides-price-page). These THREE
-- ALREADY EXIST in the live database — they were added by hand when the tracker
-- shipped and never backfilled into this file, so a fresh project built from
-- this .sql alone would have been missing them. Written down now: the live
-- schema is not the record, this file is. `if not exists` makes it a no-op
-- where they are already present.
alter table public.funnel_leads add column if not exists amount numeric;   -- how much the job actually billed
alter table public.funnel_leads add column if not exists address text;     -- filled in on the call, not by the form
alter table public.funnel_leads add column if not exists notes text;

-- Tawag Cockpit call log (2026-08-04, clients/oceanides/tawag-cockpit-plan.md).
-- Pagkatapos ng tawag, dalawang pindot lang ni Zam: anong objection ang narinig,
-- at kailan ang follow-up. Ang laman ng `objection` ay sarado sa api/ops.ts
-- (mahal | schedule | legit | iba | walang_sagot) at hindi dito, para maging
-- label change at hindi migration ang pagdagdag ng bagong card sa deck.
--
-- Ang log na to ay para sa pagpapabuti ng cards, HINDI para sukatin si Zam.
alter table public.funnel_leads add column if not exists objection text;
alter table public.funnel_leads add column if not exists follow_up_at timestamptz;
