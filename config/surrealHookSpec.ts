// Hook Lab — "anchored surreal" creative spec (engagement Phase 3).
//
// Surreal, physics-breaking imagery is one of the most reliable scroll-stoppers
// in the feed: the brain snags on what it can't parse, which buys the first ~1.5
// seconds an ad needs to survive the scroll. This file is the single reviewable
// home for that art direction — kept OUT of the locked geminiService prompts so
// the aesthetic can be tuned without going near tuned code.
//
// "Anchored" = dreamlike/impossible, but still premium Grifon dark-luxury with a
// single gold accent and the real product identity intact. Not garish, not random.

/** Mirrors the app's text + image models. Duplicated here (not imported) so this
 *  additive feature never reaches into geminiService's locked internals. */
export const HOOK_TEXT_MODEL = 'gemini-3.1-flash-lite';
export const HOOK_IMAGE_MODEL = 'gemini-3.1-flash-image-preview';

/** How many hook concepts a single "Generate" produces. */
export const HOOK_VARIANT_COUNT = 4;

/** The anchored-surreal art direction, shared by the concept + frame prompts. */
export const SURREAL_HOOK_SPEC = `
ANCHORED-SURREAL ART DIRECTION:
- Dreamlike, physics-defying, impossible scenes that stop a fast scroll cold
  (e.g. a product floating in a sea of clouds, gravity reversed, an everyday
  object the size of a building, melting or levitating environments, a doorway
  into another world). The frame should make a viewer pause to parse what they
  are seeing — that pause is the hook.
- ANCHOR (non-negotiable): premium and cinematic, NOT chaotic clip-art. Deep dark
  background (near-black / charcoal), ONE warm gold (#FFCC00) accent as the focal
  pop, rich shadows, filmic depth of field. Think "luxury dream sequence," not
  "random AI weirdness."
- PRODUCT TRUTH: if a product is named, render it recognizably and truthfully — do
  NOT invent fake brand logos, fake labels, or fake packaging text. Keep the real
  product the hero of the impossible scene.
- NO on-image text, captions, watermarks, or UI chrome. The hook line is delivered
  separately; the frame is pure visual.
- One clear focal point. Surreal in concept and lighting, never muddy or cluttered.
`.trim();
