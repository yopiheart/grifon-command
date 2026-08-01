# July Close-Out Plan — isang session, lahat ng pending, sabay-sabay

> **⛔ NO LONGER THE RESUME DOC (superseded 2026-08-01 — the resume doc is [`NOW.md`](../NOW.md)).**
> Kept as the July close-out record. Its inventory below is July-accurate; do NOT start a session
> from here or you will re-derive three-week-old state.

**Written 2026-07-11 (Fable 5). Purpose (as-written):** Neil's single resume doc. Next session, ang
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
dedup):** `SFX_V2_ENABLED='true'` is SET sa Vercel PREVIEW at CONFIRMED ACTIVE — ang
parallel session (2026-07-13) ang nag-set nito TAPOS nag-fire ng preview deploy ng main na
Ready na (ear-gate build). Note sa future checks: Sensitive type ang var kaya `vercel env
pull` ay laging blank para dito — hindi ibig sabihin walang laman; ang env ls timestamp +
deploy behavior ang totoong signal. Lahat ng preview deploys pagkatapos ng set (kasama ang
`feat/niche-coverage-cheap-fixes` builds ngayong araw) ay may flag nang baked in.

**⚠ DALAWANG PREVIEW bukas (hanggang sa merge train):**
- **SFX ear-gate** = main's preview `grifon-command-ac7l0k32z-neilmaglayabusiness22-2085s-projects.vercel.app`
  (built from `cc68ede`, may SFX Slices 1+2, WALANG overlay engine) — impact/hype re-cuts +
  listening dito. Agent can tail `[renderFfmpeg:diegetic]` runtime logs during the session
  (definitive answer din sa ₱/% aligner question). Pass → flip P13 to `applied` sa
  viral_swipe_file.md + log Slice 2 acceptance sa sfx_upgrade_plan.md (on main); dud
  variants = data-only prune. Prod stays flag-off until Neil flips.
- **Batch runs 2–8 + overlay presets** = branch preview ng `feat/niche-coverage-cheap-fixes`
  (may punch/bars/spotlight, WALANG SFX v2 code pa). Merge train (Day 3–4) collapses this
  into one surface. 2–3 batch runs dapat
may literal `₱499` / `50% off` / `sale` sa script; re-cut winners on impact/hype sa
preview (FFmpeg-side lang, ₱0 extra Gemini) → same batch closes the SFX combined ear-gate
(sfx_upgrade_plan.md on main). Watch for S1 tail-fill 3rd corroboration → fix ladder
(per-scene VO-end trim muna, TUNED last, grill-me gated) habang Fable pa.

## RESUME STATE — 2026-07-14 session close (Day 2: 2 P0 bugs caught, batch paused on 1 GO)

**Shipped on this branch (all pushed):**
- **P0 #17 FIXED (`aa7a24c`):** manual Presenter/hero uploads read files RAW →
  multi-MB base64 in the CREATE checkpoint → 413 vs api/producer/run's 2mb cap →
  run row never created → FILM died `run_not_found`. Fix: `compressImageForUpload`
  sa both call sites + `slimCheckpointInput` transport guard (sibling ng
  `slimCheckpointArtifacts`) + unit test. 701 tests green, bundle-leak 0.
  Real-user P0 — any custom-presenter phone photo would've hit this.
- **Findings #17 + #18 logged** sa `sample_batch_test_spec.md` (`b19a135`).
- **Day-2 branch preview (may 413 fix): `grifon-command-m1m8opu16-…vercel.app`.**
  Old two-preview map URLs superseded: batch = m1m8opu16 (o kung ano ang pinakabagong
  branch deploy — kunin via GitHub deployments API, walang gh CLI), ear-gate = main's
  ac7l0k32z pa rin.

**⛔ THE BLOCKER — P0 #18, R2 CORS (kailangan ng Neil GO, wala nang ibang nakaharang):**
`grifon-media` R2 bucket has NO CORS policy → EDL stage's browser fetch ng audio
overlays (geminiService ~L1440, presigned R2 URLs post-migration) ay namamatay →
**LAHAT ng producer runs mamamatay sa "CUTTING THE EDIT", pati sa PROD pag-launch.**
Fix = one-time bucket CORS, GET/HEAD only (signed URLs stay the auth; uploads are
server-side kaya walang PUT). Options presented, Neil left before deciding:
**A (reco)** `AllowedOrigins:*` via S3 API gamit ang R2 keys sa .env (agent runs it,
needs explicit GO — permission gate blocked the unprompted attempt, correctly) ·
**B** `https://*.vercel.app` + prod domain · **C** Neil manually: Cloudflare dash →
R2 → grifon-media → Settings → CORS → paste
`[{"AllowedOrigins":["*"],"AllowedMethods":["GET","HEAD"],"AllowedHeaders":["*"],"ExposeHeaders":["Content-Length","Content-Type","ETag"],"MaxAgeSeconds":3600}]`.
**Pag set na: Neil presses RETRY sa m1m8opu16 tab — try_on run 2's film spend is
BANKED server-side, resumes at EDL, walang re-film.** (Kung nawala ang tab/origin
state: bagong run na lang, mura na ulit dahil cached research + the fix.)

**try_on run 2 storyboard verdict bago namatay:** pasado structurally (application
reveal, onbody anchor honored, identity lock ×4, S1 hallucination fixed by one
per-scene REGENERATE). **Instant-claim ladder TRIGGERED — corroboration #3** ("Literal
na instant glow ang binigay") → claims-guardrail strengthening dapat dumaan sa
**grill-me (TUNED route)**, Fable window hanggang Jul 20. Offer/₱499 absent sa script
ulit (2nd corroboration) — kaya ang literal-price ear-gate runs ay nakasalalay sa
UGC+HYPE / Product UGC runs o sa pure_hype (deal-text-by-design).

**Ear-gate correction sa Day-2 plan:** producer resume ay localStorage-bound (walang
cross-origin/runId resume) → branch-preview runs HINDI mare-re-cut sa main preview.
Ear-gate = 1 dedicated run SA main preview mismo (`ac7l0k32z`): **walang recipe
gallery doon (branch-only ang recipes.ts)** — gamitin ang old picker: Format=UGC +
Strategy=HYPE (≈hype_drop) o Product UGC (≈rapid_fire). **Presenter=AUTO LANG** (ang
413 fix ay wala sa main). Captions-gate bago mag-FILM: dapat may literal ₱499/50%
off/sale, else regenerate. Pagkatapos: First Cut → IMPACT re-cut → HYPE re-cut
(₱0 FFmpeg) habang tine-tail ng agent ang `[renderFfmpeg:diegetic]` (Vercel MCP
re-authed na sa tamang scope 2026-07-14 — claude.ai-side, survives defreezer).

**Session infra notes:** Vercel MCP scope fixed (list/logs verified working). Branch
preview URLs kinukuha via GitHub deployments API gamit ang git credential-manager
token (pattern: deployments?sha=<head> → statuses → environment_url). ffmpeg
re-armed portable this session (wiped na naman bukas — re-arm ulit). Main's
lockfile-drift stash (`stash@{0}` on main) = disposable noise.

## RESUME STATE — 2026-07-15 (Day 3, in session)

**⛔→✅ P0 #18 R2 CORS RESOLVED.** Neil GO'd Option A → .env R2 token is object-scoped
(PutBucketCors 403; needs Admin R&W token) → fell back to Option C (dash paste).
Correction: bucket HAD a policy (grifon.ai/www/localhost, GET only) — the gap was
preview origins + HEAD. Now `*` GET/HEAD, verified: preflight 204 + presigned GET with
vercel Origin → 206, ACAO `*`. Nothing blocks the batch. Latest branch preview =
`grifon-command-ijn54f9t3-…vercel.app` (supersedes m1m8opu16). Grill-me evidence pack
for the instant-claim TUNED fix ready at `.tmp/grill-instant-claim-evidence.md`
(regenerate from spec findings #4b.1/#17/#18 if wiped).

## Paste-ready kickoff (Day 3)

> Read CLAUDE.md + workflows/july_close_out_plan.md (RESUME STATE 2026-07-14). Una:
> R2 CORS GO — pinili ko ang Option ___ (A/B/C). Pag set at verified, ita-Retry/
> re-run ko ang try_on sa latest branch preview; ikaw: gemini-eval critic per render,
> sample cards pipeline, at i-queue ang grill-me para sa instant-claim TUNED fix
> (ladder triggered, corrob #3). Tapos ear-gate run sa main preview (UGC+HYPE, AUTO
> presenter, captions-gate) — tail mo ang diegetic logs sa re-cuts. Runs 3–8 sunod
> per the matrix.

## RESUME STATE — 2026-07-16 evening session close (Day 4: MERGED + prod live, v2 assets ready)

**DONE this session (all on main, pushed):**
- **PR #58 MERGED → prod deploy READY** sa grifon.ai (commit `8a36dfc`, Kling keys +
  ffmpeg 5.2.0 pin + buong grill bundle baked). Hindi ito one-click: nag-CONFLICT sa main
  (7 files) dahil sa #61 + believability merges kagabi. Resolutions worth knowing:
  - `api/gemini/text.ts`: pinagsama ang UGCPro dispatch + verb-reroll (branch) at ang
    hook-starvation retry #59 (main) — order: generate → hook-retry → verb-reroll →
    `ugcProFormatResolved`. Regression-test mock mirrored. Build ✓ 766 tests ✓ CI ✓.
  - **Swipe-file ID collision resolved by renumber:** TEMU batch (Jul 9) at creator batch
    (Jul 12) parehong kumuha ng P12–P14/E8+ sa parallel branches. TEMU → **P15–P17 /
    E15–E18**; creator keeps P11–P14/E8–E14 (naka-cite na sa sfx/omni docs); believability
    family → **P18+**. `temu_respec_brief.md` refs updated. **NEIL: review this call.**
- **Hiraya Glow v2 asset set** (`tests/fixtures/sample-batch-v2/`, commit `9092250`) —
  raw-UGC realism scaffold via codex-image/gpt-image-2 (formula is gpt-image-2-ONLY).
  Chain: after=edit(before); packaging/inuse=edits(hero); onbody=dual-anchor(after+hero).
  Agent triage: all 6 coherent. **PENDING NEIL GRADE.** Neil question sa `inuse.png`
  (patak sa likod ng kamay — sinadyang swatch gesture; v1 was drop-only): regenerate kung
  ayaw. `generate-zam-images.zip` stays UNTRACKED by standing decision (real-person
  identity anchors — Neil pushes it himself or re-drops from ChatGPT side).

**TOMORROW — first acts (prod na lahat, walang preview):**
1. Neil logs in sa app.grifon.ai, fires **`try_on`** run = the launch-gate run.
   Fill-out: Hiraya Glow brief verbatim (spec §1) + v2 slots + **Presenter = SET,
   upload v2 `after.png`**. Engine `?osaEngine=producer`.
2. **Gate A** Kling scenes film (agent tails prod runtime logs) · **Gate B** PUNCH preset
   renders sa First Cut (drawtext check) · **Gate C** hook VO present sa unang ~2.6s
   (#26 watch — spectrogram kung duda).
3. Pass → **`unboxing`** run (Presenter = **AUTO**, face-free uploads), tapos runs per
   matrix. Agent: gemini-eval critic per render (fresh-context, walang first-pass
   timestamps sa corroboration passes — spec §32a) + sample cards sa winners.

## RESUME STATE — 2026-07-16 ~02:00 session close (Day 3/4: the bug-massacre night)

**SHIPPED on branch (all pushed, HEAD `f9c50fb`):** R2 CORS fixed+verified (P0 #18) ·
main CI unbroken (lockfile revert `689dd84`, lesson logged) · Kling keys added to Vercel
Preview+Prod (P0 #20, launch save) · O1 hook-morph routing removed producer (`65e69de`)
AND GenerateVideo · ffmpeg-static pinned 5.2.0 (P1 #24 — 7.0.2 linux asset had NO
drawtext; probe-verified fixed; preset smoke = permanent launch-gate item) · grill-me
TUNED bundle (instant-claim guardrails tryon+speed-rule ×2, Kling 12/hr + config-first,
hook-title fallback, single-x-source captions karaoke+invert, ffmpeg self-check,
thumbnail UI surface [dormant — no producer writer yet, Neil cost call pending],
resume loading state) — 8-angle review pass applied, 716 tests green, byte-invariance
proven. Spec findings #19–#33 lahat committed.

**Batch status:** try_on run 3 = eval data (S1 O1 morph, FAILED sample-card gate —
pre-routing-fix). Fresh runs needed: try_on re-run + unboxing → tutorial (AUTO
presenter sa face-free). Kling pool now 12/hr. Instant-claim fix LIVE sa next scripts.

**Hook-VO (#26):** deployed punch cut had NO hook VO (spectrogram-definitive) pero
UNREPRODUCIBLE sa post-bundle tree (440Hz probe present lahat ng preset configs) at
mix+loudnorm exonerated — WATCH on next deployed preset render only.

**MERGE TRAIN: PR is OPEN, CI running — MERGE IS NEIL'S FIRST ACT TOMORROW** kung
green: (1) PR CI ✓, (2) after merge: prod deploy bakes Kling keys — VERIFY, (3) prod
preset-render smoke (PUNCH sa isang test run), (4) SFX_V2/OMNI env decisions sa prod
flags (hiwalay sa merge). Ear-gate run sa main preview + sample cards + gemini-eval
critics = after merge (isang surface na lang).

## RESUME STATE — 2026-07-18 session close (Day 5: launch-gate run BLOCKED on Kling credits)

**The try_on launch-gate run FIRED on prod** (`grifon.ai/app?osaEngine=producer`, Hiraya
Glow v2 assets, Presenter = SET `after.png`) and got all the way through research →
storyboard gate → FILM IT before dying at filming. Full findings: spec §4c
(`sample_batch_test_spec.md`).

**Storyboard-stage findings (all logged §4c, Neil's eyeball):** S1 warm-cast grade drift
(regen fixed it, then S2's regen rolled warm → drift is stochastic per-roll, 2/3
corroboration) · S2 floating-dropper hallucination RECURRING 2/3 rolls + brand label lost
on the accepted roll (apply-action framing weakens the product anchor) · REGENERATE has no
undo (a bad roll destroyed a clean one) · S4 Taglish naturalness "Bet ko na" (1/3) ·
S1 instant-reveal beat-0 watch.

**The block: Kling API balance exhausted — CONFIRMED in the Kling console.** 3 trial
resource packs, **0 in effect**: 2× Depleted (100/100 pts), 1× **Expired at 44.8%**
(~55 pts lost to expiry — the run died on credits that had already lapsed, not on burn).
Server behaved correctly (4× 402 `kling_balance_exhausted` post-submit,
api/kling/video.ts:165); the producer UI did NOT — scenes just said "FLAGGED", no top-up
CTA (§4c 3d, HIGH-priority UX fix candidate).

**TOMORROW (2026-07-19) — first acts:**
1. **Neil: buy/renew a Kling resource pack** (trial packs are gone; "Contact us for
   purchase" / API Purchase in the console). Budget for the full matrix: ~50+ scenes
   across the 12 runs, not just the 4-scene retry.
2. Reload the producer tab — run checkpoint (`osa_producer_active_run`,
   finishedAdId `apr_deb422f2-2ada-4fec-806d-e5cdf885e0cc`) persists; retry the 4 flagged
   scenes. If the checkpoint went stale/unrecoverable, re-fire try_on fresh (storyboard
   regen cost only; brief + uploads per spec §1/§2).
3. Agent: tail prod runtime logs during filming (**Gate A**) → **Gate B** PUNCH preset
   drawtext on First Cut → **Gate C** hook VO in first ~2.6s (spectrogram if in doubt).
4. Pass → `unboxing` run (Presenter = AUTO, face-free) → rest of the matrix per spec §3
   priority order.
