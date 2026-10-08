# Opening pilot implementation handoff

This is bounded visual correction pass 2 (v3) of the silent opening pilot,
frames 0-221. Its visual sources and encoded output are frozen for the joint
independent native-frame and timed gate. No reference-fidelity PASS is claimed.
The independently failed v2 output and its sources were preserved before edits.

## Files

- `pilot.json`: unchanged copy/palette/cuts; editable entry zoom and eight title
  position keys, shared ring-camera enlargement, six relief material transitions,
  and 42 samples covering the defects and transition boundaries.
- `build-pilot.mjs`: unchanged in pass 2. Local normalized Inter contours and
  even-odd masks use a 2048-square raster before sampling to 512-square. A
  floating-point Gaussian height field supplies smooth relief normals.
- `assets/`: two headerless 512x512 Float32 distance fields, one Float32 height
  field, masks, licenses and manifest. Each field is 1,048,576 bytes.
- `vendor/`: unchanged already-installed Three r180 distribution and license.
- `pilot.html` remains unchanged. `pilot.js` reads the new camera/material keys
  and still awaits, validates and uploads all three local buffers before seeking.
- `surfaces.frag`: broken coarse block masks and dense character rows with dark
  negative space; a cropped radial lens/profile rush and projected compressed
  title; preserved pitch reversal/open bowl; global tearing limited to 68-69,
  followed by edge-local tearing, while preserving early tracking marks. All
  eight ring treatments share the original capsule and cuts, with one common
  enlargement and coarse alternating carbon weave. White peaks at 141-142,
  faint relief appears at 143-144, and 145 completes the reveal. Relief materials
  transition between cream, gold, charcoal and near-white. Dense merged organic
  cells grow around the phrase and join the corner trails; central honeycomb has
  analytic relief shoulders and leaves the glyph faces visible. Gray material
  has stronger contour/highlight contrast. The improved smooth letter contours,
  counters and floating-point height field were preserved.
- `render-pilot.mjs`: private allowlisted HTTP composition, blocked external
  requests, local hardware capture, fresh/nonlinear replay, frame hash receipt,
  silent H264 encoding and strict decode/probe verification. After encoding,
  diagnostic logging was added to measure readiness without changing visual
  inputs or the 60 s gate. `qa/pilot-encode-renderer.mjs` preserves the exact
  producer used for the frozen MP4, SHA256
  `047e955ed2f2b7a490d5890fd876aaf432f7716c9dbccb308e25bb9b7298556a`.
- `verify-sdf.mjs`: unchanged in pass 2; full-coverage sign checks, glyph-counter reconstruction,
  independent vector-contour distances, rejection of the original quantized
  distance fields and rejection of three deliberately invalid fixtures per asset.
- `qa/`: current technical receipts, 42 native samples and contact sheet.
  `pilot-failed-review-2/` preserves 292 payload files totaling 140,254,971 bytes,
  with the byte/hash receipt, all v2 frames and the vector builder input. Earlier
  `pilot-failed-review-1/` and `pilot-v1/` snapshots were not overwritten.
- `grifon-opening-pilot-silent.mp4`: current 222-frame silent comparison output.

## Confirmed checks

Confirmed by local renderer/probe/decode: 1920x1080, 222 frames, 30000/1001 fps,
container 7.408 s, 5,504,941 bytes, no audio stream. The source interval is
7.4074 s; the container rounds its time representation. All 42 sampled frames replay byte-identically
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

After the final visual source edits, `npm.cmd run build` exited 0. `npx.cmd vitest run`
exited 0: 116 test files passed, 9 skipped; 1432 tests passed, 32 skipped;
45.64 s. Normal live/paid suites remain disabled.
Build warnings were existing stale Browserslist data and large chunks; no install
or dependency edit was performed.
The later diagnostic-only renderer change passed `node --check` and the local
`render-pilot.mjs check` command. Its 42 sample hashes and all nine runtime input
hashes were checked against the encoded render receipt and matched exactly;
the MP4 hash was rechecked and remained unchanged.

Current MP4 SHA256:
`6815c6e5143257c2d8b4fa368735677754b8d57cc0685ccb7d2ce380459a1c69`.
Preserved independently failed v2 MP4 under `qa/pilot-failed-review-2/`, SHA256:
`50713631826e5b6cb7cf90d6795f6f20e492fbc970a5d63cc3cb82256b7e57e8`.
Preserved reviewed failed MP4 under `qa/pilot-failed-review-1/`, SHA256:
`c8b52e7514162d19ac921ccc69f173fd20a7ccdce764d0663650c5ae3360a0f5`.
Preserved first MP4 under `qa/pilot-v1/`, SHA256:
`22b181f119446325ae7604b132a78305df95e0b6c3f18e4a6bab6340a8999532`.

## Fidelity limitation and remaining work

Root inspected native correction samples against the source and observed new
structure. That observation does not settle timing, typography, lens pose,
material behavior or overall similarity. Joint independent native and timed
review of this exact frozen MP4 is pending. The v2 review failed. Do not scale
this result into the full film before the joint gate.
No audio selection/mux, direct hearing or full-film implementation is claimed.

## Initialization performance failures

Two local initialization attempts failed the unchanged 60 s readiness limit.
The first was a pre-final sample draft with four redundant finite-difference
honeycomb evaluations. Its failure output was:

```text
page.waitForFunction: Timeout 60000ms exceeded.
    at open (render-pilot.mjs:41:54)
```

The cell shoulder derivative was replaced by an analytic normal, and a subsequent
sample run completed. Compilation cost is inferred from that change; it was not
measured with a GPU compiler profiler.

The second was a full render running alongside this role's build and Vitest:

```text
Error: Pilot initialization failed: page.waitForFunction: Timeout 60000ms exceeded.; runtime errors []
    at open (render-pilot.mjs:43:24)
```

The unchanged visual source then completed a standalone 222-frame render,
including fresh-browser and nonlinear checks. A separate instrumented check
measured readiness waits of 54,603.3 ms and 53,846.0 ms; startup through readiness
was 54,996.2 ms and 54,184.1 ms. The initialization history and exact check receipt
record these separately. Successful standalone checks establish workability
under the limit, not CPU concurrency as the exclusive failure cause. The two
timeouts are performance/readiness failures, not independent fidelity verdicts.

## Earlier pass 1 failure preserved in history

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

The initial recursive v2 preservation copied eight incidental private audio
candidate/negative-control files present under `assets/audio/`. Those bytes are
preserved, but they were never silent-render inputs. The preservation receipt
explicitly labels and excludes them from render-input claims; no further audio
read/copy was performed after the parent flagged them. Root handles the private
archive and recursive Git ignore. Current visual receipts enumerate actual
runtime inputs and do not read audio files.

Diagnostic readiness timing was added after visual freeze, and the exact prior
producer was preserved; visual sources, output bytes and the timeout were not
changed. There are no other implementation-scope deviations. Audio is
intentionally absent in this visual pilot, as authorized.
No old-film/application/provider/tuned/skill/dependency file was edited. No Git
commit, push, production cleanup, install or provider operation was performed.
