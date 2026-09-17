# Spotlight verification — 2026-09-17

## Delivery contract

25 seconds / 24 fps / 600 frames each. Portrait 1080x1920 and independently composed landscape 1920x1080. Real Grifon sample footage, no fabricated UI or end-to-end generation claim. Existing logo/fonts/music and local tools only; paid spend $0. The first Spark study and original app/sample assets remain unchanged.

## Checks on final source and exports

- Hyperframes 0.7.68 check passes both formats: lint, runtime and sampled layout/transition checks. Decorative-layer pointer-events notes are informational. Its contrast sampler does not establish every frame's readability; visual review is separate.
- FFprobe counts 600 frames, correct dimensions and 25s in each final file. H.264 video plus AAC stereo music. FFmpeg full decode succeeds.
- `media-check.mjs` measures final-file audio, scans near-black intervals, extracts 13 encoded review frames, and compares embedded-footage content at source seconds 1, 4 and 8 against the actual export. `qa/media-check.json` binds the measurements to export SHA-256 hashes.
- Source comparisons use RGB before cropping so the landscape's odd pixel coordinates are not rounded by chroma subsampling. The first YUV-crop check failed at mean channel difference 5.68; fixing coordinate handling passed the original <=4 threshold. The threshold was not loosened. A frozen-source negative control is rejected.
- `revision-check.mjs` passes ten compared samples across both layouts for YOUR PRODUCT. -> YOUR IDEA. Later sampled frames meet recorded <=1 channel / <=0.02 mean limits. A deliberately wrong later headline is rejected. The initial copied runner lacked an FFmpeg path for video snapshots; the runner now supplies the existing FFmpeg/FFprobe paths explicitly. No new dependency installation.
- `npm.cmd run check:codex`: 32 entrypoints, zero errors, all 26 tests passed. New scripts pass Node syntax checks. No app build/full test suite: app source and dependencies are untouched.

## Source-tail defect and actual resolution

Initial snapshots showed a person returning after the product ending. Adding a final still alone did not resolve the encoded result. Independent review and a frame-level source inspection established two problems: the original sample contains 271 decoded frames at 30 fps, and frame270 starts the next scene; the new end still had also been extracted from that wrong frame.

The task-local sample is now frames0-269 only, normal-speed 9s. The final still is original frame269, layered above the video from output16.5s. Neither the original public sample nor its tuned generation inputs changed. Do not describe this as an unchanged copy of the entire shipped file. The full intended sentence and product shot are retained, with only the stray next-scene frame excluded.

`qa/*-boundary-sheet.jpg` shows encoded frame indices396,397,398,402,408,415,598,599 (read left-to-right, top-to-bottom). This covers the source ending, outgoing handoff and last two output frames. The final independent review checks these boundaries separately from the earlier failing versions.

## Practical limits

Fresh independent final critic: BRAND_PASS_WITH_NITS, 42/50, zero critical
findings. It checked the logo at 200%, portrait at 375x667, and both final MP4s
at 16.4583, 16.5, 16.5417, 16.75, 17, 17.3 and the last frame at 24.9583.
The product persists through the exit; the terminal frame holds the lockup.
The remaining nit is the landscape source-caption size described below.

Portrait is the phone-feed version. Landscape's authored text and AI label remain legible when scaled down; the embedded portrait sample's burned captions need landscape/full-screen playback. Do not claim its small source captions are readable in a 375px-wide landscape thumbnail.

Frame sampling, source matching and decoding do not equal continuous viewing or subjective listening. Those checks and Neil's creative acceptance remain pending. The music-only mix deliberately leaves the silent source excerpt without spoken audio. No browser denial was bypassed. No claim of exact Apple motion, retention improvement or brand acceptance is made from the technical checks.
