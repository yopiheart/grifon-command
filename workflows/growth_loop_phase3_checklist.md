# Growth Loop — Phase 3 Build Checklist (segmentation + retargeting briefs)

> **What this is:** the plug-and-play sheet for **Phase 3** of [`growth_loop.md`](growth_loop.md)
> — join `subscriptions` tiers to the `events` funnel + `feedback` into retargeting **segments**,
> emit per-segment creative **briefs**, and produce **hashed-email rosters** Neil uploads to Meta
> by hand. **Ingest-only / roster-export-only — no automated push, no publish, no spend.** The
> `retargeting-briefs` skill drives it; `tools/segment_pull.py` does the membership math.

---

## 0. Status

- [x] `tools/segment_pull.py` built (stdlib-only; `--fixture`; live + live `--with-emails`; PII-free
      stdout + opt-in hashed rosters).
- [x] `tools/fixtures/segment_sample.json` committed (segmentation + roster hashing verified with no
      creds; logic cross-checked in Node — checkout_abandoners 1 / power 1 / free_not_converted 2 /
      detractors 1 / promoters 2 / anon_skipped 2).
- [x] `.claude/skills/retargeting-briefs/SKILL.md` + `workflows/retargeting_briefs.md` (brief log).
- [x] **Marketing-consent capture** — BUILT (`consent_capture_plan.md` Slice 1: `marketing_consent`
      table + `api/consent.ts` + signup opt-in + Settings toggle + Privacy disclosure). Enforcement
      wired into `segment_pull.py` (Slice 2): only current grants are uploaded; removal rosters for
      withdrawals. **One remaining manual step:** apply `supabase/marketing_consent.sql` to the live DB.
- [ ] **Live segment pull** — blocked only on live Phase-0 telemetry now; consent gate is built
      and enforced in code (deferred; not part of 3a).

## 1. Credentials / prerequisites

**No new ad token needed for export** (the differentiator from Phase 2). The roster path reuses the
service role already in `.env`:

- [ ] `SUPABASE_URL` (or `VITE_SUPABASE_URL`) + `SUPABASE_SERVICE_ROLE_KEY` — already set. The
      service role also authorizes the GoTrue **auth admin** endpoint (`/auth/v1/admin/users`) that
      `--with-emails` uses to resolve user_id → email for hashing. **Server-only.**
- [ ] **Python 3.10+** on the PC (the defreezer wipes it — install before running).

## 2. The consent gate (BUILT — enforced in code)

Retargeting on user PII needs a lawful marketing/retargeting **consent basis**. This now exists and is
enforced automatically by `segment_pull.py` (no longer a manual hold):

- [x] Marketing-consent capture built — `marketing_consent` table (server-stamped `consent_at`/
      `consent_ip`/`policy_version`, RLS read-own + service-role-write), `api/consent.ts` grant/withdraw,
      signup opt-in + Settings toggle. `straw-man-audit`: STRAW_MAN_PASS (0 critical).
- [x] `terms`/`privacy` updated — `PrivacyPolicy.tsx` §8 discloses retargeting / Custom Audiences
      (pixel vs CA distinction) + withdrawal mechanism.
- [x] Enforcement — `segment_pull.py` uploads **only** current grants, emits **removal rosters** for
      consented→withdrawn (Meta §4), reports `excluded_no_consent`, fail-closed on empty consent data.
- [ ] **Apply `supabase/marketing_consent.sql` to the live DB** (the one remaining manual prod step —
      until then live rosters come back empty, by design).
- **At upload:** Neil makes the Jan-2025 Meta certification + applies removal rosters; re-run ≤30 days.

## 3. Running the tool

```bash
# No creds — verify segmentation + roster hashing against the committed fixture:
python tools/segment_pull.py --fixture tools/fixtures/segment_sample.json --out-dir .tmp/growth/audiences

# Live, PII-FREE analysis only (no emails pulled, no rosters written):
python tools/segment_pull.py --days 30

# Live, ALSO build hashed rosters (pulls emails via auth admin — ONLY after the consent gate):
python tools/segment_pull.py --days 30 --with-emails --out-dir .tmp/growth/audiences --power-threshold 5
```

stdout JSON is **always PII-free** (counts + signal). Hashed rosters land in `--out-dir` (`.tmp/`,
disposable, **never committed** — they hold hashed PII). On missing creds (no `--fixture`) the tool
exits `1 SECRETS_NOT_CONFIGURED`.

## 4. The segments (all tunable)

| Segment | Rule | Intent |
|---|---|---|
| `checkout_abandoners` | `InitiateCheckout`, no `Purchase` | highest intent (winback) |
| `power_users_still_free` | `plan=free`, engaged events ≥ `--power-threshold` | hottest upgrade |
| `free_not_converted` | `plan=free`, ≥1 engaged, no purchase, not power/abandoner | upgrade-nudge |
| `detractors` | latest `nps_score ≤ 6` | save / winback |
| `promoters` | latest `nps_score ≥ 9` | referral / lookalike seed |

Engaged = any event except `PageView`/`ViewContent`. Anonymous (no `user_id`) events are reported as
`anon_events_skipped` and excluded (can't be email-retargeted). Segments are de-duped to a single
hottest bucket per user (abandoner > power > free_not_converted).

## 5. Verification (done in-session)

- [x] Fixture segmentation cross-checked in Node (counts above); email normalization (trim+lowercase
      → SHA-256) proven (`U2@Example.com ` hashes equal to `u2@example.com`).
- [x] stdout confirmed PII-free by construction (only counts/signal serialized; user_ids/emails live
      only in `.tmp/` roster files).
- [ ] Live `--days` run once Phase-0 telemetry is in production (Neil; needs Python).

*Phase 3 closes the build sheet for the growth loop's planned phases. Deferred (correctly) and
out of scope: autonomous publish/spend — revisit only after the loop proves its judgment on live data.*
