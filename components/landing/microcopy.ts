// Single source of truth for the landing page's friction-killer reassurance
// line, so the copy can never drift between the three signup touchpoints
// (Hero, PinnedCtaPill, OfferStack).
//
// The third clause was 'Upgrade anytime' until 2026-08-10. It was the weak slot:
// true, but it sold nothing, and it left the CTA ('START MY FIRST AD — FREE')
// alone to carry a boundary it cannot state — free.video_ads is 0, so the video
// render is the Starter step. 'See it before you pay' names that boundary AND
// turns it into the offer, which also answers Bryan's #1 objection ("another AI
// tool that makes garbage") by showing instead of promising.
//
// Literally true on every clause: a free ₱0 tier exists, no card is taken at
// signup, and a free user really does see the script, scene stills, character
// and thumbnail on the review screen before any money changes hands.
export const CTA_REASSURANCE = 'Free plan · No card · See it before you pay';

// Compact form for space-constrained surfaces (the pinned CTA pill). Kept in the
// same module so it stays in lockstep with the full line above.
export const CTA_REASSURANCE_COMPACT = 'Free plan · see it before you pay';
