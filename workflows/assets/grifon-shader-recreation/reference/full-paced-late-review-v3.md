# Late actual paced visual review v3

**LATE_PACED_PASS — qualified close visual adaptation for the assigned late range.** Every retained capture whose `observation.before.presentedFrame` belongs to `[496,932)` was personally inspected chronologically at both actual playback rates. No blocking late motion, phase-order, cadence, freeze or endpoint issue was found. This report approves only the late visual subset; the separate early/central reviews and whole-film closure govern the combined judgment.

| Bound input | SHA-256 |
| --- | --- |
| Actual timed capture report | cac3b8ff89463b80e5a5c3ebf5463ea649af45f65f24282c6db524b32018eabd |
| Grifon film | c99c93c8dd194946f757dbc078b0551ccd18aaecca6c2868f753cba8b0a59917 |
| Private silent source-left/candidate-right pair | f38818a7f53b5b3108a7b77eb4a94e0810e21c12c97a504dc220663c852d05bf |
| Pair receipt | b341f74d7e326f0d9fcf8f5d1f1c503d1f5120c3f67526eb29dbc2b2a28e1402 |
| Media receipt | e41cd21f0b234bab353578d554296136096af5fff52e00ca055f7866f455570a |
| Preceding native visual report | 7e8224fb6fcfa6a0b6c234777c57677e5cab42a9828710aa45e315d8be9f9746 |

The supplied browser run used one decoded comparison stream. The reviewer did not start a browser, seek, recapture, render or alter that run. The clock report records natural presentation from frame 0 through 931, ending at 31.097733 seconds at both rates. The assigned late observations begin at presented frame 499 at 1x and 496 at .25x; both include frame 931. Screenshot acquisition spans a before/after interval, so a capture assigned by its before frame may visibly cross a phase boundary. All assigned captures remain included.

| Phase | Range | 1x captures | .25x captures | Visual judgment |
| --- | --- | ---: | ---: | --- |
| Script reflow | 496–540 | 7 | 31 | Desktop perspective advances, mobile form enters and resolves over the same editor background; disclosed Grifon UI stays legible. |
| Script spin and return | 541–566 | 4 | 13 | Full-field whirl is visible in the quarter-rate sequence and resolves into desktop perspective. No isolated small spinning tile or frozen transition. |
| Storyboard and typing | 567–609 | 5 | 21 | Product storyboard substitution, full-canvas cut, progressive CREATE ADS typing and short horizontal tear maintain the sequence. |
| Canvas pullback and erase | 610–639 | 3 | 13 | Binary field resolves, overlapping scale/pullback advances, black-bar erase and final surviving stripe fragments are visible. |
| End onset | 640–654 | 2 | 9 | Black pause precedes the mark/glow reveal. |
| End hold | 655–833 | 25 | 76 | Small central Grifon mark holds while bottom-cropped glow sphere and surrounding contours change naturally. |
| End fade | 834–852 | 3 | 9 | Panel recedes/tilts and dims into black without an abrupt bright final image. |
| Black tail | 853–931 | 16 | 47 | Both halves remain visually black through the natural endpoint. |
| **Total** | **496–931** | **65** | **219** | **All 284 retained captures inspected across all 25 assigned sheets.** |

All nine normal-rate sheets and all sixteen quarter-rate sheets were viewed at their original file dimensions, with every populated tile inspected in chronological order. The sheet capture map is a bijection with the assigned observations: no duplicate or omitted filename and no capture outside the assignment. The per-capture maps and byte hashes are retained in `qa/full-paced-late-review-v3.json`. Before-frame progression is nondecreasing: normal-rate steps are 4–11 frames, quarter-rate steps 0–3 frames. The quarter-rate zero step occurs at the natural final frame. No assigned observation reports a seek, rate change, backward presentation or backward media time; paused observations are confined to the natural final frame. No additional late dropped frame occurs: the cumulative quarter-rate counter is already 1 at frame 496 and remains 1 at the endpoint. The normal counter remains 0. The capture report contains zero console entries, external requests or local network failures.

The already accepted adaptations and residuals remain visible: genuine English Grifon product captures differ from the source editor content; device entry and the first whirl state are crisper/stronger; the binary field is coarser with softer overlapping boundaries; erase stripe density and positions differ; the gold mark/glow onset is stronger; contours are broader and more regular; the receding rectangle edge is more visible. These differences preserve the established structural phase families and do not introduce a new blocking late issue. Sampled paced captures establish the visible erase/fragment cadence; exact native states 636–639 and the frame-640 black boundary are established separately by the bound native review, not newly proved as exhaustive native-frame coverage here.

All 315 bound files were hashed before inspection and rehashed at closure with exact byte-count and SHA-256 agreement: 284 raw captures, 25 sheets, the clock report, film, private pair, pair/media receipts and native visual report. Only this report and its machine-readable late-review record were authored. This silent visual review does not establish hearing, soundtrack/SFX identity, sonic similarity, pixel equality, exhaustive native coverage, final-player behavior or approval of the early/central range. Audio remains SONIC_UNVERIFIED.
