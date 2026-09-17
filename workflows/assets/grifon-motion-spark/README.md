# Grifon Spark — reference-led motion preview

First creative preview: 15 seconds at 24 fps, portrait and landscape. Reuses the
approved DESCRIBE / BUILD / LAUNCH copy in a new light-led glass-card treatment.
The panels are abstract motion graphics, not actual Grifon UI or generated results.
See brief.md for exact source references, sampled observations and beat timings.

## Files

- portrait.mp4 / landscape.mp4: H.264 + AAC previews, separate layouts.
- demo.json: editable text and brand config; composition.template.html: choreography.
- portrait/index.html / landscape/index.html: complete editable Hyperframes projects.
- qa/*-frames/contact-sheet.jpg: authored scene samples.
- qa/*-actual-mp4-sheet.jpg: frames extracted from the encoded deliverables.
- source-manifest.json: asset hashes; qa/: measured results and review evidence.

## Reproduce

From the repository root, using existing Node 24 and installed root dependencies:

```powershell
node workflows/assets/grifon-motion-spark/build.mjs
node workflows/assets/grifon-motion-spark/render.mjs check
node workflows/assets/grifon-motion-spark/render.mjs snapshot
node workflows/assets/grifon-motion-spark/render.mjs render
node workflows/assets/grifon-motion-spark/media-check.mjs
node workflows/assets/grifon-motion-spark/revision-check.mjs
```

Each command must exit zero before continuing. render.mjs accepts an optional
portrait or landscape argument. `finish` remixes audio from this project's last
silent render; use full `render` after any visual change. Intermediate files go
only in .tmp/grifon-motion-spark. No paid API or automatic dependency installation.

Tool cache discovery/environment overrides follow the existing Motion Director
demo README: Hyperframes 0.7.68, ffmpeg-static, ffprobe-static, existing Playwright
Chromium Headless Shell. `--describe false` disables provider-backed frame analysis.
Fonts and logo embed at build time; canonical panel SVGs come from the installed
lucide-react package through React static markup. No app dependencies are changed.
The inherited GSAP 3.14.2 vendor file retains upstream code/license; only trailing
whitespace was normalized. source-manifest.json records the local vendor hash.

To change one line, edit demo.json, build, inspect samples, and render. Optional
build arguments take an absolute config file and output directory for experiments.
The authored timeline is fixed at 15 seconds / 24 fps. The revision check uses
CREATE in a disposable copy. Later sampled frames must preserve their composition
within a maximum one-level RGB difference and mean channel difference <= 0.02;
this is not a pixel-identical claim. A second-beat BROKEN edit is a negative
control that must fail. See qa/revision-check.json for actual measured differences.

Music reuses api/_lib/assets/music/mrbeast.mp3. Local FFmpeg trims it to 15s,
normalizes/limits, and fades in/out; media-check measures the exported AAC.
Apple footage, music, marks, and claims are not included in the exports.

This is preview delivery, not publication or creative acceptance. Continuous
playback, subjective listening and physical-phone review are recorded separately
from machine checks in verification.md. Source and media are backed up in a draft
PR stacked on the Motion Director installation branch; no application changes.
