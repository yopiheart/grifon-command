# Oceanides Saveo V2 sound review

2026-11-07. The 19-second picture is approved and the sound review now uses
Pochology in Eleven v4. The original 581-credit approval and later 278-credit
amendment covered five Generate clicks in total. The provider returned two
takes on each narration click. The original v3 takes are archived. The final
audio uses v4 take 1, the original score and latch, and paper candidate 4.
[Original spec](saveo-sound-spec.md) · [Approved v4 amendment](saveo-sound-v4-amendment.md).

2026-11-08: Neil accepted this exact sound review and moved on to the next
format. The approval sidecar sits beside the local master and records the
verified movie and editable ZIP hashes.

## Reconciled credits

| Generation | Credits |
| --- | ---: |
| Music v2.5, Clue at the Café | 285 |
| Original Eleven v3 narration, including 50 owner fee | 210 |
| Brass latch SFX v3 | 67 |
| Eleven v4 replacement, including 50 owner fee | 210 |
| Paper SFX v3 | 67 |
| Total | 839 |

The final account balance was 59,463, down from 60,302 at the start. The
Nov 7 product/model CSV reconciled the two 160-credit narration rows, two
50-credit owner fees, and both 67-credit effects. The amendment used 277 of
278 approved additional credits. Cumulative usage was 839 of 840. Four paper
files came from the single approved SFX action.

## Local edit and checks

The v4 source is 12.36s. Its nine speech phrases were separated at measured
pauses and placed against the original cut without a tempo change. The cue
map leaves space for the latch, times the clue names against their close-ups,
and places the voting line on the final slate. The continuous 18.96s music
source is padded to 19s and fades at the end. The latch envelope anchor is
frame 98. The selected paper file had three separated transient regions.
Those regions are placed at frames 198, 202 and 218 for the insert and marks.

Whisper.cpp b5454 with multilingual base Q5_1 was run offline on both v4 takes
and the final encoded mix. Take 1 produced the clearest recognition of both
clue names. The final transcript recovered the story beats, both clues, and
the vote prompt in sequence. The recognizer produced spelling and word
boundary errors in Filipino, including rendering the CTA conjunction as
English “or.” This is a content cross-check. Neil accepted the delivered mix.
No independent listening or phone playback check was recorded.
[Whisper.cpp release](https://github.com/ggml-org/whisper.cpp/releases/tag/b5454)
· [Model](https://huggingface.co/ggerganov/whisper.cpp/blob/main/ggml-base-q5_1.bin).

The MP4 decoded all 456 frames at 540x960, 24fps and 19.00s, with 48kHz stereo
AAC. The approved compressed picture stream hash matched. The encoded mix
measured -18.03 LUFS and -2.13 dBTP in stereo, and -20.97 LUFS and -2.16 dBTP
in mono. The last 100ms measured below -120dBFS peak.

Output SHA-256:
`03fb4a64363458a984ef450c9e19d5c4c17d399046f9b139ec8f22297e49836b`.

Local archive:
`F:/CodexCreativeArchive/oceanides/organic/saveo-sound-review-v1/`.
Editable sound package:
`F:/CodexCreativeArchive/oceanides/organic/oceanides-saveo-v2-sound-editable.zip`.
The package includes the locked picture, native and edited audio, generation
receipts, exact prompts, mix script, and local verification. The original
illustration sources remain in the separate picture ZIP.
