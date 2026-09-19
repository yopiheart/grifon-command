# NOW - the resume doc
**Stamped: 2026-09-19, Grifon agent and customer workflow diagrams**

## Current state
Branch: `codex/grifon-agent-maps`, based on main `5d1b583c`.
Neil requested accurate, shareable diagrams for his internal agent setup and the
customer workflow, suitable for future investor/client conversations.
Artifact-only work; no product code, prompts, models or infrastructure changed.
Draft PR: pending creation after final visual verification.

## Deliverables
- `artifacts/grifon-agent-maps.html`: self-contained interactive viewer, founder
  and customer tabs, clickable stages/source notes, SVG and 3200px PNG downloads.
- `artifacts/grifon-team-map.svg`: internal development workflow.
- `artifacts/grifon-product-map.svg`: default One-Shot plus separate opt-in Producer.
- Committed data, template and deterministic builder under `tools/artifacts/`.
  Regenerate with `node tools/artifacts/build-grifon-agent-maps.mjs`.
- English presentation copy, Grifon NOIR styling, no external font/asset dependencies.

## Accuracy boundaries
These are dated codebase/workflow diagrams, not live deployment certification.
Developer agents and skills are distinct from customer runtime service calls.
The default One-Shot produces an ad plan, then the customer opens video generation.
Producer remains opt-in and parks at storyboard and First Cut review gates.
Browser-independent end-to-end production with out-of-app completion notification
is proposed future work. Already submitted jobs can continue, but the browser
currently drives stage sequencing. Internal agents are task-driven on the desktop.
Source links use baseline revision `5d1b583c`; PR146 is explicitly labeled unshipped.
No publication, campaign actions, paid generation, merge or deployment performed.

## Checks
- Builder and data JavaScript syntax checks passed.
- Three generated outputs rebuilt byte-for-byte identically.
- Existing artifact-anchor check passed.
- Independent source audit completed; corrected language intake and qualified
  the future notification as out-of-app, since in-app notifications already exist.
- Independent browser smoke: 248 checks passed across 390x844, 375x667 and 1280x900. All 19 nodes, keyboard tabs, offline behavior and exports verified.
- Independent brand review: BRAND_PASS, 45/50, zero critical issues or nits. SVGs and 200% details visually inspected. Real Android WebView not tested.

## Recovery release still pending
PR146: https://github.com/yopiheart/grifon-command/pull/146
Branch `codex/oneshot-recovery`, head `485708c4`; not merged or deployed.
Local verification: 74 browser tests, 1404 unit tests and build passed.
GitHub verify/e2e/artifacts all passed, checked on 2026-09-19.
Vercel integration says Account is blocked; Neil reported an overdue bill.
The exact billing cause was not independently inspected. Neil handles payment.
The one-shot-recovery-follow-up heartbeat is paused after final CI notification.

## Next action
Diagram verification is complete. Commit/push artifacts and open a draft PR.
Release recovery only after hosting is unblocked and Neil authorizes merge/deploy.
Background production remains a separate proposed project, not approved implementation.
