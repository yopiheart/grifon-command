# Independent Companion main-readiness review

Reviewer: fresh report-only `main_readiness_review` agent. Date: 2026-10-11 (Asia/Manila).

Review boundary: merged Companion feature `889c0e1d4cf6cfd05c84a2437d437a97785db285`, integrated with `origin/main` `4b36c62bb7f305366caf42770648bcb8fa3c7bf2`, plus the working CI, Playwright, hostname-assertion, and PostgreSQL-verifier changes identified below. No application/source edits, test execution, database connections, secret/environment reads, provider calls, deployment, or production mutations were performed by this reviewer. Existing command evidence was inspected independently.

## Verdict

**PASS for the reviewed source and isolated PostgreSQL verification: no unresolved actionable P1/P2 found in the final files listed below.** This is not a main-merge or production-rollout approval. A complete GitHub run against the final main-target PR is still required; the local full-browser attempt did not test this candidate. The target Supabase RPC is documented as absent and must be applied and checked through a separately approved rollout before deploying the callers.

## Findings and resolution

- **P1, resolved before this verdict: the proposed fixture-only Playwright server broke the real pre-auth API guard test.** The intermediate `playwright.config.ts` command used `verify-recovery-server.mjs`, which returns 503 for `/api/*`; unchanged `tests/e2e/codex-desktop.spec.ts:6-14` requires the real method and missing-bearer guards (405/401 and exact JSON). This would fail fresh CI. The final configuration restores `npm run dev`, preserving those guards and all assertions. CI uses dummy browser configuration and no application/provider secrets. No guard behavior is replaced with a mock of its expected response.
- **Local evidence issue, resolved in configuration: an unrelated listener was reused.** The partial full-E2E attempt rendered the old Studio app, a `SUPABASE_NOT_CONFIGURED` fallback on public routes, and passing live-method guards rather than the proposed fixture server. It is invalid combined-candidate evidence. `reuseExistingServer: false` now fails closed if another checkout occupies port 5173; it does not stop or replace that process. A complete run of the final configuration remains required on the fresh GitHub runner.
- **Database harness defects, resolved before final successful run:** the admin preflight originally ignored its database argument, and the next attempt compared PostgreSQL `inet::text` output including its network suffix with a bare address. The final helper forwards the selected database and uses `host(inet_server_addr())`; both failures preceded creation of owned database/roles. The final successful verifier hash is recorded below.

## Source assessment

The workflow retains `pull_request` targeting `main` and push-to-main triggers. The new independent `database` job runs a local PostgreSQL 17 service and the verifier without application dependencies or provider secrets. It has a five-minute cap and is included in `main-status.needs`, its red predicate, and its failure description. A failed or skipped database result cannot close the main-red issue as a green result. No continue-on-error, skipped assertion, or reduced existing test scope was introduced.

The hostname repairs retain the original behavior checks: typography permits both loopback origins while still blocking runtime APIs and external providers; settings resolves the destination against Playwright's `baseURL` and still checks persistence and browser Back. Original evidence records both unmodified assertions failing for the actual hostname mismatch, rather than a simulated product failure. The affected final cases passed 10/10 with zero retries/skips.

The PostgreSQL verifier requires explicit opt-in, explicit loopback host/port, the `postgres` test role, and the named empty admin database. Before mutation it checks the server address, absence of Supabase bootstrap roles, other non-system databases, and user tables. It removes libpq service/address/options overrides, never loads `.env`, and has no Supabase/provider client. It creates a random owned database and previously absent bootstrap roles, and only drops these owned resources. Session/statement/lock waits are bounded. The observed cleanup catalog has zero temporary databases, zero bootstrap roles, and zero test tables.

Concurrency checks use two distinct backend PIDs, hold A's transaction after the first RPC has returned, then inspect `pg_stat_activity` and `pg_blocking_pids` until B is observed waiting on A. Thus the check requires actual contention rather than relying on timing or `Promise.all` alone. Both billing units exercise same-ad monthly/top-up exactly-once debits, different-ad contention for the last monthly/top-up slot, rollback of either funding source, committed lost-response replay, aged receipts, and real role-denial calls. Existing SQL assertions inject a failing receipt write and check debit rollback. The exact legacy quota fixture has Git blob `2f01d8e57ff80c12104b67249b857d03f398bc5e`, matching `8d5a4be:api/_lib/quota.ts`. Its original helpers execute unchanged after import/export/type stripping; controlled reads force the actual duplicate-charge race. All four legacy unit/funding combinations charge two units and fail the same exactly-one-unit invariant used for the fix. Setup errors cannot count as original-defect proof.

## Integration seams

The main-imported MarketMind report view, evidence helper, research component, PDF generator, and `api/_lib/prompts.ts` match `origin/main` exactly. The prompt Git blob is `d0998f1931c6cbfd7b4aae68517ff582435fa003`. There is no newly authored tuned prompt/schema/model/knob diff. The Companion service's minimum `subject`/`narrativeReport` consumption check agrees with the main server's output contract.

App, Companion UI/storage, ProducerFlow, subscription/auth changes, and generation transport are unchanged from the merged Companion feature. I traced the integration boundaries rather than redoing the previously completed beta audit: default Companion versus explicit Studio/history routing, account-keyed mounts and IndexedDB reads, save-before-navigation/logout, read-only restored production checkpoints, user/run exclusion, durable uncertain-operation receipts, and quota/RPC caller shape. No additional integration correctness defect was found. The existing reviewed browser-local and cross-device/background-execution limits still apply.

## Evidence inspected and limits

- Root gates: build and bundle guard exit 0; voice/evaluation prompt sync, domain, artifact anchors, design lint, and Codex contracts exit 0. Vitest result: 1,541 passed, 0 failed, 32 existing skipped (1,573 total).
- Original hostname failures and affected 10/10 browser success are retained in `qa/original-red/` and `qa/affected-green/`.
- `qa/database/attempt-03-native-command.json` records exit 0 on PostgreSQL 17.6. The successful native log records four genuine original duplicate-charge rejections and twelve observed lock-contention cases, plus replay/age/role/transactional assertions. Before/after hashes match all seven verifier/schema inputs. `attempt-03-cleanup.json` separately confirms cleanup.
- The interrupted local full-browser run is not evidence of either a candidate product regression or a complete pass. Final GitHub browser/CI results must be obtained separately.
- Isolated PostgreSQL validates real SQL concurrency and atomicity, not target Supabase migration history, PostgREST schema cache/RPC invocation, real account auth, provider execution, physical phones, or generated-media quality. Those remain explicitly separate checks.

## Reviewed raw SHA-256 inputs

| File | SHA-256 |
|---|---|
| `.github/workflows/ci.yml` | `af0257acc0a875c83c3ed470f1a9a49f7f808ef56fd422b02195b2b5a844f310` |
| `playwright.config.ts` | `eaa2d37dbf7a556c889aea052468640cb7e345d734ccb9e33ddbe872ed207c87` |
| `tests/e2e/companion-account.spec.ts` | `b05950172e1caae8f394dd94c987e3bc844141f1a63de7deffbc1a13fc89bdc9` |
| `tests/e2e/typography.spec.ts` | `f8bddb3dfb6d2b69c5f933b757e7e9f3036b499b78d5bc87990a3ae3022b6636` |
| `tools/verify-finished-ad-meter.mjs` | `2469b5fb5ca176226d02b58b6ad68bb3dd4234d176dbad0b4a7f0f89ed3a9e7a` |
| `tests/sql/finished-ad-meter-legacy-quota.txt` | `f8a9622495830bd5d65fbcac19c6801d510d10a85f5e5fc08bf167b76f3fe826` |
| `supabase/finished_ad_meter.sql` | `4ee39c8e04d17b4d42579606e86c759d8f0bf02643d77c91a8da43d6ee7979d3` |

Hashes identify this review boundary. A later production-rollout proposal or changed executable input requires a narrow follow-up review.
