# Proven pilot and reusable parts

This is evidence from the Vivo X80 study on `codex/blender-product-reveal`, not
a guarantee for new subjects or providers. See `assets/vivo-x80-ugc/user-review.json`
for Neil's accepted 9/10 baseline and SFX/music gap. Use NOW.md for resume state.

## What ran

- `tools/build_vivo_x80_previz_v2.py` ran inside background Blender to author
  a 15-second, ten-shot guide with two proxy actors and a phone.
- `tools/build_vivo_x80_cut_v2.mjs` made separate review/clean outputs and local
  evidence. The clean guide was 480x854, 24fps and silent.
- A product photo supplied appearance; the guide supplied direction. One exact
  approved Seedance 2.0 request produced a live-action result with sampled story
  and cast continuity. Timing drift and a minor wardrobe color drift remained.
- `tools/run_vivo_x80_ugc.mjs` is a fixed paid-test entrypoint. Its attempt is
  consumed. The older bottle runner's attempt is also consumed.

## Patterns to reuse, not generic commands

| Existing file | Useful pattern | Fixed limitation |
| --- | --- | --- |
| `tools/build_vivo_x80_previz_v2.py` | Geometry helpers, proxy adults, camera keyframes, timeline markers, baked animation, manifests, contact/projection checks | Vivo geometry, set, cast, shot list, acting, output paths and frame counts |
| `tools/build_vivo_x80_cut_v2.mjs` | Checked FFmpeg exits, full decode, boundary samples, hashes, separate clean and review versions | Vivo labels, paths, resolution, duration and motion thresholds |
| `tools/run_vivo_x80_ugc.mjs` | Exact asset binding, private staging, durable one-attempt ledger, sanitized evidence, owned-file cleanup | Fixed model/assets/request/digest and exhausted ledger; no arbitrary `--spec` support |
| `tools/analyze_video.mjs` | Existing reference-analysis route | Makes Gemini API calls; verify price and paid approval before using |

Blender remains the local scene/render engine. Users can be shielded from its
installation only after a worker-backed Grifon integration exists. The current
pilot does not supply that worker or automatic prompt/video reconstruction.
