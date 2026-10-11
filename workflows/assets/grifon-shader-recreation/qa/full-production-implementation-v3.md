# Full continuation timing correction, version 3

Technical production is complete. Independent whole-film native and actual
timed fidelity review, regenerated offline player checks, and final audio
review remain separate gates. Sound remains `SONIC_UNVERIFIED`.

## Changes per file

- `full.js`: replaced the pattern phase calculation with the existing shot
  key's exact midpoint `.125/.375/.625/.875`. This restores the family cuts
  at native frames 400 and 403 without changing the shot table or materials.
- `full-surfaces.frag`: clamped the erase threshold to `.125–.875`. Native
  636 now begins the erase and 639 retains a final residue; thresholds at
  637–638, row randomness, and the black cut at 640 are unchanged.
- `qa/verify-full-timing-v3.mjs`: compares every original and fresh raw PNG,
  checks capture/source bindings, and requires exactly those four changes.
  Its negative controls reject the actual uncorrected preserved sequence and
  an unexpected fifth change. This proves the bounded byte change, not visual
  resemblance.
- New v3 QA receipts and logs record the source boundary, raw witness,
  production properties, post-edit build, and complete default Vitest run.
  No accepted-opening input, configuration, asset, Three vendor, provider,
  application, dependency, audio recipe, or render helper changed.

## Preservation and exact scope

Before editing, the failed `15cbdd…` candidate was preserved under
`qa/full-failed-review-2` and private `.tmp/full-failed-review-2` using the new
plan/apply helpers. The receipt SHA-256 is
`27d153f04e876a1f9ab294a98d9b9a4d2316577298b583c321eeb9b80fd40e06`.
All 185 selected public files and 22 private media/widget/control/binding
files were copied and verified byte-for-byte. All 710 raw capture PNGs and
their receipt were verified before and after a checked workspace-local move.
Eight older preservation receipts were bound in place without recursive
duplication. No raw reference audio or audio masters/stems were copied.

The exact two-line substitution was checked against the preserved source.
The 11 other continuation inputs, nine opening inputs and accepted opening
MP4 remained unchanged. The producing helper and its capture snapshot remain
`bbd8df71f403f6fc4d437b26df6110dc22d3155cff55572fa1efae26c7338e02`.
The existing old-movie verification correctly rejected the changed inputs
without rewriting its producer receipt. All 13 corrected runtime inputs
were rehashed before and after production and the required checks.

## Confirmed production evidence

The fresh capture contains 710 continuation frames. All 106 nonlinear
reseeks and 106 samples in a fresh runtime matched exactly. Initialization
took 11,275.3702 ms and 6,563.9828 ms under the unchanged 60,000 ms gate;
there were zero browser errors and external requests.

`qa/full-timing-v3-raw-witness.json` verifies all 710 raw PNGs against the
preserved candidate: exactly `[400,403,636,639]` changed and the other 706
are byte-identical. Its SHA-256 is
`264eaa2c8f1a9abf7b9f0fa84b9d4375a052ee0f067e74251dea71390f4ecc98`.

The full export has 932 H.264 frames at 1920×1080, 30000/1001, time base
1/30000, with every PTS equal to `n*1001`. All 222 decoded opening frames
match the accepted pilot. Strict decode passes. All 79 captured and decoded
tail frames 853–931 are RGB zero. These are technical properties, not a
visual fidelity verdict.

The approved master is stream-copied unchanged: all 1,461 AAC packet
payloads, timings and priming match, stream metadata is preserved, and
1,495,040 decoded PCM sample frames match exactly. Video duration is
31.097733 s. Actual container/audio metadata is 31.146000 s, while decoded
AAC duration is 31.146666667 s. No audio retiming, re-encoding or `-shortest`
cut was used. The recipe and master binding are unchanged.

## Outputs and commands

- Provisional `grifon-recreation-landscape-provisional.mp4`: 24,994,401 bytes;
  SHA-256 `c99c93c8dd194946f757dbc078b0551ccd18aaecca6c2868f753cba8b0a59917`.
- Silent `grifon-recreation-landscape-silent.mp4`: 24,137,255 bytes;
  SHA-256 `e57f2fae3a7a7b7ded9dcce63ed98cd9c88136fd595a1765cffa3669a878df3b`.
- Media receipt `qa/full-media.json`:
  `e41cd21f0b234bab353578d554296136096af5fff52e00ca055f7866f455570a`.
- Capture receipt `.tmp/full-frames/receipt.json`:
  `dc079552beb97ed4f742b0961bce0434d01fa5782a1661287cc47ae4e61bec28`.
- Current source proof `qa/full-source-receipt.json`:
  `7dabc921763f90aee39c2247c79ad2a39fc445dda3bd325deba4e8549c2261d6`.
- Final production receipt `qa/full-production-v3.json`:
  `8b47f6a4efa646eff11fe211ea15d95512d13baa6c8a31b62c684b3903f55982`.

From the recreation directory, each command exited zero:

```text
node render-full.mjs render
node qa/verify-full-timing-v3.mjs
node render-full.mjs mux
node render-full.mjs verify
node verify-full-guard.mjs
node verify-full-capture.mjs
```

At the repository root, `npm.cmd run build` passed its normal PowerShell
ASCII prebuild check, TypeScript and Vite. `npx.cmd vitest run` passed all
116 active files / 1,432 tests, with the existing default nine skipped files
/ 32 skipped tests; duration 44.92 s. Logs and exact command exit records are
`qa/full-timing-v3-{build,vitest}-{output.txt,result.json}`. No live flags,
settings, skips, timeouts or dependency versions changed. These CPU checks
ran sequentially after GPU capture/export finished.

## Deviations

None. Zero provider calls and additional paid spend. No pair, offline player,
Git, publication or root documentation work was performed by this executor.

## Pending

The independent source/native/timed reviewers must decide whether the corrected
film meets the visual brief. Root owns the new comparison and offline player;
audio verification is independently bound to this export. Technical success
does not establish heard sonic resemblance or final artifact acceptance.
