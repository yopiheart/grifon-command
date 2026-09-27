# V06 sound revision - 2026-09-27

## User finding and scope

Neil listened to V05: "sobrang layo dun sa reference", "nakaka excite na
nakakacurious", "accurate ung sound effects dun sa scene/clip", "weak ung satin".
V04 picture remains approved. V05 sound is rejected, and V06 is a new audition
candidate, not a claimed user-approved result.

The assistant did not hear the reference or either mix. That limitation was
disclosed before this revision. No audio-capable model was called: provider-backed
analysis needs a separately approved paid specification, and no such call was
authorized. Environment GEMINI_API_KEY / GOOGLE_API_KEY presence checks returned
false; secret files were not inspected. No third-party sample or project assets
were used. Actual provider spend: $0.

## Reference measurements and decisions

The reference's strongest onset-period candidate is about 104.5 BPM, with common
half/double/related-period alternatives. This is an algorithmic candidate, not
confirmed musical transcription. V06 uses an original 105 BPM motif in Fmaj9,
Dm9, Cadd9 and Bbmaj9 colours. Reference samples are never in the authored mix.

Measured same-method signal differences:

| Signal property | Reference | V05 | V06 |
| --- | ---: | ---: | ---: |
| 13-17s energy minus 9-13s energy | +6.4 dB | -2.4 dB | +5.4 dB |
| Spectral energy 700Hz-10kHz | 19.77% | 6.38% | 21.52% |
| Delivered integrated loudness | -16.15 LUFS | -17.02 LUFS | -15.87 LUFS |
| True peak | +0.13 dBTP | -2.89 dBTP | -1.39 dBTP |

Band percentages are from mono STFT energy over 30Hz-10kHz; they are not perceived
loudness or timbre scores. Section dB values are mean short-window RMS. The two
bounded checks (reveal gain >=3dB; above-700Hz energy >=12%) fail V05 and pass V06.
They establish correction of these measured defects, not that a human will find
the new music exciting or close enough to the reference. Inspect the accompanying
spectrograms and JSON; the scripts reproduce them without network access.

## Authored changes

- A syncopated pluck/bass/percussion pulse replaces V05's sparse 80 BPM pad bed.
  Phrase rests create space; the music lifts at the reveal and includes brief
  breaths before major handoffs. Levels are shaped across the entire timeline.
- Opening and Until now clicks use the actual copy's non-space character times.
  Collage word accents use their authored stagger. Mechanical and glass detail
  is sharper, with shorter reflections preserving the attacks.
- Rotational sweeps pan with camera/phone/laptop travel. A slide-settle impact
  is at +0.73s; the differentiated shutter/glass/hinge finishes follow the
  actual +1.19s turn end, instead of stopping early.
- Tile details, warm anticipation, sphere contraction/bloom, dialogue entry and
  reveal relays, closing words, workflow cards and logo resolution have own cues.
- 138 cue entries include harmonic beds and authored effects. Separate music,
  detail, motion and combined SFX stems plus masters are retained.

## Actual output verification

Final `exports/grifon-your-next-ad-v06-1080p.mp4`: 16,630,338 bytes; H.264 High,
1920x1080, 30fps, 987 frames; stereo AAC-LC 48kHz; both streams exactly 32.900000s.
Full video/audio decode with FFmpeg `-v error -xerror` exits 0 with no errors.
The encoded video stream SHA256 matches the approved V05 export exactly:
`71d2bc17fbb4467fdfa7ee1f36a3e2e994a2f617e0eeac8687e9d8a35a443473`.
Main-composition hash is unchanged, as recorded in `master-report.json`.
No new picture render or visual change was needed.

The first mastering test failed its -1dBTP delivery ceiling: AAC measured -0.91.
Lowering the pre-encode ceiling to -1.7 produced -1.39 dBTP. The gate was preserved,
not weakened. Final loudness -15.87 LUFS; LRA 5.1 LU, close to reference 5.2 LU.
Decode, build, JS syntax, artifact anchors and diff whitespace pass. No application
source or dependencies changed; full app tests were not run.

## Playback and limits

Parent CUA at 390x844: screenshot emitted, document width 375, no horizontal
overflow; Soundtrack selector and sound toggle visible. V06 uses only its audio;
reference mode unmutes only reference; V05 mode unmutes only previous. Switching
while playing preserves timeline position. Sound off pauses both extra audio
tracks and leaves the visual clock running muted. At half speed all rates are
0.5. Seeking to the spark puts all media at 15.3, paused. Restart puts all at zero.
The viewport override was reset after the check. A full V06 player run reached
the 32.90s readout and paused both active media (14.6ms clock difference at stop).
Native V06 MP4 playback also reached ended=true at32.9s,1920x1080, with no media
error. Existing unattributed MutationObserver errors recur in CUA logs; no new
playback failure was observed. No error-free-browser claim is made.

Independent smoke agent still had no browsers/apps, so no independent UI pass.
No claim of hearing the full track, of perceptual quality, or of user approval.
The A/B control deliberately exposes the real reference to Neil, whose ear is
the deciding check. Private GitHub MP4 and MP3 downloads support phone audition.
The portable twin embeds both original mixes and reference video; file-URL playback
remains unverified, while localhost playback is checked.

## Reproduction

Node 24.21.0, existing FFmpeg 6.0; FFprobe 4.0.2. Python from Codex's bundled
workspace runtime, NumPy 2.3.5 and Pillow. No extra install for this revision.
Run audio-v06.mjs, audio-master-v06.mjs, then the existing artifact builder.
Run qa/analyze-sound.py and qa/compare-sound-metrics.py for evidence. Raw premaster
and NumPy feature caches are ignored; sources, final MP4, stems, masters, MP3,
spectrograms and reports are versioned. V05 and its original final file remain.
