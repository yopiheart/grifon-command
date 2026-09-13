# Animatic independent smoke review

2026-09-13. Final status: PASS for the silent storyboard timing review, with the portrait copy designated for phone review.

- Both files decode successfully as H.264/yuv420p, 24fps, 40.00 seconds, video only. Landscape is 1280x720; portrait is 720x1280.
- Exact scene cuts verified by FFmpeg scene selection/showinfo at 6, 13, 20, 28 and 35 seconds after the frame-trim fix. Holds are [6,7,7,8,7,5]. Earlier one-frame error was reproduced and resolved. Final text-wrap change leaves timing construction unchanged.
- Actual sequential browser playback completed at 40 seconds with ended=true and media error=null for both formats during this review. Six samples confirmed owner, input, plan, UGC placeholder, cinematic placeholder and owner return. Zero console errors/warnings.
- Portrait copy at 390x844 displays approximately 390x693. All notes, main copy and disclosures are readable. Panel 5 initially clipped its cinematic placeholder line; final <=27-character wrapping was rechecked in PNG and actual browser video. Final six mobile screenshots were refreshed by seeking the current local MP4 loaded as a blob. The final text-only fix did not trigger another full 40-second replay.
- Source review: local committed storyboard SVG/data inputs, local sharp and ffmpeg only. Six inputs are trimmed to exact frame counts [144,168,168,192,168,120], setpts, concatenated and capped at 960 frames. No paid/model/Blender/network operations or source edits by reviewer.
- Content boundaries pass: silent/diagrams-only status, real ads pending, UGC/cinematic placeholder holds, provisional pacing and written sound intentions. No completed Grifon output or finalized film quality is claimed.

Current evidence: animatic-portrait-0.5.png, -6.5.png, -13.5.png, -20.5.png, -28.5.png and -35.5.png. Suggested mobile review screenshot: animatic-portrait-28.5.png.

Limitations: Chromium viewport, not actual Android WebView/device. Landscape notes remain too small when squeezed to portrait phone width; use the designated portrait review copy or larger/landscape playback. No audio listening, generated-ad quality, final motion/pacing quality or actual app-result validation performed. A silent timing pass is not a temporary-audio rough cut.

SHA256 final landscape: 38B1758FCDB38FD1BB182C0721D6CE149E335EF845E1DB79445DC77496E4257B
SHA256 final portrait: C24E9347C1952F794786AFD10A91E7599365F41158E440BF519E76A3E9AC7C4B

QA helpers PID 11716 and 14044 stopped; only reviewer test tabs closed. Only QA evidence/report files created or changed by reviewer.
