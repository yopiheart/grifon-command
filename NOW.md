# NOW - the resume doc
**Stamped: 2026-10-01, Oceanides company profile delivered**

## Current work
Branch: `codex/oceanides-company-profile`, based on `codex/oceanides-latest-logo`
at `7a374c27`. Profile draft PR: pending creation below.
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
Six A4 portrait pages for an in-person management/procurement meeting.
Outputs under `clients/oceanides/company-profile/output/`: printable PDF and
native editable PPTX (`Oceanides-Company-Profile-final.pptx`). JSON content and
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
Approved logo and existing real vehicle/matched before-after photos used.
Checks: six PDF pages; every layout text line extracts; contacts match; old
contacts absent. PPTX package, geometry, heading/font policy and final import PASS.
All twelve PDF/PPTX page renders independently inspected: BRAND_PASS, 43/50,
zero critical/nits. Native PowerPoint execution unverified. Evidence stays in
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
Fresh GitHub Actions runs `36861287393` and `36861293642` failed before jobs
started (`BuildFailed` / `startup_failure`), also seen on unrelated PR151.
Sept 29 GitHub email reports failed card billing; likely relevant, not proven.
Next: resolve GitHub account/Actions blocker, obtain fresh CI, then release review.
PR146's CLEAN merge status omits these startup failures; it is not CI clearance.
