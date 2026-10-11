# Independent opening-pilot fidelity review

Verdict: **FAIL — silent visual fidelity requires correction.** The current pilot preserves the opening phase order, the ring cut cadence and broadly matching ring framing, but its opening structure, lens entry and relief treatment are materially different from the reference. This verdict is limited to the first 222 frames. It neither approves a complete film nor judges music or sound synchronization.

## Exact reviewed inputs

All times below are source-frame times at 30000/1001 fps, with zero-based frames and half-open intervals. The pilot spans frames 0–221, ending at frame222 / 7.4074s before the source montage.

| Input | SHA256 |
|---|---|
| Native `reference/source-x.mp4`, 11,514,975 bytes | `47c8bbc8e3d06953dd850500e4c7702ce690b3a4bc6708c4fc6a1f3d392df089` |
| Current `grifon-opening-pilot-silent.mp4`, 4,447,267 bytes | `c8b52e7514162d19ac921ccc69f173fd20a7ccdce764d0663650c5ae3360a0f5` |
| `qa/pilot-media.json` | `731580ec3ba12cf599f64a1439e51bf0e32e4eb99c8bec92086c9472a496674a` |
| Approved `pilot-brief.md` | `de3eee41511ab8faf704b32978e658865822100fa53cfe9e60483b1bd8d9f691` |
| Measured `reference/independent-shot-map.md` | `835cfd97aa4e27d343a37bc273e6352a058f0421353b671585c76f590c2b98c9` |

The first render was also inspected before the centralization rerender: 4,449,615 bytes, SHA256 `22b181f119446325ae7604b132a78305df95e0b6c3f18e4a6bab6340a8999532`, preserved by the owner under `qa/pilot-v1`. The verdict and findings here bind the current `c8b52e...` render. The approved text substitutions are `MEET GRIFON` and `AI marketing`; source hues are replaced by the approved charcoal, gold, cream and near-white palette. Those substitutions are not defects.

## Inspection method and limits

I independently decoded all 222 frames of both exact videos to native 1920×1080 JPEGs with the installed FFmpeg. Both decodes exited 0 and produced 222 frames. I inspected every aligned source/pilot pair in eight sequential contact sheets, then inspected current pilot frames44,84,150 and215 at native resolution against the native source key frames. After the owner queried the warm-transition finding, I also rechecked exact native source frames58,60,68 and69 to distinguish early local tracking marks from the later global tear. The contact sheets were resized for display, so fine relief-edge findings rely on native images rather than thumbnails alone.

Local evidence is in `.tmp/grifon-pilot-fidelity-review/current/`: `ref/`, `pilot/`, `all-pairs-0.jpg` through `all-pairs-7.jpg`, `binding.json` and `native-measurements.json`. JPEG number0001 corresponds to source frame0. `binding.json` records the exact media hash, matching receipt, both 222-frame decodes and no mismatches across the eight source hashes recorded by `qa/pilot-media.json`. These bindings were checked again immediately before writing this report.

**Independent continuous native playback remains unavailable.** The browser inventory exposed no browsers to this reviewer. Attempts to open Chrome, the in-app browser and the owner's exact supplied browser2/tab3 each returned “Browser not available.” I did not try guessed IDs or claim that contact sheets establish continuous motion. The owner separately reported normal 1× paired playback with 26 screenshots at actual DOM clocks0.272–7.374s, maximum source/pilot clock delta0.041651s and a paused frame221 check. That is owner-reported timed evidence, not my independent playback observation; the supplied `.tmp/timed-review-v1/observations.json` path was not present when I attempted to read it. A future PASS requires an available independent timed review as well as corrected frames. The current structural FAIL does not depend on that unavailable PASS gate.

The pilot intentionally has no audio. I have not heard either file. Source soundtrack descriptions, music choice and sound/edit synchronization remain unverified and are outside this visual verdict.

## Prioritized corrective findings

| Priority / frames | Directly observed difference | Required correction |
|---|---|---|
| P1: 6–25 / 0.2002–0.8342s | The source forms large irregular silhouettes from dense character/dot blocks, with horizontal breakup and expansion. The pilot is predominantly fine, nearly uniform grain; a circular lens outline is already visible around frame19 / 0.6340s while the source remains in the dot-field phase until frame26 / 0.8675s. | Restore the coarse structured silhouettes and horizontal breakup through frame25. Keep the lens reveal at the measured transition rather than fading its full circle in early. |
| P1: 26–36 / 0.8675–1.2012s | The source lens enters as a deforming profile with a large black upper elliptical cap, cropped volume and strongly foreshortened text before settling. The pilot shows an early frontal circular contour with text already shaped like a face-on line, brought in by visibility/position changes. The dark wavy field reads through differently from the source's bent/occluded field. | Match entry pitch and deformation, black cap/inner ellipse, apparent volume and title projection together. Reproduce the briefly compressed title before it opens into the readable line; opacity alone does not supply the required projection. |
| P1: 145–221 / 4.8382–7.3740s | Native frame150 shows narrow concentric ridges/stepped engraved rims and serrated contours in `AI marketing`. The source has broad, smooth, inflated glossy letter surfaces with soft raised transitions and highlights. The pilot has visible relief, but its edge and surface construction is a different material shape. | Use rounded inflated relief, broad bevel transitions and coherent smooth highlights. Remove the repeated narrow contour ridges and visibly jagged edges; retain the approved local letter shapes and single stable composition. |
| P1: especially 188–221 / 6.2729–7.3740s | The source's dots/honeycomb trails curve, cluster and expand organically around the lettering. The pilot builds regular aligned dot grids with rectangular/diagonal boundaries; at native frame215 the perforated band reads as a uniform grid behind the type. | Shape continuous organic trails with changing density, scale and curvature, wrapping the type from upper-left/lower-right. Avoid using a regular rectangular dot field as the surrounding relief. |
| P2: 57–69 / 1.9019–2.3023s | The source warm cut at57 retains an intact dark sphere/title with local corner-box/tracking marks and small overlays (confirmed at native58/60), then tears globally through sphere, background and title at68–69. The pilot starts thin horizontal bands at the warm cut and keeps them through most of that interval. | Keep the abrupt material cut and early local marks. Separate those from the large global horizontal geometry breakup at68–69, followed by the reverse pitch; do not shift every early glitch element later. |
| P2: 138–145 / 4.6046–4.8382s | At140 the pilot already exposes a ghost of the next text inside/behind the ring; ring ghosts remain through144. In the source the flare peaks at141–142 with a nearly white wash, then text faintly emerges at143 before clearing. | Match the bright bloom peak and occlusion envelope before bringing the relief into view. Preserve the seven-frame bridge rather than a persistently readable crossfade. |
| P2: 111–118 / 3.7037–3.9373s | The source dark ring treatment has a clearly visible coarse woven/carbon surface. The pilot treatment reads substantially smoother and flatter at the aligned frames. | Make the woven surface visible at the same fixed framing. Preserve the shared silhouette and hole while changing its material. |

These are comparisons to the measured reference and approved brief, not requests for a new story, more copy or a different brand palette. The grayscale section starts at the correct frame209, but its current light ridged edges on a darker field amplify the relief-shape mismatch compared with the source's rounded gray relief on a light field. Reassess that contrast while fixing the surfaces rather than adding another shot.

## What already matches and should be preserved

The phase boundaries and eight ring substitutions are aligned at frames82,91,97,104,111,119,126 and132. The ring retains a shared outer shape, broad face and horizontal hole, with approximately matching bounds at native frame84. Material differences remain, but changing its geometry or timing would undo a matching part of the pilot.

The later opposite pitch into a broad hemisphere is now present around frames70–81; it should not be reported as absent. The title foreshortens in that phase and the bowl/reflection treatment is substantially closer than the entry. The text composition persists across the relief interval, and the grayscale transition occurs at209. The pilot ends before frame222's next montage, as required. No unrelated UI, offer or product story appears within this reviewed opening.

## Next bounded pass

1. Correct the opening structured field and lens/title entry while preserving the now-present reverse hemisphere and all measured phase boundaries.
2. Correct the inflated relief construction and organic surrounding trails; inspect native frame150 and late frames188,209,215 and221 before encoding.
3. Localize the warm-phase tear, match the flare whiteout and restore visible carbon weave without changing shared ring geometry or its cut cadence.
4. Produce a source-bound render and aligned pairs, then review the entire 0–7.4074s at normal speed. Report visual and technical verdicts separately. The authorized two correction passes do not imply acceptance of unresolved gaps or approval to expand into the complete film.

The media receipt's dimensions1920×1080, 222frames, 30000/1001 fps, strict-decode PASS and intentionally absent audio are consistent with the independent decode/binding checks. They establish a valid silent pilot file; they do not resolve the visual failures above. I did not independently verify every runtime contract, randomness/seek behavior or no-network claim in this fidelity-only task.
