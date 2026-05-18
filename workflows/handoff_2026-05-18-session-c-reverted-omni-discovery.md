# Handoff — 2026-05-18 evening — Session C reverted, Kling Omni discovery

> **For the next session.** Paste this whole file in as your briefing. Then
> read in order: this file → `agent_lessons.md` → `CLAUDE.md` →
> `UBIQUITOUS_LANGUAGE.md`. Then enter plan mode for the Session D work
> described in the "P0 next" section below.

---

## TL;DR

- **HEAD**: `566de6a` on `origin/main`. Working tree clean. All commits pushed.
- **Effective routing**: hook + b-roll + cinematic → **Kling V3**, talking →
  Veo 3.1 Lite. (Session B+ behavior — Session C reverted.)
- **Kling balance**: ~$9.25 remaining (spent $0.75 across all live tests
  today — $0.25 base64 smoke + $0.25 hook morph + $0.25 attempted O1
  comparison).
- **P0 next**: build the proper Kling Omni proxy + dispatcher branch so
  hook can route to Omni for real.

## Commits that landed tonight

| Commit | What | Status |
|---|---|---|
| `1559142` | feat(kling): Session B dispatcher + RENDER ALL auto-routing + VEO/KLING chip | ✅ pushed, live |
| `3309f47` | fix(kling): Session B+ one-shot JWT refresh on upstream 401 | ✅ pushed, live |
| `6ad1ade` | feat(kling): Session C — hook → Kling O1 + 4 mechanical TUNED prompt cleanups | ⚠️ shipped then reverted |
| `566de6a` | Revert "Session C" — Omni wiring was wrong (see below) | ✅ pushed, live |

## What Session C tried and why we reverted

Session C wired hook → Kling O1 using `model_name: 'kling-v1-6'` on the
existing `/api/kling/video` proxy (which targets `/v1/videos/image2video`
upstream). Also bundled 4 mechanical TUNED text replacements in
`generateVideoPrompts` (dropping wasted audio direction for b-roll +
updating 3 stale "KLING O1/v2.6" references to "KLING 3.0").

The official Kling docs at
https://kling.ai/document-api/apiReference/model/OmniVideo revealed three
problems with the routing:

1. **Wrong model name** — Omni's enum is `kling-video-o1` (Omni O1) or
   `kling-v3-omni` (V3 Omni). `kling-v1-6` doesn't exist.
2. **Wrong endpoint** — Omni lives at `POST /v1/videos/omni-video`, NOT the
   image2video endpoint our existing proxy targets.
3. **Wrong body shape** — Omni takes `image_list: [{image_url, type:
   'first_frame' | 'end_frame'}]` (array of tagged objects), not the flat
   `image` + `image_tail` string fields image2video uses.

First live render of hook would have 4xx'd. Cost on the wrong-model 4xx
would have been $0 (rejected pre-render), but the UX of "your hook scene
just failed" is worse than holding back the routing change until we have
the proper proxy.

The 4 TUNED prompt text fixes from Session C reverted with the rest. They
were factually correct individually (e.g. audio direction IS wasted on
Kling) but bundled with the broken routing commit. **Re-apply them as
part of Session D** so they live in the same commit as the new routing
they describe.

## What we now know about Kling Omni (from the official docs)

- **Endpoint**: `POST /v1/videos/omni-video` (NOT `/v1/videos/image2video`)
- **Auth**: same HS256 JWT, same `Authorization: Bearer <jwt>` header,
  same TTL semantics — the proxy auth helper at
  [api/_lib/klingAuth.ts](../api/_lib/klingAuth.ts) works as-is
- **Model name enum**: `kling-video-o1` (Omni O1, what we tested as "winner
  for hook drama") OR `kling-v3-omni` (V3 Omni variant; different from
  `kling-v3` image2video)
- **Frames**: `image_list` is an array of `{image_url, type?:
  'first_frame' | 'end_frame'}` objects. `image_url` accepts either a URL
  or **raw base64** (no `data:image/jpeg;base64,` prefix — confirmed by
  Phase 2a smoke for image2video, very likely same for Omni)
- **Duration enum**: `'3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' |
  '11' | '12' | '13' | '14' | '15'` — **3s IS valid on Omni**. Neil asked
  about a cheap 3s hook earlier today; Omni unlocks it.
- **Mode enum**: `'std'` (720p) | `'pro'` (1080p) | `'4k'` (4K). Default
  `pro` per docs. We default `std` for cost.
- **Audio**: `sound: 'on' | 'off'`, default `'off'`. **Omni CAN generate
  audio** — Veo is no longer the only option for synced audio.
- **Aspect ratio**: `'16:9' | '9:16' | '1:1'`. Required only when not
  using first_frame reference.
- **Image constraints**: jpg/jpeg/png, ≤10MB, min 300px, aspect 1:2.5 to
  2.5:1. Same as image2video.
- **Multi-shot, element_list, video_list**: Omni's advanced features —
  skip in Session D, add later if useful
- **Response shape**: same envelope as image2video (`{code, message,
  request_id, data: {task_id, task_status, ...}}`). The poll endpoint
  is `GET /v1/videos/omni-video/{task_id}` — same pattern, different path
- **Example body** from docs:
  ```json
  {
    "model_name": "kling-video-o1",
    "prompt": "Make the person in <<<image_1>>> wave to the camera",
    "image_list": [{"image_url": "..."}],
    "duration": "5",
    "mode": "pro",
    "aspect_ratio": "16:9"
  }
  ```

## P0 next — Session D scope (Kling Omni proxy + routing)

**Goal**: hook (scene 0, type b-roll) routes to Kling Omni O1 for real.
Regular b-roll + cinematic stay on Kling V3 (image2video). Talking stays
on Veo.

**Architecture decision recommendation**: keep image2video and Omni as
**separate proxies**, not a unified one. The body shapes diverge enough
that branching inside one proxy would be ugly. New files:

- `api/kling/omni-video.ts` — POST handler, similar shape to
  [api/kling/video.ts](../api/kling/video.ts) but builds the Omni body
  (image_list array, optional sound/4k/3s)
- `api/kling/omni-video/poll.ts` — mirrors
  [api/kling/video/poll.ts](../api/kling/video/poll.ts), different upstream
  GET path (`/v1/videos/omni-video/{task_id}`), same Supabase Storage
  upload + signed URL pattern

**Service layer** ([services/geminiService.ts](../services/geminiService.ts)):

- New `proxyGenerateKlingOmniVideo` helper next to
  `proxyGenerateKlingVideo` — POSTs to `/api/kling/omni-video` with the
  Omni body shape
- Extend `proxyPollVideoOperation` polymorphism to route to
  `/api/kling/omni-video/poll` when the operation came from Omni. Simplest
  discriminator: `metadata.model === 'Kling_O1'`. Falls into the existing
  `provider === 'kling'` branch with a sub-discriminator.
- New `KLING_O1` constant — **use `kling-video-o1`** (the actual API name,
  not the guessed `kling-v1-6`)
- New `Kling_O1` entries in `VIDEO_MODEL_SPECS` (durations `[3, 4, 5, 6,
  7, 8, 9, 10]` — pick a sensible subset, `aspectRatios: ['9:16', '16:9',
  '1:1']`) and `VIDEO_MODEL_ROUTING` (`modelId: 'kling-video-o1', provider:
  'kling'`)
- Dispatcher branch in `generateVideo`: when `routing.provider === 'kling'`
  AND model is Omni, build the Omni body (image_list array shape, optional
  sound/mode) and call `proxyGenerateKlingOmniVideo`. Otherwise existing
  V3 image2video path.

**Runner + UI** (unchanged from Session C plan, just re-applied):

- `autoRouteModelForType` at
  [components/GenerateVideo/RenderAllRunner.ts:36](../components/GenerateVideo/RenderAllRunner.ts#L36)
  gains optional `sceneIdx` param; special-case `sceneIdx === 0 && type
  === 'b-roll'` → `Kling_O1`
- `index.tsx` callers pass scene index
- `Kling_O1` to `ACTIVE_MODELS` at
  [components/GenerateVideo/index.tsx:78](../components/GenerateVideo/index.tsx#L78)
- `types.ts` `VideoModelType` union gains `'Kling_O1'`

**TUNED prompt cleanups** (re-apply Session C's P1-P4 in the same commit
as the new routing):

- P1: line 1608 REGULAR B-ROLL DIRECTIVE — strip wasted audio direction
- P2: line 1624 OPTION C cinematic MODEL — "Kling O1 (Standard / Frames
  Mode)" → "Kling 3.0 (Frames Mode)"
- P3: line 1574 Temu "VFX TRANSITION PROTOCOL (KLING O1/v2.6)" → "(KLING
  3.0)"
- P4: line 1626 OPTION C PROMPT STRUCTURE — "Kling O1 model" → "Kling 3.0
  model"

These are TUNED text replacements (Neil pre-approved tonight). Verify the
exact line numbers by grep first — Session C reverted but line counts may
have shifted from edits to neighboring blocks.

## Open questions to resolve in Session D plan-mode

1. **Which Omni variant for hook — `kling-video-o1` or `kling-v3-omni`?**
   Default to O1 because Neil's side-by-side test tonight showed O1's
   morph as more ad-impactful. `kling-v3-omni` worth a future $0.25
   smoke test, but not in scope for Session D.
2. **Should Omni accept data URLs or pre-uploaded URLs for the frames?**
   Image2video accepts raw base64 (Phase 2a smoke proved it). Omni docs
   say "Base64 OR URL" but don't clarify if data-URL prefix is OK or
   raw-only. Cheapest path: pretend it's the same as image2video (strip
   data-URL prefix), wrap one `image_url` per frame in the array. If
   Omni rejects, use the Phase 2a smoke script pattern to verify with
   a $0.25 test render.
3. **Should we expose duration `3` in the UI for hook scenes only?**
   Cost saving is real ($0.25 → maybe $0.15-0.18 at 3s std). Trade-off:
   3s hooks may feel rushed. Recommend: keep `5` as default; expose `3`
   later as a per-scene duration override (Session E).
4. **Should we expose `sound: 'on'` for hook scenes?** Hook usually has
   zero dialogue (it's visual + on-screen text). Letting Omni generate
   ambient SFX might add drama. But conflicts with the SignalModulator
   voiceover workflow downstream. Recommend: leave `sound: 'off'` for
   Session D; revisit if Neil wants to test it.
5. **Mode default for hook — `std` or `pro`?** Omni docs default `pro`
   (1080p). Cost difference unknown until we test. Recommend `std`
   initially to match V3 default; bump to `pro` if hook quality at 720p
   looks soft on a vertical phone screen.
6. **`api.klingai.com` vs `api-singapore.klingai.com`?** Omni docs use
   the Singapore subdomain in the curl example. Our existing image2video
   proxy uses `api.klingai.com`. Probably both work. Worth confirming
   during Session D smoke.

## DO NOT (Session D)

- **Don't try to wedge Omni through the image2video proxy.** It's a
  separate API surface; pretending otherwise was the Session C mistake.
- **Don't use `kling-v1-6` as the model name.** It was a guess that
  doesn't exist in any Kling docs. Use `kling-video-o1`.
- **Don't bundle TUNED prompt edits with proxy work unless explicitly
  approved per-edit by Neil** (CLAUDE.md TUNED guardrail; agent_lessons
  2026-05-09). Session C had this approval; Session D re-applies the
  same 4 edits AS PART OF the proxy commit — but if the scope expands,
  pull prompt edits into their own commit.
- **Don't add Omni's advanced features** (multi_shot, element_list,
  video_list) in Session D. They're powerful but every new field is a
  new failure mode. Ship the basic frame-anchored render first.
- **Don't reintroduce the 502-wrap-of-4xx pattern** in the Omni proxy.
  Pass through 4xx by design (Session A architectural decision; lets
  the client detect "model_name invalid" as a clean 400, not a 502).
- **Don't burn the Kling balance on speculative tests.** Falsifiable
  hypothesis or no spend. Session A+B+C total spent $0.75 of $10.

## Critical files for Session D

| File | Action |
|---|---|
| `api/kling/omni-video.ts` | **NEW** — POST proxy for Omni (mirror api/kling/video.ts) |
| `api/kling/omni-video/poll.ts` | **NEW** — GET poll proxy for Omni (mirror api/kling/video/poll.ts) |
| `api/_lib/klingAuth.ts` | No change — JWT helper is generic |
| `services/geminiService.ts` | Add `KLING_O1` constant, `Kling_O1` SPECS + ROUTING entries, `proxyGenerateKlingOmniVideo` helper, polymorphic dispatch in `generateVideo`, polymorphic poll in `proxyPollVideoOperation`, P1-P4 prompt fixes |
| `components/GenerateVideo/RenderAllRunner.ts` | `autoRouteModelForType` gains `sceneIdx` |
| `components/GenerateVideo/index.tsx` | Caller updates + `Kling_O1` in `ACTIVE_MODELS` |
| `types.ts` | `'Kling_O1'` in `VideoModelType` union |

## Verification plan for Session D

1. **Static**: `npx tsc --noEmit` exit 0, `npm run build` green, bundle
   leak grep returns 0
2. **Wiring smoke** (no spend): `npm run dev`, hit `/api/kling/omni-video`
   with no auth → expect 401; with bad bearer → 401 invalid_token; with
   GET → 405 method_not_allowed
3. **Live hook render** ($0.25 budget, ~$9.25 remaining post-test):
   pick `Kling O1` in single-scene picker, render with start frame only.
   Watch Network tab for `model_name: 'kling-video-o1'`. Confirm Omni
   endpoint reached.
4. **RENDER ALL with mixed scenes** ($1-2 budget): 1 hook + 3 b-roll
   + 1 talking storyboard. Verify scene 0 hits Omni endpoint, scenes
   1-3 hit image2video endpoint, scene 4 hits Veo endpoint.

## What's already working and DON'T touch

- **JWT refresh** (Session B+) — one-shot 401 retry in
  [api/kling/video.ts](../api/kling/video.ts) +
  [api/kling/video/poll.ts](../api/kling/video/poll.ts). Working as
  designed.
- **F2 morph-fallback** at
  [services/geminiService.ts:444-456](../services/geminiService.ts#L444-L456)
  — kept for Veo morph cases (rare since b-roll now goes Kling, but
  still kicks in if user manually picks Veo for a morph). Don't delete
  in Session D.
- **Crown-jewel prompt registry** at
  [api/_lib/prompts.ts](../api/_lib/prompts.ts) — TUNED, never touch
  without Neil approval (CLAUDE.md hard rule).
- **MarketMind output schema** — load-bearing for multiple downstream
  consumers (CLAUDE.md services/CLAUDE.md hard rule).

## Cafe-PC reboot reminders

- `npm install` if `node_modules` wiped
- `npm run dev` (likely `:5173`) — Vite middleware serves api/* through
  `vercelApiDevPlugin`
- `.env` keys to confirm: `GEMINI_API_KEY`, `KLING_ACCESS_KEY`,
  `KLING_SECRET_KEY`, `ELEVEN_LABS_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `VITE_PAYMONGO_PUBLIC_KEY`. All
  survive in `.env` (gitignored, NOT wiped by Git but wiped by defreezer).
- If `.env` is empty after reboot, paste keys from password manager.
  `.env.example` documents the var names.
- Git identity restore: `powershell -ExecutionPolicy Bypass -File scripts/restore-git-identity.ps1`
- `.tmp/` contents (including `.tmp/kling-smoke.mjs`,
  `.tmp/kling-smoke-base64.mjs`, `.tmp/kling-smoke-notes.md`,
  `.tmp/compare.html`, `.tmp/range-server.cjs`) gone after reboot.
  This handoff is the persistent reference.
- Playwright MCP auto-loads via project-scope `.mcp.json`. Useful for
  inspecting rendered video frames (works around Read tool not supporting
  MP4 — fetch via local Range-capable static server, navigate via
  Playwright, screenshot frames, view as PNG).

## How Neil should pick up next session

1. `cd c:\Users\Administrator\Desktop\grifon-command`
2. `git log -3 --oneline` — confirm HEAD is `566de6a`
3. `npm run dev` to bring up the dev server
4. Open a fresh Claude session, paste this whole handoff doc as the
   opening message
5. Tell Claude: "Enter plan mode for Session D — build the Kling Omni
   proxy + dispatcher per the P0 section. Use grill-me skill, it's
   multi-layer."
6. Approve the plan, approve the goal, then live-test
