# Frozen v5 shell source review

**Qualified code PASS; no open actionable finding.** This independent review
covers the frozen v5 shell correction and its source isolation. It does not
approve the 55 visual samples, a full movie, actual paced playback, soundtrack
similarity, or direct hearing.

| Bound input | SHA256 |
|---|---|
| `qa/full-focused.json` | `13f5f530ce2cdf81d53e4ffc28c0456cdec6fc95b931ae7aaa553627c7000108` |
| `qa/full-focused-review-5-inputs/preservation.json` | `6a567858556a286cbba74513f64ca7bf44ab73487227c1357c24e7365204a4dc` |
| `qa/full-shell-v5-stability.json` | `fa74ab6ef633c1780fd8088840ed02fd2b274c4219ea2d598179e8b8e9a287eb` |
| `full.js` | `be204f18807004b485d29a1ff53312a46376eeb8fec1249e5acb3d45a1b447f1` |
| `full.json` | `76a34cfbb2dae254edfd9d73c355d7b03b38f35711a2e4c589c06c4f2d00fdb4` |
| `full-surfaces.frag` | `f9572254a213b67dfda976bbf66423fa973f157fa010609b6ffddd0c47bd6214` |
| Current `render-full.mjs` | `bbd8df71f403f6fc4d437b26df6110dc22d3155cff55572fa1efae26c7338e02` |

The prior qualified v4 source review was read before comparing the two frozen
source sets. All 131 preserved payloads in v4 and all 131 in v5 passed their
byte count and SHA checks. The current v5 payloads also matched the frozen
copies. All 13 current runtime/asset inputs matched the focused receipt, and
the manifest change was limited to binding the new `full.json` hash.

The source diff changes the shell's local pattern material, geometry builder,
geometry bank selection, and eight additional shell camera-key arrays. Source
outside those shell sections is exactly equal to v4. Configuration outside
shell keys is exactly equal; the pre-existing shell pose keys also retain
their v4 values. The other ten runtime/asset inputs, including the fragment,
Three vendor and glyph assets, are byte-identical. The previous local PBR
shader and glyph-3 roughness exception are untouched.

All 51 focused PNGs outside the shell are byte-identical to their v4 frozen
counterparts, and the four shell PNGs changed. This sample set does **not**
include a folded-lobe frame in 377–390. Its equality therefore establishes
only those 51 sampled images, not every continuation image. The accepted
opening's nine source inputs and encoded movie also retain their exact hashes.
The three scope/hash negative controls were independently repeated in memory
and rejected; no input file was mutated.

The exact frozen `openShellGeometry` function and helpers were evaluated in
memory with the frozen Three vendor, without WebGL. All 20 geometries for
native frames 357–376 contain finite position, normal, UV and depth attributes
and valid indices. Each has 54,481 vertices and 108,000 triangles. Every
angular seam closes with exactly equal Float32 positions. Initial Frenet
normal seeds remain stable across adjacent native frames; their maximum
adjacent change is 0.000574 degrees. Eight out-of-order repeat generations
produce byte-identical attributes.

The collar joins the body at the same center, radius and organic phase; its
radius slope matches the body's slope at the join. Shoulder windows and
camera keys use continuous smooth functions, scale remains positive, and the
secondary direction blend remains nonzero. These are source and finite-CPU
checks. They do not establish rendered row smoothness, mouth visibility or
the absence of projected self-occlusion; those belong to visual review.

Absolute native seeking rejects non-integer or out-of-range inputs. The shell
shot is exactly `[357,377)`, matching all 20 bank indices. Every shell seek
assigns geometry, rotation, scale, position, time and material scale from that
frame. The geometry function uses local vectors and matrices and does not
mutate the camera, configuration, another geometry or a shared shader chunk.

The subsequent folded-lobe family has separate `cupGeometry()` instances,
the separate `metal` material, and its own group. It shares no shell profile,
collar, shoulder, stretch, bank entry or pattern material. `clear()` hides all
top-level objects and restores the camera on every continuation seek. The
folded-lobe branch assigns its own absolute rotation, scale and position; a
backward shell seek then assigns all shell state again. No source-level state
leak was found. Fresh rendered replay remains required.

The reviewer used read-only source/hash inspection and narrow in-memory CPU
checks. No GPU/browser capture, broad test, provider call or paid operation was
performed. Input hashes were stable after the checks. Detailed numeric
evidence is in `qa/full-shell-code-review-v5.json`.

At the next full-capture boundary, refresh `qa/full-capture-producer.mjs` with
the exact current producer; its historical d155 snapshot belongs to the first
failed full candidate. A new full capture must still perform all 106 nonlinear
and 106 fresh-runtime exact samples, all 710 continuation captures and all 932
native presentation timestamps. Native visual, actual 1x/0.25x playback and
audio integrity gates remain separate.
