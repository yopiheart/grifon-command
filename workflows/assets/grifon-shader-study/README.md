# Original Grifon material study

An eight-second, silent 1920x1080 / 30 fps comparison. This is an original
composition assembled from free `shaders@4.0.1` components, not a recovered
Shaders Pro preset. It is an exploratory asset, not an enabled product feature.

Both modes use the same text, logo, layout and authored choreography. The
comparison isolates material rendering: CSS in `before`, native WebGPU in
`after`. The approved 32.9-second Grifon film, music and voice were not changed.

## Contents and editing

- `index.html`: composition layout, ordinary DOM typography and logo lockup.
- `composition.js`: shared absolute-time choreography and async seek queue.
- `study.json`: editable text and asset references; the composition reads the
  orb/glass end boundaries and finish settle/hold/end timings from this file.
- `materials-source.js`: original component assembly and absolute-time material
  uniforms. No autonomous shader clock or history simulation is used.
- `shader-materials.js`: committed browser bundle produced by `build.mjs`.
- `render.mjs`: local capture, encoding and verification, with GPU completion
  awaited before screenshots.
- `qa/`: capture hashes, contact sheets, encoded media checks and independent QA.
- `grifon-shader-{before,after,comparison}-1080p.mp4`: saved review exports.
- `../../../artifacts/grifon-shader-study.html`: the review player lives at the
  repository root's `artifacts/grifon-shader-study.html`.

Edit copy or the logo path in `study.json`; keep the shared structure to compare
materials. Layout, colors and detailed entrance offsets remain authored in the
HTML, JavaScript and material source. The JSON palette describes the study;
it is not yet a live customization control. Changing the component recipe
requires rebuilding its bundle. Long copy needs a visual layout check.

From the repository root, using the existing local tool installation:

```powershell
node workflows/assets/grifon-shader-study/build.mjs
node workflows/assets/grifon-shader-study/render.mjs check
node workflows/assets/grifon-shader-study/render.mjs render
node tools/artifacts/build-grifon-shader-review.mjs
```

`GRIFON_TOOL_ROOT` can point the renderer to another checkout containing the
existing Playwright, Sharp and FFmpeg tools. The isolated worktree automatically
resolves its primary checkout. The build resolves installed esbuild from the
repository and finds the shader package through Git's common directory, or a
`GRIFON_SHADER_RUNTIME` override. The package lives in the primary checkout's
ignored `.tools/shader-runtime`; it is not added to Grifon's app dependencies.
The committed browser bundle and exported MP4s can be reviewed without npm or a
Shaders account. Serve the source over localhost; call
`await window.seekComposition(seconds)` only after `__motionReady` is true.
`__motionError` reports failures explicitly. There is no CSS fallback counted as
a successful shader render.

Scoped Git attributes preserve LF bytes for this study's sources, bundle,
licenses and review player. A Windows checkout with `core.autocrlf=true` was
verified to retain the generated bundle's exact SHA-256.

## Evidence and constraints

Success requires real WebGPU rendering, readable unchanged copy/logo, identical
same-time pixels after nonlinear seeking and fresh browser startup, a stationary
6.4–7.6s brand hold, zero external requests, and strict decoding of all three
8-second / 240-frame H264 exports. Each export is intentionally silent.
`qa/capture-check.json` binds capture evidence to the source hashes;
`qa/media.json` records media hashes and technical properties.

This Windows AMD `gcn-5` desktop needs the documented Chromium launch arguments
in `render.mjs`. Default adapter setup and the default DXC compiler failed in
the initial probe; the local FXC testing option succeeded. No operating-system
or installed browser configuration was changed. Other GPUs/browsers still need
their own compatibility check. This is not a universal export promise.

Provider calls and paid generation spend for this study: zero. No Shaders Pro
assets, locked preset code, account connection, MCP server or hosted export was
used. License copies are in `licenses/`; local Inter fonts carry their OFL file.
The Grifon logo is copied byte-for-byte from the repository's `public/logo.png`.

## Reusable preset direction

The study establishes three possible Grifon treatments: luminous orb, glass
workflow and brand finish. A later product task can expose tested text/logo,
palette and timing controls, validate output per target device, and provide
server-rendered exports to users who do not have WebGPU hardware. That customer
UI, renderer deployment and preset catalog are outside this study.

Upstream sources: https://github.com/shader-effects-inc/shaders and
https://shaders.com/updates/shaders-is-open-source.
