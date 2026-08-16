# services/ — Service Singletons

Lazily-initialized singletons. All AI, auth, billing, voice, and wizard persistence live here. State containers and React components do **not** belong here.

## Files

- [`geminiService.ts`](geminiService.ts) — All Gemini calls (~91 KB, 23+ flows). **TUNED.**
- [`supabaseClient.ts`](supabaseClient.ts) — Supabase singleton via `getSupabase()`
- [`billingService.ts`](billingService.ts) — PayMongo checkout (`popIntendedPlan` resumes flow after auth)
- [`voiceService.ts`](voiceService.ts) — ElevenLabs TTS / STS / voices
- [`wizardSessionStore.ts`](wizardSessionStore.ts) — Wizard state persistence (localStorage)

## Hard Rules for geminiService.ts (TUNED FILE)

The following are **LOCKED** — do not modify without explicit user approval:

- Prompt strings and system instructions
- Response JSON schemas (`responseSchema`, `responseMimeType`)
- Model IDs declared at **lines 329–335** — `textModel`, `fastTextModel`, `researchTextModel`, `premiseCheckModel`, `avatarModel`, `sceneImageModel`, `thumbnailModel` (**seven**, not six). (2026-07-05, Neil-approved after an A/B eval: `sceneImageModel` → `gemini-3.1-flash-lite-image`; `thumbnailModel` and `avatarModel` stay on `gemini-3.1-flash-image-preview`. 2026-07-22: `researchTextModel` → `gemini-3.6-flash` and `premiseCheckModel` added, pinned to `gemini-3.5-flash` — see [`../workflows/gemini36_adoption.md`](../workflows/gemini36_adoption.md). **2026-08-16, Neil-approved: `premiseCheckModel` → `gemini-3.7-flash`** — the 3.5 pin's justification did not reproduce (both arms 1/6 empty shells; the defect is `cleanJson`, not the model), so it was paying 4.2x for the same failure rate. `researchTextModel` stays on `gemini-3.6-flash` on purpose: it feeds the EDL, and flipping it would confound the pending watched run. See [`../workflows/gemini37_adoption.md`](../workflows/gemini37_adoption.md).) Line numbers last verified 2026-08-15; re-grep rather than trusting them if the file has moved under you.

⚠️ **These seven are NOT the models the producer uses for script / storyboard / Market Research.** Those three flows are crown-jewel and execute SERVER-side off `MODEL_TEXT` in [`../api/_lib/prompts.ts`](../api/_lib/prompts.ts) — a second, separate model table. An agent that reads only the list above will edit the wrong line and see no change (this happened 2026-08-16, caught before the edit). Server table, same date, same approval: **`MODEL_TEXT` `gemini-3.1-flash-lite` → `gemini-3.7-flash`** (carries `marketmind`, `adscript`, `storyboard`, `offer-optimizer`, `influencer-script`), **`MODEL_FAST` stays flash-lite** (three enum classifiers only), and the `storyboard` flow moved off `MODEL_FAST` onto `MODEL_TEXT` because picking each scene's `referenceImage` is reasoning, not classification.
- Embedded safety rules: Identity Lock, STILL_FRAME_RULE, NO_LOGO_HALLUCINATION
- The `strategicAudit` self-grading fields (flagged for future fresh-agent replacement; do not remove unilaterally)
- **MarketMind output schema** — `MarketResearchReport` in [`../types.ts`](../types.ts) and the matching OUTPUT TEMPLATE in `generateMarketResearch`. Downstream modules (Director AI auto-prefill in [`../App.tsx`](../App.tsx), `injectMarketMind` in [`../components/InfluencerForge.tsx`](../components/InfluencerForge.tsx), [`../components/CaptionHeadline.tsx`](../components/CaptionHeadline.tsx)) read structured fields directly. Renaming or removing fields breaks these consumers.

## Crown-Jewel Prompt Migration (2026-05-09)

The **5 highest-IP prompts** were moved server-side to prevent extraction from
the public JS bundle. Their system instructions, OUTPUT TEMPLATEs, and
schema-shaping rules now live in [`../api/_lib/prompts.ts`](../api/_lib/prompts.ts)
(server-only, never bundled into client). They execute via the
[`../api/gemini/flow.ts`](../api/gemini/flow.ts) endpoint with shape
`{flow: <id>, input: <flow-specific>}`.

Migrated flows:

| Flow ID | Client function | Server prompt |
|---|---|---|
| `marketmind` | [`generateMarketResearch`](geminiService.ts) | `MARKETMIND_SYSTEM_INSTRUCTION` |
| `adscript` | [`generateAdScript`](geminiService.ts) | `buildAdScriptPrompt` (Temu/Testimonial/MrBeast variants + classifier) |
| `offer-optimizer` | [`generateOfferOptimization`](geminiService.ts) | `buildOfferOptimizerPrompt` (Hormozi tiers) |
| `influencer-script` | [`generateInfluencerScript`](geminiService.ts) | `buildInfluencerScriptPrompt` (CCC framework) |
| `storyboard` | [`generateStoryboard`](geminiService.ts) | `buildStoryboardPrompt` (Cinematic relay + STILL_FRAME_RULE + APPEARANCE_LOCK_RULE) |

**Implication for editing:** for these 5 flows, prompt edits go to
`api/_lib/prompts.ts`, NOT this file. The client wrappers here are now thin
4-10 line dispatchers. Smaller flows (avatar, thumbnail, classifier helpers,
etc.) still build their prompts client-side and use
[`../api/gemini/text.ts`](../api/gemini/text.ts) — those will migrate in a
follow-up session.

**Verification command** to confirm crown-jewel content stays out of the
client bundle after a build:

```bash
grep -cE "MarketMind by Zam|DIRECTOR_CRITIQUE_PROTOCOL|COMMON_RULES|MRBEAST STRUCTURE|TESTIMONIAL STRUCTURE|SERVICES TESTIMONIAL 6-BEAT|REAL ESTATE WALKTHROUGH 6-BEAT|PHILIPPINE GROUND-TRUTH REALISM|TEMU SUB-TYPE|Godfather Offer|Grand Slam|Tripwire|CCC FRAMEWORK|STILL_FRAME_RULE|APPEARANCE_LOCK_RULE|BAG_ORIENTATION_RULE|VIRAL VFX MENU" dist/assets/index-*.js
# expected: 0
```

This is now **CI-enforced**: `npm run check:bundle-leak`
([`../tools/check-bundle-leak.mjs`](../tools/check-bundle-leak.mjs)) runs the
same patterns over the built `dist/` in the `verify` job and fails the build on
any leak. Keep the marker list in that script in sync with the grep above.

**~~Temporary cost downgrade (2026-05-09)~~ — SUPERSEDED 2026-08-16.** The `marketmind` flow
still runs on `MODEL_TEXT`, but `MODEL_TEXT` is now `gemini-3.7-flash`, not flash-lite. The
2026-05-09 downgrade was a cost measure during early ramp; Neil reversed the trade for output
quality after a `before_after` producer run produced a script he graded weak. `MODEL_RESEARCH`
(`gemini-3.5-flash`) is now unreferenced by any flow. Cost note lives at
[`../api/_lib/prompts.ts`](../api/_lib/prompts.ts) beside the constant, including the
**2027-01-01** intro-pricing expiry that doubles 3.7 to $1.50/$7.50.

**Fair game:** transport mechanics, error wrapping, exported type signatures, structural refactors of helpers like `proxyCall` and `cleanJson`.

## Patterns

- All Gemini calls go through `proxyGenerateContent` / `proxyGenerateImage` / `proxyGenerateVideo` → `/api/gemini/*`. **Never import `@google/genai` directly from the client.**
- Client aborts at 55s to surface `PROXY_TIMEOUT` before Vercel's 60s hard ceiling.
- Errors carry `.status` and `.body`. 429 errors carry `.retry_after_seconds`.
- Lazy singleton init: services expose `getX()` accessors, not module-scope instances. Honors that init-time dependencies (env, auth) may not be ready at import time.

## Adding a New AI Flow

1. Define input/output types in [`../types.ts`](../types.ts).
2. Add an exported function to `geminiService.ts` using `proxyGenerateContent`.
3. Mirror existing JSON-output flows: set `responseMimeType: "application/json"` + `responseSchema`, post-process via `cleanJson()`.
4. Add a vitest schema test under [`../tests/unit/`](../tests/unit/).
