# NOW - the resume doc
**Stamped: 2026-09-07** (Vercel design review)

## Next action
Publish branch `codex/design-review-vercel` as a draft PR and confirm its Vercel
Preview deployment. Open `/design-review` on that deployment from mobile.
User explicitly requested a Vercel preview; production merge is not requested.
After feedback, integrate approved design selectively into the real application.
Plan the hero film before adding any video; the user requested a blank frame.

## Current branch scope
- `public/design-review.html`: approved standalone interactive design study.
- `vercel.json`: explicit `/design-review` rewrite before the SPA fallback.
- Landing, purchase and Studio tabs; auth and checkout are simulated.
- Blank hero frame with reveal/replay interaction; no hero footage is embedded.
- Public preview is intentional. It includes only sample data and bundled images.
- App routes, providers, billing, auth and tuned content have not been changed.
- Main checkout and its pre-existing snapshot edit remain untouched.

## Verified for this change
- Build passed: TypeScript and Vite, 2,589 modules.
- Unit suite: 111 files / 1,357 tests passed; 9 files / 32 tests skipped.
- Bundle leak, voice sync, domain language, PS ASCII and artifact anchors passed.
- Static page copied byte-for-byte into `dist/design-review.html` by Vite.
- Headless Chromium at 390x844: blank hero, reveal/replay, purchase tab, Pro
  selection, simulated email/verification, disabled payment until terms, simulated
  success, Studio tab and no horizontal overflow; zero page errors.
- Mobile landing screenshot inspected. No paid API or real payment was called.
- Local dependencies reused from the main checkout; lockfile hashes match.
- Hosted URL and GitHub CI remain to be checked after push.

## Existing migration state
PR #126 merged; baseline is `0121111` on main. Daily entry:
`workflows/codex_desktop.md`. Desktop migration controls and legacy Claude files
are preserved. Other PCs must review/trust hooks; trust is machine-specific.
Prior migration verification: build, unit, 8 browser checks, 26 control contracts,
design lint and readiness passed. See `workflows/codex_migration_inventory.md`.
Portable Python lives under `.tools/python-3.12.8/tools/python.exe` on this PC.
Optional asset profiles, funnel dependencies and account connections remain
on-demand. Never restore secrets by reading or copying their values.

## Remaining product work and boundaries
- This is a review artifact, not the completed application redesign.
- Map accepted hero/motion, FAQ, CTA, purchase and dashboard changes into existing
  components while preserving manual routing and consumer/admin boundaries.
- Verify real authentication, checkout and saved-project behavior during integration.
- Independent Codex review is required before asking to merge non-trivial changes.
- Paid generation still requires an exact-input, maximum-cost approved test spec.
- Finish One-Shot / Director previews using `workflows/sample_brand_briefs.md`.
- Pending tuned approvals: CONTINUITY_LOCK vs STRICT_NEGATIVE; missing pinned claim;
  route objectionToUs/bigIdea/deepFear/statusUpgrade into the script stage.
- Carried defects: garbled label sub-line; framing drift; oversized inline images;
  duplicated scene prompt cap; box/punit mismatch; missing script gate; scene refusal
  recovery; false ProofGallery claim; quota race and paid-but-uncollected fan-out.
- Avatar persistence and refused-morph holds are unit-fixed, not render-verified.
- No main merge, provider execution, campaign operation or production data change.

Maintain: overwrite, never append; maximum 90 lines. GitHub is durable continuity.
