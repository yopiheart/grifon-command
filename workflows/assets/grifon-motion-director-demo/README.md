# Grifon Motion Director demo

Twelve seconds, 24 fps, local authored motion. Portrait is 1080x1920; landscape is
1920x1080 with its own horizontal card and closing layout. These graphic panels
are a motion sample, not actual Grifon UI or product-output proof. No generated
footage, voiceover, paid generation, paid AI review, cloud render, or publishing.

## Deliverables and source

- `portrait.mp4` and `landscape.mp4`: final H.264/AAC exports, music fades out.
- `qa/*-frames/contact-sheet.jpg`: samples of the authored composition.
- `demo.json`: the single editable copy/config source.
- `composition.template.html`: HTML/CSS and paused GSAP timeline; edit choreography here.
- `portrait/index.html`, `landscape/index.html`: built editable compositions with embedded logo/fonts and local vendored GSAP. Open through Hyperframes preview to play/scrub.
- `source-manifest.json`: inputs and their hashes; no secret values.
- `qa/`: actual checks; `verification.md` records limitations and review outcomes.
- `artifacts/grifon-motion-director-review.html` at repository root: offline review player, built by `tools/artifacts/build-motion-director-review.mjs`.

Four beats: logo 0-3s; DESCRIBE 3-6s; BUILD 6-9s; LAUNCH then logo/GRIFON.AI 9-12s.
Canonical branding comes from `DESIGN.md` and `brand-spec.md`: transparent gold
ring, `public/logo.png`, GRIFON in Inter Black italic. Never use the older raster
badge or transplant old launch-template offers. Font synthesis matches the CSS
italic treatment in the existing GrifonMark lockup; no new font family is added.

## Reproduce on the existing Windows desktop

Run from the repository root, with Node 24 and existing root dependencies:

```powershell
node workflows/assets/grifon-motion-director-demo/build.mjs
node workflows/assets/grifon-motion-director-demo/render.mjs check
node workflows/assets/grifon-motion-director-demo/render.mjs snapshot
node workflows/assets/grifon-motion-director-demo/render.mjs render
node workflows/assets/grifon-motion-director-demo/revision-check.mjs
node workflows/assets/grifon-motion-director-demo/media-check.mjs
node tools/artifacts/build-motion-director-review.mjs
```

Each command must exit zero before proceeding. An optional third argument to
`render.mjs` selects `portrait` or `landscape`. It invokes Hyperframes locally
with two workers and finishes the existing `api/_lib/assets/music/mrbeast.mp3`
bed with FFmpeg: 12-second trim, 0.35-second fade-in, 0.8-second fade-out,
-14 LUFS normalization target, explicit post-resample -3 dBFS limiter, then
fades. The exported AAC true peak is measured separately; targets are not
claimed measurements. Final media is fully decoded and
checked for 288 frames, dimensions, duration, 24 fps, and an audio stream.
`render.mjs finish` remixes audio from the last local silent render without
rerendering visuals; it fails if that intermediate is absent. Use full `render`
after any composition change. A failed encode leaves the last successful
deliverable intact because encoding and decoding finish in a scratch file first.

The wrapper reuses cached `hyperframes@0.7.68`, FFprobe, ffmpeg-static, and the
installed Playwright browser. It deliberately prefers the existing Headless
Shell on Windows. If a dependency is actually missing, restore only that tool:

```powershell
npm.cmd exec --yes --package=hyperframes@0.7.68 -- hyperframes --help
npm.cmd exec --yes --package=ffprobe-static@3.1.0 -- node -e "console.log('ffprobe cached')"
```

No package is added to the app manifest. On another cache layout, set
`MOTION_NPM_CACHE` to the npm `_npx` directory or explicitly set
`HYPERFRAMES_CLI`, `HYPERFRAMES_FFMPEG_PATH`, `HYPERFRAMES_FFPROBE_PATH`, and
`HYPERFRAMES_BROWSER_PATH`. The scripts fail on missing paths; they never
silently install, use a paid provider, or fall back to cloud rendering.
Snapshots explicitly pass `--describe false` to prevent optional Gemini analysis.

## Revision and verification

Edit text in `demo.json`, rebuild, preview, and rerender only the requested format.
For an isolated experiment pass a separate config and output directory:
`node build.mjs <absolute-config.json> <absolute-output-directory>`.
The twelve-second timeline is fixed; changing duration/fps requires an intentional
timeline edit. Dimensions are authored for the two supplied layouts.

`revision-check.mjs` changes DESCRIBE to CREATE only in `.tmp`, builds both layouts,
and compares actual browser-rendered frames at five moments per format. The
changed beat must differ inside the prompt card only; other beats must be pixel
identical. This tests the real edit path, not only config parsing. It does not
claim to validate every possible replacement string.

`media-check.mjs` measures the encoded AAC, requires finite true peak <= -1 dBTP
and integrated loudness between -22 and -12 LUFS, and reconstructs the initial
clipping defect in scratch to prove the check rejects it. Final measured values
are in `qa/audio-check.json`, not inferred from requested filter settings.

All providers remain off. Machine media checks and sampled visual review are
separate from subjective listening, physical-phone playback, and Neil's final
creative acceptance; see `verification.md` for actual status.

## Third-party asset provenance

GSAP 3.14.2 is vendored unmodified from the URL and SHA-256 in
`source-manifest.json`; its upstream license header is retained. Fonts, logo,
and music reuse the repository's existing assets. Hyperframes itself is not
vendored and the application dependency files are unchanged.
