# Grifon native After Effects typography study

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
