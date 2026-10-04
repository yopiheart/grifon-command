# Independent SFX pilot smoke - 2026-10-04

**PASS. No remaining actionable source/media findings. SFX listening approval remains pending.**

Final MP4: 5,177,231 bytes; SHA-256 `1928f4f158f84f9c94de754bb814686a4404e35bff369109307f92c20180c522`. Revised manifest: `5f387db62052a77fa20a6a94eaa6b82bc23e1802702be0ecdc8944c02da8827b`. Actual output/report/input identities match.

- Independent strict decode and counted format: 987 frames, 32.900s, 1920x1080 H.264 yuv420p at 30fps; exactly one stereo AAC48k audio stream.
- Read-only loudness meter: **-15.99 LUFS / -2.75 dBTP / 3.50 LU LRA**. No normalization applied by the check.
- H.264 Annex B payload matches approved picture: `7921bbb1e9782266d3d02a7b8bed6020c729e3dfbcb632bac8c54dcd56d0d75c`. AAC changed as intended.
- Faststart: moov precedes mdat. Last six RGB24 frames exactly equal zero pixels; last 0.200s has 9600 samples/channel, peak/RMS negative infinity.
- Approved Aira film remains `b11bb7c7f572c249b20cb2e767c57b737c947145876f5b3df569be45e944f067`; original picture remains `978d8e1d29bfbd40c89788a898377c5acca5d3ea7efcdfab1a50e71d4fbbff27`. All six locked inputs are unchanged.
- Report arithmetic matches fourteen placements, eleven positive VO-over-SFX RMS margins (minimum 22.028395dB), SFX-only delta scale 1 and zero altered base-master samples outside that delta.

All eight actual WAVs pass SHA/header/chunk/duration/sync/finite PCM/headroom/edges/DC/mono checks and strict FFmpeg decode. Stereo 48k PCM24; exact-zero file endpoints and last 5ms below -55dBFS; worst mono loss -0.000548dB, minimum correlation 0.999749.

| Sound | Seconds | Peak dBFS | Mono 300-3400Hz energy |
| --- | --- | --- | --- |
| hero-sweep | 0.75 | -6.160 | 18.7714% |
| product-weight | 0.65 | -6.151 | 18.5239% |
| pivot-suction | 0.70 | -6.155 | 15.4477% |
| sphere-reveal | 1.20 | -6.150 | 25.0455% |
| card-snap | 0.35 | -6.150 | 18.9328% |
| workflow-punch | 0.70 | -6.163 | 14.4909% |
| logo-resolve | 1.65 | -6.153 | 23.6400% |
| micro-select | 0.16 | -6.154 | 15.8521% |

FFT: full actual mono=(L+R)/2, rectangular window, next-power-of-two zero padding, one-sided squared magnitude with non-DC/Nyquist bins doubled; inclusive 300-3400Hz/all-bin energy. The agreed 15% proxy applies to the revised product-weight/sphere-reveal/logo-resolve; all pass. Catalog accurately has 24 designs, 8 pilot files and 4 unrecorded practical-Foley designs.

Source review: original seeded local DSP, no external samples/network/secrets/providers. Remix keeps approved PCM master fixed and adds only fitted-gain SFX difference; no music/VO gain, timing, EQ or normalization change. Guarded default observed zero file writes, child processes, credential reads and network calls.

Fixed findings verified: pack now stages and strict-decodes all eight plus checks SHA/PCM before promotion, with rollback; remix requires all fifteen named gates. Independent in-memory controls reject false/missing/empty gates, changed candidates and different existing releases before writes. Restored original guard accepts missing/empty gates, demonstrating the corrected defect.

Source hashes: builder `c97bc95629149ac6119e72ad122cea6f7da796aa587f053379d847b10a9ebf59`; remix `f12ddd2a87eb28cddc3d325096b5ceaed4228fcb1d4dcc199557b36450836177`.

Signal checks do not establish listening quality, word clarity, AAA/FilmCrux equivalence or physical-phone/headphone translation. Composite AAC re-encoding does not preserve separated encoded VO bytes. New SFX needs human audition; the full 24-sound library is incomplete. Only this evidence file was written; no media/code/inputs changed, provider calls, helper processes or commits.
