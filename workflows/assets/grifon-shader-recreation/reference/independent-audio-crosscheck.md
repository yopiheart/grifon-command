# Independent focused-audio cross-check

Execution evidence reconciles. The strict timing gate remains **FAIL**. The
model's vocal, instrument, riser and exact-track findings remain hypotheses;
neither clean candidate has a verified sonic-fidelity pass. This reviewer did
not hear audio. No provider call, installation, soundtrack mix, source-file
change or new spend occurred in this review.

## Approved request and preserved output

- All A/B/C byte counts and SHA-256 values match the approved spec and the
  request/attempt receipts. A is the native AAC; B/C are the clean registered
  MP3 sources. The adapter supplies their exact files with the approved MIME
  types, A/B/C labels and exact approved prompt; it supplies no video frames.
- The spec and prompt hashes match the adapter's pinned values. The adapter
  creates an exclusive replay ledger, reserves the generation attempt before
  `generateContent`, and configures HTTP attempts to one. The completed ledger
  and receipts record one generation. They are local evidence of the executed
  run, not an independent provider-account audit.
- The concatenated non-thought text in `raw-response.json` equals
  `raw-analysis.txt` exactly. The parsed `analysis.json` payload equals that
  text's JSON. No response repair is hidden in the parser.
- Usage reports TEXT 744 + AUDIO 5,683 = input 6,427 tokens; candidate 772 +
  thinking 1,517 = generated 2,289 tokens; total 8,716. At the approved standard
  price basis, `(6427*1.5 + 2289*9)/1e6` equals **US$0.0302415**. Together with
  the prior US$0.0396285 estimate, the total is **US$0.06987**. These are token
  estimates; invoice/account charges were not inspected.
- The raw reference interval ends at 31.15s, exceeding the approved 31.146667s
  by **0.003333s**. The strict validator correctly records that failure. Its
  uncertain/neither fixture and invalid-fixture coverage are legitimate local
  structure tests. The small endpoint rounding failure should remain visible;
  it neither proves nor disproves the sound descriptions.

## Free comparison method and controls

The source-bound comparison uses normalized valid-lag PCM correlation,
additional 300–3500Hz PCM correlation, and local-mean-removed 40-band spectral
energies plus temporal differences. It searches candidate offsets on a 40ms
spectral grid and eleven playback rates from 0.90 to 1.10. PCM identity searches
use the original rate. The practical identity threshold is an authored
detector criterion, not a universal forensic threshold. Coherent alignment
across several windows is sensibly required; sharing a pulse or genre is
insufficient.

I independently compared the FFT correlation function with a direct
per-window Pearson implementation on seeded four-channel data. Maximum error
was **1.94e-16**. I also independently decoded A/C and reproduced two distant
windows from each real same-source control without writing media or replacing
the other agent's reports:

| Known C excerpt treatment | Window 0–6s score / offset | Window 20–26s score / offset |
|---|---|---|
| Gain 0.75, added noise 0.15 source RMS, AAC 64kbps | 0.898139 / 11.88s | 0.913634 / 11.88s |
| Same treatment plus pitch-preserving 1.04x tempo | 0.829142 / 11.84s | 0.856115 / 11.84s |

Those numbers reproduce the saved controls. The stable offset includes the
lossy codec's delay. The saved report additionally contains all four control
windows and a planted-pattern/seeded-negative check. These are meaningful
sensitivity checks for modest noise, compression and the tested tempo change.
They do not cover loud overlaid vocals/effects, stems, rearrangement, different
masters or arbitrary processing.

Neither B nor C reaches a strong, coherent fingerprint under this search.
Their strongest midband PCM scores are 0.054 and 0.062; strongest searched
spectral-window scores are 0.227 and 0.324. Neither has any window above the
stated identity thresholds. An additional no-offset, original-rate spectral
check of the model's specific C-at-0s/full-reference claim is **0.002404**.
The model's “exact instrumental” assertion is therefore unsupported by these
measurements. This does **not** establish absolute absence of C material from
an extensively altered mix.

## What the provisional rankings mean

The saved 48kHz stereo analysis measures spectral-flux periodicity, with octave
and subdivision alternatives. A has a strong ~130.043/min candidate; C has
~128.999/min alongside a stronger ~64.497/min candidate; B has ~105.029/min.
These are whole-track measurements, not heard musical BPM or measurements of
the proposed 7.4s excerpts. They do not verify the model's 126/120 estimates.

Broad dynamics use 20ms stereo RMS, dB conversion and a 505ms moving average.
Pearson scores remove mean level. C at 28.905–36.305s scores 0.778 versus B's
best opening score 0.620. For the full 31.147s shape, B at 63.070–94.217s scores
0.661 versus C's 0.448. These reported rankings and source intervals reconcile
with `track-dynamics.json`. Optimized envelope similarity does not measure
melody, instruments, vocal content, perceived quality or exact track identity.
The search compares many possible offsets, so a best score is a descriptive
ranking rather than a calibrated probability of similarity.

C's proposed opening is a defensible **provisional clean dynamics candidate**,
combined with its closer whole-track periodicity candidate. B's full-film
region is a stronger **broad dynamics candidate**, with more distant measured
periodicity. Neither wording amounts to a soundtrack acceptance or a sonic
recreation. No reference audio should enter a Grifon export.

## Reporting corrections

1. The initial `autopsy-summary.md` described the exact-C claim as
   “contradicted by” the comparison. Root corrected it to identity **not
   established**, with the masking/absence limit, during this review. The
   detector has useful positive controls but does not prove absence under
   every possible source mix.
2. Do not call ~129 versus ~130 an established “opening pulse” or tempo of
   C's 28.905s excerpt. The current measured comparison is whole-track
   periodicity. The excerpt's opening energy-shape result is separate. Root's
   revised summary now makes this distinction explicitly.
3. The voice words, proposed 7–8.5s riser, synth/genre descriptions and
   separation of music percussion from effects remain model hypotheses.
   Waveforms and flux cannot establish those identities. The earlier NO_VO
   and focused vocal-chop outputs disagree; there is no accepted transcript.

`track-fit-report.md` already preserves these important limits. No global
Swipe File pattern or tuned content follows from this single case.

## Hash binding

Reviewed exact approved inputs:

- A: `5d848e1648efc71cb6b842d34625f8595ed2da842a4daa87dc0499217baca9ae`
- B: `a7f05a29d07a84d38072ccd2b35204bca812db86e75b2a837e71cc144d3e739b`
- C: `71cd4ea39edcc7532672bd97311abadfd318d00e7a828310a88b4f57fad9cd48`

Reviewed artifacts:

| File | SHA-256 |
|---|---|
| `../audio-autopsy.spec.json` | `cc4104c83b9a5d1b55acfdaea0b302afa2e08926095fafd9271d257143aa5d7c` |
| `../audio-autopsy-prompt.txt` | `5bbb7925a1f60fad306811bee33d41b9ccd14f7633d4958fa7a4253a6d82603b` |
| `../audio-autopsy-run.mjs` | `9987c82d77c9687a27bcb789e17e22c300ac9dc7e500f9a1f4e2acebbedd135b` |
| `audio-autopsy/raw-response.json` | `7c834dc47e0d08bdab4f9ea06274f7c6c50aff638d5ee81e910659ea5cb1280b` |
| `audio-autopsy/raw-analysis.txt` | `9f111a363d70d79621ba26362d7daf8b986291fb47e55338e6847ee5dc6eb28f` |
| `audio-events/track-comparison.json` | `c446b1d8f131fa821d3aee0287a48690410ce1220e26469105584937d4746210` |
| `audio-events/track-dynamics.json` | `1af21973bdb72732dea9213dc72a117020ed85f703ffe3f92f7294cda07a51d1` |
| `autopsy-summary.md` at review | `8899350a9cc2a886d4bdeb21d1f460b767398e5406e445c2f09eed9bd1c55f5a` |
| `autopsy-summary.md` after reporting corrections | `9e09ee916fdcad70982304e095a56a55a53899de7f61e35aff7c60d45ad261df` |

Both comparison JSON method hashes matched the actual Python scripts. Review
checks exited 0; no broad build/test suites were repeated.
