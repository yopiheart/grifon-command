# Independent timed opening review: correction pass 1

Independent timed visual verdict: **FAIL**, confirmed with the valid single-stream
comparison at1x and0.25x. The opening still reads as a continuous, finely
warped glyph sheet rather than the reference's large broken blocks, and the
late surrounding relief remains a thin field of small droplets. The smoother
letter surfaces, compressed title entry and curved surrounding trails are
visible improvements. This result concerns the first 222 frames only.

The final single-stream comparison is usable: both halves share one encoded,
decoded and presented frame. A working inspection method does not make the
pilot visually faithful.

Earlier dual-element method: **FAIL / INELIGIBLE FOR A PASS**. Both video
elements actually played through their timeline, but the reference's presented
pixels repeatedly froze while its reported clock advanced. Matching clocks do
not establish that both displayed images represent the same instant. Its failed
evidence is preserved below; the final verdict uses the single-stream method.

## Exact bindings

| Input | Bytes | SHA-256 |
|---|---:|---|
| Reviewed v2 pilot, captured as `../grifon-opening-pilot-silent.mp4` | 3,992,749 | `50713631826e5b6cb7cf90d6795f6f20e492fbc970a5d63cc3cb82256b7e57e8` |
| `source-x.mp4` | 11,514,975 | `47c8bbc8e3d06953dd850500e4c7702ce690b3a4bc6708c4fc6a1f3d392df089` |
| Original dual-element page: `d04dd16e:workflows/assets/grifon-shader-recreation/review.html` (retrospective Git binding) | 6,909 | `303d871d0a9a40eb570b9ae8803ce8ca389fdb44619a8f0ec5b44af3d00899a0` |
| Current `../review.html` after the capture (not the failed-method input) | 6,923 | `7fbcd6a40374c4df4ce06ec00b62edf5bc7ac3954ebf92b0d0af6236499cc2e8` |
| Current valid-player source `../paired-review.html` (retrospective source hash) | 3,712 | `24be8ad9854fd37a8909ec81d403cae61a482de74b445dd8eb03e9afb2bb48cf` |
| Frozen private `.tmp/paired-pilot-v2.mp4` | 3,799,432 | `0ef1e831e42a363f14d20591f4661c538f275818f3948597b6570766d0e478b9` |
| Frozen `../qa/paired-review-v2-receipt.json` | 1,120 | `f23c28d4a7199ca4b8a431c2b17fa2b5277918e8ca5f7f5d54e8b46a9dfaded2` |

The timed runners persisted media/receipt bindings, not served HTML bytes.
The original dual-page hash was recorded separately before capture and is now
also verified retrospectively from the exact `d04dd16e` Git blob. That blob is
6,909 bytes/hash303d871d; the current page is6,923 bytes/hash7fbcd6a4 after the
owner removed recurring sync-seeks and added the paired-player link. Its current
hash is source at this binding correction, not the captured failed-method input.
The paired-page source hash was likewise taken at this correction; it is not a
claim that the runner recorded that HTML body during playback. The final visual
review binds the actual paired media before/after and the observed presented-frame
clocks. The frozen v2 receipt and pair replace mutable paths used during the run.

Both media hashes were checked before and after the run. Native pilot timing is
30000/1001 fps, frames0-221, ending at7.4074s. The approved `MEET GRIFON` and
`AI marketing` copy, local Inter and charcoal/gold/cream palette are accepted
adaptations; wording or source hue differences are not defects.

## Final valid timed inspection and findings

The owner created a private single-stream preview from the exact source/pilot
bytes using `trim=end_frame=222`, matching native PTS, two960x540 halves and
`hstack`, with no audio. I read the receipt now frozen as
`../qa/paired-review-v2-receipt.json`, checked its
source/pilot binding, and independently hashed the resulting paired MP4 before
and after playback. Both hashes matched the value above. This stream contains
reference pixels and is an ignored private review input, not a Grifon export.

Using installed Playwright/Chromium149.0.7827.55, I opened the owner's
localhost61632 `/paired` page, at1600x1000/deviceScaleFactor1. Visible Restart,
Speed and Play controls started one complete1x run and one complete0.25x run;
there were no intermediate seeks. The `requestVideoFrameCallback` presented-frame
counter progressed from0 to221 in both runs and the natural terminal clock was
7.4074s. Both images share the same presentation even if the browser repeats or
skips a whole frame. There were no console errors or external requests.

The runs produced36 and107 native sequential screenshots respectively, with
wall time, currentTime and presented-frame values before/after every capture.
Elapsed wall durations were7.588s and29.972s including UI/capture overhead. The
browser reported222 video frames/0 dropped at the first end, and444 cumulative
frames/1 dropped at the second end, with no observed presented-frame regressions.
I inspected the complete chronological normal sequence and the slow phase
sheets spanning the whole opening, entry, ring/flare and relief. Long slow
phases use18 evenly selected captures per sheet; all107 originals remain.
These observations were captured during actual continuous browser playback,
rather than seeking extracted frames and calling them playback. This model's
visual assessment uses the ordered rendered observations; no direct video/audio
ingestion is claimed.

At normal speed the phase order and rapid ring cadence read correctly. The
following differences remain material enough to reject the close recreation:

| Phase | Timed visual evidence and measurable interval |
|---|---|
| Opening6-25 /0.2002-0.8342s | Source tears/jumps between large separated block silhouettes and black gaps; pilot smoothly bends one fine, orderly glyph sheet. `single-quarter-003` through010 show the different positive/negative forms and motion rhythm. |
| Entry29-36 /0.9676-1.2012s | Source rushes into a blurred profile before resolving. At presented29 (`single-quarter-012`) pilot already exposes a sharp complete shell/cap. The title now compresses and opens, but that projection operates inside an already revealed shell. |
| Warm clearing71-75 /2.3690-2.5025s | Source global tearing has mostly cleared into the bowl while pilot retains strong horizontal interruptions. Both later have a visible hemisphere/reflection; the issue is the clearing envelope. |
| Ring111-118 /3.7037-3.9373s | Source coarse carbon blocks remain clearly readable at playback size; pilot's fine weave reads almost smooth. See `single-quarter-051` through054. The source also gently enlarges while pilot holds its early size. |
| Flare143-144 /4.7714-4.8048s | White peak is improved, but pilot phrase is already strongly readable while source type only faintly emerges (`single-quarter-067`). The bridge timing is present; the reveal envelope differs. |
| Relief145-208 /4.8382-6.9403s | Pilot mostly preserves one gold letter response while its field turns cream/gold/gray; portions merge into the gold field. Source changes its letter/material contrast strongly. Approved hue substitutions do not excuse loss of material separation. |
| Pattern194-221 /6.4731-7.3740s | Source center honeycomb quickly grows and merges into a broad dense surround connected with the corners. Pilot expands a thinner capsule of separate small droplets with more empty gaps. `single-quarter-093` through106 show this progression and late grayscale contrast on shared presented frames. |

Smooth raised lettering, title projection, reverse bowl, fixed ring subject,
eight-treatment cadence, grayscale transition and stable phrase are improvements
to preserve. The source frame215 pattern is visibly larger/denser than the pilot
in the valid stream. The exact native-frame critic independently quantifies ring
frame114 at56.04% versus51.04% width; that pixel measurement belongs to its report,
not this playback inspection. I do not reject the approved copy, Inter or palette.

## Preserved failed dual-element method

The earlier CUA surface worked for the player smoke, but it was unavailable in
this resumed review: a fresh in-app tab failed and the supported inventory
returned no apps or browsers. I used the already-authorized installed Playwright
localhost runner, Chromium149.0.7827.55, at1600x1000 and deviceScaleFactor1.
Only127.0.0.1 requests were allowed. No external requests or console errors were
recorded. I started each full run with the player's visible Restart, Speed and
Play both controls; no intermediate manual seeking was used. Reference audio
remained off and the pilot remained muted.

The1x run produced33 sequential native screenshots and the0.25x run96. Each
capture records wall time and both media clocks immediately before and after
the image. Both runs reached paused frame221 /7.374033s. Maximum observed clock
differences were0.094727s at1x and0.057795s at0.25x. These are screenshot-run
observations, not claims of frame-exact paired presentation.

I inspected all normal-speed phase sheets, all slow phase sheets and the
chronological transitions within them. Inspection exposed stale reference
images, which I then confirmed by exact hashes of the raw reference-half pixels:

| Run | Identical consecutive screenshots | Advancing reference clock |
|---|---:|---|
| 1x | 7, `normal-004` through `normal-010` | 1.035388-2.902126s |
| 1x | 12, `normal-014` through `normal-025` | 3.618374-5.967639s |
| 1x | 6, `normal-027` through `normal-032` | 6.301547-7.374033s |
| 0.25x | 10, `quarter-018` through `quarter-027` | 1.435304-2.231337s |
| 0.25x | 17, `quarter-062` through `quarter-078` | 4.772920-6.006028s |

For example, the opening-dot image remains displayed during much of the lens
phase at1x; a turquoise ring remains displayed through much of the relief
phase. These holds contradict the independently decoded source sequence. The
player's recurring clock-correction seeks are a plausible cause, not a proved
causal diagnosis. No player source was changed by this reviewer.

The captures are real timed browser observations, rather than extracted frames
presented as playback. However, the frozen reference invalidates continuous
paired-motion acceptance, especially the warm reversal, cut cadence and flare
envelope. The earlier34 technical checks never checked presented-pixel freshness
and must not be substituted for this gate.

## Preliminary dual-element observations, superseded by the valid stream above

- **Opening, about0.2-0.84s:** the reference forms separated, coarse bright/dark
  glyph blocks with large black gaps and horizontal breakup. The pilot remains
  one orderly bent glyph surface, with broad diagonal/lower-left illumination.
  Its detail is no longer merely noise, but its positive/negative silhouette and
  motion grammar still differ. Slow captures `quarter-004` through `quarter-010`
  show this distinction while the reference pixels change.
- **Entry, about1.0-1.2s:** the pilot now visibly compresses and opens the title.
  In `quarter-012` and `quarter-013` its complete sharp shell/cap is already
  exposed while the source still reads as rushing, blurred profile material.
  This agrees with the exact-frame critic's26-36 finding; the source presentation
  problem prevents a precise entry-trajectory timing claim from this player.
- **Relief, about4.84-7.37s:** the pilot now has broad, smoother raised gold
  faces, replacing the earlier ridged appearance. It stays mostly gold as the
  field moves cream to gold to muted gray, so much of the central treatment has
  weak material separation. Its trails curve and grow into a capsule surround,
  but the late dots are visibly smaller and less merged/dense than the source's
  broad bumps and honeycomb field. Changing reference images in the late slow
  sequence (`quarter-080` through `quarter-095`) show the morphology difference;
  the source-held intervals are excluded from claims about transformation speed.
- The pilot visibly preserves the fixed ring subject, rapid treatment sequence,
  reverse bowl/title projection, white flare and stable final phrase. This is
  progress, but exact ring enlargement, coarse weave and143-145 text-reveal
  timing require the independent native-frame evidence rather than these drifting
  dual-element screenshots.

The separately authored [all222-frame review](pilot-fidelity-review-v2.md) was
read after these playback observations. It independently confirms the coarse
opener/profile-entry and late material/pattern gaps, and supplies native
frame114 ring bounds, weave detail and the flare envelope. Those measurements
belong to that reviewer; this report does not claim to have remeasured them.

## Evidence and next gate

- `../qa/review-player-timed-v2-single.mjs`: final bound single-stream runner.
- `../qa/review-player-timed-v2-single-clocks.json`: valid normal/slow clocks,
  presented-frame counters, hashes, mute states and screenshot paths.
- `../qa/review-player-timed-v2-single-captures/`,
  `../qa/review-player-timed-v2-single-normal-*.jpg` and
  `../qa/review-player-timed-v2-single-quarter-*.jpg`: final rendered observations.
- `../qa/paired-review-v2-receipt.json`: frozen owner's v2 construction/input binding.

The following dual-element evidence is retained as a failed method:

- `../qa/review-player-timed-v2-run.mjs`: reproducible localhost capture runner.
- `../qa/review-player-timed-v2-clocks.json`: exact hashes, clocks, rates, mute
  states and sequential screenshot paths for both full runs.
- `../qa/review-player-timed-v2-pixel-holds.json`: raw-pixel hold verification.
- `../qa/review-player-timed-v2-captures/`: native sequential screenshots.
- `../qa/review-player-timed-v2-normal-*.jpg` and
  `../qa/review-player-timed-v2-quarter-*.jpg`: chronological phase sheets.

These are private reference-study inputs, not a delivered Grifon film. No
reference audio or source-video bytes were added to the Grifon export. Temporary
browser instances were closed; the owner's shared server was left running.
No provider call, install, product/renderer edit or broad test was performed.

Use the remaining bounded correction pass for the visual findings. Review its
exact new bytes with the independent native-frame critic and a newly bound
single decoded comparison stream. Neither the current timed visual FAIL nor the failed
dual-element method authorizes a full-film fidelity PASS. No audio was heard
and no sound or music judgment is made.
