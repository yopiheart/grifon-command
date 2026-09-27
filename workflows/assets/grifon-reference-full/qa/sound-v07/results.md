# V07: two short listening auditions

2026-09-27. Neil authorized two 8-10 second alternatives after rejecting the
V05/V06 procedural soundtrack. This pass uses licensed stock music plus recorded
SFX, mixed locally. It does not replace the full-film soundtrack or alter visuals.

## Delivered files

- `exports/grifon-sound-option-a-10s.mp4`: Close Up by Michael Ramir C.
- `exports/grifon-sound-option-b-10s.mp4`: Digital Clouds by Alejandro Magana (A. M.).
- `exports/grifon-sound-ab-audition-v07.mp4`: A/B reel with separate label cards.
  A at 1.2-11.2s, B at 12.4-22.4s. 7,911,151 bytes.

Music source sections are 8-18s. Both use the same recorded keystrokes, collage
pops, panned swipes/rotations, shutter, phone UI and laptop mechanical cues.
The two standalone video streams match one another AND the approved V04 first
10s by SHA256. Approved index.html remains
`1CB32367D0AEFF59CC4D6AACEFA9FBABDA12A070A669CB1BE833414D244A2BD2`.

## Actual checks

| Output | Length | Picture | Audio | Integrated loudness | True peak |
| --- | --- | --- | --- | --- | --- |
| A | 10.000s | H.264 1920x1080 / 300 frames | AAC stereo 48kHz | -16.31 LUFS | -1.65 dBTP |
| B | 10.000s | H.264 1920x1080 / 300 frames | AAC stereo 48kHz | -16.08 LUFS | -1.37 dBTP |
| A/B reel | 22.400s | H.264 1920x1080 / 672 frames | AAC stereo 48kHz | -16.19 LUFS | -1.43 dBTP |

A/B level difference is 0.23 LUFS. Full AV decode passes for all three files.
First combined reel had AAC padding/timing drift; explicit per-segment sample
trims corrected its duration to exactly 22.4s. Gates were kept unchanged.
Python syntax and git whitespace checks pass. No application changes, so app
build/test were not run. Stock sources and intermediate audio are gitignored.
Parent CUA: native MP4 played from start through ended=true at 22.4s, unmuted,
1920x1080, no media error. At 390x844, player fit with document width 390; temporary
viewport reset afterward. This is a desktop browser viewport, not Android testing.

## Audio-capable review, with limits

Used the existing signed-in Gemini web UI in Flash mode, without API calls,
purchases, upgrades or model-setting changes. No other conversations were opened
for content. Two task-specific chats were created through normal web prompts:

- Reference video review: https://gemini.google.com/app/e22ab6caa8f98ae2
- Audio-only reference, music shortlist, first mixes and revised mixes:
  https://gemini.google.com/app/f2c267c0b24961fd

The reference video and extracted audio-only analyses disagreed on instrument
identity and speech timing. Their exact transcript/timestamps are NOT accepted
as ground truth. They suggest a sparse plucked/percussive opening and a later
lift, but that interpretation remains fallible. The assistant did not directly
hear the tracks and does not claim a verified reference match.

Four music-only *video* shortlist exports were submitted: Close Up, Digital
Clouds, Sci-Fi Score and Your Breath, all with the same 10s Grifon picture.
The reviewer preferred the first two contrasting options. It initially used
Source numbers; final named A/B uploads resolved the file mapping. Descriptions
of individual instruments remain model reports, not independently confirmed facts.

First mixed A/B review identified masking of B's swipe/phone cues and a perceived
abrupt ending. The files already had fades, so the claim of a literal hard cut
was not technically correct. Music fades were lengthened from 0.15s to 0.55s,
and music was ducked around swipes, with stronger reduction for B. A/B SFX
timing and samples stayed the same. Previous report: first-mix-report.json;
previous mixed MP4s remain in the ignored local work folder.

The revised-a.mp4 / revised-b.mp4 review reported reduced masking and a smoother
ending, with no severe flaw flagged. It still described B as busier and more
competitive with the UI cues. This is a choice for Neil to hear, not a reason
to declare either option accepted. No third full-film soundtrack was produced.

## Reproduce / licenses

`audio-auditions-v07.py` performs local edits, mastering, mux, reel assembly and
bounded verification with existing NumPy, FFmpeg6.0 and FFprobe4.0.2.
Source URLs, authors, usage limits and hashes are in `assets/audio-v07/`.
Raw stock music/SFX, isolated stems and audio-only mixes are not redistributed.
Only the mixed video end products are delivered. Licensing these assets for a
future Grifon product/template library is not established by this experiment.
