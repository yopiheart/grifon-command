# Sound edit v1: independent technical review

**PASS — human listening pending.** Fresh independent audit exited 0 with all 17 technical checks passing. No provider calls, downloads or new spend occurred. Application tests and browser smoke are separate root evidence.

The frozen 25,057,741-byte MP4 SHA256 is `f92ac352000e0103c3271a16c190241dde80b8bc53e906a02f0ea913be3a53df`. Recipe SHA256 is `2814f78ac9ba32103cee283f7dff8c4880e18f515748cf2615b16d5a1c226eea`; sound builder SHA256 is `815d50464f95c0ce29d49f40c3b6f30c9cc71bc9525694a8cc7ec5a1ece49fc7`. [Detailed receipt](../qa/sound-technical-review-v1.json) binds sources, outputs, actual commands and both failed-attempt snapshots. Every bound input remained stable through the audit.

| Actual check | Result |
| --- | --- |
| Finished AAC | −16.33 LUFS, −2.18 dBTP; no clipped or nonfinite samples |
| Decoded audio | Exactly 1,495,040 stereo 48 kHz frames (31.146667 s) |
| Frozen pictures | All 932 H.264 packet payloads, PTS, DTS, durations, flags and decoder extradata identical; 1920×1080, 30000/1001 fps |
| AAC mux | All 1,461 payloads, timestamps and priming records identical to retained AAC master; decoded PCM byte-identical |
| Cue contacts | All 47 events / 56 layers present; zero-sample error in prepared and actual post-fade strongest samples, including frame 834 |
| Music placement | Every stereo sample matched the clean continuous source region plus declared shape, fade, gesture ducks, two gaps and 12 bounded transient dips |
| Actual mix | Independently prepared source layers matched within 7.445e-9; isolated layer sum matched SFX bus within 2.980e-8 |
| PCM master | One constant +7.79 dB gain plus 24-bit quantization; AAC/PCM correlation 0.998271 |
| Mono fold | 90.84% whole-mix energy retained; minimum cue window 66.17%; SFX 99.04% |
| Ending | Quadratic fade from frame 834; final 350 ms −139.52 dBFS RMS; final 20 ms exact digital silence |

The exact copied packet timeline is 31.097733333 s (PTS 0 through tick 932932 at 1/30000). MP4 track metadata rounds this to 31.098 s; the decoded audio extends 48.933 ms beyond the native picture timeline. This is recorded explicitly. Root's player gate now derives native duration from preserved packets. Fresh static integration binds root builder SHA256 `deef501d89a22c0841dca39d0815186bcc8527c4edd036aaa2059991eb8b8a4d` and standalone HTML SHA256 `550986f8e81c77cb45cd8825f0e5844b1feb7042e11f291cca8b465a867f8b2a`, and confirms its actual inline MP4 bytes are the frozen delivery.

Fresh child-process controls ran the frozen actual validator: the original empty cue array and stale music-source hash both failed with exit 1; the unchanged recipe passed with exit 0. The independent tail gate accepted zero energy and rejected an energetic tail. Current producer controls are bound to the frozen recipe/helper. Attempt 1 remains a real headroom failure; attempt 2 remains a verifier failure caused by rejecting exact zero energy. Snapshot hashes pass, and no failed evidence was overwritten or relabeled.

This proves source placement, signal integrity, objective cue timing and encoded delivery. It does not prove heard musical fit, perceived SFX balance, soundtrack identity, sonic similarity or a musical winner. No direct hearing is available. Stock provenance uses the existing register and credits; no fresh legal clearance is claimed. Raw sources and isolated/working audio remain private. Full native/paced visual review was not repeated because all picture packets and timing are identical. Prepared contacts and measured cue windows do not imply that the strongest sample of an overlapping finished mix remains at each contact.
