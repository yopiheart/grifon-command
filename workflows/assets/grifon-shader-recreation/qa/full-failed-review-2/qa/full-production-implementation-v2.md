# Full candidate v2 production

Produced a fresh full landscape candidate from the frozen focused-v5 runtime.
Independent focused and qualified shell/source reviews released this production;
full native/timed visual review and listening assessment remain pending.

## Changes per file

- `qa/full-capture-producer.mjs`: exact byte copy of current producer
  `bbd8df71f403f6fc4d437b26df6110dc22d3155cff55572fa1efae26c7338e02`
  at the new capture boundary. The historical
  `d1554500d1a3f7c999d895e2a5c9457c5fd895a6752a8061a3fc9d2a24f852ff`
  snapshot remains unchanged in the failed-v1 preservation.
- `.tmp/full-frames`: 710 newly captured PNGs for native indices 222-931,
  with a new source/producer/frame hash receipt. The directory was absent before
  this capture; failed-v1 raw frames were not reused.
- `grifon-recreation-landscape-silent.mp4`: fresh continuation encode joined by
  stream copy to the accepted 222-frame opening, using explicit concat duration
  7.407400 and native track/movie timebase 1/30000.
- `grifon-recreation-landscape-provisional.mp4`: stream-copy mux of that video
  and the unchanged approved AAC master. No `-shortest`, stretch or re-encode.
- Current full media/render/temporal/audio/source/guard/poster QA: regenerated
  against the new film. Each original failed-v1 working QA file was verified
  against its preservation receipt before overwrite. V4/v5 focused snapshots,
  reports and pair folders remain unchanged.
- `qa/full-production-v2.json`: links the new media and proof hashes, commands,
  readiness results, exact replay and post-export frozen-boundary checks.

No changes to the 13 frozen runtime/asset inputs, accepted opening inputs/movie,
application, providers, prompts/models, dependencies, player, private root pair
builder/server or Git state were made.

## Verified technical results

| Check | Result |
|---|---|
| Fresh captured continuation | 710 frames, native 222-931 |
| Media format | 932 frames, 1920x1080, 30000/1001, yuv420p, H264 |
| Native timeline | Every frame PTS equals `n * 1001`, timebase 1/30000 |
| Accepted prefix | All 222 decoded frame MD5 values match the approved opening |
| Runtime replay | All 106 nonlinear reseeks and 106 fresh-runtime captures match exactly |
| Readiness | Initializations 5439.8094ms and 4001.8551ms; unchanged 60000ms gate |
| Runtime/network | Zero errors, zero external requests |
| Decode | Strict FFmpeg decode passed |
| Black tail | All 79 captured and decoded frames, 853-931, are exact black |
| Audio | All 1461 AAC packet payloads/timing/priming and master stream metadata preserved |
| Logical PCM | 1495040 stereo sample frames match the approved master exactly |
| Negative guard | Edited runtime fixture rejected; original media and producer receipt unchanged |
| Post-export stability | All 13 runtime inputs, current focused 55 PNGs and 131 preserved v5 payloads unchanged |

Commands, each exit 0:

```text
node render-full.mjs render
node render-full.mjs mux
node render-full.mjs verify
node verify-full-guard.mjs
node verify-full-capture.mjs
```

Video duration is 31.097733 seconds. Actual container and AAC stream metadata
are 31.146000 seconds (`duration_ts=1495008`, timebase 1/48000); logical decoded
PCM duration is 31.146666667 seconds. The original master has the same metadata
and logical sample count. Both packets and decoded PCM are preserved, rather
than retiming the master to change rounded metadata.

The unchanged final-source build/Vitest checks remain in
`qa/full-shell-v5-checks.json`: build passed and default Vitest passed 1432 tests,
with 32 default skips. No duplicate broad suite was run after production because
the source bytes did not change.

## Frozen media and receipts

| File | Bytes | SHA256 |
|---|---:|---|
| Provisional MP4 | 25018826 | `15cbddf056015c6ab16986fb5a22abd71ec03fb8c8b3b0903efcd6de1cbd37ce` |
| Silent MP4 | 24161680 | `7cdc68b2f4fb89472965a6aaeb16a492fb30e665de2d65c867c229cf74727b5b` |
| `qa/full-media.json` | 3119 | `2bdc1c2e192385df6cfa06d8c3df6269632317b9f4c297ebbf116e5f3a9f2c88` |
| `.tmp/full-frames/receipt.json` | 102302 | `b480d87f32c122d8ba640704fb57b4b58bc79824483a1e5e7e14b027f5ec73f3` |
| `qa/full-source-receipt.json` | 8260 | `f13fb634415ec0f9c46243025cfb71062653aa60964d817c9dca632ae74a98b2` |
| `qa/full-production-v2.json` | 5949 | `68628d2ea9e54c71de66de4da0317c656b16a8be88f5bf4167aa5ae794d9d570` |

The detailed production JSON also binds silent/render/media verification,
temporal, AAC, negative guard, producer snapshot and actual native poster proofs.

## Remaining gates

No full visual PASS is claimed from these technical checks. Independent all-932
native-frame inspection and actual timed playback must assess composition and
motion. Soundtrack status remains `SONIC_UNVERIFIED`; packet/PCM equality is not
a listening assessment. Root owns the private comparison, player and Git work.

## Deviations

None. No paid/provider calls, new autopsy, installs or publishing occurred.
