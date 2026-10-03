# Independent native media smoke - 2026-10-03

**PASS - technical verification. Human audition remains pending.**

Checked the stable `../grifon-full-upgrade-english-vo-1080p.mp4` directly with the installed primary FFmpeg and FFprobe. All commands completed with exit code 0. The file hash was unchanged across verification. Earlier draft measurements are excluded from this result.

- Final MP4: 5,179,901 bytes; SHA-256 `b11bb7c7f572c249b20cb2e767c57b737c947145876f5b3df569be45e944f067`.
- Strict full decode: FFmpeg `-xerror -err_detect explode` passed for all streams.
- Actual counted video: H.264 yuv420p, 1920x1080, 30/1 fps, 987 decoded frames, 32.900000 seconds.
- Audio: one stereo AAC stream, 48000 Hz, 32.900000 seconds. No extra streams.
- Faststart: `moov` at byte 32 precedes `mdat` at byte 36615.
- Independent read-only loudness analysis: -16.02 LUFS integrated, -2.74 dBTP true peak, 3.50 LU LRA. Passes -16 LUFS +/-1 and maximum -1 dBTP.
- Last six frames, starting 32.70s: decoded RGB24 payload hash equals 37,324,800 zero bytes, confirming exact black. SHA-256 `70592728cc722436312eeacb78d295c03b54d996f5499a07f59e27b53344ca66`.
- Last 0.200s audio: 9600 decoded samples per channel, peak and RMS both negative infinity. Digital silence confirmed.

## Preservation and input identity

- Approved no-VO film remains SHA-256 `978d8e1d29bfbd40c89788a898377c5acca5d3ea7efcdfab1a50e71d4fbbff27`.
- Original and VO H.264 payloads, independently extracted through the Annex B bitstream filter and hashed in memory, are identical: `7921bbb1e9782266d3d02a7b8bed6020c729e3dfbcb632bac8c54dcd56d0d75c`.
- AAC payload changed as required: original `095701ccc7fe7292c70f888a1145c15736fa64648f98c71ef24f1f195d536998`; VO `9da9d116aadcd8707808ec7b87a8e8087f151c2c432a52f85451ab4718bd2d54`.
- Exact approved spec remains SHA-256 `4d5b7d40849026e8d3eb21cf4706c460f17857179be1ccf9bb40785eb0ec28c9`. Finish-report spec/output hashes match actual files.
- Saved take/alignment hashes match the finish report. The single-attempt ledger records one consumed take for this exact spec.

## Phrase timing evidence

Independently checked all eleven entries in `qa/finish-report.json` against the immutable spec: exact IDs/text/windows, finite actual durations, no window overrun, matching output durations, and tempo no greater than 1.12. This validates the recorded timing evidence; semantic completeness still needs listening.

| Phrase | Actual start-end (s) | Approved window (s) | Tempo |
| --- | --- | --- | --- |
| opening | 0.120000-1.089958 | 0.12-1.09 | 1.120 |
| launch | 1.220000-2.465000 | 1.22-2.61 | 1.000 |
| story | 4.150000-5.395000 | 4.15-5.62 | 1.000 |
| grow | 7.120000-8.589146 | 7.12-8.59 | 1.115 |
| problem | 10.120000-12.075000 | 10.12-12.87 | 1.000 |
| pivot | 13.180000-14.117313 | 13.18-14.12 | 1.120 |
| introduce | 15.050000-16.250000 | 15.05-16.42 | 1.000 |
| conversation | 19.650000-22.180000 | 19.65-22.35 | 1.000 |
| direction | 22.840000-25.355000 | 22.84-25.55 | 1.000 |
| workflow | 26.800000-28.841958 | 26.80-28.86 | 1.120 |
| brand | 30.040000-31.445000 | 30.04-31.73 | 1.000 |

The eleven reported voice/music RMS calculations are internally consistent, with minimum voice-over-ducked-music margin 5.213875 dB. The recorded applied common master is linear. SFX equality evidence applies before common mastering and AAC encoding; final encoded samples necessarily differ.

## Limits

No listening, perceived emotion, unspoken-tag behavior, word completeness, GRIFF-on pronunciation, separate A/I delivery or physical-phone playback is claimed. Actual provider debit and remaining balance remain unknown. This smoke performed no provider calls, credential reads, synthesis, media edits or code edits; only this evidence file was written. No persistent helper process was started.
