# Provisional clean music candidate

Status: **TECHNICAL PASS / SONIC UNVERIFIED**. This is a private, music-only
candidate for the full landscape recreation. No direct hearing, exact track
identity, accepted vocal transcript or sonic-fidelity approval is claimed.
There are no reference-audio inputs, SFX, VO, splices or paid/provider calls.
The additional cost is US$0. No film has been muxed by this audio task.

## Recipe and source

`../audio.json` is the editable recipe: clean source/hash, offset, gain, sample
duration, preview timing, fades and normalization. `../audio-mix.mjs` uses the
existing local FFmpeg/FFprobe installations. It has no network/provider code.

The one input is the registered Digital Clouds MP3, Alejandro Magaña (A. M.),
Mixkit 175, SHA-256
`71cd4ea39edcc7532672bd97311abadfd318d00e7a828310a88b4f57fad9cd48`.
It remains at its existing private source path in the primary checkout. The
recipe uses a continuous **28.905–60.051666667s** source span, original 1x rate.
Resampling to 48k occurs before the exact sample-based trim. Its starting offset
is 1,387,440 sample frames. No source music file is copied into Git.

The selection is provisional: C at 28.905s ranked better for opening slow-energy
shape, and C's whole-track periodicity was closer to A. Those are different
measurements; they establish neither the excerpt's heard tempo nor a full-film
match. B's unrelated full-length energy ranking does not justify a splice.
The MP3's embedded 140 TBPM metadata is also not an independent tempo measurement.

Two authored fades keep the arrangement intact: a linear 0–60ms opening taper
and a quadratic ending taper from sample 1,335,734 (27.827791667s) to 1,495,040.
The latter begins at the nearest 48k sample to the reference end composition's
recession. Reference measurements show declining late energy, but this fade
does not copy A's waveform or claim an exact envelope/SFX reconstruction.

The existing `grifon-reference-full/assets/audio-v07/SOURCES.md` and source
manifest record Mixkit web/social video provenance and restrictions. Their
historical license inspection is retained; this task makes no fresh legal
clearance assertion. Raw music, stems and standalone audio mixes remain private
under ignored `assets/audio/`, outside the Git backup and delivered player.
Incorporation into the Grifon video remains root's pending mix decision.

## Verified outputs

| Output | Measured result |
|---|---|
| `assets/audio/mix-master.wav` | Stereo 48kHz 24-bit PCM; 1,495,040 frames; 31.146666667s; -16.45 LUFS / -3.04 dBTP. |
| `assets/audio/mix-master.m4a` | Stereo 48kHz AAC 192k; -16.50 LUFS / -3.15 dBTP; decoded 1,495,040 frames; strict decode PASS. |
| `assets/audio/opening-preview.wav` | Exact first 355,555 PCM frames of the master; 7.407395833s. |
| `assets/audio/opening-preview.m4a` | Stereo 48kHz AAC; -15.61 LUFS / -3.45 dBTP; strict decode PASS. |

The preview is within 4.17 microseconds of 222 video frames at 30000/1001fps. It
ends as an excerpt of ongoing music, without an invented end-of-pilot fade.
Its AAC stream reports 7.407s and decodes 797 padding frames; the full AAC reports
31.146s, 0.667ms shorter than PCM in its MP4 edit duration. These codec/container
details are explicitly recorded rather than described as sample-exact AAC.
Use PCM when exact preview prefix length matters. Measure the finished film's
encoded audio again after muxing; this report does not approve a future MP4.

Premaster placement is checked against every sample of the continuous clean
source and the authored fades; maximum error is 2.98e-8. The final PCM is a
constant -3.780000009dB scale of that premaster, with maximum residual 1.20e-7,
about one 24-bit step. Both endpoint sample frames are digital zero in this
render; the general endpoint gate permits only a floor below -120dBFS. Final
20ms RMS is -118.34dBFS, and final 350ms RMS is -58.06dBFS. Source hashes are
checked before and after rendering. Every output receives its own hash/probe.

## Correction and negative controls

The initial -16 LUFS / -3 dBTP / 9 LU LRA recipe triggered dynamic normalization
because the premaster measured -12.67 LUFS, +0.74 dBTP and 9.30 LU LRA. Its
output LRA fell to 1.60 LU. That failed the intention to preserve broad dynamics.
The conservative correction targets -16.45 LUFS with 11 LU LRA allowance while
retaining the -3 dBTP ceiling. The final normalization is verified linear, both
by its receipt and the full PCM constant-gain comparison. Independently metered
AAC LRA is 9.20 LU. The result remains approximately -16 LUFS with encoder headroom.

`audio-negative-fixtures.json` records three real verifier rejection checks:
a changed source hash, a changed opening-prefix sample, and the reproduced
initial dynamic-compression output. The original defect was actually rendered
and rejected by the gain check, not merely represented by a fake status flag.
All temporary substitutions were restored byte-for-byte. The final candidate
then passed `--verify` again. Fixture media and the private fixture runner also
remain ignored. Required repository checks passed: `npm.cmd run build` and
`npx.cmd vitest run` (116 test files / 1,432 tests passed; 9 files / 32 existing
paid/live tests skipped by their default configuration; live flags unset).

## Reproduction and limits

```powershell
node workflows/assets/grifon-shader-recreation/audio-mix.mjs
node workflows/assets/grifon-shader-recreation/audio-mix.mjs --verify
```

The default tool/source root is the existing personal-desktop primary checkout;
`GRIFON_TOOL_ROOT` can name that installed workspace explicitly. Reproduction
requires the existing ignored clean source, not a packaged raw library asset.
The current renderer intentionally rejects any nonempty SFX cue list or rate
change. Adding new audio inputs or authored SFX would be a separate plan.

Confirmed: continuous source placement, every-sample authored gain/fade behavior,
constant normalization gain, stereo/sample length, preview prefix, strict decode,
PCM/AAC loudness/peaks, source integrity, private-output ignore rules and zero
new provider spend. Unverified: melody/instrument/vocal resemblance, musical
quality, exact reference soundtrack and perceived sonic similarity. Root will
choose the final mix after review; this candidate has no sonic acceptance.
