# Workflow: Gemini 3.7 Flash Adoption

**Objective:** Evaluate and (if it earns it) adopt `gemini-3.7-flash`, GA'd 2026-08-13.
Same slice discipline as [`gemini36_adoption.md`](gemini36_adoption.md) — that doc is the
precedent and the template; read it first.

**Status as of 2026-08-15:** Slice 0 ✅ SHIPPED · Slice 1 ✅ RAN (**−59% cost, −24% latency,
on-contract 6/6**) · Slice 3 ✅ SHIPPED (both QA gates on 3.7) · Slice 2 🔴 **the premise pin's
justification does not reproduce — and the real defect is a parser bug, not the model.**

Total measured spend for the whole evaluation: **$0.46** (26 live calls).

**The recommendation, in one line:** the gates are done; hold `researchTextModel` until the
watched EDL run; and treat the premise flake as a **parser-hardening job**, not a model choice —
3.5-flash flakes too, so the pin is paying 4.2x for nothing.

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

## Slice 1 — the A/B eval ✅ RAN 2026-08-15

**Arms: A = `gemini-3.6-flash` (production) · B = `gemini-3.7-flash`.** Bukidnon Brew fixtures,
EDL with **4 real video parts attached on both arms** (verified off the wire, not inferred).
Total spend **$0.1828** across 14 live calls. `parsedOk: true` on 6/6 flows, both arms — zero
structural failures, zero empty shells.

| Flow | Latency A→B | Cost A→B | Δ cost |
|---|---|---|---|
| Edit Decision List | 12.8s → **8.5s** | $0.0297 → $0.0136 | **−54%** |
| Premise Check | 16.9s → 19.4s ⚠️ | $0.0198 → $0.0072 | **−64%** |
| Optimize Image Prompt | 8.2s → **5.2s** | $0.0106 → $0.0035 | **−67%** |
| Product Signature | 5.2s → **3.8s** | $0.0080 → $0.0034 | **−58%** |
| Cinematic Themes | 8.3s → **5.6s** | $0.0091 → $0.0048 | **−48%** |
| Cinematic Narrative | 10.7s → **4.4s** | $0.0172 → $0.0064 | **−63%** |
| **Full research pass** | **62.2s → 47.0s (−24%)** | **$0.0944 → $0.0389** | **−59%** |

**Read the cost column carefully — it is NOT just the halved list price.** A −59% pass on a
−50% rate means 3.7 also emits **fewer thinking tokens** for the same work (EDL: 1072 → 483
thoughts). Both effects compound; the second one survives 2027-01-01 when the intro rate ends.

**Verdicts:**
- **Cost: unambiguous win.** Every flow cheaper, no exceptions.
- **Latency: win on 5/6.** Premise Check is the lone regression (+2.5s), and it is the flow
  that runs `googleSearch` grounding — plausibly more tool round-trips, not slower inference.
  All flows remain far under the 55s client abort.
- **Structure: clean.** `globalSfxPicks` correctly at top level on both arms (the old 3.5-flash
  misplacement into `meta` did not reappear). `hookStrategy` + `formulaApplied` present on both.
  3.7 additionally cited `cialdini` in `formulaApplied`.
- **Quality: NOT ESTABLISHED, and do not claim it.** One sample per flow. The harness asserts
  structure only, by design. Nothing here says 3.7 writes better ads — only that it produces
  on-contract output faster and much cheaper.

### ⚠️ The finding that matters more than the cost table

**With 4 real clips attached, NEITHER arm produced a single visual observation.** Every scene
`notes` field cites the *script*; `weaknessesFlagged` — the one field whose prompt example is
explicitly visual (*"Scene 3 video looks underexposed"*) — returned only script-level
criticism on both arms ("no real scarcity anchor in script").

Caveats, stated plainly: one run per arm, and the fixture clips may genuinely have nothing
visual worth flagging (though one is named `scene2fail-raw.mp4`). This is **not** proof that
attaching video is worthless.

But it is the first direct evidence bearing on [`NOW.md`](../NOW.md)'s open question — *is an
edit made WITH eyes better than the blind one?* — and it points the wrong way. **It raises the
value of the watched live run rather than substituting for it.** If a human-watched run also
shows no visual grounding, the EDL video attach is paying upload latency and prompt tokens
(9027 vs ~4089 input tokens — **2.2x the input cost per EDL call**) for nothing.

### Reproducing / extending

⚠️ **A guard bug was found and fixed DURING this run, by the guard itself.** The upload stub
first validated `startsWith('files/')`, but production returns the SDK's full
`https://…/v1beta/files/<id>` URL ([upload.ts:126](../api/gemini/files/upload.ts#L126)). The
stub threw, all 4 scenes degraded — and because the wire-counted `videoPartsSent` said `0`
while the upload flag said `true`, the report **banner-flagged its own result as untrustworthy
instead of printing a clean-looking lie**. Fixed to accept both spellings; the EDL was re-run
and reported `attached: 4`. The pre-2026-08-15 harness would have printed that first run as a
valid EDL comparison. The `describe()` title was also hardcoded to the old arm names and is
now built from `ARM_A`/`ARM_B`.

```powershell
$env:RUN_AB='1'; npx vitest run tests/regression/research-tier.ab.test.ts --reporter=verbose
```

Defaults compare **3.6 (incumbent) vs 3.7 (candidate)** across all six research flows with
identical fixed inputs, real tuned prompts, and Files-API video parts on the EDL. Outputs land
in `.tmp/research-ab/` (`results.json`, `report.md`). 12 live calls, **measured $0.18**.
Single flow: append `-t <flowName>` (EDL alone ≈ $0.04).

Fixtures confirmed present 2026-08-15: `tests/fixtures/sample-batch/*.mp4` (2),
`assets/ad-swipe/E19-gruns.jpg`, `E20-gruns.jpg`.

**Read the report's header before grading anything.** `Video parts ACTUALLY sent upstream`
must be > 0 or the EDL rows are a blind-vs-blind comparison and must be discarded — the run
will say so itself with a ⛔ banner. This is only true because Slice 0 fixed it; a run of this
harness before 2026-08-15 would have claimed video was attached when none was.

Grade the report the same way Slice 1 of the 3.6 adoption was graded — latency, cost, and a
fresh-critic read of B vs A per flow. Structural asserts only; the harness never picks a winner.

---

## Slice 2 — the premise pin 🔴 THE PIN'S PREMISE DOES NOT REPRODUCE (6 samples, 2026-08-15)

Ran 6 paired samples, A = `gemini-3.5-flash` (the pinned incumbent) vs B = `gemini-3.7-flash`.
12 live calls, **$0.28** (over my ~$0.16 estimate — because 3.5-flash is the expensive half).

| Arm | Model | Empty shells | Avg cost/call | Avg latency |
|---|---|---|---|---|
| A | `gemini-3.5-flash` **(the pin)** | **1 / 6** | $0.03782 | 28.7s |
| B | `gemini-3.7-flash` | **1 / 6** | **$0.00911** | **14.2s** |

**The pin exists because the 3.6 eval measured 3.5-flash at 0/6 and 3.6-flash at 1/6. That
0/6 does not hold up — 3.5-flash flaked here too, at the same rate as the candidate.**

Both failures are **byte-identical**:

```json
{"impliedPremise":"","alternatives":[],"questions":[]}
```

And both models **did** generate content — 516 output tokens on the 3.5 failure, 459 on the
3.7 one (plus 4338 and 1938 thinking tokens). The model answered; the pipeline threw the
answer away. That is conclusive on root cause: **this is a flow-level parser failure, not a
model defect.** It is the known `googleSearch`-grounding + JSON-in-prompt interaction — no
`responseMimeType` is possible on a grounded call, so `cleanJson` occasionally extracts
nothing and the code falls back to an empty shell.

### What follows

- **The pin is not buying reliability.** It is paying **4.2x the cost and 2x the latency** for
  the same 1-in-6 failure rate. On this evidence its justification is gone.
- ⚠️ **Statistical honesty:** n=6 per arm with 1 event each cannot distinguish the true rates —
  these could both be 1/6, or 1/10 and 1/4. What IS established is the negative: **3.5-flash is
  not flake-free**, and that was the entire basis for pinning to it.
- **The real fix is parser hardening, not model selection** — exactly what
  [`gemini36_adoption.md`](gemini36_adoption.md) Slice 2 deferred ("premise migrates later
  behind a parser-hardening grill-me"). A model flip alone cannot fix a parse that discards a
  valid answer; whichever model is chosen, ~1 in 6 users silently lose the feature today.
- **Recommended (Neil's call — `premiseCheckModel` is a LOCKED line):** run the
  parser-hardening grill-me first, since it fixes the actual defect for every model. The model
  flip is then a free follow-on that saves 4.2x. Do **not** flip on cost alone while the parse
  bug is live — it would look like a regression the first time a 3.7 run comes back empty.

Reproduce (12 calls, ~$0.28):

```powershell
$env:RUN_AB='1'; $env:AB_ARM_A='gemini-3.5-flash'; $env:AB_ARM_B='gemini-3.7-flash'
npx vitest run tests/regression/research-tier.ab.test.ts -t generatePremiseCheck
```

### Original rationale

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

## Slice 3 — the QA gates ✅ SHIPPED 2026-08-15 (Neil-approved)

Both defaults flipped to `gemini-3.7-flash` in commit `13bd5bc`. **$9.00 → $3.75 output** —
the most expensive text rate Grifon paid, spent on fail-open flag-only eval infra.

**Flipped the CODE DEFAULT, not the Vercel env var**, for two reasons: the Vercel MCP surface
available here has no env-var setter (checked, not assumed), and a default in git is reviewable
and revertible where a dashboard edit is invisible to history. **The env var still overrides**,
so it stays the instant no-deploy rollback lever — documented at both call sites.

⚠️ **Takes effect on next deploy, not on merge.**
⚠️ **Watch flag/reroll rates.** The image gate drives the only automated reroll; the omni gate
is the inert one.

Also pre-approved `gemini-3.7-flash` in the [`text.ts`](../api/gemini/text.ts) `LegacyBody`
allowlist. Inert today, but without it a future `researchTextModel` flip would 400 every
research-tier call — and **the A/B harness could not have caught that**, since it intercepts at
the fetch layer and never reaches that zod parse. Cost exposure does not widen: 3.7 is cheaper
than 3.5-flash and 3.6-flash, both already allowed.

### Original rationale

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
