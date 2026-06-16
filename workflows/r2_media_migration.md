# Design Doc — Move heavy media to Cloudflare R2 (zero egress)

**Status:** Phase 1 SHIPPED. Phase 2 R2 layer VERIFIED in dev. Pending: Vercel env + prod eyeball.
**Author:** 2026-06-13, during the Supabase egress incident.
**Companion:** [STORAGE_AUDIT.md](../STORAGE_AUDIT.md) (why) · gallery fixes already shipped (Phase 2A+B).

---

## ⏱️ CURRENT STATE — resume here (updated 2026-06-16)

**The egress incident recurred and was resolved.** Free-tier egress lockout (17.8 GB / 5 GB)
402-restricted the project on ~2026-06-16; Google login returned the
`exceed_egress_quota` violation JSON. Two things happened:

1. **Login restored — Pro bridge ACTIVE.** Org `ybbjvbgacbxblaaorglo` upgraded **free → `pro`**
   (250 GB egress), lockout lifted, login confirmed working. ⚠️ **This Pro upgrade is a temporary
   bridge.** Once R2 (Phases 2–5) is proven, **downgrade the org back to free** — egress will be
   near zero. Don't leave Pro running indefinitely if cost matters.

2. **Phase 1 SHIPPED + committed.** Branch `r2-media-migration-phase1` (commit `4c499c1`), pushed
   to GitHub. Build + tests green. No behavior change — everything is dormant behind the
   `MEDIA_STORE` flag (default `supabase`).
   - **New:** `api/_lib/r2.ts` (aws4fetch S3 client — `putObject`/`presignGet`/`getObjectText`/
     `deleteObjects`/`listPrefix`, hour-bucketed presign for CDN-cacheable URLs) and
     `api/_lib/mediaStore.ts` (the `putMedia`/`getMediaUrl`/`listMedia`/`deleteMedia`/
     `downloadMediaText` facade).
   - **Routed through the facade:** `api/gemini/video/poll.ts`, `api/kling/video/poll.ts`,
     `api/kling/omni-video/poll.ts`, `api/voice/consolidate.ts`, `api/render/final.ts`
     (+ `api/_lib/renderJob.ts` helpers, `api/render/final/poll.ts`),
     `api/gemini/video/library.ts`, `api/gemini/video/delete.ts`.
   - **Intentionally left on Supabase:** `api/cron/cleanup-gemini-videos.ts` — stays until the old
     bucket drains, then gets replaced by an R2 lifecycle rule (Phase 5).
   - **Dependency added:** `aws4fetch@^1.0.20`.

**DONE (2026-06-16):**
- ✅ R2 activated (free tier, $0/mo) + bucket **`grifon-media`** created (Public Access disabled).
- ✅ API token `grifon-media-rw` (Object Read & Write, scoped to the bucket). All four `R2_*` vars
  + `MEDIA_STORE=r2` in **local `.env`** (`R2_ACCOUNT_ID=93ea411300021aff8536667a73d13e80`). Token
  secrets live only in `.env` (gitignored) — roll via R2 → Manage API Tokens if leaked.
- ✅ CORS policy on the bucket: origins `www.grifon.ai` / `grifon.ai` / `localhost:5173`, GET, `*`.
- ✅ **Phase 2 VERIFIED in dev** — both the raw aws4fetch transport AND the real `mediaStore.ts`
  facade round-trip PASSED against the live bucket: upload MP4 + sidecar → hour-bucketed presign →
  fetch-back (byte match) → list user prefix → read sidecar → delete → confirm-gone. Verification
  scripts were disposable (removed). NOTE: a full UI render smoke was skipped — the app uses Google
  OAuth and there's no headless dev-login bypass, so an automated browser smoke stalls at auth.

**NEXT ACTIONS (blocked on Neil):**
1. **Add the four `R2_*` vars + `MEDIA_STORE=r2` to Vercel** project env (Production), then redeploy.
2. **Eyeball one real render in prod** (Neil can log in): generate a clip, confirm it plays from a
   `*.r2.cloudflarestorage.com` URL and shows in the Rendered Rail. Old Supabase objects TTL out at
   48h — no backfill.
3. Phase 5 (after ~1 week clean on R2): delete the Supabase upload paths, swap the cleanup cron for
   an R2 lifecycle rule, and **downgrade the Supabase org Pro → free** (egress will be ~zero).

---

## Problem

Supabase free tier gives 5 GB egress/month. Our core output is 10–30 MB MP4s.
The gallery fixes (Phase 2A+B) stop the *accidental* re-downloads and will likely
keep a beta-scale app under the cap — but at real usage, serving video from
Supabase Storage will blow the egress budget again, every cycle. **Video on a
metered-egress store is structurally wrong.** The durable fix is to serve heavy
media from a zero-egress object store and keep Supabase for auth + metadata only.

Cloudflare R2: **$0.015/GB-month storage, $0 egress**, S3-compatible API. At our
0.22 GB working set, storage cost is rounding error and egress is free.

## Goal

Heavy media (per-scene MP4s, voice MP3s, final renders, poster JPEGs) lives in R2.
Supabase keeps only what it's good at: auth, rate-limit/quota RPCs, billing rows,
and (optionally) lightweight metadata. No video bytes ever leave Supabase again.

## Current shape (what changes)

All uploads go to one private Supabase bucket `gemini-videos` via the service-role
admin client, served by 24h signed URLs. Upload sites:
[api/gemini/video/poll.ts](../api/gemini/video/poll.ts),
[api/kling/video/poll.ts](../api/kling/video/poll.ts),
[api/kling/omni-video/poll.ts](../api/kling/omni-video/poll.ts),
[api/voice/consolidate.ts](../api/voice/consolidate.ts),
[api/render/final.ts](../api/render/final.ts). Read/list:
[api/gemini/video/library.ts](../api/gemini/video/library.ts). Cleanup cron:
[api/cron/cleanup-gemini-videos.ts](../api/cron/cleanup-gemini-videos.ts).

Generation is **server-side** (Veo/Kling/ElevenLabs → Vercel function → store), so
the Vercel 4.5 MB response cap is why media is uploaded server-side rather than
streamed to the client. R2 keeps that exact flow — only the storage target swaps.

## Proposed architecture

1. **`api/_lib/r2.ts`** — thin S3-compatible wrapper (use `aws4fetch`, ~3 KB, no
   heavy AWS SDK in the serverless bundle). Exposes `putObject(key, buf, contentType)`,
   `presignGet(key, ttl)`, `deleteObjects(keys)`, `listPrefix(prefix)`. Same `{uid}/...`
   key scheme as today, so paths and ownership checks are unchanged.
2. **Writes** — swap `admin.storage.from(BUCKET).upload(...)` for `r2.putObject(...)`
   in the 5 upload sites. Posters (Part B) target R2 too.
3. **Reads** — `library.ts` lists the R2 prefix and presigns GETs. The
   poll/final handlers return `r2.presignGet(key)` instead of Supabase signed URLs.
4. **CDN-cacheable URLs (the egress-cache win):** presigned GETs carry a changing
   signature, so — like Supabase signed URLs — they defeat the CDN cache. Two options
   (decision needed, see below):
   - **(a) Custom domain + Worker token auth:** front R2 with a Cloudflare custom
     domain; a Worker validates a short HMAC token in the path/query. Same object →
     same cacheable URL within the token window → real CDN cache hits.
   - **(b) Presigned URLs with hour-bucketed signature:** cache presigned URLs
     server-side keyed by `(key, floor(now/1h))` so the same URL is reused for an
     hour. Simpler, no Worker, but coarser caching.
5. **Cleanup** — replace the hourly Vercel cron with an **R2 lifecycle rule**
   (auto-delete objects older than N days). Less code, no function invocations.

## Env (server-side only, no `VITE_` prefix)

`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, and
(for option 4a) `R2_PUBLIC_BASE` + a Worker signing secret. Add to `.env` and Vercel
project env. **Do not** commit them.

## Migration plan (phased, low-risk)

1. Land `api/_lib/r2.ts` + a `MEDIA_STORE` flag (`supabase` | `r2`, default `supabase`).
2. Flip writes to R2 behind the flag; verify a single render round-trips (upload →
   presign → play → delete).
3. Flip `library.ts` reads to R2. Old Supabase objects TTL out at 48h on their own —
   **no backfill needed**, just let the old bucket drain.
4. Run a full Director→render→final-render smoke once services are un-restricted.
5. Remove Supabase Storage upload paths once R2 is proven for ~1 week.

## Cost & risk

- **Cost:** ~$0/mo at current scale (R2 storage on 0.22 GB ≈ $0.003; egress free).
- **Risks:** presigned-URL cache behavior (mitigated by option 4); CORS headers for
  direct `<video>`/`<img>` playback from the R2 domain; `aws4fetch` signing edge cases;
  the Vercel 60 s ceiling still bounds server-side upload of very large finals.

## Open decisions for Neil

1. **URL strategy:** custom domain + Worker (4a, best caching, more setup) vs
   hour-bucketed presigned URLs (4b, simplest). Recommend **4b first**, upgrade to 4a
   if cache-hit rate is poor.
2. **Scope of move:** all media, or videos-only first (voice MP3s are small)?
   Recommend **all media** — one store, one cleanup rule.
3. **Keep any metadata in Supabase**, or move the `.meta.json` sidecars to R2 too?
   Recommend **sidecars to R2** (co-located with their video) to keep Supabase
   storage-free.
