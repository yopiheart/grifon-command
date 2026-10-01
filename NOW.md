# NOW - the resume doc
**Stamped: 2026-10-01, Oceanides profile rebuilt with custom illustrative assets**

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
Neil completed the grill-me interview and authorized production. Metro Rod is
the selected reference; the result uses Oceanides navy/amber/paper identity.
Neil rejected the first design: token compliance was not reference fidelity.
Reopened the actual Metro Rod PDF and rendered its cover/service pages locally.
Rebuild uses photo mastheads, angled title plates, service bands and branded
contact strips. Cap: two design passes; both concrete review findings corrected.
Six A4 portrait pages for an in-person management/procurement meeting.
Outputs under `clients/oceanides/company-profile/output/`: printable PDF and
native editable PPTX (`Oceanides-Company-Profile-final.pptx`). Current PDF is
`Oceanides-Company-Profile-2026.pdf`; the unsuffixed PDF is superseded (open-file
lock prevented replacement). JSON content and
Python/JS builders plus a PowerShell rebuild entrypoint are saved alongside.
Service groups: siphoning; plumbing/declogging; house/condo renovation and
restoration (ceiling, pipe/roof leaks, waterproofing, house cleaning); pest control.
Oceanides is the client contact through turnover, including specialist-contractor
coordination. CTA: site assessment and quotation; request accreditation requirements.
Contacts confirmed by Neil and screenshot 1000040025.jpg: 0917 671 6383 (Globe),
marketing@oceanidessepticandpest.com; Tramo Street Corner Dandan, Pasay City 1300.
The old phone/Gmail were not used in this profile. Existing funnels unchanged.
No confirmed provider/specs for future treatment system: excluded. No invented
registration numbers, licenses, accreditation, equipment ownership or guarantees.
Approved logo, actual vehicle image and one confirmed same-site before/after pair used.
Neil authorized custom asset generation. Four native generated illustrations:
conceptual property cutaway cover, plumbing, ceiling repair and pest treatment.
Each is visibly labeled AI-generated; fictional workers are not employee/project
evidence. Exact prompts and use boundaries: assets/generated-sources.json.
Prior stock assets remain recorded in sources.json but are not used in current outputs.
Checks: six PDF pages; every layout text line extracts; contacts match; old
contacts absent. PPTX package, geometry, heading/font policy and final import PASS.
All twelve refreshed PDF/PPTX renders inspected; independent critic opened actual
reference pages. Ceiling-tool crop and obscured pest-treatment target corrected
and rechecked. No remaining must-fix layout or claim defect reported.
111 native text runs match layout per slide; six PDF pages extract every expected
line, contacts and illustration disclosures match, notes record provenance.
Package/geometry/font checks and final import pass. PPTX encodes approved Arial
Narrow, but the portable renderer substitutes a broader display face; native
PowerPoint remains unverified. Use the fixed PDF for printing.
Remaining visual gap: fewer actual crew-at-work photos than the reference. No
generated illustration is presented as project proof. User aesthetic review pending;
no AAA claim. Builders now revision both PDF and PPTX to avoid open-file locks.
Evidence stays in
`.tmp/oceanides-profile/`. Artifact-only change; application tests not repeated.

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
