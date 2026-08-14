# Workflow: Gemini 3.7 Flash Adoption

**Objective:** Evaluate and (if it earns it) adopt `gemini-3.7-flash`, GA'd 2026-08-13.
Same slice discipline as [`gemini36_adoption.md`](gemini36_adoption.md) — that doc is the
precedent and the template; read it first.

**Status as of 2026-08-15:** Slice 0 ✅ SHIPPED. Slices 1–3 ⏸ PENDING NEIL. **No production
model ID has been changed.** Everything below the Slice-0 line is a proposal.

---

## The case in one table

| Model | Input /Mtok | Output /Mtok | Where it runs today |
|---|---|---|---|
| `gemini-3.1-flash-lite` | $0.25 | $1.50 | `textModel` / `fastTextModel`, 9 call sites |
| `gemini-3.5-flash` | $1.50 | **$9.00** | `premiseCheckModel` + both QA gates |
| `gemini-3.6-flash` | $1.50 | $7.50 | `researchTextModel`, 5 call sites |
| **`gemini-3.7-flash` (intro, thru 2026-12-31)** | **$0.75** | **$3.75** | — nothing yet |
| `gemini-3.7-flash` (from 2027-01-01) | $1.50 | $7.50 | — |

**The whole argument:** 3.7 reverts to *exactly* 3.6's list price. So it is a strictly-better
model at half price for ~4.5 months, then at parity. There is no cost downside at any horizon.

**Pricing source:** https://deepmind.google/models/gemini/flash — read 2026-08-15. The
blog.google 3.7 announcement URL **failed twice with ECONNRESET and was never read**; if a
later session can reach it, re-confirm. The 3.5/3.6 rates are from our own
[`modelCosts.ts`](../api/_lib/modelCosts.ts) table, which claims billing-grade as of
2026-07-22 — NOT independently re-verified against Google's live pricing page on 2026-08-15.

### What the benchmarks do and don't say

Vendor-published, 3.7 vs 3.6: Artificial Analysis Intelligence Index **56 vs 52** ·
FrontierCode 1.1 **43.6% vs 34.4%** · DeepSWE v1.1 **65.3% vs 48.6%** · OSWorld-2.0
**47.9% vs 33.8%**.

⚠️ Three of those four are **coding / computer-use** benchmarks. Grifon's research tier does
structured-JSON creative reasoning and video understanding — a domain these barely touch.
**Do not expect better ad scripts.** Expect the same output, cheaper. The one plausible
transfer is instruction-following/tool-use → the premise-check flake (Slice 2 below). Any
quality claim has to come from our own harness, not this table.

---

## Slice 0 — COGS housekeeping ✅ SHIPPED 2026-08-15

Branch `feat/gemini37-cogs-prep`. Mirrors Slice 0 of the 3.6 adoption, for the same reason.

**The trap it closes:** `MODEL_PRICES` had no `gemini-3.7-flash` key, and `DEFAULT_TEXT_PRICE`
falls back to the **flash-lite** rate ($0.25/$1.50). Flipping any lane to 3.7 without the row
would have made that lane's COGS telemetry read **2.5x low** on output, silently, feeding
wrong numbers into `run_cogs` and every routing decision after it. (The 3.6 adoption hit the
same class of bug from the other side — the old table was ~4x understated on 3.5-flash.)

Shipped:
- `gemini-3.7-flash` price row at the introductory rate — [`api/_lib/modelCosts.ts`](../api/_lib/modelCosts.ts).
- **A deliberate time bomb:** `gemini37IntroRateExpired()` + a unit test that FAILS on
  2027-01-01, when the intro rate doubles. Prose in a comment only reaches whoever opens the
  file; a red test reaches everyone, and the defreezer eats session memory. The test carries
  its own fix instructions — do not delete it, update the row.
- A test asserting 3.7's rate is exactly half of 3.6's, so the adoption maths gets re-derived
  rather than assumed if either row drifts.
- **Harness generalization** — [`tests/regression/research-tier.ab.test.ts`](../tests/regression/research-tier.ab.test.ts)
  had the arm models hardcoded in four places. Arms are now `AB_ARM_A` / `AB_ARM_B` env vars
  (defaults: A=`gemini-3.6-flash` production, B=`gemini-3.7-flash` candidate), the swap
  trigger is a `RESEARCH_TIER_MODELS` set, and the thinking-dialect mapping is
  capability-based (`THINKING_LEVEL_MODELS`) instead of per-ID `if` branches. **The next
  model needs zero edits to this file.**
- **🔴 THE HARNESS WAS LYING — fixed.** Closes follow-up #1 of
  [`edl_files_api_plan.md`](edl_files_api_plan.md) (recorded 2026-08-14, never fixed).
  Since `a841f69` the EDL re-uploads every `renderedUrl` through
  `/api/gemini/files/upload`; the harness had no stub for that route, so **every scene's
  upload rejected, `allSettled` degraded them all, and the EDL arm ran PROMPT-ONLY while the
  report still printed `videoPartsIncluded: true`.** Running Slice 1 before this fix would
  have produced a confident, wrong, blind-vs-blind EDL comparison. Now: the upload seam is
  stubbed (echoing the URI `beforeAll` genuinely minted against the live Files API — a
  bypassed proxy hop, not a faked upload), the stub **throws loudly** if it ever sees a
  non-`files/` URL, and the report prints `videoPartsSent` **counted off the wire** plus a
  ⛔ banner when the upload flag and the wire disagree.
- **The harness now typechecks.** It had **8 pre-existing TS errors** (`lastCall` narrowed to
  `never`), invisible because `tests/` is excluded from [`tsconfig.json`](../tsconfig.json).
  Fixed via an assertion snapshot — note a plain annotation does NOT defeat the narrowing.
  ⚠️ **Repo-wide gap, not fixed here:** no test file in this repo is typechecked at all.

Verification: `npm run build` clean · `npx tsc --noEmit` clean · **1199 tests pass**
(1195 + 4 new) · the A/B harness typechecked standalone (0 errors, was 8).

---

## Slice 1 — the A/B eval ⏸ PENDING (Neil: ~$0.25 of Gemini quota)

The harness is wired and waiting. Nothing else is needed to run it:

```powershell
$env:RUN_AB='1'; npx vitest run tests/regression/research-tier.ab.test.ts --reporter=verbose
```

Defaults now compare **3.6 (incumbent) vs 3.7 (candidate)** across all six research flows with
identical fixed inputs, real tuned prompts, and Files-API video parts on the EDL. Outputs land
in `.tmp/research-ab/` (`results.json`, `report.md`). 12 live calls, ~$0.25.

Fixtures confirmed present 2026-08-15: `tests/fixtures/sample-batch/*.mp4` (2),
`assets/ad-swipe/E19-gruns.jpg`, `E20-gruns.jpg`.

**Read the report's header before grading anything.** `Video parts ACTUALLY sent upstream`
must be > 0 or the EDL rows are a blind-vs-blind comparison and must be discarded — the run
will say so itself with a ⛔ banner. This is only true because Slice 0 fixed it; a run of this
harness before 2026-08-15 would have claimed video was attached when none was.

Grade the report the same way Slice 1 of the 3.6 adoption was graded — latency, cost, and a
fresh-critic read of B vs A per flow. Structural asserts only; the harness never picks a winner.

---

## Slice 2 — the premise pin ⏸ PENDING (depends on Slice 1)

[`premiseCheckModel`](../services/geminiService.ts#L332) is still pinned to `gemini-3.5-flash`
because 3.6 flaked **1/6 runs empty** on `googleSearch` grounding + JSON-instructed-in-prompt
(no `responseMimeType` possible on a grounded call, so `cleanJson` occasionally extracted
nothing). Fails soft, but silently kills the feature on those runs.

This is the **one place 3.7's real strength plausibly applies** — agentic instruction-following
and tool use is exactly what it benchmarks well on. Test it directly:

```powershell
$env:RUN_AB='1'; $env:AB_ARM_A='gemini-3.5-flash'; $env:AB_ARM_B='gemini-3.7-flash'; npx vitest run tests/regression/research-tier.ab.test.ts -t generatePremiseCheck
```

Sample ≥6 runs (the flake was 1/6 — a single clean run proves nothing). If 3.7 holds clean,
the pin retires, `premiseCheckModel` is deleted, and the last **$9.00/Mtok** text lane in the
codebase goes to $3.75.

---

## Slice 3 — the QA gates ⏸ PENDING (env-var flip, Neil's call)

[`OMNI_GATE_MODEL`](../api/_lib/omniGate.ts#L26) and
[`IMAGE_GATE_MODEL`](../api/_lib/imageGate.ts#L28) both default to `gemini-3.5-flash` and are
**already `process.env`-overridable** — a flip is an env change, no code edit, no TUNED file,
no redeploy of client code. **$9.00 → $3.75 output, a 58% cut**, on the most expensive text
rate we pay.

Lowest blast radius on the list: both are explicitly fail-open, flag-only eval infra that
"does NOT shape any user-facing output" ([`imageGate.ts:17-20`](../api/_lib/imageGate.ts#L17-L20)).
A 3.7 regression yields `gate_unavailable`, i.e. a lost check, not a lost render.

⚠️ Not behaviorally inert: the image gate drives the **only automated reroll**. Watch flag
rates after flipping. Also note `IMAGE_GATE_ENABLED` + `VITE_IMAGE_GATE_ENABLED` must BOTH be
`'true'` for the gate to be live at all (see CLAUDE.md) — flipping the model on a dark gate
changes nothing.

---

## ⛔ Explicitly NOT recommended

**Do not put 3.7 on `textModel` / `fastTextModel`.** Both are `gemini-3.1-flash-lite` at
$0.25/$1.50 ([geminiService.ts:329-330](../services/geminiService.ts#L329-L330)) with 9 call
sites — the highest-volume lane. 3.7 is **3x that price even at the intro rate**, and per the
GA docs it **cannot run `thinking_level: MINIMAL`** (LOW is its floor; MINIMAL returns an API
validation error). You would pay 3x and eat a mandatory thinking-token floor on the cheapest,
most frequent calls. Clear no.

---

## Conflicts with what's already working

1. **⚠️ THE EDL LANE IS BLOCKED UNTIL NEIL'S WATCHED RUN.** [`NOW.md`](../NOW.md)'s next action
   is one watched live run of the eyes-on EDL (`a841f69`, 2026-08-14); all that is proven so
   far is that the model accepts video and doesn't 429 — the quality question is open. The EDL
   call site runs on `researchTextModel` ([geminiService.ts:1622](../services/geminiService.ts#L1622)).
   **Flipping that model first changes two variables at once and destroys the only experiment
   that answers whether eyes beat blind.** Slices 1, 3 and the Slice-2 probe are all
   independent of it and can proceed.

2. **Video attachment cap is now a hard API ceiling.** `EDL_MAX_ATTACHED_VIDEOS = 10`
   ([geminiService.ts:1159](../services/geminiService.ts#L1159)) and 3.7's spec says **maximum
   10 videos per prompt**. Zero headroom — that constant can no longer be raised on this model
   family. Know this before anyone tries.

3. **`thinkingBudget` migration, not a blocker.** Six sites still pass
   `thinkingConfig: { thinkingBudget: 4000 }`; the EDL already moved to `thinkingLevel: 'medium'`.
   3.7 accepts LOW/MEDIUM/HIGH, so the mapping the 3.6 adoption established carries over. No
   `MINIMAL` usage anywhere in the repo, so the one documented API breakage doesn't touch us.

4. **TUNED-file gate.** Model IDs in `services/geminiService.ts` are LOCKED lines per
   [`services/CLAUDE.md`](../services/CLAUDE.md). Slices 2 and any `researchTextModel` flip need
   Neil's explicit approval — do not flip on the strength of an A/B report alone.

---

## Resume trigger

If this doc is found with Slice 1 still ⏸ and no Neil decision in chat history: re-present the
pricing table and the three pending slices, and offer to run the A/B (~$0.25). Do **not** flip
`researchTextModel`, `premiseCheckModel`, or either gate env var without his explicit go.
