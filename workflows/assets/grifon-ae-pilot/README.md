# Grifon native After Effects typography study

## Current checkpoint: camera study, not a finished launch film

The later 30-second study is `film/Grifon-Direction-Camera.aep`, with a rendered
`film/Grifon-Direction-Camera.mp4`. AE rendered all 900 frames successfully.
It has an actual camera, 16 position keys, 16 point-of-interest keys, eight
scene planes and independent phone/paper elements. Native text uses Inter;
the earlier font limitation below applies only to the original 16-second study.

Neil judged the first 30-second version too basic. The camera revision remains
a technical study, not an accepted creative solution or a benchmark-quality
film. Its generated props are illustrations, not real product evidence. Music
and effects are an original procedural sketch, unauditioned; narration is absent.
Latest priority is the [five-film reference autopsy](../motion-reference-library/README.md).

Rebuild order: run `make-score.mjs` from Node, install the packaged Inter fonts,
run `build-film.jsx`, then with its v3 project open run `build-camera-film.jsx`.
Both scripts refuse to overwrite their output projects. Keep the generated
assets in `source/`; relink footage there if moving the checkout to another PC.
The font license is included in `source/fonts/`. Earlier variants and session
backups remain locally, ignored by Git. `refine-camera.jsx` records the small
layout repair already incorporated into the camera builder; it is not required
for a fresh build.

The workflow still uses native ExtendScript, not an implemented MCP bridge.
No Higgsfield dependency is part of this build. No final sound or quality claim
is implied by a successful render.

## Original checkpoint

First working checkpoint, built in After Effects 26.5 on 2026-09-25.
This is a 16-second timing study, not a finished launch film or MCP integration.

Open `output/Grifon-Type-Study.aep`. The master contains four editable scene
compositions at 1920 x 1080, 30 fps. Text, opacity/position keyframes, the focus
underline and brand ring remain native AE elements. The griffin is an unchanged
copy of `public/logo.png`, packaged in `source/logo.png`.

Scene order: Your next big idea; Give it direction; From a thought / To your
next ad; Grifon signature. Copy is a creative draft, without performance claims.
Three PNGs are actual AE frame exports, not generated mockups.

## Rebuild

With an empty AE project, run `build-pilot.jsx` through File > Scripts > Run
Script File. The script refuses a nonempty project or an existing output AEP.
Move the existing output aside intentionally before rebuilding; preserve edits.
Adobe also supports `AfterFX.exe -r <absolute-script-path>`.

## Validation and limitations

- Executed in AE, saved the project, exported and inspected three 1080p frames.
- Runtime check measured all text widths inside the 1680px title-safe width.
- Initial build exposed a three-value Scale easing requirement; corrected and
  rebuilt successfully. Partial failed build remains locally backed up.
- Arial is a temporary substitute; Inter/Geist were unavailable on this PC.
  This is not brand-final typography.
- Scenes currently use simple cuts and staggered entrances. Continuous playback,
  transition polish and sound design remain unvalidated. No final video export.
- No generated images, video model, paid provider call or MCP server was used.
  The control path is Adobe's native ExtendScript command-line entry.
- ElevenLabs informed hierarchy and pacing intent only; its imagery, words,
  audio and branding are not embedded.

[Adobe scripting documentation](https://helpx.adobe.com/after-effects/desktop/automate-in-after-effects/automate-animation/scripts.html)
