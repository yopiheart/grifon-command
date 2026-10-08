# Reference audio versus clean local music

Neither B (Close Up) nor C (Digital Clouds) yields an identifiable exact track match under the tested offsets, playback rates and metrics. The focused model's high-confidence claim that C is the exact underlying instrumental is **not supported**. This is not proof of absolute absence: added vocals, SFX, processing, rearrangement or a different master could obscure a fingerprint. Direct hearing was not performed; sonic fidelity remains unverified.

All results use the actual native reference audio A, not an old mix. No provider calls, installations, new spend, reference-audio export or soundtrack mix occurred.

## Identity evidence

The search covered every offset of both clean tracks, five reference windows and playback rates 0.90–1.10. It used normalized PCM, a separate 300–3500 Hz PCM check, and 40-band spectral patterns with temporal differences. The practical identity gate requires at least three windows with strong scores and one coherent offset/rate. Neither track passes.

| Measurement | B: Close Up | C: Digital Clouds |
|---|---:|---:|
| Strongest window midband PCM absolute correlation | 0.054 | 0.062 |
| Strongest window spectral pattern correlation | 0.227 | 0.324 |
| Continuous opening 7.4 s, best spectral correlation | 0.163 | 0.289 |
| Continuous full 31.15 s, best spectral correlation | 0.111 | 0.094 |

C ranks higher for short spectral windows, while B ranks slightly higher for the continuous full reference. These scores are weak. C's best window offsets move between 66.04, 26.24, 60.20, 36.48 and 9.88 seconds with incompatible implied alignment; this does not identify a continuous underlying track.

Positive controls recovered a known C excerpt after added noise and AAC 64 kbps encoding. All four windows recovered a coherent offset: spectral correlations 0.898–0.930 at original tempo and 0.829–0.906 after a pitch-preserving 4% tempo change. A planted-pattern control also passed. These controls demonstrate useful detector sensitivity under those particular conditions; they do not cover every possible reference mix or mastering treatment.

## Periodic energy and dynamics

The same native 48 kHz stereo spectral-flux autocorrelation method reproduced A's earlier measurement. These are measured periodicity candidates, **not heard tempo**. Octave and subdivision alternatives exist.

| Track | Comparable periodicity candidate | Autocorrelation | Related slower candidate |
|---|---:|---:|---:|
| A: exact reference | 130.043 BPM | 0.683 | 65.019 BPM |
| B: Close Up | 105.029 BPM | 0.665 | 69.983 BPM |
| C: Digital Clouds | 128.999 BPM | 0.493 | 64.497 BPM, correlation 0.623 |

Energy shape uses stereo 20 ms RMS sampled every 5 ms, converted to dB and smoothed over 505 ms. Pearson correlation removes mean level, so it compares broad dynamics rather than absolute loudness, notes or track identity. Searches covered all offsets. The following intervals keep each candidate at its original playback rate.

| Reference window | B best source interval / correlation | C best source interval / correlation |
|---|---|---|
| 0–7.4 s | 15.485–22.885 s / 0.620 | 28.905–36.305 s / 0.778 |
| 0–15.573 s | 63.150–78.723 s / 0.541 | 28.900–44.473 s / 0.662 |
| 0–31.147 s | 63.070–94.217 s / 0.661 | 69.015–100.162 s / 0.448 |

Starting either clean track at zero is weaker: opening correlations B 0.433 / C 0.421; first-half B 0.374 / C 0.341; full-length B 0.253 / C 0.064. Searching rates raises C's opening slow-envelope score to 0.842 at 1.10x, but its rapid 20 ms energy correlation there is only 0.311. Optimizing broad dynamics does not establish an exact fingerprint or justify a 10% tempo change.

## Practical provisional use

- **7.4 s opening:** C at **28.905–36.305 s, original rate** is the stronger clean local dynamics candidate, with closer measured periodicity to A. C at 66.12–73.52 s gives the best weak spectral score instead. Neither interval is a verified sonic recreation; the two criteria select different material.
- **Full 31.147 s:** B at **63.070–94.217 s, original rate** gives the stronger whole-film energy shape, but its dominant periodicity is farther from A. C at **69.015–100.162 s, original rate** is a provisional option when the closer periodicity matters more, with weaker broad dynamics that would need an authored envelope. There is no measurement-supported single exact-fit track or interval.
- Any choice is provisional. These measurements do not verify vocals, riser identity, melody, instrument identity or perceived audio quality. Do not copy A into the export.

## Reproduction and source binding

- `compare_tracks.py` → `track-comparison.json` and `track-comparison-summary.json` (full offsets, windows, rates and controls).
- `compare_dynamics.py` → `track-dynamics.json` (same-method periodicity and energy searches).
- A native audio SHA-256: `5d848e1648efc71cb6b842d34625f8595ed2da842a4daa87dc0499217baca9ae`.
- B clean source SHA-256: `a7f05a29d07a84d38072ccd2b35204bca812db86e75b2a837e71cc144d3e739b`.
- C clean source SHA-256: `71cd4ea39edcc7532672bd97311abadfd318d00e7a828310a88b4f57fad9cd48`.

Both clean sources retain their existing manually recorded Mixkit web/social-use provenance. Raw source-library redistribution is not established. All PCM and compressed positive-control bytes remained in memory; source files were not edited.
