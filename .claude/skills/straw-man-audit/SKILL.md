---
name: straw-man-audit
description: Evidence-led security review of Grifon's auth, quota, billing, media and secret boundaries. Use for security audits, red-team requests, or API changes affecting those boundaries. Report-only; UI brand review belongs to brand-check.
---

Keep the established skill name for existing callers. Review the actual security
boundary without assuming it is broken or inventing an expert's verdict. The goal
is to find consequential failures and the evidence that would confirm them.

## Scope and evidence

Read the current diff, originating contract, affected callers and relevant tests.
For a whole-surface audit, state the selected entry points. For a scoped diff,
follow affected dependencies; do not audit every API merely because one changed.

For each actionable finding, provide:

- The triggering request, outage, misconfiguration or event sequence.
- The reachable code path with current `file:line` references.
- The failed contract and concrete user, security or cost impact.
- A reproducer or the narrowest check that could confirm the failure. Say whether
  it was run, and distinguish a demonstrated failure from a code-supported one.

Separate unverified concerns from findings. Name the missing evidence and how to
obtain it; uncertainty alone does not establish an exploit. Report "no actionable
findings" when supported, with coverage and limits. Do not manufacture nits.

## Independent review

For non-trivial work, use a fresh independent reviewer with the task contract,
current diff and relevant test evidence, without the builder's defense of it.
Use the Agent tool with `subagent_type: general-purpose`.
One reviewer may cover correctness, spec fidelity and the security surfaces below.
Use a specialist only for a material boundary the review cannot otherwise assess.
Follow [the review workflow](../../../workflows/pr_review_loop.md) for review scope
and stopping conditions. The reviewer reports; the builder fixes and the reviewer
rechecks relevant fixes. A small read-only gut-check may run inline, but it does
not replace a required independent review.

## Surface checklist

Treat these as inspection targets, not permanent claims about the implementation.
Read the selected path before assigning a finding or severity.

### Auth and ownership

- Trace each affected paid proxy from bearer-token verification through upstream
  submission. A missing or rejected identity must stop paid work. Check current
  `api/CLAUDE.md` and `api/_lib/supabaseAdmin.ts`.
- Trace run, scene, render and media identifiers to ownership checks against the
  verified user. Existence alone is not authorization.
- For cron/internal entry points, verify the actual authentication mechanism
  before mutations or spend; an internal-looking URL is not a control.

### Rate limits, quota and provider spend

- In `api/_lib/rateLimit.ts`, inspect both RPC and error paths. The current error
  path uses `memoryBackstopAllows`: a per-instance limit that resets on cold start,
  not a global ceiling. Assess the affected caller's aggregate exposure without
  claiming that all limiting disappears.
- In `api/_lib/quota.ts`, distinguish `consumeMonthly` and the legacy no-ID video
  path from `consumeAdOnce`, shared by `consumeFinishedAd` and `consumeOmniAd`.
  The latter uses transactional `consume_finished_ad` and denies unavailable or
  malformed results. Do not generalize one path's outage behavior to all quotas.
- Inspect `supabase/finished_ad_meter.sql`, `tests/unit/finishedAdAtomic.test.ts`
  and `tools/verify-finished-ad-meter.mjs` when changing the finished-ad meter.
  Preserve receipt/debit atomicity, rollback, replay and last-credit concurrency.
  Unit mocks alone cannot establish PostgreSQL locking behavior.
- Distinguish customer-credit deduplication from provider-submission deduplication.
  Trace claim, submit, handle persistence and recovery separately. See
  [the recovery investigation](../../../workflows/provider-submission-recovery.md).
- Inspect dev-unmetered bypasses without reading their secret values. Establish
  the affected path and deployment preconditions before reporting exposure.
- Follow the actual music/global budget caller and its fallback. Check rate
  limiting precedes quota checks, as required by `api/CLAUDE.md`.

### Secrets and bundle boundaries

- Server secrets and service-role credentials must stay outside browser code,
  responses and `VITE_*` variables. Report names/locations, never values.
- The five protected prompt flows are handled by `api/gemini/text.ts` with
  builders in `api/_lib/prompts.ts`. For relevant changes, use the existing
  build and `npm run check:bundle-leak`; state exactly what it covers.

### Billing and webhook

- Inspect PayMongo signature verification over raw bytes before payload use,
  including constant-time comparison and rejection paths.
- Check replay handling and event/period idempotency before credit or subscription
  writes. Trace the trusted source of the granted plan; a client selection alone
  cannot authorize an upgrade.

### Inputs and errors

- Follow user-controlled URLs, paths and render arguments through validation and
  use for SSRF, traversal or injection; identify a reachable input and consequence.
- Preserve `{ error: 'CODE', detail?: string }` and required retry metadata.
  Inspect responses for actual secret/internal leakage, not just an unfamiliar
  error shape.

## Report and verdict

Rank confirmed or code-supported findings by impact: `CRITICAL` for unauthorized
access, spend or secret exposure; `HIGH` for a consequential failure with stated
preconditions; lower-impact items only when they affect the contract. Keep
unverified concerns separate. Record `ACCEPTED_RISK` only with an existing,
applicable user decision; the reviewer cannot accept risk on the user's behalf.

Return scope/revision, ranked findings, unverified concerns, checks actually run
and limitations. `PASS` means no unresolved actionable finding in the inspected
scope; `FAIL` names the blocker; `INCOMPLETE` names a missing boundary or check.
These are review verdicts, not proof of live security or permission to release.

## Guardrails and exclusions

- Report-only: do not edit files or auto-apply findings.
- Do not change tuned prompts, schemas, models, safety rules or generation knobs;
  exact-diff approval remains required by AGENTS.md. Do not change load-bearing
  function signatures or RPC names incidentally.
- Never read or print secret values. No paid calls, live exploit traffic,
  production writes, publication, deployment or merge through this skill.
- Use `verify-changes` for application verification, `brand-check` for visual
  fidelity and `gemini-eval` for creative output. Formal models and deterministic
  checks cover explicit contracts; they do not certify creative quality.
