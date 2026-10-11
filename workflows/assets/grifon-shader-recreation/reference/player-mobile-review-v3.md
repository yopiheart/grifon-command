# Offline player smoke: frozen final candidate v3

**PASS: all 33 actual player checks passed at 390x844 and 1280x844.**
This accepts standalone player behavior, offline playback, layout, inline-byte
integrity, and actual download integrity for the exact inputs below. Full-film
visual fidelity and paced reference comparison are separate gates. No audio was
heard during this test.

| Frozen input | Bytes | SHA-256 |
|---|---:|---|
| `artifacts/grifon-shader-recreation.html` | 33,662,393 | `b9ae7e24d1bf955d329200d62be16bf7f648c6b175819b9724fbddd4d5b9b423` |
| `grifon-recreation-landscape-provisional.mp4` | 24,994,401 | `c99c93c8dd194946f757dbc078b0551ccd18aaecca6c2868f753cba8b0a59917` |
| `qa/player-mobile-smoke.mjs` | Unchanged helper | `a4ad69b109e4cc5c6bc7c5d3fa85b7fd17f36651b3c685ae0513784c2c687eba` |

The helper received both explicit frozen hashes and the exclusive new output
folder `player-final-v3`. Its before/after artifact and film checks remained
identical. The historical 15 rejection-only guard cases were not rerun.

The Codex CUA inventory returned no available apps or browsers. The existing,
authorized Playwright runner used Chromium 149.0.7827.55, fresh contexts at each
actual viewport, deviceScaleFactor 1, `offline: true`, and downloads enabled.
Only the local artifact and internal `data:`/`blob:` resources were allowed.

Each viewport exercised Play, Pause, mute while paused, muted Play, unmute during
playback, Pause, a middle scrub, Restart, natural completion, replay, Pause, and
Download MP4. Settled native video state confirmed each operation. Both natural
runs reached 31.146 seconds, ended, and paused. Their wall intervals after
restart were 31.222 seconds on mobile and 31.016 seconds on desktop.

| Observation | 390x844 | 1280x844 |
|---|---|---|
| Body / document width | 390 / 390px | 1280 / 1280px |
| Action target height | 46px | 46px |
| Narrowest action target width | 177px | 82.84px |
| Timeline target | 267.38 x 46px | 970.22 x 46px |
| Settled scrub | 17.550866s, paused | 17.484133s, paused |
| Natural end | 31.146s | 31.146s |
| Actual downloaded bytes | 24,994,401 | 24,994,401 |

Both downloads completed without failure, used the expected MP4 filename, and
matched SHA-256 `c99c93c8dd194946f757dbc078b0551ccd18aaecca6c2868f753cba8b0a59917`.
The saved files were also compared byte for byte with the frozen source. No
external requests, failed requests, console errors, or page errors were recorded.

All eight actual poster, playing, scrubbed, and ended screenshots were inspected.
Their PNG headers independently confirm the exact viewport dimensions. The phone
layout keeps the film, controls, timeline, and example/provisional-soundtrack
disclosures legible without horizontal overflow. Desktop uses normal vertical
scrolling to reach the timeline and details; controls remain usable. The terminal
screen reads `31.15 / 31.15s` and `Finished. Replay or download the film.` The
native-frame range step quantizes its last slider value to 31.1311s, while actual
media reaches the 31.146s container end and replays successfully.

`qa/player-integrity.json` now independently binds decoded inline MP4 and poster
bytes to this candidate. `qa/player-checks.json` binds the 33-check report and
records the producer's existing build and 1,432-test PASS as separate evidence;
this agent did not rerun those commands. The old integrity/checks files matched
their preserved `qa/full-failed-review-1/qa/` copies exactly before replacement.
The original mobile report, screenshots, downloads, and review document remain
unchanged.

Evidence is in `qa/player-final-v3/player-mobile-report.json` and
`qa/player-final-v3/screenshot-integrity.json`, together with the eight captures
and two actual browser downloads. Browser contexts and Chromium were closed.
No helper server, provider call, paid operation, source/runtime edit, settings
change, or Git operation was performed. Native mute/unmute states prove widget
behavior only; direct listening and soundtrack similarity remain unverified.
