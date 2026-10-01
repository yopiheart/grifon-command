# NOW - the resume doc
**Stamped: 2026-10-01, Oceanides logo refresh and company-profile discovery**

## Current work
Branch: `codex/oceanides-latest-logo`, based on `origin/main` (`5d1b583c`).
Draft PR151: https://github.com/yopiheart/grifon-command/pull/151.
Implementation `63060f33` pushed; independent verification passed.
Neil approved replacing the active Oceanides logo with the exact JPG attached in
this chat and deleting superseded standalone logo files. No deployment requested.

## Logo changes
- `clients/oceanides/assets/logo.jpg` exactly matches the approved attachment
  (SHA256 `29a508670644d8e113b36f3b599f58e69c5697cc91df86e98a455a48a90e9bdf`).
- Replaced both Oceanides funnels' `public/img/logo.webp` with 320px optimized
  derivatives (24,150 bytes each). Existing references remain valid.
- Removed superseded `clients/oceanides/Oceanides New logo.png`.
- Both asset recipes preserve the complete square image; hero/footer no longer
  apply the old circle crop, amber outline, or paper backing.
- Client DESIGN.md records the canonical source. Historical rendered creatives
  and unrelated Grifon logos were not changed.

## Verification
- Root `npm.cmd run build`: PASS (existing chunk-size warning).
- Root `npm.cmd run test`: PASS, 113 files / 1,401 tests; 32 opt-in tests skipped.
- Bundle-leak, voice-sync, domain-language, PowerShell ASCII, artifact-anchor:
  PASS. Asset-builder syntax and `git diff --check`: PASS.
- Both funnel builds (including voice/layout gates): PASS.
- Independent brand review: BRAND_PASS, 0 critical / 0 nits, 44/50.
- Both funnels: hero/footer PASS at 375x667 and 1280x900. No crop,
  distortion, overflow, or browser errors. Evidence: `.tmp/oceanides-logo/`.
- Logs: `.tmp/oceanides-logo-root-build.log`, `.tmp/oceanides-logo-root-test.log`.
- No paid/live generation, production data change, merge, or deployment.

## Company profile: references first, interview afterward
Neil wants an Oceanides company profile but explicitly wants to inspect reference
brochures first, then use `.agents/skills/grill-me/SKILL.md` one question at a time.
New services will be added: do not lock the profile to existing pest control,
siphoning, declogging, and plumbing. Clarify service readiness, audience, purpose,
evidence, scope, and format in the later interview before creating the profile.
Neil selected Metro Rod for its branding system and premium presentation;
wants AAA quality adapted to Oceanides and suited to its target clients.
Official reference PDFs were shared in chat: Metro Rod Services Explained
(closest service fit), Rentokil Specialist Hygiene Overview, and Veolia Corporate
Brochure (older edition, structural inspiration only). No profile drafted yet.

## Other ongoing work retained
Recovery tooling draft PR150 targets PR146's `codex/oneshot-recovery` branch;
its detailed verified state remains in that branch's NOW.md. Neither is merged.
Motion work PR143 -> PR144 -> PR149 remains on its branches.
Untracked remote attachments and reference/media directories were not staged.
