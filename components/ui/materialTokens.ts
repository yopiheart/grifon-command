import type React from 'react';

// ===========================================================================
// MATERIAL TOKEN SYSTEM — which surfaces are allowed to float.
//
// Fourth sibling to wizardTokens.ts (heights/radii/type), dashboardTokens.ts
// (the borderless-tonal pilot) and motionTokens.ts (easing/duration/spring).
// Where those fix dimensions, this one fixes MATERIAL.
//
// Evaluated against Apple's Liquid Glass docs (see
// workflows/liquid_glass_decision.md). Their rule is a hierarchy rule, not a
// visual-effect rule: the material belongs to the FUNCTIONAL layer — nav and
// controls floating above content — and explicitly NOT to the content layer.
// Grifon had it inverted: 105 backdrop-filters, most of them wrapping forms
// and data, while the actual chrome stayed flat.
//
// The CSS bodies live in index.css under `@layer components` (the rim lens
// needs mask-composite, which Tailwind can't express). They're declared in
// the components layer on purpose, so a caller's one-off Tailwind utility
// still wins — these are defaults, not locks.
//
// PICKING A TIER — ask "does this float above content the user is reading?"
//   yes, and you can operate it .............. CHROME
//   no, it IS the content ..................... PLATE
//   it has taken over the screen .............. SLAB
//   it exists to suppress what's behind it .... VEIL
// If a change raises the app's backdrop-filter count, it's the wrong change.
// ===========================================================================

/**
 * CHROME — the functional layer. The ONLY tier that refracts: blur + saturate
 * body, a masked rim band that lenses harder than the centre, and a specular
 * that travels on hover.
 *
 * Use for: site header (scrolled), dashboard rail, command palette, sticky
 * step footer, floating toolbars, the auth gateway card.
 *
 * Costs a GPU compositing pass, so it must earn it — CHROME over a flat
 * `zinc-950` field is optically a no-op. Give it something to bend (the
 * Aurora field, the ad reel, scrolling content) or use PLATE instead.
 */
export const MAT_CHROME = 'mat-chrome';

/**
 * Per-surface rim width for CHROME, as an inline style. The default 4px band
 * reads as lensing on a bar or a card; on a tall, narrow surface like the
 * dashboard rail the same band runs the full height and starts reading as a
 * second border instead, so those go thinner.
 *
 *   <aside className={MAT_CHROME} style={rim(2)}>
 */
export const rim = (px: number): React.CSSProperties =>
  ({ ['--mat-rim' as string]: `${px}px` }) as React.CSSProperties;

/**
 * PLATE — content at rest. Tonal fill, inset top hairline, no backdrop-filter.
 * The default for GlassPanel and every form, module card and data display.
 */
export const MAT_PLATE = 'mat-plate';

/**
 * PLATE_INSET — a well *inside* a PLATE: a field shell, a preview frame, a
 * result slot. The difference from PLATE is where the light comes from. A
 * PLATE is raised and catches a highlight on its top edge; an INSET is
 * recessed, so its top edge falls into shadow. That inversion is what makes a
 * nested surface read as carved out rather than stacked on.
 *
 * Reach for it when the surface sits ON another surface. If it sits on the
 * canvas, it's a PLATE.
 */
export const MAT_PLATE_INSET = 'mat-plate-inset';

/**
 * CHROME, but only below `md` — for surfaces that are chrome at one breakpoint
 * and content at another (the wizard StepFooter detaches and floats over the
 * form on mobile, but is an in-flow rule at the bottom of the panel on desktop).
 *
 * Breakpoint-scoped in index.css rather than composed as `max-md:mat-chrome`,
 * because Tailwind here is the Play CDN — it only generates variants for
 * classes it already knows, so a variant can't be stacked on a custom class.
 */
export const MAT_CHROME_MOBILE = 'mat-chrome-mobile';

/** SLAB — modals, quota walls, checkout. Fully opaque: it has the screen. */
export const MAT_SLAB = 'mat-slab';

/**
 * VEIL — suppresses what's behind it. Scrims behind a SLAB, route wipes, and
 * the loading/lock overlays that sit on a generated frame. Light blur, heavy
 * dim.
 *
 * This is the one tier where a backdrop-filter is always justified: a VEIL is
 * only ever placed over something worth obscuring — an image, a video frame, a
 * populated panel — so unlike CHROME it never has to prove it earned the pass.
 * It may carry a brief status line (a loader label, "Locked — upgrade to Pro"),
 * but never the surface's actual content.
 */
export const MAT_VEIL = 'mat-veil';

/**
 * Scroll edge effect — a graded blur below a floating bar so content passing
 * beneath it fades out instead of colliding with its labels. Compose onto the
 * bar itself (the bar needs `relative`; the effect renders below its edge).
 */
export const SCROLL_EDGE = 'scroll-edge';

/** Every tier, for `tier`-prop components. */
export type MaterialTier = 'chrome' | 'plate' | 'plate-inset' | 'slab' | 'veil';

export const MATERIAL: Record<MaterialTier, string> = {
  chrome: MAT_CHROME,
  plate: MAT_PLATE,
  'plate-inset': MAT_PLATE_INSET,
  slab: MAT_SLAB,
  veil: MAT_VEIL,
};

/**
 * Radius tiers restated from wizardTokens for concentric nesting. Apple's rule
 * is that a nested corner should be the outer radius MINUS the padding between
 * them, so curves stay parallel instead of drifting.
 *
 *   concentricRadius(16, 12) -> 4  // a 16px panel with p-3 wants a 4px inner
 */
export const concentricRadius = (outer: number, padding: number): number =>
  Math.max(0, outer - padding);
