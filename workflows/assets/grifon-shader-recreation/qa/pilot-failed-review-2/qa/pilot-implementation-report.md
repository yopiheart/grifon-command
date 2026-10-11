# Opening pilot implementation handoff

This is visual correction pass 1 of the silent opening pilot, frames 0-221.
It is frozen for independent timed review and is not a reference-fidelity pass.
The reviewed failed version and its sources were preserved before this correction.

## Files

- `pilot.json`: unchanged copy/palette/cuts, stronger entry pitch and title
  foreshortening, and 37 samples covering the identified defects and transitions.
- `build-pilot.mjs`: local normalized Inter contours and even-odd glyph masks;
  signed distances now use a 2048-square raster before sampling to 512-square.
  A separate floating-point Gaussian height field supplies smooth relief normals.
- `assets/`: two headerless 512x512 Float32 distance fields, one Float32 height
  field, masks, licenses and manifest. Each field is 1,048,576 bytes.
- `vendor/`: unchanged already-installed Three r180 distribution and license.
- `pilot.html` remains unchanged. `pilot.js` awaits and validates all three local
  buffers and completes their GPU uploads before exposing frame seeking.
- `surfaces.frag`: coarse slashed-character opener with horizontal expansion;
  later lens entry, black cap and foreshortened title; preserved reverse bowl;
  global tearing at frames 68-69 and earlier local tracking marks; clearer woven
  carbon; full whiteout at frames 141-142; bicubic contours and smoothly swelling
  raised lettering; smaller round/oval droplets in deforming curved clusters.
  The eight ring treatments retain the same analytic capsule geometry and cuts.
- `render-pilot.mjs`: private allowlisted HTTP composition, blocked external
  requests, local hardware capture, fresh/nonlinear replay, frame hash receipt,
  silent H264 encoding and strict decode/probe verification.
- `verify-sdf.mjs`: full-coverage sign checks, glyph-counter reconstruction,
  independent vector-contour distances, rejection of the original quantized
  distance fields and rejection of three deliberately invalid fixtures per asset.
- `qa/`: current technical receipts, 37 native samples and contact sheet;
  `pilot-failed-review-1/` preserves 44 files from the reviewed failed version.
- `grifon-opening-pilot-silent.mp4`: current 222-frame silent comparison output.

## Confirmed checks

Confirmed by local renderer/probe/decode: 1920x1080, 222 frames, 30000/1001 fps,
container 7.408 s, 3,992,749 bytes, no audio stream. The source interval is
7.4074 s; the container rounds its time representation. All 37 sampled frames replay byte-identically
after unrelated seeks and in a fresh browser. Renderer is native AMD Radeon
through ANGLE Direct3D11; runtime errors and external requests are empty.

Confirmed by `node workflows/assets/grifon-shader-recreation/verify-sdf.mjs`:
finite distance values, signs matching every fully covered or fully outside
mask pixel, 2/2 introduction counters and 4/4 relief counters. Each asset has
three subpixel antialias-boundary sign differences, explicitly recorded rather
than represented as exact binary mask agreement. Independent point-to-vector-
segment distances pass a 0.000390625 normalized tolerance. The preserved
original fields fail that precision check. Inverted signs, all-outside fields
and truncated binaries are rejected for each asset. The renderer also validates
finite height values in [0,1] and records completion of all three texture uploads.

After the final source edits, `npm.cmd run build` exited 0. `npx.cmd vitest run`
exited 0: 116 test files passed, 9 skipped; 1432 tests passed, 32 skipped;
45.24 s. Normal live/paid suites remain disabled.
Build warnings were existing stale Browserslist data and large chunks; no install
or dependency edit was performed.

Current MP4 SHA256:
`50713631826e5b6cb7cf90d6795f6f20e492fbc970a5d63cc3cb82256b7e57e8`.
Preserved reviewed failed MP4 under `qa/pilot-failed-review-1/`, SHA256:
`c8b52e7514162d19ac921ccc69f173fd20a7ccdce764d0663650c5ae3360a0f5`.
Preserved first MP4 under `qa/pilot-v1/`, SHA256:
`22b181f119446325ae7604b132a78305df95e0b6c3f18e4a6bab6340a8999532`.

## Fidelity limitation and remaining work

Root inspected correction samples and found the letter swelling substantially
closer. That observation does not settle timing, typography, lens pose, material
behavior or overall similarity. Independent timed review of this exact frozen
MP4 is pending. Do not scale this result into the full film before that gate.
No audio selection/mux, direct hearing or full-film implementation is claimed.

## Failure diagnosed during correction

The first supersampled distance build failed counter verification:

```text
Error: Counter mismatch introduction: 3/2
    at verify-sdf.mjs:69:47
```

Two exactly zero averaged boundary samples created a two-pixel false counter.
Their independent low-resolution mask alpha was 155 and 134, both inside. The
builder now resolves only exact-zero ties to signed 1e-7 using that coverage;
counter verification was rerun and passed. The expected-counter gate remains.

## Reproduction

Run from the worktree root using the existing installed runtimes:

```text
node workflows/assets/grifon-shader-recreation/build-pilot.mjs
node workflows/assets/grifon-shader-recreation/verify-sdf.mjs
node workflows/assets/grifon-shader-recreation/render-pilot.mjs render
npm.cmd run build
npx.cmd vitest run
```

## Deviations

None from implementation scope: the approved brief allows locally authored free
GPU/Three surfaces. The native shader package was not required for this authored
implementation. Audio is intentionally absent in this visual pilot, as authorized.
No old-film/application/provider/tuned/skill/dependency file was edited. No Git
commit, push, production cleanup, install or provider operation was performed.
