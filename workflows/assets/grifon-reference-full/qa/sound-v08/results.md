# V08: completed B-direction soundtrack

2026-09-27. Neil delegated the choice after the V07 auditions ("Ikaw na bahala").
The assistant selected B, Digital Clouds, and completed a 32.9s music/SFX mix.
This is a finished export for listening, not a claim that Neil approved its sound.

## Deliverable and production

- `exports/grifon-your-next-ad-v08-1080p.mp4`, 16,629,844 bytes.
- H.264, 1920x1080, 30fps, 987 frames; AAC, stereo, 48kHz; exactly 32.900s.
- Music: Digital Clouds by Alejandro Magana (A. M.), Mixkit 175, source 8-40.9s.
- Eight recorded source effects, plus a reversed excerpt of the existing air
  effect; 99 placements, including individual typing and sparse message clicks.
- Continuous musical phrase, shaped gain/filter envelopes, transient ducking,
  quieter problem passage, reveal lift, and final fade ending before the black tail.
- The comparison now defaults to V08, with reference/V06 choices. Its standalone
  twin embeds the complete mixed MP4 and derives the download link from it.

`audio-finish-v08.py` reproduces the edit with existing Python/NumPy and FFmpeg.
`cue-sheet.json` records sample preparation and placements; `export-report.json`
records measured output, metadata, hashes and gain/filter envelopes.
`first-mix-report.json` preserves the pre-review technical checkpoint. Its video
remains in ignored local `assets/audio-v08/work/first-mix-v08.mp4`.
The previous comparison page is backed up as `backups/compare-v06.html`.

## Technical verification

- Full video/audio decode passes; delivered AAC measures -16.03 LUFS integrated,
  -1.35 dBTP, with a silent final black tail. These are technical results, not
  evidence of excitement, taste or exact similarity to the reference.
- Encoded video SHA256 is identical to the approved V04 picture:
  `71d2bc17fbb4467fdfa7ee1f36a3e2e994a2f617e0eeac8687e9d8a35a443473`.
- The main editable index.html remains SHA256
  `1cb32367d0aeff59cc4d6aacefa9fbabda12a070a669cb1be833414d244a2bd2`.
- Native browser MP4 playback reached ended=true at32.9s with no media error,
  muted=false, and decoded dimensions1920x1080. This proves playback, not hearing.
- Python AST, builder and comparison JavaScript syntax checks pass. Portable
  builder and artifact-anchor check pass. An extra EOF blank line was corrected
  before the whitespace check passed. An inline PowerShell/Node quoting attempt
  failed; the same read-only syntax check passed from a temporary .mjs file.
- No application code changed; full application build/test were not applicable.

## Listening review and editorial decisions

Used the existing Gemini web Flash chat, without provider API calls or upgrades:
https://gemini.google.com/app/f2c267c0b24961fd . The assistant did not directly hear
the audio. The review is an imperfect observation aid, not an authoritative ear.

The first full mix review reported a smooth ending and possible masking in the
chat section. It also contradicted itself: a clear versus missing middle impact,
and different descriptions of instrumentation/timing. Those disputed descriptions
are not accepted as facts. No new vinyl-scratch sample was added by this script.
The music's own content is separate from the authored SFX.

The bounded revision lifted message pops2.5dB, made music ducks deeper around
their arrivals, reduced music bass3dB in the chat section, raised the warm reveal
contact4dB, and softened reversed-air attacks to25ms. Source inspection also
moved the dialogue exit sweep from22.19s to the actual22.48s exit start.
SFX remain attached to visual actions; they were not moved to arbitrary music
beats. There is no claim that every motion transient matches a stock drum beat.

The final-v08.mp4 review reported no delivery-blocking flaw, clearer message
cues, and a smooth transition and ending. It still used uncertain instrument
labels; that is not accepted as source identification or proof of reference
fidelity. No further changes were made on the strength of those labels.

Parent CUA checked the comparison at390x844, captured/inspected mobile screenshots,
and measured document width375px within viewport390px. V08 selected by default;
play/pause, restart and chapter seek worked. V08/reference/V06 switches each left
only the selected audio unmuted, with no media errors. V08/reference playback
times differed by about13ms at the sampled point. Download points to the new
mixed MP4. The page was left paused at0s with V08 selected; viewport override reset.
The standalone twin's media is embedded and its script parses, but it was not
separately browser-tested in this pass. No real Android-engine check was performed.

The independent smoke agent had no available browser surface and returned blocked;
parent browser checks must not be described as independent or real Android QA.

## Sources and licensing

All sources are the same as V07. Credits, URLs, licenses and source hashes are in
`assets/audio-v07/SOURCES.md` and `source-manifest.json`. No stock samples or
isolated stems are distributed. Only combined video end products are shipped;
raw recordings and intermediate audio stay local and gitignored. This does not
license a future Grifon product/template asset library. No paid generation,
purchases, voiceover, deployment, merge or product integration was performed.
