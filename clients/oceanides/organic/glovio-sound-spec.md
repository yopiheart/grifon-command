# Oceanides Glovio pilot: sound test spec

Prepared 2026-11-07. **Status: awaiting approval of this exact paid spec.**
Neil's latest proceed message accepts the picture/copy and authorizes preparation
of the sound pass. No new audio generation has run. The previous episode's
414-credit authorization does not fund this test.

## Purpose, input and limit

Add one original, restrained score and two practical water effects to the accepted
11-second illustration. Preserve its picture and readable contact ending.
No VO, borrowed boxing audio, provider-based QA, or publishing in this test.

Input: `oceanides-glovio-DRAFT-silent.mp4`, 540x960, 24fps, 264 frames, 11.00s.
Local accepted copy:
`F:/CodexCreativeArchive/oceanides/organic/glovio-mechanism-pilot/oceanides-glovio-DRAFT-silent.mp4`.
SHA-256: `93130b4ec7439538817cf7aa6e8d5dcbaede523d670e1189278cac1fac28119f`.
The filename's draft label is historical. Do not re-render or alter that input.
Only the exact text prompts below go to ElevenLabs; no video/logo upload.

**Hard cap: 301 existing ElevenLabs credits, exactly three Generate actions.**
Live composer quotes on November 7: 165 for one 11-second Music v2.5 variant,
68 for the flow SFX, and 68 for the buildup SFX. These are quotes, not a settled
billing ledger. Check them again before submission. No extra variant, retry,
top-up, subscription change, or higher quote is covered. Recover an uncertain
existing job before considering another submission. Changed generation inputs
require fresh approval. Native results from these three actions may be trimmed,
balanced, filtered and mixed locally without another provider call.

## Music: one Generate action, 165-credit maximum

ElevenLabs Music **v2.5**, **one variant**, custom duration **0:11**, Lyrics **Auto**,
**No Finetune**, prompt enhancement **Off**, no reference asset. Request
instrumental music through the prompt. Preserve the highest-quality native
download permitted by the existing plan: WAV if offered, otherwise provider MP3.
Do not upgrade the plan or claim that a converted file is a lossless source.

Exact prompt:

> Eleven-second instrumental underscore for a premium 3D plumbing explainer. Warm minimal organic-electronic groove at about 120 BPM with a sparse half-time feel, rounded felt-key plucks, muted marimba, a restrained soft bass pulse, delicate brushed percussion and an airy pad. Begin sparsely with clear space for a gentle water-flow sound. Add subtle rhythmic tension from two seconds as a pipe restriction forms. Make a small pocket of space around 4.5 seconds for a soft drain gurgle, then let a restrained rising texture follow the water level until eight seconds. Resolve warmly at eight seconds as the Oceanides contact card appears, thinning to a quiet clean sustained chord with a complete smooth tail by eleven seconds. Intimate, clean studio production, calm helpful confidence, instrumental throughout.

Arrangement times are generation direction. Enforce precise cue placement and
the 11-second ending in the local edit. Preserve one continuous musical phrase
where possible rather than assembling unrelated short pieces.

## Effects: two Generate actions, 68-credit maximum each

ElevenLabs SFX **v3**, Duration **Auto**, Loop **Off**, Prompt Influence **30%**,
prompt enhancement **Off**. The web composer may return up to four candidates
per action; choosing/downloading from that existing batch is not a retry.
Preserve selected native WAVs when available.

**Flow — exact prompt:**

> One close practical foley recording of a small steady stream of water moving smoothly through a residential PVC drain pipe, gentle liquid swish with light tiny bubbles, about four seconds, intimate dry studio perspective, clean and restrained, with a natural soft onset and a short smooth tail.

**Buildup — exact prompt:**

> One close practical foley recording of water briefly backing up inside a residential PVC drain, a small low wet gurgle followed by three soft irregular air bubbles and a short settling tail, about two seconds, rounded low-mid detail, restrained and believable.

## Local cue and mix plan

| Picture anchor | Intended sound |
| --- | --- |
| 0s, zero-based frame 0 | Gentle flow arrives with a short natural fade-in; score leaves it space. |
| 2s, frame 48 | Restriction label/formation: progressively soften and low-pass the flow rather than inventing a hard impact. |
| 4.5s, frame 108 | The new accumulation beat receives the gurgle's actual audible attack, not the beginning of any leading silence. Music makes a pocket around it. |
| 6.5-8s, frames 156-191 | Let the water effect settle while the musical texture carries the remaining rise. |
| 8s, frame 192 | Warm musical resolution with the contact card; keep the ending uncluttered. |
| 11s, after frame 263 | Complete musical tail and clean end. |

Use the existing FFmpeg lane at 48kHz stereo and an AAC final audio track. Retain
music, effects and mix as separate files. Determine final gains from the actual
sources. Start around -18 LUFS integrated and verify true peak at or below
-1 dBTP in stereo and mono; loudness is not a substitute for listening quality.
Copy the approved video stream into the sound review and verify it is unchanged.

## Pass/fail and evidence

Technical pass requires a full 264-frame decode, 11.00-second output, unchanged
approved video stream, stereo/mono level checks, and no clipped or cut-off tail.
Creative pass requires water effects that read as water, a restrained score that
supports the rising level, a clear 4.5s cue, and a deliberate contact-card ending.
Reject harshness, cartoon impacts, musical discontinuity, or an unrelated mood.
If direct listening is unavailable, label listening/creative acceptance pending;
waveforms and prompts cannot establish how the mix sounds.

Preserve exact settings/prompts, native files, generation/project IDs, pre/post
credit observations, quoted/observed charges, source/output hashes, cue trims,
mix settings, decode report and loudness evidence. Target local output:
`oceanides-glovio-sound-review-v1.mp4`. Save sources beside it and in a separate
local archive. Keep the silent accepted film and its archive unchanged.

## Preflight record

The live account profile showed Starter. Music composer showed v2.5 / 1 variant /
0:11 / Auto / No Finetune / enhancement Off and 165 credits. Both effect prompts
were entered without submission; the composer retained v3 / Auto / Loop Off /
30% influence / enhancement Off and 68 credits per action. No Generate was clicked.

Current provider references: [Music terms](https://elevenlabs.io/music-terms),
[Music guide](https://elevenlabs.io/docs/eleven-creative/products/music), and
[SFX commercial-use guidance](https://elevenlabs.io/sound-effects). Intended use
is audio embedded in this Oceanides organic video, not standalone music or
sound-library redistribution. Recheck actual download entitlement at generation.
