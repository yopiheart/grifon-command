# Sound pass v1

The new soundtrack changes the continuous music bed to **Close Up** and adds
47 authored sound events / 56 recording layers. All 932 video packets preserve
the frozen silent picture's payloads, timing and codec data; the decoded opening
222 frames also match. Pictures were copied without re-encoding.

The cue map follows the measured 30000/1001 frame timeline: camera air/sweeps,
restrained material switches, UI selections, four observed typing contacts,
short erase bursts, and a low logo landing. Six larger reveals use a short
deterministic sub impact. Stereo pan and rate/reverse variations distinguish the
motions. Frame 593 adds a space and has no authored key click.

`sound-spec.json` records the source region, native-frame contacts, layers,
source trims, gains, stereo motion, music shape, brief duck envelopes and fades.
The music source region is 63.070–94.216666667 seconds at 1x. Mastering uses a
single linear gain. Final encoded measurements are −16.33 LUFS / −2.18 dBTP with
9.9 LU loudness range, no clipped/nonfinite samples, and 1495040 decoded stereo
48k frames. Mono folding retains 90.69% of master energy and 99.04% of SFX energy.

These measurements establish technical integrity and authored timing.
**Listening remains pending.** They do not establish perceived musical fit,
reference song/SFX identity, headphone quality or competition ranking.

## Local build

Use the existing installed FFmpeg/FFprobe and registered local recordings.
Registry and credits are in this managed checkout's
`workflows/assets/grifon-reference-full/assets/audio-v07/`; the ignored stock
recordings are read from the same relative source path in PRIMARY
`C:/Users/ADMIN/Desktop/grifon-command`. No downloads/provider calls occur.

```powershell
node workflows/assets/grifon-shader-recreation/sound-v1/build-sound.mjs --validate
node workflows/assets/grifon-shader-recreation/sound-v1/build-sound.mjs --build
```

The builder refuses existing history or output files. Further changes require
a separate version and fresh evidence; keep this frozen candidate intact.
The final private work is `.tmp/build-v3/`, including all individual cue layers,
music and SFX stems, premaster, PCM/AAC master and verified staging mux. The MP4
is the delivered mixed end product; raw recordings and standalone stems remain
ignored. Source credits and hashes are in `qa/sources.json` and the existing
source register/SOURCES.md. The stock permission does not authorize bundling
these recordings in a software product or distributing the standalone samples.

## Evidence

- `qa/media.json` and `qa/mix-verification.json`: final output/source/mix bindings.
- `qa/cues.json`: 47 contacts, 56 layers, strongest-sample placement, 10ms duck
  envelope, event density and music/SFX energy windows.
- `qa/packets.json`: all video/AAC payloads, timestamps, priming and prefix proof.
- `qa/commands.json`: actual media commands and their own exit codes.
- `qa/controls-v3.json`: actual child-process source-binding/no-SFX rejection,
  exact encoded silence accepted, and energetic-tail rejection.
- `qa/checks.json`: final required build exit 0 and unchanged default Vitest
  exit 0, with 116 files / 1432 tests passed and 32 existing default skips.
  Earlier anchor-test timeout failures remain separately retained; the final
  run passed without changing tests, timeouts, flags or skips. Timing cause is
  unproven. The standalone player/browser and independent mix review are separate.

The original music-only cue array is used for the missing-SFX negative fixture.
The changed-source fixture mutates a recipe hash; it does not modify a licensed
recording. The silence control decodes the retained second-attempt AAC and
checks the final 960 stereo frames, rather than trusting a document or exit 0.

## Deviations

The first premix failed the objective headroom/loudness combination:
−23.93 LUFS /−8.28 dBTP. Its highest crest came from the music recording.
One bounded correction added 12 explicit 1.2–3.2 dB music-only cosine dips around
measured transients. Their 15ms approach, 15ms hold and 60ms return preserve the
continuous source and single-gain master. No cue or acceptance threshold changed.
`qa/attempt-1/` retains the failed helper/spec/controls and recorded failure;
its private stems remain `.tmp/build/`.

The corrected mix passed level/copy gates, then a verifier falsely rejected its
exactly silent final 20ms because zero energy is represented by `rmsDbfs:null`.
The fix explicitly accepts exact silence and keeps the −40/−70 dBFS fade limits.
Positive/negative controls establish the distinction. No DSP recipe changed for
that fix. `qa/attempt-2/` retains the original verifier/spec/controls and failure;
private candidate/stems remain `.tmp/build-v2/`. The final AAC is byte-identical
to that second attempt; the corrected verifier permits its valid zero tail.

No application/tuned/provider code, frozen full/pilot source, previous player,
existing audio recipe/master or prior MP4 was modified. New spend: US$0.
