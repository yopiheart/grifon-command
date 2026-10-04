# New ElevenLabs SFX selection — pending

Checked 2026-10-04. Root reported Neil's exact paid-spec approval:
`26eb8ef67ced35afc04f958705859da04f8f6b96c3eba24b5cd47ca00bfe4807`.
Only root performs paid/provider/UI work. This selection task made no provider
calls, read no credentials, generated no sounds and rendered no mix.

No release-valid `selected-manifest.json` has been written. Most families still
lack a usable recorded native-audio verdict; the optional keyboard, lens-focus
and logo-resolve families have no supplied generated catalog yet. Old SFX and
the procedural pilot are not substitutes.

## Recorded comparisons

The canonical comparison ledger is the primary checkout's
`.tmp/grifon-elevenlabs-assessment/<approved-spec-SHA>/`. A result is usable only
when its attempt says `RESULT_RECORDED`, its complete JSON names all four
candidates, and the result/native source hashes agree. These are machine
auditions, not this agent's direct hearing or Neil's approval of a replacement
mix.

| Family | Recorded outcome | Current selection |
| --- | --- | --- |
| pencil | Valid four-way JSON; candidate 4, machine confidence 0.95; actual $0.0179415 | Candidate 4 is a provisional semantic choice, subject to the locally verified cut below |
| card-pop | `ATTEMPT_CONSUMED_OUTCOME_UNKNOWN_OR_REJECTED`; result is truncated/invalid JSON, 231 bytes; actual $0.0213165 | Pending; no candidate chosen |
| orb-inward | No recorded usable result yet | Pending |
| reverse-air | No recorded usable result yet | Pending |
| laptop-contact | No recorded usable result yet | Pending |
| phone-contact | No recorded usable result yet | Pending |
| camera-contact | No recorded usable result yet | Pending |
| rotation-air | No recorded usable result yet | Pending |
| paper-swipe | No recorded usable result yet | Pending |

Pencil result SHA256 matches its completed attempt. All four pencil native
files match catalog byte counts/hashes and the request's recorded input hashes;
the complete result lists candidates 1–4. These bindings were checked locally.

The card-pop attempt recorded input 2025, candidate output 66 and thinking 1965
tokens: 2031 billed output tokens. No retry or settings change is performed by
this task. Root must reconcile the consumed attempt and obtain any necessary
new exact approval before further provider work.

## Pencil 4: semantic choice and measured cut

The recorded machine comparison prefers candidate 4 for controlled continuous
paper friction. Its approximate end of 0.92s is **not** accepted as timing
evidence: independent native PCM analysis finds activity through 1.940s, with
the strongest 2ms RMS bin at 1.888s and largest positive rise at 1.806s. The
two-second source is retained unchanged.

- Native source: `inputs/pencil-candidate-4.wav`, 384078 bytes, PCM16 stereo48k.
- SHA256: `b410f0789fb80ab2946a4c40ba0954cd8fcf4d03a7935642e32c9ac23dfce4bc`.
- Proposed source window: **1.008–1.940s**, 48384–93120 samples.
- Proposed source contact: **1.888s**, sample 90624; this is a signal marker,
  not a claim that an audible contact was independently heard.
- Placement: begin **25.300s**, sample 1214400; align the signal contact to
  outline completion **26.180s**, sample 1256640. Tail ends at 26.232s,
  before workflow narration begins at 26.800s.
- Exact contact equation: `1214400 + 90624 - 48384 = 1256640`.
- Cut measurements: sample peak -11.2512 dBFS, RMS -32.7293 dBFS. Most friction
  is much quieter than the final short signal burst; do not raise the whole
  source purely to its RMS target.
- Proposed initial cue gain **0 dB**, center balance. Root may audition a
  small bounded gain adjustment; this note does not assert an audible result.
- The existing 3ms cue-edge fades avoid a hard mid-stroke edit. No source
  stretching, reversal, EQ, normalization or source-byte rewrite is proposed.

Quarter-second source RMS values, 0–2s: -35.87, -37.73, -36.77, -34.15,
-37.35, -38.41, -37.03, -28.33 dBFS. This explains why a whole-file end or
machine timestamp cannot be treated as the desired .88-second line draw.

## Exact visible keyboard frames

Read the embedded `window.MOTION_SPEC` JSON only through its
`;window.INTER_OUTLINES` boundary. Use the actual `revealCharacters` count:

```text
count = t < start ? 0 : min(length, 1 + floor(clamp((t-start)/(end-start)) * (length-1)))
```

Evaluate this expression at each 30fps frame and place only newly visible
nonspace glyphs. The actual source yields **20 presses: 11 opening + 9 pivot**.
At stereo48k, each video frame is exactly 1600 audio samples.

| Line | Glyph/index | First visible frame | Exact timeline contact sample |
| --- | --- | --- | --- |
| Your next ad. | Y / 0 | 3 | 4800 |
| Your next ad. | o / 1 | 5 | 8000 |
| Your next ad. | u / 2 | 7 | 11200 |
| Your next ad. | r / 3 | 9 | 14400 |
| Your next ad. | n / 5 | 13 | 20800 |
| Your next ad. | e / 6 | 15 | 24000 |
| Your next ad. | x / 7 | 17 | 27200 |
| Your next ad. | t / 8 | 19 | 30400 |
| Your next ad. | a / 10 | 23 | 36800 |
| Your next ad. | d / 11 | 25 | 40000 |
| Your next ad. | . / 12 | 27 | 43200 |
| Until now. | U / 0 | 396 | 633600 |
| Until now. | n / 1 | 398 | 636800 |
| Until now. | t / 2 | 400 | 640000 |
| Until now. | i / 3 | 402 | 643200 |
| Until now. | l / 4 | 403 | 644800 |
| Until now. | n / 6 | 407 | 651200 |
| Until now. | o / 7 | 409 | 654400 |
| Until now. | w / 8 | 410 | 656000 |
| Until now. | . / 9 | 412 | 659200 |

Spaces receive no key sound. The last pivot period first appears at 13.733333s,
not the continuous schedule endpoint 13.720s. Native keyboard selection and
its local contact sample remain pending; do not invent a key source.

## Restrained full-film plan awaiting the other verdicts

- **Screen sweeps:** one principal sweep for each actual lateral exit at
  2.16, 5.03 and 8.08; a compact collective dialogue exit from 22.48 to 22.80;
  one shared workflow fan at 26.82–27.30. The old 26.76 cue was anticipation,
  not the current fan's visible start. Choose different trims of one coherent
  selected family only after its native-audio comparison.
- **Rotations and contacts:** movement begins at 2.63, 5.65 and 8.61. Preserve
  a distinct camera / phone / laptop material contact at 3.82, 6.84 and 9.80.
  The devices move as whole objects; static screens and the static laptop
  hinge do not justify invented UI-select or hinge Foley.
- **Camera focus:** optional short glide/detent from 3.52 to approximately
  3.66, lower than the main 3.82 camera settle. Pending new lens-focus family.
- **Warm pivot / orb:** inward gather ends on the existing 13.03 color cut;
  the orb sound follows the **inward contraction** from 14.27 to 14.83.
  Keep the tail clear of the Meet Grifon voice phrase at 15.05–16.25.
- **Cards:** purposeful contacts at 17.65, 18.86 and 20.80; workflow contacts
  in actual center-left-right order at 27.02, 27.25 and 27.30. Short tail
  windows matter more than more layered hits. Conversation letter sounds
  are omitted by default; this preserves room for narration.
- **Optional text accents:** at most first/last contacts of each collage
  phrase, a declining first/last problem accent, and selected direction-word
  accents. No continuous ticking on readable holds. A tiny cut of an
  assessed card/contact family is only a candidate, never a label-based
  substitute for the missing keyboard.
- **Outline:** the measured pencil-4 cut above covers the .88-second draw.
  Its own finishing burst can serve as the line completion; avoid an extra
  generic hit unless the whole-film audition demonstrates a need.
- **Compression / brand:** an inward gather reaches **29.28**; an independently
  selected logo punctuation begins at **29.28**, follows the 29.93 visual
  settle, and ends before brand narration at **30.04**. Pending logo-resolve
  family. URL appearance, brand voice and final fade receive no extra hits.

Every eventual manifest cue uses the integer48k contact equation:

```text
startSample + sourceContactSample - sourceInSample = timelineContactSample
```

All native assets will use their actual catalog paths, byte counts and exact
SHA256 locks. Frozen music and positioned voice retain their current samples,
timeline and master contribution 1.0752266011723428. Cue gain/balance affect only
new SFX; the existing mixer applies only its approved SFX-only phrase ducks and
headroom reduction. No old SFX, old master or procedural source is permitted.

The final replacement remains a review version. Commercial rights, full-band
human hearing, final picture/audio synchronization and creative approval are
not established by these notes, the machine verdict or signal measurements.
