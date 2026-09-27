# NOW - the resume doc
**Stamped: 2026-09-27, V06 sound revision ready for audition**

## Current state
V04 visuals approved. Neil listened to V05 and rejected its sound as weak and far
from the exciting/curious reference. V06 rebuilds the original music/SFX and keeps
the exact approved video stream. Audio acceptance is pending; no listening claim.
Original full MP4 export authorization persists. No paid calls, AE, external
samples, other-project assets, application edits or deployment.

## Deliverables and backup
Branch: codex/ae-elevenlabs-reference; draft PR149:
https://github.com/yopiheart/grifon-command/pull/149
Root: workflows/assets/grifon-reference-full/
New MP4: exports/grifon-your-next-ad-v06-1080p.mp4 (32.9s, 1080p/30fps).
Phone MP3: assets/audio-v06/grifon-sound-v06.mp3.
Source: audio-v06.mjs, audio-master-v06.mjs; assets/audio-v06/ contains music,
detail, motion and combined SFX stems plus WAV/AAC masters and cue sheet.
Comparison: http://127.0.0.1:4179/compare.html
Run server: node workflows/assets/grifon-reference-full/serve.mjs
Builder: node tools/artifacts/build-grifon-reference-full.mjs
Standalone twin: artifacts/grifon-reference-full.html (18.0 MiB).
V05 source/audio/export and previous V03/V04/silent backups remain intact.

## What changed
Original 105 BPM syncopated pluck/bass/percussion score. New character-accurate
clicks including Until now, panning rotations, shutter/glass/hinge finishes at
actual turn ends, stronger sphere reveal, message accents, and unified logo
resolution. 138 cue entries including harmony. Comparison offers Grifon V06,
ElevenLabs reference and Previous V05 at the same timeline position, one audible
track at a time. Reference audio is not sampled into Grifon's authored score.

## Evidence
Local reference signal measurements, not an auditory/model review. Strongest
pulse candidate ~104.5 BPM, unconfirmed. Reference reveal section rises6.4dB;
V05 fell2.4dB; V06 rises5.4dB. Energy700Hz-10kHz: reference19.77%, V05 6.38%,
V06 21.52%. Bounded regression checks fail both V05 defects and pass V06; this
is not proof of musical taste/reference fidelity. Final V06 -15.87LUFS,
-1.39dBTP, LRA5.1. First AAC peak test failed -0.91; extra headroom fixed it.
MP4 probe: H.264 High, 1920x1080, 30fps,987frames, AAC-LC stereo48kHz,32.9s.
Full audio/video decode passes. Video stream SHA256 is identical to V05:
71d2bc17fbb4467fdfa7ee1f36a3e2e994a2f617e0eeac8687e9d8a35a443473.
Approved index.html hash unchanged. Builder, JS syntax, artifact anchors and
whitespace pass; no app edits, so app build/test not run.
Parent CUA390x844: screenshot, no overflow, track switching during play, exclusive
mute states, Sound off/on, half-speed, chapter seek and restart checked.
V06 full player run and native MP4 playback both finish at32.9s. Pre-existing
unattributed MutationObserver errors recur without observed playback failure.
Reports: qa/sound-v06/results.md, master-report.json, reference-signal-report.json,
regression-metrics.json; reproducer scripts in qa/.

## Next action and honest limits
Neil auditions V06 on phone via private GitHub MP4/MP3 or desktop A/B selector.
No direct hearing or full perceptual review available in this session. Never say
waveform/spectral checks prove excitement or instrument identity. No paid analysis
was run; provider calls require a concrete approved test spec. Independent mobile
agent has no browser connection; parent screenshot is not a real Android engine
check. Portable file-URL playback unverified; localhost checked. Keep the existing
visual approximation disclosures in the brief. No merge/publish/deploy requested.

## Runtime and unrelated work
Existing FFmpeg6.0, cached Hyperframes0.7.68, task-local FFprobe4.0.2 reused.
Codex bundled Python/NumPy2.3.5/Pillow used; no new dependencies. Intermediate
premaster WAV and NumPy caches ignored. .codex-remote-attachments/ and
workflows/assets/grifon-ae-reference/ are pre-existing untracked, untouched.
Pilot/Spotlight/Spark and PR144/143 intact; KAPE01/PR145 unrelated.
