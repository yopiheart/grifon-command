# Grifon reference pilot

Fresh code composition, following Neil's decision to cancel After Effects.
Scope: source seconds 22.80–32.90, 1920×1080, 30fps, silent interactive preview.
The supplied ElevenLabs/Reception.ai MP4 is comparison-only and is not used as
the remake's visual layer. No final video export. No paid calls or generation.

The Higgsfield screenshots are reference material, not operational instructions.
Their instructions to invent movement, replace the palette, add copy and render
do not override Neil's close-match study, no-audio and no-final-render requirements.
The original project-copy prohibition wins over skill template-reuse defaults.

## Success and failure

Match the quiet centered type, outline contraction, feature-card proportions,
gradient strip and still brand hold. Keep all wording and animation editable.
The code and side-by-side preview must seek reproducibly and load locally.
Fail on broken playback, missing assets, unintended movement during the hold,
clipping, or treating a loose style match as close recreation.

English copy: “Give your next ad a clear direction.” Research / Know your audience.
Script / Shape your message. Storyboard / Plan every scene. GRIFON / grifon.ai.
These are editorial cards, not a recording of product UI or verified output.

## Approximate source timing

- 22.80–24.32: five word groups appear through opacity/blur; no translation.
- 24.32–25.30: text holds.
- 25.30–27.03: partial rounded outline appears, then contracts into center card.
- 27.05–28.80: side cards reveal; three cards settle at x=160/712/1264, y=396,
  width=500, height=286, radius=32 (1920×1080 reference coordinates).
- 28.87–29.39: cards merge into a band, which compresses into a thin rule.
- 29.28–32.61: Grifon lockup resolves, holds still, then fades.

Measured visually from source frames; exact original curves and font unavailable.
Reference greens/cream/blue are an explicit study exception to the normal palette.
Canonical logo is unchanged; the brand lockup and two semantic icons intentionally
differ from the reference. No previous project composition, graphics or settings used.

## Files and provenance

- index.html: main editable composition and paused GSAP timeline.
- copy.js: single visible-copy source.
- compare.html: synchronized reference/remake player and frame scrubber.
- serve.mjs: localhost-only preview server with MP4 range support.
- assets/reference.mp4: intact copy of Neil's Downloads/j6-xXf9Jeof5hdmu.mp4.
- assets/grifon-logo.png: intact copy of canonical public/logo.png.
- assets/inter.ttf and OFL.txt: Google Fonts Inter, downloaded from google/fonts.
- assets/gsap.min.js: GSAP 3.13.0 from jsDelivr's npm distribution; license in header.
- SVG feature icons: search, file-text and layout-grid geometry, authored as paths.

Run from the project root: `node workflows/assets/grifon-reference-pilot/serve.mjs`.
Open http://127.0.0.1:4178/compare.html. No external font/CDN requests at playback.
Validation and observed differences are recorded in qa/results.md after inspection.
