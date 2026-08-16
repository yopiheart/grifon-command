# Sample run — `before_after` / Hiraya Glow (prepared 2026-08-16, NOT yet run)

**Status: PRE-FLIGHT COMPLETE, waiting on Neil to fire it.** The agent never fires a paid
producer run; Neil drives, the agent grades ([`sample_batch_test_spec.md:21`](sample_batch_test_spec.md)).

**Why this recipe and not `real_talk`.** Neil asked for a 4-scene, customer-length sample.
There is **no scene-count dial on the producer path** — `generateAdScript` takes no count or
duration argument ([`producerOrchestrator.ts:1438`](../services/producerOrchestrator.ts#L1438)),
`SCENE_CAP` has **zero** references in `producerOrchestrator.ts` (confirming finding #4 of
[`pilot_run_2026-08-13.md`](pilot_run_2026-08-13.md)), and the orchestrator simply follows
`sb.scenes.length` ([:1468](../services/producerOrchestrator.ts#L1468)). Scene count is set by
the TUNED skeleton: `real_talk` (ugc · Testimonial) is an **8-beat** structure
([`prompts.ts:907-914`](../api/_lib/prompts.ts#L907)), which is *why* the pilot came back at 10
and `apr_69e5adc6` at 9 — structural, not chance. Forcing it to 4 would mean editing a TUNED
prompt. ⛔ Not for a test.

4-beat skeletons that exist today: **TRANSFORMATION** ([`prompts.ts:716`](../api/_lib/prompts.ts#L716))
= `before_after` · **UNBOXING** ([:602](../api/_lib/prompts.ts#L602)) · **TRY-ON**
([:571](../api/_lib/prompts.ts#L571)). `demo`/`tutorial` are 5-beat. Neil picked
`before_after` — it is also #2 in the agreed order in
[`format_sample_readiness.md`](format_sample_readiness.md) and has never been completed as a sample.

---

## Pre-flight — done and verified this session

| # | Item | Result |
|---|---|---|
| 1 | Fixture PNGs on disk | ✅ **Was a blocker.** This is a **lite clone** (`core.sparseCheckout=true`, `partialclonefilter=blob:none`) and `!/tests/fixtures` was excluded, so the images were git-tracked but absent while `git status` stayed clean. Fixed with `git sparse-checkout add "/tests/fixtures/sample-batch/*.png"`; all 6 PNGs verified present (`after.png` 2.6 MB). |
| 2 | The 07-14 P0 413 presenter-upload bug (finding #17) | ✅ Both halves on `main`: `compressImageForUpload` at the Presenter dropzone ([`LaunchScreen.tsx:1172`](../components/OneShotAd/LaunchScreen.tsx#L1172)) and `slimCheckpointInput` ([`producerRunService.ts:161`](../services/producerRunService.ts#L161)). Matters because this run **requires** a manual `after.png` upload — the exact path that died. |
| 3 | ElevenLabs `forced_alignment` (issue #96) | ✅ `node scripts/check-elevenlabs-alignment.mjs` → `PERMISSION_OK` (`VOICES_STATUS=200`, `ALIGNMENT_STATUS=400` empty-file). ₱0. ⚠️ **LOCAL key only** — the probe says so itself; the Vercel production key is a separate secret and is a dashboard check Neil still owes. |
| 4 | Files API attach is live in prod | ✅ `a841f69` is on `main` (`git branch --contains`), and prod deployed `18d6310` after it. `EDL_MAX_ATTACHED_VIDEOS = 10` ([`geminiService.ts:1189`](../services/geminiService.ts#L1189)). |
| 5 | Rate limits read from code, not docs | Veo `VIDEO_LIMIT = 5`/hr ([`api/gemini/video.ts:29`](../api/gemini/video.ts#L29)), Kling `12`/hr ([`api/kling/video.ts:26`](../api/kling/video.ts#L26)). A 4-scene run cannot exceed either. |

**⛔ `GRIFON_DEV_UNMETERED_VIDEO` is impossible here.** The run is on prod, and the flag throws
on module load when `VERCEL` is set ([`supabaseAdmin.ts:10-17`](../api/_lib/supabaseAdmin.ts#L10)) —
setting it takes the whole API down rather than unmetering it. This run is metered like a real
user's: one `video_ads` credit for the finished ad ([`quota.ts:174`](../api/_lib/quota.ts#L174)).

---

## Inputs — enter ONLY these

Order matters: **hero image FIRST, brand DERIVED from its label, Market Research BEFORE
Director AI, and the brand/offer fields are NEVER typed by hand** (`.claude/skills/director-smoke/`).

| Field | Value |
|---|---|
| Hero photo | `tests/fixtures/sample-batch/hero.png` — handheld amber dropper, label legible |
| Brand (read off the label) | **Hiraya Glow** |
| Product | Vitamin C Brightening Serum, 30 ml |
| Offer | **₱499 launch promo (reg. ₱799), free shipping nationwide, ends Sunday** |
| Vertical / engine | `product` · `grifon.ai/app?osaEngine=producer` |
| Recipe | `before_after` (ugc_pro · transformation) |
| **Presenter** | 🔴 **SET — upload `after.png`. NOT Auto.** |
| Slots | `hero` → `hero.png` · `before` → `before.png` · `after` → `after.png` |

### `before.png` + `after.png` REGENERATED 2026-08-16 — Neil rejected the originals on sight

*"Mukhang slop/AI yang nasa after png."* The two person-state photos were rebuilt before this
run; `hero.png` was NOT touched (product-only, label legible, never the complaint).

**Formula:** the raw-ugc 8-block scaffold from
[`ugc-photoreal-prompt-pack.md`](believability-samples/ugc-photoreal-prompt-pack.md) + the
**master-daylight** lighting rule from [`marvin-avatar`](../.claude/skills/marvin-avatar/SKILL.md)
(positive light target stated FIRST, bans underneath — a bans-only stack makes the model
underexpose). Generated on the codex-image lane (gpt-image-2), ₱0 Gemini/Claude spend.

**⛔ Neil asked for the `#3 skincare flash` prompt and it was NOT used, deliberately** — #3 is a
NIGHT FLASH photo and cannot coexist with master daylight. Resolved against the pack's own
finding that **"flash not required — the realism carrier is texture + context"**, so #3's
skin-texture and authored-imperfection lines were carried over and its lighting was not.

**⛔ Mirror selfie (`#7`) was tried FIRST and rejected — the phone covers half the face** (Neil:
*"baka di makuha ung consistency"*). Correct: `after.png` is also the **presenter**, i.e. the
avatar identity anchor for all 4 scenes. The fix was a **front-cam selfie / friend-candid**
framing — full face, no phone in frame.

| File | Roll | Why it won |
|---|---|---|
| `after.png` | friend-candid, head-and-shoulders, living room | Straight-on, **no wide-angle distortion**, nothing entering the frame edge, full jawline + both ears. Best geometry for the identity lock. |
| `before.png` | `--edit` off `after.png`, strongest of 3 severities | Same woman, room, shirt, hair, framing and light; **only skin + mouth changed.** |

**Two findings from the session, both worth carrying:**

1. **`--edit` preserves identity where reference-generation drifts.** The 2026-07-16 Zam
   single-anchor test drifted badly; this pair held perfectly. Different mechanism — editing the
   pixels, not generating a new scene from a reference. **For state-change pairs (before/after,
   tryon), `--edit` off the approved frame is the route.**
2. **Identical prompts return byte-identical images on this lane** (two rolls, same md5). To get
   real variants, vary the prompt.

⚠️ **Prompt severity ≠ perceived severity.** Three graduated "dullness" prompts were written; Neil
graded the labels **inverted** — the roll prompted as *strongest* read as moderate to him and
vice versa. Do not trust a written severity dial on skin state; generate a spread and let his eye
pick. The winner is the one prompted as strongest, chosen as *"haggard sya pero hindi sobra,
hindi rin kulang."*

**Offer box — the literal offer only.** Do not paste the benefits paragraph.
[`sample_batch_test_spec.md`](sample_batch_test_spec.md) §1 still carries the old long brief;
[`pilot_run_2026-08-13.md`](pilot_run_2026-08-13.md) "PRODUCT TRUTH" supersedes it — real users
paste only their literal package offer and Market Research does the rest. **That spec section is
still owed an update.**

**Why Presenter = SET.** The PRESENTER-COHERENCE RULE (`sample_batch_test_spec.md` §2):
transformation beats put both `referenceImage="avatar"` and `venueSlot="before"/"after"` on the
same scene, so an Auto-cast avatar that differs from the woman in `before.png`/`after.png` renders
two different faces in one ad.

---

## The storyboard gate — count before RENDER ALL

1. **Scene count should be 4.** 5 or more means the TRANSFORMATION skeleton did not hold — flag it,
   it is a finding either way.
2. **Beat 0 must be the BEFORE, with NO product.** This rule was violated systematically (3/4 runs,
   findings 4b #6/#10), then fixed and confirmed on 2026-07-12 (`797ce08`, finding #14). This run
   re-tests that the fix held.
3. **Identity lock** — same woman in every scene.
4. **`talking` scene count ≤ 5.** At 4 total scenes this cannot fail, but count anyway: at 6 the run
   dies mid-way with a 429 and a one-hour lockout.
   ⚠️ **Unresolved discrepancy:** the blind pilot's cost table shows **6** Veo talking scenes
   ([`pilot_run_2026-08-13.md`](pilot_run_2026-08-13.md) COST) against a hard 5/hr limit. Nobody has
   explained that. Do not assume 6 works.
5. **Step 5 "VISUAL ASSETS MISSING" yellow banner is a HARD STOP**, not a warning to click past.

---

## What this run exists to answer, in order

1. **Does the EDL make a VISUAL observation, or is it still script-only?** This is the whole point
   of the watched run. Slice 1 of [`gemini37_adoption.md`](gemini37_adoption.md) found that with 4
   real clips attached, **neither** arm said anything about the picture — `weaknessesFlagged` came
   back script-level on both. If that repeats under Neil's eye, the attach earns nothing and should
   be reverted, saving 2.2x input tokens per EDL call.
   **⏪ Rollback if it 429s or earns nothing: `git revert -m 1 a841f69`.**
2. **Does the ₱499 offer survive into the script?** Free observation, and it bears on Slice 4
   (flash-lite dropped the offer 4/4 in the harness). Three prior runs recorded the offer never
   surfacing.
3. **Is the cut good enough to become the first `SAMPLES` card?** `SAMPLES` is still `{}`
   ([`recipes.ts:108`](../components/OneShotAd/recipes.ts#L108)), so **this would also be the first
   time the sample-card path has ever run.** 🔴 Only Neil's eye can pass it.

## Known open defects to watch, not to be surprised by

- **Colour-grade drift across scenes** — 3/3 corroboration, the TUNED proposal is unlocked. A
  deterministic alternative touching no prompt: one LUT at the render stage (`tools/grade.mjs`).
- **Hook morph goo** — high-variance; salvage is Neil's eye + NEW TAKE (2 free).
- **Scene-image gate holes** — it passed an illegible "HIRAYA GLOW" label, one scene's
  `gate_verdict` came back `null`, and it inspects **stills only**, so video slop is invisible to it.
- **REGENERATE has no undo** (finding 4c #2b) — a bad re-roll silently destroys a good frame.

## ⏳ Perishable

Every media URL is presigned `X-Amz-Expires=90000` (**25 h**). **Download the finished ad the same
day.** Any later forensic must re-sign, not re-fetch.

## After the run

1. Grade with the `gemini-eval` skill, fresh-context critic (builder ≠ grader). ⚠️ Corroboration
   passes must **not** see the first pass's timestamps (eval SOP correction, finding #32a).
2. PASS → cut a 2–3 s beat to `public/samples/formats/before_after.mp4` (h264, muted, ≤400 KB) +
   `.webp` poster (≤40 KB), then add the key to `SAMPLES`. FAIL → bug entry, no card.
3. Update [`format_sample_readiness.md`](format_sample_readiness.md) Part 2 (R / E / S columns) and
   rewrite `NOW.md`.
