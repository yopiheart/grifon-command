# Grifon scene and action pilot

An original eight-second, 1920x1080 / 30 fps pilot with an orb reveal, glass
workflow and stationary Grifon finish. FlowingGradient, LiquidMetal and
FlutedGlass provide native WebGPU materials. Ordinary DOM text and the exact
canonical logo stay editable. Abstract workflow cards are motion samples,
not evidence of generated product output. The approved full film is unchanged.

## Shared production contract

`pilot.json` is the single source for scene purpose, readable intervals, cuts,
transition references, action timings, easing, targets, sound families and
contacts. Detailed entrance, sheen, compression, reveal, hold and fade times
are read from this file; authored motion functions remain in `composition.js`.
A contact is the visual landing and sound contact, followed by the action's hold.
The audio manifest derives each cue start by subtracting its native source
transient offset from that action contact. There are no separately authored
visual-contact timestamps in the mix.

`action-spec.mjs` exports `validateSpec`, `actionMap`, `actionProgress` and
`cueManifest` for other compositions. Validation rejects duplicate IDs,
missing purpose, impossible intervals/contacts, unknown targets, inherited or
unknown easing names, unknown cue references, and exits that cannot touch the
scene boundary. This pilot's `pilot-contract.mjs` additionally rejects unknown
authored action/target/scene/exit bindings before CSS can become NaN. New films
may use the generic contract with their own authored binding validator.

Edit the five copy fields in JSON. The disposable copy proof changes only the
opening; the evidence compares exact pixels outside that line and all other
text. Long copy still needs a visual check. Changing one `card-reveal` contact
by 0.2 seconds changes the visible settle and both glass cue contacts; the
validator, authored composition and manifest use the same revised value.

## Reproduce locally

From this checkout's root, using existing dependencies:

```powershell
node workflows/assets/grifon-motion-action-pilot/prepare-assets.mjs
node workflows/assets/grifon-motion-action-pilot/contract.test.mjs
node workflows/assets/grifon-motion-action-pilot/build.mjs --check
node workflows/assets/grifon-motion-action-pilot/render.mjs check
node workflows/assets/grifon-motion-action-pilot/render.mjs render
node tools/artifacts/build-grifon-motion-action-pilot.mjs
node workflows/assets/grifon-motion-action-pilot/verify-player.mjs
```

`prepare-assets.mjs` verifies six recorded raw audio hashes and copies only
missing inputs from the owning checkout or its primary desktop checkout. The
exact relative paths and hashes are in `asset-provenance.json`. A missing or
changed source is an explicit failure; the helper never downloads or calls a
provider. `GRIFON_TOOL_ROOT` may point at the existing primary tool checkout.
Pinned shaders 4.0.1 and dependencies live in the existing ignored shader
runtime; `build.mjs` has no installation step. Shader notices and Inter OFL
are bundled beside the composition. Browser source needs a localhost server.

`render.mjs` supports `check`, `render`, `encode` and `verify`. Rendering waits
for every async seek and GPU submission, isolates fresh browsers, captures
240 frames, builds separate local music/SFX stems, normalizes a floating-point
premaster, encodes the review MP4, and strictly decodes the saved picture/review.
`audio.mjs` can rebuild the audio/cue manifest without a picture render.

The renderer uses the AMD native adapter and a scoped Chromium launch with
`--disable-dawn-features=use_dxc` and `--disable-gpu-rasterization`. The latter
fixed a one-pixel transformed-orb startup difference while preserving native
WebGPU materials. Exact startup/nonlinear pixel gates retain zero tolerance;
other devices need their own GPU check. Saved MP4 playback requires no WebGPU.

## Evidence and delivery

- `qa/capture-check.json`: current source hashes, native GPU, exact nonlinear
  and fresh-browser frames in all three scenes, stationary brand hold, real
  invalid-fixture process exit, visible contact edit and copy-only pixel proof.
- `qa/contact-sheet.jpg`: authored states, readable holds and transitions.
- `qa/audio-cue-manifest.json`: action-derived contacts and sample-based delays.
- `qa/audio.json`: source hashes, separate stem hashes and master meter.
- `qa/media.json`: saved export hashes, frame count, dimensions, strict decode,
  encoded AAC sample rate/channels, loudness and true peak.
- `grifon-motion-action-pilot-review-1080p.mp4`: complete private review mix.
- `grifon-motion-action-pilot-picture-1080p.mp4`: silent authored picture.
- Root `artifacts/grifon-motion-action-pilot.html`: offline player rebuilt only
  from the committed review MP4, poster, spec and artifact builder. Its controls
  include playback, restart, scrub, sound, chapter jumps and download.

The artifact builder parses every emitted inline behavior script with Node's VM
before saving the page. `qa/player-invalid-script.txt` retains the actual broken
script found during live review: the verifier fails against it with a syntax
error and passes the repaired output. This static check proves syntax only;
actual playback/control behavior requires the independent browser smoke check.

For supported local browser review, run:

```powershell
node workflows/assets/grifon-motion-action-pilot/preview.mjs
```

The helper prints its PID, artifact hash and an ephemeral
`http://127.0.0.1:<port>/review` URL. It serves only that finished offline HTML
from memory, only for `GET /review`; every other path or method returns 404.
It never serves arbitrary files or directories. Restart this helper after
rebuilding the artifact, and stop its own process when review is complete.

Raw audio and isolated stems are ignored local inputs, not a customer asset
library. Digital Clouds is credited to Alejandro Magaña (A. M.) / Mixkit 175,
using the existing recorded stock music permission. Selected ElevenLabs SFX
predate the paid subscription and remain PRIVATE REVIEW ONLY. Commercial rights
must be cleared before public or customer delivery. Direct audio audition is
pending; timing/level measurements are confirmed, taste is not inferred from
them. Provider calls: zero. Paid generation spend: US$0.

For private machine recovery after final review:

```powershell
node workflows/assets/grifon-motion-action-pilot/archive.mjs
```

The unique ZIP lives under the primary checkout's ignored
`.tools/grifon-motion-archives/`; the tracked receipt records the filename,
archive hash and each source hash, without absolute machine paths. Every ZIP
entry is reopened and verified byte-for-byte, including ignored audio/stems.
The receipt excludes itself to avoid a self-referencing archive hash. This
private recovery file is not a public download or customer delivery.
