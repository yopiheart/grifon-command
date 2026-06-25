# Marketing/Retargeting Consent Capture — Approved Plan (resume sheet)

**Status:** Plan **approved by Neil 2026-06-25**; build deferred to the next session
("we'll proceed tomorrow"). This is the durable record so it survives the defreezer —
the grill + Meta research below are *done*; **tomorrow starts at Slice 1, no re-grill.**

**Why this exists:** it's the **gating prerequisite** for the Phase 3
[`retargeting-briefs`](retargeting_briefs.md) loop to go live — no hashed-email roster
may be uploaded to a Meta Custom Audience until lawful marketing/retargeting consent is
captured. Today the only consent that exists is the Phase-0 **pixel** cookie banner
(device-level, anonymous, localStorage — `ConsentBanner` + `analyticsService`), which is
a *different legal act* from sharing an account's hashed email (PII) with Meta.

---

## Resolved decisions (the grill, 2026-06-25)

1. **Storage:** dedicated `public.marketing_consent` table (NOT columns on
   `subscriptions`). Includes `policy_version` to prove which privacy-policy version was
   agreed to.
2. **Row shape:** single mutable current-state row, `unique(user_id)` upsert (not an
   append-only log). State = last grant + last withdrawal + policy_version.
3. **Capture points:** BOTH an unchecked opt-in checkbox at signup AND a withdraw/grant
   toggle in Settings. Withdrawal in Settings is legally mandatory, so Settings isn't
   optional.
4. **Granularity:** retargeting-scoped **single flag** (not combined "marketing", not
   two granular flags). Consent = "personalized ads / share data with advertising
   partners (Meta)." Matches the only consumer that exists (`segment_pull`).
5. **Auth-timing (the wrinkle):** ride the checkbox in `supabase.auth.signUp`
   `options.data.marketing_opt_in` so intent survives the cross-device confirm-email
   round-trip; a single idempotent post-auth sync (`onAuthStateChange`) calls
   `api/consent` which **server-stamps** the record. `user_metadata` is only the intent
   signal — never the record-of-consent.
6. **Enforcement:** `segment_pull.py` hard-excludes non-consented users from rosters,
   reports `excluded_no_consent`, and warns-but-still-writes below Meta's ~1,000 match
   floor.

## Meta compliance constraints (researched 2026-06-25 — Custom Audience Terms, eff. 2025-12-03)

- **§1 lawful-basis warranty + §2 sensitive-data ban:** advertiser is the **Controller**;
  must warrant lawful basis; audiences may **not** be based on health/financial/credit/
  consumer-report data or under-13 data. Ours are behavior/plan/NPS — clean.
- **§4 withdrawal→REMOVAL (the gap the premortem caught):** when a user opts out *after*
  upload, you must **remove them from the already-uploaded Audience**, not just skip
  future rosters. → `segment_pull.py` must also emit a **removal roster**
  (`removal/<segment>.csv`) of consented→withdrawn users.
- **30-day staleness:** Meta marks lists "Outdated" at 30 days → mandate a **≤30-day
  refresh-and-reconcile cadence** (re-generate rosters, apply removals) in the SOP.
- **Jan-2025 certification:** at audience creation in the Meta UI, **Neil** certifies
  (not a CRA, no sensitive data, follows ad policies). A human-at-upload step.
- **Hashing:** SHA-256 of trim+lowercased email (already implemented in
  `segment_pull.py`).
- **Honest framing:** `x-forwarded-for` IP is *supporting metadata only*; the real
  proof-of-consent is the server-stamped timestamp + `policy_version` + recorded action.
- **Out of our hands (flag to Neil):** actual privacy-copy legal review + any PH NPC /
  RA 10173 registration. The exact ~1,000 match floor is unverified.

---

## Slice 1 — Capture (the code; gets the `/goal` below)

| # | File | Change |
|---|---|---|
| 1 | `supabase/marketing_consent.sql` *(new)* | `user_id` PK, `consent_at`, `consent_ip`, `withdrawn_at`, `policy_version`, `updated_at`. RLS: users read own; writes service-role-only. `on delete cascade`. |
| 2 | `services/consentConstants.ts` *(new)* | `POLICY_VERSION = '2026-06-25'`; bump on material policy change. |
| 3 | `api/consent.ts` *(new)* | `POST {action:'grant'\|'withdraw'}` → Bearer auth + rate-limit + `x-forwarded-for` IP → service-role upsert. Mirrors `api/billing.ts`. **straw-man-audit target.** |
| 4 | `services/consentService.ts` *(new)* | `grant()/withdraw()/getMarketingConsent()` (read-own via RLS). Mirrors `voiceService`. |
| 5 | `types.ts` | `MarketingConsent` interface. |
| 6 | `App.tsx` | Unchecked retargeting checkbox in the signup form (~L1153) → `signUp options.data.marketing_opt_in`; idempotent post-auth sync replays via `consentService.grant`. |
| 7 | `components/dashboard/SettingsModal.tsx` | "Personalized ads" toggle in the Notifications section (~L129) → grant/withdraw; reflects current state. |
| 8 | `components/PrivacyPolicy.tsx` | Retargeting / third-party-ad-partner disclosure section (pixel vs Custom Audience distinction). **Flag for legal review.** |

**Verification:** build-gate PASS · `verify-changes` · **`straw-man-audit` (mandatory)** ·
`brand-check` (checkbox + toggle) · post-goal: apply `marketing_consent.sql` to Supabase
(ask Neil first — mutates live DB), then `smoke-tester` (signup-with-box → row;
toggle → `withdrawn_at`).

### Surface map (from the Explore pass — so tomorrow doesn't re-explore)

- **Voice-consent precedent:** `components/SignalModulator/VoiceCloningTile.tsx:27`
  (checkbox) + `api/elevenlabs/voices.ts:328,363` (`consent_at`/`consent_ip`, IP via
  `x-forwarded-for`). Body schema uses `consent: z.literal(true)`.
- **Signup form:** inline in `App.tsx:1117–1161`; insert checkbox before submit (~L1153).
  `signUpWithPassword` returns `{ hasSession }` (immediate-session OR `check_email` path).
- **Auth state / post-auth hook:** `App.tsx:277–317` (`onAuthStateChange`); existing
  stash-replay precedent `popIntendedPlan` (`App.tsx:328`).
- **Settings:** `components/dashboard/SettingsModal.tsx:129–132` (Notifications toggles;
  localStorage-toggle pattern to mirror).
- **Legal pages:** inline JSX via `components/ui/LegalPageLayout.tsx` —
  `PrivacyPolicy.tsx`, `TermsOfService.tsx`.
- **API write pattern:** `api/billing.ts:73–116` (method guard, Bearer via
  `getUserFromAccessToken`, `enforceRateLimit`, error JSON). `api/_lib/supabaseAdmin.ts`.
- **Service pattern:** `services/voiceService.ts:11–39` (`getAccessToken()` + fetch).
- **Types:** `types.ts:787–792` (`CloneVoiceRequest` has `consent: true`); no marketing
  consent type yet.

## Slice 2 — Enforcement + SOP (tools/docs; NO goal, executes directly after Slice 1)

- `tools/segment_pull.py`: read `marketing_consent` (hard-exclude non-consented, report
  `excluded_no_consent`, warn-below-floor) **+ emit removal rosters** for
  consented→withdrawn (Meta §4). Add a `marketing_consent` array to
  `tools/fixtures/segment_sample.json`.
- `retargeting-briefs` SKILL + `growth_loop_phase3_checklist.md` + `retargeting_briefs.md`:
  flip the consent gate from "BLOCKED — not built" to the live SOP (consent required,
  ≤30-day refresh-and-reconcile, removal roster on withdrawal, Neil's Meta certification
  at upload).

---

## Ready-to-fire `/goal` (Slice 1) — approved-pending; fire after re-confirming tomorrow

```
/goal Slice 1 of marketing/retargeting consent capture is fully implemented —
supabase/marketing_consent.sql, services/consentConstants.ts (POLICY_VERSION),
api/consent.ts, services/consentService.ts, the MarketingConsent type in types.ts,
the unchecked retargeting checkbox + idempotent post-auth sync in App.tsx, the
Settings "Personalized ads" grant/withdraw toggle, and the PrivacyPolicy retargeting
disclosure section — verified by ALL of:
  (1) the build-gate Stop hook prints exactly "Build-gate PASSED: `npm run build`
      clean after edits to api/services/components/App.tsx.";
  (2) `npm run test` reports all tests passing in the transcript;
  (3) straw-man-audit run against api/consent.ts + the consent/PII surface reports
      no Critical or unmitigated findings;
  (4) brand-check on the signup checkbox + Settings toggle reports no Critical findings.
Constraints: NO edits to services/geminiService.ts or api/_lib/prompts.ts; api/consent.ts
must REUSE the existing api/_lib auth (getUserFromAccessToken) + rate-limit helpers and
stamp consent server-side (never treat client user_metadata as the record-of-consent);
marketing_consent.sql stays service-role-write + users-read-own RLS.
Stop and report if any check cannot be made to pass, OR after 20 turns.
```

> **First action tomorrow:** re-read this file → `git pull` → re-confirm the `/goal`
> with Neil → execute Slice 1 → then Slice 2. No re-grill needed.
