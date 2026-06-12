# Workflow: Validation Render — prove the hook fix + Viral Editor 2.0 on clean footage

**Status: EXECUTED 2026-06-10 — both validation targets CONFIRMED.** Hook blob ~1/10 vs
8/10 baseline (Phase D + anchor-color fix validated live); editor verified on clean
footage. Full session log: `launch_readiness.md` 2026-06-10 section (11 fixes shipped).

## ⏭ TOMORROW (2026-06-11) — first moves

1. **Baseline video**: [`baselines/2026-06-10-bean-block-final-baseline.mp4`](../baselines/2026-06-10-bean-block-final-baseline.mp4)
   (committed — survives the defreezer). Remaining defects, BOTH source-clip damage
   (trim log proved VO fills those clips end-to-end, nothing cuttable):
   - ~15.5–16s: baked blur in scene 4's final frames (scene 4 = sceneIdx 3, VO 6.09s of a 6.0s clip)
   - ~27–28s: baked ghost/double-exposure in scene 6's final frames (VO 7.95s of an 8s clip)
2. **The fix is already shipped** (END-CLEAN negatives in A-Regular + Option B video
   prompts, Neil-approved): **REGEN the scene 4 + scene 6 VIDEOS** in Generate Video
   (regenerates their prompts through the new rules), then re-render and frame-compare
   against the baseline at the two stamps.
   - **Before spending video credits:** Checkpoint-A-style pre-check — confirm the
     regenerated scene 4 + 6 video PROMPTS literally contain the END-CLEAN negative
     phrases. Missing → it's a wiring issue, not a model issue; stop and fix instead
     of regenerating.
   - Cost guard applies: max 1 regen per scene, then stop and report.
3. Pre-flight per director-smoke: `.\scripts\enable-dev-unmetered-video.ps1` + restart
   dev (`npm run dev -- --host > .tmp/dev-server.log 2>&1`). Wizard state restores via
   the resume pill (STEP_08 — BEAN BLOCK). `[renderFfmpeg:trim]` logs land in the file.

This file + `CLAUDE.md` + `UBIQUITOUS_LANGUAGE.md` are enough to resume; no re-explaining needed.

## Context

Viral Editor 2.0 shipped (commits `b8034be` → `5c7fd26`, 2026-06-10) and Neil approved the
demo re-edits — but the demo re-used old footage with the hook blob baked in. Two things
remain unproven live:

1. **Phase D hook-anchor prompts** (`109d367`, TUNED files, Neil-approved): do freshly
   generated hooks avoid the 1.8–3.4s flesh-blob morph? Baseline severity 8/10 — autopsy
   in [edit_style_research.md](edit_style_research.md) §1.
2. **The new editor on clean scenes**: premium metallic-gradient hook + light sweep, film
   burn at the hook cut, word-pop captions, preset+palette rotation — without the old
   baked-in captions underneath (the demo's known artifact).

One full wizard E2E answers both. Budget: ~$3–5 (Veo/Kling/ElevenLabs).
Test brand: **Bukidnon Brew** (the established regression brand per launch_readiness).

## Hard rules (from `.claude/skills/director-smoke` — MANDATORY pre-flight)

- Load the `director-smoke` skill BEFORE touching the wizard — it governs the whole run.
- **Market Research FIRST**, then Director AI; **hero image FIRST**.
- **Never manually type brand/offer fields** — they must auto-prefill from Market Research
  (the auto-prefill is itself a regression check, Phase 6b `8fdc1f9`).
- No `/goal` needed — evaluation run, no planned code edits (skip clause).

## Steps

1. **Pre-flight**: invoke `director-smoke`; `npm run dev` up; confirm `.env` keys
   (GEMINI_API_KEY, ELEVEN_LABS_API_KEY, Supabase) live.
2. **Market Research**: run MarketMind on the Bukidnon Brew brief (Playwright drives the dev app).
3. **Wizard**: Start with Director (auto-prefilled), hero image first, walk Steps 1–7.
4. **CHECKPOINT A — storyboard, BEFORE spending video credits**: inspect Scene 1
   `startFramePrompt` / `endFramePrompt` / hook video prompt for HOOK ANCHOR RULE
   compliance (same named dominant color + same silhouette position in BOTH frames;
   decisive verbs — compresses/crystallizes/snaps; zero amorphous-state language).
   Run `gemini-eval` on the storyboard. Non-compliant → regen once; still bad → STOP and
   report (prompt fix needs iteration — cheaper to learn here than after video spend).
5. **Generate**: scene images → hook video (Kling Omni start→end morph) → remaining
   scenes (RENDER ALL).
6. **CHECKPOINT B — hook blob autopsy on the fresh clip**: extract 5fps frames
   (`node_modules/ffmpeg-static/ffmpeg.exe`, same method as edit_style_research), grade
   against baseline criteria (amorphous mass? flesh tones? mush window length?).
   Verdict: severity /10 vs the 8/10 baseline.
7. **Voice + edit**: Signal Modulator (voice consolidation) → AI Editor EDL →
   FINAL_RENDER with burn-in ON. Log which preset+palette the rotation picked (the
   `[renderFfmpeg] … preset=` timing line). Verify in frames: title-stack hook with
   metallic gradient + sweep, film burn at hook cut, word-pop captions, CTA holding to
   the last frame, **no double captions** (clean footage).
8. **Report**: side-by-side frames (old hook vs new hook), `gemini-eval` verdicts, render
   timing log, final MP4 + download link for Neil.

## Failure paths

- **Ghost/blur persists at the 15.5–16s / 27–28s stamps after the END-CLEAN regen**
  (2026-06-12 contingency, Neil-approved — assume the model can always ignore the
  negative; escalate by layer, do NOT iterate prompts past the 1-regen guard):
  - **Layer 2 — HEADROOM, not shrink:** the trimmer couldn't cut the damage because VO
    filled the clips end-to-end (scene 4: VO 6.09s on a 6.0s clip — zero trim headroom,
    and the voice outran the visual). Fix: in `suggestDurationForScript`
    (`services/geminiService.ts:490`), when the VO estimate lands within ~1s of the
    chosen duration ceiling, bump to the NEXT valid duration step (6s→8s) so the
    model's dirty final second always lands in trimmable dead air. This extends the
    Session N calibration already in the code ("dead air is trimmable; truncation is
    not") and mirrors roadmap #9's render-longer-trim-the-dirt philosophy. Structural,
    not tuned content — but it's `geminiService.ts`, so Neil approves the diff first.
    ❌ Rejected alternatives (2026-06-12 discussion): blanket 6s→4s durations and
    4s-capped scripts — both would truncate real Taglish VO (the failing scenes speak
    6.09s and 7.95s; Session N proved tightening truncates mid-syllable), and
    handoff 2026-05-29 #3 forbids masking renderer issues by prompt-hacking clip
    lengths. End-of-clip bake just relocates to whatever the duration is.
  - **Layer 3 (shipped):** `[renderFfmpeg:trim]` + PAD_SEC 0.18 cuts the tail once
    headroom exists — no new work.
  - **Layer 4 — cover:** if a damaged window still overlaps speech, place a transition
    (film burn / whip) AT the dirty scene boundary — the generalized form of the §6
    hook-cover insurance below; edit grammar exists to hide cuts.
- **Blob persists at Checkpoint B** → ship the designed Phase D insurance: renderer-side
  hook reveal cover (speed-ramp the morph window + whip-blur + whoosh) — design in
  [edit_style_research.md](edit_style_research.md) §6. VO-sync caveat documented there.
- **Pipeline bug found** → fix in scope IF small + non-tuned; tuned-file changes go back
  through the diff-approval gate (agent_lessons 2026-05-09).
- **Cost guard**: max 1 regen per stage; beyond that, stop and report instead of burning credits.

## Verification

- Checkpoint A: storyboard JSON + gemini-eval verdict in transcript.
- Checkpoint B: frame grid of the fresh hook + severity grade vs 8/10 baseline.
- Final: rendered MP4 frame-checked; preset/palette logged; `verify-changes` only if code touched.
- Wrap-up (same session): log the render-pipeline + Viral Editor 2.0 arc in
  [launch_readiness.md](launch_readiness.md) (stale since 2026-05-22) + add the new
  editor terms to `UBIQUITOUS_LANGUAGE.md` (Edit Style Preset, Title Stack, Hook
  Palette, Film Burn, Word-Pop, Edit DNA) — do the docs while renders run.

## Carry-over backlog (after this run, Neil-gated)

- Editor v2 extras: true texture fills inside letters (mask machinery ready, needs
  texture assets), sweep tuned against `HOOK FONT STYLE AND ANIMATION SAMPLE.webm`
  (repo root, untracked — re-supply if defreezed), hard-cut reveal hook variant
  (storyboard prompt, TUNED), ElevenLabs with-timestamps word sync.
- Neil's own pendings ("important thing in the lineup" — pre-editor detour, Neil to brief).
