# Session M handoff — 2026-05-26 — Bug Catalog + Halt (Phase 1b EDL deferred to post-TUNED retest)

> **TL;DR.** Session M was supposed to close Phase 1b EDL (Bug 7 transport
> verification + 5 brief assertions). It instead became a comprehensive
> in-vivo quality audit. Three bugs confirmed fixed live (Bug 5 prefill,
> Bug 6 per-scene model picker, Bug 12 cross-session library binding —
> last one was newly discovered + patched + verified all in this session).
> Seven scene videos rendered (~$2.10), then the user-mandated visual
> review surfaced 7 distinct quality issues spanning visual artifacts,
> duration miscompute, Taglish TTS slop, and storyboard narrative defaults.
> Gemini 3.5's parallel audit corroborated and proposed a 4-layer
> architectural blueprint. **Neil halted the smoke** before Signal
> Modulator — proceeding on slop videos would have been verification
> theatre. Session N opens a TUNED review for the visual/TTS bugs;
> Session O retests + closes Bug 7 on clean output.

---

## What landed on `origin/main`

| Commit | Summary |
|---|---|
| (this commit) | `fix + docs(session-m):` Bug 12 patch + 2 new infra scripts + 3 agent_lessons entries + this handoff |

Single commit, bundled because Bug 12 is the only code-change and everything else is supporting documentation / infra.

- **[components/GenerateVideo/index.tsx:295-327](../../components/GenerateVideo/index.tsx#L295-L327)** — Bug 12 patch. Rehydration filter now requires `l.sceneIdx === i && l.prompt === seed.prompt` (was sceneIdx alone). 1-line behavioural change at line 302; comment block at 290-296 updated to reflect the why. Non-TUNED, mechanical state-matcher fix.
- **[scripts/snapshot-wizard-session.ps1](../../scripts/snapshot-wizard-session.ps1)** — NEW. Two-phase clipboard-assisted localStorage capture for reboot resilience.
- **[scripts/restore-wizard-session.ps1](../../scripts/restore-wizard-session.ps1)** — NEW. Reads a snapshot, emits a re-injection JS snippet to clipboard.
- **[agent_lessons.md](../../agent_lessons.md)** — 3 new entries dated 2026-05-26:
  1. Corrected Director AI pre-flight order (hero-with-label FIRST → derive brand → MarketMind)
  2. NEW Rule: watch every rendered video before Signal Modulator
  3. Bug 12 lesson + cross-session-binding pattern generalization
- **This handoff doc** — Session N agenda + full bug catalog.

---

## Session M bug catalog

Numbered consecutively with prior sessions. Status legend:
- ✅ verified fixed in vivo
- ⏸ TUNED (needs Neil line-by-line sign-off; prompt/schema/model-id changes)
- ⏸ UX (frontend behaviour, fair-game per services/CLAUDE.md but not blocking)
- ⏸ NEEDS GREP (claim from observation; verify in code before proposing fix)

| Bug | Status | Layer | Summary |
|---|---|---|---|
| 5  | ✅ in vivo | App.tsx | `safeStr()` coerces all 7 MarketMind prefill fields to strings — no `[object Object]` leak. Verified on Step 1+2 for both Sariwa (first attempt) and Curology (final) wizards. Bug 5 fix from Session L is working. |
| 6  | ✅ in vivo | components/GenerateVideo/index.tsx | Clicking a pipeline scene tile swaps the editor model picker per the per-scene routing table (Kling Omni → hook, Veo 3.1 Lite → talking, Kling 3.0 → b-roll). Mirrors the `handleRerender` pattern. Verified by SCENE 02 click → Veo Lite, SCENE 01 click → Kling Omni. Bug 6 fix from Session L is working. |
| 8  | ⏸ TUNED | services/geminiService.ts ~L2100 | "crane lift" off-palette in Option B Talking. Re-surfaced in Scene 7 video prompt ("subtle crane lift during the dialogue"). Same finding as Session K. Either bless the term or tighten the closed-set. |
| 9  | ⏸ NEEDS GREP | api/_lib/prompts.ts | Storyboard returned **3 talking scenes in a row** (scenes 2/3/4 all `talking`, then b-roll at 5, then talking again 6/7). Neil's mental model: max 2 talking before forcing a b-roll. Verify whether this rule exists in the storyboard generator prompt; if absent, propose addition. If present, identify why Gemini violated it. |
| 11 | ⏸ UX | components/GenerateVideo/index.tsx | "// SCENE PIPELINE · 7/7 RENDERED" label is misleading when only storyboard frames are ready and videos haven't rendered. Mostly mooted by Bug 12 fix (which prevents false-7/7 from cross-session binding) but worth verifying the counter respects actual render state vs frame state. |
| 12 | ✅ in vivo | components/GenerateVideo/index.tsx:302 | **Headline finding.** Rehydration matched library entries by `sceneIdx` alone → fresh Curology wizard auto-bound to stale Battlecreek/PeakBoost MP4s by same-index coincidence. Fix: also require `l.prompt === seed.prompt`. Verified live — after patch, 0/7 RENDERED appears on a fresh wizard, RENDER ALL button restored. |
| 13 | ⏸ UX | components/GenerateVideo/index.tsx | Pipeline tile click swaps the editor MODEL PICKER (Bug 6 working) but does NOT swap the editor VIDEO PLAYER to that scene's rendered MP4. Editor stays parked on whatever video was active. Either: (a) the editor's video src should auto-sync with `activeIdx`'s sceneResults entry, or (b) there's a separate "Preview this scene" action that's not discoverable. UX inconsistency. |
| 14 | ⏸ TUNED | services/geminiService.ts `suggestDurationForScript` | **Duration miscompute across the board.** 7-scene durations vs script estimates: Scene 1=5.08s (script ~3.5s, +1.5s over), Scene 2=6s (script ~5s, +1s dead air), Scene 3=6s (script ~4s, +2s dead air), Scene 4=4s (script ~5s, **−1s TRUNCATED** "suffocate" cut off mid-syllable per Gemini 3.5), Scene 5=10.04s (script ~5s, +5s, also 2× Kling cost), Scene 6=6s (script ~4.5s, +1.5s), Scene 7=4s (script ~3.5s, +0.5s + blur tail). Total: ~41s of video for ~30s of spoken script → ~11s aggregate dead air. The fix is likely a words-per-second multiplier recalibration + a minimum trailing-buffer (to prevent truncation like Scene 4). |
| 15 | ⏸ TUNED | api/_lib/prompts.ts storyboard generator | Storyboard narrative defaults to "applying product to her hand" for face-care products (moisturizer/serum/cleanser/sunscreen/mask). Scene 6 rendered the Curology moisturizer being pumped onto the HAND, not the face. For Filipino skincare market this materially hurts ad credibility — viewer needs to see the product applied to face for "this is what it does to MY face" mapping. Proposed rule: face-care products MUST show face application; hand-only reserved for hand creams / sanitizers / oils explicitly tested on hands. |

**Carry-forwards from prior sessions still pending:**
- **Bug 7** ⏸ Code-correct, in-vivo deferred. Fix at [services/geminiService.ts:1347-1356](../../services/geminiService.ts#L1347-L1356) converts audio blob URLs to base64 `inlineData`. The change is deterministic — Gemini File API definitively accepts inlineData (not URI-checked). Defer in-vivo confirmation to Session O when clean videos are available; validating transport on slop is verification theatre.
- **Fix 2** ⏸ Session H — strip audio/SFX directives from `generateVideoPrompts` + daylight→like typo. Spec in [workflows/archive/2026-05-22-session-h-render-all-verified-and-fixes.md](2026-05-22-session-h-render-all-verified-and-fixes.md).
- **Bug 5 schema** ⏸ Session L — tighten `api/_lib/prompts.ts:100` demographics-as-string enforcement (defensive safeStr catches the symptom; underlying schema laxity remains).

---

## The 7 video URLs + durations (for Session O A/B comparison)

Captured 2026-05-26 from the GenerateVideo library rail after RENDER ALL 7 completed. Mapping convention: top-of-rail = newest-rendered = scene 7; bottom = oldest = scene 1.

| Scene | Engine | Duration | Script line | Neil observation | Gemini 3.5 audit |
|---|---|---|---|---|---|
| 1 | Kling Omni | 5.08s | hook (no dialog) | "text after transition — looks slop" | Gibberish text "PRIA NIGITICIREE"; failed 3D morph; phone-color drift |
| 2 | Veo 3.1 Lite | 6.00s | ~5s | "2s dead air" | "Bah-go" Western accent; "mabilisang" syllables dragged; overly harsh grimace |
| 3 | Veo 3.1 Lite | 6.00s | ~4s | "2s dead air" | Mouth mesh distortion on "mukha"; finger clips through cheek |
| 4 | Veo 3.1 Lite | 4.00s | ~5s | "3-4s morph/blur" | "Themoisturizer" merged tokens; **"suffocate" truncated mid-syllable** |
| 5 | Kling 3.0 b-roll | **10.04s** | ~5s | "10s, too much credits" | **Kinematic inversion** — product slides, camera stays static |
| 6 | Veo 3.1 Lite | 6.00s | ~4.5s | "Taglish accent slop" + **hand-vs-face app** | Pump in mid-air; product appears on hand without nozzle orientation; jittery hand-rubbing |
| 7 | Veo 3.1 Lite | 4.00s | ~3.5s | "'ay-click' + blur tail" | Hyphen parser ("Is click"); "lang" with hard Western "a"; floating bottle no grip |

URLs (with caveat: signed-URL tokens expire ~24h after generation; for Session O comparison these may need re-signing or the user's account is the canonical source):

- [Scene 1 — Kling Omni 5.08s](https://varoqxjccqmskzeejagn.supabase.co/storage/v1/object/sign/gemini-videos/9fa5a50d-8ba5-430e-9010-ad185dac3074/50c1166d-486d-4464-96c5-acea97074477.mp4)
- [Scene 2 — Veo Lite 6s](https://varoqxjccqmskzeejagn.supabase.co/storage/v1/object/sign/gemini-videos/9fa5a50d-8ba5-430e-9010-ad185dac3074/476149a4-5d95-47b7-aaef-ea08959f06c6.mp4)
- [Scene 3 — Veo Lite 6s](https://varoqxjccqmskzeejagn.supabase.co/storage/v1/object/sign/gemini-videos/9fa5a50d-8ba5-430e-9010-ad185dac3074/157860db-5920-4c29-b95a-c95b332d7fb1.mp4)
- [Scene 4 — Veo Lite 4s TRUNCATED](https://varoqxjccqmskzeejagn.supabase.co/storage/v1/object/sign/gemini-videos/9fa5a50d-8ba5-430e-9010-ad185dac3074/8a92d64b-9d47-4290-b9fa-ec4c701c21e4.mp4)
- [Scene 5 — Kling 3.0 b-roll 10.04s](https://varoqxjccqmskzeejagn.supabase.co/storage/v1/object/sign/gemini-videos/9fa5a50d-8ba5-430e-9010-ad185dac3074/3e5a93bc-09e9-4483-801f-a16858231566.mp4)
- [Scene 6 — Veo Lite 6s hand-app](https://varoqxjccqmskzeejagn.supabase.co/storage/v1/object/sign/gemini-videos/9fa5a50d-8ba5-430e-9010-ad185dac3074/bf09d847-4d09-4ea3-8fca-e1d687365c7d.mp4)
- [Scene 7 — Veo Lite 4s](https://varoqxjccqmskzeejagn.supabase.co/storage/v1/object/sign/gemini-videos/9fa5a50d-8ba5-430e-9010-ad185dac3074/e28685ad-af11-4611-8dec-afc9084e9816.mp4)

Full signed URLs (with tokens, for direct browser inspection) live in the Session M conversation transcript and the Supabase user library at `gemini-videos/9fa5a50d-8ba5-430e-9010-ad185dac3074/`.

---

## Reference: [Gemini 3.5 flash video audit.md](../../Gemini%203.5%20flash%20video%20audit.md)

Already in the repo root. Part 1 is a per-scene glitch enumeration that maps 1:1 with the Bug 8/9/11/13/14/15 catalog above. **Part 2 is the load-bearing reading for Session N** — it proposes a 4-layer SaaS-backend architecture to fix the systemic failures permanently:

1. **Phonetic Translation Middleware** — backend regex/LLM pre-processor that intercepts script inputs and translates localized Taglish words to phonetic English strings before they hit Veo/Kling. Fixes Scene 7 "I-click → Is click", Scene 2 "Bago → Bah-go", Scene 6 Taglish-switch slop. *Implementation surface: new module like `api/_lib/phoneticPreprocessor.ts`; called from `generateVideoPrompts` before the final payload assembly.*

2. **Mandatory Audio Timeline Padding** — backend appends `"..., [silent pause], looking back toward the lens with a natural, comfortable smile."` to the END of every script. If the model cuts the final 0.5s it truncates a silent smile, not a spoken syllable. Fixes Scene 4 "suffocate" cut-off. *Implementation surface: `suggestDurationForScript` partner function or `generateVideoPrompts` Option B Talking tail.*

3. **Structural Segment Isolation** — reformat user input from one paragraph into explicit functional headers: `[Cinematography]:`, `[Subject]:`, `[Dialogue]:`, `[Audio Ambient]:`, `[Negative Prompt]:`. Fixes Scene 5 kinematic inversion (camera-vs-product ambiguity) and Scene 1 text bleed (negative prompt currently being ignored because it's buried in a paragraph). *Implementation surface: `generateVideoPrompts` final payload formatter — likely a full rewrite of Option A b-roll and Option B Talking templates.*

4. **Image-to-Video Anchor Workflow** — re-architect to prioritize start-keyframe over text-only generation. User uploads product → Imagen 3/Flux composites avatar+product into a high-res "First Frame" → video model gets the static image in `image` or `first_frame` input array → text prompt only animates lips/expressions/camera. Fixes Scene 1 phone-screen morph confusion, Scene 6 floating product, Scene 7 detached bottle, all text hallucinations. *Implementation surface: new pre-render step in the RenderAllRunner queue; new Imagen 3 / Gemini Image proxy call.*

Each layer is a separate Session N+ decision: **adopt now, schedule, or skip**. Layers 1+2 are TUNED-tier (prompt + middleware additions, ~few hours each). Layer 3 is a deeper TUNED rewrite. Layer 4 is a Phase 2 architectural shift (~1-2 days, requires Gemini Image budget approval per scene).

---

## Recommended Session N agenda (TUNED review session)

Open a focused TUNED-review session with Neil + agent. Sequence:

1. **Prereqs** (~5 min): re-read this handoff + Gemini 3.5 audit Part 2. Open the 7 video URLs in browser tabs so Neil can re-watch any scene as needed during discussion.

2. **Bug 9 grep** (~5 min): grep [api/_lib/prompts.ts](../../api/_lib/prompts.ts) for any reference to "talking", "b-roll", "alternation", "consecutive". If rule absent, propose explicit addition. If present, identify why Gemini violated it — likely a prompt strength issue.

3. **Bug 14 review** (~15 min): walk `suggestDurationForScript` in [services/geminiService.ts](../../services/geminiService.ts). The function takes a scriptLine and returns a duration. Current behavior: 4 scenes overshoot, 1 undershoots. Hypothesis: words-per-second multiplier too generous + missing trailing-buffer. Neil signs off on the new multiplier + buffer values line by line.

4. **Bug 15 review** (~10 min): add face-application rule to the storyboard generator prompt. Specific TUNED text addition; Neil signs off on exact wording.

5. **Bug 8 disposition** (~5 min): "crane lift" — bless or strip from Option B Talking palette. Quick decision.

6. **Gemini 3.5 4-layer architecture** (~30 min): for each of the 4 layers, decide adopt now / schedule / skip. Layer 4 (image-to-video) needs separate Phase 2 PRD if adopted — it's the biggest unlock for visual quality.

7. **Commit + retest plan**: bundle all TUNED edits into one commit (per services/CLAUDE.md: each TUNED change gets Neil's explicit line-by-line approval). Then Session O reruns the same Curology wizard end-to-end with all fixes applied.

---

## Session O preview (post-TUNED retest)

Once Session N's TUNED edits land:

1. **Fresh wizard** — Curology / The Moisturizer / handheld dropper photo / Taglish script. Honor the corrected pre-flight order (hero-with-label first) and the new watch-each-video gate.
2. **Render 7 scenes** (~$2.10, ~8 min wall time based on Session M timing).
3. **Visual review** — watch each scene with Neil; quality must be production-ready before proceeding. If any scene fails, log as Bug N+1 and halt again.
4. **IF all 7 pass** — Signal Modulator (TTS, ~$0.07) → AI Editor (Gemini text, ~$0.02) → download EDL JSON.
5. **Bug 7 in-vivo verification**: Network panel shows the single `/api/gemini/text` POST during EDL synthesis returned **200** (was 400 in Session K). Confirms the audio blob → base64 inlineData fix at services/geminiService.ts:1347-1356 works end-to-end.
6. **5 brief assertions** on the downloaded `edit-decision-list-*.json`:
   - 3.1 `meta.scriptStyleDetected === "mrbeast"`
   - 3.2 `scenes[*].overlayText[*].text` Taglish (sample 3+)
   - 3.3 `scenes[*].sourceVideoUrl` verbatim Supabase signed URLs
   - 3.4 `scenes[*].sourceAudioUrl` non-empty per scene
   - 3.5 JSON parses; top-level keys = `meta`/`scenes`/`globalSfxPicks`/`formulaCheck`; `scenes.length === N`

Total Session O cost: ~$2.20 if all 7 scenes pass on first render. Time: ~30-45 min.

---

## Operational notes for Session N

- **Cafe PC defreezer** persists. Use the new [scripts/snapshot-wizard-session.ps1](../../scripts/snapshot-wizard-session.ps1) BEFORE shutting down each session if there's wizard state worth preserving. Tested round-trip in Session M (snapshot writes to `.tmp/grifon-wizard-snapshot-*.json`, restore emits a clipboard-paste snippet).
- **`.tmp/` is gitignored** (confirmed). Snapshot files won't pollute commits.
- **Don't write to `.tmp/`** while `npm run dev` is running — the script's writability probe handles this and falls back to `$env:TEMP` automatically.
- **Playwright MCP restricts file uploads** to the repo root or `.playwright-mcp/`. If a future session needs a hero image, copy it into `.playwright-mcp/` first (also gitignored). Session M's working hero is at `.playwright-mcp/grifon-hero-curology-moisturizer.jpg` if reusable.

---

## What this session actually delivered

✅ One real commit shipped (this bundle).
✅ Build gate green (`tsc && vite build`, exit 0) after Bug 12 patch.
✅ Bug 5 + Bug 6 confirmed in vivo (no regressions; Session L work standing).
✅ Bug 12 discovered + root-caused + patched + re-verified — all in the same session, with the wizard state preserved through the patch via the Director AI's server-side draft (proving the data architecture is more resilient than the localStorage layer alone).
✅ Two new infra scripts (snapshot + restore) modeled on the established `restore-notebooklm.ps1` pattern. Round-trip tested.
✅ Three new agent_lessons entries dated 2026-05-26.
✅ This handoff with full Bug 8-15 catalog + 7 video URLs + Gemini 3.5 audit cross-reference + Session N agenda + Session O preview.

❌ Did NOT close Phase 1b EDL live (transport fix is code-correct; in-vivo deferred to Session O on clean videos).
❌ Did NOT touch any TUNED surfaces (Bug 8, Bug 14, Bug 15 all carry forward to Session N for Neil's sign-off).
❌ Did NOT start Phase 0 GCP paperwork (Neil-only, still gating Phase 2 Remotion).

---

## First files to read in Session N

1. **This handoff.**
2. **[Gemini 3.5 flash video audit.md](../../Gemini%203.5%20flash%20video%20audit.md)** — particularly Part 2.
3. **[agent_lessons.md](../../agent_lessons.md)** — the 3 new 2026-05-26 entries.
4. **[services/CLAUDE.md](../../services/CLAUDE.md)** — the TUNED guardrails (line-by-line review process).
5. `git show <session-m-commit>` — see what landed today.

Open Bug 9 grep first (it's the cheapest disposition — either the rule exists or it doesn't), then proceed through Bug 14 → 15 → 8 → Gemini 3.5 4-layer architecture.
