# Service instructions

These rules apply to `services/` in addition to the repository root
instructions.

Services contain client adapters and stores for AI proxy calls, Supabase auth,
billing, voice, active jobs, and wizard persistence. Environment-dependent SDK
clients such as Supabase are initialized lazily; some stores are intentional
module-scope instances. React components do not belong here.

## `geminiService.ts` is TUNED

Do not alter any prompt text, system instruction, response schema or MIME type,
safety rule, model ID, or generation setting without explicit user approval for
the exact diff. This includes identity/appearance locks and strategic-audit
fields. The MarketMind output must remain aligned with `MarketResearchReport`
and all downstream consumers.

The producer's `marketmind`, `adscript`, `storyboard`, `offer-optimizer`, and
`influencer-script` prompts/models live server-side in `api/_lib/prompts.ts`;
do not assume the model table in this client service controls those flows.

Transport mechanics, error wrapping, exported types, and narrowly scoped
structural helpers are fair game only when required by the task. State plainly
that an edit is structural before touching this file.

## Patterns

- Browser-side Gemini calls go through `api/gemini/*`; never import
  `@google/genai` into client code.
- Preserve the 55-second client abort before Vercel's 60-second ceiling.
- Preserve structured error metadata, including status/body and retry timing.
- Initialize environment-dependent external clients lazily. Preserve existing
  module-scope stores when they do not require import-time environment access.
- Add shared types to `types.ts` and schema tests under `tests/unit/`.
- Run `npm run build`, relevant tests, and `npm run check:bundle-leak` after
  applicable changes.
