# Independent timed opening review: correction pass 2

Independent timed visual verdict: **PASS for the bounded 222-frame opening,
under the approved Grifon copy and palette adaptation.** The earlier missing
profile entrance, brief tear, enlarging ring, material separation, growing
central honeycomb and broad late surround now occur in the correct visible
sequence. Remaining differences in refraction, highlights and pattern contrast
are recorded below. This is a close adaptation judgment, not a pixel-identical
match, a full-film verdict or an audio verdict.

The verdict comes from actual complete browser playback at 1x and 0.25x of
one encoded comparison stream, followed by visual inspection of all 37 normal
and all 108 slow chronological captures. It does not come from the passing
technical player checks, renderer checks, the number of correction attempts,
or a collection of manually sought still frames. The independent all-222 native
frame gate remains separate and is not replaced by this report.

## Exact captured bindings

| Input | Bytes | SHA-256 |
|---|---:|---|
| v3 pilot, captured from `../grifon-opening-pilot-silent.mp4` | 5,504,941 | `6815c6e5143257c2d8b4fa368735677754b8d57cc0685ccb7d2ce380459a1c69` |
| Native `source-x.mp4` | 11,514,975 | `47c8bbc8e3d06953dd850500e4c7702ce690b3a4bc6708c4fc6a1f3d392df089` |
| Private paired MP4, captured at `.tmp/paired-pilot.mp4` | 4,500,183 | `d7622e8c2e71b24cf7da7806e80ea7456272bcec3b51efe761a2d5523ed3a4fa` |
| Actual served `/paired` HTML body, saved as `../qa/review-player-timed-v3-served.html` | 3,712 | `24be8ad9854fd37a8909ec81d403cae61a482de74b445dd8eb03e9afb2bb48cf` |
| Actual served receipt, frozen as `../qa/review-player-timed-v3-receipt.json` | 1,120 | `c601ad7517b67e9e3a1903ea39e77be3918060bb455cba769a80a1f3d054b722` |

The runner hashed reference, pilot, private pair and local paired-page source
before and after both runs; every hash and byte count remained identical. It
also persisted the actual served HTML body and checked its hash against the
local page, rather than binding the page retrospectively. The served receipt
matched the owner's receipt byte for byte. Both responses were HTTP 200 with
`Cache-Control: no-store`. These are historical capture bindings; mutable
working paths must not be assumed to retain this version during later work.

The frozen receipt records two 960x540 halves in one 1920x540 stream, source
left and Grifon right, native 30000/1001 fps, frames 0-221, and no audio. The
owner used `trim=end_frame=222`, matching native PTS and `hstack`. Reference
pixels exist only in the private review stream and evidence; this paired video
is not a Grifon export.

## Actual playback method and limits

CUA had no enabled browser surface in this resumed task. I used the previously
authorized installed Playwright/Chromium 149.0.7827.55 fallback against the
owner's `http://127.0.0.1:61632/paired` server, in a fresh browser context at
1600x1000 with deviceScaleFactor 1. The route handler allowed only that local
origin. Visible Restart, Speed and Play controls started each run; there were
no intermediate seeks or recurring pair synchronization seeks.

Both halves belong to the same decoded video frame, so relative two-video
clock drift cannot occur. The page's `requestVideoFrameCallback` counter and
media clock were recorded before and after every screenshot, together with
wall time, speed, paused/seeking state, mute state and video playback quality.
Each image is bounded by its actual before/after counters; it is not assigned
an invented exact instant within that interval.

| Run | Sequential captures | Presented progression | Natural terminal clock | Elapsed wall time | Terminal browser quality |
|---|---:|---|---:|---:|---|
| 1x | 37 | 0 to 221; no recorded regression | 7.4074s, paused | 7.631s | 222 cumulative video frames, 0 dropped |
| 0.25x | 108 | 0 to 221; no recorded regression | 7.4074s, paused | 29.745s | 444 cumulative video frames, 1 dropped |

Wall durations include UI and capture overhead. A whole comparison frame may
be repeated or skipped by the browser; both halves still share its presentation.
No console error, external request or local network failure was recorded.
The video remained muted and the stream contains no audio.

I inspected the complete chronological normal sequence and all slow captures:
66 images in the four slow phase sheets plus the remaining 42 in three ordered
supplemental sheets. I also opened original-size captures around the brief
tear, white peak/type reveal, honeycomb expansion and final surround. These
are rendered observations captured during continuous playback. No direct
video/audio ingestion or human listening is claimed, and this sampling does
not independently inspect every native frame; the separate native-frame critic
owns that exact-frame coverage.

## Timed visual findings

The approved `MEET GRIFON` and `AI marketing` copy, local Inter and
charcoal/gold/cream palette are accepted. Source wording and hue differences
are not counted as failures. Geometry, projection, material separation,
positive/negative forms, cut order and growth still need to resemble the source.

| Phase and timed evidence | Independent observation |
|---|---|
| Opening, `single-quarter-003` through `011`, presented 6-26 | Large interrupted glyph groups now reveal across dark gaps and displaced horizontal bands. The opener is no longer one continuous smoothly warped sheet. Fine glyph detail and the precise masks differ, but the broken block silhouette and rapid expansion read at 1x. |
| Entry, `single-quarter-012` through `016`, presented 27-36 | The picture stretches into a blurred profile before the cropped shell resolves. The title begins tightly foreshortened and opens into readable type. The v2 early sharp complete shell has been replaced by a visibly staged entrance. |
| Warm turn, `single-quarter-026` through `035`, presented 58-80 | The warm treatment, local marks, short global interruption and reverse bowl occur in order. `031` brackets presented 69-70 and shows the strong tear; by `032`/`033` the bowl is visible. Minor broken edge traces remain, but global tearing no longer obscures the bowl through the former long clearing interval. |
| Ring, `single-quarter-036` through `066`, presented 81-138 | The same hollow rounded subject carries rapid chrome, glass, gold, cream, coarse dark weave, returning metal, voxel and defocused-field treatments. Its gentle enlargement is visible through the run. Large alternating carbon cells now read at playback size rather than as a nearly smooth fine mesh. |
| Flare, `single-quarter-068` and `069`, presented 141-144 | The white peak is followed by reduced-contrast type emergence before the stable relief phrase. The pilot is more evenly washed out and its emerging phrase is stronger than the source, but the white-to-type bridge is correctly placed and no longer cuts directly to fully contrasted lettering. |
| Relief, `single-quarter-070` through `093`, presented 145-190 | Raised phrase position stays stable while gold, dark and silver responses change against cream, bright gold and dark fields. The former unchanging gold letters merging into the field are resolved. Curved corner trails visibly grow with the treatment changes. |
| Pattern and grayscale, `single-quarter-094` through `107`, presented 192-221 | A central hexagonal field expands quickly outward, then yields to the thickening raised surround. The center and corners become a broad connected composition before grayscale; the former thin capsule of separate droplets is gone. The late stable phrase, dense surrounding forms and grayscale finish resemble the source in composition and progression. |

At normal speed the rapid ring cadence, bright bridge and late surround growth
read in the same order as the reference. At slow speed the transformation is
supported by changing presented images, not only advancing clocks. The valid
single-stream method remains distinct from the failed v2 dual-element method;
its frozen evidence and report were left intact.

Residual appearance differences are visible and should not be hidden behind
this PASS:

- The lens light/refraction flow is more symmetric and angular, while the
  source has a more fluid irregular sweep. The profile entrance, title
  compression and later reversal now match the motion structure; the surface
  flow is still an approximation.
- Metal rims and gloss edges are harder. The glass treatment is milkier than
  the source's thin clear response, while the cream replacement is an approved
  palette adaptation. The treatment sequence remains visibly differentiated.
- The central honeycomb is lower contrast and less conspicuous during its
  brief expansion. `094`/`095` show it growing on shared presented intervals;
  its subdued contrast differs from the source's bolder hexagonal outlines.
- Raised droplets and letter highlights have a heavier bead/gloss response.
  The merged late surround is now broad enough and follows the relevant
  corner-to-center growth, though its local arrangement and contours differ.

These residuals do not remove a signature phase or change its timed structure,
so they are non-blocking for this bounded close adaptation. The all-222 native
review may supply more precise scale/cut measurements; none of its measurements
are claimed as mine here. There is no fidelity judgment for frames after 221,
sound effects, music, beat synchronization or speech.

## Retained evidence

- `../qa/review-player-timed-v3-single.mjs`: frozen-input localhost timed runner.
- `../qa/review-player-timed-v3-single-clocks.json`: actual before/after
  bindings, served-page/receipt hashes, clocks, counters and capture paths.
- `../qa/review-player-timed-v3-receipt.json` and
  `../qa/review-player-timed-v3-served.html`: exact served input records.
- `../qa/review-player-timed-v3-single-captures/`: all 145 original sequential
  captures from the two complete runs.
- `../qa/review-player-timed-v3-single-normal-*.jpg`,
  `../qa/review-player-timed-v3-single-quarter-*.jpg`: chronological phase
  sheets and supplemental slow captures covering every retained observation.

Only owned v3 QA evidence and this report were written. No provider call,
install, product/renderer edit, broad test or helper server was started. The
owned browser/context were closed and the shared parent server was left running.
The v2 reports and failed-method evidence remain unchanged.
