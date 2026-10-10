# Codila sound-layer candidate

An audio-only candidate for the accepted Grifon shader film. The accepted sound-v1, silent picture, editable motion sources and earlier QA remain preserved. No new picture render is part of this candidate.

The original instruction is [Bodila51/opus-sound-layer/PROMPT.md](https://github.com/Bodila51/opus-sound-layer/blob/c113911c9d47e050569521f97fb88971cd4b07a3/PROMPT.md), pinned at `c113911c9d47e050569521f97fb88971cd4b07a3`. Use its original `sfx.py`, `mix.py` and `qa.py`; do not rewrite them or change their thresholds. The toolkit receipt records exact local source hashes. The instruction supplies a method and CC0 recording kit, rather than a music track or a guarantee of sonic quality.

`selection-recipe.json` assigns sound roles and source selectors. `export-cues.mjs` reads protected `pilot.json` cuts/camera and `full.json` shots/camera/endOnset. Cue frames are computed, not copied from the previous hand-authored sound table. Movement cues use the maximum absolute first discrete derivative of the actual cubic smooth/keyframe function, with the difference assigned to its arrival frame. The exporter checks the source easing and parses the original canvas character-count and pullback expressions. A changed expression stops export for inspection.

From the repository root, create a distinct private export directory:

```powershell
node workflows/assets/grifon-shader-recreation/sound-v2-codila/export-cues.mjs --out .tmp/codila-audio/cue-export-next
```

The exporter refuses existing output directories. `--music <file>` and `--kit <directory>` can select explicit root-prepared inputs; any such change must be recorded for the next candidate. The command writes only `cues.json`, `derived-timing.json` and a five-checkpoint `LISTEN.md`. It does not download, prepare, mix, mux, render or judge sounds.

The first export has 36 cues and six `thump+tap` heroes, with a mean hero gap of 4.26426 seconds. The original mixer applies `build` and `stop_before` to each hero, peak-aligns the selected recordings, rotates files and uses cue-ID-seeded pitch variation. Supporting sounds use only the selected `whoosh`, `swish`, `tap`, `click` and `key` recording types. The first blended glyph and incidental static logo hold get no added accent. No synthetic sub, hit, click or whoosh is used.

Music is the existing registered Digital Clouds source, privately prepared at source 0 through 31.146666667 seconds: 1,495,040 stereo samples at 48 kHz. It does not loop. The original mixer's end fade length is derived from `camera.endExit[0]` to native audio duration. Only the authored black tail is declared in `silence_ok`; this is an allowance for silence, not a claim that the mix is silent there. Voice is empty and the initial master target is -16 LUFS.

Before mixing, root must bind every selected file to the original CC0 source credits, exact bytes, an OK preparation sidecar and an inspected waveform/spectrogram sheet. Sidecar verdicts are technical measurements, not auditory approval. Raw recordings, private music, stems and caches are excluded from public deliverables. Root owns recording acquisition, selection receipts, actual mixes, encoded QA and stream-copy muxing.

Run the unchanged upstream QA against the encoded candidate and inspect its `qa.png` at every hero. Keep meaningful support picture warnings visible. A JSON cut boundary alone cannot prove the encoded picture passes the detector; small reflow/type actions and logo settling need particular scrutiny. Fix actual failures by changing cues or selected recordings within the two-round limit. Do not hide failures with weaker tags or thresholds. The known upstream limiter concern requires an independent encoded true-peak check.

Deliver a distinct `grifon-recreation-landscape-sound-v2-codila.mp4`, source credits and a completed five-checkpoint listening note only after those gates. The present files establish timing scaffolding. They do not establish a mixed, encoded, listened-to or reference-matched soundtrack.
