# Hero rough cut 03

40-second editorial assembly with the existing C-series owner stills, a product
insert, subtle 1.8–2.5% camera pushes, the preserved Blender proxy, and an existing
piano music bed. The final card now holds for four seconds. This is a pacing
review, not the finished hero film or a demonstration of actual Grifon output.

## Watch and revise

- `hero-rough-cut-03.mp4`: 960x540, 24 fps, 960 frames, H.264, AAC stereo at 48 kHz.
- `contact-sheet.jpg`: first/last sampled encoded frame of every scene.
- `timeline.json`: editable shot order, source paths, copy, duration and music.
- `build.mjs`: local FFmpeg/Sharp assembly. No network or generation calls.
- `verification.json` and `media-scan.txt`: actual output checks and source hashes.

From this worktree's root:

```powershell
node assets/hero-film/rough-cut-v3/build.mjs --runtime-root C:/Users/ADMIN/Desktop/grifon-command
```

Use any existing compatible root installation containing `sharp` and
`ffmpeg-static`. Omit the flag when this checkout has its own dependencies.
Inter Black and the logo come from existing repository assets. Temporary files
under `.render/` are ignored and regenerated. Old cuts and source assets are
never overwritten. The delivery matches the lowest-resolution video source;
540p is a review format, not a final-resolution claim.

## Sequence

| Time | Picture | Actual status |
| --- | --- | --- |
| 0–4s | Owner lining up the product photo | Existing C03 still, camera push only |
| 4–6s | Owner checking the bottle | Existing C02 still, camera push only |
| 6–9s | Owner at laptop | Existing C04 still; no actual UI capture |
| 9–13s | Plan | Explicit missing-footage card |
| 13–19s | Studio camera orbit | Existing Blender proxy; Genjutsu result pending |
| 19–26s | UGC | Explicit missing-footage card |
| 26–32s | Cinematic output | Explicit missing-footage card |
| 32–36s | Return to owner | Existing C05 still, camera push only |
| 36–40s | Grifon end card | Existing logo; neutral copy for review |

The studio contains a proxy bottle and empty displays. It must not fill either
Grifon product-proof slot. Owner likeness/casting remains provisional. Small
product labels are not certified at this review resolution. No source character,
screen or bottle was regenerated or repaired. The end-card line is provisional
English copy; it makes no subscription or generation-speed promise.

Music: existing `api/_lib/assets/music/testimonial.mp3`, listed as Inspirational
Piano in `api/_lib/assets/PROVENANCE.md`. One-second fade-in and three-second
fade-out; no voiceover, synthetic cues or original ad audio. The music is a
temporary editorial choice, not a final sound mix. Actual UGC voice will need
music ducking once its original export is available.

## Verification and limits

Build completed successfully. Full decode: 960 frames / 40 seconds. H.264 video
and stereo AAC audio verified from FFmpeg stream metadata. No black interval
lasting 0.25 seconds at the configured 98% pixel threshold. Encoded audio peak
is -4.6 dBFS. Source hashes match before and after rendering. Every scene's
opening/ending sample, including the last video frame, was visually inspected:
placeholder copy is legible at native review size and the end card is intact.

These checks do not certify continuous browser playback, subjective listening,
physical-phone readability, casting believability, or final creative acceptance.
No paid audiovisual audit ran. Source stills and the missing-footage cards are
intentionally held; freeze detection would not distinguish these from defects.
No app code, model settings, approved generation spec, or original cut changed.

Repository check: `npm.cmd run check:codex` passed (31 entrypoints, 26 tests).
The staged whitespace check first flagged FFmpeg's carriage-return progress log;
the builder and saved log now normalize those line endings. The check was rerun.
Application build/tests were not run for this
standalone media assembly; no application code or dependencies changed.
