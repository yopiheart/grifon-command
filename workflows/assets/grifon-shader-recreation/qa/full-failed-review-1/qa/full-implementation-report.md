# Full landscape candidate: implementation receipt

Status: full candidate frozen for independent native and timed review. Technical
export checks pass; this report does not declare visual fidelity or sonic PASS.

## Frozen outputs

| File | Bytes | SHA256 |
|---|---:|---|
| grifon-recreation-landscape-provisional.mp4 | 27719697 | 045ba2b06e283f2894fd8581c49fac8ef51780244c5cf6ec7a9fdfcb78c27dab |
| grifon-recreation-landscape-silent.mp4 | 26862607 | e9ef40cbe1ce945676658c09e10413881556a363d58dc5725a7587284afad329 |
| qa/full-media.json | 3119 | d2ded0249b0975470fb107fcd1c19eda6b8f9cb0cb1ebe5a5df83ff5d2615162 |
| qa/full-poster.png | 246185 | 1e8d54f6f57f5c6db2f7bffb716a64e6886168d3b703022c48c9640d47b39003 |

The video is 932 frames,1920x1080,H264/yuv420p,30000/1001 with timebase
1/30000 and video duration31.097733. Actual AAC stream/container metadata is
31.146000; logical decoded audio is1495040 stereo sample frames at48000Hz,
31.1466666667s. All1461 AAC packets including payload hashes,timing,duration,
priming side data and actual stream metadata match the unchanged approved master.
The soundtrack remains SONIC_UNVERIFIED. The -shortest option was not used.

## Changes by file

- full.json: source-measured36 continuation shot intervals; English copy,
  canonical20-name catalog,palette,sample frames and editable camera keyframes.
- build-full.mjs: checks the immutable pilot and canonical module names; copies
  seven existing local font/vector/logo/capture inputs byte-for-byte, validates
  capture provenance and measures visible logo alpha bounds.
- assets/full/manifest.json and seven local assets: hash/size/source bindings to
  unchanged existing inputs. Script/Storyboard remain actual manual example
  captures; the film keeps conspicuous Example project/Manually prepared copy.
- full.html: independent local rendering canvas,font and frozen Three runtime;
  accepted opening is decoded only for preview, never rerendered for export.
- full.js: separate post222 Three runtime with exact absolute frame seeks,
  deterministic camera/material motion, dense catalog, genuinely open curved
  point shell/folded lobes/pinwheel, smooth local Inter glyph extrusions,
  unchanged disclosed product captures, parented CREATE ADS canvas type,
  canonical gold logo and small italic GRIFON lockup, shared end recession/fade.
- full-surfaces.frag: authored native GPU rosette, perforated polygon strip,
  segmented dotted aperture, huge lens, character reprise, four distinct grain/
  stripe cuts, NW-to-SE irregular particle ribbon,binary/panel field,organic
  localized lower-sphere glow and black tail. Accepted pilot GLSL is unchanged.
- render-full.mjs: local-only allowlist renderer with60s readiness bound;
  106 samples/nonlinear seeks/fresh runtime replays;710 native continuation
  captures; bound capture/encode receipts; matching H264 encode and stream-copy
  concat with explicit7.407400 prefix duration; strict decode,native PTS and
  prefix decoded-framemd5 checks; master-exact AAC mux proof; actual decodedf114
  poster; verify rejects existing media whose producer source binding changed.
- qa/full-capture-producer.mjs: exact historical capture/initial encode producer
  snapshot SHA d1554500d1a3f7c999d895e2a5c9457c5fd895a6752a8061a3fc9d2a24f852ff.
  Current producer SHA c9e0402c4262b9e2ac6fe77f2c06fc977bd3c6970168faa712dcb2e93d0782c0
  includes the later container/poster/audio verification fixes.
- verify-full-guard.mjs: private edited-runtime negative control; expects exit1
  before receipt/media mutation, records original and modified hashes.
- verify-full-capture.mjs: checks all13 continuation runtime inputs,all9 frozen
  pilot runtime inputs,original asset byte equality,710 contiguous captured
  frame hashes,106 sample hashes,historical producer and current export bindings;
  separately decodes all79 black-tail frames and checks zero RGB.
- make-full-sample-pairs.mjs: private source-aligned native preview boards with
  exact source/draft hashes. Older draft boards remain draft evidence; current
  full-render samples/receipt bind the frozen candidate.
- qa/full-*.json,full-frame-*.png and full-render-contact-sheet.jpg: source,
  readiness,seek,capture,export,PTS,prefix,AAC,negative-control and black-tail
  evidence. qa/full-build-output.txt and full-vitest-output.txt preserve checks.

## Confirmed checks

Commands run from the same grifon-shader-launch worktree:

```text
node workflows/assets/grifon-shader-recreation/build-full.mjs
node workflows/assets/grifon-shader-recreation/render-full.mjs render
node workflows/assets/grifon-shader-recreation/render-full.mjs remux-video-metadata
node workflows/assets/grifon-shader-recreation/render-full.mjs mux
node workflows/assets/grifon-shader-recreation/render-full.mjs verify
node workflows/assets/grifon-shader-recreation/verify-full-guard.mjs
node workflows/assets/grifon-shader-recreation/verify-full-capture.mjs
npm.cmd run build
npx.cmd vitest run
```

All final commands exited0. Build completed in9.39s; existing Browserslist age
and chunk-size warnings remain. Vitest:116 files/1432 tests passed,9 files/32
tests skipped;45.04s. No paid/live flags were set.

Standalone readiness total3439.0155ms and fresh-runtime2603.9275ms, both within
the unchanged60s bound. Hardware renderer is ANGLE AMD Radeon D3D11. Local font,
textures and GPU readback passed.106 nonlinear and106 fresh-runtime sample
replays matched exact PNG hashes; out-of-range frame932 was rejected. Errors
and external requests are empty; provider calls/spend are0.

All932 decoded native PTS equal n*1001. All222 prefix decoded frame MD5 values
equal the immutable pilot SHA6815c6e5143257c2d8b4fa368735677754b8d57cc0685ccb7d2ce380459a1c69.
All79 native black-tail frames853..931 are identical, with decoded RGB max0.
The negative control rejected edited full.js with the expected source-binding
error and preserved the producer receipt and encoded MP4 byte hashes.

## Deviations

- Initial encode default movie_timescale1000 rounded stream metadata to31.098
  despite already-correct native PTS. Stream-copy-only remux with movie timescale
  30000 corrected metadata to31.097733. Capture/runtime/pilot pixels and packet
  timestamps were unchanged; initial container SHA is retained in the silent
  receipt. No visual rerender was needed.
- Approved AAC actual stream metadata31.146000 differs from logical decoded
  31.1466666667 by0.667ms. Per root/critic instruction, verification preserves
  exact original metadata/packets/decoded samples and records a1ms allowance;
  it does not retime,reencode,stretch or edit the master/recipe.
- Initial poster extraction failed after otherwise successful mux/proofs:
  `[AVFilterGraph] No such filter: '114)'` / `Error reinitializing filters!`.
  The select expression was corrected to `select='eq(n,114)'`; final mux,
  poster and positive verification succeeded. No runtime change was involved.
- Macro shell/fold geometry and reflections are free authored approximations.
  Root preview found the corrected structures adequate to produce a full
  candidate, with remaining fold pose/reflection differences reserved for the
  independent full gate. No still-preview observation is treated as fidelity PASS.
- Geometry/material/caption parameters remain editable in full.js/GLSL; some
  initial documentary camera defaults in full.json are not runtime overrides.
  In particular actual CREATE ADS width was enlarged in full.js for reference
  framing. Copy,cuts,catalog keyframes and absolute seek use full.json.
- Portrait was not implemented: landscape fidelity is first, and an automatic
  crop would destroy these wide source compositions. Root owns the final player,
  repository checks,Git/NOW/PR and independent fidelity verdicts.

## Remaining work

Confirmed technical export and reproducibility; independent full native/timed
visual review is pending. Sonic similarity is unverified. No assumption of
close-recreation PASS,exact music identity or audio clearance was made. No
application,tuned prompt/model,dependency,provider or accepted pilot edits.
No Git commit,push,publishing,merge,deployment or production writes were performed.
