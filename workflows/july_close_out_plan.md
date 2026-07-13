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

## RESUME STATE — 2026-07-12 session close (read this first)

**DONE and pushed on this branch (`feat/niche-coverage-cheap-fixes`):**
- **Phase 0–2 complete.** P1 4-fix batch shipped via Codex/Sol trial run #1 (`8114e63`):
  start-over at storyboard gate, RAW ('none') first-cut preset (now the DEFAULT), presenter
  derive-from-after (spec §2; decision was DERIVE with notice+override), preset-failure
  rollback. P2 beat-0 fix shipped (`797ce08`): root cause was `deriveAngleBrief`'s
  "open with: X" fighting the transformation skeleton — demoted to "hook inspiration
  (skeleton ALWAYS wins)" + Neil-approved ANGLE OVERRIDE GUARD sentence in the TUNED
  transformation-product block. Deterministic beat-0 validator DEFERRED (evidence-bound).
- **Phase 3 gate run 1 (`before_after`) = PASS, live, all fixes verified** (spec findings
  #14–16, `d44878a`/`37a5a60`): problem-state hook held, presenter derive worked, dead air
  gone, Gemini watch confirmed real-human ×4. Raw videos in `tests/fixtures/sample-batch/`.
- **S1 post-VO tail-fill cutaway = the open bug** (finding #15, 2nd corroboration): hook VO
  ~2s, clip 4s → model invents a gibberish product B-roll at 2–3s. Fix ladder: per-scene
  VO-end trim → shorter hook clips → TUNED no-invented-props (grill-me). Need 1 more
  corroboration from runs 2–8.
- **Overlay upgrade APPROVED (Neil):** 3 BOLD white/black caption presets — punch / bars /
  spotlight — artifact rev 2 at
  https://claude.ai/code/artifact/29b2d79d-350d-40a5-a6da-8bb3ac4ca97d. ENGINE build was
  dispatched to the Codex lane end-of-session (brief:
  `.tmp/brief-overlay-styles-engine.md` — regenerate from this plan + artifact if .tmp got
  wiped); **if its diff is uncommitted or missing, re-dispatch the engine brief first.**
  UI half (switcher chips + Business "Advanced Editor" teaser, flag-gated OFF, copy =
  "Your ad. Re-cut like a film studio did it." / CTA "Watch your cinema cuts →", shows to
  Starter+Pro — there is NO "Creator" tier) goes to `code-executor` AFTER engine lands.
- **Housekeeping:** Vercel overdue invoice PAID (2026-07-11). `get-smoke-otp.ps1` broken
  (401 — see session_reminders). ffmpeg = portable re-arm (see session_reminders). Codex
  trial log has run #1 (`workflows/codex_executor_trial.md`). Fable sunset Jul 13 2:59 PM
  PHT — next session may boot on Opus 4.8 via the hook; that's expected, use /fable-mode.

**Still open (the remaining close-out):** Phase 3 runs 2–8 (try_on next — set Presenter =
after.png MANUALLY, derive only fires on before/after pairs) · per-render gemini-eval (P4)
· sample cards + SAMPLES manifest (P5, ffmpeg re-arm first) · Omni eyeball GenerateVideo +
launch-gate review (P6) · "Recipe" glossary (P7) · optional free fix: presenter-mismatch
hint line (Neil undecided) · merge train (P8).

## RESUME STATE — 2026-07-13 session (launch-week Day 1 DONE)

**Launch week decided (Neil, 2026-07-13): target = launch bago mag-Sunday Jul 19.** Full
week plan: Day 1 engine/teaser → Day 2–3 batch → Day 3–4 merge train → Day 4–5 IM8 offer
+ website copy/VSL (gamit ang batch sample cards, walang re-render) → Day 5–6 launch.
Cut from scope: Concierge test (PoC-only, Business-tier, not on the launch path). Parked
post-launch with triggers: ChatGPT-image tier (gated on refstack shoot), sales
teleprompter, voice assistant, OPEX dashboard. Metrics answer sa Neil's question: 30/90-day
access ≠ MRR — track trailing-30d revenue run-rate, active paid accesses per tier,
repurchase rate, API-cost-per-active-user.

**Overlay upgrade SHIPPED on this branch (both halves):**
- `d74ee61` ENGINE: punch/bars/spotlight additive presets (the 2026-07-12 in-flight Codex
  diff never landed — re-dispatched from a regenerated brief, Codex trial run #2, zero
  blocking findings, byte-invariance vs existing snapshots verified). NOT in rotation
  pools — explicit-id only via the switcher.
- `f8edf63` UI: 3 pro-locked switcher chips + Business "Advanced Editor" teaser,
  `ADVANCED_EDITOR_TEASER_ENABLED=false` sa FirstCutScreen.tsx (zero DOM). Brand-checked
  (37/50, 0 critical, nits fixed). Flag-flip note: teaser CTA = 2nd solid-gold sa
  Download-Ad fold — revisit hierarchy when enabling.
- Eyeball note sa first render: hook titles still carry IMPACT's gold highlight (white/
  black doctrine = captions only, deliberate); sabihin kung gusto ring i-monochrome.
- ffmpeg re-armed portable (`.tmp/ffmpeg/`, command sa session_reminders). Codex login
  survived. Fable sunset EXTENDED to Jul 20 2:59 PM PHT (Anthropic email 2026-07-13) —
  TUNED work window is the whole launch week.

**Day 2–3 = THE batch (the only spend).** Runs 2–8, `try_on` first (Presenter =
`after.png` MANUAL — derive only fires on before/after pairs). **Ear-gate fold-in (cost
dedup):** Neil sets `SFX_V2_ENABLED='true'` sa Vercel PREVIEW muna; 2–3 batch runs dapat
may literal `₱499` / `50% off` / `sale` sa script; re-cut winners on impact/hype sa
preview (FFmpeg-side lang, ₱0 extra Gemini) → same batch closes the SFX combined ear-gate
(sfx_upgrade_plan.md on main). Watch for S1 tail-fill 3rd corroboration → fix ladder
(per-scene VO-end trim muna, TUNED last, grill-me gated) habang Fable pa.

## Paste-ready kickoff (next session)

> Read CLAUDE.md + workflows/july_close_out_plan.md (RESUME STATE 2026-07-13). Launch
> week Day 2: I'll drive Phase 3 runs 2–8 (try_on first, presenter = after.png manual,
> literal ₱499/50% off/sale sa scripts ng 2–3 runs). You: gemini-eval fresh-context critic
> per render, watch for the S1 tail-fill 3rd corroboration, then sample cards (ffmpeg
> re-arm command sa session_reminders) + SAMPLES manifest + build/tests. Ear-gate = re-cut
> winners on impact/hype sa Vercel preview with SFX_V2_ENABLED=true.
