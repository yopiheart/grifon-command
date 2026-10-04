# Grifon motion depth study

An original eight-second 1920 x 1080 / 30 fps motion sample. It develops the
camera staging, material changes, dimensional type and action-linked audio
studied in Neil's two supplied Higgsfield demonstrations. It is a separate
prototype; the approved 32.9-second reference remake remains unchanged.

Exact film copy: `YOUR`, `NEXT`, `AD`, `GRIFON`, `GRIFON.AI`. No offer,
performance claim, voiceover or invented product interface appears.

## Sequence

| Seconds | Picture | Sound intent |
| --- | --- | --- |
| 0-2.5 | Real perspective camera travels through foreground architecture toward a gold orb and title panel | Restrained mallet groove, lateral air, rising tension |
| 2.5-4.5 | The same orb and camera pose cut between gold, ceramic, glass and wireframe | Four different material contacts, on the 120 BPM beat |
| 4.5-6 | Actual Inter contours extrude into three word rows; each enters for 240 ms, contacts at 4.75 / 5 / 5.25, then rebounds and settles | Three matching pitched contacts and a quiet settle |
| 6-8 | Unchanged canonical Grifon mark, Inter Black italic wordmark, separate website address | Harmonic resolution and a smooth ending tail |

The material changes use cuts. Depth blur, foreground occlusion, PBR lighting,
reflections and four-sample anti-aliasing establish depth; temporal motion blur
is not implemented. All critical type and geometry remain editable.

## Files and editing

- `demo.json`: visible copy, color tokens and cue times.
- `composition.html.template`: camera, geometry, lighting, easing and scene logic.
- `audio-manifest.json` and `audio.mjs`: original deterministic music and effects.
- `build.mjs`: validates the brief, normalizes actual Inter contours and builds
  `index.html` with local Three/GSAP dependencies. No network calls.
- `source-manifest.json`: actual source hashes and asset/license provenance.
- `grifon-motion-depth-1080p.mp4`: final H.264 / yuv420p video with stereo AAC.
- `poster.jpg` and `qa/final-film-sheet.jpg`: frames from that final encoded film.
- `../../../artifacts/grifon-motion-depth-review.html`: standalone review with
  the exact final MP4, poster and font embedded; download includes the audio.

This layout is authored for eight seconds, landscape, and three headline words.
Headline glyphs support printable ASCII; unsupported characters fail the build
before writing an output directory. Long copy needs visual review and layout
adjustment. Portrait requires a separate composition.

Use `window.seekComposition(seconds)` or `window.__timelines.main` to inspect
the generated composition at an absolute time. Keep edits in the template and
brief; a build overwrites `index.html`. Changes in picture cue timing require
matching changes in the audio manifest.

## Reproduce

From the repository/worktree root, reuse the installed Node 24, Playwright,
Sharp, esbuild, FFmpeg/FFprobe and cached Hyperframes 0.7.68. No automatic
installation, authentication, cloud analysis or paid generation occurs.

```powershell
node workflows/assets/grifon-motion-depth/build.mjs
node workflows/assets/grifon-motion-depth/audio.mjs
node workflows/assets/grifon-motion-depth/render.mjs check
node workflows/assets/grifon-motion-depth/verify-source.mjs
node workflows/assets/grifon-motion-depth/verify-type.mjs
node workflows/assets/grifon-motion-depth/render.mjs render
node tools/artifacts/build-motion-depth-review.mjs
node workflows/assets/grifon-motion-depth/serve.mjs
```

The builder requires the repository's canonical logo, Inter font and existing
GSAP asset. Already generated source playback uses only the committed local
vendor files and embedded assets. `build-font.mjs` can regenerate raw font
outlines using the existing cached FontKit; ordinary copy edits do not need it.
Dependency/cache location overrides are documented in the build/render helpers.
Hyperframes telemetry and provider-backed snapshot descriptions are disabled.

`render.mjs render` captures 240 native-resolution frames using two workers,
then performs measured two-pass loudness finishing and verifies the candidate
before replacing the final file. `render.mjs finish` deliberately reuses the
last silent render; rerun `render` after picture changes. Generated WAVs and
capture intermediates are ignored and reproducible.

The local preview serves only the standalone review at
`http://127.0.0.1:4186/`. It binds to loopback, never publishes or exposes the
repository. A phone connected only remotely cannot use its own localhost to
reach the desktop. Use the MP4 or standalone HTML download for that case.

## Verification recorded 2026-10-03

- Final MP4 SHA-256:
  `6de26c71a88073682c2a2532cc2fadde16f14ebc8863085f8bea54d68ef1bd55`.
- Full FFmpeg decode and FFprobe: 240 frames, 8 seconds, 1920 x 1080,
  30 fps, H.264 yuv420p, stereo AAC at 48 kHz.
- Encoded mix: -15.78 LUFS integrated, -2.00 dBTP. The original score is
  deterministic, eight seconds, stereo, and has zero clipped PCM samples.
- Hyperframes gate: zero lint/runtime/layout errors or warnings.
- A final compiler-escaping-only packaging change removed generated GLSL
  trailing whitespace. Node VM comparison confirms all 141 shader chunks,
  18 shader-library pairs and 422 exported API keys remain identical. The
  source/browser and film checks preceded this packaging change; the final
  movie is unchanged. Proof is in `qa/packaging-check.json`.
- Actual Chromium source frames: 15 nonblank samples, four intended motion
  windows, exact material cuts with unchanged camera pose, safe closing lockup,
  and identical pixels after non-linear seeking.
- All three word contacts have zero position offset at their audio cue and
  their entire pre-roll is visible. Contacts between 30 fps frames are within
  one display frame of the audio event.
- Disposable `YOUR NEXT IDEA` edit: re-rendered sample pixels changed only
  the opening/type beats; material and closing pixels were identical.
- Native Inter rasterization versus normalized Three front-face silhouettes:
  N/A/O overlap above 0.999. The original malformed A fails the same 0.985
  threshold. Blank/frozen negative controls are rejected as well.
- Independent source and encoded-frame review resolved malformed type, early
  contacts, font notice, unsupported-character validation and review-page CTA
  findings. Final mobile results are recorded separately in `qa/mobile-smoke.*`.
- Unchanged application baseline on base main `3da5bc7b` plus this asset work:
  `npm.cmd run build` exit 0; `npx.cmd vitest run` exit 0, 1,414 tests passed,
  32 default skips. The production agent ran both with process-spawn escalation
  after the initial sandbox-only `spawn EPERM` attempts; evidence is in its
  tool transcript. No paid/live switches were set.

Direct subjective listening, excitement and reference-audio fidelity remain
pending Neil's playback. Numerical measurements cannot establish those.
Software Chromium checks do not establish real Android WebView behavior.
This is abstract brand motion, not proof of generated ad output or a shipped
motion feature. Local generation spend: USD 0. No deploy or merge is authorized.
