# API instructions

These rules apply to `api/` in addition to the repository root instructions.

`api/` contains Vercel serverless handlers for Gemini, Kling, ElevenLabs,
producer jobs, billing, and scheduled cleanup. `_lib/` contains shared auth,
rate-limit, quota, billing, render, voice, and prompt infrastructure.

## Hard rules

- `api/_lib/prompts.ts` is crown-jewel TUNED content. Do not alter prompt text,
  instructions, schemas, safety rules, model constants, or generation settings
  without explicit approval for the exact diff.
- Other `_lib/` contracts are load-bearing. Do not change auth, rate-limit, or
  quota function signatures/RPC names incidentally.
- Client-facing AI proxies extract the bearer token and authenticate it with
  `getUserFromAccessToken()` from `_lib/supabaseAdmin.ts` before the upstream
  call. Apply rate limiting before quota checks.
- Server-only credentials must not use `VITE_` names or enter response bodies or
  client bundles.
- Preserve the standard error shape `{ error: 'CODE', detail?: string }`; 429
  responses include `retry_after_seconds`.
- Vercel handlers use `export default async function handler(req, res)` and have
  a 60-second platform ceiling; clients normally abort at 55 seconds.
- Use `.js` extensions for TypeScript ESM imports.

The five server-side prompt flows are registered and handled in
`gemini/text.ts`, with prompt builders and parsers in `_lib/prompts.ts`:
`marketmind`, `adscript`, `offer-optimizer`,
`influencer-script`, and `storyboard`. After relevant structural work, run the
build and `npm run check:bundle-leak`.
