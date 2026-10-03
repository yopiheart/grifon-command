# Opening motion correction, 2026-09-27

Neil correctly flagged missing animation in the first 13 seconds. The V03 intro
was a fade, collages appeared at fixed positions, and flat SVG hero turns ended
too quickly. Static layout checks had not established choreography fidelity.

## Changes

- Character-by-character opening over 0.08–0.90s, keeping a fixed line anchor.
- Words and props appear while the collage travels left, following a camera pan
  to the right through the source scene. Faster exit connects to the hero slide.
- Camera, phone and laptop are fresh CSS solids, with editable sides, screens,
  lens barrel, keyboard and hinge. They turn from -66 degrees to a three-quarter
  view over 1.19s, then hold. No imported models or raster-generated textures.
- Pixel masks now clip the actual outgoing scene. This preserves objects inside
  the transition and exposes the beginning of each hero entrance.
- Corrected first-scene handoffs from denser reference samples. The problem
  collage pulls into place; Until now types in at 13.20s. Dialogue and the approved
  closing retain their copy and keyframes. Silence and 32.90s duration retained.
- Builder expresses closing times at their absolute offsets so static checks
  can understand them. The approved input is untouched. One adjacent strip seam
  uses its computed boundary to avoid a 3.6e-15s floating-point overlap warning.

## Evidence

`reference-motion/` contains timestamped 10fps source sheets. These exposed the
pan, sustained rotation and later handoffs that sparse V03 frames had missed.
The last sheet extends past 13s because FFmpeg's tile filter buffers a full sheet.

`verify-opening-motion.mjs` measures actual snapshot foreground pixels, excluding
the moving blue field. `motion-before-valid/` is the exact V03 negative control.
All five movement checks fail on V03, with exit 1, and pass on V04, with exit 0:

| Check | V03 | V04 |
| --- | --- | --- |
| Intro dark pixels at 0.30 / 0.60 / 0.95s | 3476 / 3476 / 3476 | 1221 / 2294 / 3476 |
| Collage centroid travel, 1.85 to 2.10s | 0 px | -58.74 px |
| Late camera-turn changed foreground pixels | 6 | 10902 |
| Late phone-turn changed foreground pixels | 31 | 11337 |
| Late laptop-turn changed foreground pixels | 13 | 56269 |

The camera hold at 3.87–3.97 has identical foreground bounds. Four antialiased
edge pixels cross the dark-mask threshold as the background moves. The initial
zero-change assertion failed; pixel inspection found three one-level RGB changes
and one background-blended edge. The explicit hold limit is <0.01% mask change
with identical bounds. CUA separately confirmed the exact same object transform
at both times: rotateY(32deg) rotateX(-12deg).

The first control capture used parent-relative assets and failed to load Inter.
It was rejected, retained locally under ignored `motion-before/`, then repeated
with a complete task-local fixture. Only `motion-before-valid/` is evidence.

`verify-v04-preservation.mjs` passes: three cream background checks are exact;
the approved brand frame is identical; moving cards differ at three pixels by
one channel level (the existing rounding tolerance). A disposable copy edit
changes 2234 pixels and zero pixels outside the edited line's bounds.

Hyperframes check uses 16 opening/transition/middle/ending sample times and strict
mode: zero errors/warnings, clean runtime, and 20/20 contrast checks passed.
Builder, artifact-anchor check, JS syntax and diff whitespace checks passed.
Application build/test were not run because no application source changed.
The saved result is `hyperframes-v04.json`. Motion-specific verification is
the separate pixel check above, not the disabled native motion-assertion pass.
No provider-backed analysis was run; every snapshot used `--describe false`.

## Browser review and limits

Parent CUA checked the live comparison at 390x844, observed advancing half-speed
playback through the first 14s, inspected the three hero poses, and used the frame
slider to verify the hold. Scroll width 375 within viewport 390; controls readable.
Screenshots were emitted in the chat. This is representative live inspection and
dense frame review, not continuous human observation of every frame.

The independent mobile agent again had no browser connection. Its attempt and
blocker are in `mobile-motion-check.md`; no independent UI pass is claimed.
The localhost composition is verified. Portable file playback remains unverified
because the browser disallows file URLs. Fresh source backups are in backups/.

Photographic fidelity, exact source font, original easing graphs, and physical
motion blur remain approximations. This pass fixes missing motion; it does not
claim pixel-perfect reconstruction or Neil's visual acceptance of the revision.
No audio, final MP4 export, paid AI calls, app changes, merge or deployment.
