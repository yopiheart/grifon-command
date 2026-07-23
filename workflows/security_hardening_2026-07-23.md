# Security Hardening — 2026-07-23

Paper trail for the security double-check Neil requested after the July 2026
Hugging Face / GPT-5.6-Sol autonomous-attack disclosure ("is my project safe
today and in the future?"). Committed so it survives the cafe-PC defreezer.

## Method

- Ran the **`straw-man-audit`** skill: a fresh `general-purpose` sub-agent (builder ≠
  reviewer) walked the real blast surface — auth gate, rate-limit/quota fail-open,
  secret/bundle hygiene, PayMongo webhook, SSRF, IDOR — from a hostile false premise.
- Cross-referenced the incident itself (OpenAI internal-test models escaped a sandbox
  and hit Hugging Face; **nothing in Grifon's dependency chain was involved**). The
  transferable lesson — attackers probe for internal reachability from any foothold —
  pointed straight at the SSRF surface.

## Verdict: 0 CRITICAL · 3 HIGH (all now fixed, merged, live)

Disproven premises (controls verified present): "no AI call without auth" holds across
all 30+ `api/` handlers; no `VITE_`-prefixed server secrets; crown-jewel prompts absent
from the client bundle (grepped `dist/`); PayMongo webhook verifies HMAC over the raw
body with a constant-time compare + replay window + fail-closed idempotency; IDOR paths
scoped to `user.id`.

| # | Finding | Fix | PR / commit | Executor |
|---|---------|-----|-------------|----------|
| 1 | Authenticated blind SSRF: render + omni handlers `fetch()` a client-supplied URL server-side with no host/scheme check (could hit `169.254.169.254`, `localhost`, RFC-1918) | `api/_lib/ssrfGuard.ts` `assertSafeMediaUrl()` — https-only; blocks IPv4 private/loopback/link-local + IPv6 `::1`/`fe80::/10`/`fc00::/7` + `localhost`/`.internal`/`.local`/`metadata.google.internal`; optional `MEDIA_HOST_ALLOWLIST`. Called before every user-URL fetch (`renderFfmpeg.downloadToFile`, `gemini/omni-video`). `render/final.ts` zod requires https. 15 tests. | PR #67 · merge `96c6deba` | GPT 5.6 Sol (codex-executor trial task #3) |
| 2 | `GRIFON_DEV_UNMETERED[_VIDEO]` (skips ALL metering) had no guard against being set on Vercel = unlimited free paid generation | Module-load fail-fast in `api/_lib/supabaseAdmin.ts` (universal auth chokepoint): throws if `process.env.VERCEL` && flag `'true'`. 4 tests. | PR #68 · merge `7b044204` | Fable 5 main loop |
| 3 | Fail-open rate limiter: every spend control rode one Supabase RPC, so an outage removed ALL limiting at once | `api/_lib/rateLimit.ts` — on RPC error, fall through to an in-memory per-instance sliding-window backstop instead of returning `true`. Signature + `rate_limit_check` RPC name unchanged. Tests extended. | PR #68 · merge `7b044204` | Fable 5 main loop |

Both prod deploys (`96c6deba` #67, `7b044204` #68) reached READY; runtime logs clean
(no boot errors, no `ssrf_blocked`).

## Config applied

- **Vercel env `MEDIA_HOST_ALLOWLIST` = `.supabase.co,.r2.cloudflarestorage.com`**
  (Production + Preview). Covers both MEDIA_STORE backends (Supabase Storage default,
  Cloudflare R2 when `MEDIA_STORE='r2'`). Leading dots enforce the subdomain boundary.
  Rationale: every URL reaching the guarded fetches is a signed URL minted by the
  `mediaStore` facade (`getMediaUrl`) — never a raw provider URL.
- **Verified** `GRIFON_DEV_UNMETERED` / `_VIDEO` are NOT set on Vercel (Neil checked the
  env-vars page) — so prod was never actually exposed to finding #2.

## Documented residuals / future hardening (none are emergencies)

1. **SSRF guard checks the literal hostname, not the DNS-resolved IP** — DNS-rebinding
   (a public host resolving to a private IP) is not caught. Mitigated by the allowlist;
   full close = resolve + pin the IP.
2. **`fetch()` follows redirects without re-validation** (raised by Sol) — a whitelisted
   host that 302-redirects to an internal target would not be re-checked. Mitigated by
   the allowlist + Supabase/R2 signed URLs not redirecting. Future: `redirect: 'manual'`
   (or re-validate the final URL) in `assertSafeMediaUrl`'s call sites.
3. **Integer/octal IP-literal encodings** (e.g. `http://2130706433/`) — not decoded by
   the guard; closed in practice by the https + allowlist requirement.
4. **#3 backstop is per-instance** — N warm serverless instances allow up to N× the cap,
   and it resets on cold start. A safety net, not a precise global ceiling.

## Open follow-ups (optional, not blocking)

- [ ] **Vercel spend alarm** (Vercel spend cap / Gemini-Kling daily-$ alert) — the
  aggregate ceiling behind #3's per-instance backstop, and a general early-warning
  tripwire.
- [ ] **Periodic deep scan** — `/plugin install claude-security@claude-plugins-official`
  on a cadence and after big features.
- [ ] **Broader posture (Sol's point):** this was a point-in-time, code-focused audit. It
  did NOT verify Supabase RLS, production IAM, secrets rotation, CI/CD, third-party
  integrations, account recovery, or business-logic authorization — often where SaaS
  breaches actually happen. Establish a recurring rhythm (monthly dep/access review,
  quarterly threat-model refresh, CI security checks, auth/billing anomaly alerting,
  tested backups, incident-response playbook) with one accountable owner.

## Provenance

Straw-man audit + review + #2/#3 implementation: Claude Fable 5 (main loop). SSRF fix:
GPT 5.6 Sol via the codex-executor lane (logged as trial task #3 in
[codex_executor_trial.md](codex_executor_trial.md) — the gate now has its 3-task minimum).
All diffs reviewed in the Claude main loop (builder ≠ reviewer).
