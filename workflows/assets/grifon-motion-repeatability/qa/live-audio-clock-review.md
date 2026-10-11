# Live audio clock review

**One actionable P2 finding remains for audible source preview.** In `tools/motion-launch/preview-page.mjs:17-18` (SHA256 `3ce3697a96797bcd0f506ac656be3a31be826c675decb2be5cd28e4f44cce133`), Play starts the picture performance clock before asynchronous audio playback starts. RAF continues from that separate clock even if audio later stalls. Timed cue audition therefore shows contacts against the wrong media time.

The existing actual browser report records shader frame 860 at 28.695333s while audio is at 28.461766s: the picture leads by 233.567ms. Paused frame 862 leads its audio time by 283.779ms. That report's progression/pause PASS does not establish clock alignment.

An independent Node VM reproduced the cause without a browser or source changes. Starting cue 66 at 2.2022s with a 300ms deferred `audio.play()` advances the picture to frame 74 while audio remains at the cue. After audio starts, the picture retains roughly 267ms of lead. Holding audio time for another second advances the picture to frame 107; the corresponding media frame remains 68.

The smallest correction is to select `Math.floor(audio.currentTime * fps)` as the RAF target when sound is enabled, retaining the performance clock for silent playback. An in-memory substitution held frame 66 during startup, followed media time to frame 68, held it during a media stall, and retained native ending controls and identical silent snapshots. Waiting for `audio.play()` alone would leave the later-stall defect.

Add a regression that fails against this frozen version for deferred startup and a later media-clock hold. Preserve cue seek waiting, generation cancellation, active error handling and native ending tests. Actual preview verification should record native frame and media time together and assess alignment, including asynchronous draw latency after Pause.

The existing 35/35 encoded media checks and standalone encoded preview remain valid for their frozen tuple. This finding concerns the separate editable source preview clock. A source fix must be identified by its new hash; do not relabel historical receipts as current-source evidence. The full 932-frame shader capture remains **NOT RUN**. All previous reports remain unchanged.

Full hashes, measured values, the VM setup and required checks are in `live-audio-clock-review.json`.
