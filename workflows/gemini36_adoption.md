# Workflow: Gemini 3.6 Flash / 3.5 Flash-Lite Adoption

**Objective:** Track the slice-by-slice adoption of Google's 2026-07 GA models (`gemini-3.6-flash`, `gemini-3.5-flash-lite`) per the plan approved 2026-07-22. Evaluated jointly with GPT 5.6 Sol (read-only Codex brainstorm). Full ranked evaluation lives in the approved plan; capability runway parked as `post_beta_roadmap.md` item #24.

**Verdict artifact (Slice 1 results, phone-readable):** https://claude.ai/code/artifact/57299c90-d0ae-4ba9-acc7-862eb283c7d8

## Slice status

- **Slice 0 — COGS housekeeping: ✅ SHIPPED 2026-07-22** (`feat/gemini36-slice0-cogs`, commit `48b4f2f`). Billing-grade text rates in `api/_lib/modelCosts.ts` (old table was ~4x understated on 3.5-flash), `thoughtsTokenCount` billed at output rate + logged, `LegacyBody.model` allowlist in `api/gemini/text.ts` (4 pinned models). 782 tests green.
- **Slice 1 — research-tier A/B eval: ✅ RAN 2026-07-22.** Harness: `tests/regression/research-tier.ab.test.ts` (gated `RUN_AB=1`; imports the real tuned prompts via the script-gen mock pattern — zero prompt duplication; swaps model + maps `thinkingBudget:4000` → `thinkingLevel:'medium'` at the fetch-intercept layer; uploads fixture MP4s to the Files API for the EDL multimodal parts). Results below.
- **Slice 2 — the flip: ✅ SHIPPED 2026-07-22 — Option B (flip + premise pin), Neil-approved; premiseCheckModel constant added; EDL thinkingConfig migrated to thinkingLevel:'medium'.** `api/_lib/prompts.ts` MODEL_RESEARCH deliberately stays untouched (exported but unused by live handlers; TUNED file, zero-touch preferred). Options + recommendation below.
- **Slice 3 — parseMarketResearchFile on 3.5-flash-lite: ✅ CLOSED 2026-07-22 (premise retired)** — target turned out to be @deprecated dead code (legacy localStorage re-parse, removal target 2026-05-23); function + fallback DELETED instead (Neil-approved). The 3.5-flash-lite extraction lane is parked until a live extraction workload ships (e.g. Concierge document intake) — see post_beta_roadmap.md #24.

## Slice 1 results (2026-07-22, Bukidnon Brew fixtures, video parts included)

| Flow | Lat A→B | Cost A→B | Critic: B vs A | Upgrade-safe? |
|---|---|---|---|---|
| Edit Decision List | 17.0s → 11.5s | $0.041 → $0.031 | strictly better (B fixed A's misplaced `globalSfxPicks`; correctly omits hook `transitionIn`) | ✅ |
| Premise Check | 24.6s → 18.5s | $0.035 → $0.024 | **flaky: 1/6 runs empty shell** (0/6 on A); clean runs rich + ~7–9s faster | ⛔ blocker |
| Optimize Image Prompt | 7.7s → 5.6s | $0.014 → $0.009 | slightly better (honors role identification) | ✅ |
| Product Signature | 5.2s → 6.0s | ~equal | markdown-wrapper nit; flow has NO production call site (dead) | ✅ +nit |
| Cinematic Themes | 9.0s → 8.4s | $0.018 → $0.012 | equal | ✅ |
| Cinematic Narrative | 9.0s → 10.2s | $0.021 → $0.019 | equal; lexicon 0 forbidden / 12/12 mandatory on both | ✅ |

Totals: **B is ~25% cheaper per full research pass** (thinking tokens included, Slice-0 corrected rates), faster on 4/6, all flows far under the 55s client abort. Premise flake root: `googleSearch` grounding + JSON-instructed-in-prompt (no responseMimeType possible) — 3.6 occasionally wraps grounded output so `cleanJson` extracts nothing; fails soft (advisory gate) but silently kills the feature on those runs.

### Slice 2 options (Neil's call — LOCKED lines)

- **DECIDED — B (recommended): flip + premise pin.** `researchTextModel → 'gemini-3.6-flash'`; new `premiseCheckModel = 'gemini-3.5-flash'` used only at the premise call site; EDL call site migrates `thinkingConfig` to `{ thinkingLevel: 'medium' }` (validated live). Premise migrates later behind a parser-hardening grill-me.
- **A: flip all 6**, accept ~17% premise empty-rate (fails soft). Not recommended.
- **C: hold.** Forfeits the cost/latency/compliance gains.

## Baseline defects surfaced by the eval critic (exist in prod TODAY, both models — not 3.6 regressions)

1. **P0 UI crash:** `VisualTheme.colorPalette` — tuned prompt asks for a *list*, `types.ts:11` says `string`, `Step3AdScript.tsx:322` calls `.split(',')` on the returned array → TypeError in the Cinematic theme picker. Fix = call-site coercion (`join(',')` in the mapper at `geminiService.ts:~2830`); code fix, NOT a prompt edit. — ✅ FIXED 2026-07-22 (coercion in the generateCinematicThemes mapper, same branch).
2. **Prod 3.5-flash misplaces `globalSfxPicks` into `meta`** → SFX-picks panel (`EditVideo.tsx:1047`) renders empty today.
3. **EDL prompt gap:** `sfxCues` empty every scene on both models (prompt demands them per formula rules); `meta.hookStrategy` / `meta.formulaApplied` consumed by EditVideo but never named in the prompt. TUNED territory → grill-me before any edit. — **✅ PARTIALLY FIXED 2026-07-22 via grill-me (Neil):** the two meta fields are now named in the prompt (5-line TUNED insertion, Neil-approved) + a coercion belt (formulaApplied lift+filter, hookStrategy clamp, sfxId/globalSfxPicks enum filter, `transitionIn: null` strip — the null was render-fatal at zod, caught by the gate critic). Gated: EDL harness ×3 (fields on-contract 6/6, zero regressions) + fresh-critic SHIP verdict. **Deliberately NOT done (grill decision):** forcing per-scene `sfxCues` — the renderer discards EDL cue timing by design (agent_lessons 2026-06-08, engine-deterministic SFX); pills stay empty-when-empty. **Watch item:** 3.6 emitted a 5-word close punchline (cap ≤4) in 3/3 gate runs — cosmetic, monitor on next regression.
4. **`analyzeProductSignature` is a dead flow** — defined + tuned, zero production call sites. Wire or delete.

## Rerun instructions

```powershell
$env:RUN_AB='1'; npx vitest run tests/regression/research-tier.ab.test.ts
```
Outputs land in `.tmp/research-ab/` (`results.json`, `report.md`). Premise-only sampling: append `-t generatePremiseCheck`. Requires `GEMINI_API_KEY` in `.env`. ~$0.25 per full pass (12 calls).

## Resume trigger

If this doc is found with Slice 2 still ⏸ and no Neil decision in chat history: re-present the three options with the artifact link. Do NOT flip `researchTextModel` without his explicit approval (services/CLAUDE.md LOCKED lines).
