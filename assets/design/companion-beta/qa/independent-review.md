# Independent beta review

Reviewer: independent `beta_final_review` agent, following the earlier independent `beta_review`. Base: `8d5a4be8292d653ae6f9182a1d49eac62077001a`. Date: 2026-10-10 (Asia/Manila). Working-tree review on `codex/companion-beta-readiness`; no deployment, provider calls, invitations, or production database changes.

Final correctness verdict: **PASS for the reviewed browser-local, mocked beta contract; no unresolved P1 finding in the reviewed diff.** The broad frozen-source run passed 39/39, followed by 9/9 targeted checks after the final two-line paid-text error fix. Brand verdict: **BRAND_PASS_WITH_NITS, 42/50, 0 critical, 1 cosmetic P3**. This report is not a production release approval.

## Findings

1. **P1 — closing a tab permitted a duplicate paid non-video request on Resume (resolved).** The initial Web Lock was released when the document closed; an unfinished stage could then repeat despite the first server request still running. The original independent mock reproduction recorded **two image submissions for the same scene**, with zero unexpected runtime requests. Evidence: `independent/duplicate-after-tab-close.json` and screenshot. Durable local unresolved-operation receipts now block repeat submission, including after closing the document. The final frozen-source browser run reverified the close/reopen and read-only-output recovery cases.
2. **Brand readability — actionable conflict recovery uses 11px helper text (resolved).** `components/CompanionChat/CompanionChatSurface.tsx:365` formerly placed the new preserve-both-versions instructions in `text-[11px]`. It now uses `text-xs`; the updated visual run passed all three sizes.
3. **P1 — inherited automatic retries resubmitted ambiguous paid requests before the receipt guard returned (resolved).** The original independent mock recorded **two image calls without clicking Retry** after a lost result. Evidence: `independent/automatic-retry-network-error-red.json`. The production HTTP transport now tags unknown outcomes before either retry loop; scene rerolls, end-frame fallback, and optional-stage degradation preserve that classification. Real public transport tests verified HTTP 503/504, network loss, truncated JSON, and incomplete successful JSON for Gemini text, voice, final-render startup, Veo, Kling V3 and Kling Omni. Image orchestration verified one POST, no automatic replay, and a blocked manual repeat.
4. **P1 — valid JSON with missing paid output caused replay or silent missing output (resolved).** HTTP 200 `{}` originally returned an unclassified fulfilled text/voice result and caused two image submissions. Evidence: `independent/transport-gemini-invalid200-red.json`, `transport-voice-invalid200-red.json`, and `orchestrator-transport-invalid200-red.json`. Structural consumption checks now reject unusable outputs as unknown. A completed final-render poll without a URL also fails without starting another render. These checks do not change model prompts or requested response schemas.
5. **P1 — paid text error codes triggered client replay (resolved).** The handler's `flow_output_invalid` 422 can follow its paid output-validation retry; provider `gemini_quota` 429 can follow a prior paid attempt, and each client replay consumes another workflow request. Independent real-HTTP reproduction recorded two producer POSTs for each code. The provider-quota service remained in its backoff loop. Evidence: `independent/paid-text-*-red.json` and `paid-text-red.log`. The final two-line patch tags these specific paid outcomes while preserving safe pre-submit `rate_limited`/`quota_unavailable` retry behavior. Final real public-service and producer tests each recorded one POST, a settled error, and a blocked manual repeat for both codes.
6. **P3 / BETA-09 — mobile post-intake placeholder clips (documented cosmetic issue).** `components/CompanionChat/CompanionChatSurface.tsx:363` uses `Anything to change? Edit your brief above.` in the 44px composer. At 375px its second line is partially clipped. Evidence: `independent/disabled-generate-375.png`. The Edit brief control and full guidance remain accessible; no function is lost. A one-line placeholder is a suitable future copy fix.

Follow-up on finding 1: **resolved for the reviewed browser-local scope**. The durable receipt begins before dispatch and is only removed after explicit settlement against a fresh saved checkpoint. Closing a pending request or closing after a network failure now produces one total image call on the subsequent Resume and shows an unresolved-request explanation. A later read-only saved storyboard remains accessible. Successful checkpoint settlement, unavailable receipt storage, and rejected outcome behavior are additionally covered by the builder's unit tests; independent source review found the explicit settlement design coherent. Follow-up 3/3 browser checks passed before finding 3's separate automatic-retry reproduction.

## Independent evidence

Command: `npx.cmd playwright test --config assets/design/companion-beta/qa/independent/review.config.ts`.

Final broad run: **39/39 passed**, exit 0, against a frozen production source. `independent/final-run.log` records the run; `source-hashes-before.json` and `source-hashes-after.json` match for all 20 reviewed production files. The new paid-text 422/429 finding was reproduced after that run, then fixed and verified by **9/9 targeted checks**, exit 0: four paid-text service/producer checks and five repeated image-orchestration checks. Command suffix: `--grep 'paid text|real image transport'`; evidence: `final-seam-run.log`. This is **43 unique passing cases**, with five repeated after the last patch. The `final-seam-source-hashes-before.json` and `final-seam-source-hashes-after.json` manifests also match all 20 files. Only `services/geminiService.ts` changed between the two phases, by the reviewed two-line error-classification fix.

An interrupted earlier diagnostic run contained two harness mistakes (unsupported 5-second Veo fixture and obsolete `Close output` locator); the corrected fixtures use supported 6-second Veo and the actual `Close viewer` control. That diagnostic output is retained under ignored `.tmp/independent-fixture-diagnostic/` and is not release evidence. The genuine original defect reproductions remain in the review evidence directory.

Initial pass: 2/2, including an assertion that reproduces the duplicate-dispatch defect. A passing reproducer means the defect exists, not that production is safe. Visual-only rerun: 1/1. All generation and runtime API traffic mocked or blocked. Only local assets and Google font GETs were permitted during preview inspection.

Inspected screenshots at 375×667, 390×844, and 1280×900; also inspected 200% pixel-density crops of the composer and Studio/New chat icon-label pairs. `independent/visual-metrics.json` records no document overflow, 44px visible primary controls, Inter 14px, 400 entered values and 600 buttons. The search input sits inside its 44px label hit target. Missing-product-photo generation is disabled with an explanation. Invalid upload shows a readable recovery card and Back to brief. Images: `initial-375.png`, `initial-390.png`, `initial-1280.png`, `disabled-generate-375.png`, `upload-error-375.png`, `composer-200-percent.png`, `studio-pair-200-percent.png`, `new-chat-pair-200-percent.png`.

## Correctness and contract assessment

- Local save conflict: transaction-scoped revision comparison rejects stale books; copy recovery merges the selected local version into the newest persisted book. Navigation and paid actions await the save barrier. No additional loss or account-ownership defect found in these changes.
- Open-tab Stop/retry and cross-tab lock: await-in-flight behavior, browser exclusion, and the durable receipt are coherent. Unknown outcomes retain the receipt; no automatic expiry clears it. Read-only saved progress remains accessible. Support-assisted recovery can be required after uncertain work, even if a later operation returned a definite denial.
- Atomic debit: one service-role SQL transaction locks receipt, monthly counter, then subscription credit. Marker and debit roll back together. The TypeScript caller fails closed if the RPC is absent, fails, or returns malformed data. No additional SQL correctness defect found by source review. The recorded PGlite test is single-connection local evidence, not deployed Supabase or concurrent-session proof.
- Telemetry: client and server both allowlist producer event metadata, removing free-form provider errors/flags/prompt content. Existing non-producer event policy is outside this diff.
- Truthful scope: the surface clearly describes guided intake, device/browser-local chats, explicit approval before video, and unreliable post-close continuation. Those disclosures do not authorize an accidental duplicate submission.
- Physical phone/browser lifecycle, approved paid/provider end-to-end run, target database SQL rollout/verification, and deployed account journey remain **NOT RUN**. No invitations or deployment are approved by this review.

## Brand score (final review)

DESIGN.md is authoritative over the skill's stale blanket glass, uppercase, and mono-label rules. Neutral zinc canvas, gold actions, local bounded chat chrome, existing primitives and rounded-xl controls match the current design. No new accent/overflow/icon distortion was observed. Marketing-specific checks are not applicable.

| Axis | Score |
|---|---:|
| Philosophy coherence | 9/10 |
| Visual hierarchy | 8/10 |
| Execution craft | 8/10 |
| Functionality | 8/10 |
| Brand distinctiveness | 9/10 |
| Total | 42/50 |

Final visual verdict: **BRAND_PASS_WITH_NITS — 0 critical, 1 cosmetic P3, 42/50**. The frozen-source screenshots were refreshed and inspected on 2026-10-10 at 375×667, 390×844 and 1280×900, including 200% icon/composer crops. The five-minute quick win is the one-line post-intake placeholder described in BETA-09. Final correctness verdict: **PASS for the reviewed mocked browser-local scope**. Physical phones, live generated media, and target database concurrent sessions remain unverified.

## Reviewed initial Git blob hashes

| File | Git blob |
|---|---|
| CompanionChatShell.tsx | `4fbb7022a80b6a2953dff09a2bd6d4345a1faa28` |
| CompanionChatSurface.tsx | `ea9f0df2105af46d89b3b896b78f969549443eb5` |
| CompanionChat/index.tsx | `15badcef4b90b5da80ec366db3a1799685ab7e2a` |
| ProducerFlow.tsx | `8cfff3ff85d5caa9ea359b0399255a3969139a0a` |
| companionConversations.ts | `63df7cddd2d908d2b7020571d990e48de7ef3a65` |
| companionProductionLock.ts (pre-fix) | `4858ea976f76cbd037403df0b73c6a02a069e230` |
| producerOrchestrator.ts | `26e3dde7f94e016eed0f7ca0175a96f811b4131c` |
| producerTelemetry.ts | `69d815595809b31f5b397eabd1059253ec1e0304` |
| quota.ts (including unavailable mapping) | `31a5130536db9e2c37c076b39fa361c36cb3d41d` |
| events.ts | `3bdcef090945b34fcdbde2be8773b0db03798f2f` |
| finished_ad_meter.sql | `577c1ea9ba87dea8454ac8aa92742af7d4a670fa` |

Follow-up reviewed blobs: `companionProductionLock.ts` = `6f340c0d3c99c5bdf72ec5bf0f15feceb29dbce0`; `ProducerFlow.tsx` = `5645e136de2008ec1d02a26316a462bba844d5eb`; `CompanionChatSurface.tsx` = `0794e9bc6964fcfa3ce134fa765188d17ee1b8cb`; Omni temporary-allowance mapping `api/gemini/omni-video.ts` = `09341b46350f584f5bbe6a7b0318920284694b37`.

The blob values above identify historical review stages. The authoritative final reviewed source is recorded by SHA256 in [`independent/final-seam-source-hashes-after.json`](independent/final-seam-source-hashes-after.json), covering the 20 production files across UI, storage/receipts, generation transport/orchestration, billing handlers/SQL and telemetry.
