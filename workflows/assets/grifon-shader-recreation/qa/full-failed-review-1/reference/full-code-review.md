# Independent full-film source review

**PASS within this source/provenance scope; no open actionable finding.**
The audio-duration guard finding below is addressed. This does not approve full
visual fidelity, continuous playback, soundtrack similarity or direct listening.

## Bound result and method

Read all continuation runtime, asset/build/render sources and the private full
paired-review builder/player/server. Rechecked the final changed producer
verification and container-remux branches. Independently hashed all13 runtime
inputs against the capture and final media receipts, checked710 capture record
indices/names,106 unique replay samples and contiguous half-open222-932 shots.
No GPU capture, media rerender, broad tests, provider, install, secret or Git
operation was performed. Existing producer QA is evidence, not a new run by this
reviewer. Only assigned independent reports were written.

| Bound item | SHA256 |
|---|---|
| Corrected final provisional MP4,27,719,697 bytes | `045ba2b06e283f2894fd8581c49fac8ef51780244c5cf6ec7a9fdfcb78c27dab` |
| `qa/full-media.json` | `d2ded0249b0975470fb107fcd1c19eda6b8f9cb0cb1ebe5a5df83ff5d2615162` |
| Current `render-full.mjs` and final mux/verification producer | `c9e0402c4262b9e2ac6fe77f2c06fc977bd3c6970168faa712dcb2e93d0782c0` |
| Frozen capture producer, `qa/full-capture-producer.mjs` | `d1554500d1a3f7c999d895e2a5c9457c5fd895a6752a8061a3fc9d2a24f852ff` |
| `.tmp/full-frames/receipt.json` | `9da834c22611aba4c9dac48be87f5845c7ecb4dc934fd670bd6b55542a1afdee` |
| `qa/full-render.json` | `cabc0126d2c5371d030d3e279e349c826dc14d5a7a62a2d90090ad52abb57003` |
| `qa/full-media-verification.json` | `4b338a7e084826fd45fce13f5d7289c51810e05fc7d36abaf3393cc08c665117` |
| `qa/full-temporal-mux.json` | `8d336402130aa05c3dd9521e1eddbf60366ba5bb183bcb201206059189e4e3ff` |
| `qa/full-audio-mux-proof.json` | `1513d98c3ce7ee62a7a19c2d38e118d023947dfc4806f4ab7b6a3c95b8a36541` |
| `build-full.mjs` | `dbfe243676e6ce8173a1f64265ceaee4a3e32d6878cd95bb26011f88eebbb2bf` |
| `build-full-paired-review.mjs` | `cae06400ccf99d335332176d9263afe587d3c1531628e377d9f15cc4cf202f1a` |
| `paired-full-review.html` | `d65ecb907938b12e83d3bfe4f93c83c57dc27292ccd5b4d3ed0f1e9360e80475` |
| `review-server.mjs` | `0b26570884c805f543ce742aa44dd9268fc9fb7151a1a0d992d6d14d2502cb16` |

The13 source hashes in the final media receipt all match current bytes and the
capture receipt. The four authored runtime inputs are `full.json`
`729501ae328949605d5247636d1c0ec6a66e79de6a9ee5560f0f3f50f2650956`,
`full.html` `3fe9681531b87d9dbe8475cedb98d82d799f36759d5cb630165877cc9cd70206`,
`full.js` `20ca19a987f69bb6d42c3d2e4330102ba75592d647212c8cf28f1cbffd3ecd57`,
and `full-surfaces.frag`
`8561080f540cdecb3d86a62f00f424294e8b1359d33abd9a7695ddc61cf9d73a`.
The other nine are the local Three runtime, manifest, Inter contours/font/license,
canonical logo and three genuine product captures recorded in that receipt.

## Addressed finding

**P2: the initial mux guard equated logical sample duration to AAC stream
metadata.** The unchanged approved master has1495040 decoded stereo48kHz sample
frames,31.146666667s logical duration, while its AAC metadata is31.146000s,
duration_ts1495008. A2-microsecond metadata requirement against31.146667 would
reject the intended lossless stream-copy mux. This was reported before freeze.

The current producer permits at most1ms logical/metadata difference and adds
stronger equality checks against the master: all1461 AAC packet payload hashes,
PTS/DTS/durations/sizes/priming side data; actual stream duration/timebase; and
the complete decoded float32 PCM bytes and1495040 sample frames. The final bound
proof records identical packet JSON SHA256
`634f339de44edbad8d69d31d26e23ddf48c0feaaea3f7e63951280000984ef87`
and PCM SHA256
`f9357fb441f1c36f0264268d9e4cfd3765a975c15aa547e6be998c8b1109494d`.
Audio remains explicitly `SONIC_UNVERIFIED`.

The known container rounding during handoff was also corrected before freeze:
movie timescale30000, video duration31.097733,932 native PTS and222 decoded
accepted-prefix frames preserved. The final receipt distinguishes the31.146000
audio/container metadata from31.146666667 logical decoded audio. The provisional
rounded draft is not the reviewed final media binding.

## Inspected correctness and boundaries

- **Absolute native seeking.** `seekFullFrame` accepts integer frames0-931.
  Continuation branches reset visibility/camera/material/uniform state and use
  frame-derived transforms, shader motion and text state. Texture loading/font
  readiness and shader prewarming complete before capture. Capture invokes
  native222-931 directly; the editable prefix preview video is not an export
  input. Existing106 backward/nonlinear and106 fresh-runtime exact comparisons
  record PASS, invalid932 rejection, empty runtime errors/external requests.
- **Capture and encoded provenance.** Encode requires source equality to the
  existing capture receipt,710 frame records in native order and each PNG byte
  hash. Mux/verify require existing source/file/size/hash bindings rather than
  relabeling an unrelated MP4. Capture producer d155 is preserved separately
  from the final guard/remux producer c9e. Verification preserves the production
  receipt and writes separate evidence. Unknown commands reject explicitly.
- **Prefix/native time.** The accepted silent pilot SHA6815 is stream-copied as
  the222-frame prefix, with exact7.407400s concat duration and native1/30000 video
  timebase. The final proof requires every decoded PTS to be n*1001 and compares
  all222 decoded prefix frame MD5s to the accepted pilot. The final receipt reports
  strict decode PASS,1920x1080 yuv420p,932 frames,30000/1001. Audio mux retains the
  longer approved AAC tail instead of trimming video/audio to one duration.
- **Editable local inputs.** Source contains real geometry, shader materials,
  ordered frame phases and genuine unchanged Script/Storyboard capture textures
  with example-project disclosure. Build binds canonical module names, component
  capture provenance, font/license and canonical logo bytes. Subordinate motion
  times and geometric widths also live in the JS/shader; retiming those requires
  corresponding source edits, not only the shot-table JSON. No provider/live
  wizard operation is in this offline authoring path.
- **Private pairing.** The full comparison builder locks original reference and
  accepted pilot hashes, input dimensions/frame count/rational fps, native PTS,
  decoded prefix equality and current full receipt/media bytes. It rechecks input
  bindings after constructing a silent same-stream hstack. The pair stays in
  private ignored scratch storage. The loopback review server exposes only fixed
  GET/HEAD routes, validates ranges and serves no-store/nosniff; it does not add
  the reference to the standalone Grifon deliverable.
- **Timed player evidence boundary.** The comparison page uses one stream and
  records presented frames separately from its clock, with native seek/step and
  speed controls. Actual advancing pixels and continuous-motion judgment still
  require the assigned playback review. Receipt labels alone are not browser
  cryptographic verification or a fidelity verdict.

This narrow audit does not assert cross-GPU pixel portability, independent
re-execution of all producer QA, a completed delivery-player smoke, full-film
visual approval or hearing. Those are separate recorded gates.
