# NOW - the resume doc
**Stamped: 2026-10-11, Companion main-readiness CI/database work**

## NEXT ACTION

Latest checkpoint: exact0ebcf551 CI38128468369 passed build/static/artifacts,1,572unit tests (32existing skips), all24native database checks and Vercel. Browser gate remains incomplete:220/224 unique cases passed (217first-pass,3retry-pass), zero persistent assertions, four unreported after shards6/7 reached the15-minute cap. Fourteen other shards passed. Evidence ci-sixteen-summary.json binds head/base/merge trees; earlier red runs below remain historical.

Final scoped follow-up independently reviewed PASS/noP1/P2, including final source, raw controls, copied receipt hashes and refreshed32-shard partition. Current source bytes are frozen; commit/push next, then full exact-head CI required. No merge/deployment authorization added.

Current narrow follow-up: two reload tests now await the existing Saved footer before refreshing. Original4/4 failures reproduced selected-chat DOM ahead of its committed IndexedDB selection while the old chat stayed intact; patched6/6pass, two held native writes fail at Saved, two released writes commit before restoration passes. Exact assertions retained; application/store unchanged. Corrected metadata-only caveat in baseline/final receipts preserves original results. Cross-tab Resume original2/2passes locally, so its hosted post-dispatch timeout remains unexplained. Only second click now opts out of automatic post-click navigation waiting, retaining lock-error/second0/provider assertions and adding first1/unchangedURL/same-document checks. An intermediate event-count assertion failed3/3 on two same-URL frame events per run (event type unclassified); replaced with actual document identity, not ignored events. Final patched3/3PASS,0retry/skip; canceled-click/disabled-lock controls fail original contention-text check, and same-URL reload passes business/URL assertions then correctly fails the old document handle. CI32shards keeps every224case, seven per runner, same15-minute cap/worker1/retry1; final-source actual discovery PASS224unique/32x7/noomissionsorduplicates,36commands exit0. Freshcheck:codex26/26PASS. Main merge HOLD until exact-head fullCI and final independent evidence review.

Current authorization: fix CI and verify database for a main-ready Companion candidate. User separately approved exact b3d564... additive RPC migration; applied successfully to GRIFON AI. Main merge, other production mutations, deployment, invitations and paid generation remain separate. PR172 merged into codex/companion-chat at889c0e1d.
Branch codex/companion-main-readiness; checkout C:/Users/ADMIN/.codex/worktrees/4b8d/grifon-command. Chat889c0e1d integrated with main4b36c62b atf2568ad2. Draft PR177 https://github.com/yopiheart/grifon-command/pull/177 targets main; existing CI runs without widening triggers. First database job rejected Docker bridge address; fd63fdd7 runs verifier inside service with read-only source mount, preserving loopback guards. Cloud database/verify/artifact gates PASS; browser job38121024346 hit its15-minute cap after48/224 unique cases (45 first-pass,2 retry-pass,1 repeated save-status failure).
Combined candidate: build, 1,541 units (32 existing skipped), static gates and 10 affected browser checks PASS. Two original hostname failures reproduced then fixed; full local E2E excluded because it reused another checkout. Playwright now refuses existing servers; full suite required on isolated GitHub CI. Evidence assets/design/companion-beta/qa/main-readiness/.
The repeated stale-tab save-status failure reproduced on the correct local candidate: final save completed5.83s after Enter, beyond the default5s assertion, with two visible SwiftShader avatars3-5fps. No data-loss or duplicate-request defect established. CI has a bounded15s expectation budget (local5s, test60s unchanged). Same two cases PASS6/6 across3 repeats, zero retries/skips, original copy/reload and1/0 image-call assertions intact. All224cases now split across8 one-worker runners with the same15-minute cap/fail-fast false after4shards proved insufficient; all assertions remain. Control check26/26 PASS. Branch-protection/effective-rule APIs return403 feature-upgrade required; no repository rules changed.
Integrated b60c4451 CI38123364739: build/static/artifact/nativeDB PASS;1,572units/32existing skips. Shard4 PASS56/56; shards1-3 hit15-minute cap after persistent failures. Of224planned cases,154 reported results:134first-pass,4retry-pass,14persistent failures,2unresolved retries;70unreported. Full completion NOT established. Sourcepartition is contiguous, leaving all34account cases together with4shards;8shards28each now pending. Sanitized complete-run summary: qa/main-readiness/ci-four-shard-summary.json.
Harness fixes preserve app/runtime/paid behavior: await accepted intake and async save/action callbacks; install typing clock before navigation with a safe future pause, retain499/600ms boundaries without stepping every avatar frame; poll actual pointer response with original0.1delta; observe real CSS opacity transition and interpolation instead of missing its200ms fade under slow RAF, allow only0.02px position quantization. Focused smoke PASS15/15,0retry/skip,184.911s,455watched source hashes unchanged. Full3spec run41PASS/2FAIL of43,0retry/skip,7.7min; all13startup casesPASS. The two failures navigate before the final photo/accepted-answer write is acknowledged; default Playwright beforeunload handling proceeds. Save-footer waits added before those navigations; photo/answer/question restoration assertions retained. Account-switch test also awaits new shell before Settings; stale-plan assertions unchanged. Final affected verification PASS12/12 (four cases x3),78.078s,0retry/skip,455frozen hashes unchanged; all12 served App identity verified. Startup negative controls correctly FAIL on missing transition and0.125px drift, after real coloredpixels PASS. Independent source follow-up and receipt binding PASS; ci-harness-binding.json records current source/config/harness hashes and instrumentation limits. Evidence ci-harness-{focused-result,full-before-save-waits,save-account-result}.json and ci-startup-negative-controls.json. Control check26/26 PASS after edits. Exact-head8shard CI required next. VercelREADYexactb60candidate; anonymousGET302toSSO blocks hosted render verification, not an observed app defect. Main merge still separate.
Latest exact-head ad20cd62 CI38126267694 is RED/incomplete: verify1,572PASS/32existing skips, nativeDB24PASS, artifactsPASS, VercelSUCCESS; shards1/5/6/7/8SUCCESS,2FAILURE,3/4jobcap. Of224cases,199reported:186first-pass,3retry-pass,10persistent failures,25unreported;212attempts/13retries/0observed skips. Evidence ci-eight-shard-summary.json. Retry traces show20-32sequential UI calls with successful4-10s operations then a pending operation at60s; no completed40s call, CPU/GPU cause unproven and first-attempt viewport stall untraced. Newchat separately hit its3s click cap. Startup retry errors exactly match unpublished hidden overlay defaults; pending verifier captures actual reservation before visibility publication and compares immediately afterward, preserving0.02px/exact dimensions. All13startup+delayed-publication controlPASS; missingtransition/overlaydrift/reservationdrift correctlyFAIL. Independent source reviewPASS. Evidence ci-retry-trace-timings.json and ci-startup-publication-result.json. Local unchanged corejourneyPASS3/3 at33-39s; fullChromium mode cannot launch (spawn UNKNOWN), so no performance comparison or browser change. Evidence ci-browser-channel-result.json.
Pending calibration keeps default browser, all224cases, one worker/retry1 and15-minute job cap;16shards14each, CI wholejourney180s/local60, ordinary CI actions15s/localunchanged, expectations15s/5s unchanged. Newchat remains exactlyone click with CI15s/local3s; no extra save prerequisite. Not every protocol operation supports the action budget, so full exact-head CI must still resolve remaining stalls. Independent source/discovery reviewPASS; actual224unique/16x14/zeroomissionsorduplicates. NewchatPASS3/3,0retry/skip; blockednavigation control correctlyFAIL at15s unchanged chat-ID predicate. Freshcheck:codex26/26PASS and authored diffcheckPASS. Evidence ci-sixteen-partition-result.json and ci-navigation-budget-result.json. Commit/push next, then exact-head fullCI required. Main merge HOLD; hosted authenticated render still NOTRUN (CUA unavailable), phones/livequality/testers/support separate.

GRIFON AI PostgreSQL17.6: approved consume_finished_ad migration20261011072946 installed, exact body MD5/SHA+postgres owner/service-onlyACL verified; RLS unchanged. REST anonymous all-null probe401/42501 proves cache resolution+denial; RO service-role all-null call reaches input guard. No real debit/provider calls or existing-user-row writes. Evidence qa/main-readiness/database-rollout/target-result.json. PR177 Vercel PASS supersedes older account block.
Native PostgreSQL17.6 PASS: four original double-charge rejections, 12 observed separate-session lock cases, replay/rollback/permissions. CI PostgreSQL17.11 also PASS24checks. Owned local test server stopped; DB/roles cleaned, runtime files excluded. Independent source/rollout review PASS/no open P1/P2. Exact SQL b3d564f25522c9d25d1ca8b8b66ec37dc15cb907953389d01612722a5269ee89 preserved; separately rehearsed row preservation, duplicate refusal and failed-postcondition rollback.
Main PR175 presentation and PR171 evidence prompt are retained exactly from4b36c62b, including approved MARKETMIND_SYSTEM_INSTRUCTION (proposal SHA d65482ca98b901a26784b89fcc9605a25c40c88c7b01ba7d74cbdd4e1a4ada85). No new tuned diff. Live-test-spec US$15 remains unapproved; phones/live output/testers/support remain release gates.
Material Trial v01 preferred neutral cream finish safely committed e2580bfb on separate branch codex/griffin-material-study, draftPR169 https://github.com/yopiheart/grifon-command/pull/169. Saved anchors/recipe there; v05 identity/groom/live mascot unchanged; unrelated local3d-lab files excluded here.


Latest main e6e083bf integrated after motion PR165/166/170 landed; remote main unchanged on fresh check. No application/prompt/dependency/E2E source changed upstream; CI retains all3 existing PR targets. New motion unit suites and byte-stability attributes inherited exactly. Full integrated CI still blocked as recorded above. Initial checkout ran out of C: space; own stoppedPG/runtime/downloads and only merge-created partial checkout files moved to F:/GrifonLocalArchives/companion-main-readiness-runtime-20261011. Test evidence retained; no unrelated state removed.

## Motion film / PR156
Own checkout: C:/Users/ADMIN/Desktop/grifon-command/.tmp/worktrees/grifon-motion-depth.
Branch codex/grifon-motion-depth; https://github.com/yopiheart/grifon-command/pull/156.
Accepted baseline backed up at ead3abe9. Main reconciled at29feca9c; only NOW.md
conflicted. Independent Codex review clear after completed-VO replay fix;
qa/merge-review.md has original-fail/fix-pass evidence. Final CI still required.
No paid work, application feature or commercial publication in this scope.

Neil accepted the 32.9s film and delegated sound choices; do not ask him to pick
A-D or individual sounds again. Positive-only prompts; preserve existing Aira take.
Accepted file: workflows/assets/grifon-motion-upgrade/
grifon-full-upgrade-elevenlabs-sfx-review-1080p.mp4, SHA
9529b122fe4ba99555bdf91fa441bc2eb8d5421de22d611524c35593ce907e3c.
approval.json binds exact user acceptance. 987 frames,1080p30,stereo AAC48k.
Nine native sources/51 cues; all15 mixer gates PASS; -16.02LUFS/-1.36dBTP.
Protected H264/music/VO unchanged; old SFX excluded; silent black tail preserved.
selected-review-manifest.json and qa/replacement-report.json hold actual evidence.
User acceptance is separate from independent hearing; historical technical report
remains AUDITORY_QA_PENDING. Do not relabel waveform measurements as listening.
Sources predate paid subscription and remain private-review-only. Commercial use
requires cleared sources. No new ElevenLabs generations were made for replacement.

Frozen local stems: .tmp/grifon-english-vo-v02/music-ducked.wav SHA
115b8f535a2d51ea9db4114d4a9fcac3fe738f157cf9e32bb7068ed10c5c28fa;
voice-positioned.wav SHA
54bcb035d532ef4c9f42a3a4ef9a6321af5382d75a2c4663a963dd8bc36934f7.
Fixed stem gain1.0752266011723428. Old masters/pilot forbidden as mix inputs.
One Aira/v4 generation approval consumed; never regenerate from that approval.
Historical generator now refuses --generate before credential/network access.

## Recovery and future audio plan
workflows/grifon_motion_production.md preserves exact recipe and reuse method.
workflows/grifon_motion_audio_api.md records future API proposal: one SFX candidate
first, agent-owned placement, dedicated music and bounded approved retries.
User fast-v4 preference maps to official eleven_v4_turbo; not active app change.
Installed Motion Director skill/provider prompts unchanged; customer UI unbuilt.
PRIMARY/.tools/grifon-motion-archives/approved-2026-10-04-9529b122.zip preserves
42 checkpoint files including exact stems;41,677,659bytes. Tracked receipt:
workflows/assets/grifon-motion-upgrade/qa/approved-archive.json.
Archive/hash/CRC/all entries verified; missing receipt failed before creation.
Local recovery is not off-device backup; later API design is versioned in Git.

## Gemini accounting - preserve, no retries
Original spec SHA26eb8ef67ced35afc04f958705859da04f8f6b96c3eba24b5cd47ca00bfe4807.
Revised SHA c7f9c8f0eac1ece2585ae031c4005657184467d397c208ee27a6cf7d108affeb.
Approved LOW + one manual repeat;14 comparisons TOTAL,US$0.50/250credits caps.
Canonical ledger PRIMARY/.tmp/grifon-elevenlabs-assessment/<originalSHA>/.
Pencil4 valid; card-pop truncated; manual repeat06:36UTC October4 failed with
unknown usage/result. Three invocations reserveUS$0.09216; known usage-derived
US$0.039258 plus unknown third; billing debit unverified. No reset/retry.
Default project logging disabled; BUSINESS USE access auto-review rejected.
User billing concern is not verified cause. Do not bypass project-access gate.

## Other session: Vivo/Blender work preserved from main
PR157: https://github.com/yopiheart/grifon-command/pull/157.
Checkout C:/Users/ADMIN/.codex/worktrees/976d/grifon-command; branch
codex/blender-product-reveal. Its merge was authorized; check remote status.
Detailed prior state remains in main's pre-reconciliation NOW.md history and
assets/vivo-x80-ugc, assets/blender-reveal evidence; no files changed here.
Vivo task cgt-20261004021141-cgh8r succeeded ONCE; NEVER execute again.
Fixed tools/run_vivo_x80_ugc.mjs, separate Vivo spec/ledger; recovery GET-only.
Raw361frames/15.041667s/496x864/native audio; comparison360frames/15s.
ONE paid POST/private upload; exact owned-key cleanup confirmed.301738tokens
estimate$1.2974734; invoice unknown. No new provider authorization in this task.
Runner SHA c9148596585e1a8af041c82ea47d471bb795b07fbb4f513db461acd9c0b8f109.
Private raw: https://drive.google.com/file/d/1z_EscTYdF8j_DJbGPKjpGFoytlonoqBT/view
Private comparison: https://drive.google.com/file/d/15SvnmpFV0Fgu_OK1WgsUf-fswByj3HAx/view
V1/V2 preserved; continuous listening/native phone remain unverified.
Bottle task cgt-20261003202712-nlxv7 also exhausted; NEVER --execute again.
Ledger .tmp/byteplus-motion-transfer/attempt.json; GET-only recovery.
Bottle estimate$0.5200678; invoice unknown; identity PARTIAL. No new model trial.
Main carried build/1432 unit/26 control/29 Vivo/25 bottle checks and independent
review; these are historical evidence, not rerun by this motion task.
PR158 prompt-parity guard merged; never authorizes changing tuned content.
Vivo proof accepted9/10; priorities assets/vivo-x80-ugc/user-review.json.
Local-preview/automatic-trigger tests unrun; generic engine/Grifon UI unbuilt.
Primary Oceanides work untouched. Preserve native scene audio on integration.

## Latest main motion-stack receipts

PR165 merged73c3ea2a; PR166 merged1f43eeaf; PR170 verified MERGED2026-10-11T07:48:03Z at e6e083bf3c880cfcab4e908d320d9d5f83fabaa0. These are inherited completed tasks, not Companion merge authorization.

## Protected delivery
Accepted film: workflows/assets/grifon-shader-recreation/grifon-recreation-landscape-sound-v1.mp4
SHA256: f92ac352000e0103c3271a16c190241dde80b8bc53e906a02f0ea913be3a53df
Accepted player: artifacts/grifon-shader-sound-v1.html
SHA256: 550986f8e81c77cb45cd8825f0e5844b1feb7042e11f291cca8b465a867f8b2a
All films, players, sources, fonts, captures, licenses, audio recipe and three
required posters remain exact. All 79 original reusable workflow files except
NOW remain identical to 60c10376. No picture or soundtrack edit or new render.
Historical source/evidence bindings remain frozen.

## PR166 archive and recovery
Original checkpoint: 118a5e8aac30739b2705489077ad862b671dbfd4.
Exactly 762 historical QA binaries / 917,501,853 bytes were archived and removed.
Both shader asset folders contain ARCHIVED_MEDIA.md and qa-media-archive.json.
All entries independently match original Git blobs, sizes and SHA256; actual
first, last and raw recovery samples passed. All 625 retained nonmetadata
original PR166 delivery inputs remain exact.
PR166 reviewed package: 229,657,756 bytes versus 1,146,939,394 originally (~80% less).
Ordinary Git history still contains old blobs; historical clone size is unchanged.
Archive: F:/GrifonLocalArchives/pr166-media-archive/118a5e8a-qa-media.tar
918,128,640 bytes; SHA256 12e3895e0bc1590205e315163c64297142bd4f740371f1c5b1d1cecacfae546d
F: is local to this machine, not an off-device backup. Initial C: ENOSPC was
resolved by scoped archive/pruning. Avoid regenerating the old QA set on C:.
A clean staged-tree export reproduced all three finished players exactly with
only the three QA posters and no archived inputs. Historical image-dependent
runners require restoring their listed archived inputs before rerunning.

## Verification and limits
Independent CI, archive, propagation and landing-tree reviews passed.
Historical readiness against main 4b36c62b passed build, 1,475 tests / 32 existing
default skips, Codex 26 checks, bundle leak, voice sync, evaluation prompt parity,
domain, PowerShell ASCII, artifact anchors and design lint. Paid/live flags unset.
Logs: .tmp/merge-ready-verification/main-4b36c62b-20261011/.
Both templates initialized/validated; 21 copied inputs exact, all 24 declared
inputs tracked, with zero archived QA dependencies. Historical 35 media / 28
browser checks remain source-bound. No fresh full 932-frame capture was run.
CI covers main and both original stack bases, with job bodies and
existing paid/live defaults unchanged. Legacy Claude review remains opt-in.
Canonical upstream prompt blob d0998f1931c6cbfd7b4aae68517ff582435fa003 is inherited
verbatim; zero task-authored tuned diff. Upstream product changes are preserved.
Librarian sweeps judge broad-token hits; no other task-related living-doc status
required changes. Motion guide limits and the unapplied skill proposal remain true.
Universal reference coverage, auditory scoring and customer turnaround are not
established. Both approved autopsies are consumed; estimate US$0.06987, invoice
unverified. Existing rights, protected stems, recovery ZIPs, paid caps and
unrelated Oceanides/Vivo work remain untouched.
