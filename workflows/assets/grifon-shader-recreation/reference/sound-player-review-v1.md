# Independent sound player v1 smoke

PASS: all 33 unchanged player assertions passed on 2026-10-08; command exit 0. Independent player smoke only. Direct listening, full-film aesthetic acceptance, and real Android WebView rendering remain untested.

## Frozen inputs

| File | Bytes | SHA256 before and after smoke |
| --- | ---: | --- |
| `artifacts/grifon-shader-sound-v1.html` | 33,746,991 | `550986f8e81c77cb45cd8825f0e5844b1feb7042e11f291cca8b465a867f8b2a` |
| `workflows/assets/grifon-shader-recreation/grifon-recreation-landscape-sound-v1.mp4` | 25,057,741 | `f92ac352000e0103c3271a16c190241dde80b8bc53e906a02f0ea913be3a53df` |

Root explicitly released browser smoke after the build and default tests finished. Installed Playwright Chromium 149.0.7827.55 ran against the standalone `file://` HTML in offline contexts at 390x844 and 1280x844, device scale factor 1. No helper server was started.

## Reproduction and assertion preservation

Original `qa/player-mobile-smoke.mjs` SHA256 before and after: `a4ad69b109e4cc5c6bc7c5d3fa85b7fd17f36651b3c685ae0513784c2c687eba`.

Private scratch copy `.tmp/sound-player-smoke-v1.mjs` SHA256: `ac5700a29921335fc2d410d6ec5f2167fdd0c068f2a28cc40e3d50cd24bd7edf`. Only these structural changes were made:

1. Replace the relative `qa/here/root` bootstrap with `root='C:/Users/ADMIN/.codex/worktrees/grifon-shader-launch/grifon-command'`, `here=path.join(root,'workflows/assets/grifon-shader-recreation')`, and `qa=path.join(here,'qa')`.
2. Retarget `artifacts/grifon-shader-recreation.html` to `artifacts/grifon-shader-sound-v1.html`.
3. Retarget `grifon-recreation-landscape-provisional.mp4` to `grifon-recreation-landscape-sound-v1.mp4`.

Reverse-normalizing those three changes exactly reproduced the original source. All assertion expressions, duration/dimension expectations, control interactions, natural playback loop, download byte checks, and error/network checks stayed unchanged. Syntax check `node --check .tmp/sound-player-smoke-v1.mjs` exited 0.

From the worktree root:

```powershell
node .tmp/sound-player-smoke-v1.mjs --artifact 550986f8e81c77cb45cd8825f0e5844b1feb7042e11f291cca8b465a867f8b2a --film f92ac352000e0103c3271a16c190241dde80b8bc53e906a02f0ea913be3a53df --out sound-player-v1
```

## Key findings

- 33/33 PASS; zero console/page errors, external requests, or failed network requests. Initial and final file hashes match the frozen inputs.
- Inline poster and 1920x1080 film decoded. Initial media was paused and unmuted. Browser media duration was 31.146 seconds, within the unchanged 31.146667-second tolerance.
- Play, Pause, mute/unmute state and labels, timeline seek/pause, Restart, and replay after natural completion passed at both sizes.
- Natural playback reached `ended=true`, `paused=true`, and `currentTime=duration` at both sizes without an artificial seek to the end. Observed full playback windows were 31.195 seconds mobile and 31.190 seconds desktop.
- Both actual browser downloads were 25,057,741 bytes, had the frozen film SHA256, and suggested `grifon-recreation-landscape-sound-v1.mp4`.
- Body/document width stayed equal to viewport width before and after interaction. Every control target was at least 44px in both dimensions; measured height was 46px. Mobile buttons measured 177x46px.

## Eight screenshot inspections

All eight retained PNGs were individually viewed with the actual image tool: poster, playing, scrub, and ended at each viewport. Mobile shows readable solid near-white display type, gold primary control, continuous charcoal ground, visible panel edges, and a two-column control grid without horizontal clipping. Desktop preserves the same treatment; ordinary vertical scrolling exposes the controls/timeline and the two information panels. The ended frames show the film's black terminal image alongside completed timeline/status. No missing player assets or broken ground were observed. These snapshots establish player/layout behavior only, not film quality acceptance.

Evidence lives under `../qa/sound-player-v1/`: `player-mobile-report.json`, eight `player-mobile-<viewport>-<phase>.png` images, and two actual browser-download MP4s. `player-visual-review.json` records the inspected screenshot hashes and the preserved-helper checks.

## Supplemental browser limitation

The supplemental CUA Chrome open timed out; recovery reported Chrome unavailable. Browser inventory exposed only the in-app browser and MCP Apps. The in-app browser rejected the local `file://` URL through its URL security policy, which allows HTTP/HTTPS and explicitly prohibits workarounds. No workaround or further browser retry was attempted. The offline Playwright smoke and its eight screenshots had completed before that rejection; CUA manual playback remains NOT RUN. No direct audio-hearing claim is made.
