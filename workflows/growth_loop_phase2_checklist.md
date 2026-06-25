# Growth Loop — Phase 2a Build Checklist (ad-performance ingestion + attribution)

> **What this is:** the plug-and-play sheet for **Phase 2a** of [`growth_loop.md`](growth_loop.md)
> — ingest Meta ad metrics into `public.ad_performance` and stamp each Grifon creative with an
> attribution id so metrics join back to the ad that made them. Shipped as one vertical slice
> (table + `tools/meta_insights_pull.py` + creative-id stamp). **Ingest-only — Neil still
> publishes/pauses ads.** The `growth-debrief` skill is **Phase 2b** (separate).

---

## 0. Status

- [x] `supabase/ad_performance.sql` applied (service-role-only; unique `(ad_id, date_start)` → idempotent upsert).
- [x] `tools/meta_insights_pull.py` built (stdlib-only; `--fixture` + `--dry-run`; PostgREST upsert).
- [x] `tools/fixtures/meta_insights_sample.json` committed (verifies the map→upsert path with no creds).
- [x] Creative attribution: render `jobId` → download filename `grifon-<jobId>.mp4` + copyable **CREATIVE ID** in EditVideo.
- [ ] **Live Meta pull** — blocked on creds below (deferred; not part of 2a).

---

## 1. Credentials to gather (Neil's task — when Grifon actually runs ads)

The Phase-0 CAPI token is **not** sufficient — the Insights API needs a token with the **`ads_read`**
scope and the **ad account id**.

- [ ] **Ad account id** — Meta Ads Manager → the account running Grifon ads → `act_<digits>`.
- [ ] **Insights access token (`ads_read`)** — a system-user or long-lived token scoped to that ad
      account. **Server-only secret.** Hand it straight into `.env` on the PC; don't paste in chat.

## 2. Env vars (PC `.env` + Vercel if the pull ever runs server-side)

| Name | Where | Notes |
|---|---|---|
| `META_AD_ACCOUNT_ID` | server (no prefix) | `act_…` — or pass `--ad-account` |
| `META_INSIGHTS_ACCESS_TOKEN` | server (no prefix) | **secret**, `ads_read` scope, ≠ Phase-0 CAPI token |
| `SUPABASE_URL` / `VITE_SUPABASE_URL` | server | already set |
| `SUPABASE_SERVICE_ROLE_KEY` | server (no prefix) | already set; bypasses RLS — server-only |

## 3. Running the tool

> Needs **Python 3.10+** (stdlib only — no pip deps). The cafe-PC defreezer may wipe Python; install
> it if `python`/`py` is missing before running.

```bash
# No creds needed — verify the map+write path against the committed fixture:
python tools/meta_insights_pull.py --fixture tools/fixtures/meta_insights_sample.json --dry-run
python tools/meta_insights_pull.py --fixture tools/fixtures/meta_insights_sample.json   # upserts fixture rows

# Live (once the creds above exist):
python tools/meta_insights_pull.py --days 7
python tools/meta_insights_pull.py --ad-account act_123 --days 30 --dry-run
```

The tool never logs the token; on missing creds (without `--fixture`) it exits `1 SECRETS_NOT_CONFIGURED`.

## 4. The attribution convention (how the join works)

1. Render a final video in Grifon → EditVideo shows a copyable **CREATIVE ID** (`grifon-<jobId>`), and
   the downloaded file is named `grifon-<jobId>.mp4`.
2. When Neil sets the ad up in Meta, **put `grifon-<jobId>` in the ad name**.
3. `meta_insights_pull.py` regex-parses `grifon-<uuid>` out of `ad_name` → `ad_performance.creative_id`,
   joining each ad's metrics to the Grifon creative that produced it.

> **Covers video renders only** (the `jobId` surface). Image-ad (ZIP) attribution is a later add.

## 5. Verification (done in-session)

- [x] Build-gate green (tsc + Vite); 281 tests pass.
- [x] Fixture map path reviewed; the `(ad_id, date_start)` **upsert idempotency** proven directly in
      Supabase (two writes → one row, value updated), then cleaned up.
- [ ] Live `--dry-run` against a real ad account once the token exists (Neil).

*Next file after 2a lands: Phase 2b — the `growth-debrief` skill (reads `ad_performance` + `events` →
ranked "why it won / failed" → feeds the viral-autopsy/CMO loop).*
