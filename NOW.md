# NOW - the resume doc
**Stamped: 2026-09-07** (landing implementation)

## Next action
Push `codex/landing-reveal`, keep a draft PR, and confirm its Vercel Preview.
Review the real landing page at the deployment root on mobile.
The user approved landing implementation and recurring preview deployment.
Production merge is not requested. Independent review is required before merge.
Hero film stays blank until its story and assets are approved.

## Delivered in this branch
- Real React landing: editorial hero, native scroll film reveal, gold headline
  light sweep, pointer-responsive atmosphere, button sheen and section entrances.
- Static reduced-motion hero; hidden hero controls leave keyboard focus order.
- Three-step workflow, quieter Pro invitation, keyboard-operable animated FAQ,
  revised closing CTA, and working refund/support footer links.
- Preserved signup segmentation, module intent, header, testimonial rail and demos.
- Removed repeated urgency/exit prompts, illustrative "real campaign" proof and
  repetitive value/ROI sections from the page composition. Source files remain.
- Removed unsupported online-presence copy from the FAQ.
- Typography/CSS scoped to the landing; DESIGN.md records the approved direction.
- No changes to App routing, authentication, checkout, dashboard or tuned content.

## Verification
- TypeScript/Vite build passed (2,584 modules); main JS gzip 593.36 kB.
- 111 unit files / 1,357 tests passed; 9 files / 32 tests skipped.
- 11 browser tests passed: public routes, shipped media and API guards, desktop
  wheel reveal, mobile film reveal/reverse, segmentation-to-login, preserved
  module intent, keyboard FAQ, reduced-motion layout and pricing navigation.
- New browser assertion caught a native ViewTimeline opacity mismatch; it failed
  before the measured-progress fix and passed after it.
- Screenshots inspected: desktop/mobile hero, blank film, workflow, plan and FAQ.
- Additional 320x568 and 844x390 checks: CTA stays in view, no horizontal overflow.
- Bundle leak, voice sync, domain language, artifact anchors and PS ASCII passed.
- Design lint passed via its explicit Node entry point (zero errors/warnings).
  The npm shorthand resolves DESIGN.md as a Windows document here and was stopped.
- Checks used dummy auth configuration; no live auth, payment or paid generation.
- Existing Motion scroll-container warning and dummy telemetry setup noise remain.
- Existing main checkout snapshot edit preserved; do not stage generated snapshot
  or Word lock files from this worktree.
- GitHub/Vercel deployment status is checked after push; draft PR carries its link.

## Related work
Standalone prototype: PR #128, branch `codex/design-review-vercel`,
commit `eea5934`, at /design-review on its Vercel preview. Auth/payment there are
simulated. This branch implements landing only in the actual application.
Next design phases: real pricing/auth/checkout, then dashboard and loading states.

## Existing migration and deferred work
Baseline main: `0121111`; migration PR #126 merged. Daily entry:
`workflows/codex_desktop.md`; see `workflows/codex_migration_inventory.md`.
Hook trust is PC-specific; never restore credentials by reading/copying values.
Assets, funnel dependencies and account connections stay on-demand.
Portable Python: .tools/python-3.12.8/tools/python.exe on the main checkout.
Paid generation still needs an exact-input maximum-cost approved test spec.
One-Shot / Director sample work: workflows/sample_brand_briefs.md.
Pending tuned approvals: CONTINUITY_LOCK vs STRICT_NEGATIVE; missing pinned
claim; route objectionToUs/bigIdea/deepFear/statusUpgrade into the script stage.
Carried defects: garbled sub-line, framing drift, oversized inline images,
duplicated prompt cap, box/punit mismatch, missing script gate, scene refusal
recovery, quota race and paid-but-uncollected fan-out.
Avatar/refused-morph holds are unit-fixed, not render-verified.
No production merge, provider execution, campaign operation or data change.

Maintain: overwrite, maximum 90 lines. GitHub is durable continuity.
