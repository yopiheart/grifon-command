# NOW - the resume doc
**Stamped: 2026-10-15; first reference UGC draft built with free fixtures**

## Active task and boundary
Checkout: F:/CodexWorktrees/61f5/grifon-command.
Branch: codex/ugc-reference-draft; base codex/creative-library-ugc-plan at 26411270.
Neil authorized the first build using test fixtures: save/reopen brief, photos,
reference and selected voice, with no paid generation. Scope is the same-device
part of S0, explicitly disclosed in the UI. This does not complete cloud S0.
No prompt/model/provider changes, paid calls, production data edits or deployment.

## Implemented
- Fresh Companion chats offer Reference brief; started legacy chats/runs retain
  their current flow. Saved reference drafts reopen in the new form.
- Optional versioned referenceDraft on CompanionConversation holds brief/brand/
  audience/offer/CTA/instructions, reference language and output language.
- One local video (100 MB, up to 3 minutes) and up to five role-labelled photos
  (10 MB each), decoded locally and retained as Blobs in account-scoped IndexedDB.
  Object URLs are temporary previews, not persisted file identities.
- Optional HTTPS link saved as text, never fetched or analyzed. Reference
  language can differ from output language; Taglish is the draft default.
- One curated/private saved voice selection. Missing/offline voice lists retain
  the selected ID/name. Production uses existing read-only voice listing;
  fixture tests inject simulated voices. No cloning, speech or video generation.
- Existing save/revision/conflict-copy flow preserves media and voice; queued
  superseded writes coalesce. Pending media blocks navigation and warns on unload.
- Same browser/device only. Clearing browser data removes drafts/files; users
  must keep originals. Account scoping is not cross-device cloud storage.

## Verification and review
Final build PASS; full Vitest PASS: 1,621 passed, 32 existing gated skips.
Focused local-domain tests PASS: 7/7. Reference browser suite PASS: 8/8.
Negative baseline: same 375px contract fails against the original HEAD surface
because Reference brief is absent; same current-source test passes.
Legacy Companion chat/continuity regression PASS: 24/24, fixture-backed.
Bundle-leak, voice-sync, eval-prompts, domain, PS1 ASCII, artifact anchors PASS.
Independent adversarial review found pending-decode navigation loss; fixed and
re-reviewed with no remaining actionable correctness findings.
Independent smoke PASS at 375x667 and 1280x900, including voice-list outage,
media reload, keyboard upload, 44px targets and no generation/API calls.
Brand PASS_WITH_NITS, 41/50, zero critical; nonblocking caution-icon styling nit.
Evidence is local-only under .tmp/reference-critic/, .tmp/companion-reference-*,
.tmp/reference-baseline-results/ and .tmp/ugc-reference-*. No secrets in artifacts.

## Delivery and reproduction
Planning draft PR: https://github.com/yopiheart/grifon-command/pull/188.
Implementation draft PR lookup:
gh pr view codex/ugc-reference-draft --repo yopiheart/grifon-command
Implementation PR stacks on the planning branch; do not merge/deploy without Neil.
Free fixture commands and limits are documented in
workflows/ugc_reference_implementation_plan.md, First build boundary section.
Fixture URL: http://localhost:5173/companion-chat-preview.html.
Safe server: node tools/verify-recovery-server.mjs (no environment-file loading or
live API middleware). New config: tests/e2e/companion-reference.config.ts.
Missing checkout dependencies were installed with npm.cmd ci; lockfile unchanged.
Do not repeat setup unless a needed dependency is missing.

## Next action
Neil is gathering three UGC references and real brand assets. Accept references
in any language; later planning adapts brand messaging and checks dialogue timing.
Remaining S0: cloud-owned assets and cross-device persistence, reference analysis/
Recipe selection, voice-upload workflow. S1 adds direction/script/visual-plan/cost
review using a fake planner before any paid pilot. Exact tuned diffs and paid
test spec inputs, pass/fail criteria and maximum cost still require approval.
Roadmap: workflows/creative_library_roadmap.md. Full S0-S6 plan:
workflows/ugc_reference_implementation_plan.md. Old presets/accepted work intact.

## Preserved prior delivery
PR184 CI and PR186 recovery fixes are in the base; PR188 saves the larger roadmap.
Known recovery limits: workflows/recovery-feature-map.md. Existing checkpoints
are not a provider-spend cap or a durable background execution system.
Accepted film: workflows/assets/grifon-orbital-music-v2_5/grifon-orbital-launch-music-v2_5-v2.mp4.
SHA256 4040ba1763aeb415b8d79a3b9d914959149b11fc89eed52489652da0e69d6405.
Accepted film, score and picture sources untouched. Prior paid approvals consumed.
