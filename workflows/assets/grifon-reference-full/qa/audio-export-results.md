# V05 sound and final export - 2026-09-27

Neil approved V04's visuals and explicitly requested "Music + SFX, then final
MP4", lifting the earlier preview-only restriction. The approved picture remains
32.90s, 1920x1080, 30fps with the existing English Grifon copy.

## Deliverables and provenance

- `exports/grifon-your-next-ad-1080p.mp4`: 16,552,470 bytes, H.264 + stereo AAC.
- `assets/audio/music-stem.wav`, `sfx-stem.wav`: 48 kHz stereo 16-bit premaster buses.
- `assets/audio/score-master.wav`: 48 kHz stereo 24-bit mastered mix.
- `assets/audio/score-master.m4a`: 256 kbps AAC soundtrack used in player and MP4.
- `audio-score.mjs` and `assets/audio/cue-sheet.json`: original composition and
  75 cue entries, including music blocks. Seeded local oscillators/noise and
  authored envelopes; no third-party samples, reference audio or voiceover.
- `audio-finish.mjs`: local mastering and stream-copy mux. Actual provider spend: $0.
- `backups/compare-v04-silent.html`: earlier silent player.
  `backups/v05-audio/`: finished sound source and player.

The 80 BPM electronic score has soft plucks, pads and bass. Typing clicks and
collage glides lead into the three object turns. The warm/orb section has fewer
rhythmic elements, chat cards receive small glass accents, and the logo has a
three-note ending. Sound is authored to the approved picture.

## Measured checks

- FFprobe: 1920x1080 H.264, 30/1 fps, 987 frames, 32.900000s; stereo AAC,
  48,000 Hz, 32.900000s. Evidence: `export-metadata.json`.
- Full final-file decode with FFmpeg `-v error -xerror -map 0:v:0 -map 0:a:0
  -f null NUL`: exit 0, no errors.
- Delivered AAC: **-17.02 LUFS integrated**, **-2.89 dBTP**, LRA 4.0 LU.
  Pass contract: -18 to -16 LUFS, true peak <= -1 dBTP.
  Evidence: `audio-analysis.json`. Measurements are not listening QA.
- V04 foreground verifier reused on actual MP4 frames: all five movement checks
  pass. Typed foreground counts 1222/2299/3483; collage travels 57.74px left;
  camera/phone/laptop change 13042/9393/50176 foreground pixels. This verifier
  already fails all five checks on V03. Evidence: `motion-check-export-v05.json`.
- Seven export/approved-source frame comparisons: PSNR 34.72-51.55 dB. Codec
  subsampling, antialiasing and render sampling prevent pixel identity. Visually
  inspected `export-contact-sheet.jpg`: typing, collage, all three objects, orb,
  chat, statement and brand. Metrics: `export-picture-comparison.json`.
- Approved index.html SHA256 unchanged:
  `1CB32367D0AEFF59CC4D6AACEFA9FBABDA12A070A669CB1BE833414D244A2BD2`.
- Builder, standalone twin, Node syntax, artifact anchors and diff whitespace
  pass. No application source changed; app build/test were not run.

## Browser checks and limits

Parent CUA verified **390x844**, screenshot emitted in the task. Document width
375px fits; controls are readable, ground continuous and both panels visible.
Restart pauses/seeks both media to zero. Range End seeks both to 32.9. Chapters
and solo work. Half-speed media rates both report 0.5, with a measured 9ms clock
difference. Sound off mutes/pauses only the soundtrack; sound on resumes within
7ms of the reference. A complete 1x run reached 32.90 and paused both media.
Reference stays muted. Native final-MP4 browser playback reported 1920x1080,
readyState 4, unmuted, advancing without a media error; inspected chat at 20.75s.

Continuous audiovisual review, especially listening to the entire track, remains
pending: this session can inspect frames and media state but has no audible
perception channel. Neil should audition the sound before publishing. No audio
approval is claimed. The independent mobile agent again had no browser connection,
so no independent UI pass is claimed. Parent Chromium viewport testing does not
prove real-device Android rendering. File-URL portable playback remains unverified;
localhost playback is verified. The pre-existing unattributed MutationObserver
error remains in browser logs with no observed playback failure. Initial pointer
actions before the explicit viewport did not activate intended controls; keyboard
actions and later pointer restart at 390x844 succeeded.

## Tools and reproduction

Node 24.21.0 / npm 11.19.0; cached Hyperframes 0.7.68; existing ffmpeg-static FFmpeg
6.0; FFprobe 4.0.2 from npm `ffprobe-static@3.1.0`, installed under ignored
`.tools/media-runtime/`. No root dependency changes. The initial render stopped
before frame capture because FFmpeg/FFprobe were absent from PATH; supplying the
existing FFmpeg and task-local FFprobe resolved that setup failure.

Render: 1080p, 30fps, high quality, CRF16, SDR, 2 workers; 987 frames in 88.9s.
Commands are in `../brief.md`. FFmpeg masters the combined score with high-pass,
gentle compression and measured loudness, then copies picture and AAC streams
into the fast-start MP4. Silent render, premaster and decoded QA frames remain
local ignored intermediates. Final MP4, stems, masters, source and proof are backed up.
