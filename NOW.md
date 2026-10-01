# NOW - the resume doc
**Stamped: 2026-10-01, Oceanides minimal profile revision complete**

## Current work
Branch: `codex/oceanides-company-profile`, based on `codex/oceanides-latest-logo`
at `7a374c27`. Profile draft PR152 (stacked on PR151):
https://github.com/yopiheart/grifon-command/pull/152.
Initial implementation `57ace2d3` rejected by Neil as visually generic;
redesigned profile now replaces its outputs. No merge or deployment.
Logo draft PR151: https://github.com/yopiheart/grifon-command/pull/151.
Logo implementation `63060f33` pushed; independent verification passed.
No deployment or merge requested.

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

## Company profile
Neil requested an Apple/OpenAI-inspired minimal redesign after reviewing the
Metro Rod version. Six A4 portrait pages for management and procurement.
Current outputs in clients/oceanides/company-profile/output/:
- pdf/Oceanides-Company-Profile-Minimal-Final.pdf
- pptx/Oceanides-Company-Profile-Minimal-Final.pptx
Earlier output filenames are superseded; preserved as version history.
Warm-white, ink/navy, Arial regular/bold, sentence-case titles and flat service
rows. Client DESIGN.md has a profile-only exception; other surfaces unchanged.
Actual Apple report pages inspected and OpenAI public guidance read; recorded in
workflows/design_swipe_file.md D18. No proprietary font or third-party logo used.
New architectural cover generated and corrected once to remove a duplicate toilet.
Four visible AI disclosures; actual same-site siphoning proof remains separate.
Exact prompts and provenance: assets/generated-sources.json.
Services: siphoning, plumbing/declogging, renovation/restoration, ceiling repairs,
pipe/roof leaks, waterproofing, house cleaning and pest control. Oceanides coordinates
through turnover, including specialist contractors. No unsupported treatment-system,
license, accreditation, equipment ownership, project-count or guarantee claim.
Contacts: 0917 671 6383 (Globe), marketing@oceanidessepticandpest.com;
Tramo Street Corner Dandan, Pasay City, Philippines 1300.
CTA: site assessment and written quotation; receive procurement requirements.
Verification: six PDF and PPTX pages; 100 exact native text runs match the shared
layout, every PDF line extracts, contacts match, old phone/Gmail absent, all four
AI disclosures present. Package, geometry, font policy, import and final hash PASS.
All page renders inspected. Independent critic found no must-fix export issue;
optional remaining preference is greater emphasis on actual proof on page 3.
Final cover correction inspected; short heading periods removed.
Native PowerPoint itself untested; use PDF for fixed printing. User aesthetic
review pending. No quality score or AAA claim. Artifact-only work, no app tests
repeated. Evidence: .tmp/oceanides-profile/. No merge or deployment.

## Other ongoing work retained
Recovery tooling draft PR150 targets PR146's `codex/oneshot-recovery` branch;
its detailed verified state remains in that branch's NOW.md. Neither is merged.
Motion work PR143 -> PR144 -> PR149 remains on its branches.
Untracked remote attachments and reference/media directories were not staged.

## Recovery preview follow-up - 2026-10-01
Neil authorized a PR146 Preview retry only; no production deploy or merge.
Remote `codex/oneshot-recovery` head is `39a30613` (empty retry commit;
same tree as `485708c4`, zero changed files). Vercel SUCCESS at 12:24 UTC.
Preview deployment ID `6784136645`; Vercel inspector:
https://vercel.com/neilmaglayabusiness22-2085s-projects/grifon-command/4Su52fj6aZnPDfbFViYytqtP9C45
Preview HTTP redirects to Vercel SSO; authenticated app smoke remains pending.
After Neil confirmed successful GitHub payment, closed/reopened draft PR146
to trigger CI on the unchanged `39a30613` head (old startup runs cannot retry).
Fresh CI run `36863242626`: SUCCESS at 12:46 UTC; verify, e2e, artifacts PASS.
Legacy opt-in review and push-only main-status skipped as configured.
Vercel remains SUCCESS; GitHub checks now start and complete normally.
Earlier startup-failure emails remain historical. No merge or production deploy.
Next: release review for PR146; PR150 still needs main-target CI after PR146 lands.
