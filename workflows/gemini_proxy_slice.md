# Workflow: Gemini Proxy Slice (P0)

**Status:** Phase 3 complete (2026-04-25). Phases 4–5 outstanding.
**Owner:** Claude Code + neilmaglaya
**Audit reference:** [.tmp/app_audit.md](../.tmp/app_audit.md) P0 §1

## Objective

Eliminate the browser-bundled `VITE_GEMINI_API_KEY` by routing all Gemini calls through Vercel server functions, mirroring the auth + rate-limit pattern already established in [api/checkout.ts](../api/checkout.ts).

**Phase 1 (this slice):** prove the loop end-to-end with one text function. Coexistence with the legacy direct path is intentional — other 25 functions migrate in subsequent phases.

**Closure of audit P0 §1:** only after Phase 5, when `getAi()` is deleted and `dist/assets/*.js` no longer contains the API key.

## Decisions (locked via grill-me, 2026-04-25)

| Decision | Choice | Reasoning |
|---|---|---|
| **Endpoint shape** | 3 routes by cost class: `/api/gemini/text`, `/api/gemini/image`, `/api/gemini/video` | Vercel `maxDuration` is per-route. Text needs ~30s, image ~60s, video ~300s. Per-class rate budgets reflect actual cost. |
| **First-slice function** | `generateOfferOptimization` ([services/geminiService.ts:421](../services/geminiService.ts#L421)) | Smallest representative shape: `(structured input) → string`. Standalone module, low blast radius, no PlanGate, no image input. ~17 other text fns follow the same pattern after this proves out. |
| **"Don't alter API logic" interpretation** | Liberal — transport edits OK; prompts, schemas, model IDs, response handling are byte-identical | The CLAUDE.md rule is being narrowed in this PR (see deliverable below). |
| **Streaming** | Not needed | Zero usages of `generateContentStream` / `for await` / `.stream()` in [services/geminiService.ts](../services/geminiService.ts). Defer indefinitely. |
| **Rate-limit scope** | Abuse limiting only (sliding window). Quota enforcement deferred to P1. | Quota needs `usage_counters` table that doesn't exist. Conflating scopes turns this slice into the metering project. |
| **Burst limits** | text 30/60s, image 15/60s, video 5/3600s | Calibrated to active human use, blocks scripted abuse. |
| **Plan-tier branching** | None in burst limits | Tier governs monthly quota (P1), not per-minute throughput. A Business user clicks at human speed too. |
| **Free-tier policy** | Authenticated free users pass abuse gate | Quota system (P1) is the cost gate, not the proxy. |
| **Anonymous policy** | 401 (mirrors checkout) | No exceptions. |
| **CLAUDE.md rule** | Narrow line 58 from "Do not alter its API logic" → protect prompts/schemas/model-IDs only | Bundle the edit into this PR so future transport work isn't blocked. |

## Acknowledged gap

A logged-in free user could fire 30 text gens/min × 60 min = 1,800/hour against Gemini Flash. Below bankruptcy threshold but above ideal. Closure is P1 quota work (`usage_counters` table + per-tier monthly caps). Document, don't fix in this slice.

## Deliverables (Phase 1 PR)

1. **New:** [api/gemini/text.ts](../api/gemini/text.ts) — text proxy endpoint (auth + zod + rate-limit + provider call). Mirrors api/checkout.ts shape.
2. **Edit:** [services/geminiService.ts](../services/geminiService.ts) — add `proxyGenerateContent()` helper; swap exactly one call site (`generateOfferOptimization`). All other functions untouched.
3. **Edit:** [vercel.json](../vercel.json) — add `maxDuration: 30` for `api/gemini/text.ts`.
4. **Edit:** [.env.example](../.env.example) — add `GEMINI_API_KEY=` (server-side, no `VITE_` prefix). Keep `VITE_GEMINI_API_KEY` (still used by 25 unmigrated functions).
5. **Edit:** [CLAUDE.md](../CLAUDE.md) line 58 — narrow the "do not alter" rule.
6. **Edit:** [.tmp/app_audit.md](../.tmp/app_audit.md) — mark P0 §1 as "Phase 1/5 in progress."
7. **No edit:** any non-OfferOptimizer component, any other geminiService function, prompt strings, response schemas, model IDs.

## Server contract — `POST /api/gemini/text`

**Headers:** `Authorization: Bearer <supabase_access_token>`, `Content-Type: application/json`.

**Body (zod-validated):**
```ts
{
  model: string,
  contents: unknown,         // pass-through; Gemini SDK validates
  config?: unknown,          // pass-through (safetySettings, responseSchema, etc.)
}
```

**200 response:**
```ts
{
  text: string,                    // pre-computed from candidates[0].content.parts[].text
  candidates: any[],
  usageMetadata?: any,
  promptFeedback?: any,
}
```

**Errors:**
- 401 `{ error: 'missing_bearer_token' | 'invalid_token' }`
- 400 `{ error: 'invalid_body', issues }`
- 405 `{ error: 'method_not_allowed' }` (Allow: POST)
- 429 `{ error: 'rate_limited', scope: 'text', retry_after_seconds: 60 }` (+ `Retry-After: 60`)
- 429 `{ error: 'gemini_quota', detail }` (+ `Retry-After: 30`) — when Gemini itself returns quota
- 502 `{ error: 'gemini_error', detail }`

**Why pre-compute `text`:** the SDK's `response.text` is a getter; JSON serialization drops it. Eager computation server-side keeps consumer code byte-identical (`response.text || "fallback"` continues to work).

## Client wrapper contract

```ts
// inside services/geminiService.ts
async function proxyGenerateContent(params): Promise<GenerateContentResponse>
```

- Reads Supabase access token via `getSupabase().auth.getSession()`.
- Throws `NOT_AUTHENTICATED` if no session.
- On 429: throws an Error with `.status = 429` so existing `retryWithBackoff()` quota detection ([services/geminiService.ts:282-307](../services/geminiService.ts#L282-L307)) keeps working without modification.
- Returns the response cast as `GenerateContentResponse`. Consumer code unchanged.

## Call-site change (the actual one-line swap)

In `generateOfferOptimization`:
```ts
// before
const response = await retryWithBackoff(() => getAi().models.generateContent({...}));

// after
const response = await retryWithBackoff(() => proxyGenerateContent({...}));
```

The `{...}` object is identical. Prompt string untouched. Schema untouched. Parsing untouched.

## Verification (must pass before merge)

1. `npx tsc --noEmit` clean.
2. `npm run dev` — log in as a real user, run Offer Optimizer with valid input, confirm a real report renders. Confirm Network tab shows `POST /api/gemini/text` (not `generativelanguage.googleapis.com`).
3. Run any *other* dashboard module (e.g., MarketResearch) — confirm it still works via the legacy direct path. Coexistence proven.
4. Anonymous: log out, hit `/api/gemini/text` with curl — expect 401.
5. Rate limit: rapid-fire 35 requests as a logged-in user — expect 429 with `scope: 'text'` after the 30th. (Defer to staging if local Supabase RPC isn't wired.)
6. Bundle inspection: `npm run build` then grep `dist/assets/*.js` for the Gemini key — **expect to still find it** in Phase 1 (other 25 functions still use it). This is the honest "Phase 1 done, P0 §1 not closed yet" signal.

## Phase plan (after Phase 1 lands)

| Phase | Scope |
|---|---|
| **Phase 2** | ✅ Complete (2026-04-25). Migrated 18 text-class call sites in `services/geminiService.ts` from `getAi().models.generateContent` → `proxyGenerateContent`. The original "~16" estimate undercounted — actual was 18 (the prior grep was truncated at the default head limit). Sites migrated by model: `textModel` ×9, `fastTextModel` ×4, `researchTextModel` ×5. Total proxy call sites in the file is now 19 (Phase 1 + Phase 2). 5 image-class call sites remain on `getAi()` (all `avatarModel`/`sceneImageModel`) — deferred to Phase 3. Verification: `tsc --noEmit` to be run by user. |
| **Phase 3** | ✅ Complete (2026-04-25, end-to-end verified 2026-04-26). Built [api/gemini/image.ts](../api/gemini/image.ts) (15/60s rate limit, `maxDuration: 60`). Added `proxyGenerateImage()` helper sharing transport with `proxyGenerateContent()` via internal `proxyCall(endpoint, params)`. Migrated 5 image-class call sites: 2× `avatarModel` (now lines ~894, ~1000) + 3× `sceneImageModel` (now lines ~1433, ~1502, ~1705). Payload-size strategy locked via grill-me: client-side compression (canvas resize → max 1280px long edge → JPEG @ 0.85) at every upload entry point. Built [utils/imageCompression.ts](../utils/imageCompression.ts) and integrated into 11 image-only upload sites + 1 mixed (CaptionHeadline). This retroactively fixes the latent 4.5MB risk on the Phase 2 text proxy as well (`describeImage`, `describeBusinessAsset` accept user uploads). Verified: `tsc --noEmit` clean. **Dev-environment bridge added 2026-04-26:** [vite.config.ts](../vite.config.ts) gained a `vercelApiDevPlugin` middleware that loads `api/*.ts` via Vite's SSR loader and merges all `.env` keys into `process.env` so server handlers see `GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` (unprefixed) in dev. Without this, `npm run dev` returns 404 for `/api/*` and the proxy can never be exercised locally. Production on Vercel is unaffected — the same `api/*.ts` files run natively there. |
| **Phase 4** | 📋 Spec locked 2026-04-26 (see "Phase 4 spec" section below). Build `api/gemini/video.ts` (initiate) + `api/gemini/video/poll.ts` (poll + on-done Veo-download/Supabase-upload) + `api/cron/cleanup-gemini-videos.ts` (hourly 48h sweep). Migrate `generateVideo` body. Single real caller: [components/GenerateVideo.tsx](../components/GenerateVideo.tsx) — handoff over-counted. |
| **Phase 5** | Delete `getAi()`, remove `VITE_GEMINI_API_KEY` from `.env.example`, verify `dist/` clean of the key, **then** mark audit P0 §1 closed. |

Each phase is its own PR. Phases 1 and 4 require architectural decisions; phases 2, 3, and 5 are mechanical migrations of the same pattern.

## Edge cases / known unknowns

- **`SAFETY_SETTINGS` over the wire:** uses `HarmCategory` / `HarmBlockThreshold` enums from `@google/genai`. These are string enums in the SDK; JSON-serializing preserves them. Server passes them straight back to the SDK. Verified by inspection.
- **`responseSchema` in `config`:** several functions pass a JSON schema in `config.responseSchema`. Pass-through `config: z.unknown()` preserves shape. Server doesn't introspect.
- **Image-input text fns** (e.g., `describeImage`, `generateVideoEditPlan`, the Nano-Banana scene planner around line 1645, the variation-storyboard call around line 1759): route through `/api/gemini/text`. Phase 3 client-side compression keeps these well under the 4.5MB cap. If a future feature ever ships an unrouted upload path, payload size becomes a risk again — extend `compressImageForUpload()` rather than re-introducing raw base64.
- **Avatar fidelity caveat:** compression to 1280px / JPEG 0.85 is fine for Gemini's vision encoder (which internally tiles/downsamples). If a future "preserve identity at maximum fidelity" premium tier ships, that single call site needs a per-call override (e.g., Supabase Storage signed-upload) — don't loosen the global compression default.
- **`generateMarketResearch`** (now migrated): uses `researchTextModel` (Gemini Pro) which is slower. The current `maxDuration: 30` on `/api/gemini/text` may be tight under googleSearch tool calls — bump to 60 if production 504s appear.

---

## Phase 4 spec (locked via grill-me, 2026-04-26)

### Scope reality check

Only **one** caller of `generateVideo` exists in the codebase: [components/GenerateVideo.tsx:174](../components/GenerateVideo.tsx#L174). The 2026-04-25 handoff listed three (GenerateVideo, InfluencerForge, EditVideo) but a Grep proved this wrong — InfluencerForge only uses image proxies, and EditVideo only uses `generateVideoEditPlan` (text). Phase 4 blast radius is one component file.

[components/GenerateVideo.tsx:118](../components/GenerateVideo.tsx#L118) already wraps both `startFrame` and `endFrame` uploads with `compressImageForUpload` from Phase 3, so input payload size is not a Phase 4 concern.

### Decisions

| Decision | Choice | Reasoning |
|---|---|---|
| **Output-blob strategy** | B — proxy fetches Veo blob, uploads to Supabase Storage, returns signed URL | Veo HQ output is 10-30MB. Streaming through a Vercel serverless function bills execution time the entire stream and pushes against the 4.5MB body cap. Supabase Storage already in stack; client downloads from CDN, not from Vercel functions. Tab-close + reopen also recovers the URL within TTL — a real UX improvement over today's blob URLs. |
| **Polling pattern** | Design 1 — server-stateless pass-through. Client receives the Veo operation handle and polls `/api/gemini/video/poll` with it; server holds zero state. | Server-managed background polling needs new infra (cron + job table or a queue vendor). Pass-through matches the SDK's natural shape (operation handle is JSON-serializable). Tab-close still loses the in-flight render — same as today, not a regression. |
| **Storage bucket** | `gemini-videos`, **private**, path `{user_id}/{uuid}.mp4`, project-level dev/prod separation (one bucket per Supabase project, no env suffix) | Private + signed URLs is the only safe posture for paid generative output. `user_id` prefix lets RLS be a one-line policy. UUID filename leaks no metadata. Project-level isolation prevents dev misconfig from touching prod. |
| **TTL & cleanup** | 24h signed URL TTL, 48h object cleanup, **no persistent video library in Phase 4** | UX message: "Download to keep — videos auto-delete after 24 hours." Library = `user_videos` table + UI + quotas, scope creep for this phase. P1 follow-up if user feedback demands it. |
| **Cleanup mechanism** | Vercel cron at `/api/cron/cleanup-gemini-videos`, hourly (`0 * * * *`) | Already on Vercel Pro. Logic lives in `api/` next to the rest of the proxy. Hourly sweeps mean an object overstays TTL by at most 1h. Auth via Vercel's auto-injected `x-vercel-cron: 1` header. |
| **Rate limits** | `/api/gemini/video`: **5/3600s**. `/api/gemini/video/poll`: **60/60s** (new scope). | Generate budget reflects $4-6 cost per render. Poll budget gives 2x headroom over worst realistic case (5 concurrent renders × ~6 polls/min). Poll rate-limit is real-money defense — fake operation handles still burn Gemini API quota. |
| **`maxDuration`** | `/api/gemini/video`: 30. `/api/gemini/video/poll`: 60. | Initiate is a fast SDK call. Poll is cheap on `done:false` paths but does Veo-download (5-30MB, 2-8s) + Supabase-upload (5-30MB, 2-5s) on the `done:true` path = 5-15s peak. 60s gives ~4x headroom. |
| **Outer function signature** | `generateVideo(config, opts) => Promise<GeneratedVideoResult>` byte-identical | Body rewrite only. Caller unchanged. |
| **`GeneratedVideoResult` shape** | Gains `downloadUrl: string` field. `url` keeps semantics (used by `<video src>`); `downloadUrl` is signed with `download: 'filename.mp4'` for the download button. | Cross-origin `<a download>` is silently ignored unless `Content-Disposition: attachment` is set. Two URLs at sign time avoids re-rendering. Both point to the same object, both expire at the same TTL. |
| **GenerateVideo.tsx cleanup** | Delete `lastResultUrlRef` ref and all three `URL.revokeObjectURL(...)` calls (lines 78, 161, 379). Use new `result.downloadUrl` at line 370. | HTTPS URLs don't need revocation. Storage cleanup is the cron's job, not the client's. |
| **`onStatus` semantics** | Preserved — same three strings (`SUBMITTING_JOB`, `RENDERING`, `DOWNLOADING`) fire at corresponding moments in the new client polling loop. | UI labels stable. `DOWNLOADING` is now slightly misnamed (it's "uploading to Supabase") but renaming would break the UI's status-string switch. |
| **Upload-failure handling on done-poll** | Return 502 with `{ error: 'storage_upload_failed', status }`; client retries via existing `retryWithBackoff`. | Idempotent — each retry generates a fresh Supabase UUID. Wastes one Veo egress in the rare failure case; acceptable. Simpler than buffering+retry inside the handler. |
| **Cancel endpoint** | None in Phase 4. Aborting cancels client polling only; Veo continues server-side (same as today). | Veo cancellation may not be supported by Google's API. UX is identical to current. Add `/cancel` as P1 if cost telemetry shows abandoned renders matter. |
| **Error contract** | Preserved — see error mapping table below. One new code: `STORAGE_UPLOAD_FAILED` (surfaces same UX as `VEO_DOWNLOAD_FAILED`, distinguishable in server logs). | GenerateVideo.tsx catch block uses `error.message` for display; existing strings continue to render correctly. Zero changes needed in the component for error handling. |

### Error mapping

| Error | Origin | Phase 4 path |
|---|---|---|
| `UNSUPPORTED_MODEL`, `EMPTY_PROMPT` | client-side, before SDK | unchanged |
| `ABORTED` | signal aborted in poll loop | unchanged |
| `VEO_ERROR: <msg>` | `operation.error` | proxy poll returns `{ done: true, error: { message } }` → client rethrows |
| `VEO_NO_OUTPUT`, `VEO_EMPTY_VIDEO` | missing `generatedVideos` | proxy poll returns `{ done: true, error: { code } }` → client rethrows |
| `VEO_DOWNLOAD_FAILED: <status>` | proxy fetch of `video.uri` fails | proxy returns 502 → client throws same string |
| `STORAGE_UPLOAD_FAILED: <status>` | new — Supabase upload fails | proxy returns 502 → client throws |
| `NOT_AUTHENTICATED` | no Supabase session | mirrors Phases 1-3 |
| 429 with `.status = 429` | rate limit | unchanged; existing `retryWithBackoff` handles |

### Deliverables (Phase 4 PR)

1. **New:** `api/gemini/video.ts` — initiate handler. Auth + zod (model, prompt, config, optional image/lastFrame as base64) + rate-limit (`video` scope, 5/3600s) + `ai.models.generateVideos(...)` → returns `{ operation }`.
2. **New:** `api/gemini/video/poll.ts` — poll handler. Auth + zod (operation handle pass-through) + rate-limit (`video-poll` scope, 60/60s) + `ai.operations.getVideosOperation(...)`. On `done`: fetch `video.videoBytes` (decode base64) OR fetch `video.uri` server-side with `GEMINI_API_KEY`, upload to `gemini-videos/{user_id}/{uuid}.mp4`, sign two URLs (24h TTL: one plain, one with `download: 'grifon-video.mp4'`), return `{ done: true, url, downloadUrl, mimeType }`.
3. **New:** `api/cron/cleanup-gemini-videos.ts` — verify `x-vercel-cron` header (or 401) → list objects in `gemini-videos` via `supabaseAdmin` filtered by `created_at < now - 48h` → batch-delete via `supabase.storage.from('gemini-videos').remove(paths)` → return `{ deleted, errors }`.
4. **New:** Supabase migration creating the `gemini-videos` bucket as private. RLS posture: bucket-level "no public read" (default for private). No custom policies — all access flows through the proxy via service-role admin client.
5. **Edit:** [services/geminiService.ts](../services/geminiService.ts) — add `proxyGenerateVideo()` and `proxyPollVideoOperation()` helpers (sharing `proxyCall` transport from Phase 3). Rewrite `generateVideo` body to use them. Update `GeneratedVideoResult` interface to add `downloadUrl: string`.
6. **Edit:** [components/GenerateVideo.tsx](../components/GenerateVideo.tsx) — replace `result.url` with `result.downloadUrl` at line 370 (download `<a>`). Delete `lastResultUrlRef` ref and all `URL.revokeObjectURL` calls (lines 78, 161, 379).
7. **Edit:** [api/_lib/rateLimit.ts](../api/_lib/rateLimit.ts) — add `'video'` and `'video-poll'` scopes.
8. **Edit:** [vercel.json](../vercel.json) — add `maxDuration: 30` for `api/gemini/video.ts`, `60` for `api/gemini/video/poll.ts`, `60` for `api/cron/cleanup-gemini-videos.ts`. Add `crons: [{ path: '/api/cron/cleanup-gemini-videos', schedule: '0 * * * *' }]`.
9. **Edit:** [.env.example](../.env.example) — no new env vars (re-uses `GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` from Phases 1-3).
10. **No edit:** any other component, any other geminiService function, prompt strings, response schemas, model IDs.

### Verification

1. `npx tsc --noEmit` clean.
2. `npm run dev` — log in, run GenerateVideo with a prompt + startFrame + endFrame on `Veo_3.1_Fast` (cheapest). Confirm Network tab shows `POST /api/gemini/video`, then repeated `POST /api/gemini/video/poll`, then a `GET` to `*.supabase.co/storage/...` for playback. **No** request to `generativelanguage.googleapis.com`.
3. Click download — confirm browser saves the file (cross-origin `download` attribute working via signed-URL `Content-Disposition`).
4. Repeat with `Veo_3.1_Quality` (1080p) — confirm payload size doesn't choke the proxy (>10MB upload to Supabase via `supabaseAdmin`).
5. Anonymous: log out, hit `/api/gemini/video` and `/api/gemini/video/poll` with curl — expect 401 each.
6. Rate limit: rapid-fire 6 generations as a logged-in user — expect 429 with `scope: 'video'` after the 5th (or in the same hour from prior testing). Rapid-fire 70 polls — expect 429 with `scope: 'video-poll'` after the 60th.
7. Cleanup cron: invoke `POST /api/cron/cleanup-gemini-videos` with the cron header → confirm response shape `{ deleted, errors }`. Manually insert an old object to confirm deletion.
8. Bundle inspection: `npm run build` then grep `dist/assets/*.js` for `VITE_GEMINI_API_KEY` — **expect to still find it** until Phase 5 deletes `getAi()`.

### Known limitations (document in code, not in scope to fix)

- **Tab-close mid-render = lost result.** Server-side Veo render continues but no client polls, so the bytes never get downloaded to Supabase. Same as today. Mitigation path is Design 2 (server-managed background job) — defer to P1.
- **Cancel doesn't actually cancel Veo.** Aborting only stops client polling; the $4-6 of API cost is incurred regardless. Same as today. Add `/cancel` if telemetry justifies it.
- **One wasted Veo egress on transient Supabase upload failure.** Each retry re-downloads from Veo before retrying upload. Acceptable for a rare failure mode; not worth buffering inside the handler.
- **`storage_upload_failed` rare-but-real:** Supabase Storage transient 5xx will surface as a user-visible "render failed, try again." Server logs will distinguish from `veo_download_failed` for debugging.
