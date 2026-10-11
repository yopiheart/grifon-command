# Independent opening-pilot review: correction pass 1

**Visual verdict: FAIL — another bounded correction is required.** Rounded
letter surfaces, pitch projection and the flare peak are improved. The current
opening field, lens-entry trajectory and late material/pattern transformation
remain materially different from the reference. This is a visual judgment of
frames 0–221, not an audio, full-film or technical acceptance.

## Exact inputs and method

| Input | SHA-256 |
|---|---|
| Native reference, 11,514,975 bytes | `47c8bbc8e3d06953dd850500e4c7702ce690b3a4bc6708c4fc6a1f3d392df089` |
| `grifon-opening-pilot-silent.mp4`, 3,992,749 bytes | `50713631826e5b6cb7cf90d6795f6f20e492fbc970a5d63cc3cb82256b7e57e8` |
| Approved `../pilot-brief.md` | `de3eee41511ab8faf704b32978e658865822100fa53cfe9e60483b1bd8d9f691` |
| `independent-shot-map.md` | `835cfd97aa4e27d343a37bc273e6352a058f0421353b671585c76f590c2b98c9` |

I checked both media hashes, independently decoded the first 222 native frames
of each exact file with the installed FFmpeg, and inspected every aligned pair
in 14 sequential sheets. Both decodes exited 0 and produced 222 images. Native
detail checks used frames 12, 29, 114 and 215; the other sheets establish the
successive silhouette, projection, material and pattern changes. Frame number
equals the image filename; time is `frame*1001/30000`. The pilot ends at
frame222 / 7.4074s. Evidence is under the private ignored directory
`.tmp/grifon-pilot-v2-independent-507136/`: both decoded sequences,
`pairs-0.jpg` through `pairs-13.jpg`, and `binding.json`.

This agent cannot perform independent continuous UI playback. The exact
browser2/tab3 binding, a fresh in-app localhost tab, and browser inventory were
tried through the supported CUA entry points; this agent's inventory contains
no browsers. No alternate browser automation was substituted. The working
`comparison_smoke` reviewer owns the separate normal/slow playback report,
`pilot-timed-review-v2.md`. This report provides the independently inspected
native-frame portion of the joint gate; it does not claim that frame sheets
establish perceived continuous motion. Its structural visual FAIL stands
independently of that timed result.

The approved `MEET GRIFON` / `AI marketing` substitutions, local Inter and
charcoal/gold/cream palette are accepted adaptations. Source hue or wording
differences are not findings. Density, projection, motion and the contrast of
different materials remain part of the approved contract. Neither video was
heard; the pilot is silent.

## Prioritized correction pass 2

| Priority / frames | Directly observed difference | Concrete correction |
|---|---|---|
| P1: 6–25 / 0.2002–0.8342s | The reference builds large broken blocks and irregular silhouettes from dense glyph rows, separated by black regions and horizontal tears. The pilot remains one continuous, regularly warped glyph surface with broad diagonal illumination. Native12 makes the difference clear: source blocks occupy separate left/top regions while the pilot's repeating rows fill nearly the entire lower region. | Author several coarse masked blocks with independent scale/offset and horizontal displacement through25. Match the large positive/negative shapes before refining glyph detail; a uniform wave over a glyph grid cannot supply this opener. |
| P1: 26–36 / 0.8675–1.2012s | The reference starts a radial, blurred profile reveal: at29 the field still rushes into the lens and the compressed title is near its lower center. The pilot already shows a complete sharp circular shell and large black cap at29, with its compressed title substantially lower. It opens the text and cap together, but the full-circle reveal happens too early and lacks the source's zoom/blur/deformation progression. | Preserve the now-present foreshortening, but delay the complete shell; match the blurred radial entry and apparent camera/profile trajectory through29–35 before settling. Move the projected title with the source-like profile instead of only opening its height inside an already exposed circle. |
| P1: 145–208 / 4.8382–6.9403s | The pilot's smoother raised letters are mostly one gold/chrome treatment. The backdrop changes cream→gold→muted gray while letter material stays gold. Around177–198 much of the letter/pattern treatment merges with the gold field. The reference changes the lettering's material response and contrasts it strongly against each new field. | Keep the approved palette but change material and contrast over the same interval: use cream, dark, gold and near-white responses with distinct reflection/highlight states. Preserve the stable phrase. Reproduce material transformation and visibility; another gold shade on a gold background is insufficient. |
| P1: 145–221, especially188–221 / 6.2729–7.3740s | The corner trails and late center surround exist, but appear as fine separate droplets. In the reference the center honeycomb grows into a large visible field around192–198, then rounded/merged bumps form a dense, broad surround connected to both corner trails. The pilot instead expands a relatively thin capsule-shaped droplet halo. Native215 shows source bumps visibly larger and more densely packed; pilot droplets remain small, isolated and glossy, with large empty regions between the corner and center fields. | Increase the actual visible scale/coverage, vary the rounded bumps into merged organic shapes, and reproduce the growing center honeycomb→rounded surround progression. Keep curved boundaries and continuous expansion from the corner fields. Inspect192,198,209,215 and221 at native size before encoding. |
| P2: 68–75 / 2.2689–2.5025s | Early local warm-phase marks are now separated from the strongest tear, which is an improvement. The pilot's global horizontal breakup then stays strong through roughly74; the source's dominant global tear is68–69 and clears into the hemisphere at70, with smaller remaining edge interruptions. The pilot's hemisphere is consequently masked for several additional frames. | Concentrate the full-scene tear at68–69, reduce it sharply at70 and preserve only local/edge disturbances afterward. Keep the measured reverse-pitch bowl and title projection visible through70–81. |
| P2: 111–118 / 3.7037–3.9373s | Carbon weave is present in the pilot at native114, but it is a fine diagonal mesh. The source has large alternating woven tiles and stripe groups that stay readable at reduced playback size. The pilot treatment looks nearly smooth in the paired sheets. | Use coarse alternating woven tiles at the source's visible scale and stronger local contrast. Preserve the shared ring geometry and material cut at111. Do not report the existing fine texture as absent; make its scale match. |
| P2: ring interval, measured114 / 3.8038s | Frame84 framing is approximately aligned, but the reference ring gently enlarges afterward. At114 its dark body spans x422–1497/y270–807 (56.04% width,49.81% height); pilot x470–1449/y297–782 (51.04%,45%). The current pilot holds the early size. | Apply the reference's gentle common camera/scale progression to the shared geometry through the material sequence. Keep the eight boundaries and frontal pose. Match84 and114 together rather than changing individual material shapes. |
| P2: 143–145 / 4.7714–4.8382s | The whiteout at141–142 is restored. The next frame143 jumps to a clearly legible complete gold phrase; the reference only faintly exposes lettering at143–144 while the flare continues to recede. | Retain the fixed seven-frame bridge and white peak, then fade the relief in progressively through143–145. Do not bring back the earlier ring/text crossfade. |

The measured114 ring bounds use mean RGB below150, restricted to y180–839,
on the native decoded carbon frames. This separates the dark body from the
light backdrop and avoids treating its faint shadow as geometry. The source's
progression is a common framing change, not a request to replace the shared
ring between materials.

## Improvements to preserve

- The phase order and ring material changes remain at82,91,97,104,111,119,126
  and132. The silhouette/hole remains shared. Do not undo the correct cadence.
- The lens now visibly projects/foreshortens its title during entry. Opposite
  pitch and the bowl/reflection phase remain present through the end of the
  warm lens interval. The entry trajectory still needs correction; projection
  is no longer simply absent.
- The broad smooth relief surfaces are substantially improved over the
  narrow contour ridges in the first rejected pilot. Current native215 has
  smooth faces and broad highlights. Preserve that progress while matching
  the surrounding material/pattern transformation.
- The near-white flare peak at141–142 is clear. Pixel measurement finds all
  pilot pixels at or above248 in all RGB channels at those two frames. The
  source has a broader flare rather than a uniform full-white frame (45.15%
  and53.20% above the same threshold). The remaining text-reveal envelope is
  a smaller issue than the opener and late patterns.
- Grayscale begins at209, the composition remains one phrase, and the pilot
  stops before222's next montage. No unrelated product scene or claim was
  inserted.

## Gate and limits

The source-bound MP4 receipt reports 1920×1080, 222 frames, 30000/1001 fps,
strict decode PASS and intentionally absent audio; those media properties
agree with the independent decode. The owner's separate runtime checks cover
deterministic seeking and asset readiness. They do not resolve the visual
differences above.

Proceed with the one remaining authorized correction pass, prioritizing the
coarse opener/profile entry and the large changing relief patterns. Re-review
the exact new render's native pairs and normal/slow synchronized playback.
If those material gaps remain after the bounded pass, document them and do
not claim a fidelity PASS or expand a rejected pilot into a complete film.
