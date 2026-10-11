# Oceanides flagship review / October 2026

Eighteen feed creatives and a working private inquiry prototype, built from the saved
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
| 02 | Problem | Three questions before pumping | OpenAI E51 + S4 checklist adaptation |
| 03 | Proof | Same round tank, before and after | Saved Oceanides UGC proof direction (originally S21-inspired) |
| 04 | Proof | Same rectangular tank, visible change | Kylie E47/E48 hierarchy + Oceanides matched photos |
| 05 | Decision | Understand the whole quote first | S4 offer stack, work-order treatment |
| 06 | Decision | Details, scope/price, then schedule | Loose S28 named-stage sequence adaptation |
| 07 | Problem | Tenant / owner coordination | E65 Alex Hormozi character-card composition |
| 08 | Problem | Business maintenance contact | E90 Russell Brunson street poster |
| 09 | Problem | Unknown tank information | E26 Gruns surface / hidden-area metaphor |
| 10 | Problem | Describe affected areas | E91 Russell Brunson useful whiteboard |
| 11 | Decision | Move-in service history | E84 Russell Brunson paper-strip collage |
| 12 | Decision | Renovation planning | E92 Russell Brunson miniature-home composition |
| 13 | Decision | Save maintenance records | E30 Gruns hand-drawn framing |
| 14 | Decision | Confirm property access | Documented E5 Sabri Suby audience callout |
| 15 | Decision | Clear first inquiry | E58 Meta for Business actual-interface hero |
| 16 | Decision | Unit / building coordination | E28 Gruns two-panel contrast |
| 17 | Decision | Give a photo context | E57 Meta for Business notebook flat lay |
| 18 | Decision | Organize maintenance history | E46 Kylie Cosmetics monochrome portrait |

These are design references, not evidence of performance for this new batch.
S15 in the swipe file means statistics, not a generic checklist; S21 means native
platform formatting, not every before/after. The mappings above distinguish the
original inspiration from the actual adapted layout. Posts 07-18 add twelve
distinct compositions and appear first in the gallery. The E references are
saved images in `assets/ad-swipe/`; E5 has a written entry in
`workflows/static_ad_swipe_file.md`, with no local E5 JPEG. E57 is the notebook
reference; the saved Stripe E73 image is gradient typography, not a notebook.

Neil supplied the contact details on October 11: Globe **0917-671-6383**, Smart
**0939-245-6217**. `contacts` in `posts.mjs` supplies the phone footer on all 18
designs and the contact lines in their captions. No live website was modified.
`posts.mjs` combines the original six with `posts-variety.mjs`, holding the exact
captions, awareness level, sources, destination and review status. The gallery
shows that same copy; there is no second copy source.

- `out/*.png`: 18 exports at 2160 x 2700, 4:5 aspect ratio.
- `out/*.webp`: 18 previews at 1080 x 1350.
- `out/*.html`: self-contained source canvases with embedded photos and fonts.
- `out/manifest.json`: render checks and source metadata for all 18.
- `inquiry.html`: concern/role, property details, editable copyable summary.
- `contact-sheet.png`: all 18 at approximate phone-feed width.
- `contact-sheet-new.png`: the twelve added designs at the same feed width.
- `qa/`: automated interaction evidence and responsive screenshots.

The inquiry accepts allowlisted `?post=01` through `?post=18` and includes that
creative reference in the summary. It collects no name, phone or email; choices
remain in memory and reset on reload. Copy has a select-text fallback.

## Rebuild and verify

Use the repository's installed Playwright and sharp. A worktree without its own
dependencies can reuse an existing checkout explicitly:

```powershell
node clients/oceanides/flagship-2026-10/build-posts.mjs --runtime-root C:/Users/ADMIN/Desktop/grifon-command
node clients/oceanides/flagship-2026-10/build-gallery.mjs
node clients/oceanides/flagship-2026-10/build-contact-sheet.mjs --runtime-root C:/Users/ADMIN/Desktop/grifon-command
node clients/oceanides/flagship-2026-10/qa-smoke.mjs --runtime-root C:/Users/ADMIN/Desktop/grifon-command
```

With local dependencies, omit `--runtime-root`. No generation API, paid render,
API credentials or hosted service is required. Do not use this package to modify
the existing tuned daily-generation prompts. The built folder can be copied as a
unit for local review: inquiry styles/scripts, local fonts and logo must travel
with `index.html`; the gallery alone does not contain the entire journey.

## Evidence boundaries

The original proof posts use the `tb2-ba2` and `tb2-ba3` matched tank pairs; post
17 also uses `tb2-ba3-before` as historical context. The later August 1 source
note in `funnels/oceanides-price-page/scripts/build-assets.mjs` records Neil's
confirmation that they are real job photos. Earlier daily-post documentation
labels them AI. Original camera files remain with Boss Jay and were not inspected
in this task. The gallery and metadata disclose that conflict. Captions identify
the photos as archive material; no job date, city or universal outcome is claimed.

Posts 07 and 18 reuse the saved Gabriel AI portrait. The August 1 asset builder
records Neil's likeness-consent and image-approval confirmation; the agreement
itself was not inspected here. Both posters visibly say AI PORTRAIT. This is
neither a testimonial nor a promise about who will attend a service. Post 14
reuses the edited fleet-context image with a visible EDITED IMAGE label, without
claiming a particular job, vehicle assignment, equipment or availability. Post
15 uses a screenshot of the actual local inquiry guide, saved as
`templates/inquiry-ui.webp`; it depicts no submitted request or booking. The
cutaway, home and key are custom SVG illustrations. No new AI generation or paid
render was needed for this expansion.

The August 8 `compliance-findings-2026-08-08.md` records closure pending Oceanides'
own NCR ESC and incorrect attribution of older DENR numbers. This task does not
resolve that hold. New creatives contain no accreditation, certificate, legal
disposal, truck-arrival, fixed-price or warranty claim. Unresolved crew photos
and the fictional blue tanker remain excluded.

## Small-batch activation after release approval

1. Confirm current operating clearance, actual service scope/terms and usable
   asset permission/provenance. Approve the exact Taglish wording shown in the
   gallery. Replace the private inquiry prototype with an approved live contact
   destination and verify the person responsible for replies.
2. Start with one primary page and a small selection over roughly two weeks:
   problem 01, proof 03, decision 05; then problem 02, proof 04, decision 06.
   The twelve new designs are a rotation library; use them to test relevant
   audience situations without publishing all 18 at once. Use the approved
   scheduler's native scheduling for the selected batch. Assign one
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

- All 18 render checks pass: fonts/photos loaded, no canvas clipping, exact PNG
  and WebP dimensions. The original six PNGs remain pixel-identical to the
  approved-contact commit. Independent visual/diff review passed after moving
  post 09's illustration disclosure fully onto its light surface and aligning
  post 17's metadata with the exact rendered PNG source.
- Expanded browser smoke: 21/21 checks pass at 1440px, 390px and 320px, including filters,
  keyboard slider, modal focus/Escape, copy fallback, validation, edit/reset,
  safe source attribution and no external/write requests. The local HTTP helper
  rejects traversal and paths outside this package. Every post's modal image,
  caption, download, manifest sources and inquiry ID are checked. The initial
  expansion run caught stale post 15 screenshot metadata (20/21); rebuilding
  cleared it. `qa/report-before-variety-rebuild.json` preserves that failure.
- Regression evidence: the embedded inquiry originally opened Details above its
  frame at y=-77.25px. The fixed Details and Review headings are visible at
  y=169.75px. `qa/regression.json` records the actual before/after observation.
  Mobile gallery action overlays that obscured poster footers were also removed.
- Application build and the full unit suite pass again for the expansion:
  1432 passed, 32 skipped. The dist junction uses an F: output directory after
  the original task exhausted C: space. Bundle-leak,
  voice-sync, domain-language, PowerShell ASCII and artifact-anchor checks pass.

Successful OS clipboard writing and native-device viewing are not independently
verified; denial/select fallback and Chromium interactions are verified. No
conversion performance or live booking integration is claimed.
