# Your next ad — full reference study

32.90-second silent, editable 1920x1080 / 30fps composition. Neil approved the
closing pilot and delegated the complete sequence on 2026-09-27: "Surprise me".
The source is the supplied ElevenLabs/Reception.ai reference. Music/SFX and final
video encoding remain deferred. No paid calls, generated assets or app integration.

The opening adapts the reference's object/word collages and blue product reveals
to a camera, phone and storyboard laptop. These and the supporting objects are
fresh SVG illustrations in the collages; the three heroes are CSS solids with
separate front, back and side faces. The warm transition, luminous orb and conversation lead
to the approved 10.1-second ending, retained at reference time 22.8s.
The conversation is an editorial concept, not an actual product-UI recording.

## Sequence

| Time | Beat |
| --- | --- |
| 0–1.13 | Your next ad. / character reveal from 0.08 to 0.90 |
| 1.13–2.93 | To launch a product. / collage travels left |
| 2.63–4.58 | Camera / A NEW ANGLE / turn ends 3.82 |
| 4.04–5.69 | To tell your story. / filmmaking collage |
| 5.65–7.52 | Phone / YOUR STORY / turn ends 6.84 |
| 6.94–8.78 | To grow your business. / planning collage |
| 8.61–10.58 | Laptop / THE BIG PICTURE / turn ends 9.80 |
| 9.94–13.23 | But there’s never time to make it. / collage pulls into place |
| 13.03–14.27 | Until now. / pixel reveal, typed line and warm light |
| 14.27–17.42 | Contracting luminous sphere and orbital lines |
| 17.42–22.80 | What are we creating? → product launch → build the story |
| 22.80–32.90 | Approved quiet statement, three cards, strip and brand hold |

Overlapping intervals are pixel-mask handoffs. The actual artwork remains visible
inside outgoing tiles instead of being replaced by flat rectangles. The exact
visible text is in copy.js. Entrance blur is an authored approximation;
this is not physical shutter-based motion blur. Reference colors are the approved
study exception to Grifon's normal marketing palette. Original graph presets and
photographic objects were not supplied; vector objects, easing and light differ.

## Editable sources and reproduction

- copy.js: all visible English copy.
- opening.js / opening.css / opening.html: opening and middle composition.
- objects.js: fresh procedural SVG object library, independent of the app.
- solids.js: fresh CSS 3D camera, phone and laptop geometry.
- backups/approved-closing.html: untouched pilot used by the composition builder.
- index.html: generated main composition, all animation logic in one document.
- compare.html: synchronized reference/remake player, solo mode and chapters.
- serve.mjs: localhost-only preview server, port 4179.

Build: `node tools/artifacts/build-grifon-reference-full.mjs`.
Preview: `node workflows/assets/grifon-reference-full/serve.mjs`.
Open http://127.0.0.1:4179/compare.html.
The builder refreshes index.html from the sources above and creates the portable
twin at artifacts/grifon-reference-full.html. Edit source files before rebuilding;
direct index.html edits work for local review but are overwritten by the builder.

The V03 opening backup preserves the previous, under-animated pass. V04 fixes
Neil's feedback about missing typing, collage pans and object rotation. See
qa/motion-results-v04.md for measured before/after checks and remaining limits.

The existing pilot remains unchanged at port 4178. The reference MP4, Inter OFL
font, GSAP 3.13.0 and canonical public/logo.png are the same task-local assets as
that pilot. No other project's compositions, assets or settings were imported.

## Verification contract

Fail on runtime errors, obscured text, unintended motion during holds, stale
backgrounds after a cut, missing assets or broken seek/playback. Check transition
frames as well as settled scenes. Preserve the approved ending's wording and
timing, verify a text-only revision, and inspect the comparison at phone width.
Full visual acceptance of the new opening/middle remains Neil's next review.
