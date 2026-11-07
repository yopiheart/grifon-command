# Oceanides Glovio pilot: sound review V1

2026-11-07. The [exact sound spec](glovio-sound-spec.md) was approved by Neil:
"Approve up to 301 credits." All three authorized Generate actions completed;
there were no retries, extra variants, reference uploads, VO, or publishing.
Picture/copy remains accepted. **Sound is delivered for listening review;
technical checks passed, creative audio acceptance remains pending.**

## Generation record

| Asset | Approved settings | Quote | Native result |
| --- | --- | --- | --- |
| Score, Clear Flow | Music v2.5, one variant, custom 0:11, Lyrics Auto, No Finetune, enhancement Off | 165 | WAV, 48kHz stereo, 12.04s returned |
| Flow | SFX v3, Auto, Loop Off, influence 30%, enhancement Off | 68 | Candidate 1 of the existing four-result batch, WAV, 4.00s |
| Buildup | Same approved SFX controls | 68 | Candidate 1 of the existing four-result batch, WAV, 2.00s |

The cap and summed composer quotes were **301 credits**. The visible balance
decreased from 60,601 before the run to 60,302 after both effects: **299 observed**.
The music profile display did not immediately refresh; the post-flow composer
showed 60,369. These UI observations do not establish an itemized settled charge.
No top-up or plan change occurred. Provider IDs, exact prompts, native hashes,
pre-submit screenshots and final-result evidence are saved in the local archive.
Candidate 1 was used for this review; no listening-based ranking is claimed.

## Local edit

- Kept the approved compressed video stream unchanged. No picture re-render.
- Retained one continuous eleven-second music passage at native tempo, with no
  source joins; the provider's extra 1.04s was low-level decay. Faded the retained
  ending from 10.2s to 11s instead of time-stretching or assembling fragments.
- Flow starts with a short fade, progressively becomes softer/more filtered from
  2s to 3.35s, and fades out by 4s as the illustrated restriction develops.
- Buildup source trim: 0.08-1.55s. Its measured main attack is at 0.13s using a
  10ms RMS window crossing -40dBFS. A 4.45s delay places that envelope anchor at
  4.5s, zero-based frame 108. Perceived onset still needs listening confirmation.
- Lowered music around the buildup cue and kept the contact-card tail sparse.
  Separate native sources, edited stems, 24-bit mix, exact filters and gains are
  retained. A measured envelope does not prove the intended musical resolution.

## Actual output and checks

`oceanides-glovio-sound-review-v1.mp4`: 11.00s, 264 frames, 540x960, 24fps,
AAC at 192kbps / 48kHz stereo. Full FFmpeg decode exited 0; the compressed video
stream hash matched the approved input. Stereo **-18.03 LUFS / -1.88 dBTP**;
mono downmix **-21.77 LUFS / -4.94 dBTP**. Both peaks are below -1dBTP.
Last 100ms measured -64.29dBFS peak, with a local fade ending at zero.

Output SHA-256:
`a03704a7f379cfd1f3886d1a0c6a09f1c17a8d4624fe984b735b969026a4ae21`.

Input SHA-256:
`93130b4ec7439538817cf7aa6e8d5dcbaede523d670e1189278cac1fac28119f`.

Direct listening was unavailable. Water realism, perceived cue timing, balance,
harshness, musical continuity/resolution and actual phone/Reels playback remain
unverified. This is a technically checked sound review, not a claim of finished
creative quality or published performance. No app code changed; app build/test
was not required or run for this media/documentation pass.

## Preservation and reproduction

Completed source/output archive:
`F:/CodexCreativeArchive/oceanides/organic/glovio-sound-v1/`.

Editable ZIP:
`F:/CodexCreativeArchive/oceanides/organic/oceanides-glovio-sound-editable-v1.zip`.

The original silent archive and first fourteen-second pilot remain unchanged.
Native media stay outside the public Git repository. These copies are local
preservation, not off-device backup. The new archive includes the original
editable Blender/HTML source, locked silent movie, sound sources and evidence.

To reproduce audio, copy the archive to a working directory, point
`OCEANIDES_FFMPEG` at the existing FFmpeg executable, then run
`node audio-v1/mix.mjs`. It verifies the input/native-source hashes, overwrites
only named outputs in that working copy, and makes no provider calls.
