# Handoff — 2026-05-18 — Kling 3.0 Session A shipped (proxy + registry, no UI plumbing)

Branch: `main` HEAD `f7af50b`. Working tree clean. All today's commits pushed to origin/main.

Continues from `handoff_2026-05-16-pathA-revert-and-kling-decision.md` — that handoff's P0 ("Kling 3.0 integration, Session A scope") is the work this one closes.

## Commits landed today

| Commit | What | Status |
|---|---|---|
| `238e43f` chore(env): document KLING_ACCESS_KEY + KLING_SECRET_KEY | `.env.example` placeholders so future sessions know what to populate before running proxy code | ✅ pushed |
| `f7af50b` feat(kling): image2video Frames Mode proxy + registry unlock | 3 new files (`api/_lib/klingAuth.ts`, `api/kling/video.ts`, `api/kling/video/poll.ts`) + surgical edits to `services/geminiService.ts` (`VIDEO_MODEL_ROUTING` provider field, `Kling_3_0` unlock) | ✅ pushed |

Total: 4 files changed, 442 insertions, 9 deletions.

## What Phase 1 (direct API smoke) proved

Falsifiable hypothesis: "Kling 3.0 Frames Mode (`image` + `image_tail`) renders an MP4 via `api.klingai.com`."

Result: **PASS.** Cost: **$0.25 (3 credits)** for one 5s `std` render at 9:16. Wallclock: ~60s from submit through `task_status === "succeed"`.

The smoke proved end-to-end:

1. **Auth:** HS256 JWT signed with `KLING_SECRET_KEY`, payload `{ iss: <KLING_ACCESS_KEY>, exp: now+1800, nbf: now-5 }`, sent as `Authorization: Bearer <jwt>`. Token TTL 30min.
2. **Submit endpoint:** `POST https://api.klingai.com/v1/videos/image2video`. Request body (verbatim shape that worked):
   ```json
   {
     "model_name": "kling-v3",
     "image": "<URL or data URL>",
     "image_tail": "<URL or data URL>",
     "prompt": "<string>",
     "duration": "5",
     "mode": "std",
     "aspect_ratio": "9:16",
     "cfg_scale": 0.5
   }
   ```
   Notes: `duration` is a STRING. `image` accepts public URLs; base64 not yet tested (open question).
3. **Submit response envelope:** `{ code: 0, message: "SUCCEED", request_id, data: { task_id, task_status: "submitted", created_at, updated_at } }`. Submit latency ~744ms.
4. **Poll endpoint:** `GET https://api.klingai.com/v1/videos/image2video/{task_id}`. Status cycles `submitted → processing → succeed | failed`. Recommend 10s poll interval.
5. **Success response:** `data.task_result.videos[0]` = `{ id, url, duration }`. `data.final_unit_deduction` reports credits charged (e.g., `"3"` for the 5s std smoke).
6. **MP4 URL characteristics:** HTTP 200 `video/mp4`, ~4MB for 5s 9:16, signed Akamai CDN URL with 30-day cache header. **URL expires** — Kling does not host indefinitely. This is why the poll proxy uploads to Supabase Storage immediately (mirrors Veo poll).

## Architectural decisions baked into the proxy

These are non-obvious calls; revisit only with deliberate justification.

1. **PASS THROUGH upstream 4xx status codes** in `api/kling/video.ts`. The Gemini proxy at `api/gemini/video.ts:97` wraps Veo's 400 INVALID_ARGUMENT into a 502 Bad Gateway, which broke F2's `err.status === 400` check this past 2026-05-16. The Kling proxy is the architectural correction: 4xx from Kling stays 4xx to the client so F2-style detection patterns work cleanly.

2. **HTTP 429 + envelope code 1102 → return HTTP 402 `kling_balance_exhausted`.** Kling overloads HTTP 429 for both rate-limit AND balance-exhausted, distinguished only by envelope `code`. Surfacing balance-exhausted as a 429 would route it into the `RenderAllRunner` queue's 60min auto-retry — wrong UX. Returning 402 (Payment Required) is the honest mapping; Session B's UI can show "Top up at klingai.com." See `agent_lessons.md` 2026-05-18 entry.

3. **Upstream 401 → wrap as 502 `kling_auth_failed`.** Kling returning 401 means OUR JWT was rejected (clock drift, signing bug, rotated AK/SK). Passing 401 to the client would trigger the proxyCall 401-refresh path at `services/geminiService.ts:73-126`, which is Supabase auth — wrong layer. Wrap as 502 so the client knows it's our infra problem, not their session problem.

4. **Reuse `gemini-videos` Supabase bucket for Kling renders.** The name is now a misnomer but renaming requires migrating existing Veo renders + path rewrites in library code. P3 cleanup ticket recommended; do not expand Session A scope to handle it.

5. **`provider: 'gemini' | 'kling'` discriminator in `VIDEO_MODEL_ROUTING` is DATA ONLY in Session A.** No consumer reads it yet. Session B's job is to wire `generateVideo` to branch on `routing.provider === 'kling'` and dispatch to `/api/kling/video` instead of `/api/gemini/video`. Keeping the consumer unchanged in Session A is what made it zero-Veo-regression.

## What's verified vs deferred

**Verified statically (no Kling credit spent beyond Phase 1's $0.25):**
- `npm run build` exit 0 (tsc + vite production both pass)
- Bundle leak: `grep -c "KLING_SECRET_KEY\|KLING_ACCESS_KEY\|api.klingai.com" dist/assets/*.js` → 0 across all chunks
- Wiring smoke on `:5173`: both `/api/kling/video` and `/api/kling/video/poll` return 401 `missing_bearer_token` (no auth) / 401 `invalid_token` (bad bearer) / 405 `method_not_allowed` (GET)
- Veo regression-free by diff inspection: `proxyGenerateVideo`, `proxyPollVideoOperation`, `generateVideo`, and the F2 morph-fallback regex at `services/geminiService.ts:444-456` are byte-identical to pre-Session-A

**Deferred to Session B (requires Supabase auth ceremony naturally exercised by UI):**
- POST `/api/kling/video` with real bearer + Phase-1 body shape → expect `{ operation: { task_id } }` (200)
- POST `/api/kling/video/poll` with that task_id → eventually `{ done: true, url, downloadUrl, mimeType }` pointing at Supabase Storage
- Intentional 4xx test: invalid `model_name` → confirm proxy passes through HTTP 400 (NOT 502)
- Balance-vs-rate-limit distinction: requires reproducing each scenario

Rationale for deferral: Phase 1 already proved the underlying Kling integration with the same JWT/endpoint/body shape the proxy uses. The proxy is a mechanical pass-through. Session B will exercise the full stack naturally when the dispatcher flips, making a synthetic auth-ceremony test in Session A throwaway work.

## Open questions for Session B planning

1. **Does Kling accept base64 `image` / `image_tail` inputs, or only URLs?** Phase 1 used picsum URLs successfully. The wizard's `endFrameImageUrl` / `startFrame` fields store data URLs (`data:image/png;base64,...`). If Kling rejects base64, Session B needs an extra step: upload the storyboard frames to public storage (Supabase signed URL?) before submitting to Kling. Test before plumbing.

2. **Per-scene render time variance for `pro` mode + 10s duration.** Phase 1 measured ~50s for 5s `std`. `pro` mode and 10s renders may take 90s–3min. Vercel's 60s ceiling does NOT apply to the proxy (it's a fast pass-through; the actual render happens upstream); confirms client-side `pollUntilDone` is the right place to bound waiting.

3. **`VIDEO_MODEL_SPECS.Kling_3_0` capability data accuracy.** Currently declares `durations: [5, 10]`, `resolutions: ['720p', '1080p']`, `aspectRatios: ['9:16', '16:9', '1:1']`, `supportsAudio: false`. Unverified against actual Kling V3 API. Session B should test 10s + each aspect ratio before relying on the spec for UI gating.

4. **What's the right `mode` default — `std` or `pro`?** Kling docs and our pricing screenshot show `pro` is ~35% more expensive but unclear by how much it improves output. Decision: leave the proxy accepting either; let the wizard / RenderAllRunner choose. Probably `std` for the regression test, `pro` exposed as a per-scene override.

## Session B scope (separate plan-mode session recommended)

1. **`generateVideo` dispatcher branch.** In `services/geminiService.ts` (around line 402), after the `routing` lookup, branch on `routing.provider === 'kling'`. Build Kling-shaped body (`model_name`, `image`, `image_tail`, snake_case `aspect_ratio`, string `duration`, `mode`) and POST to `/api/kling/video` via a new `proxyGenerateKlingVideo` helper. Keep `proxyPollVideoOperation` polymorphic — switch endpoint based on the persisted operation envelope shape.

2. **`RenderAllRunner` auto-routing.** Read `seedPrompts[i].type` (already typed `'talking' | 'b-roll' | 'cinematic'` at `types.ts:73-77`). Default mapping: `talking` → `Veo_3.1_Lite`, `b-roll` → `Kling_3_0`, `cinematic` → `Kling_3_0`. Per-scene override still possible.

3. **SCENES rail UI: per-scene model badge.** Small `VEO` / `KLING` chip beside each scene so the user sees what'll render where. Component in `components/GenerateVideo/SceneQueue.tsx` or wherever the rail lives.

4. **F2 morph-fallback retirement candidate.** After Session B routes morph scenes to Kling, the F2 fallback at `services/geminiService.ts:444-456` becomes dead code for the morph use case (Kling supports `image_tail` natively). Don't delete in Session B — keep through one regression cycle. Retire in Session C if no regressions surface.

5. **Live regression test budget.** Plan ~$2-5 of Kling balance for Session B integration testing: 5-10 b-roll + cinematic renders to cover edge cases (different aspect ratios, durations, both modes, intentional-failure scenarios). User has ~$9.75 remaining after Phase 1.

## Critical files map for Session B

| File | Today's state | Session B touches |
|---|---|---|
| `api/_lib/klingAuth.ts` | ✅ shipped | none |
| `api/kling/video.ts` | ✅ shipped | none unless new params surface |
| `api/kling/video/poll.ts` | ✅ shipped | none |
| `services/geminiService.ts` | ✅ `VIDEO_MODEL_ROUTING` + `Kling_3_0` spec updated | edit `generateVideo` dispatcher + `proxyGenerateKlingVideo` helper |
| `components/GenerateVideo/RenderAllRunner.ts` | unchanged | auto-routing logic from `seedPrompts[i].type` |
| `components/GenerateVideo/SceneQueue.tsx` | unchanged | per-scene model badge UI |
| `types.ts` | unchanged | `VideoPrompt.type` already typed |

## TUNED guardrails (do NOT touch in Session B)

- Prompt strings, system instructions, response schemas in `services/geminiService.ts` and `api/_lib/prompts.ts`
- F2 morph-fallback at `services/geminiService.ts:444-456` (keep through one regression cycle, retire in Session C if clean)
- `gemini-videos` Supabase bucket name (P3 cleanup, separate ticket)
- The `provider` field's literal value strings (`'gemini'`, `'kling'`) — consumers will match them

## Cafe-PC reboot reminders

- `npm install` if `node_modules` wiped
- `npm run dev` (likely `:5173`)
- `.env` keys to confirm: `GEMINI_API_KEY`, `KLING_ACCESS_KEY`, `KLING_SECRET_KEY`, `ELEVEN_LABS_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — these survive in `.env` (gitignored, not wiped by Git but wiped by defreezer)
- If `.env` is empty after reboot, paste keys from password manager — `.env.example` documents the var names
- Git identity restore: `powershell -ExecutionPolicy Bypass -File scripts/restore-git-identity.ps1`
- `.tmp/` contents (including `.tmp/kling-smoke.mjs` and `.tmp/kling-smoke-notes.md`) gone after reboot — this handoff is the persistent reference

## DO NOT (for Session B)

- **Don't reintroduce the 502-wrap-of-4xx pattern.** Kling proxy passes through 4xx by design; this is the whole point of Session A's architectural deviation.
- **Don't auto-route `talking` scenes to Kling.** Veo handles speaking avatars better; Kling's strength is VFX/morph for b-rolls and cinematic. Established 2026-05-16 architectural decision.
- **Don't drop `endFrame` from the storyboard schema** as a "now that we have Kling we can simplify" — Kling's `image_tail` is the consumer for that exact field.
- **Don't delete the F2 morph-fallback** in Session B. Keep one regression cycle of safety net.
- **Don't burn the remaining Kling balance on speculative testing.** Session B integration testing budget is ~$2-5; smoke tests should have falsifiable hypotheses.
- **Don't edit prompt content in `api/_lib/prompts.ts` or `services/geminiService.ts`** without explicit Neil approval (TUNED guardrail, `agent_lessons.md` 2026-05-09; load `.claude/skills/surgical-edit` before any edit to either file).
