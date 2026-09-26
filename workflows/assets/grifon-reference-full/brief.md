# Your next ad — full reference study

32.90-second silent, editable 1920x1080 / 30fps composition. Neil approved the
closing pilot and delegated the complete sequence on 2026-09-27: "Surprise me".
The source is the supplied ElevenLabs/Reception.ai reference. Music/SFX and final
video encoding remain deferred. No paid calls, generated assets or app integration.

The opening adapts the reference's object/word collages and blue product reveals
to a camera, phone and storyboard laptop. These and the supporting objects are
fresh SVG illustrations. The warm transition, luminous orb and conversation lead
to the approved 10.1-second ending, retained at reference time 22.8s.
The conversation is an editorial concept, not an actual product-UI recording.

## Sequence

| Time | Beat |
| --- | --- |
| 0–1.08 | Your next ad. |
| 1.08–2.78 | To launch a product. / object collage |
| 2.78–4.14 | Camera / A NEW ANGLE |
| 4.14–5.53 | To tell your story. / filmmaking collage |
| 5.53–6.88 | Phone / YOUR STORY |
| 6.88–8.21 | To grow your business. / planning collage |
| 8.21–9.70 | Laptop / THE BIG PICTURE |
| 9.70–12.72 | But there’s never time to make it. |
| 12.72–14.03 | Until now. / warm light |
| 14.03–17.42 | Contracting luminous sphere and orbital lines |
| 17.42–22.80 | What are we creating? → product launch → build the story |
| 22.80–32.90 | Approved quiet statement, three cards, strip and brand hold |

The exact visible text is in copy.js. Entrance blur is an authored approximation;
this is not physical shutter-based motion blur. Reference colors are the approved
study exception to Grifon's normal marketing palette. Original graph presets and
photographic objects were not supplied; vector objects, easing and light differ.

## Editable sources and reproduction

- copy.js: all visible English copy.
- opening.js / opening.css / opening.html: opening and middle composition.
- objects.js: fresh procedural SVG object library, independent of the app.
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

The existing pilot remains unchanged at port 4178. The reference MP4, Inter OFL
font, GSAP 3.13.0 and canonical public/logo.png are the same task-local assets as
that pilot. No other project's compositions, assets or settings were imported.

## Verification contract

Fail on runtime errors, obscured text, unintended motion during holds, stale
backgrounds after a cut, missing assets or broken seek/playback. Check transition
frames as well as settled scenes. Preserve the approved ending's wording and
timing, verify a text-only revision, and inspect the comparison at phone width.
Full visual acceptance of the new opening/middle remains Neil's next review.
