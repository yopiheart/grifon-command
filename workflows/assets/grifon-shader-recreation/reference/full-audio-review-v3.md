# Frozen full-film technical audio review v3

**TECHNICAL_AUDIO_PASS_SONIC_UNVERIFIED.** The existing corrected verifier ran once and exited 0 with all 12 checks passing. No helper, film, master, recipe, runtime or source changes occurred in this review; no GUI/GPU/provider calls or paid operations were used.

Command, from `C:/Users/ADMIN/.codex/worktrees/grifon-shader-launch/grifon-command`:

`node workflows/assets/grifon-shader-recreation/qa/audio-final-verify.mjs --frozen c99c93c8dd194946f757dbc078b0551ccd18aaecca6c2868f753cba8b0a59917`

The frozen film is 24,994,401 bytes, SHA256 `c99c93c8dd194946f757dbc078b0551ccd18aaecca6c2868f753cba8b0a59917`. Producer receipt `qa/full-media.json` is SHA256 `e41cd21f0b234bab353578d554296136096af5fff52e00ca055f7866f455570a`. The helper was verified before and after execution as unchanged SHA256 `38d5fd8cd77f9879a7e3de17f303eb06dec124eb482b81d8ac64aa0b9d4fdc85`.

Current `qa/audio-final-verification.json` is SHA256 `26465102d245b4fffe1e2f7495290683f86aa7620065187b6ea14723ec8b614f`; `qa/audio-final-packets.json` is SHA256 `27aa9caf62a33f0596073fb6da5986ebc871c08f61163f3263cbdb241653b7de`. The receipt records exact before/after identities for all eight inputs: film, AAC master, PCM master, recipe, clean-input receipt, new producer receipt, full spec and reference probe. All are stable. The approved AAC master remains `0358a2223f2bfe2c5a73aa60e07d99a8ca7b97746507f967c08d18edaa44b523`; recipe remains `7a1e2d4ba455d609d62403fafbf90eb98ade8c4bfe3c0c8dad8ccac46b4aa689`.

| Actual check | Result |
| --- | --- |
| producer-film-binding | PASS |
| clean-audio-recipe-binding | PASS |
| native-video-contract | PASS |
| single-stereo-aac-stream | PASS |
| whole-film-strict-decode | PASS |
| aac-payload-identical | PASS |
| decoded-pcm-identity | PASS |
| encoded-levels | PASS |
| encoded-ending-fade | PASS |
| black-video-tail | PASS |
| native-audio-video-tail-gap | PASS |
| all-frozen-inputs-stable | PASS |

Every one of the 1,461 AAC payloads and the complete normalized ADTS bytes matches the registered clean master. Decoded audio is byte-identical: 1,495,040 stereo frames at 48 kHz, correlation 1, maximum sample error 0 and difference RMS 0. Decoded PCM SHA256 is `f9357fb441f1c36f0264268d9e4cfd3765a975c15aa547e6be998c8b1109494d`. There is exactly one stereo AAC audio stream.

Encoded measurements match the master: −16.50 LUFS, −3.15 dBTP and 9.20 LU LRA. The final 350 ms and 20 ms measure respectively −58.10 and −118.29 dBFS RMS. Loudnorm is used for input measurement only and produces no saved audio transformation.

The film strictly decodes and retains 932 frames at 1920×1080 and 30000/1001 fps. Its final 79 video frames, 853–931, measure exact RGB black at 64×36: component maximum/mean 0; tail RGB SHA256 `f5c8c7ed910da5f72201dbe61d21b22dd0a07357c83818c64c65670d2112dfec`. Video duration is 31.097733 s. AAC stream/container duration is 31.146000 s; decoded audio duration is 31.146667 s. The logical and decoded audio/video gaps are respectively 48.267 ms and 48.934 ms. Actual player display behavior is a separate browser check.

Before this run overwrote current audio QA, the v2 helper, receipt, packet proof, control receipt and review were verified byte-identical in `qa/full-failed-review-2/`. The prior six actual RGB/gray and nonblack/count controls remain historical evidence, SHA256 `2d00a036a70feb900b4ff562a2840c942c9a5ea0c8f5ba50a04d54df986f6853`; they were not rerun or represented as new-film controls. The original gray-conversion failed gate remains preserved.

**SONIC_UNVERIFIED:** direct hearing is unsupported. No soundtrack identity, instrument/vocal/SFX classification, perceived quality or sonic similarity claim follows from this technical pass. The original reference AAC was not read or incorporated. Provider calls: 0. Additional spend: US$0.
