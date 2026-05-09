# api/ — Vercel Serverless Functions

Thin HTTP proxies. Served by Vite middleware in dev (`vercelApiDevPlugin` in [`../vite.config.ts`](../vite.config.ts)) and as Vercel Functions in prod.

**Pure proxies. No AI logic, no orchestration, no business decisions here.** All of that belongs in [`../services/`](../services/) or higher.

## Layout

- `gemini/` — Gemini text/image/video proxies (auth → rate-limit → forward)
  - `text.ts` — generic forwarder (smaller flows still construct prompts client-side)
  - `flow.ts` — server-side prompt registry endpoint (5 crown-jewel flows since 2026-05-09)
  - `image.ts`, `video.ts`, `video/poll.ts` — image/video generation
- `elevenlabs/` — ElevenLabs voice proxies (TTS, STS, voices, budget)
- `cron/` — scheduled cleanup jobs
- `_lib/` — shared infrastructure (auth, rate-limit, quota, PayMongo, voice config, filipino library, **prompts**). **TUNED.**
- `checkout.ts`, `webhook.ts` — PayMongo entry points

## Crown-Jewel Prompt Registry (2026-05-09)

[`_lib/prompts.ts`](_lib/prompts.ts) houses the system instructions + builders
for the 5 highest-IP flows — `marketmind`, `adscript`, `offer-optimizer`,
`influencer-script`, `storyboard`. These prompts NEVER ship to the client
bundle and NEVER appear in network request bodies. Client wrappers in
[`../services/geminiService.ts`](../services/geminiService.ts) call
[`gemini/flow.ts`](gemini/flow.ts) with shape `{flow: <id>, input}`.

When adding a new crown-jewel flow:
1. Define the prompt + builder + parser in `_lib/prompts.ts`.
2. Add the handler to `FLOW_REGISTRY` in `gemini/flow.ts` and the flow ID to the `Body` z.enum.
3. Replace the client function body in `services/geminiService.ts` with a thin `proxyCall<T>('/api/gemini/flow', {flow, input})` wrapper.
4. Run `npm run build` then `grep -c "<distinctive-prompt-phrase>" dist/assets/index-*.js` — expect 0.

## Hard Rules

- **`_lib/` is tuned.** Token verification, rate-limit RPC contracts, and quota math are load-bearing — do not change function signatures or RPC names without approval.
- **No AI call without auth.** Every proxy starts with `verifySupabaseToken()` from [`_lib/supabaseAdmin.ts`](_lib/supabaseAdmin.ts).
- **No env var leaks to client.** Server-side keys (`GEMINI_API_KEY`, `ELEVEN_LABS_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GRIFON_VOICE_CLONING_ENABLED`) have **no `VITE_` prefix**. They must never appear in browser bundles.
- **Rate limit before quota.** The sliding-window RPC (`rate_limit_check`) runs before the heavier `userPlan.checkQuota` call.

## Patterns

- Handler signature: `export default async function handler(req: VercelRequest, res: VercelResponse)`.
- Pipeline: auth → rate-limit → quota → forward upstream → return JSON.
- Error shape: `{ error: 'CODE', detail?: string }` with appropriate HTTP status. 429 includes `retry_after_seconds` (default 30).
- Feature flag: `GRIFON_VOICE_CLONING_ENABLED='true'` opens cloning POST/DELETE in [`elevenlabs/voices.ts`](elevenlabs/voices.ts); anything else returns 503.
- Vercel hard ceiling: 60s. Clients abort at 55s (see [`../services/geminiService.ts`](../services/geminiService.ts) `proxyCall`).

## Adding a New Proxy

Mirror [`gemini/text.ts`](gemini/text.ts):
1. Auth via `verifySupabaseToken(req)`.
2. Rate-limit key like `gemini:text:${user.id}` with budget (e.g., 30 calls/60s).
3. Quota check (if metered).
4. Forward to upstream SDK (e.g., `GoogleGenAI`, ElevenLabs fetch).
5. Return upstream JSON unmodified, or wrap errors into the standard `{ error, detail }` shape.
