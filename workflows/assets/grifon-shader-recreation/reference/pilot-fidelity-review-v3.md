# Independent opening pilot native-frame review: v3

Native-frame visual contribution: **PASS, with the residual differences below**.
The revised opening is materially close to the approved structural visual
contract across frames 0-221. This is not an overall timed-motion verdict;
the separate actual-playback review must also pass before the joint gate passes.
Neither encoded-media validity nor effort spent on two corrections determined
this visual judgment. No audio, hearing, full-film or publication approval is made.

## Exact reviewed inputs and method

- Source `reference/source-x.mp4`: SHA256
  `47c8bbc8e3d06953dd850500e4c7702ce690b3a4bc6708c4fc6a1f3d392df089`.
- Current `grifon-opening-pilot-silent.mp4`: SHA256
  `6815c6e5143257c2d8b4fa368735677754b8d57cc0685ccb7d2ce380459a1c69`,
  5,504,941 bytes, 1920x1080, 222 frames at 30000/1001, intentionally silent.
- `pilot-brief.md`: SHA256
  `de3eee41511ab8faf704b32978e658865822100fa53cfe9e60483b1bd8d9f691`.
- `reference/independent-shot-map.md`: SHA256
  `835cfd97aa4e27d343a37bc273e6352a058f0421353b671585c76f590c2b98c9`.
- Current media/source receipt `qa/pilot-media.json`: SHA256
  `3375ea1795ce8ee221fd5a81d29f09f84f086ada5dcdc4601e57fd388b2889bf`.

Independently decoded the first 222 native frames of both videos with the
installed FFmpeg, zero-based filename numbering and identical time bases.
Both decodes exited 0. Inspected every corresponding pair on 14 ordered sheets,
then original-resolution source/pilot frames 29, 114, 192 and 215. Checked
carbon/ring bounds with an independent pixel calculation at 84 and 114.
Private evidence is in `.tmp/grifon-pilot-v3-independent-6815c6/`, including
`binding.json` and `bounds.json`; it is not a delivery asset.

Reviewed the preceding v2 native and timed reports. English copy, local Inter
and the specified Grifon palette were evaluated as authorized substitutions.
I did not equate different words or hues with a fidelity defect. Dense geometry,
projection, contrast and phase order still had to be present. This method
inspects consecutive positions and changes, but does not establish perceived
continuous motion, normal-speed cadence or slow-playback smoothness. No browser
playback or direct listening is claimed by this reviewer.

## Corrected load-bearing structure

| Frames | Independent visual finding |
|---|---|
| 0-25 | Near-black onset now develops into distinct coarse illuminated character blocks, horizontal disruption and substantial black negative space. The prior single regular glyph sheet no longer describes the result. |
| 26-56 | The entry now contains a cropped, radially blurred lens/profile rush and a strongly compressed projected line before it becomes readable. Subsequent title pitch/position and huge cropped lens are present; the settled composition remains close to the measured source framing. |
| 57-81 | Abrupt warm/material change, local early tracking artifacts, global tear at 68-69, then clear reversed pitch/open bowl with a lower reflection. At 70 the global tearing has cleared; the remaining brief artifacts are at the edges. |
| 82-137 | All eight treatments retain one hollow rounded capsule and the original substitution boundaries: chrome, glass, gold, cream, carbon, returning chrome, coarse voxels and dark/translucent warm glass. Common enlargement is now visible across the sequence. Carbon has legible alternating horizontal/vertical coarse tows, not unreadable fine noise. |
| 138-144 | Ring-to-white bloom peaks at 141-142. The incoming relief is faint at 143-144 rather than a fully exposed headline at 143. |
| 145-208 | One stable raised phrase has rounded surface shading, highlights/counters and actual light/dark material contrast changes. Upper-left/lower-right relief expands; a central honeycomb appears around 188-191 and grows across 192-198. Organic cells broaden, merge and surround the phrase, rather than remaining a thin sparse halo. |
| 209-221 | The same composition becomes gray relief with a broad organic surround and corner fields. The native end occurs before the source's frame222 montage boundary. |

Independent ring measurements used mean RGB below 150 within rows180-839,
the same criterion for both images. This measures the dark visible body, not a
universal material-independent silhouette:

| Frame | Source visible width/height | Pilot visible width/height |
|---|---|---|
| 84 | 50.21% / 45.09% | 50.94% / 44.26% |
| 114 | 56.04% / 49.81% | 56.15% / 49.44% |

Frame114 dark bounds are source `[422,270,1497,807]` and pilot
`[421,273,1498,806]`. This supports correction of the previous missing common
enlargement. It does not claim pixel-exact bevel, reflection or hole matching.

## Residual fidelity limits

These differences remain visible and are documented, rather than called exact
matches. On the inspected native frames, they do not remove or replace a
load-bearing phase of the approved opening:

1. **Lens field/refraction detail, 26-81.** The source's layered flow has broader
   irregular line masses and reflections; the pilot retains a more regular
   character-derived field and a more symmetric cap. At 29 the pilot's thin
   projected line also spans more width than the source's blurred trace. The
   revised camera/profile entry and reversal exist, but the optical field is
   approximate. The actual timed critic must decide whether its flow remains
   sufficiently close at 1x and slow speed.
2. **Surface finish through the ring and relief.** The pilot's studio bands,
   carbon-tow edges and gold/bead highlights are cleaner and sometimes stronger.
   The glass appears milkier; the gray relief has harder contours than the
   source. Material distinctions, shared shape and smooth raised faces are
   present. This is a finish difference, not the former flat/unchanging material
   failure.
3. **Pattern detail, especially 192-221.** The central honeycomb uses larger
   cells and a subdued beveled finish; the source has finer cells and different
   face opacity. Late organic blobs have a wider size/shape variation and
   stronger glossy edges. The central expansion, broad capsule surround,
   merging organic shapes and joined corner relief are present. They are not
   spatially identical to the source.

There is no new request here for a third automatic correction pass. If actual
timed playback finds a remaining load-bearing motion mismatch, the joint gate
must remain FAIL and state that concrete limitation. A native-frame PASS cannot
override it.

## Narrow editable/offline input review

All nine current runtime inputs independently hash-match the frozen media
receipt. The manifest binds `pilot.json`, the approved two text strings, local
three distribution and generated glyph/height fields. `build-pilot.mjs` reads
the editable copy locally; the runtime reads local JSON/GLSL/assets, validates
buffer lengths and field contracts, uploads before readiness and uses absolute
frame uniforms. Copy edits require the documented local asset rebuild. These
code observations support local editability; they are not a new live network or
determinism test. The existing exact replay/decode receipts remain separate
technical evidence.

| Runtime input | Independently matched SHA256 |
|---|---|
| `pilot.json` | `cc01fb168b463a2c5e86232052db21520685306a85c17667aed7e24534fdc1af` |
| `pilot.html` | `336e85ca73761c479bb35d4874e4a3e2318a49f7e7860979ea4b8719cd4017fe` |
| `pilot.js` | `2986e7dd9eca3d9ded36dfaec49552d10191380c013c50d6191fc460198c38cd` |
| `surfaces.frag` | `3f308397b05e0699e0f53e31a22fa5f1b3408e7af32d58fa12eea85a7259b4ff` |
| `vendor/three.global.js` | `3e189a772c8e3780cd9923e056310d9524f6b2244d49b3545366190b080a5bad` |
| `assets/sdf-manifest.json` | `5194302966167c44ea06c1556bbb1c47c590db32e2c331ffd12fa84e3bd2be8e` |
| `assets/introduction-sdf.bin` | `0ccef9e7df56495159bc6f56e84aca03ccb8ce217405f49f4048b43e4d636b9d` |
| `assets/relief-sdf.bin` | `9970a733985552ab5edad6ea0743e492cfc281bb8137aba7d7777c91a84e1691` |
| `assets/relief-height.bin` | `947f2430e5f908102b9f4ad6d0da1c8bfdeec53aff1a789c2473e3edbc7f48d8` |

Source and pilot media hashes were checked again after inspection and remained
unchanged. No current actionable input-binding/editability defect was found
within this narrow review. No paid operation, install, application edit,
full build/test repeat, source mutation, audio mux or hearing claim occurred.
