# Grifon native After Effects typography study

## Latest: Your next ad, visual and score preview

`launch/Grifon-Your-Next-Ad-v3.mp4` is a new original 30-second Grifon cut.
`launch/Grifon-Your-Next-Ad-v3.aep` has native editable text, shapes, a camera
with 21 position keys, and separate original music/SFX stems. The collected
project is `launch/package/Grifon-Your-Next-Ad.aep`, with Footage and Fonts.
No Higgsfield provider, legacy skincare photos or reference soundtrack is used.

The interface is the actual One-Shot LaunchScreen component captured locally
with empty fields and an inert launch callback. It is not a live generation
result. Storyboard panels show editable graphics from this film itself.
Asset provenance, claims and the proposed narration are in `launch/production.json`.

Verified: all 900 frames and stereo audio decode; 1920x1080, 30fps, 30 seconds.
Audio measured -22.7 LUFS integrated and -9.4 dBFS true peak. Overview frames
and dense transition strips exposed and helped fix a truncated UI capture,
inconsistent secondary logo, peripheral card fragments, overlapping headlines
and an occluded caption. Measurements do not establish an accepted final mix.

**Still open:** final narration, full auditory review, creative acceptance against
the references, and validation on a second user-selected reference. This is a
reviewable preview, not a claim of AAA quality or a finished client-facing product.
The reusable workflow is a draft in `workflow-draft/SKILL.md`, not installed and
not an MCP integration. The prior `STORYBOARD.md` skincare concept is rejected.

Rebuild this cut: run `node make-launch-audio.mjs`, then execute
`build-grifon-launch.jsx` in AE, followed by `render-launch.jsx` after the build
report exists. Inspect any actual dialog before retrying; dispatch success is
not script completion. Run `node verify-launch.mjs`, then `package-launch.jsx`
in AE to collect sources. Scripts preserve existing output projects rather than
silently overwrite them. Exact paths in the builders are relative to this folder.

The browser capture harness was temporary and never modified application code.
The separate aerender process did not start promptly; the actual native AE
Render Queue successfully produced the file. An earlier internal AE context
error has no established root cause; successful later rendering is not a diagnosis.

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
