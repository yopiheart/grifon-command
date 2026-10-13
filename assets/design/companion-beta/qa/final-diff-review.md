# Independent correctness diff review

Reviewed on 2026-10-10 in `C:/Users/ADMIN/.codex/worktrees/4b8d/grifon-command`, branch `codex/companion-beta-readiness`, against `8d5a4be8292d653ae6f9182a1d49eac62077001a`.

Method: fresh, report-only static review of the uncommitted application/API/SQL diff, new files, and the existing code needed to trace their behavior. Read repository/scoped instructions, DESIGN.md, verify-changes, surgical-edit, and their desktop adapter. No application/test edits, build, test suite, browser, provider, live database, or secret reads were performed by this reviewer. Runtime verification belongs to the separate verification agents.

Contract: guided-chat drafts/photos/account isolation survive save/refresh/cross-tab use; stop/retry/close and lost or malformed provider responses cannot ambiguously replay paid work; the finished-ad debit/receipt is atomic; producer telemetry excludes private briefs and provider error text; recovery and local/background limitations are truthful. No tuned prompt/schema/model/knob changes are authorized.

## Final verdict after independent narrow recheck: PASS — no open P1/P2

The P1 below is resolved in final `services/geminiService.ts` blob `0553209e790a485901e418a5dd4a9578e7a56b78`. The two-line transport correction at 171/176 marks provider `gemini_quota` 429 and `flow_output_invalid` failures as `generationOutcomeUnknown`. Both the client's `retryWithBackoff` and the producer's `withRetry` already exit immediately on that marker, so neither identified path automatically resubmits the paid flow. HTTP 429 `rate_limited` and HTTP 503 `quota_unavailable` remain ordinary retryable errors from definite pre-submit gates. No server ladder, tuned prompt/schema/model, or generation setting changed.

Recheck method: independently read the final branches, both retry consumers, and the added regressions. Compared the other 37 previously hashed files with their initial hashes: all were unchanged. Read the independent intercepted-HTTP red/green evidence: the 422 changed from `unknown:false` to `unknown:true`; provider 429 changed from two HTTP calls with a pending retry to one call and `unknown:true`. These were fixture/interception results, not live provider calls. The builder reports the proxy unit suite at 25/25 green after red reproduction; this reviewer inspected those cases but did not re-run the suite. No additional concrete issue was found in this narrow recheck.

Final additional reviewed hash: `tests/unit/geminiService.proxy.test.ts` = `514007ef83b113def3577c35cdffbd76238ab390`.

Evidence read: `qa/independent/paid-text-flow_output_invalid-transport-red.json`, `qa/independent/paid-text-flow_output_invalid-transport.json`, `qa/independent/paid-text-gemini_quota-transport-red.json`, and `qa/independent/paid-text-gemini_quota-transport.json`, relative to `assets/design/companion-beta/`.

## Final recovery harness recheck: PASS

Independently reviewed only the final diffs in the four files below against the existing application/API contracts. Explicit `experience=studio` entry/reopen URLs select the Dashboard expected by these tests. `openOneShot` now accepts the One-Shot module restored through `history.state.appModule` after reload; each caller still verifies its specific recovered screen and persisted state. The MarketMind fixture adds the existing required `subject` and nonempty `narrativeReport` fields. Its SCRIPT fixture satisfies the existing nonempty `hook1`/`hook2`/`body` schema and the client guard.

The final-render poll-failure case now asserts one POST before customer Retry and exactly two afterward, matching the unknown-outcome marker that stops automatic replay. All existing gate/persistence, provider call-count, same-run/job, retained asset, and `unexpected` request assertions remain. No weakened assertion or concrete application defect was found. This was a static recheck; the separate smoke agent owns the final 18-case runtime result. No application or test changes/runs were made by this reviewer. The final `services/geminiService.ts` hash above remains unchanged.

| Final harness file | Reviewed Git blob |
| --- | --- |
| `tests/e2e/legacyRecovery.ts` | `ed3e63bf0da33ed538136dbe702980da03b48409` |
| `tests/e2e/oneshot-legacy-recovery.spec.ts` | `a5b01d9988f5f3788e06a4333d7648eec99bf24e` |
| `tests/e2e/oneshot-recovery.spec.ts` | `6949670b2c8465b69dcdd2eef7643c42cd7b0a01` |
| `tests/e2e/fixtures/oneshotRecovery.ts` | `0c4001bfbce6b809026f7da2fd0a63898813a701` |

## Dialogue prompt-capture fixture recheck: PASS

The final one-line `tests/unit/dialogueLock.test.ts` change replaces the empty response array with two `VideoPrompt` objects: allowed `cinematic`/`talking` types, `scriptLine` values matching the two storyboard inputs, and nonempty prompt strings. This conforms to the existing `VideoPrompt` type (`types.ts:128-131`) and the new minimum response guard for a nonempty storyboard. All six dialogue prompt assertions, supplied storyboard/business inputs, and captured request extraction are unchanged. This changes only mock response data; no application/request/tuned prompt content changes. Final reviewed Git blob: `852a76a98249f443781d102b386d536a7dbfa52e`. The application `services/geminiService.ts` hash remains the final hash recorded above. This reviewer did not run tests; root owns the full suite and the final affected-test rerun.

The intermediate fixture used `action` and omitted `scriptLine`; that nonblocking fixture observation was corrected in the final literal before this verdict. No assertion was removed or weakened, and no concrete application P1/P2 was found.

## Verdict at initial frozen source: FAIL — one P1

### P1 — Prevent replay after a paid text flow has already produced invalid output

Primary diff location: `services/geminiService.ts:176`; related retry branch at `services/geminiService.ts:167`.

The new classification makes generation failures non-replayable only for HTTP 5xx (excluding `quota_unavailable`). But `api/gemini/text.ts:528-533` returns HTTP 422 with `error: 'flow_output_invalid'` after `runFlowWithSchema` has exhausted its internal validation/regeneration ladder. This 422 remains an ordinary error. The script and storyboard producer stages use `withRetry` (`services/producerOrchestrator.ts:572-588`, calls at 1661/1683), which retries ordinary errors and submits the same paid flow again. Each request can invoke the internal ladder again; an adscript replay also consumes another workflow unit.

Static reproduction: start a producer run with a valid report and presenter; make the script or storyboard flow produce structurally unusable output on both internal ladder invocations. The API returns 422 `flow_output_invalid`. `proxyCall` throws without `generationOutcomeUnknown`; the outer producer retry then sends another `/api/gemini/text` POST rather than stopping with its durable unresolved receipt. This violates the malformed-provider-response contract even though malformed HTTP-200 response bodies are already guarded.

Related 429 reproduction: let the first ladder invocation complete with malformed output, then let the permitted regeneration throw provider 429. The unwrapped regeneration at `api/gemini/text.ts:381/399` propagates to the route's quota mapping at 564, producing HTTP 429 `gemini_quota`. The client treats it as a retryable quota error, and `retryWithBackoff` replays the whole request even though an earlier invocation was already consumed. A definitive pre-submit `rate_limited` rejection must be distinguished from this provider response. This is the same paid-replay finding, not an additional architecture request.

Required correction: stop automatic client/producer replay for `flow_output_invalid` and for provider quota responses that cannot establish an entirely unconsumed flow. Keep definitive pre-submit rejections retryable. This can be a transport/error-classification change; the tuned flow prompts, schemas, models, generation settings, and server regeneration ladder need no change.

No other concrete P1/P2 was found in the reviewed diff. In particular, the SQL receipt/monthly-budget/credit lock ordering and transaction boundary are consistent with atomic same-ad charging; companion storage uses an atomic revision compare before replacement; producer lifecycle metadata uses a fixed allow-list on both client emission and event ingestion.

## Limits and remaining evidence

- The initial FAIL and hashes below preserve the reproduction boundary. The independently rechecked final source and resolved verdict are recorded above; every other previously hashed file was unchanged.
- SQL was inspected, not applied to a live database. The new RPC must exist before quota callers are deployed; missing/malformed RPC responses fail closed.
- Production exclusion/receipts are browser-local. A closed or uncertain submission may require support; cross-device provider idempotency and background execution are not established by this diff.
- Browser storage, mobile/accessibility behavior, provider execution, and rendered output were not re-tested in this report-only task.
- The inspected application diff contains transport/error wrapping and UI/persistence changes, with no changes to tuned prompt text, response-schema definitions, model IDs, or generation knobs.

## Initial reviewed Git blob hashes

Hashes are produced by `git hash-object` from the working files with Git's repository filters. They identify reviewed content, including untracked new source.

| File | Git blob |
| --- | --- |
| `api/_lib/quota.ts` | `31a5130536db9e2c37c076b39fa361c36cb3d41d` |
| `api/events.ts` | `3bdcef090945b34fcdbde2be8773b0db03798f2f` |
| `api/gemini/omni-video.ts` | `09341b46350f584f5bbe6a7b0318920284694b37` |
| `api/gemini/omni-video/consume.ts` | `8e458033e72ad2013a08b90bb7d47e9fa591ac18` |
| `api/gemini/video.ts` | `0dc140fba585314b0903cf517e70567b8822cc20` |
| `api/kling/omni-video.ts` | `3067ffe3e9e63d90aa6fa926bb191902fd60e30f` |
| `api/kling/video.ts` | `7185b8a8bd805d7b26de6f9da46741cf56d67b92` |
| `components/CompanionChat/CompanionChatShell.tsx` | `4fbb7022a80b6a2953dff09a2bd6d4345a1faa28` |
| `components/CompanionChat/CompanionChatSurface.tsx` | `f2c3b547f6b4de98895597884a8bf84494595a69` |
| `components/CompanionChat/index.tsx` | `15badcef4b90b5da80ec366db3a1799685ab7e2a` |
| `components/OneShotAd/ProducerFlow.tsx` | `178778591c78f066c77a31414217e85fac65e8b1` |
| `services/companionConversations.ts` | `63df7cddd2d908d2b7020571d990e48de7ef3a65` |
| `services/finalRenderService.ts` | `1c42d56030aef5265d02ebc326d4decfd2db8ddf` |
| `services/geminiService.ts` | `519f2571b3eaad1ff46e91e39d5866256d204f06` |
| `services/producerOrchestrator.ts` | `8981e2d2cd64f5c48e2fcb3718c11c926c15435e` |
| `services/voiceConsolidationService.ts` | `2fc8f413bbb6f011eb45d2e329985264ae04407d` |
| `services/companionProductionLock.ts` | `d387fefbdb4f726c8508f0968fc88fe2d1f961bc` |
| `services/generationTransportError.ts` | `66ebbceae2fd7ad3acad33ea8c1624ed4bd1b19b` |
| `supabase/finished_ad_meter.sql` | `577c1ea9ba87dea8454ac8aa92742af7d4a670fa` |
| `utils/producerTelemetry.ts` | `69d815595809b31f5b397eabd1059253ec1e0304` |
| `api/gemini/text.ts` (existing surrounding implementation) | `039d94e19c2f9b3bad488ba7f4319976e37e38f9` |
| `api/gemini/image.ts` (existing surrounding implementation) | `54d22a98239b3cd42e3795e5377c43bd16b26c8c` |
| `api/voice/consolidate.ts` (existing surrounding implementation) | `adf3cfadb9f5aeed661d92f94c37af86559db625` |
| `api/render/final.ts` (existing surrounding implementation) | `351430196afd1729cbf6fcf7af269997aa64e4c8` |
| `services/producerRunService.ts` (existing surrounding implementation) | `62d79c7eb2971b2b21b376a81f33134eca867d5f` |
| `services/producerDeps.ts` (existing surrounding implementation) | `f91a0467d04eb7d0da67a112c57261b7e3bb0b46` |
| `hooks/useQuota.ts` (existing surrounding implementation) | `55cefa8b09c367a4b01cc597df5f97ddde317af8` |
| `supabase/rate_limit.sql` (existing surrounding implementation) | `e8cbb4458aedf4de628d940c07f6abdc4b2c1fc5` |
| `supabase/credits.sql` (existing surrounding implementation) | `760ed19a9167e0d7fad32e77755171d62358c9b0` |
| `api/_lib/runEvents.ts` (existing surrounding implementation) | `b73bfafee20c630b624416128394c19c9124dddb` |
| `api/_lib/prompts.ts` (existing surrounding definitions) | `368eec3a477003ba1f74ccede03839a587ac1c10` |
| `types.ts` (existing surrounding definitions) | `491ae4b28256b16acef690d8900dc826ca828881` |
| `App.tsx` (existing entry-point account binding) | `746e9d691a423d091fc083ab8ac04dc07d7887ea` |
| `services/analyticsService.ts` (existing event transport) | `9132edbea40bcced1d694baf68cb693fb9cb437b` |
| `tests/unit/companionProductionLock.test.ts` (read, not run) | `020bb925b80545ce73b00cf012984e7730630005` |
| `tests/unit/productionTransport.test.ts` (read, not run) | `87d64b22c4e7bd283fe7ef301588b2d841609d12` |
| `tests/unit/finishedAdAtomic.test.ts` (read, not run) | `cc3561c1e363b1f5782c82afdefe8dbf193f76ff` |
| `tests/unit/producerTelemetryPrivacy.test.ts` (read, not run) | `eb81a3108bb895762a1ef8d15dc35022eb5325fa` |
