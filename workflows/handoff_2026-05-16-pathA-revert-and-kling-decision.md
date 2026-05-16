# Handoff — 2026-05-16 (session 2) — Path A reverted, F2 morph fallback shipped, Kling 3.0 decided as next workstream

Branch: `main` HEAD `bc49696`. Working tree clean (untracked screenshots + `.claude/settings.local.json` + `.playwright-mcp/` are non-committable noise). All today's session-2 commits pushed.

## Net effective changes on main vs yesterday (`b1eea35`)

Two technical wins kept; the strategic prompt change (Path A) was Neil-rejected and reverted.

| Commit | What | Status |
|---|---|---|
| `0896ed7` Path A (mouth-closed reactor mode, 3 TUNED regions) | Lip-sync architectural fix attempt | **REVERTED** (`138481c`) |
| `59c8c32` F1 (continuous-motion anchor in OPTION B) | Patch for Path A's static-camera regression | **REVERTED** (`48fd8d6`) |
| `e220fa9` F2 (Scene 01 morph 400 auto-fallback) | Defensive retry without endFrame when Veo Lite 400s | ✅ kept |
| `11f941b` F3 (rate-limit pill explanatory copy) | `· AUTO-RESUMES` suffix + tooltip | ✅ kept |
| `bc49696` F2 patch (detect 502-wrapped Veo 400) | Original F2's `err.status === 400` check never fired because proxy wraps in 502 | ✅ kept |

## What happened this session (in order)

1. **Lip-sync Path A shipped** (`0896ed7`) — 3-region TUNED edit forcing avatar mouth closed across `api/_lib/prompts.ts` `buildStoryboardPrompt` (A1+A2), `services/geminiService.ts` `generateSceneImage` FACE_TO_CAMERA → FACE_TO_CAMERA + MOUTH_CLOSED (B1+B2), and `generateVideoPrompts` OPTION B reactor-mode rewrite (C1). Build green, bundle-leak check clean, single commit.
2. **Live verification on Glossier session** — Scenes 02-05 rendered. Camera motion lost across talking scenes (verbal report; no visual review possible — Playwright MCP was locked on a zombie profile). Avatar perceived as disengaged/dead-eyed by ~2s.
3. **F1 motion-restoration shipped** (`59c8c32`) — 11-word continuous-motion anchor inserted in OPTION B Performance bullet. Theoretical fix based on Explore agent's analysis (script also wasn't visually verified).
4. **Path A architectural concern surfaced** — Neil tested Scene 02 after regenerating Step 6 video prompts. The Gemini-generated Veo prompt was technically clean (camera motion ✓, mouth closed ✓, reaction matched scriptLine emotion ✓) but Neil found the silent reactor pattern *visually wrong* — felt like a regression vs his "previous perfect generations." Original handoff (`b1eea35`) had said *"Camera distance is a visibility multiplier… tight close-up = obvious mismatch; wide shot = barely noticeable."* — Path A applied mouth-closed uniformly across all talking scenes, over-correcting where the lip-sync mismatch wasn't actually broken (medium/wide shots).
5. **Partial revert executed** — Reverted Path A (`138481c`) and F1 (`48fd8d6`), kept F2 + F3. Build green, pushed.
6. **Scene 02 verified post-revert** — Neil confirmed talking-scene lip motion + camera movement both working as before. Pre-Path-A behavior restored.
7. **F2 had a bug** — Scene 01 hook morph still failed post-revert. Actual error: `PROXY_ERROR_502: gemini_error — {"error":{"code":400,"message":"Your use case is currently not supported...","status":"INVALID_ARGUMENT"}}`. The proxy in `api/gemini/video.ts:97` wraps Veo's 400 INVALID_ARGUMENT into a 502 Bad Gateway with the inner error JSON-stringified into `body.detail`. F2's `err.status === 400` check never fired because `err.status` is 502 (the wrapper), and the inner 400 lives in `err.message` as a substring.
8. **F2 patch shipped** (`bc49696`) — Single-line check broadened to match either direct 400 OR `"code":400` / `INVALID_ARGUMENT` substring in `err.message`, still gated on `params.config.lastFrame`.
9. **F2 verified working** — Scene 01 hook now renders via single-frame fallback (endFrame morph is sacrificed). Neil's question: "this means the morph endFrame is effectively dead?" → yes for Veo 3.1 Lite. The error message is Google's: *"Your use case is currently not supported."* — Lite tier doesn't accept startFrame+endFrame. Veo Fast/Quality untested; might or might not support it.

## The architectural decision: Kling 3.0 for hooks + b-rolls, Veo 3.1 Lite for talking avatars

**Neil's call (2026-05-16 session 2 close):** stop trying to make Veo do everything. Route by scene type. This was the *original* intent — see [api/_lib/prompts.ts](../api/_lib/prompts.ts) `generateVideoPrompts` OPTION C already targets `MODEL: Kling O1 (Standard / Frames Mode)`. Veo was the wizard's default only because the Veo API was already wired and Kling wasn't. That convenience is over.

**Target architecture:**

| Scene type (`VideoPrompt.type`) | Renderer | Why |
|---|---|---|
| `talking` (avatar speaking script) | **Veo 3.1 Lite** (current default) | Veo handles speaking avatars well. Lip-sync mismatch on close-ups is a known acceptable tradeoff for v1; defer post-process vendor (Sieve/HeyGen/D-ID) or Vertex migration to post-beta roadmap. |
| `b-roll` (product, hands, environment) | **Kling 3.0** | Kling is documented to handle dual-frame morphs ("Frames Mode") and physics-based VFX. Veo Lite hard-fails on `startFrame+endFrame`, single-frame fallback loses the morph effect. |
| `cinematic` (Cinematic Spec Studio relay) | **Kling 3.0** (already specified in OPTION C; integration was always the intent) | Same Frames Mode requirement; was never wired up. |

## What's pending for the next session (ranked)

### P0 — Kling 3.0 integration (multi-session project)

**Prerequisite (Neil-side, before any code):** Kling 3.0 API account provisioned + API key exported. Without this, even Session A's proxy is untestable. Source: kling.kuaishou.com or kuaishou-developer (need to confirm vendor portal).

**Session A scope (independent, no regression risk to Veo):**

1. **Create `api/kling/video.ts`** — mirror `api/gemini/video.ts` shape (auth → app-level rate-limit → forward → poll). Different request shape than Veo; different polling pattern. Returns same `{ operation }` envelope that `proxyGenerateVideo` expects.
2. **Add `KLING_API_KEY` to env loader** in `vite.config.ts` (no `VITE_` prefix — server-only).
3. **Update `vercelApiDevPlugin`** if dynamic-segment routing needed (per `agent_lessons.md` 2026-05-04 lesson — single-level dynamic-segment support).
4. **Add Kling model spec entries** in `services/geminiService.ts` `VIDEO_MODEL_SPECS` + `VIDEO_MODEL_ROUTING`. Add `provider: 'gemini' | 'kling'` discriminator to the routing table.
5. **Smoke-test in dev** — submit a known-good Kling Frames Mode request via curl or a manual test page. Confirm 200 OK + operation returned + poll completes.

**Session B scope (depends on Session A):**

1. **Update `generateVideo`** in `services/geminiService.ts` — dispatch to Kling proxy if `routing.provider === 'kling'`, normalize response to `GeneratedVideoResult`.
2. **Auto-routing logic** — `RenderAllRunner` reads `seedPrompts[i].type` and picks the model. Default mapping: `talking` → `Veo_3.1_Lite`, `b-roll`/`cinematic` → `Kling_3.0`. Per-scene override still possible (P1 #3 from previous handoff — per-scene model picker UI).
3. **UI surface** — model badge per scene in SCENES rail (small label like `VEO` / `KLING`) so user sees what'll render where.
4. **Regression test** — render a 7-scene Glossier-style storyboard end-to-end: Scene 1 hook (Kling, with endFrame morph), Scenes 2-7 mixed talking (Veo) and b-roll (Kling).

**Session C scope (verify + tune):**

1. Tune Kling cost/duration/resolution defaults to match Veo Lite's per-scene cost profile.
2. Run `gemini-eval` skill regression to confirm wizard outputs (script, storyboard, videoPrompts) still pass after the router change.
3. Add console.log diagnostic line analogous to `[grifon:gv:proxy]` for Kling submits: `[grifon:kling:proxy]`.

### P1 — UI redesign (Higgsfield-style) — still parked from session 1

`components/GenerateVideo/index.tsx` is 1612 lines, has 3 scroll-creators (canvas height + settings accordion + library browser appending below). Engage `grifon-creative-director` skill in a dedicated plan-mode session with the 3 Higgsfield screenshots Neil collected. Pattern: per-module differentiation via LAYOUT STRUCTURE + ICONS, not accent color (DESIGN.md gold-only rule holds). Phasing: design mockup first → code → propagate pattern to InfluencerForge (1217 lines), OfferOptimizer (650 lines).

### P1 — Scene 6 failure investigation (carried from session 1)

Scene 6 failed in the latest Glossier render alongside Scene 1. Neil never captured the dev-console error body. Before planning a fix, surface the exact `[grifon:gv:proxy]` error and `api/gemini/video` HTTP status. Could be transient, content-policy, quota, or a different validation issue. F2's morph-fallback won't help unless Scene 6 also has endFrame (unlikely per storyboard schema).

### P2 — Path A revisit (post-Kling, post-Sieve)

The lip-sync mismatch on Veo close-ups is *deferred*, not solved. Once Kling handles b-rolls and only the *talking close-ups* run on Veo, the visibility-multiplier surface shrinks. Two options for that residual:
- **Path B (post-process vendor)** — Sieve / HeyGen / D-ID overlay on the merged ad. Adds $0.10-0.50/scene + latency, but no Veo prompt edit needed. Defer to post-beta.
- **Path A narrowed** — apply mouth-closed ONLY to scenes flagged close-up. Requires storyboard schema to tag close-ups + the prompt builders to branch. Not recommended without strong evidence the issue is bothering users.

## Critical files & integration anchors for Kling work

**To touch in Kling Session A:**
- [api/_lib/](../api/_lib/) — auth + rate-limit + Kling-specific helpers (`klingAuth.ts`?)
- [api/kling/](../api/kling/) — new directory for `video.ts` (+ `video/poll.ts` if Kling has async polling)
- [services/geminiService.ts](../services/geminiService.ts) — `VIDEO_MODEL_ROUTING` (~line 280), `VIDEO_MODEL_SPECS` (~line 220), `generateVideo` (line 402+), proxy helper (line 133 `proxyGenerateVideo`)
- [vite.config.ts](../vite.config.ts) — env-loader (line 81-97), `vercelApiDevPlugin` resolver
- [.env](../.env) — `KLING_API_KEY` (server-only, no `VITE_` prefix)

**To touch in Kling Session B:**
- [services/geminiService.ts](../services/geminiService.ts) — `generateVideo` dispatcher
- [components/GenerateVideo/RenderAllRunner.ts](../components/GenerateVideo/RenderAllRunner.ts) — auto-routing logic based on `seedPrompts[i].type`
- [components/GenerateVideo/SceneQueue.tsx](../components/GenerateVideo/SceneQueue.tsx) — model badge UI per scene

**TUNED guardrails (do NOT touch in Kling work):**
- Prompt strings, system instructions, response schemas in `services/geminiService.ts` and `api/_lib/prompts.ts`. Provider routing is transport; OPTION A/B/C prompt content is locked.

## Gotchas learned this session (add to agent_lessons.md if not already there)

1. **`api/gemini/video.ts` wraps Veo's 400 INVALID_ARGUMENT into a 502 Bad Gateway response** with the inner error JSON-stringified into `body.detail`. Client-side `err.status` will be 502, not 400. To detect upstream-validation errors, regex the message for `"code":400` / `INVALID_ARGUMENT`. Same wrapping likely applies if Kling proxy follows the same pattern — design the Kling proxy to PASS THROUGH upstream status codes when they're 4xx (client-side recoverable), not wrap in 502.
2. **Veo 3.1 Lite specifically rejects startFrame+endFrame morph mode** with `"Your use case is currently not supported. Please refer to Gemini API documentation for current model offering."` This is a tier limit, not a flag. Veo Fast/Quality untested; may also reject.
3. **Path A's mouth-closed-uniformly mistake** — applying a fix uniformly across all talking scenes when the underlying issue only affects close-ups is over-correction. Same lesson as `agent_lessons.md` 2026-05-09: don't apply outside frameworks (Boris Cherny's "process is dead") to override the user's tuned positioning without their strategic endorsement of the lens itself. Don't over-correct architecturally when the original problem is a visibility-multiplier on a subset.
4. **Playwright MCP can lock on a zombie profile** (`Browser is already in use for C:\Users\Administrator\AppData\Local\ms-playwright\mcp-chrome-351a002`). Cafe-PC with Task Manager blocked means the lock can't be cleared. Defreezer reboot does clear it.

## Cafe-PC reboot reminders

- `npm install` if reboot wiped node_modules
- `npm run dev` (likely :5173)
- `.env` `GEMINI_API_KEY` confirmed; **`KLING_API_KEY` to add when account ready**
- Git identity restore: `powershell -ExecutionPolicy Bypass -File scripts/restore-git-identity.ps1`
- Playwright MCP auto-loads via project-scope `.mcp.json`

## DO NOT (re-litigated this session)

- **Don't re-attempt Path A as a uniform fix.** Neil-rejected, reverted, established as wrong approach.
- **Don't drop the `endFrame` from storyboard schema** as a "simplification" — that breaks Kling's Frames Mode advantage and undoes the original intent.
- **Don't ship a Retry Now button for the rate-limit pill.** F3's tooltip + `AUTO-RESUMES` suffix is the agreed copy-only fix. The 60-min auto-resume is by-design per `agent_lessons.md` 2026-05-13.
- **Don't burn Veo budget on speculative testing without a falsifiable hypothesis.** Today's session burned several dollars verifying Path A's regression then reverting; next session should run integration smoke tests with a curl test against Kling's API directly before plumbing through the React stack.
- **Don't auto-route talking scenes to Kling.** Veo handles speaking avatars better; Kling's strength is VFX/morph, not character performance.
