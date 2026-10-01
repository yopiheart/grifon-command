# NOW - the resume doc
**Stamped: 2026-10-01, Oceanides septage offer added to both profile formats**

## Current work
Branch: `codex/oceanides-company-profile`, based on logo branch at `7a374c27`.
Draft PR152: https://github.com/yopiheart/grifon-command/pull/152 (stacked on PR151).
No merge or deployment requested. User review of the septage versions is next.

## Company profile
Neil confirmed the Septage Treatment Facility offer. It is added to cover,
overview and a dedicated service page in the eight-slide widescreen presentation
and seven-page A4 profile. Oceanides coordinates specialist delivery through
turnover. System details, capacity and maintenance follow the technical proposal.
Current files in clients/oceanides/company-profile/output/:
- pptx/Oceanides-Company-Profile-Widescreen-Septage-Final.pptx
- pdf/Oceanides-Company-Profile-Widescreen-Septage-Final.pdf
- pdf/Oceanides-Company-Profile-Print-Septage-Final.pdf
- pptx/Oceanides-Company-Profile-Print-Septage-Final.pptx
Older versions are superseded and retained as version history.
Rebuild: build-profile.ps1 -Revision <new-name> -Format Widescreen; default A4.
Shared export path; widescreen layout in widescreen_layout.py. Private previews
and receipts: .tmp/oceanides-widescreen/. A4 evidence: .tmp/oceanides-profile/.

Approved minimal direction: warm white, ink/navy, ocean-blue light headings,
warm-white closing headings and muted-white supporting text. Segoe UI display
and bold topics, Arial body. Subtle corner waves; one transparent logo on cover/
closing. Client DESIGN.md profile exception governs. Apple report/OpenAI public
reference extraction recorded in workflows/design_swipe_file.md D18.
Four generated illustration disclosures remain visible. Real same-site siphoning
photos are separate and the complete tank opening remains visible in square frames.
Existing assets reused; no generation calls this turn. Provenance: assets/generated-sources.json.

Services: siphoning, plumbing/declogging, pipe leaks, house/condo renovation and
restoration, ceiling repairs/replacement, roof leak repair/waterproofing, house
cleaning, pest control and septage treatment facility projects. Oceanides
coordinates through turnover, including specialists. No supplier/model/capacity,
owned facility/equipment, project count, license/accreditation or maintenance-free
guarantee claim. Expanded process/scope/coordination
information remains in speaker notes; A4 profile preserves its complete layout.
Contacts: 0917 671 6383 (Globe), marketing@oceanidessepticandpest.com;
Tramo Street Corner Dandan, Pasay City, Philippines 1300.
CTA: site assessment and written quotation; receive procurement requirements.

Verification: widescreen eight slides/121 native text runs; A4 seven pages/120
runs. Native text exactly matches layouts and PDF extraction. Facility offer on
cover/index/service page, dimensions/contacts/disclosures/transparency, package,
geometry/font policy/import/final hash PASS. Other service/closing page text is
unchanged apart from page numbers. Changed PDF/PPTX pages inspected in both formats.
Independent final review PASS: zero must-fix, two optional line-balance nits.
Prior widescreen review had a minor caption/footer spacing preference. Native PowerPoint and
projector hardware have not been tested. Artifact-only work; application suites
were not repeated. No merge, deployment or production-data mutation.

## Logo PR retained
PR151: https://github.com/yopiheart/grifon-command/pull/151.
Canonical assets/logo.jpg exactly matches Neil's latest attachment; both funnel
logo derivatives updated and superseded standalone PNG removed. Full square
artwork retained in funnels. Profile-only transparent derivative is authorized.
Logo builds/tests PASS: 1,401 tests, both funnel builds, bundle/voice/domain/
ASCII/artifact checks and desktop/mobile browser verification. No deployment.

## Other ongoing work retained
Recovery tooling draft PR150 targets PR146's codex/oneshot-recovery branch.
PR146 head 39a30613: user-authorized preview retry succeeded (Vercel inspector
4Su52fj6aZnPDfbFViYytqtP9C45); preview access redirects to SSO, app smoke pending.
Fresh CI 36863242626 SUCCESS after confirmed GitHub payment. No production deploy
or merge. Next: release review for PR146; PR150 needs main-target CI after it lands.
Motion PR143 -> PR144 -> PR149 remains on its branches.
Untracked remote attachments and reference/media directories were not staged.
