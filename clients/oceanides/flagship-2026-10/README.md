# Oceanides flagship review / October 2026

Six feed creatives and a working private inquiry prototype, built from the saved
Oceanides references and client design system. Open `index.html` locally to review
the collection, compare the archived photo pair, inspect exact draft captions,
download each PNG, and try the three-step inquiry.

**Release status: private review.** No posts have been scheduled, no booking has
been created, and this prototype sends no inquiry. Approval of this design task
does not establish current service availability or operating clearance.

## Deliverables

| Post | Job | Main idea | Saved reference |
| --- | --- | --- | --- |
| 01 | Problem | Recurring blockage: clarify the cause | ChatGPT Tricks news graphic |
| 02 | Problem | Three questions before pumping | OpenAI E51 + S15 information stack |
| 03 | Proof | Same round tank, before and after | S21 native proof |
| 04 | Proof | Same rectangular tank, visible change | S21 + Kylie E47/E48 hierarchy |
| 05 | Decision | Understand the whole quote first | S4 offer stack, work-order treatment |
| 06 | Decision | Details, scope/price, then schedule | S28 process sequence |

These are design references, not evidence of performance for this new batch.
`posts.mjs` holds the exact captions, awareness level, sources, destination and
review status. The gallery shows that same copy; there is no second copy source.

- `out/*.png`: six 2160 x 2700 exports, 4:5 aspect ratio.
- `out/*.webp`: six 1080 x 1350 previews.
- `out/*.html`: self-contained source canvases with embedded photos and fonts.
- `out/manifest.json`: render checks and source metadata for all six.
- `inquiry.html`: concern/role, property details, editable copyable summary.
- `contact-sheet.png`: all six at approximate phone-feed width.
- `qa/`: automated interaction evidence and responsive screenshots.

The inquiry accepts allowlisted `?post=01` through `?post=06` and includes that
creative reference in the summary. It collects no name, phone or email; choices
remain in memory and reset on reload. Copy has a select-text fallback.

## Rebuild and verify

Use the repository's installed Playwright and sharp. A worktree without its own
dependencies can reuse an existing checkout explicitly:

```powershell
node clients/oceanides/flagship-2026-10/build-posts.mjs --runtime-root C:/Users/ADMIN/Desktop/grifon-command
node clients/oceanides/flagship-2026-10/build-gallery.mjs
node clients/oceanides/flagship-2026-10/qa-smoke.mjs --runtime-root C:/Users/ADMIN/Desktop/grifon-command
```

With local dependencies, omit `--runtime-root`. No generation API, paid render,
API credentials or hosted service is required. Do not use this package to modify
the existing tuned daily-generation prompts. The built folder can be copied as a
unit for local review: inquiry styles/scripts, local fonts and logo must travel
with `index.html`; the gallery alone does not contain the entire journey.

## Evidence boundaries

Only `tb2-ba2` and `tb2-ba3` matched tank pairs are used. The later August 1 source
note in `funnels/oceanides-price-page/scripts/build-assets.mjs` records Neil's
confirmation that they are real job photos. Earlier daily-post documentation
labels them AI. Original camera files remain with Boss Jay and were not inspected
in this task. The gallery and metadata disclose that conflict. Captions identify
the photos as archive material; no job date, city or universal outcome is claimed.

The August 8 `compliance-findings-2026-08-08.md` records closure pending Oceanides'
own NCR ESC and incorrect attribution of older DENR numbers. This task does not
resolve that hold. New creatives contain no accreditation, certificate, legal
disposal, truck-arrival, fixed-price or warranty claim. Crew faces and edited
fleet photos are excluded.

## Small-batch activation after release approval

1. Confirm current operating clearance, actual service scope/terms and usable
   asset permission/provenance. Approve the exact Taglish wording shown in the
   gallery. Replace the private inquiry prototype with an approved live contact
   destination and verify the person responsible for replies.
2. Start with one primary page and these six posts over roughly two weeks:
   problem 01, proof 03, decision 05; then problem 02, proof 04, decision 06.
   Use the approved scheduler's native scheduling for that batch. Assign one
   accountable operator to confirm delivery and answer inquiries.
3. Preserve the creative reference when handing the inquiry to the operator.
   Record qualified inquiries (actual concern, location and useful timing),
   quotes, confirmed schedules and completed paid jobs per post. Track reach
   separately so engagement is not mistaken for bookings.
4. Expand the winning family only after those observations. This batch has no
   measured conversion uplift, guaranteed scroll-stop rate or verified champion
   performance. Its purpose is a clear, testable starting point.

No scheduler or production database was changed by this task.

## Verified delivery

- All six render checks pass: fonts/photos loaded, no canvas clipping, exact PNG
  and WebP dimensions. An independent visual reviewer assessed the six exports.
- Browser smoke: 20/20 checks pass at 1440px, 390px and 320px, including filters,
  keyboard slider, modal focus/Escape, copy fallback, validation, edit/reset,
  safe source attribution and no external/write requests. The local HTTP helper
  rejects traversal and paths outside this package.
- Regression evidence: the embedded inquiry originally opened Details above its
  frame at y=-77.25px. The fixed Details and Review headings are visible at
  y=169.75px. `qa/regression.json` records the actual before/after observation.
  Mobile gallery action overlays that obscured poster footers were also removed.
- Application build passes using an F: output directory after C: ran out of disk
  space. Full unit run with two workers: 1432 passed, 32 skipped. Bundle-leak,
  voice-sync, domain-language, PowerShell ASCII and artifact-anchor checks pass.

Successful OS clipboard writing and native-device viewing are not independently
verified; denial/select fallback and Chromium interactions are verified. No
conversion performance or live booking integration is claimed.
