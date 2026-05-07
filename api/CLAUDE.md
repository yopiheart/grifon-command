# api/ — Vercel Serverless Functions

Thin HTTP proxies. Served by Vite middleware in dev (`vercelApiDevPlugin` in [`../vite.config.ts`](../vite.config.ts)) and as Vercel Functions in prod.

**Pure proxies. No AI logic, no orchestration, no business decisions here.** All of that belongs in [`../services/`](../services/) or higher.

## Layout

- `gemini/` — Gemini text/image/video proxies (auth → rate-limit → forward)
- `elevenlabs/` — ElevenLabs voice proxies (TTS, STS, voices, budget)
- `cron/` — scheduled cleanup jobs
- `_lib/` — shared infrastructure (auth, rate-limit, quota, PayMongo, voice config, filipino library). **TUNED.**
- `checkout.ts`, `webhook.ts` — PayMongo entry points

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
