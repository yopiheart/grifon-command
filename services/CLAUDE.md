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
- Model IDs declared at lines 87–91 (`textModel`, `fastTextModel`, `researchTextModel`, `avatarModel`, `sceneImageModel`)
- Embedded safety rules: Identity Lock, STILL_FRAME_RULE, NO_LOGO_HALLUCINATION
- The `strategicAudit` self-grading fields (flagged for future fresh-agent replacement; do not remove unilaterally)

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
