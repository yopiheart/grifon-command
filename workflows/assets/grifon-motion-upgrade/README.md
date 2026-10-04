# Grifon full motion upgrade

## Current accepted baseline

Neil accepted `grifon-full-upgrade-elevenlabs-sfx-review-1080p.mp4` on2026-10-04
and asked to preserve the method for future Grifon marketing and product work.
[approval.json](approval.json) records the exact user message and video hash.
The [reuse guide](../../grifon_motion_production.md) connects editable picture,
audio cues, finishing commands, private recovery and future product boundaries.
The selected SFX still have a private-review-only rights limitation; creative
acceptance is separate from commercial clearance and independent listening QA.
The older visual/audio outputs below remain preserved as historical versions.

Full 32.9-second, 1920 x 1080 / 30 fps revision of the approved
"Your next ad" film. This is an editable local film, not a product launch or
a new paid generation pipeline. The earlier eight-second depth prototype and
the approved V08 export remain unchanged.

The upgrade keeps the approved copy, story order, palette progression and
sound-action anchors. Genuine Three.js geometry, physical materials, camera
perspective, light and shadows replace flat product props. All critical copy
remains editable DOM type using Inter; no generated text is baked into an image.
The final mark uses the unchanged canonical logo and Inter Black italic GRIFON.

## Delivered media

- `grifon-full-upgrade-1080p.mp4`: complete revised picture with accepted audio.
- `grifon-full-before-after-1080p.mp4`: synchronized native-video comparison of
  the approved V08 film and revised picture; audio plays once.
- `poster.jpg` and `qa/final-film-sheet.jpg`: actual encoded output frames.

These files are written only after production completes. Final status and
hashes are recorded in the QA files; the existence of source is not a render
or creative approval.

## Editing and reproduction

`demo.json` owns visible copy and cue anchors. `composition.html.template`
owns camera, geometry, materials, choreography and easing. `build.mjs` generates
`index.html` and records real source hashes in `source-manifest.json`. Do not
hand-edit the generated index. One paused master GSAP timeline and
`window.seekComposition(seconds)` expose absolute-time inspection.

From the isolated repository root, using the existing desktop dependencies:

```powershell
node workflows/assets/grifon-motion-upgrade/build.mjs
node workflows/assets/grifon-motion-upgrade/render.mjs check
node workflows/assets/grifon-motion-upgrade/verify-source.mjs
node workflows/assets/grifon-motion-upgrade/render.mjs render
node workflows/assets/grifon-motion-upgrade/finish-evidence.mjs
node workflows/assets/grifon-motion-upgrade/phone-evidence.mjs
node workflows/assets/grifon-motion-upgrade/qa/audio-preservation.mjs
node workflows/assets/grifon-motion-upgrade/build-comparison.mjs
```

The existing local Node 24, Playwright/Chromium, Sharp, FFmpeg/FFprobe and cached
Hyperframes 0.7.68 are reused. No install, provider call, model analysis, paid
generation or telemetry is required. `render.mjs finish` deliberately reuses
the last silent picture: rerun `render` after visual changes.

`checkpoint.mjs <seconds...>` exports offline production frames for review.
`verify-source.mjs` checks all story sections, intended motion, exact hero
settles, nonlinear seeking and an isolated opening-copy revision. Its blank
and frozen controls must fail. `finish-evidence.mjs` compares actual encoded
frames against inspected source pixels and builds the final frame sheet.

## Accepted sound and provenance

The entire accepted V08 AAC stream is copied without re-encoding or
normalization. Payload SHA-256:
`095701ccc7fe7292c70f888a1145c15736fa64648f98c71ef24f1f195d536998`.
The original score/SFX have 99 authored placements. No new synthesized score,
voiceover, downloaded stock sample or isolated stem is distributed.

The accepted combined video source is
`../grifon-reference-full/exports/grifon-your-next-ad-v08-1080p.mp4`.
Its existing `qa/sound-v08/` records the cue sheet and measured export.
Music is Digital Clouds by Alejandro Magana (A. M.), Mixkit 175, with the
same recorded effects approved for V08. This end-product does not grant a
future product asset-library license. Font OFL and Three.js MIT notices are
included locally; the logo is the canonical repository brand asset.

## Practical limits

The film is authored for this landscape story, not an automatic promise to
copy any reference. Abstract device art and chat bubbles are editorial concepts,
not evidence of shipped product UI or customer output. The composition uses
depth blur and multisample antialiasing; temporal motion blur is not asserted.
Audio identity and measurements are objective checks, not a claim that the
assistant directly heard or creatively approved the new film.

The native MP4 and comparison do not need browser connector permissions.
The earlier prototype HTML preview's browser-origin check remains blocked
until the user's explicit authorization; offline film rendering does not
establish mobile webpage or physical Android playback verification.

## Actual verification - 2026-10-03

- Both MP4s decode completely with strict FFmpeg error handling: H.264 yuv420p,
  1920 x 1080, 30 fps, 987 frames, 32.900 seconds, single stereo AAC48k stream.
- Full film: 5,190,198 bytes; SHA-256
  `978d8e1d29bfbd40c89788a898377c5acca5d3ea7efcdfab1a50e71d4fbbff27`.
- Comparison: 3,824,847 bytes; SHA-256
  `695f7684a3f4710df6d7cf1ae6bf71ee98caa3c185c4018c26344df47401112d`.
- Accepted audio payload is unchanged in both exports; measured final levels
  match V08 at -16.03 LUFS / -1.35 dBTP / 7.90 LU LRA. The declared cue audit
  directly checks 93 of 99 placements; stream identity preserves all placements.
- Source: 15 visible story beats, 11 intended motion windows, three settled hero
  contacts, repeat seeking including the dialogue exit, isolated opening-copy
  revision, and rejected blank/frozen controls. Minimal type-only beats use
  separate ink-area criteria from product/camera transitions.
- Actual encoded frames match 15 inspected source samples within mean-channel
  error 12; maximum observed error is 7.313. The 32.70s tail is exactly black.
- Hyperframes reports zero errors and two nonblocking warnings: single-file
  length and a static pre-timeline type-width measurement. Runtime/layout pass;
  source/encoded pixel checks validate actual seeking. Main-comp editability is
  retained instead of splitting the story into many subcompositions.
- Independent native media smoke: PASS. Independent encoded visual review:
  PASS WITH NITS, zero critical findings; details in `qa/visual-review.md`.
- Existing domain, PowerShell ASCII and artifact-anchor checks pass. Initial
  child-spawn EPERM was resolved by retrying unchanged commands with local
  process permission; no gate was skipped. No application code changed, so the
  earlier passing app build/test baseline was not rerun for movie assets.

Fine speaker/card-detail/URL copy is small at 375px display width. Main copy,
card titles and wordmark remain legible in the decoded pixel review. The lens
finish retains its current pale material; some secondary collage props extend
beyond the frame. These are recorded craft notes, not claims that every prop
is uncropped or that physical-phone playback has been tested.
