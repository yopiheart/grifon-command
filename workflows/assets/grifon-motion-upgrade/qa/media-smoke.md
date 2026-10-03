# Full-upgrade native media smoke

Status: **PASS for native media smoke** against the actual final exports. Browser verification remains separate and blocked.

`node workflows/assets/grifon-motion-upgrade/qa/audio-preservation.mjs` passed in its default mode: accepted V08 baseline PASS, actual upgrade PASS, declared cue anchors PASS. The audit directly covers 93 of 99 original cue placements; the remaining original audio is preserved through the exact AAC payload identity check. This does not by itself establish visual contact synchronization.

Independent FFprobe and strict FFmpeg `-xerror` decoding also passed for both actual MP4s:

| Check | Full upgrade | Native before/after |
| --- | --- | --- |
| H.264 / yuv420p | PASS | PASS |
| Size | 1920×1080 | 1920×1080 |
| Nominal / average fps | 30/1 / 30/1 | 30/1 / 30/1 |
| Decoded video frames | 987 | 987 |
| Video / audio / container duration | 32.9 s | 32.9 s |
| Video and audio start | 0 s | 0 s |
| Audio | One AAC stream, 48 kHz stereo | One AAC stream, 48 kHz stereo |
| Strict full decode | Exit 0, no errors | Exit 0, no errors |
| Bytes | 5,190,198 | 3,824,847 |

Full-film SHA-256: `978d8e1d29bfbd40c89788a898377c5acca5d3ea7efcdfab1a50e71d4fbbff27`.
Comparison SHA-256: `695f7684a3f4710df6d7cf1ae6bf71ee98caa3c185c4018c26344df47401112d`.
Accepted V08, full upgrade, and comparison AAC payload SHA-256: `095701ccc7fe7292c70f888a1145c15736fa64648f98c71ef24f1f195d536998`.

Baseline and upgrade independently measured identically: -16.03 LUFS integrated, -1.35 dBTP, 7.9 LU loudness range. These are objective input measurements; no media was normalized or rewritten during testing.

The first audio-verifier attempt returned exit 1 because sandboxed Node `spawnSync` could not launch FFprobe (EPERM). Direct FFprobe calls passed. Retrying the exact existing verifier with elevation passed with exit 0. This was an environment restriction, not a media failure; no fixes were made and no helper process was started.

Narrow helper inspection initially identified two evidence limits: the black-tail report lacked a pixel threshold, and the render verifier lacked strict decode/AAC checks. Root subsequently added a black-tail pixel threshold of 5, strict `-xerror` decoding, and an AAC codec requirement. Root separately inspected source and actual encoded frames; that visual work is outside this native smoke test.

No browser, connector, preview access, provider call, or paid operation is part of this test. The prior HTML browser smoke remains blocked. No direct listening, subjective audio quality, or physical mobile-device playback claim will be made. Root separately verifies source and encoded visual frames.
