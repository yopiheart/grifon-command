# Workflow instruction cleanup proposal and Jev evaluation

Date: 2026-09-17. Base: `ee9ad8d123e81f19f74dcd92296ff4d4c4361bc9` (merged prompt-quality PR #139).
Status: exact candidate prepared and reviewed; active instructions are unchanged.
GitHub review package: [draft PR #141](https://github.com/yopiheart/grifon-command/pull/141).
This report records evidence, not additional standing instructions.

## Decision requested

Approve these exact patches in order: [cleanup.patch](proposals/workflow-instructions-2026-09-17/cleanup.patch), then [personal-desktop.patch](proposals/workflow-instructions-2026-09-17/personal-desktop.patch).
SHA-256: `88f6e26ed663ee6f21fccc99e5e658a79a650c16ec2d120721383cc847c5fde4`.
The first changes 11 instruction files with 32 insertions and 15 deletions, grouped into the four requested improvements. The second implements Neil's subsequent personal-desktop clarification (details below).
AGENTS.md requires approval of the specific instruction diff. Approval of the cleanup topic authorized preparing and checking this candidate, not silently changing live instructions.

## What the candidate changes

1. Shortens eight discovery descriptions: CMO, Creative Director, artifact-noir, static-autopsy, viral-autopsy, skill-creator, verify-changes, and codex-executor. The local skill-creator's instruction to write pushy, broad descriptions is also replaced with task-specific discovery guidance. Detailed creative workflows remain in their existing bodies.
2. Replaces surgical-edit's roughly 30-line pause with a scope/approval-boundary check. Necessary work may continue within the user's authorization, regardless of line count. Unrelated work still needs authorization.
3. Replaces verify-changes' reasoning-keyword check with observable diff, approval, test, and review evidence. The actual build, test, smoke, and independent-review requirements remain.
4. Clarifies that WAT scanner triage is not independent code review, corrects codex-executor's reviewer routing, and adds a Codex entry point before the preserved legacy PR-review procedure. Legacy tool names and CI assumptions no longer purport to configure Codex; external comments still require user authorization.

The eight descriptions total 4,441 characters before and 1,500 after (66.2% fewer). This is character count for these entries only, not a tokenizer measurement, whole-context reduction, or measured latency improvement. Other project/plugin skills are outside this first slice.

### Exact description scope

| Skill | Before characters | Candidate characters |
|---|---:|---:|
| grifon-cmo | 609 | 241 |
| grifon-creative-director | 616 | 212 |
| artifact-noir | 690 | 179 |
| static-autopsy | 745 | 185 |
| viral-autopsy | 677 | 198 |
| skill-creator | 319 | 115 |
| verify-changes | 259 | 203 |
| codex-executor | 526 | 167 |

## Verification and limits

- `git apply --check workflows/proposals/workflow-instructions-2026-09-17/cleanup.patch`: passes against the current base. The patch has not been applied to active instructions.
- `npm.cmd run check:codex`: passes, 31 active skill entrypoints, zero reported errors, 26 tests passed. This checks the unchanged active controls and test harness, not behavioral performance of the candidate.
- Candidate frontmatter: all nine affected skill files parse as YAML; names and all non-description metadata are preserved. The original artifact-noir description contains an unquoted colon that breaks a standard YAML parse; its rewritten candidate parses.
- Bundled `quick_validate.py`: seven candidates pass. Static-autopsy and viral-autopsy fail because the generic validator rejects their existing `disable-model-invocation` property. The same two baseline checks fail with the same property error. No metadata was removed and no validator was weakened. Actual Codex interpretation of that legacy field is not established by these checks.
- Python validation initially lacked PyYAML; PyYAML 6.0.3 was installed only under ignored `.tmp/workflow-cleanup/python-deps`, then validation reran. No repository dependency or global Python package changed.
- Independent semantic review found two initial coverage losses: campaign/creative-strategy evaluation and extraction-only visual-reference analysis. Both were restored. The revised patch has no actionable findings in the [independent review](proposals/workflow-instructions-2026-09-17/review.md).
- Two fresh agents independently answered the same [20 tabletop scenarios](proposals/workflow-instructions-2026-09-17/scenarios.json) using baseline versus candidate instruction packets. Raw [baseline decisions](proposals/workflow-instructions-2026-09-17/baseline-results.md) and [candidate decisions](proposals/workflow-instructions-2026-09-17/candidate-results.md) are retained. These were hypothetical routing/permission exercises, not automatic skill-loading tests or executed product tasks.
- Scenario 14 exhibits the intended difference: baseline pauses for a necessary 45-line fix; candidate proceeds inside scope. Both retain approval boundaries for an unrelated three-line billing fix, a tuned instruction change, replacement paid-test inputs, and merge. Both require missing smoke/independent review even when the builder repeats rule names.
- Scenario 20 shows a remaining ambiguity: both agents infer a Taglish approval pause for a conversational summary. Their packets omitted the full language context, so this is a follow-up hypothesis rather than a demonstrated live defect; no fifth scope expansion was added.
- No application build, full application suite, browser generation, paid run, or Jev request was performed. There are no application source changes. Real task completion time, false-trigger rate, and output quality remain unmeasured.

The first candidate preserves root/scoped AGENTS.md and hook code. Both preserve domain prompts, schemas, model settings, paid specs/caps, secrets protections, identity anchors, invocation metadata, and merge/deployment boundaries. Claude files are retained. This is not a claim that every legacy instruction conflict has been removed.

After exact approval, apply only these ordered patches, rerun the control checks, review the applied diff, and observe representative real tasks in fresh Codex contexts. The current task's discovered skill catalog may remain stale. Do not infer approval to merge or deploy.

## Personal desktop and mobile remote access

Neil clarified that cafe PCs are retired: work now runs directly on his persistent personal Windows desktop, sometimes through mobile remote access. This is the current user preference for this task even before the repo instructions are updated.

The follow-on [personal-desktop.patch](proposals/workflow-instructions-2026-09-17/personal-desktop.patch) changes 30 files, 144 insertions and 91 deletions. SHA-256: `d329601b1ac71e2a845ddf0c769ea1f58e9a277ef3feffc86221bc3e71bc6763`. Apply after cleanup.patch because several instruction files overlap.

- Makes the existing desktop checkout, dependencies, installed tools, local assets and account sessions the default. Readiness diagnosis and repairs run only when needed. Sparse checkout and portable Python remain optional, not mandatory because of a cafe environment.
- Replaces the cafe-reboot text actually injected by `.codex/hooks/guard.mjs` at SessionStart. Neutralizes missing-tool helper messages and portable-Python-only guidance. The hook's security decisions, counters, expiry and verification behavior are unchanged.
- Updates active skill instructions that demanded immediate commits or repeated restoration because reboot erased files. Evidence and completed work still get reviewed checkpoints and GitHub backup; incomplete drafts can persist locally.
- Marks old cafe-session, session-reminder, cloud-migration and Claude environment guidance as historical. It does not delete existing tools or rewrite their unrelated functionality.
- Removes routine unmetered-video setup advice. Persistent local flags require care: only an approved test that explicitly authorizes unmetered mode may use the existing helper, with prior state restored afterward. No helper was executed and no `.env` was opened or changed.
- Preserves PID-specific helper cleanup, secret protections, paid limits, exact prompt approvals, independent review, and mobile UI verification. Mobile disconnects do not require logout or forced commits; sleep/shutdown/app exit may still stop jobs. No remote-access service, public port, power setting or OS preference was changed.

The [runtime audit](proposals/workflow-instructions-2026-09-17/desktop-runtime-audit.md) found no registered Codex hook that wipes work, forces logout, or bans persistent installs. The asset sweep is registered with `--report`. Inactive legacy shell copies were not mistaken for enforced hooks.

Both patches apply cleanly in an isolated Git index. The proposed hook, registration, readiness module and existing native tests were materialized into an isolated temporary repository. All 16 hook/readiness tests passed, including secrets, exact one-use approval, paid caps, report-only registration, build failure, and the updated startup context. Negative control: the new startup assertion fails against the original hook (exit 1), then passes against the candidate. This proves the local hook behavior under the test harness, not that the running app has trusted and loaded new hook source.

Raw evidence: [candidate runtime tests](proposals/workflow-instructions-2026-09-17/runtime-tests.txt) and [original-hook negative control](proposals/workflow-instructions-2026-09-17/negative-control.txt). Four changed JavaScript modules also pass `node --check`. The applied candidate diff passes `git diff --cached --check` in the isolated index. Checking the patch files themselves as newly added text reports their required blank-context space markers; those are patch syntax, not trailing whitespace introduced into the candidate source. Supporting Markdown/JSON files pass the whitespace check separately.

The [desktop independent review](proposals/workflow-instructions-2026-09-17/desktop-review.md) found no actionable findings. Normal hook-source review/trust remains necessary after application; existing trust state was not inspected or modified. Application build/full tests were not rerun because no application source is changed.

## Jev: evaluation for Grifon

Access: the web fetch of the [original tweet](https://x.com/CompleteSkeptic/status/2099925682726002904) returned 403, but the browser successfully displayed its text and follow-up posts. Embedded video playback was unavailable, so no visual/video-performance claim was verified. The thread links directly to the official release article below.

TypeSafe describes Jev as a decision model rather than a text generator. Its [documentation](https://docs.typesafe.ai/introduction) offers Choice, Score, and Noul questions evaluated against supplied state. This makes it a possible adjunct to Grifon's generation pipeline, not a substitute for writing scripts, creating storyboards, or generating media.

The vendor's [release article](https://typesafe.ai/blog/introducing-system-one-models-and-jev) reports large speed/cost gains but identifies favorable demo inputs, West Coast measurements, and workflow comparisons using other models' reference probabilities. These are vendor results, not measurements on Grifon or ground-truth labels from our users. Its zero-hallucination argument is based on schema matching: a valid enum can still be the wrong classification.

The [confidence documentation](https://docs.typesafe.ai/confidence) explains that Choice/Score confidence is derived from the returned probability distribution; Noul has no separate confidence field. My assessment: confidence is a routing signal, not authorization or proof of correctness. Thresholds require validation on our domain, including ambiguous Taglish examples.

### Project fit

| Grifon use | Assessment |
|---|---|
| Existing Temu and UGC Pro subtype classification | Best candidate for a later comparison. `api/_lib/prompts.ts` already defines narrow enum decisions at lines 311, 324 and 358, with explicit precedence and service restrictions. |
| Flagging possible missing differentiator proof or language violations | Possible advisory triage after labeled examples exist. It must not self-certify subjective creative quality or silently trigger paid retries. |
| Script, storyboard, image, voice, and video creation | Does not match Jev's stated output capability. Keep the existing generation providers. |
| Billing, auth, quota, spend, or publishing authority | Keep deterministic authorization. A high model score must never grant access or approve an operation. |

Recommendation: keep Jev as a research candidate. First establish that classification latency/cost is a meaningful bottleneck. If it is, compare the existing classifier with Jev on fixed, labeled product/service briefs, including ambiguous and mixed-language cases. Measure classification accuracy, precedence violations, abstention/fallback behavior, p50/p95 latency from our execution region, total cost including fallback, and failures/timeouts. Start with offline assessment that cannot alter the live result.

The saved prompt-quality corpus can supply exploratory examples but is not by itself a clean held-out classifier benchmark. Any provider experiment needs a separate exact-input/pass-fail/evidence/max-cost approval; no TypeSafe package, skill, integration, API key, or paid test was added here.

## Source for the instruction cleanup

[OpenAI: Rethinking skills and prompts for GPT-6 Astra](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra) motivates precise triggers, selective instruction loading, revisiting procedural constraints, and explicit completion boundaries. The candidate is a project-specific application of those ideas; no Astra-specific performance claim is assumed to transfer to Gemini.
