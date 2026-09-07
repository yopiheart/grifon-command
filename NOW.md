# NOW - the resume doc
**Stamped: 2026-09-07, before the midnight cafe-PC shutdown**

## Resume tomorrow
Branch: `codex/landing-reveal`. Draft PR: https://github.com/yopiheart/grifon-command/pull/129
Preview: https://grifon-command-git-1d765a-neilmaglayabusiness22-2085s-projects.vercel.app/
Open the root path, not /design-review. Vercel authentication protects this preview.
Read PR head/checks and latest deployment first. The initial landing commit
`21005a2` deployed with green CI; the copy pass is pushed after the checks below.
GitHub is the durable source; fetch the branch if this worktree/PC is gone.
Preserve pre-existing work when checking out. Main remains `0121111`.

User approved the visual direction, then asked for a CMO copy pass and a safe
handoff before midnight. Tonight's scope: landing copy + public metadata.
Next: carry the same positioning into real pricing, login and checkout, then
upgrade their design while preserving auth, selected plan, payment and return URLs.
After that: dashboard navigation, project states and loading/progress treatments.
Hero video MUST stay blank until its concept/assets are planned with the user.
No production merge requested. Obtain independent Codex review before merge.

## Positioning and copy decisions
Primary buyer: Filipino owner already selling a product/service/property, doing
their own marketing or working with a small team. Secondary: e-commerce operator.
Pain: running the business AND figuring out/crafting ads; skeptical of generic AI.
Keep the cinematic brand headline, make the audience and product clear around it.
Primary offer: "Build my free ad plan". Free previews one ad plan/month, no card.
Finished video creation is paid. Starter/Pro/Business include 1/8/15 videos/month.
CMO skill: .agents/skills/grifon-cmo/SKILL.md; landing/onboarding copy is English.
Strategy uses S8 audience callout (19 ads / 8 brands in static_ad_swipe_file.md).
This is a positioning hypothesis, not a conversion result. Later measure landing
to signup and first ad-plan preview completion; inspect abandonment before upsell.
Consult config/planFeatures.ts for current features; older economics docs include
stripped features and must not reintroduce brand profiles, team seats or white-label.

## Delivered
- Real React landing: native-scroll hero reveal, blank film, gold light sweep,
  pointer atmosphere, button sheen, accessible FAQ and editorial typography.
- Typography scoped to landing and documented in DESIGN.md; existing font families.
- Buyer-specific hero/supporting copy, free/paid boundary, outcome-focused modules,
  workflow, plan comparison invitation, objection handling and footer.
- Signup segmentation copy now English; canonical vertical/module keys unchanged.
- Sample cards/tool demos labeled illustrative; removed timing/agency-saving claims.
- Existing customer quotes retained verbatim; obtain original attribution evidence
  before a production proof review. They are not newly verified in this session.
- Search/social text and JSON-LD corrected: retired Creator removed, current
  1/8/15 paid-video limits, Free boundary, and FAQ text matching visible content.
- Public llms.txt now identifies the actual buyer and current entry point/tiers.
- Removed urgency/exit prompts and repeated ROI/value sections from composition.
- Existing signup, module intent, testimonial rail, demos and legal routes preserved.
- No auth, billing, dashboard, provider, tuned prompt or production-data edits.

## Verification this session
- TypeScript/Vite build: passed, 2,584 modules; main JS gzip 593.81 kB.
- Unit suite: 111 files / 1,357 tests passed; 9 files / 32 tests skipped.
- Final 11 browser tests passed: public routes/media/API guards, desktop wheel,
  mobile reveal/reverse, signup handoff, module intent, keyboard FAQ and pricing.
- Mobile/desktop screenshots inspected; 320x568 and 844x390 CTA/no-overflow checks passed.
- JSON-LD parses, plan names current, four structured FAQs match visible copy.
- Bundle leak, voice sync, domain language, artifact anchors and PS ASCII passed.
- Design lint passed through explicit Node entry point; npm shorthand opens a
  Windows document here. Use node node_modules/@google/design.md/dist/index.js lint DESIGN.md.
- No real auth/payment/paid generation tested. Local smoke uses dummy auth values.
- Known inherited warnings: bundle size, Motion scroll container, dummy telemetry.
- Do not stage generated snapshot or ~$DESIGN.md lock files from the worktree.
- Latest hosted status and final remote CI are recorded in PR #129 after push.

## Creative references and remaining decisions
- Astra headline-to-film inspiration: https://openai.com/index/gpt-6-astra/
- FAQ: https://21st.dev/@larsen66/components/faq-monocrhome
- Buttons: https://21st.dev/@designali-in/components/shiny-button
- Text: https://21st.dev/@preetsuthar17/components/shining-text
- Orb: https://21st.dev/@isaiahbjork/components/voice-powered-orb
- Carousel: https://vault.hyperiux.com/demo/arc-flow-carousel
- Fluid: https://vgpu.sh/examples/fluid
Use selectively; voice orb/loading effects belong to meaningful product states.
Existing og-card.png retains the prior artwork; align its artwork when designing
the hero film/social assets. Do not claim a new social image was produced tonight.
Standalone prototype is PR #128 / codex/design-review-vercel, simulated purchase.

## Operational continuity
Daily entry: workflows/codex_desktop.md; Node 24 / npm 11, npm.cmd on Windows.
Migration PR #126 merged; workflows/codex_migration_inventory.md holds details.
Hook trust is PC-specific; never read/copy credentials. Restore assets on demand.
Paid work needs an exact-input, maximum-cost approved spec. Tuned diffs need approval.
Pre-existing main snapshot edit preserved. Deferred pipeline defects/approvals remain
in prior main NOW.md and workflows; this landing work did not resolve them.
