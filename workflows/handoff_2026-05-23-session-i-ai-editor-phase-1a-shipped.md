# Session I handoff — 2026-05-23 — AI Editor Phase 1a Shipped

> **TL;DR.** Phase 1a of the Remotion AI Editor PRD shipped as commit
> `6f2eb66` on `main` (local, **not yet pushed**). Stub brain + types + UI
> handoff + 4 schema tests. Build clean, new test 4/4 green. Pre-existing
> 10 test failures from the crown-jewel migration are flagged for follow-up.
> **Next recommended:** Phase 1b — draft the real Gemini brain prompt for
> Neil's TUNED-file sign-off before replacing the stub.

---

## Session arc

1. **Start:** Neil resumed yesterday's session-H handoff (intended target: Fix 2 — strip audio/SFX from `generateVideoPrompts`).
2. **Pivot:** Neil redirected to scoping the Remotion AI Editor. Plan-mode triggered. Three Explore agents ran in parallel (EditVideo audit, Signal Modulator voice mechanism, RENDER ALL pipeline state).
3. **Design correction (load-bearing):** Neil clarified his pre-app workflow — Veo/Kling native audio on talking-head scenes → ElevenLabs STS swaps timbre while preserving prosody/timing → **lipsync survives**. TTS would destroy lipsync. The current pipeline (Gemini API, `supportsAudio:false`, ScenePipelineTile = TTS only) breaks this workflow.
4. **Hard block discovered:** Gemini API backend strips `generateAudio` ([`services/geminiService.ts:312, :590`](../services/geminiService.ts)). Veo audio with lipsync requires **Vertex AI**, not Gemini API. This becomes **Phase 0** — a prerequisite for the workflow Neil described.
5. **Plan + goal approved** (plan file at `.claude/plans/now-our-next-goal-generic-thunder.md` — ephemeral, content mirrored below).
6. **Phase 1a slice executed** — types, stub brain, state, UI handoff, BatchEditMode, schema tests.
7. **Mid-execution scope patch:** 10 pre-existing test failures discovered (crown-jewel migration left `geminiService.schemas.test.ts` asserting on prompt strings that moved server-side). Goal scope patched with Neil's OK to accept "new test + build clean" as completion.
8. **Commit `6f2eb66` landed on `main` locally.** Not pushed.

---

## What's in commit `6f2eb66` (+751 / −9, 7 files)

| File | Change |
|---|---|
| [`types.ts`](../types.ts) | New types: `EditDecisionInput`, `EditDecisionList`, `EditScene`, `OverlayText`, `SfxCue`, `SfxBankId`, `TransitionType`, `CameraEffect`, `OverlayStyle`, `OverlayPosition`, `EditTargetPlatform`. Closed-vocabulary unions so downstream Remotion can rely on a fixed grammar. |
| [`services/geminiService.ts`](../services/geminiService.ts) | New `generateEditDecisionList(input)` **STUB** returning a deterministic fixture EDL seeded from the input batch. **Zero edits** to prompts/schemas/model IDs of existing TUNED flows. Also exports `SFX_BANK` constant. |
| [`App.tsx`](../App.tsx) | New `editorBatch` state `{sceneBatch, audioOverlays, aspectRatio, finalScript}`; threaded to SignalModulator (handoff source) and EditVideo (consumer). |
| [`components/SignalModulator/index.tsx`](../components/SignalModulator/index.tsx) + [`ScenePipelineTile.tsx`](../components/SignalModulator/ScenePipelineTile.tsx) | `onSendToAiEditor` prop; new "SEND TO AI EDITOR ↗" ghost button appears alongside DOWNLOAD ALL once the Scene Pipeline batch completes. Scissors icon. |
| [`components/EditVideo.tsx`](../components/EditVideo.tsx) | New `BatchEditMode` sub-component: structured EDL preview with meta block, per-scene timeline tiles with overlay-text labels + SFX cue pills, formula check, global SFX picks, EDL JSON export. Existing manual mode (script + screenshots + prose plan) **untouched** — fallback path when no `editorBatch` prop. |
| [`tests/unit/edit-decision-list.test.ts`](../tests/unit/edit-decision-list.test.ts) | NEW — 4 schema tests (TikTok / IG square / YouTube short fixtures + audioOverlays sceneIdx-ordering invariant). All passing. |

**Verification record:**
- `tsc && vite build` → clean.
- `vitest run tests/unit/edit-decision-list.test.ts` → 4/4 passing.
- Full `npm test` → 10 pre-existing failures (NOT this slice — see "Stale tests" section below).

---

## Carry-forward (NOT done yet, in priority order)

### 0. Push the commit
**Risk:** the cafe-PC defreezer wipes `C:\Users\Administrator\` on reboot — local repo and unpushed commits die. CLAUDE.md is explicit: "Only the GitHub repo persists across sessions." `6f2eb66` survives `/clear` (conversation-level only) but dies on reboot if not pushed. **First action of next session if not already done.**

### 1. Manual UI smoke test
Run `npm run dev`, open `/app`, load a wizard state through RENDER ALL → Signal Modulator → click "SEND TO AI EDITOR ↗" once the batch completes → confirm `BatchEditMode` renders the stub EDL preview without console errors. Validate "EXPORT EDL JSON" downloads a valid JSON file. (Optional but high-value before Phase 1b.)

### 2. Phase 1b — Real Gemini brain prompt
Replace the stub body of `generateEditDecisionList` with a real `proxyGenerateContent` call. **TUNED-file work** — drafting the prompt requires Neil's explicit sign-off per [`services/CLAUDE.md`](../services/CLAUDE.md) hard rules and the [`agent_lessons.md`](../agent_lessons.md) 2026-05-09 entry.

Workflow:
- (a) Read the current stub at [`services/geminiService.ts`](../services/geminiService.ts) (search for `generateEditDecisionList`).
- (b) Draft the prompt as a **separate text document** for Neil to review. Include: role framing (MrBeast + Sabri Suby content strategist), input contract (sceneBatch with video URLs + audio overlays + script), output contract (JSON matching `EditDecisionList` schema with closed SFX/transition/camera vocabularies), formula rules (hook in 3s, dynamic camera on talking, 4th-grade overlays, etc.), and explicit "no inventing SFX IDs outside `SFX_BANK`" constraint.
- (c) Wait for Neil's edit / approval / rejection. **Do not edit code until approved.**
- (d) Apply the approved prompt. Set `responseMimeType: 'application/json'`, declare `responseSchema` matching the `EditDecisionList` shape, use `researchTextModel` (`gemini-3.1-pro-preview`) for video multimodal input.
- (e) Verify schema test still passes (it should — the test asserts schema, not stub-specific values).
- (f) Run `gemini-eval` skill against the EDL output on a real fixture (Glossier Soothing Face Mist from session H). Expect: zero Critical findings.
- (g) Commit with `feat(ai-editor): Phase 1b — real EDL brain` prefix.

### 3. Phase 0 — Vertex AI migration (parallel-track infra work)
Restores Veo native audio so STS can preserve lipsync. Steps in plan doc (mirrored below in "Architecture roadmap"). GCP onboarding can take 2–5 business days; **start now** even if Phase 1b ships first.

### 4. Original Fix 2 from session-H handoff
Still pending. Strip audio/SFX directives from `generateVideoPrompts` in [`services/geminiService.ts`](../services/geminiService.ts) — causes a stray sparkle/light-streak VFX in talking-head renders because the silent video model renders the "sparkle SFX" instruction as visual sparkles. Already fully grilled in session H; an exact 7-item edit spec exists in [`handoff_2026-05-22-session-h-render-all-verified-and-fixes.md`](handoff_2026-05-22-session-h-render-all-verified-and-fixes.md). **TUNED file — needs Neil's sign-off on the diff before applying.** After Phase 0 lands, this fix becomes even more important (because the AI's "SFX" instructions would then actually become audio that conflicts with overlaid SFX).

### 5. Phase 2 — Remotion Lambda executor
**Separate `grill-me` PRD session.** Greenfield: install `@remotion/cli`, `@remotion/renderer`, `@remotion/lambda`; build `compositions/AdEditor.tsx`; AWS Lambda site + render function + S3 output bucket; curate ~10 royalty-free SFX files in `public/sfx/`. Locked at Tier A — Lean MVP. Out of scope until Phase 1b + Phase 0 are done.

### 6. Stale-test cleanup
The 10 pre-existing failures in `tests/unit/geminiService.schemas.test.ts` (9) and `tests/unit/geminiService.proxy.test.ts` (1) need either deletion, `.skip()` with TODO, or rewrite against `api/_lib/prompts.ts`. Tracked separately — do NOT block ai-editor work on this.

---

## Architecture roadmap (mirror of the ephemeral plan file)

### Phase 0 — Restore Veo Audio (PREREQUISITE for STS lipsync)
- **Spike first (cheap):** test Kling V3 with `sound: 'on'` for one talking-head scene. Most likely Kling produces music/ambient, not lipsynced dialog. ~30 min spike saves 1–2 weeks if it surprises us.
- **If Kling fails:** Vertex AI migration. New `api/_lib/vertex.ts` client. Branch in `api/gemini/video.ts`: if `type === 'talking'` AND `generateAudio === true`, route to Vertex. Flip `supportsAudio: true` on Veo Quality/Fast variants in [`services/geminiService.ts`](../services/geminiService.ts) lines 312, 328, 343, 358, 373, 388, 403 (TUNED — Neil sign-off needed). `.env` + Vercel: `VERTEX_SERVICE_ACCOUNT_KEY` + `VERTEX_PROJECT_ID`.
- **ScenePipelineTile routing change:** add `routeAudioForScene(scene)` helper. `type === 'talking'` AND `hasSourceAudio(scene.renderedUrl)` → STS path via `convertSpeech` from [`services/voiceService.ts`](../services/voiceService.ts); else TTS path (unchanged).

### Phase 1 — AI Editor Brain
- **Half (a) DONE** (commit `6f2eb66`).
- **Half (b) NEXT** (see "Carry-forward #2" above).

### Phase 2 — Remotion Executor (DEFERRED to separate grill-me PRD)
Tier A — Lean MVP. Render on Remotion Lambda + AWS S3. Curated 10-SFX free pack. EDL JSON → final MP4 export. Out of scope until Phase 1b + Phase 0 done.

### Locked scope decisions (from PRD session)
| Decision | Locked |
|---|---|
| Lipsync v1 strategy | STS preserves lipsync (Neil's vision) → requires Phase 0 |
| Phasing | Phase 0 (Vertex) → Phase 1 (Brain) → Phase 2 (Remotion, deferred) |
| Feature tier v1 (Phase 2) | Tier A — Lean MVP: mute + voice overlay + AI overlay text + transitions + small SFX pack |
| Render infra (Phase 2) | Remotion Lambda on AWS |
| Audio origin (pre-app) | Veo native UI / Vertex AI with audio enabled |
| Target voice | Mix per ad — sometimes cloned, sometimes library |
| STS quality bar | Single-pass STS is enough — no layered cleanup needed for v1 |

---

## Stale tests (NOT from this slice)

`npm test` reports **10 pre-existing failures** as of `6f2eb66`. Documented:

- **`tests/unit/geminiService.schemas.test.ts` — 9 failures.** Assertions look for strings like `STILL_FRAME_RULE`, `APPEARANCE_LOCK_RULE`, `BAG_ORIENTATION_RULE`, `NO PRICE`, `MrBeast CTA invariants`, `TESTIMONIAL "Ako si [name]"` in the **client fetch body**. The crown-jewel migration (2026-05-09) moved these strings into [`api/_lib/prompts.ts`](../api/_lib/prompts.ts) server-side. Client now POSTs `{flow: <id>, input: ...}`. Tests need rewriting against the server prompt module — or `.skip()` with a TODO — or deletion.
- **`tests/unit/geminiService.proxy.test.ts` — 1 failure.** `proxyCall JWT auto-refresh + 401 retry`. Possibly unrelated regression. Investigate when time allows.

**Implication for next session:** if a future `/goal` requires `npm test` passing, surface this to Neil before scoping. Either fix the stale tests as part of that goal, or patch the goal scope (as we did here).

---

## Open risks (carried from PRD session)

| Risk | Mitigation |
|---|---|
| Vertex Veo audio quality is worse than expected (unintelligible / wrong-language / weird tone) | Spike-test on 1 talking-head scene before committing to migration. STS-on-bad-audio may amplify artifacts. |
| Vertex GCP onboarding takes longer than 1 week (quota, billing approval) | Start the GCP paperwork in parallel with Kling sound spike. Phase 1b can begin without Phase 0 if we mock the audio-bearing MP4s with manually-attached audio for development. |
| Gemini 3.1 Pro can't ingest Supabase signed URLs as video input (URL fetch limit, MIME-type restrictions) | Fallback: download MP4 server-side, re-upload to a Gemini-friendly storage, OR base64-encode (heavy for 8 MP4s). **Confirm in Phase 1b spike before locking the prompt.** |
| TUNED prompt rewrite is rejected by Neil mid-stream | Phase 1a's stub provides a stable fallback. Schema tests don't depend on stub-specific values, so a partial Phase 1b doesn't break anything. |
| Voice cloning flag (`GRIFON_VOICE_CLONING_ENABLED`) is off in production | Not blocking — Neil uses library voices possible. Verify env var is set in Vercel before any user tries to clone. |

---

## Restore commands

- `.\scripts\restore-git-identity.ps1` — if `git commit` fails with "Author identity unknown".
- `.\scripts\restore-playwright-mcp.ps1` — if Playwright MCP needed (requires VS Code restart — do first).

---

## First files to read in the next session

1. This handoff doc.
2. [`CLAUDE.md`](../CLAUDE.md) — project rules.
3. [`services/CLAUDE.md`](../services/CLAUDE.md) — TUNED-file hard rules.
4. [`agent_lessons.md`](../agent_lessons.md) — 2026-05-09 TUNED-prompt guardrail.
5. `git show 6f2eb66` — see what landed.
6. `git log --oneline -5` — orient on recent commits.

If the recommended next move (Phase 1b) is locked in, also read:
- The current stub: `services/geminiService.ts` (search for `generateEditDecisionList`).
- The current `EditDecisionList` schema in [`types.ts`](../types.ts).
- The existing prose prompt in `generateVideoEditPlan` ([`services/geminiService.ts:886-981`](../services/geminiService.ts)) — its formula content is reusable, but the OUTPUT STRUCTURE needs to change from emoji-headed markdown to JSON matching `EditDecisionList`.
