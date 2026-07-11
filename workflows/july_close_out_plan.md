# July Close-Out Plan — isang session, lahat ng pending, sabay-sabay

**Written 2026-07-11 (Fable 5). Purpose:** Neil's single resume doc. Next session, ang
one-liner lang: *"Read CLAUDE.md + workflows/july_close_out_plan.md — execute."*
Everything here is sequenced cheapest-first with parallel lanes marked. Deep context
lives in [`sample_batch_test_spec.md`](sample_batch_test_spec.md) (13 findings),
[`oneshot_format_showcase.md`](oneshot_format_showcase.md), and the Omni resume doc on
`docs/omni-resume-state-post-launch`.

## What TODAY (2026-07-11) already closed — huwag nang ulitin

- **Producer flow ran END-TO-END live for the first time** (research → script → storyboard
  gate → FILM → First Cut → 3 preset downloads). The Jul-2 launch-gate smoke that died on a
  429 is effectively PASSED — evidence: 3 renders, Gemini-analyzed **real-human
  believability, high confidence, ×3**.
- Research-cache bypass bug FIXED (`47a306b`) — producer runs now reuse research per brand.
- All UGC Pro upload slots got reference examples (`754ca82`). Batch Test Spec + Hiraya
  Glow asset set committed. 13 findings logged in the spec.
- Omni Edit Styles: **discovered already MERGED (PR #47) + LIVE on prod**, beta-gated.
  Nothing to build — only Neil's eyeball + launch-gate review remain.

## July pending inventory (the full list — walang iba)

| # | Item | Owner | Cost |
|---|---|---|---|
| P1 | 4 code fixes (below) | codex-executor / code-executor | ₱0 Gemini |
| P2 | TUNED beat-0 fix via grill-me (evidence complete: 3 runs + Gemini corroboration) | Neil + main loop | ₱0 |
| P3 | Batch gate runs 5–12 + film winners | **Neil drives** | ang tanging totoong gastos |
| P4 | gemini-eval grades per render (fresh-context critics, parallel) | agent | maliit |
| P5 | Cut sample cards + `SAMPLES` manifest (needs ffmpeg — wala sa PC, `winget install ffmpeg`) | agent | ₱0 |
| P6 | Omni: Neil eyeball (GenerateVideo, local unlocked) + launch-gate telemetry review + Meta pixel/CAPI Vercel vars | **Neil** | ₱0 |
| P7 | "Recipe" → `UBIQUITOUS_LANGUAGE.md` | main loop | ₱0 |
| P8 | Merge train: PR `feat/niche-coverage-cheap-fixes` → main (PR-review loop critic first), merge `docs/omni-resume-state-post-launch` (browser: `github.com/yopiheart/grifon-command/compare/main...docs/omni-resume-state-post-launch` — walang gh CLI sa PC) | Neil approves | ₱0 |
| — | NOT ours: `docs/believability-refstack` (39 ahead, the parallel session's thread) · `feat/expert-mode-directors-cut` (parked) · `wip/seedance-merge-backup` (backup only) | — | — |

**P1 — the four code fixes (one batch brief, single executor pass):**
1. "Start over" button at the producer storyboard gate — clears `osa_producer_active_run`
   (finding #5; `components/OneShotAd/ProducerFlow.tsx`, `handleMakeAnother` already exists).
2. First Cut **"None/Raw"** preset (stitched-only, no fx) (finding #11; `FirstCutScreen` +
   preset switcher — ⚠ `api/_lib/renderPresets.ts` is TUNED, add alongside, don't edit).
3. Post-VO static-tail trim or slow push-in on the final scene (finding #12 re-diagnosis —
   EDL layer; investigate first, TUNED-adjacent).
4. Presenter-mismatch guard: face-bearing before/after uploads + Auto presenter → derive
   presenter from `after` photo O magpakita ng warning (finding spec §2; needs ONE design
   call from Neil at session start: derive vs warn).

## Next-session sequence (sunod-sunurin ito)

**Phase 0 — boot (5 min).** `/usage` check. **⚠ Fable sunset = Jul 13 2:59 PM PHT** — kung
bago ang sunset, gawin ang Phase 2 (TUNED work) HABANG Fable pa ang main loop; kung after,
Opus 4.8 na + `/fable-mode`. Then: `npm install`, `npm run dev`, `scripts/restore-codex.ps1`,
`winget install ffmpeg` (para sa P5), log in sa app, `?osaEngine=producer` once.

**Phase 1 — fire-and-forget lanes (parallel, ₱0 Gemini).**
Neil answers 1 question (derive-vs-warn sa P1.4) → buong P1 batch → **codex-executor lane**
(mechanical, billed sa ChatGPT; fallback code-executor per dispatch rules). Habang tumatakbo:
Phase 2.

**Phase 2 — the TUNED fix (Neil + strongest model, ₱0).**
`/grill-me` sa TRANSFORMATION beat-0 strengthening (bakit 3/4 runs walang problem-hook/
before-beat; ang appearance-guardrail-overcorrection hypothesis ay nasa spec finding #6).
Approved diff → apply sa `api/_lib/prompts.ts` sa main loop → byte-invariance fixture dump
sa ibang formats (Slice-4 pattern) → build + tests + bundle-leak check.

**Phase 3 — the batch (Neil drives; ito lang ang gastos).**
Order: `before_after` (gate re-run sa bagong prompt) → `try_on` → `unboxing` →
`unboxing_asmr` → `demo` → `tutorial` → service B&A → RE walkthrough. Presenter rules:
face-bearing runs = SET `after.png`; face-free = Auto. Research = cached na (instant).
Film ONLY storyboards na pumasa sa mata mo. Runs 1–4 (old formats, sample cards lang) =
kung may budget pa, else defer.

**Phase 4 — grade + cut (agent, parallel sa Phase 3 habang nagre-render ka).**
Fresh-context gemini-eval critic per render (P4) → winners: cut 2–3s beat →
`public/samples/formats/<recipeId>.mp4` (≤400KB, muted) + `.webp` poster (P5) → `SAMPLES`
manifest → build + tests.

**Phase 5 — Neil's eyeballs + merge train.**
Omni eyeball sa GenerateVideo + launch-gate review (P6) → "Recipe" glossary (P7) →
PR-review-loop critic sa buong branch → open PR → **isang merge day: niche-coverage +
omni docs sabay** (P8).

## Paste-ready kickoff (next session)

> Read CLAUDE.md + workflows/july_close_out_plan.md. Execute the plan: ask me the P1.4
> design question, then fire Phase 1 (codex-executor batch) and Phase 2 (/grill-me beat-0)
> — sabay. I'll drive Phase 3 batch runs habang tumatakbo ang iba.
