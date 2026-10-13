# Grifon Orbital: ElevenLabs Music v2.5 replacement

Music replacement requested by Neil on 2026-10-13 for the latest
[Orbital launch film](../grifon-pluto-adaptation/README.md). Picture remains
1920x1080, 60fps, 1,389 frames and23.15s. The original film and editable visual
source remain intact. This version uses the
[shared music workflow](../../background_music_production.md).

Accepted film: [continuous v2](grifon-orbital-launch-music-v2_5-v2.mp4), approved
by Neil on 2026-10-13: "AYAN PERFECT!!!!!!!!!!!!".
[Acceptance record](acceptance-v2.json) binds the exact film and source checkpoint.
Neil found the music source acceptable but rejected v1's chopped assembly;
[verbatim feedback](creative-feedback-v1.json) binds that verdict to v1's hash.
V2 corrects the assembly locally, with no additional generation or spend.

## Generation and source

[Exact spec](music.spec.json), [prompt](music.prompt.txt) and
[direct user approval](approval.json) bind one Music v2.5 generation to the
live360-credit quote: one variant, custom24s, Lyrics Auto, No Finetune and
auto-improve On. The24s request included a0.85s tail handle for the23.15s film.
No reference audio or video was uploaded. No reroll, top-up, stem generation or
paid AI review was authorized or performed.

[Provider outcome](provider-result.json): the exported stereo44.1kHz/192kbps
MP3 is62.275917s despite the selected24s. Preserve that duration-adherence
failure; it is not evidence of a successful duration control. The form quoted
360credits; the individual actual deduction was not exposed in the usage views
checked. Do not calculate a charge from the returned duration.

Native audio remains private at:
`F:/GrifonBenchmarks/pluto-2100297302497997167/music-v2_5-20261013/native/`.
The song is retained in the
[ElevenLabs project](https://elevenlabs.io/app/music/project/rYyQpjagFXWxpW2EBq5J?selectedSongId=TvJs9mBk80hB9OkXthmN).

## Musical fitting

V2 uses one uninterrupted native28.028-51.178s passage at its original tempo:
zero internal cuts, source jumps or manufactured reveal silence. The source's
own opening build and breath lead into a continuous groove around6s; its closing
chord lands around22s. SFX carry precise visual contacts, including the21s mark
arrival. Five modest, smoothly eased music ducks leave space for major movements.
The native early breath is intentional space, not an inserted silent fragment.
This prioritizes musical flow over forcing every requested timestamp into a
different source section. Timestamp instructions guided generation; they did
not guarantee a frame-exact original score.

The original26 SFX contacts were reconstructed from their existing source-bound
recipe, separately from the original music. The resulting48kHz stereo float WAV
is23.15s and its decode is byte-exact. The original premaster was also
reconstructed exactly as a control. Original SFX gains/pans/contacts are retained
before final mix mastering; music ducking yields to meaningful contacts.

Private stem and reconstruction receipt:
`F:/GrifonBenchmarks/pluto-2100297302497997167/music-v2_5-20261013/preparation/`.
Raw stock recordings, isolated SFX and native generated music are excluded from
Git. Store their hashes and the editing recipe so the mix remains recoverable
with those authorized local inputs.

## Deliver and reproduce

[Accepted MP4](grifon-orbital-launch-music-v2_5-v2.mp4),23.15s/1080p/60fps,
with stereo48kHz AAC. SHA256:
`4040ba1763aeb415b8d79a3b9d914959149b11fc89eed52489652da0e69d6405`.

[Continuous fit plan](continuous-fit-plan.json) records the single source window,
smooth fades, gains and music-only ducking. [Local recipe](mix-continuous.mjs) requires the
hash-bound native music, clean SFX, picture and original cue plan; no provider
call occurs. [Mix receipt](continuous-mix-receipt.json) records separate output stems and
final hashes. [SFX reconstruction receipt](existing-sfx-preparation.receipt.json)
retains source identity and original26 contact frames.

From this checkout, with the installed Node24 and FFmpeg runtime and the private
inputs present, regenerate into a new output directory:

```powershell
node workflows/assets/grifon-orbital-music-v2_5/mix-continuous.mjs F:/GrifonBenchmarks/pluto-2100297302497997167/music-v2_5-20261013/reproduction-v2
```

The recipe writes its receipt alongside outputs and refreshes the tracked mix
receipt; preserve the delivered version before deliberate edits. It overwrites
files with the same names inside the chosen output directory, so use a fresh
directory for a revision. Environment overrides `FFMPEG_PATH` and `FFPROBE_PATH`
support another installed runtime; raw inputs remain individually hash-bound.

Technical verification: strict audiovisual decode passed; all1,389 picture packet
payloads and integer PTS/DTS/durations match the original. Final audio measures
-16.06LUFS/-4.10dBTP. Every music sample maps consecutively to the single native
passage before smooth gain shaping; maximum mapping error is below6e-8.
[Independent v2 review](independent-review-v2.json) verifies that continuous
mapping, smooth envelopes, unchanged picture packets and26 SFX contacts.
Neil's listening and creative acceptance are recorded separately in
[acceptance-v2.json](acceptance-v2.json). Historical technical receipts retain
their original listening-pending status; user acceptance supplies the later
creative verdict rather than retroactively changing those measurements.

## Rejected assembly checkpoint

[V1 film](grifon-orbital-launch-music-v2_5-v1.mp4), [fit plan](audio-fit-plan.json),
[recipe](mix.mjs), [receipt](mix-receipt.json) and
[independent technical review](independent-review.json) remain unchanged.
V1 passed technical checks but failed Neil's listening review for musical flow.
Do not treat its exact pause or technical PASS as creative acceptance.
