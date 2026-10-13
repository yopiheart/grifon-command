# Grifon Orbital: ElevenLabs Music v2.5 replacement

Music replacement requested by Neil on 2026-10-13 for the latest
[Orbital launch film](../grifon-pluto-adaptation/README.md). Picture remains
1920x1080, 60fps, 1,389 frames and23.15s. The original film and editable visual
source remain intact. This version uses the
[shared music workflow](../../background_music_production.md).

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

The source is edited in musical sections at its natural tempo, rather than
accelerating the entire62s track. Target structure: airy ONE IDEA intro,
clean120BPM electronic groove through particle/collage motion, controlled lift
through DESCRIBE/BUILD/LAUNCH, wider harmony at the15.8s orbit reveal, a brief
20.75-21s musical breath, fuller Grifon reveal at21s and a resolved ending.
Timestamp instructions guided the generation; the local edit owns final timing.

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

[Finished review MP4](grifon-orbital-launch-music-v2_5-v1.mp4),23.15s/1080p/60fps,
with stereo48kHz AAC. SHA256:
`59ca220e77536cc99be2ce9a07052892fae9476436b3d97265ec5186412fc7f0`.

[Fit plan](audio-fit-plan.json) records native source cuts, crossfades, gains,
music-only ducking, pause and ending. [Local recipe](mix.mjs) requires the
hash-bound native music, clean SFX, picture and original cue plan; no provider
call occurs. [Mix receipt](mix-receipt.json) records separate output stems and
final hashes. [SFX reconstruction receipt](existing-sfx-preparation.receipt.json)
retains source identity and original26 contact frames.

From this checkout, with the installed Node24 and FFmpeg runtime and the private
inputs present, regenerate into a new output directory:

```powershell
node workflows/assets/grifon-orbital-music-v2_5/mix.mjs F:/GrifonBenchmarks/pluto-2100297302497997167/music-v2_5-20261013/reproduction
```

The recipe writes its receipt alongside outputs and refreshes the tracked mix
receipt; preserve the delivered version before deliberate edits. It overwrites
files with the same names inside the chosen output directory, so use a fresh
directory for a revision. Environment overrides `FFMPEG_PATH` and `FFPROBE_PATH`
support another installed runtime; raw inputs remain individually hash-bound.

Technical verification: strict audiovisual decode passed; all1,389 picture packet
payloads and integer PTS/DTS/durations match the original. Final audio measures
-16.04LUFS/-2.36dBTP. The edited music is silent20.75-21s, fuller groove begins21s,
closing chord lands22s and the final music fade begins22.9s. These are measured
editing properties, not an auditory taste grade. The
[independent review](independent-review.json) passed packet/decode, SFX integrity,
source bindings, timing and loudness checks. Its pause check also rejected the
original music as a negative control. Actual creative listening and user acceptance remain
distinct from waveform checks, source labels and technical export validation.
