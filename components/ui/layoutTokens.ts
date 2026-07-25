// ===========================================================================
// LAYOUT TOKEN SYSTEM — how wide a thing is, and how far apart things sit.
//
// Fifth token sibling, after wizardTokens (heights/radii/type), dashboardTokens
// (the tonal pilot), motionTokens (easing) and materialTokens (glass tiers).
//
// Written after a measured audit (workflows/liquid_glass_decision.md → Icon +
// layout audit). The landing page was using SEVEN container max-widths and
// SEVEN section paddings, two of them asymmetric; pricing added six more widths
// as hand-typed pixel values that missed Tailwind's scale entirely. The effect
// is that section edges don't line up as you scroll — HIG Layout asks you to
// "align components with one another … alignment makes an app look neat and
// organized and can help people track content while scrolling."
//
// Two scales, three steps each. If a value isn't here, it shouldn't be a
// section container or a section padding.
// ===========================================================================

// --- Containers: how wide is this block? ---------------------------------
//
// These are PAGE-LEVEL containers. Component widths (a card at max-w-md, a
// phone mock at 280px) are not section containers and stay where they are.

/**
 * SHELL — the page frame. Every section's outermost container uses this, which
 * is what makes the left and right edges line up all the way down the page.
 * 1280px.
 */
export const SHELL = 'max-w-7xl mx-auto';

/**
 * COLUMN — a centred content block inside the shell: feature grids, FAQ lists,
 * offer stacks. 896px.
 */
export const COLUMN = 'max-w-4xl mx-auto';

/**
 * MEASURE — prose. Capped in characters, not pixels, so it holds its
 * readability across font sizes. ~68ch sits inside the 45–75ch band; the audit
 * found desktop paragraphs running to 127ch, nearly double the top of it.
 */
export const MEASURE = 'max-w-[68ch] mx-auto';

// --- Rhythm: how much air does a section get? ----------------------------
//
// Symmetric by default. The audit found `pt-28 pb-16` and `pt-12 pb-16`, which
// read as drift rather than intent. The three steps are 4:3:2 on desktop
// (128 / 96 / 64), so the difference between them is legible.

/** BAND_HERO — the opening statement and the closing call. 80 / 128px. */
export const BAND_HERO = 'py-20 md:py-32';

/** BAND — the default section. 64 / 96px. */
export const BAND = 'py-16 md:py-24';

/** BAND_TIGHT — dense or utility sections that shouldn't float away. 48 / 64px. */
export const BAND_TIGHT = 'py-12 md:py-16';

/**
 * The gutter every section shares. Paired with SHELL, this is what actually
 * produces the aligned edge — the container caps the width, the gutter keeps
 * it off the viewport edge at small sizes.
 */
export const GUTTER = 'px-4 sm:px-6 lg:px-8';

/**
 * ONE DELIBERATE EXCEPTION: the hero is asymmetric (`pt-12 pb-16 md:pt-20
 * md:pb-24`) because it sits under the site header and has to clear it, so its
 * optical top is not its layout top. It is not on the rhythm scale, and that's
 * intentional — don't "fix" it to BAND_HERO without checking the header
 * overlap first.
 */
export const HERO_BAND_NOTE = 'see layoutTokens.ts — hero asymmetry is intentional';

/**
 * The same container scale as raw pixels, for the handful of places that build
 * layout with inline styles instead of classes (GrifonPricingPage). Keep these
 * in step with SHELL / COLUMN / MEASURE above.
 *
 * MEASURE_PX is the pixel stand-in for the ~68ch cap: at the body size that
 * lands near 640px, which is why the reading sections converge there.
 */
export const PX = {
  SHELL: 1280,
  COLUMN: 896,
  /**
   * Kept in `ch`, not px, on purpose. A pixel cap is only the right measure at
   * one font size: the pricing FAQ answers sat at 86ch inside a 640px box
   * because their type is smaller than the body. `ch` caps the thing that
   * actually matters.
   */
  MEASURE: '68ch',
} as const;
