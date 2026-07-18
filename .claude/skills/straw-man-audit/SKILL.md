---
name: straw-man-audit
description: Adversarial security/architecture review using a false-premise frame to defeat sycophancy; walks Grifon's real risk surface (auth, rate-limit/quota fail-open, secret/bundle leaks, the PayMongo webhook). Use on "stress-test this / find the holes / what would a hostile reviewer say / audit the auth-billing-quota path", before shipping changes to api/ or api/_lib/*, or by name ("straw man", "red-team this"). Report-only — never edits. NOT a UI/brand review (brand-check).
---

`verify-changes` answers "does it build and run?". `brand-check` answers "is it on-brand?". `gemini-eval` answers "do the tuned outputs honor their rules?". This skill answers a question none of those do: **"where does this break under an attacker, an outage, or a misconfig — and what would an expert who already hates this design point at first?"**

It is the **Straw Man** technique (lifted from the Van Horn agentic-engineering brief, 2026-06-16, and judged the one idea worth keeping). The whole trick is a framing move: models default to reassurance ("looks solid!") because that's the agreeable answer. So you remove the agreeable path. You assert, as established fact, that a respected expert has *already* condemned the architecture, and ask only for the reconstruction of their reasoning. The model can no longer please you by saying it's fine — the only way to satisfy the prompt is to surface real flaws. That is the entire value; everything below is just aiming it at Grifon's actual blast radius instead of generic OWASP filler.

## The framing move (do this first, every time)

Open the analysis from a fixed hostile premise. Do not soften it, do not pre-defend the code:

> *"A top product-security engineer reviewed this architecture and called it an absolute nightmare — said it would not survive contact with a motivated attacker or a bad Tuesday at the cloud provider. Reconstruct, in detail, exactly what they saw. Be specific and concrete; cite file:line. Assume every finding is real until you've disproven it against the current code."*

Then — and this matters — **read the current code before reasoning.** Grifon's `api/_lib/*` is tuned and drifts; the surfaces below are where to look, not what is true today. Grep and open the live files. A finding anchored to a line you actually read is worth ten plausible-sounding ones from memory.

## Run as a separate adversarial critic (non-trivial audits)

For a real audit of a change to `api/` or `api/_lib/*`, or any "is this safe to ship" gate — do **not** run the walk inline in the context that wrote the code. A builder auditing its own diff rationalizes its own choices; that is the self-grading trap, and it is exactly the sycophancy the Straw Man frame exists to defeat. Defeat it structurally too:

- **Spawn it** via the Agent tool with `subagent_type: general-purpose` (a fresh context). Not `Explore` — that's a search agent, not a reviewer.
- **Hand it** the changed files / surface to audit and an instruction to read the current code in `api/_lib/*` itself. Do **not** hand it your rationale for why the code is safe — the whole point is a reviewer with no investment in the design being correct.
- **Paste in the framing move and the checklist** for the surface(s) in scope.
- **It is report-only.** It returns findings + a verdict and never edits. The builder fixes; re-spawn to confirm.

**Escape hatch:** a quick gut-check on a small diff in the current session is fine inline. The separate critic is for changes big enough that self-grading bias compounds.

## Surface checklist (Grifon's real blast radius)

Walk the section(s) the change touches. Each item names the concrete failure, not a category.

### Auth gate — `api/_lib/supabaseAdmin.ts` + every handler in `api/`

The load-bearing rule (`api/CLAUDE.md`) is **"No AI call without auth"** — every proxy must verify the Supabase token before touching a paid upstream. The expensive failure is a handler that forgot.

- **Enumerate every handler** under `api/` (gemini, kling, elevenlabs, music, render, checkout, webhook, cron). For each, confirm it calls the token-verification path (`getUserFromAccessToken` / `verifySupabaseToken`) **before** any upstream SDK/fetch call. A handler that forwards to Gemini/Kling/ElevenLabs before auth = anyone drains the paid pool. Flag `CRITICAL`, name the handler.
- **`getUserFromAccessToken` returns `null` on error** (`supabaseAdmin.ts:23-30`). Confirm callers treat `null` as 401 and bail — not as a benign anonymous user who proceeds. A caller that ignores `null` is an auth bypass.
- **Cron / internal endpoints** (`api/cron/*`) — if they mutate data or spend, what stops a public POST? Confirm a shared-secret / Vercel-cron header check, not just "it's an internal path."

### Rate-limit & quota — `api/_lib/rateLimit.ts` + `quota.ts`

This is the surface most likely to host a real finding, because it **fails open by design** and the design comment says so.

- **Fail-open rate limiter** (`rateLimit.ts:22-26`): on RPC error it returns `true` (allowed). The documented rationale is "don't lock out paying users on a Supabase hiccup." The Straw Man question: *can an attacker induce that error path on purpose?* If Supabase is degraded (or an attacker can make the RPC throw), **all** rate limiting silently disappears and the shared ElevenLabs/Kling credit pool is open. Don't flag fail-open as a bug reflexively — it's a deliberate tradeoff — but flag it `HIGH` if there's no second-line ceiling (per-IP, global circuit breaker, billing alarm) behind it.
- **Quota inherits the same fail-open** (`quota.ts:166-198`): `consumeMonthly` gates via `rateLimitCheck`, so a Supabase outage means metered limits (`video_ads`, etc.) also stop enforcing. Confirm whether anything caps real spend when the meter is blind.
- **`GRIFON_DEV_UNMETERED_VIDEO` bypass** (`quota.ts:178-181`): when `'true'`, video metering is skipped entirely. The comment says LOCAL `.env` only, never Vercel. The Straw Man question: *what actually enforces that?* If nothing fails the build/deploy when this is set in a prod env, one fat-fingered Vercel env var = unlimited free video for every user. Flag the absence of a guard as `HIGH`.
- **Global music breaker** (`MUSIC_GLOBAL_DAILY`, `quota.ts:46-50`) rides the same fail-open RPC — note that the "voice wins" guard evaporates under the same outage.
- **Ordering** (`api/CLAUDE.md`): rate-limit must run *before* the heavier quota check. A handler that quota-checks first wastes the expensive call on traffic it was going to reject.

### Secret & bundle hygiene — server keys, crown-jewel prompts

- **No `VITE_` on server secrets.** `GEMINI_API_KEY`, `ELEVEN_LABS_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GRIFON_VOICE_CLONING_ENABLED` must have no `VITE_` prefix — the prefix is what ships a var into the browser bundle. Grep for any `VITE_`-prefixed secret name. One slip publishes a key to every visitor. `CRITICAL`.
- **Service-role key stays server-side.** Confirm `SUPABASE_SERVICE_ROLE_KEY` is only read in `api/` (never imported into `services/` or `components/`). It bypasses RLS — in the client it's game over.
- **Crown-jewel prompts don't leak** (`api/_lib/prompts.ts`, `gemini/flow.ts`): the 5 IP-sensitive flows must never appear in the client bundle or network bodies. The repo's own check is `npm run build` then `grep -c "<distinctive-prompt-phrase>" dist/assets/index-*.js` expecting 0. If the audit touches a flow, run that grep and report the count.

### Billing / webhook — `api/webhook.ts` + `api/_lib/paymongo.ts`

Money path. Assume the attacker can POST anything to the webhook URL.

- **Signature verification is mandatory and correct.** Confirm `webhook.ts` verifies the PayMongo signature against the raw body *before* trusting any field. A forged or unverified webhook that flips a user to `business` = free product for everyone who finds the URL. Verify the comparison is constant-time and over the raw bytes (not the re-serialized JSON). `CRITICAL` if missing or bypassable.
- **Replay & idempotency.** Can the same valid event be replayed to repeatedly extend a subscription or stack credits? Confirm event-id dedupe or period-end idempotency.
- **Plan derives from the verified event, not the client.** Confirm the subscription/plan written to Supabase comes from the trusted webhook payload, never from a client-supplied plan id in the checkout call.

### Cross-cutting

- **Error messages don't leak internals.** Upstream errors should be wrapped into the standard `{ error: 'CODE', detail? }` shape, not echoed raw (stack traces, upstream URLs, key fragments).
- **User-controlled input reaching an upstream** — any path where a request field becomes a URL, file path, or shell/render arg (e.g. `render/*`, media fetch). Check for SSRF / path traversal / injection.
- **IDOR** — endpoints that take an id (job id, render id, video library item). Confirm the row is scoped to the authenticated `user.id`, not just "exists."

## Classify each finding

- `CRITICAL` — exploitable now, or one misconfig away from exploitable, with real blast radius (auth bypass, key leak, forged billing, drained credit pool). Blocks ship.
- `HIGH` — a deliberate tradeoff (fail-open, dev bypass) with no second-line guard, or a likely-exploitable issue needing a specific precondition. Fix before relying on it in prod.
- `NIT` — defense-in-depth improvement; not exploitable on its own.
- `ACCEPTED_RISK` — a real sharp edge the team has already chosen knowingly (e.g. fail-open is documented). Name it so it's visible; don't re-litigate a locked decision — surface it for a guard, not a reversal.
- `DISPROVEN` — the Straw Man premise didn't hold here; you read the code and the control is present and correct. Say so explicitly — a disproven worry is a real result, not a non-answer.

## Output format

```
straw-man-audit: <surface or diff name> · <date>
CRITICAL (n):
  - api/foo.ts:34 — forwards to ElevenLabs before getUserFromAccessToken; unauthenticated callers drain the credit pool
HIGH (n):
  - api/_lib/rateLimit.ts:22 — fail-open on RPC error has no second-line ceiling; induced Supabase failure removes all limiting
  - api/_lib/quota.ts:178 — GRIFON_DEV_UNMETERED_VIDEO has no deploy-time guard preventing it being set on Vercel
NIT (n):
  - api/bar.ts:88 — raw upstream error echoed in detail; wrap into { error: CODE }
ACCEPTED_RISK (n):
  - Fail-open rate limit — documented tradeoff (rateLimit.ts:5-9); flagged for a behind-the-line guard, not reversal
DISPROVEN (n):
  - Webhook signature — verified over raw body, constant-time compare present (webhook.ts:~40); premise did not hold
VERDICT: STRAW_MAN_FAIL — 1 critical, 2 high, 1 nit  (PASS only with zero CRITICAL and every HIGH either fixed or consciously ACCEPTED_RISK)
```

## Hard guardrails

- **Report-only. This skill never edits files.** It surfaces findings; Neil decides what to fix. Mirrors `gemini-eval` / `brand-check`.
- **Never touch tuned content.** Do not edit `services/geminiService.ts` or `api/_lib/prompts.ts` — and if a fix would change tuned prompt/schema text, route it to `grill-me` → Neil, never straight to a diff (CLAUDE.md TUNED-file rule, `agent_lessons.md` 2026-05-09).
- **Don't change function signatures or RPC names** in `api/_lib/*` as part of an "audit fix" — those contracts are load-bearing (`api/CLAUDE.md`). Propose; don't apply.
- **Read-only on secrets.** Reference env var *names* and where they're read; never print actual secret values, never exfiltrate `.env`.

## Out of scope / when this is the wrong tool

- "Does it build / type-check / smoke?" → `verify-changes`.
- "Is the UI on-brand?" → `brand-check`. "Do the Gemini outputs honor their rules?" → `gemini-eval`.
- General plan stress-testing / premortem on a non-security design → `grill-me` (this skill is the security-flavored, false-premise specialization).
- A full formal pentest of live infra (real traffic, fuzzing, exploit PoCs) — out of scope; this is a code-and-architecture read, not an active attack.
