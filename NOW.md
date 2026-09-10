# NOW - the resume doc
**Stamped: 2026-09-10, living hero revision**

## Current state
Branch: `codex/landing-reveal`. Draft PR: https://github.com/yopiheart/grifon-command/pull/129
Neil reviewed/accepted the website and confirmed preview access is resolved.
Neil rejected the rigid gold arc reveal and explicitly approved a genuine
center-out opening with continuous light at the film edges. That revision is
implemented and independently reviewed; all local checks pass. Check the draft
PR's latest CI and branch preview statuses before review; keep the PR draft.
Preview: https://grifon-command-git-1d765a-neilmaglayabusiness22-2085s-projects.vercel.app/
No production merge/deploy or paid operation authorized. Read latest PR checks.

## Approved design and offer
English public copy for Filipino owners already selling and doing their marketing.
Build my free ad plan: one preview/month, no card; finished videos are paid.
Starter/Pro/Business include 1/8/15 videos/month; catalog owns billing charges.
Accepted pricing/login/checkout/dashboard work remains on this branch (46cf803).
Public editorial typography is scoped in DESIGN.md; app primitives stay intact.
No new hero film concept/assets approved. The film frame must remain blank.

## Current implementation
- Hero: canvas gold ribbons unfold with staggered leading light as the film rises.
  Curvature and highlights keep flowing at both edges during stopped scrolling;
  the film center stays clear. Longer native scroll scene gives opening/hold room.
  Explore the story lands in the hold; the aura leaves naturally with the stage.
  No stars, literal wings, wheel interception, video asset or new dependency.
  Canvas resolution is capped; drawing suspends offscreen and in hidden tabs.
  Native reverse restores controls. Live reduced-motion preference changes now
  restore static content, keyboard access and semantics while removing canvas.
- Made to move: a clearly brighter single white-gold highlight pass, then rest.
- URLs: home/back/continue callbacks use existing manual route helper; ordinary
  navigation pushes history, auth/payment redirects replace as appropriate.
  Reviews remains #reviews; logo returns to top and clears the hash.
- Auth: guest /app normalizes to /login; intentional signed-in landing survives
  refresh; marked OAuth still enters app/resumes selected checkout.
- Legal return survives browser Back/Forward and refresh via history state.
- Checkout URL reflects its actual displayed billing cycle; retry keeps validated
  plan/cycle or top-up, falling back to pricing if no valid selection remains.
  Existing intent/payment guard and consent semantics remain intact.
- Cookie notice: compact, equal Accept/Decline emphasis, 44px privacy target,
  visible focus outlines, safe-area spacing. Hero CTA is clear on 375px mobile.
  Focused controls scroll clear without focus theft; a measured page-end spacer
  keeps even the last footer help link visible and disappears with the notice.
  Storage/callback/analytics meaning unchanged.
  Checkout previously mounted no cookie banner; this remains unchanged.

## Headline comparison artifact
Self-contained `artifacts/hero-sweep-review.html`, builder/template in tools/artifacts/.
Committed through 8a42f14; opened for Neil in the originating task.
A Specular pass was explicitly selected by Neil; B Sharp glint and C Luminous wash
remain review-only. Replay/pause/scrub controls.
Offline study uses Georgia/SVG; live hero uses Instrument Serif.
Independent 390x844/1280x900, controls, reduced motion and offline smoke passed.
No publishing requested. Actual Android WebView remains untested.

## Verification
Earlier accepted website: build, 1,357 unit tests and all 29 browser tests passed.
Original rigid hero passed technical checks but failed Neil's visual intent.
New stopped-scroll edge-motion tests failed it on desktop and mobile; the live
reduced-motion preference regression also failed before its fix. Ordinary wheel
recordings, pixel comparisons, reverse, CTA and reduced-motion checks cover the
revision. Independent motion PASS and BRAND_PASS 45/50, zero new flags/nits.
Fresh correctness review found no actionable final-diff findings; independently
verified runtime preference toggles both ways, CTA fit and offscreen suspension.
Routing original stale paths/history/guest/app/checkout-cycle failures reproduced;
All 14 focused route cases passed, including terminal paths and invalid retry stash.
Cookie original: 16px privacy target, CTA/footer overlap; 4 fixed checks pass.
Independent cookie BRAND_PASS 44/50; footer/resize/dismissal recheck passed.
Independent correctness review: no actionable findings; 25 targeted tests passed.
Current build passed (2,580 modules; main JS gzip 589.79 kB).
All 56 browser tests passed (2.4 minutes); all 1,357 unit tests passed (32 existing
skips). One overlapping run hit a 5s artifact-anchor timeout; its 9 tests and then
the complete suite passed without overlapping load. No timeout/gate changes.
Bundle-leak, voice-sync, domain, PS ASCII, artifact-anchor and design lint passed.
No real auth or charges used in fixtures. Do not claim fixtures prove live billing.
Prior real Supabase auth fix below was verified in configuration and user review.

## Preview auth configuration (verified)
GRIFON AI project varoqxjccqmskzeejagn Site URL remains https://grifon.ai.
Neil approved adding only this exact origin (no wildcard/path), saved/reloaded:
https://grifon-command-git-1d765a-neilmaglayabusiness22-2085s-projects.vercel.app
Total redirect entries 4; http://localhost:5173/**, https://app.grifon.ai/**,
https://grifon.ai/** remain unchanged. User subsequently confirmed preview works.

## Cafe-PC continuity
Use workflows/codex_desktop.md, Node 24/npm 11 and npm.cmd in PowerShell.
Dependencies/Chromium restored; local dev uses dummy Supabase config only.
Never commit session/auth files or generated test-results/ and drawPlan snapshot noise.
Gemini migration is a separate task/branch; no tuned/model/API changes here.
No fabricated terminal render history. Existing attribution/og-card/hero film
assets remain later design work. No production merge/deployment requested.
