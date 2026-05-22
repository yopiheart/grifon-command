# Handoff — 2026-05-22 — Session G (The Dead-First-Second Fix — Omni Pacing Investigation)

> **Status:** CLOSED. Outcome: **documented Omni pacing limit** — no code shipped.
> Predecessor:
> [handoff_2026-05-22-session-f-omni-effect-sweep.md](handoff_2026-05-22-session-f-omni-effect-sweep.md).
> Mirrors the approved plan at
> `C:\Users\Administrator\.claude\plans\read-in-order-workflows-handoff-2026-05-calm-cook.md`
> (defreezer-disposable — this workflow file is the durable copy).

---

## Context

Session F found a cross-effect weakness: every Kling Omni hook render is visually
static for its first ~1 second — the anchor-bridged morph is back-loaded to
t≈1.2–3s. For a hook (the first second decides scroll-stop) this is a real
conversion weakness. Session F flagged it for Session G with an explicit warning:
*"needs its own investigation — Omni pacing vs. prompt-fixable; do not assume a
quick clause fixes it."*

Session G investigated whether the static first second can be pulled earlier via
the only two no-code levers available — **prompt language** (a FRAME-0 motion-
onset rule) or a **shorter `duration`**. The Kling Omni API exposes no motion-
speed / delay / easing parameter ([handoff_2026-05-18-session-c-reverted-omni-discovery.md](handoff_2026-05-18-session-c-reverted-omni-discovery.md)).

**Outcome:** both no-code levers FAILED empirically. The dead-first-second is a
**structural Omni engine limit**, not fixable via prompt or duration. The TUNED
`Option A-Hook` block was never touched. The structural fix (head-trim) is scoped
as a follow-up.

## Decisions locked in the grill (grill-me, 2026-05-22)

| # | Decision | Choice |
|---|---|---|
| 1 | Lever scope | Probe the 2 no-code levers (prompt FRAME-0 rule + 3s duration) first; `negative_prompt`/`cfg_scale` gated behind a pause-and-re-decide checkpoint |
| 2 | Pass bar | PASS = morph progress visibly underway by **t≤0.6s**; hard non-regression clause — breaking the clean resolve = automatic FAIL |
| 3 | Outcome fork | If both levers fail → document the limit + scope a trim follow-up; do NOT build trim in Session G |
| — | Premortem | Neil flagged ONE failure mode: "ship a TUNED edit, Omni ignores it." |

## The premortem firewall

Neil's flagged risk drove the plan's structure: **prove the engine responds to
prompt language with a live render BEFORE any TUNED edit exists.** The engine-
response test (Step 1) hand-wrote a maximally front-loaded prompt and rendered it
*directly* on Omni — no `geminiService.ts` edit. If a human's maximal attempt
cannot move Omni, no Flash-generated `Option A-Hook` prose ever could → the TUNED
file is never touched. **The firewall held: Step 1 FAILed, so `Option A-Hook` was
never edited.** `/goal` was skipped — Session G is a checkpoint-driven investigation.

## Method

Disposable harness in `.tmp/` (gitignored, defreezer-wiped): a Node render script
POSTing to the local `/api/kling/omni-video` proxy, polling, downloading the MP4;
frame extraction via Playwright HTML5-video seeking (ffmpeg is not installed on
the cafe PC). All renders on the committed Session F beans→latte substrate
([assets/session-f/](assets/session-f/)), `kling-video-o1`, std / 9:16. Verdicts
graded on a dense first-second grid (0/0.2/0.4/0.6/0.8/1.0s) against the locked
t≤0.6s rubric.

## Results

### Step 1 — engine-response test (prompt lever): ❌ FAIL (n=2)

A maximally front-loaded probe prompt — *"from the very first frame the
transformation is already at full velocity… the clip begins mid-morph… motion
fills the screen the instant the clip begins"* — rendered directly on Omni, twice
(n=2, to control for stochasticity). **Both renders: the first second (t=0→1.0s)
is a completely static bean cluster** — no liquefaction, no cream, no cup edge,
zero morph onset. The morph completes into the latte only by ~t=1.7s. Identical
to the Session F baseline. n=2 agree exactly — not stochastic noise.

→ *A maximally aggressive hand-written prompt cannot move Omni's first second.*

### Step 2 — duration test (duration lever): ❌ FAIL — worse

The same probe prompt rendered at `duration=3s`. The 3s clip's first second is
static, AND the morph onset moved *later* in absolute time: beans hold through
**t=2.0s**, latte resolves by **t=2.9s**. The dead head grew to ~2s — **67% of
the clip**. A shorter clip does not compress the dead head; Omni back-loads the
morph regardless and the static hold got proportionally and absolutely worse.

*Non-regression note:* both Step 1 and Step 2 renders *do* resolve to a clean
latte — the morph quality is fine. The defect is purely onset timing.

### Step 4 checkpoint — Neil decided: conclude

Both no-code levers FAILed decisively (n=2 + n=1, all consistent). At the gated
Step 4 checkpoint Neil declined the `negative_prompt`/`cfg_scale` params spike —
Step 1 proved Omni ignores prompt-text pacing guidance; `negative_prompt` is the
same text channel and `cfg_scale` only amplifies adherence to text that has no
pacing lever (low-confidence against decisive contrary evidence). *Correction
logged:* probing `negative_prompt`/`cfg_scale` needs **no** app-code change — the
Omni proxy zod schema already accepts both ([api/kling/omni-video.ts:22,26](../api/kling/omni-video.ts)); only *shipping* a params fix would touch the dispatcher.

Evidence: [assets/session-g/omni-dead-first-second-evidence.jpg](assets/session-g/omni-dead-first-second-evidence.jpg).

## The finding — a documented Omni pacing limit

**Kling Omni's two-frame morph holds the `first_frame` keyframe static for the
first ~1–2 seconds, then back-loads the entire transformation into a late burst.
This hold is structural — not controllable via prompt language or clip duration.**
A shorter clip makes it worse. This compounds Session F's finding ("Omni's two-
frame surface delivers exactly one motion: a gradual anchor-bridged
transformation"): that one motion is also **back-loaded**, and the back-loading
is not a prompt or parameter the caller can move.

## What did NOT change

- **`services/geminiService.ts` `Option A-Hook` — untouched.** The premortem
  firewall foreclosed a prompt edit before one was drafted; Step 3 (the TUNED
  edit) was never reached.
- **No code changes anywhere** — no `api/`, `services/`, `components/`, `App.tsx`
  edits. The harness was disposable (`.tmp/`).
- `VIDEO_MODEL_SPECS['Kling_O1']` durations unchanged — the 3s-duration spec edit
  was contingent on Step 2 passing; it FAILed.

## Carried to Session H — the trim follow-up

The structural fix is a **post-render head-trim**: render the hook ~1s longer
than needed, trim the dead head so the delivered clip opens on already-moving
morph. This touches the render/storage pipeline — wrong layer for Session G.
Scoped as **`post_beta_roadmap.md` item #9** (per locked decision #3). NOT built
in Session G.

## Session G status: ✅ CLOSED — documented limit

- **What users get now:** unchanged. Hook scenes still route to Omni; the morph
  works and resolves cleanly — it is just back-loaded by ~1–1.5s. No regression,
  no improvement. Session G is a knowledge outcome, not a code change.
- **Spend:** $0.75 of the $1.75 cap (Step 1 n=2 = $0.50, Step 2 = $0.25). Kling
  balance ~$5.75 remaining. Gemini: $0 (Gate 1 never reached).
- **Out of scope / carried forward:** the trim fix (roadmap #9); plus Session F's
  still-open items — crown-jewel VIRAL VFX MENU prune, cross-product validation
  (coffee only, n=1), the 10 `tests/unit/geminiService.schemas.test.ts` failures,
  RENDER ALL mixed-scene flow.

## Session log

- **2026-05-22 — plan + grill.** `grill-me` interview locked 3 decisions +
  premortem; plan approved; `/goal` skipped (checkpoint-driven investigation).
- **2026-05-22 — harness.** Disposable `.tmp/` render script + Playwright
  range/strip server built (Session F's were defreezer-wiped). Omni proxy
  smoke-test: 401 on no-token — route + auth OK.
- **2026-05-22 — Step 1.** 2 renders, maximal front-loaded prompt, std/5s/9:16,
  $0.50. Both: first second static. FAIL (n=2).
- **2026-05-22 — Step 2.** 1 render @ 3s, $0.25. First second static; morph
  onset ≥2.0s — worse than 5s. FAIL.
- **2026-05-22 — Step 4 checkpoint.** Neil declined the params spike → conclude.
- **2026-05-22 — Session G closed.** Documented Omni pacing limit; trim scoped to
  roadmap #9; `Option A-Hook` untouched.

## P0 next — Session H

1. **Omni hook head-trim** (`post_beta_roadmap.md` #9) — the structural fix for
   the dead-first-second. Render +1s, trim the dead head. Render/storage-pipeline
   change.
2. **Crown-jewel VIRAL VFX MENU prune** (deferred from Session F) — drop/gate
   Snap Cut + Invisible Effect + Chaos Burst as Omni-hook options; add the
   high-energy→impulse-category guardrail. Touches `api/_lib/prompts.ts` —
   per-flow approval required.
3. **Cross-product validation** (deferred from Session F) — the effect sweep and
   the dead-first-second finding are coffee-substrate only (n=1).
