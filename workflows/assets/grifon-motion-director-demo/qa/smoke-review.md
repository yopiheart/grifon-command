# Independent motion smoke review

Reviewed 2026-09-17 by the independent smoke agent. Report-only; no production source fixes.

**Overall: INCOMPLETE (browser gate BLOCKED).** Non-browser media checks and sampled visual review PASS on the final exports identified below. Do not describe this as a full browser smoke pass.

## Final-export results

- Both files fully decoded with FFmpeg, exit 0 and no decode errors. Each is exactly 12.000000 seconds, 288 H.264 frames at 24 fps, with 12-second AAC stereo audio at 48000 Hz.
- Portrait: 1080x1920. Landscape: 1920x1080. The layout genuinely changes: stacked versus horizontal panels and vertical versus horizontal ending.
- Independent ebur128 measurement: both approximately -13.7 LUFS integrated and -1.4 dB true peak. Audio is present, decoded, and measured; subjective listening was NOT performed. The first exports measured +5.3 dB true peak and were superseded by the corrected mix.
- Black-frame detection reported no black interval of at least 0.15 seconds at pixel threshold 0.01. This is a narrow machine check, not proof of visual quality.
- Actual-MP4 contact sheets at two samples per second show the intended logo, DESCRIBE, BUILD, LAUNCH, and final GRIFON.AI beats. No sampled empty beat, clipped word, missing logo, or font corruption found.
- Direct 390px-wide MP4 samples at portrait 4.8s and landscape 11.95s are readable. These are resized video frames, NOT mobile browser screenshots and NOT physical-device testing.
- The canonical opening mark has a transparent gold ring, unchanged griffin image, and italic GRIFON. The requested closing URL is readable. Panel SVG shapes inspected at 200% from the actual export; no clipped/squashed shape found. Gold and charcoal match the declared palette. Sampled video brand verdict: BRAND_PASS, 0 blocking findings, 0 nits; this verdict does not cover the blocked artifact layout review.
- Review source explicitly says panels are graphic examples, not actual app output. Its embedded portrait and landscape MP4 data match the final export SHA-256 values exactly.

## Blocked browser scope

CUA blocked opening the local review file before any page inspection. Its response prohibited retries through a workaround, alternate browser surface, raw CDP, or indirect execution. No workaround was attempted.

Required 390x844 and 1440x1000 page screenshots: **not captured**. Actual full 12-second browser playback, ended events, browser frame counts/errors, visible/operable controls, overflow and scrolling: **not verified**. Android WebView and physical-phone playback/listening: **not verified**. No helper server or persistent browser process was started by this agent.

The exact tool action and denial are recorded in `smoke/browser-blocker.json`. The artifact-noir mobile screenshot delivery gate remains unmet. Skill proposal approval is expected pending work, not a defect.

## Evidence and reproducibility

Run from repository root:

```powershell
node workflows/assets/grifon-motion-director-demo/qa/smoke/media-check.mjs
node workflows/assets/grifon-motion-director-demo/qa/smoke/hash-check.mjs
```

Every media subcommand returned exit 0 on the final rerun; details in `smoke/media-results.json`, with FFprobe, decode, audio, and black-detection logs. `smoke/*-actual-mp4-sheet.jpg`, `smoke/portrait-phone-describe.png`, `smoke/landscape-phone-ending.png`, and `smoke/panel-icons-200pct.png` are independent samples of the actual MP4 files, not authored-composition screenshots.

Final export SHA-256:

- Portrait: `02183925170c26199c42090166448ab7f8190fc80513048fa3d9acd5d4d2c9a3`
- Landscape: `2b2c750ac965270268d7df3f0d7f8da0fe09fcb74f01a8fde254b401aa29102f`

Complete reviewed source/artifact hashes and embedded-video equality checks are in `smoke/reviewed-hashes.json`. Any changed export or artifact requires a fresh relevant check.
