# Session N handoff — 2026-05-26 — TUNED bundle shipped (Bug 8/9/14/15 + Layer 1-2)

> **TL;DR.** Session N closed the TUNED review opened by Session M's halt.
> Bug 8 (crane lift), Bug 9 (alternation rule strength), Bug 14 (duration
> buffer revert), Bug 15 (face-application rule), Layer 1 (phonetic
> normalizer), and Layer 2 (audio padding tail) all landed in one commit
> with line-by-line user approval (`e392e66`). Build gate green, bundle-leak
> check clean, both locked surfaces (MarketResearchReport schema + model IDs)
> untouched. Layer 3 (segment isolation) deferred to Session O A/B test.
> Layer 4 (image-to-video anchor) deferred to Phase 2 PRD. New external tool
> operationalized: the **Grifon Director AI Video Auditor Gem** (Gemini Gem,
> calibrated against the 2026-05-26 audit, sharp after Instructions
> tightening). Session O retests the Session N fixes in vivo on a fresh
> Curology wizard + closes Phase 1b EDL.

---

## What landed on `origin/main`

| Commit | Summary |
|---|---|
| `e392e66` | `tuned(session-n):` Bug 8/9/14/15 + Layer 1-2 — single bundled TUNED commit (3 files, +50/-14) |
| (this commit) | `docs(session-n):` handoff + 2026-05-26 agent_lessons entry on the Gem workflow |

### Files touched in e392e66

- **[services/phoneticNormalizer.ts](../../services/phoneticNormalizer.ts)** — NEW. 5 Taglish→phonetic mappings; `normalizeTaglish(text)` export.
- **[services/geminiService.ts](../../services/geminiService.ts)** — 4 edits:
  - Bug 14 buffer revert + comment block at [:467-475](../../services/geminiService.ts#L467-L475) (`0.3 → 0.8`, replaces 2026-05-11 MrBeast tightening that broke on Taglish skincare).
  - Layer 1 import at [:6](../../services/geminiService.ts#L6) (`import { normalizeTaglish } from './phoneticNormalizer';`).
  - Layer 1 integration at [:2031](../../services/geminiService.ts#L2031) (storyboardText builder wraps scriptLine in `normalizeTaglish()`).
  - Bug 8 strip at [:2090](../../services/geminiService.ts#L2090) (A-HOOK palette: 3→2 entries) and [:2096](../../services/geminiService.ts#L2096) (A-REGULAR palette: 4→3 entries).
  - Layer 2 AUDIO TAIL PADDING bullet at [:2112](../../services/geminiService.ts#L2112) (between First & Last Frame Logic and OUTPUT FORMAT in Option B Talking).
- **[api/_lib/prompts.ts](../../api/_lib/prompts.ts)** — 2 edits:
  - Bug 9 PACING RULE relocated from line 752-755 → after [:715](../../api/_lib/prompts.ts#L715) (top of rule block, above STILL_FRAME_RULE). UPPERCASE "YOU MUST NOT HAVE 3 CONSECUTIVE" + WRONG/RIGHT violation example added.
  - Bug 15 FACE_APPLICATION_RULE inserted at [:792-798](../../api/_lib/prompts.ts#L792-L798) (between BAG_ORIENTATION_RULE and REFERENCE_IMAGE_CLASSIFICATION_RULE). Draft A+ wording: MUST language + EXCEPTION clause for texture-preview cutaway B-roll + EXEMPT product categories.

---

## Updated bug catalog state

Continuing the Session M catalog (bugs 5/6/8/9/11/12/13/14/15).

| Bug | Status | Notes |
|---|---|---|
| 5  | ✅ shipped + in vivo | Session L safeStr fix, Session M verified |
| 6  | ✅ shipped + in vivo | Session L per-scene model picker, Session M verified |
| 7  | ⏸ code-correct, in-vivo Session O | Audio blob → base64 inlineData fix at [services/geminiService.ts:1347-1356](../../services/geminiService.ts#L1347-L1356); needs single Network 200 confirmation on the EDL synthesis call |
| 8  | ✅ shipped Session N | "crane lift" stripped from Option A-HOOK + A-REGULAR palettes; eliminates Option B vocabulary-bleed at the source |
| 9  | ✅ shipped Session N | PACING RULE relocated + UPPERCASE MUST NOT + WRONG/RIGHT example |
| 11 | ⏸ UX, post-TUNED unblocked | "// SCENE PIPELINE · 7/7 RENDERED" label honesty fix |
| 12 | ✅ shipped Session M | Cross-session library binding patch ([components/GenerateVideo/index.tsx:302](../../components/GenerateVideo/index.tsx#L302)) |
| 13 | ⏸ UX, post-TUNED unblocked | Pipeline tile click should swap editor video player, not just model picker |
| 14 | ✅ shipped Session N | Buffer reverted 0.3 → 0.8; trades ~1-2s overshoot per scene for ZERO truncations on Session M data |
| 15 | ✅ shipped Session N | FACE_APPLICATION_RULE (Draft A+) added; closes the hand-vs-face Curology Scene 6 finding |

**Carry-forwards from prior sessions still pending:**
- **Fix 2** ⏸ Session H — strip audio/SFX directives from `generateVideoPrompts` + daylight→like typo. Bundle into Session P if Phase 1b closes early.
- **Bug 5 schema** ⏸ Session L — tighten `api/_lib/prompts.ts:100` demographics-as-string enforcement (defensive safeStr catches symptom).

---

## Gemini 3.5 4-layer architecture state

| Layer | Status | Notes |
|---|---|---|
| 1: Phonetic Translation Middleware | ✅ shipped Session N | [services/phoneticNormalizer.ts](../../services/phoneticNormalizer.ts); 5 mappings (I-click → Ee-click, Bago → Bah-goh, lang → lahng, mukha → moo-khah, mabilisang → mah-beh-lee-sahng); integrated at storyboardText builder only — EDL/AI-Editor path keeps raw Taglish |
| 2: Audio Timeline Padding | ✅ shipped Session N | AUDIO TAIL PADDING bullet inside Option B Talking; unconditional on all talking scenes; tail string verbatim from Gemini 3.5 audit |
| 3: Structural Segment Isolation | ⏸ deferred to Session O A/B test | Current code FORBIDS bracketed segments — paperwork session couldn't render-validate. Session O bonus task if budget allows: render Scene 5 b-roll paragraph (control) vs bracketed (test), compare via Gem. |
| 4: Image-to-Video Anchor Workflow | ⏸ deferred to Phase 2 PRD | 1-2 day architectural shift, requires Gemini Image (sceneImageModel) budget per scene. Resume after Phase 1b closes. Likely biggest unlock for visual quality (text hallucinations, floating products, grip failures, brand-label drift). |

---

## NEW: Grifon Director AI Video Auditor Gem

External Gemini Gem operationalized in Session N. Calibrated against the 2026-05-26 Gemini 3.5 audit (uploaded as Knowledge). Two iteration passes ran during the session against Scene 4 (the truncated "suffocate" Curology clip):

**Pass 1** (initial Instructions) produced 4 accurate findings on Scene 4 + correct CRITICAL verdict, but confabulated integration points:
- Referenced `suggestDurationForScript` as the Layer 2 padding integration site (wrong surface — that's a duration estimator, not a prompt builder).
- Hallucinated `api/_lib/phoneticPreprocessor.ts` as the Layer 1 module path (actual ship: `services/phoneticNormalizer.ts`).
- Recommended "deploy" Layer 1/2 without knowing they had just shipped.

**Pass 2** (tightened Instructions) added:
- Explicit ban on filenames / function names / file paths / integration points in Section 4.
- "Knowledge currency caveat" — Gem now knows its Knowledge is a snapshot.
- Brand-label rule (quote exact rendered text, flag discrepancy without auto-correcting).

Pass 2 results:
- Section 4 became pure diagnosis (clean — no code-level claims).
- Brand-label rule produced first sharp catch: "Currology" with a double-r vs true "Curology" — material text-hallucination finding.
- Section 3 fork: "Layer 4 OR strict category-specific storyboard injection" — the second branch is essentially Bug 15's FACE_APPLICATION_RULE; Gem independently arrived at the Session N fix without knowing it shipped.
- Pass 2 dropped two Pass 1 findings (Westernized accent on "Subukan mo ang" + loose-grip object permanence) — multimodal variance.

**Workflow for Session O+:**

Render scene → Neil pastes video prompt + uploads MP4 to Gem → Gem emits Section 1-4 audit → Neil pastes findings to Claude → Claude maps findings to current code state + proposes TUNED edits → line-by-line sign-off via AskUserQuestion → ship.

**Two key rules:**
1. **Gem is observation layer; Claude is integration layer.** Don't trust Gem-proposed filenames or function names.
2. **For CRITICAL gate decisions, run the Gem 2-3 times for ensemble recall.** Pass 1 may catch audio; Pass 2 may catch grip. Single-pass output is stochastic.

---

## Recommended Session O agenda

Render-spend session (~$2.20-$2.30 if all 7 scenes pass first render; more if any CRITICAL triggers a re-render).

1. **Pre-flight per Director AI smoke rules** (~5 min, free). Honor 2026-05-24 + 2026-05-26 lessons:
   - FIND handheld hero with readable brand label FIRST
   - DERIVE brand FROM the label
   - Run MarketMind with that brand name
   - Send to Director AI; VERIFY Step 1+2 prefill (Bug 5 safeStr passed)
   - Upload hero, confirm AI Analysis recognizes product
   - Confirm script-angle picker appears at Step 3 (proves MarketMind context flowed)
   - VISUAL ASSETS MISSING banner on Step 5 is a hard stop
   Suggested re-use: `.playwright-mcp/grifon-hero-curology-moisturizer.jpg` (Curology brand = derived from photo; matches Session M smoke).

2. **Wizard end-to-end → storyboard** (~5 min, free). Walk Steps 1-5. Confirm storyboard returns NO 3-consecutive-talking pattern (Bug 9 verification).

3. **RENDER ALL 7 scenes** (~8 min wall, ~$2.10). Watch for Bug 12 `0/7 RENDERED` on fresh wizard (proves cross-session-binding patch still works — no re-binding to stale Session M MP4s).

4. **Per-scene audit via Grifon Director AI Video Auditor Gem** (~15 min). This is the new watch-each-video gate, replacing the manual review from Session M. For each of 7 scenes:
   - Copy the rendered video prompt from the GenerateVideo module
   - Get the signed Supabase MP4 URL
   - Paste prompt + upload MP4 to the Gem
   - Specify engine (Veo Lite / Kling Omni / Kling 3.0) and target duration
   - Read Section 1-4 output
   - **CRITICAL verdict**: run Gem 2 more times for ensemble. If at least 2/3 passes flag CRITICAL → halt, log as Bug N+1, stop session.
   - **SIGNIFICANT**: decide per scene whether to halt.
   - **PASS / MINOR**: proceed.

5. **Per-bug in-vivo verification** (using Gem findings as evidence):
   - Bug 9: storyboard has no 3-consecutive-talking
   - Bug 14: total duration matches script time ±1s, NO truncation on any talking scene
   - Bug 15: any face-care application scene shows product on FACE (cheek / forehead / jawline), NOT hand
   - Bug 8: zero "crane lift" appearances in any rendered video prompt
   - Layer 1: Taglish tokens (Bago, lang, mukha, mabilisang, I-X prefixes) pronounced phonetically — no Western emphasis, no hyphen mis-parse
   - Layer 2: final talking-scene frame is the silent comfortable smile, not a cut-off word

6. **IF all 7 PASS or MINOR** → Send to Signal Modulator (TTS, ~$0.07) → AI Editor (EDL synthesis, ~$0.02). Download `edit-decision-list-*.json`.

7. **Bug 7 in-vivo verification** (~2 min, free). Network panel: the single `/api/gemini/text` POST during EDL synthesis returned **200** (was 400 in Session K). Confirms audio-blob → base64 inlineData fix at [services/geminiService.ts:1347-1356](../../services/geminiService.ts#L1347-L1356).

8. **5 brief assertions** on the downloaded JSON (~3 min, free):
   - 3.1 `meta.scriptStyleDetected === "mrbeast"`
   - 3.2 `scenes[*].overlayText[*].text` Taglish (sample 3+)
   - 3.3 `scenes[*].sourceVideoUrl` verbatim Supabase signed URLs
   - 3.4 `scenes[*].sourceAudioUrl` non-empty per scene
   - 3.5 JSON parses; top-level keys = `meta` / `scenes` / `globalSfxPicks` / `formulaCheck`; `scenes.length === N`

9. **(Bonus, optional, ~$0.30 + 5 min) Layer 3 A/B test.** Only if Phase 1b closes cleanly and budget room. Render Scene 5 b-roll twice — paragraph form (control) vs bracketed `[Cinematography]: / [Subject]: / [Audio Ambient]: / [Negative Prompt]:` format (test) — compare via Gem. Bracketed wins → file Layer 3 TUNED bundle for Session P. Paragraph wins → permanently retire the audit's Layer 3 recommendation.

10. **Commit handoff + push** (~5 min). Either:
    - **SUCCESS**: `docs(session-o): Phase 1b EDL closed + Session N fixes verified in vivo`
    - **PARTIAL**: `fix + docs(session-o): N/7 scenes pass, log Bug N+1, defer to Session P`

**Post-Session-O unlock:** If Phase 1b EDL closes cleanly, Phase 2 Remotion executor PRD becomes next-tier focus.

---

## What this session actually delivered

✅ One TUNED commit shipped (`e392e66`) — 6 distinct fixes, all line-by-line approved via AskUserQuestion.
✅ Build gate green (`tsc && vite build`, exit 0). 1.6 MB index bundle (no size regression).
✅ Bundle-leak check: 0 hits for crown-jewel prompts in `dist/assets/index-*.js` (including the newly-added FACE_APPLICATION_RULE and the relocated PACING RULE).
✅ Locked surfaces untouched: `MarketResearchReport` in [types.ts](../../types.ts); model-ID block at [services/geminiService.ts:274-278](../../services/geminiService.ts#L274-L278); video-model constants at [:412-416](../../services/geminiService.ts#L412-L416).
✅ Plan→Goal pipeline gate honored. Neil approved the `/goal` before any edit fired.
✅ Surgical-edit discipline: 3 files touched, +50/-14 total. No collateral changes.
✅ **Grifon Director AI Video Auditor Gem operational + tested.** Two Instructions iterations on the same calibration clip. Documented in this handoff + agent_lessons.

❌ Did NOT touch Layer 3 or Layer 4 (out of scope for paperwork-only session).
❌ Did NOT close Phase 1b EDL in vivo (carry-forward to Session O on clean videos).
❌ Did NOT touch Bug 11, Bug 13, Fix 2 (Session H), or Bug 5 schema (post-TUNED bundle for Session P).
❌ Did NOT start Phase 0 GCP paperwork (Neil-only, still gating Phase 2 Remotion).

---

## First files to read in Session O

1. **This handoff.**
2. **[services/CLAUDE.md](../../services/CLAUDE.md)** — TUNED guardrails (still apply on any per-scene TUNED edits if the Gem surfaces new bugs mid-session).
3. **[CLAUDE.md](../../CLAUDE.md)** — project rules + Plan→Goal pipeline + the (now Gem-augmented) watch-each-video gate.
4. **[agent_lessons.md](../../agent_lessons.md)** — 2026-05-26 entry on the Gem workflow (observation layer vs integration layer).
5. `git show e392e66` — see exactly what landed in Session N.

---

## Operational notes for Session O

- **Cafe PC defreezer** persists. Use [scripts/snapshot-wizard-session.ps1](../../scripts/snapshot-wizard-session.ps1) before any reboot risk. Restore via [scripts/restore-wizard-session.ps1](../../scripts/restore-wizard-session.ps1).
- **Playwright MCP** restricts file uploads to repo root or `.playwright-mcp/`. Session M's working hero at `.playwright-mcp/grifon-hero-curology-moisturizer.jpg` is reusable for Curology re-tests.
- **`.tmp/` is gitignored** — fine for scratch but don't write to it while `npm run dev` is running (Vite EBUSY).
- **Grifon Director AI Video Auditor Gem**: external Gemini Gem (not in repo). Calibrated 2026-05-26 with `Gemini 3.5 flash video audit.md` as Knowledge. Run 2-3 ensemble passes on CRITICAL clips. **Treat Gem's Section 4 file paths as STALE** — Claude (not Gem) translates findings to code.
- **If Playwright MCP isn't loaded** (defreezer wiped it): `.\scripts\restore-playwright-mcp.ps1` (VS Code restart required — do BEFORE anything else).
- **Git author** errors: `.\scripts\restore-git-identity.ps1`.
