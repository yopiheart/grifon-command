# NOW - the resume doc
**Stamped: 2026-09-10, resumed after the cafe-PC shutdown**

## Current state
Branch: `codex/landing-reveal`. Draft PR: https://github.com/yopiheart/grifon-command/pull/129
The saved public website upgrade is implemented through pricing, sign-in,
checkout and dashboard navigation / saved-work / loading states.
The approved landing remains intact. No production merge or deploy requested.
Check the PR's latest head/checks before resuming; GitHub is the durable source.
Prior preview: https://grifon-command-git-1d765a-neilmaglayabusiness22-2085s-projects.vercel.app/
Fresh arrival check confirmed 51660bf CI/Vercel success; preview requires Vercel login.
This session does not authorize production deployment or paid operations.

## Positioning and boundaries
Primary buyer: Filipino owner already selling a product/service/property,
doing marketing themselves or with a small team. Secondary: e-commerce.
English public copy. Entry: Build my free ad plan. One preview/month, no card.
Finished videos are paid. Starter/Pro/Business include 1/8/15 videos/month.
`config/planFeatures.ts` remains the display source; billing catalog sets charges.
No stripped brand profiles, team seats or white-label features reintroduced.
CMO direction continues S8 audience specificity from the saved session.
Conversion impact remains a hypothesis, not a measured result.

## Delivered in the resumed phase
- Pricing: current offer and annual totals, readable stacked mobile comparison,
  consistent CTA, keyboard-native FAQ, restrained editorial design.
- Auth: corrected old 3-free-workflows and timing claims, English offer boundary,
  readable consent copy and controls; providers/handlers/consent remain connected.
- Checkout: clearer plan/amount hierarchy, current copy, neutral payment tabs,
  readable legal text, inline chat help that cannot cover the mobile price.
- Removed old urgency, unsupported social/value/timing and guarantee composition
  from these purchase screens; shared components and actual refund route retained.
- Checkout exact-selection guard: payment disabled while cycle/add-on total loads;
  submit handlers cannot use an earlier intent. Card inputs remain mounted.
- Dashboard: keyboard/focus-safe mobile drawer, labelled collapsed navigation,
  existing module routes/locks, accurate usage loading/unavailable/remaining copy.
- Saved ad plans separated from tool history; step eight no longer claims a
  finished video. Resume callback retained. Empty local search offers Check again.
- Active jobs show reported percentages or indeterminate progress, with readable
  details and reduced-motion handling. Existing terminal notifications retained.
- Editorial styles scoped to public purchase screens and documented in DESIGN.md.
- No tuned prompt/model, API, provider, quota, price or auth-service changes.

## Verification
- TypeScript/Vite build passed; main JS gzip about 588 kB (existing size warning).
- Unit suite: 111 files / 1,357 tests passed; 9 files / 32 tests remain skipped.
- All 29 browser tests passed: prior landing/public/media/API guard tests plus
  desktop/mobile plan intent, auth legal return, checkout consent/card/e-wallet
  retry, monthly/annual switching, stored draft selections and card-data handling.
- Dashboard smoke: menu focus/escape/locks, saved-plan resume callback, loading,
  actual IndexedDB denial, numeric/unknown progress and keyboard pricing FAQ.
- New pending-billing regression FAILED before the guard and PASSED after it,
  proving payment waits and submits the newly selected annual intent.
- Original Free-offer checks failed against old pricing copy before replacement.
- 375x667 / 1280x900 screenshots inspected, including controls at element scale.
- Bundle leak, voice sync, domain language, artifact anchors, PS ASCII and design
  lint passed. Design lint: node node_modules/@google/design.md/dist/index.js lint DESIGN.md.
- Independent correctness review: no actionable findings. BRAND_PASS 43/50,
  zero critical issues/nits. Independent smoke passed; findings addressed.
- Local auth uses dummy configuration; checkout/dashboard tests use explicit
  fixtures and block provider calls. No real login, charge or paid render tested.
- IndexedDB service returns null on absence OR read failure; UI says no plan
  was found on this device and offers retry, not proof that no plan exists.
- Active-job service has no terminal history; completion/failure remain existing
  notifications. No fabricated durable job history or progress percentage.
- Do not stage generated drawPlan snapshot or test-results/ files.

## Deferred by the user
Hero film MUST stay blank; keep its current transition. New reveal/transition
ideas are deferred until the user revisits design LAST. Star fields were a
reference; gold wing trails, smoke and dark glass were brainstorming only.
No new hero concept or assets have been approved. Existing og-card artwork
and original testimonial attribution evidence remain later launch-review work.
Real auth/payment acceptance and production merge/deployment need their own
user-authorized session. Dashboard/provider generation is not validated here.

## Cafe-PC continuity
Use workflows/codex_desktop.md; Node 24 / npm 11, npm.cmd in PowerShell.
Dependencies and Playwright Chromium restored; wizard asset profile restored.
No secrets read/restored. Hook trust remains specific to this PC.
Migration PR #126 remains merged. Historical pipeline issues in earlier main
handoffs were not part of this website upgrade.
