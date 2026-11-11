# Oceanides Saveo V2 sound test

Prepared 2026-11-07. Neil approved the picture recut and asked to proceed.
**Neil approved the 581-credit cap on 2026-11-07.** The score, v3 narration and
latch were submitted. The [v4 amendment](saveo-sound-v4-amendment.md) records
the actual charges, Neil's new narration direction, and the held paper effect.

The sound should make the 19-second café mystery easy to follow. A Filipino
storyteller carries the situation and question. A light original score leaves
room for speech, with two practical effects for the latch and paper. The
audience hears the choices as the film moves between the clues.

Locked picture: `oceanides-saveo-choice-V2.mp4`, 19.00s, 540x960, 24fps, 456 frames.
Local master: `F:/CodexCreativeArchive/oceanides/organic/saveo-choice-proof-v2/oceanides-saveo-choice-V2.mp4`.
SHA-256: `3320f092af3752ffb381ab68a7c5355e61da11877fc276d2c61ca2f879e5211c`.
Copy the exact compressed video stream into the review.
[Picture brief and on-screen wording](saveo-choice-pilot.md).

## Credit cap and settings

| Asset | Exact generation settings | Maximum credits |
| --- | --- | ---: |
| Original score | ElevenLabs Music v2.5, one variant, custom 0:19, Lyrics Auto, No Finetune, enhancement Off | 285 |
| Narration | Eleven v3 website Text to Speech, Pochology - Expert Storyteller, voice ID `LcgJyGR0z3KbEI801THV`, Stability 0.5, Language Auto, one speaker, no auto-tag action or audio effects | 160 |
| Latch | ElevenLabs SFX v3, Duration Auto, Loop Off, Prompt Influence 30%, enhancement Off | 68 |
| Paper and pencil | Same exact SFX settings | 68 |

**Hard cap: 581 existing ElevenLabs credits and four Generate actions.** One
action per asset. The live music and SFX quotes were 285, 68 and 68. The
speech editor counted 160 characters. The published Eleven v3 website rate
is one credit per character, and no custom-rate notice appeared on the selected
voice in the composer. The 160-credit narration maximum uses that rate.
Recheck settings, quotes, and the voice rate notice at submission. Stop if
any asset exceeds its cap, the voice becomes unavailable, or a provider job is
uncertain. This test has no retry or extra variant allocation. SFX candidates
returned by an approved action can be selected and mixed locally.
[Eleven v3 website rate](https://elevenlabs.io/docs/help-center/product/core-capabilities/text-to-speech/how-much-does-it-cost-to-generate-using-eleven-v3-alpha)
· [Custom-rate notices](https://elevenlabs.io/docs/help-center/product/voices/voice-library/what-are-custom-rates-and-credit-multipliers).

Send only the exact text inputs below to the existing web composers. Generation
is for one local video review. Preserve native WAV if offered, otherwise native
MP3, with separate edited stems and a local mix. Publishing, media uploads,
paid analysis and account changes are outside the spec.

## Exact composer inputs

**Music**

> Nineteen-second instrumental underscore for an illustrated café mystery with conversational Filipino narration. Warm close-miked muted pizzicato strings, a dry felt-piano motif, and a sparse brushed tick at about 94 BPM. Start with two curious notes and an easy pulse that leaves plenty of room for speech. Pull the pulse back around 4.05 seconds to leave space for a small brass latch click. At 8.25 seconds, answer with a lighter pair of plucks for the paper insert. Let the floor-drain and sink details feel like two equally plausible clues, then hold a little tension beneath the audience choice from 12.75 to 15.75 seconds. At 15.75 seconds land a simple warm resolving chord. Let it decay smoothly to a quiet complete ending by 19 seconds. Restrained, tactile comic-mystery tone, score only, instrumental throughout.

**Narration**

```text
May amoy sa CR.
Magbubukas na yung café.

Bagong linis.
Pero bumalik yung amoy.

Saan kaya galing?

Floor drain? Lababo?

Saan ka unang titingin?
Comment A o B.
```

Use LF line breaks and omit the final newline in the composer. Speak the
recognition, reaction and choice in one continuous take. The narrator asks
about the two clues. The on-screen A/B letters carry the labels until the CTA.

**Latch**

> One isolated close practical foley of a hand releasing a small brass latch on a wooden interior café door: a short low mechanical click followed by a tiny wooden tick and a fast settling tail. About one second, dry close-miked recording, small everyday scale.

**Paper**

> One isolated close practical foley of a single sheet of cream drawing paper landing softly on a desk, followed by two short dry pencil arcs with a small gap between them. About two seconds, understated tactile paper and graphite detail, dry close-miked recording.

## Cue map and review criteria

| Picture anchor | Sound intention |
| --- | --- |
| 0-3.75s, wide and glance | Start speech on the hook. Continue the café line over the glance or first part of the latch shot. Leave a gap for the click. |
| 4.083s, frame 98 | Align the measured latch attack with the first rendered bump. |
| 4.5-8.25s, washroom and reaction | Space the cleaning and returning-smell phrases around the two cuts. Keep voice forward. |
| 8.25s, frame 198 | Paper landing at the insert cut. Fit the dry strokes near the two visible marks at 8.42 and 9.08s when separable. Keep the question clear. |
| 10.25s / 11.5s, frames 246 / 276 | Align the spoken clue names with their respective shots where the recorded phrasing allows. |
| 12.75-15.75s, frame 306 onward | Ask the choice question, let both labels arrive, and leave a readable hold. |
| 15.75s, frame 378, through 19s | Resolve the score on the sequel slate. The spoken voting line and musical tail finish before the last frame. |

Set precise trims and placements from the actual audio. Preserve connected speech
and musical phrases. Use natural pauses for phrase edits. If phrase boundaries
or pronunciation cannot be reliably verified, preserve the take, identify the
limitation, and label the result as a listening review. Do not infer exact spoken
words from the waveform. The creative review should check Filipino pronunciation,
story cadence, audible effects at the two contacts, and an uncluttered ending.

Technical pass requires a 19.00s, 456-frame full decode with the original
compressed picture stream hash, 48kHz stereo AAC, a clean tail, and true peaks
at or below -1 dBTP in stereo and mono. Aim near -18 LUFS integrated with voice
ahead of the music. Save native assets, source and final hashes, the generation
receipt, the cue trims and gains, credit observations, and decode/level evidence.
Target `oceanides-saveo-V2-sound-review.mp4`.

Preflight evidence is saved locally at
`F:/CodexCreativeArchive/oceanides/organic/saveo-sound-preflight-v1/`.
