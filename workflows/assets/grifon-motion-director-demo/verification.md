# Motion Director demo verification

2026-09-17. Local deterministic production; provider/generation spend USD 0.

## Final exports

| Export | Dimensions | Duration / frames | Decoded audio |
| --- | --- | --- | --- |
| portrait.mp4 | 1080x1920 | 12.00s / 288 at 24 fps | Stereo AAC, 48 kHz |
| landscape.mp4 | 1920x1080 | 12.00s / 288 at 24 fps | Stereo AAC, 48 kHz |

Both fully decode without FFmpeg errors. `qa/*-media.json` records actual stream
metadata. Final hashes and audio measurements are in `qa/audio-check.json`:
both measure -13.82 LUFS integrated and -1.41 dBTP. Music fades in/out; no VO.

## Evidence

- Hyperframes 0.7.68 `check --at-transitions`: both pass with zero lint/runtime/
  layout findings. Portrait sampled 89 moments, landscape 95, including tween
  transitions. Contrast sampling is not a certification of every frame.
- Native Hyperframes snapshots: actual browser-rendered frame sheets in
  `qa/portrait-frames` and `qa/landscape-frames`. These are composition frames,
  not screenshots of the mobile review page.
- Actual MP4 frame inspection and phone-sized frame samples: independent smoke
  evidence under `qa/smoke/` and `qa/smoke-review.md` when complete. Separate from
  full browser playback and subjective listening.
- Revision isolation: `qa/revision-check.json`, ten browser-rendered comparisons.
  DESCRIBE -> CREATE changes pixels only inside the prompt card at the changed
  beat; four other sampled beats per format are pixel-identical.
- Audio negative control: initial single-pass mix had +5.27 dBTP after encoding.
  Explicit post-resample stereo limiter fixed it. The exact initial filter chain
  is reproduced in scratch by `media-check.mjs`; the new check rejects that
  defective output and passes both delivered files. The original measurement
  remains in `qa/audio-measurement.txt` as historical failure evidence.
- Independent source review corrected the initial raster-badge/wordmark mismatch
  to canonical `brand-spec.md` GrifonMark. See the proposal's independent review.
- `npm.cmd run check:codex`: before activation, 31 active entrypoints, zero errors,
  all 26 tests pass. After exact patch approval: 32 entrypoints, zero errors.
  Isolated candidate validation also passed before applying the approved patch.
- `npm.cmd run check:artifact-anchors`, JavaScript syntax checks, and patch
  applicability pass. No application build/full suite required: no app code or
  application dependency files changed.

## Limits

The CUA browser URL policy rejected the local review-page URL and explicitly
prohibited alternate-browser/indirect workarounds. No workaround was attempted.
Review-page mobile screenshot, controls/overflow and full browser playback are
therefore blocked, not passed. Machine decoding and sampled video frames do not
establish subjective audio quality, physical-phone playback, or Neil's creative
acceptance. The offline page and MP4s are available for the user's own review.

The skill's exact instruction patch was separately approved and installed. Candidate
dry-run outputs test written behavior, not fresh-session automatic activation or
rendered client work. No future provider quality/cost guarantee follows.
