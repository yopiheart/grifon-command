# Independent shader-study smoke

PASS - 2026-10-07. Final source, MP4s and review artifact were checked independently of the builder. No unresolved actionable finding. Creative approval remains pending.

| Check | Result / evidence |
|---|---|
| Source/reset | PASS: 21 timestamps, cut/fade boundaries, nonlinear seeks, fresh DOM initialization, clamping and queued seeks. |
| Shader pixels | PASS in CUA: .8 -> 1.6 -> 6.8 -> 4.15 -> 0 -> 1.6 matches exactly; independent fresh iframe startup matches. Idle and same-time re-seek match. |
| Brand hold | PASS: rendered 6.4 and 7.6 screenshots match exactly. Separate fresh-browser gate also passes in capture-check.json. |
| Editable copy | PASS: disposable study.json changes only opening from Until now. to Make it clear.; final shader render shows the edit, other copy/logo and 21 choreography states match. Canonical source was not edited by QA. |
| Brand fidelity | PASS for assigned lockup scope: logo.png is byte-identical to public/logo.png; unfiltered PNG, thin transparent gold ring, InterBlack 900 italic GRIFON. Rendered and decoded text inspected. |
| Mobile review | PASS via CUA at 390x844 and 375x667; desktop 1280x900 also fits. No horizontal overflow. Play, Restart, Download and scrub heights are 46px. |
| Playback | PASS: initial load paused with autoplay=false; Play, Pause, Restart and replay work. Observed playback drift <.004s; midpoint/Home/End seeks set both videos to the same time. Natural end shows 8.00 / 8.00s and the finished status. |
| Download | PASS: actual final browser download is 2,643,256 bytes and SHA-256 matches saved AFTER MP4. Both embedded video byte sequences also match saved MP4s. |
| Media | PASS: all 3 MP4s strictly decode, H264/yuv420p, 1920x1080, 30 fps, 240 frames, exactly 8 seconds, zero audio streams. |
| Decoded frames | PASS: 13 samples per mode, including 71/72, 155/156, 192/228 and 239. Compared with authored PNGs at 480x270; largest mean absolute 8-bit channel error 1.5810 (<3). Boundary sheets and a full decoded glass-text frame inspected; comparison frame 124 inspected. |
| Exporter review | PASS for final capture path: isolated browser per mode, awaited GPU submission, exact nonlinear/fresh hashes, explicit failures, source-bound evidence, strict media checks, finally cleanup. |

The original full capture caught a 15-pixel, one-channel headline-edge difference on fresh startup. The builder added permanent opacity-layer promotion without weakening the gate. The expanded independent CUA history/fresh-page checks pass after that fix; qa/rasterization-fix.json retains original/fixed evidence.

The original player end-status defect was reproduced in CUA and fixed by the parent; the final browser retest passes. A pending-play/Restart race was reproduced only in an independent in-memory harness. The already-loaded real browser did not reproduce that race. The parent added a playback-attempt token; final ordinary rapid Play/Restart passes. No artificial pending-play condition was injected into the browser.

| Export | Bytes | SHA-256 |
|---|---:|---|
| before | 1220041 | 3f0943be4b6f117c6cfc64f51d267b4161ccd250804099a5e9d143e884db10cb |
| after | 2643256 | cd8ab6e4b7c5727d36883a4192ce7d7f362103f8d0e1aa1daefaba193191ace5 |
| comparison | 973481 | 579152df00b134a2d40b2f414c7e5c823567d843c20f3bf288bcdfa07c1f0559 |

Final artifact: 7476173 bytes; SHA-256 6c5e39c039678a23d83a1378e06f01d56fafa9768c7440378d115ce0ea9179ad. Source hashes match qa/capture-check.json.

Ignored reproducible QA/evidence: .tmp/qa-shader-study/source-smoke.mjs, source-smoke.json, browser-source.json, browser-player.json, media-smoke.mjs, media-smoke.json, decoded-*-boundaries.jpg, final-bindings.json. The disposable copy is under .tmp/qa-shader-study/editable-copy. Final report is the only canonical file written by this smoke agent.

Limits: desktop browser viewport emulation, not a native phone/touch test; no cross-device/GPU compatibility claim; source CUA fresh check uses a new iframe page, while separate new-browser startup is covered by capture-check.json. Silent visual study, no listening requirement. No full app build/test or paid/live/provider operation was run. Provider calls/spend/uploads: 0. The QA helper PID 3328 is stopped after testing; other processes are untouched.
