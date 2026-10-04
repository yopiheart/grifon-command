# Original audio verification

Recorded 2026-10-03. Reproduce from the isolated project root:

```powershell
node workflows/assets/grifon-motion-depth/audio.mjs
```

`audio-manifest.json` owns all timing, pitches, levels, panning and seed.
`audio.mjs` synthesizes separate music and effects buses, ducks the music briefly
under material/type/lockup contacts, mixes and writes `audio/score.wav` and
`audio/evidence.json`. It does not use a provider, downloaded recording, or
previous Grifon score. No external libraries are required.

## Confirmed

- Node syntax check and generation: exit 0.
- Independent FFprobe: PCM signed 16-bit little-endian, 48,000 Hz, stereo,
  384,000 samples per channel, exactly 8.000000 seconds, 1,536,044 bytes.
- WAV sample analysis: -3.00010 dBFS sample peak; -18.94823 dBFS RMS;
  zero clipped samples; nonzero stereo difference, -28.54052 dBFS RMS.
- Independent FFmpeg `loudnorm` input measurement: **-17.44 LUFS integrated,
  -3.00 dBTP, 1.50 LU loudness range**. This is the original WAV measurement;
  the analysis command did not save a normalized version.
- 84 generated events. All event RMS measurements are finite/non-silent.
  Thirteen effects correspond to the three camera passes/riser, four material
  cuts, assembly lead-in, three word arrivals, settle and logo reveal.
- Original waveform SHA-256:
  `88b2fd2f74fbfd4299a45d9f6e5067e566ab1b6454278039f96bfd1931a43c60`.
- Every half-second interval contains sound; the last quarter second fades to
  zero. The final sample of each channel is zero. These are numerical checks,
  not evidence that the mix sounds pleasing.
- Independent NumPy FFT on the written PCM: energy above 8 kHz is -28.04 dB
  relative to the full spectrum; 2-8 kHz is -22.58 dB; below 40 Hz is -27.24 dB.
  Maximum adjacent-sample step is 0.07904. Most energy is in 40 Hz-2 kHz;
  these values establish the spectrum, not absence of perceived harshness.
- Final timing refinement: only three type contacts moved, to 4.75, 5.00 and
  5.25 seconds. The first contact follows a visible entry from 4.50 seconds;
  the last visual rebound is specified to finish at 5.49 seconds, followed by
  the 5.50-second settle cue. Musical event design, seed and duration remain
  unchanged. Music ducking follows the new contact times and the existing
  peak normalization recalculates the overall gain.

Independent commands used with the existing desktop media runtime:

```powershell
& 'C:/Users/ADMIN/Desktop/grifon-command/.tools/media-runtime/node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe' -v error -show_streams -show_format -of json workflows/assets/grifon-motion-depth/audio/score.wav
& 'C:/Users/ADMIN/Desktop/grifon-command/node_modules/ffmpeg-static/ffmpeg.exe' -hide_banner -i workflows/assets/grifon-motion-depth/audio/score.wav -af loudnorm=I=-15.5:TP=-2:LRA=7:print_format=json -f null NUL
```

## Exact picture event map

| Seconds | Frame at 30 fps | Sound and intended action |
| --- | --- | --- |
| 0.12 | 4 | Lateral filtered air for the first foreground camera pass |
| 1.00 | 30 | Opposing stereo air for the second camera pass |
| 1.85–2.50 | 56–75 | Restrained rising tension approaches the orb reveal |
| 2.50 | 75 | Gold: short inharmonic metal body |
| 3.00 | 90 | Ceramic: hollow damped knock |
| 3.50 | 105 | Glass: crystal resonance with small cross delays |
| 4.00 | 120 | Wireframe: short ratchet and damped string-like pluck |
| 4.36 | 131 | Short air lead-in for the type assembly |
| 4.75 | 143 | YOUR contact after visible pre-roll, panned left |
| 5.00 | 150 | NEXT contact, centered |
| 5.25 | 158 | AD contact, panned right |
| 5.50 | 165 | Quiet precision settle |
| 6.00 | 180 | GRIFON reveal: bass body and sustained harmonic bloom |
| 7.75–8.00 | 233–240 | Smooth ending fade |

The camera/word times were specified as continuous seconds. The table rounds
to the nearest display frame; 4.75s and 5.25s fall between 30 fps frames.
The musical beat is 0.5 seconds, 15 video frames.

## Pending

Neither authoring agent can directly hear the audio through the available
model input. Full listening, perceived timbre, excitement, reference fidelity
and synchronization with the rendered picture remain pending. Objective level
checks do not substitute for Neil's playback/review.

The executor contract required ancillary repository checks even though this
standalone generator is not application code. Both were attempted once, using
existing ancestor dependencies without installing or creating a junction:

- `npm.cmd run build`: prebuild ASCII check passed; build exited 1 while Vite
  loaded `vite.config.ts`.
- `npx.cmd --no-install vitest run`: exited 1 while loading `vitest.config.ts`;
  no unit tests executed.

Both reported the same sandbox startup failure:

```text
[plugin externalize-deps]
Error: spawn EPERM
    at ChildProcess.spawn (node:internal/child_process:458:11)
    at optimizeSafeRealPathSync (.../vite/dist/node/chunks/node.js:1950:2)
```

Those initial attempts were execution-environment failures, not an
audio-generator defect. The production agent subsequently ran both checks
with process-spawn escalation in the same isolated worktree: build exit 0,
2,580 modules; Vitest exit 0, 1,414 passing tests and 32 default skips.
The successful baseline is recorded in the project README and its tool
transcript; no further application-suite repetition was necessary.
