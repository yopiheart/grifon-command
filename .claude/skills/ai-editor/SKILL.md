---
name: ai-editor
description: Edit Grifon's own marketing videos/reels with the Gemini Omni Flash +
  FFmpeg hybrid pipeline, and run the preset foundry — validate named editing-style
  presets (prompt templates) that later ship into the product render pipeline as data.
  Use when Neil says "edit this video/reel", "apply the <preset> look", "omni edit",
  "test/validate a preset", or drops a viral video he wants to COPY as an editing
  style (the copy-a-video intake). NOT for analyzing external videos for patterns
  (viral-autopsy), grading wizard output against tuned rules (gemini-eval), or
  shipping product code (code-executor delegation after Neil's green-light).
disable-model-invocation: true
---

# AI Editor — the Omni Flash + FFmpeg editing lab and preset foundry

Dual purpose: (1) the **terminal editing lab** for Grifon's own marketing videos and
reels; (2) the **preset foundry** — the R&D loop that turns proven viral editing
styles into validated, named presets in
[workflows/omni_edit_presets.md](../../../workflows/omni_edit_presets.md), which the
product later consumes as **data** (a future `api/gemini/omni-video.ts` +
`scene.omniMoves[]` routing, feeding roadmap #11 sellable Edit Styles).

**Architecture truth** (concierge_director_plan.md §2): the production app can NEVER
call this skill or the terminal agent. Product integration happens only via a Gated
Proposal in the registry → Neil approves → code-executor builds. Never as a side
effect of a session here.

**Disambiguation — say the full names:** "Omni Flash" = Google
`gemini-omni-flash-preview`, the video EDIT model (~$0.10/sec, Interactions API,
720p/24 output). NOT **Kling O1** (`Kling_O1`, the 2-frame morph hook model, roadmap
#9), NOT the product's **AI Editor screen** (`components/EditVideo.tsx`), NOT the
FFmpeg **render presets** (`classic/impact/hype/clean` — TUNED, and NOT retired:
they're the deterministic layer every Omni preset composes with; Neil decision
2026-07-06).

## Premortem (what kills this skill if unguarded)

1. **Budget bleed** — stochastic retries silently eating $0.10/sec ("just one more
   re-roll") until the session cost surprises Neil.
2. **A garbled label/price/caption ships** in a client-visible marketing video (the
   #18 Test-2/Sample-5 gibberish class — label drift is stochastic per output).
3. **The registry rots** into an unvalidated prompt dump — presets advancing status
   without the eval gate or Neil's eyeball, until nobody trusts any status.

## Hard guardrails (read first)

1. **TUNED-file freeze.** Never edit `api/_lib/renderPresets.ts`,
   `services/geminiService.ts`, `api/_lib/prompts.ts`. Findings that imply a tuned
   change go to the registry's **Gated Proposals** section, addressed to Neil.
2. **Paid-call gate.** Every Omni call requires ALL of: (a) the fully-assembled
   prompt shown to Neil via `--dry-run` and approved BEFORE payment (plan-first,
   generate-once), (b) `--yes` on the tool, (c) the `--budget` cap. Record actual
   spend in the registry round entry. Session default cap: **$10** (Neil,
   2026-07-06); per-preset round cap ~$3.

   **2b. Approval binds to the exact call.** Neil's approval covers the exact
   (template, clip, slots) tuple he was shown. ANY substitution — a different
   clip, template variant, or slot values — is a NEW paid call requiring fresh
   explicit approval, including "smart" diagnostics/bisections. Inputs Neil
   has banned stay banned for diagnostics too; if a diagnostic genuinely needs
   one, ASK first with the reason and cost (agent_lessons 2026-07-06).
3. **Talking-scene rule.** ONE generation pass max — refine chains warp mouths
   (photocopy-of-a-photocopy, #18 refine-chain test). Reframe-class edits only:
   punch-ins, speech-synced zooms, motion graphics, directed display text. NEVER
   bg-swap/relight (re-renders the person even when told not to — #18 round 1). To
   iterate: re-roll from RAW SOURCE with a merged prompt, full cost — never `refine`.
   (`refine` stays legal for b-roll — no face to degrade — with the label gate per
   pass.)
4. **Critical text stays FFmpeg.** Prices, ₱, offers, captions, end-card = FFmpeg
   drawtext, deterministic and exact. Omni renders ONLY explicitly-directed display
   words with "spell it exactly as written: …" phrasing (#18 Sample 6). Never feed
   captioned renders (Test 1 rewrote the caption layer). Omni garbles text it
   PRESERVES or INVENTS incidentally.
5. **Eval gate per output, not per preset.** Every Omni output gets: blind
   believability grade vs its raw control (`tools/analyze_video.py` — the analyzer
   never learns which file is which), `tools/render_audit.mjs` vision read on
   labels/wordmarks/directed text, and a did-the-move-actually-execute check ("no
   visible failure" ≠ "move happened" — Test 2 lesson). `poc_validated` status NEVER
   implies per-output safety. Stylized restyle presets (e.g. `paper-collage-v1`) are
   exempt from the real-human gate only — lip-sync + text gates still apply.
6. **Prompt vocabulary.** No identity-preservation legalese ("preserve the man's
   identity frame-for-frame" = safety-filter block, pre-generation; use "keep
   everything else exactly as filmed"). Every zoom carries easing language ("smooth
   fast zoom with visible easing — the viewer should FEEL the camera travel; no
   instant jump-cut reframes" — Neil's Sample-4 fix). Validated move vocab lives in
   the registry templates.
7. **Commit early** (cafe-PC defreezer). Registry entries and skill edits commit
   immediately; `.tmp/omni-poc/` artifacts are disposable — round entries must stand
   alone without them.
8. **720p/24 reality.** Omni outputs 720p/24: always run the `upscale` step to 1080p
   BEFORE the FFmpeg deterministic layer. SynthID watermark is embedded in all Omni
   output — disclose if a client asks.
9. **Omni is not timeline surgery.** It cannot shorten clips ("cut aggressively"
   produced 5.05s→5.18s). Pacing/dead-air trims are EDL/FFmpeg — and run BEFORE the
   Omni pass, so we pay only for kept seconds.

## Procedure

**Step 0 — open the registry.** Read
[workflows/omni_edit_presets.md](../../../workflows/omni_edit_presets.md) (index +
the presets you'll touch). Check `rejected` rows before proposing any move.

Then pick the mode:

### Mode A — edit a Grifon marketing video

1. Intake: RAW, pre-caption source (never a finished render). Confirm target
   (talking / b-roll / mixed) and which preset — or an ad-hoc plan built from
   validated registry vocab.
2. Dead-air trim first (FFmpeg, free — pay only for kept seconds).
3. `python tools/omni_edit.py preset <id> <clip> --slot k=v ... --dry-run` → show
   Neil the assembled prompt + cost estimate → he approves.
4. Paid call (`--yes`, under `--budget`). Talking: one pass. B-roll: ≤2 refines.
5. `upscale` to 1080p → FFmpeg layer per the preset's `ffmpeg_layer` (captions,
   ₱/offer text, VO mux, music, SFX, end card, loudness).
6. Eval gate (guardrail 5). Only a passing output ships.
7. Deliver + record cost/notes; commit anything durable.

### Mode B — preset foundry: the copy-a-video intake

Neil drops a video whose editing style we want to copy (his protocol, 2026-07-05):

1. Run `tools/analyze_video.py` (Gemini watches it → Edit-DNA JSON).
2. **MANDATORY before any prompt-writing:** summon the `smoke-tester` subagent
   (foreground) to visually verify the analysis — frame contact sheets + per-moment
   crops of every text overlay, animation, motion graphic, zoom/angle move;
   confirm/correct the Edit-DNA claims frame-by-frame.
3. Split the VERIFIED moves: FFmpeg-executable (→ EDL vocabulary; corroborations go
   to [workflows/viral_swipe_file.md](../../../workflows/viral_swipe_file.md) via
   viral-autopsy conventions) vs Omni-class (→ new `draft` preset in the registry,
   built from validated vocab + the constraints in guardrails 3-6).
4. Validate the draft via Mode C.

### Mode C — validate / promote a preset

The per-preset validation protocol (each numbered round appends to the preset's
`validation.rounds`):

1. **Raw clips (free):** use the committed clean assets in
   `workflows/assets/omni-poc/` (e.g. `best-sample-raw-talking.mp4` — Bukidnon
   Brew, no text, locked-off, baseline real-human/high). **Do NOT re-cut the
   demos/viral-editor-2 left half — it is NOT raw** (burned captions + baked
   zoom; contaminated round 1 on 2026-07-06, Neil caught it). **MANDATORY
   raw-ness check before any paid call:** extract a frame strip
   (`ffmpeg -vf "fps=8/DUR,scale=180:-2,tile=8x1"`) and visually confirm ZERO
   burned text and no baked camera movement. Caveat: even "raw" Veo scenes can
   carry a faint baked-in push — note it in the round.
2. **Blind baseline (free):** `analyze_video.py` believability grade on the raw
   control BEFORE any edit.
3. **Paid run:** `--dry-run` → Neil approves → one call under `--budget`. Talking:
   one pass. B-roll: ≤2 refines.
4. **Eval gate (free):** guardrail 5, output vs control.
5. **Neil eyeball:** he watches the actual mp4s — zoom-easing *feel* is explicitly
   his call, not machine-gradeable. Verdict recorded VERBATIM.
6. **Registry write + commit:** round entry (date, clips, prompt version, cost,
   machine verdicts, Neil verdict, output path) + status advance/hold/reject.

Status lifecycle: `draft → poc_validated → neil_approved → product_shipped`, or
`rejected` (with evidence, so failures are never blindly retried). `product_shipped`
transitions happen ONLY via a Gated Proposal + Neil + code-executor.

## Out of scope / wrong tool

- **Analyzing external/competitor videos for patterns** → `viral-autopsy` (this
  skill consumes its output in Mode B; the Swipe File stays the pattern DB).
- **Grading Grifon wizard output against tuned rules** → `gemini-eval`. Render QA →
  `tools/render_audit.mjs` directly.
- **FFmpeg RenderPreset (`classic/impact/hype/clean`) changes** → separate task
  under `surgical-edit` + `verify-changes`; those files are TUNED.
- **Product code** (proxy `api/gemini/omni-video.ts`, `scene.omniMoves[]` routing —
  pattern: `components/GenerateVideo/RenderAllRunner.ts` → `api/kling/omni-video.ts`
  — tier gating via `MODULE_TIER`/`PlanGate`) → code-executor delegation AFTER Neil
  merges and green-lights. This skill only produces the preset data it will consume.
- **Driving the wizard end-to-end for a test** → `director-smoke` first, always.
