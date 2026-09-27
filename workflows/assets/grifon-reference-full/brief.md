# Your next ad — full reference study

32.90-second, editable 1920x1080 / 30fps composition with music and SFX.
Neil approved the V04 motion pass and authorized music/SFX plus MP4 export. He
auditioned V05 and rejected its sound as weak and unlike the exciting, curious
reference. V06 rebuilds the original score and effects using reference signal
measurements and the approved animation's exact timing. Neil also rejected V06's
music and SFX on 2026-09-27. Neither sound pass is creatively approved.
The visual source is the supplied ElevenLabs/Reception.ai reference.
V05/V06 used no stock samples. V07 offers two short auditions using licensed
Mixkit music and SFX. Neil then delegated the choice and completion. V08 selects
B (Digital Clouds) and completes the full soundtrack. No paid calls, video models
or application changes. V04 picture and editable animation remain unchanged.

## V08 full-film delivery

Latest film: `exports/grifon-your-next-ad-v08-1080p.mp4`. Music is Digital Clouds
by Alejandro Magana (A. M.), Mixkit 175, source seconds 8-40.9. The continuous
music section is arranged with gain/filter changes, a quieter problem passage,
a reveal lift, clearer space for messages, and a fade into the final black tail.
Recorded SFX follow the approved visual timeline: typing, collage swipes,
rotations, shutter/lens, phone UI, laptop mechanism, messages, cards and logo.
No voiceover or reference soundtrack is included in the Grifon export.

Run `audio-finish-v08.py` using the existing Python/NumPy runtime, then
`node tools/artifacts/build-grifon-reference-full.mjs`. The comparison defaults
to V08 and retains reference/V06 choices. Its audio element plays the mixed MP4
end product; the portable twin embeds that same MP4, not a stock music-only mix.
The pre-V08 comparison is preserved in `backups/compare-v06.html`.

Source URLs, credits, license notes and raw-file hashes remain in
`assets/audio-v07/SOURCES.md` and `source-manifest.json`. V08 reuses those same
recordings. Raw recordings and V08 work WAVs/first mix stay ignored locally;
only the combined video end product is distributed. Do not package stock samples
or isolated stems into a Grifon product/template library.
V08 cues and technical evidence are under `qa/sound-v08/`. Neil approved the
completed V08 on 2026-09-27: "Boom! Approved solid brooo!!!" It is now an approved
case study for future workflow work, not evidence of universal reference coverage.

The opening adapts the reference's object/word collages and blue product reveals
to a camera, phone and storyboard laptop. These and the supporting objects are
fresh SVG illustrations in the collages; the three heroes are CSS solids with
separate front, back and side faces. The warm transition, luminous orb and conversation lead
to the approved 10.1-second ending, retained at reference time 22.8s.
The conversation is an editorial concept, not an actual product-UI recording.

## Sequence

| Time | Beat |
| --- | --- |
| 0–1.13 | Your next ad. / character reveal from 0.08 to 0.90 |
| 1.13–2.93 | To launch a product. / collage travels left |
| 2.63–4.58 | Camera / A NEW ANGLE / turn ends 3.82 |
| 4.04–5.69 | To tell your story. / filmmaking collage |
| 5.65–7.52 | Phone / YOUR STORY / turn ends 6.84 |
| 6.94–8.78 | To grow your business. / planning collage |
| 8.61–10.58 | Laptop / THE BIG PICTURE / turn ends 9.80 |
| 9.94–13.23 | But there’s never time to make it. / collage pulls into place |
| 13.03–14.27 | Until now. / pixel reveal, typed line and warm light |
| 14.27–17.42 | Contracting luminous sphere and orbital lines |
| 17.42–22.80 | What are we creating? → product launch → build the story |
| 22.80–32.90 | Approved quiet statement, three cards, strip and brand hold |

Overlapping intervals are pixel-mask handoffs. The actual artwork remains visible
inside outgoing tiles instead of being replaced by flat rectangles. The exact
visible text is in copy.js. Entrance blur is an authored approximation;
this is not physical shutter-based motion blur. Reference colors are the approved
study exception to Grifon's normal marketing palette. Original graph presets and
photographic objects were not supplied; vector objects, easing and light differ.

## Editable sources and reproduction

- copy.js: all visible English copy.
- opening.js / opening.css / opening.html: opening and middle composition.
- objects.js: fresh procedural SVG object library, independent of the app.
- solids.js: fresh CSS 3D camera, phone and laptop geometry.
- backups/approved-closing.html: untouched pilot used by the composition builder.
- index.html: generated main composition, all animation logic in one document.
- compare.html: synchronized reference/remake player, solo mode and chapters.
- serve.mjs: localhost-only preview server, port 4179.
- audio-score.mjs: original deterministic synthesis and precisely timed cues.
- audio-finish.mjs: two-pass local mastering, AAC encode and final stream-copy mux.
- assets/audio/: music/SFX WAV stems, 24-bit master, AAC master and cue sheet.
- exports/grifon-your-next-ad-1080p.mp4: finished H.264 + stereo AAC, 32.90s.

Build: `node tools/artifacts/build-grifon-reference-full.mjs`.
Preview: `node workflows/assets/grifon-reference-full/serve.mjs`.
Open http://127.0.0.1:4179/compare.html.
The builder refreshes index.html from the sources above and creates the portable
twin at artifacts/grifon-reference-full.html. Edit source files before rebuilding;
direct index.html edits work for local review but are overwritten by the builder.

## V07 audio auditions (listening decision pending)

Neil authorized two short alternatives after rejecting V06. Both show the same
approved first 10 seconds with the same recorded SFX cues. Option A uses Close Up
by Michael Ramir C.; Option B uses Digital Clouds by Alejandro Magaña (A. M.).
Music is selected stock, not newly composed or generated by Grifon. Source audio
seconds 8-18 are trimmed, faded, ducked around cues, and mixed for the picture.

- `exports/grifon-sound-option-a-10s.mp4`: A, -16.31 LUFS / -1.65 dBTP.
- `exports/grifon-sound-option-b-10s.mp4`: B, -16.08 LUFS / -1.37 dBTP.
- `exports/grifon-sound-ab-audition-v07.mp4`: 22.4s A-then-B reel with label cards;
  A plays at 1.2-11.2s, B at 12.4-22.4s. 1920x1080/30fps, stereo AAC.
- `audio-auditions-v07.py`: local reproducible editing/mixing and export source.
- `assets/audio-v07/SOURCES.md`: source credits, links and license scope.
- `qa/sound-v07/`: cue sheet, technical reports and qualified review notes.

These are listening experiments, not an approved final soundtrack. Raw stock
audio and isolated work files stay local/ignored; no music-only MP3 is delivered.
The older full-film comparison page still contains V06/V05, not these auditions.

## V06 audio and export (rejected; retained)

### Sound workflow research, 2026-09-27

Neil supplied [Higgsfield's setup post](https://x.com/higgsfield_ai/status/2103958391144227149).
Its visible text assigns automation to Claude Opus 5.5, visual assets to
Higgsfield, 3D/cameras to Blender, animation/compositing to After Effects,
music to Suno, and sound effects to Soundly. This is the author's reported tool
stack, not a released skill, exact prompt, mix recipe, or verification of the
original ElevenLabs reference's audio sources. The embedded video did not play;
only the post text was inspected.

V05/V06 used local procedural synthesis. Signal and sync checks passed for V06,
but the listening outcome failed Neil's taste test. Technical measurements did
not establish musical feel. A proposed next experiment is a short comparison of
distinct music choices with selected, scene-specific SFX before another full
mix. Audio-capable reference review and track audition remain unresolved; this
note does not authorize paid generation or change any skill/provider settings.

### Reproduction

Run `node workflows/assets/grifon-reference-full/audio-v06.mjs`, then
`node workflows/assets/grifon-reference-full/audio-master-v06.mjs`, then rebuild
the portable player with `node tools/artifacts/build-grifon-reference-full.mjs`.
V06 files live under `assets/audio-v06/`; the final video is
`exports/grifon-your-next-ad-v06-1080p.mp4`. An audio-only phone copy is
`assets/audio-v06/grifon-sound-v06.mp3`. Music, detail and motion stems are separate;
the SFX stem is detail + motion. All are premaster buses with shared headroom.

This is a new 105 BPM syncopated score, with a stronger reveal, brighter plucks
and percussion, exact character cues (including Until now), panning rotational
sweeps, different camera/phone/laptop finishes, message accents and a unified
logo resolution. No reference audio is sampled. The comparison's Soundtrack
selector can play V06, the actual reference, or V05 at the current timeline time.
Only the selected track is unmuted. The reference mode is a review aid, not part
of the authored Grifon master. V05 files and backups remain intact.

Signal analysis: `qa/analyze-sound.py` needs NumPy and Pillow. It measures broad
spectral balance, onset candidates and section energy; it cannot identify timbre
or judge excitement. `qa/compare-sound-metrics.py` demonstrates both measured
defects on V05 and corrections on V06. See `qa/sound-v06/results.md` for evidence
and the explicit listening limitation.

## V05 audio and export (retained)

The score is a restrained 80 BPM electronic instrumental with soft plucks, pads
and bass. The middle opens up around the warm/orb transition; the closing resolves
with a three-note signature. Typing, collage glides, object turns, chat entrances,
card moves and the final logo have individually timed synthesized effects.
There are 75 cue-sheet entries, including music blocks. No voiceover is included.

Rebuild audio with `node workflows/assets/grifon-reference-full/audio-score.mjs`,
then `node workflows/assets/grifon-reference-full/audio-finish.mjs`. The latter
uses the repository's existing ffmpeg-static binary and checks delivered AAC
loudness/true peak. Run the composition builder again to embed the updated audio
in the portable comparison. Stems are premaster buses; processing the combined
mix is required to reproduce the mastered sound.

For a fresh picture export, make FFmpeg and FFprobe available on PATH and run
Hyperframes 0.7.68 with:
`hyperframes render workflows/assets/grifon-reference-full --output workflows/assets/grifon-reference-full/exports/grifon-picture-v04.mp4 --fps 30 --quality high --crf 16 --workers 2 --resolution 1080p --sdr --format mp4`.
Then run `node workflows/assets/grifon-reference-full/audio-finish.mjs --mux`.
The silent picture and premaster WAV are reproducible intermediates, retained
locally but ignored by Git. The final MP4, stems, masters and source are backed up.
The `ffprobe-static@3.1.0` package (FFprobe 4.0.2) was installed into ignored
`.tools/media-runtime/` for this export;
the root application manifest and lockfile were not changed.

The V03 opening backup preserves the previous, under-animated pass. V04 fixes
Neil's feedback about missing typing, collage pans and object rotation. See
qa/motion-results-v04.md for measured before/after checks and remaining limits.

The existing pilot remains unchanged at port 4178. The reference MP4, Inter OFL
font, GSAP 3.13.0 and canonical public/logo.png are the same task-local assets as
that pilot. No other project's compositions, assets or settings were imported.

## Verification contract

Fail on runtime errors, obscured text, unintended motion during holds, stale
backgrounds after a cut, missing assets or broken seek/playback. Check transition
frames as well as settled scenes. Preserve the approved ending's wording and
timing, verify a text-only revision, and inspect the comparison at phone width.
Neil approved V04's visuals. V05 checks include final-file decode, metadata,
foreground motion on decoded MP4 frames, source preservation, measured loudness
and synchronized comparison playback. See qa/audio-export-results.md for actual
evidence and the remaining listening/device limitations.
