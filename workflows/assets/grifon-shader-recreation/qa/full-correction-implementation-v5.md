# Shell correction v5: focused gate pending

Changed only the point-shell at native frames 357-376. The current 55 focused
images are frozen for independent review; no new 710-frame capture or full export
has been made. The existing full film remains the failed first candidate.

## Changes per file

- `full.js`: precomputes one deterministic uncapped, continuous shell geometry
  for each of the 20 native shell frames. The secondary mouth follows editable
  offsets and faces the local viewer without adding a separate tube or disc.
  Backface depth attenuation keeps its deep wall dark while its rim emits.
  A physical-length Hermite collar matches the tube radius derivative, replacing
  the former near90-degree row bend. A broad middle saddle and a local far
  shoulder join the two mouths into a surrounding curved row field. Primary
  inset/position keys clear the 369 overlap and reduce the 357 entry. Low-frequency
  rim deformation fades near the secondary endpoint to retain its oval contour.
  At 376 the far shoulder stretches along world vertical, extending its lower
  field through the crop while preserving both aperture rims.
- `full.json`: adds editable shell mouth offsets, organic amplitudes, primary
  inset/position, far shoulder and vertical shoulder keys. Copy, cuts, shot starts,
  dimensions, audio recipe and every non-shell configuration value are exact
  matches to the v4 boundary.
- `assets/full/manifest.json`: updates only the spec hash. Its seven local asset
  bytes, provenance and other fields remain unchanged.
- `make-full-correction-pairs.mjs`: changes only the new pair destination to
  `.tmp/full-correction-4-pairs`. Source extraction was not invoked.
- `.tmp/full-freeze-focused-v5.mjs`: saves a new 131-payload focused boundary,
  refuses an existing destination and checks source/capture bytes before copying.
- `qa/verify-full-shell-v5.mjs`: verifies scoped source/config changes, exact
  non-shell native PNG stability, current capture binding and accepted opening
  identity. Three in-memory negative controls reject unrelated source, config
  and image-byte edits; no production file is mutated by those controls.

`full-surfaces.frag`, Three vendor, final glyph transmission shader/backing,
burst, canvas, whirl, folded group, pinwheel, end lockup and all accepted opening
inputs/movie were unchanged. The previously documented glyph 3-only prescribed
roughness exception still applies to all glyph 3 surfaces, not just its cap;
this correction does not change it or the vendor shader.

## Evidence and limits

The focused producer receipt is `qa/full-focused.json`, SHA256
`13f5f530ce2cdf81d53e4ffc28c0456cdec6fc95b931ae7aaa553627c7000108`.
The 55-pair receipt is `.tmp/full-correction-4-pairs/receipt.json`, SHA256
`5e96d56162dad04f1d274d4816958b2a3a6098c843ced5eafc8fc04014dfc322`.
The new byte-preservation receipt is
`qa/full-focused-review-5-inputs/preservation.json`, SHA256
`6a567858556a286cbba74513f64ca7bf44ab73487227c1357c24e7365204a4dc`.
The 131 payloads include 13 render inputs, helpers/receipts, 55 authored PNGs and55
pairs; no audio was read or copied for visual QA.

Confirmed by `node qa/verify-full-shell-v5.mjs`: 51 non-shell PNGs are byte-identical
to v4, ten non-shell render inputs are unchanged, source bytes outside the
explicit shell block/selection are exact, non-shell configuration is exact,
and the nine accepted opening inputs plus movie retain their approved hashes.
The four shell PNGs changed. This proves scope and reproducibility boundaries,
not visual fidelity. Stability receipt SHA256:
`fa74ab6ef633c1780fd8088840ed02fd2b274c4219ea2d598179e8b8e9a287eb`.

Fresh hardware GPU initialization completed in 4599.9604 ms against the unchanged
60000 ms readiness gate. Local assets/fonts/uploads were ready; the actual
AMD/ANGLE readback was nonzero. Console errors and external requests were empty.
Private probes 14-18 and exact runtime copies remain preserved. Probe 18’s first
three PNGs are byte-identical to 17; only 376 changes with the final vertical
extension. The final 376 pair shows a broad shoulder reaching top/left/bottom
crop with both visible dark openings. Independent review decides PASS/HOLD.

Read-only CPU proofs are preserved under `.tmp/full-shell-math-v5`. They verify
actual frozen input hashes, finite aperture rays, collar derivatives and
projected extents. Shortening the approach/bringing its deep bend forward was
rejected because it produced front-facing recess plugs or worse coverage.
A global far-shoulder variant was rejected at 369; final shoulder strength is
keyed by frame and the 369 primary collar overlap is corrected geometrically.
The world-vertical 376 proof preserves both aperture bounds and all 40 sampled
variant rays hit backfaces first. Finite rays and bounds are not exhaustive
surface visibility or motion evidence; actual focused PNGs provide the next
review layer.

## Checks

`node --check full.js`, `node build-full.mjs`, the actual four-pose probe,
`node render-full.mjs focused`, pair creation, byte-preservation and scoped
stability verification passed. The required final-source `npm.cmd run build`
passed, including its prebuild PowerShell ASCII check. `npx.cmd vitest run` passed
116 files/1432 tests, with 9 files/32 default skips, in 44.91 s. Paid/live switches
were unset; settings, timeouts and skips were not changed. Historical v4 green
logs remain unchanged. The v5 checks receipt is `qa/full-shell-v5-checks.json`,
SHA256 `1164620bbea80d6d44fff3089669f15c2ab1105f9cdf789eb600e2439efef8fa`.
All 131 preserved payloads and the current source/capture boundary were rehashed
after the checks and remained unchanged.

## Remaining work

Independent focused 55 review and source audit remain pending. A focused PASS
authorizes a fresh full candidate only. Full native 932 inspection, actual timed
playback, accepted 222 decoded-prefix identity, native continuous PTS and soundtrack
assessment remain separate gates. Main rim regularity, point spacing and exact
source contour differences are documented residuals. The soundtrack remains
`SONIC_UNVERIFIED`; this visual correction makes no listening claim.

## Deviations

None. All runtime changes stay within the authorized shell geometry/material/
camera scope. No paid/provider calls, installs, tuned/application changes, vendor
edits, Git actions or publishing occurred.
