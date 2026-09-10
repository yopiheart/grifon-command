# NOW - the resume doc
**Stamped: 2026-09-10, approved website merged and deployed**

## Current state
Neil explicitly authorized merging the approved website edits.
PR #129 is MERGED: https://github.com/yopiheart/grifon-command/pull/129
Merge commit: `4acbaefcfac14169dbd7c49b12eee88408e8aed1` on `main`.
Approved source head: `fec657c`; implementation: `7326436` plus earlier accepted work.
Merge tree exactly matches that reviewed head; no API, prompt, model or video changes.
Production: https://grifon.ai/ - Vercel READY, assigned to this merge.
Deployment: https://vercel.com/neilmaglayabusiness22-2085s-projects/grifon-command/AjBYR8JjZjt9XtLTtT76fRuELEBV
This `codex/landing-reveal` branch retains the post-merge resume update.

## Shipped and accepted
- Landing: English copy for Filipino owners doing their own marketing.
  One free ad-plan preview/month, no card; finished video creation is paid.
  Starter/Pro/Business include 1/8/15 finished videos/month.
- Hero: native scroll unfolds living gold ribbons around the blank film.
  Shape and travelling highlights continue at both edges while scrolling stops.
  Center stays clear; drawing suspends offscreen and in hidden tabs; DPR is capped.
  Reverse and live reduced-motion changes restore usable hero controls.
  Neil's Option A single white-gold sweep across Made to move remains accepted.
- Pricing, login, checkout, dashboard navigation, saved-work and loading states.
  Exact-selection payment intent guard and validated retry selection persist.
  Fixtures cover checkout cycle/history; no actual payment was made in closeout.
- Manual routing keeps URL/history aligned: Home, Back/Forward, legal return,
  guest /app, intentional signed-in Home and marked OAuth redirects.
- Compact cookie notice, equal Accept/Decline, 44px privacy target, focus and
  safe-area handling; measured footer spacer. Existing consent semantics retained.

## Verification
Before merge: CI run 34452720905 passed verify, e2e and artifacts; Vercel preview green.
Independent final correctness review: no actionable findings.
Independent motion PASS and BRAND_PASS 45/50; earlier cookie BRAND_PASS 44/50.
Local build passed: 2,580 modules; main JS gzip 589.79 kB.
All 1,357 unit tests and 56 browser tests passed; 32 existing unit skips.
One concurrent run hit a 5s anchor timeout; isolated anchors and full suite passed
without overlapping load. No test, timeout or gate was weakened.
Bundle-leak, voice-sync, domain, PS ASCII, artifact anchors and design lint passed.
Post-merge CI: https://github.com/yopiheart/grifon-command/actions/runs/34457163365
Build/verify, e2e, artifacts and final main-status all passed.
Production desktop: new headline/canvas, Explore film hold, sustained edge movement,
pricing with annual totals, Home URL, login, Terms and its return to Home verified.
Independent production mobile 375x667 PASS: new hero, stationary edge flow, reverse,
clear center, compact cookie/visible CTA, menu to Pricing, login and legal pages.
Mobile routes returned HTTP 200 with no overflow or runtime page errors.
No real authentication, request-invite submission, generation or payment exercised.

## Remaining work and boundaries
The hero film is intentionally blank. Neil approved a living creative-studio concept;
film planning belongs to task `01a08a7d-c9d5-7e21-b0ec-ab3dd98064da`.
No film assets were generated or shipped with this website merge.
Production login currently displays the existing invite-only gate.
This is the approved website deployment, not completion of the entire public launch.
Later review: testimonial provenance, first real free-plan-to-paid journey, analytics
consent wording versus first-party events, OG card, and social destination ownership.
These were not silently changed during merge closeout. Physical-device checks remain.
Gemini migration PR #131 is separate and was not merged by this task.

## Preview auth configuration
Supabase project varoqxjccqmskzeejagn Site URL remains https://grifon.ai.
Neil approved the exact branch preview origin; save/reload verified four redirects:
https://grifon-command-git-1d765a-neilmaglayabusiness22-2085s-projects.vercel.app
Original localhost:5173/**, app.grifon.ai/** and grifon.ai/** redirects remain.
Neil confirmed preview access worked. No auth settings changed during merge closeout.

## Cafe-PC continuity
Use workflows/codex_desktop.md, Node 24/npm 11 and npm.cmd.
Do not commit auth/session files, generated test-results or drawPlan snapshot noise.
Standalone headline study artifacts/hero-sweep-review.html remains reference-only.
No additional paid calls, film work, merge or deployment is running in this task.
