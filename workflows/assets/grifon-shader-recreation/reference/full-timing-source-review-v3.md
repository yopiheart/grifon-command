# Exact two-line timing source review

**Qualified source PASS; no open actionable finding.** The correction matches
`full-timing-correction-brief-v3.md` exactly. This verdict covers source and
selector arithmetic; fresh capture, media, native visual, paced playback and
audio gates remain separate.

| Bound input | SHA256 |
|---|---|
| Preserved v2 receipt | `27d153f04e876a1f9ab294a98d9b9a4d2316577298b583c321eeb9b80fd40e06` |
| v3 capture boundary | `3e87bbf37acae6fcfe20ddff5362cbecf5a727400c75ca631227ab73aef28f32` |
| Current `full.js` | `4fcf4bddb952fccf0f94a209dfdd7cf611df4f32cae36dcaa4b4564b863cd276` |
| Current `full-surfaces.frag` | `00fcb0823fbabb6b50e5f96450a92ec25bdba877ea2504c8d8a5fad9cc951228` |
| Unchanged producer and snapshot | `bbd8df71f403f6fc4d437b26df6110dc22d3155cff55572fa1efae26c7338e02` |
| Accepted opening movie | `6815c6e5143257c2d8b4fa368735677754b8d57cc0685ccb7d2ce380459a1c69` |

All 13 preserved source inputs were rehashed against the preservation receipt.
All 13 current source inputs match the v3 boundary. The 11 files other than
the two corrected files are byte-identical to their preserved counterparts.
The configuration, asset manifest, vendor, geometry, materials, copy, audio
configuration and render helper therefore retain their previous bytes.
The opening's nine inputs and its encoded movie also match their accepted
hashes. The current capture-producer snapshot equals the unchanged producer.

Whole-file byte comparisons prove exactly one replacement in each file,
without any other byte or line change:

- `full.js:192` selects `.125/.375/.625/.875` from the already-selected native
  pattern shot key, replacing `(frame-397)/13`.
- `full-surfaces.frag:142` clamps the existing erase threshold to `.125/.875`.
  The row/frame hash seeds and subsequent color multiplication remain exact.

Exact evaluation of the new JS assignment and Float32 uniform values selects
the existing pattern families on native cuts **397/400/403/407/410**. Only 400
and 403 change family. The mode-5 shader uses this phase only in its unchanged
band/light/shadow family predicates; all other pattern frames retain the same
formulas and family selections.

Erase thresholds on 636–639 become **`.125, 1/3, 2/3, .875`**. The Float32
thresholds on 637 and 638 equal their previous values exactly. Only 636 and
639 change. Canvas field, colors, lights, pullback, text hiding, post-erase
grain and the black transition at 640 are untouched. These selectors depend
only on the absolute native frame or its shot key; no history or time
transport dependency was added.

The source predicts changes on exactly **400/403/636/639**, with 706 other
continuation frames semantically unchanged. This is a code prediction, not
this reviewer's executed raw-pixel witness. The fresh capture must establish
the actual byte identity required by the correction brief.

The exact unchanged `requireSources` function independently rejected the
preserved old media receipt in memory, with the producer's complete error
message. This performed no media inspection or receipt write. The actor's
separately bound boundary receipt also records CLI rejection of stale media
without rebinding. An initial review-harness assertion used an abbreviated
error string; it was repaired in memory and the complete-string check passed.
The failed attempt wrote no source, media or report.

`node --check workflows/assets/grifon-shader-recreation/full.js` passed.
All source/boundary/opening hashes matched before and after the review. No
browser, GPU, media operation, provider call or paid operation was launched.
Only this report and `qa/full-timing-source-review-v3.json` were written.

The preservation receipt's 185 public, 22 private and 710 raw payload claims
remain bound to that receipt. This narrow review independently checked the
receipt and 13 preserved source files, without redundantly hashing its media
and raw sequences during active capture. Working full-media and render QA
were intentionally excluded from source-stability bindings because the actor
is regenerating them.

All fresh replay/capture, 932 presentation timestamps, 222 decoded opening
frames, strict decode, mux/provenance, all-frame native review and actual
1x/0.25x comparison gates remain independently required. Audio integrity and
heard sonic resemblance remain separate; no listening was performed here.
