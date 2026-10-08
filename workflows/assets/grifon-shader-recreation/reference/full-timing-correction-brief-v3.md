# Four-frame timing correction

Correct only the timing defects independently observed in full candidate
`15cbddf056015c6ab16986fb5a22abd71ec03fb8c8b3b0903efcd6de1cbd37ce`.
Preserve its source, QA, export, player, pair and all 710 continuation captures
before any runtime edit. The native reviewer must close its report first.

## Exact implementation scope

In `full.js`, replace the pattern branch's `(frame-397)/13` phase assignment
with the existing shot key's exact binary midpoint:

```js
mode=5;uniforms.uPhase.value=key==='chevron-one'?.125:key==='stepped-two'?.375:key==='zigzag-three'?.625:.875;
```

The shader uses this phase only to select one of four pattern families. This
aligns the existing cuts at 400 and 403; 397, 407 and 410 already align.

In `full-surfaces.frag`, replace only the erase threshold expression:

```glsl
if(f>=636.){float erase=step(hash(vec2(floor(p.y*34.),f)),clamp((f-636.)/3.,.125,.875));color*=1.-erase;}
```

Thresholds become `[.125, 1/3, 2/3, .875]`. Only 636 and 639 change. Preserve
637–638 thresholds, row hashes, field, grain, geometry and the black cut at 640.
Do not change the accepted opening, configuration, copy, shader materials,
provider prompts, model IDs, render settings, timeouts, dependencies or audio.

## Success and verification

The new native render must show the correct pattern family on 400 and 403,
visible erase bars on 636, and sparse visible residue on 639. Compare every
new continuation PNG with the preserved 710-frame sequence: exactly
`[400,403,636,639]` may differ; the other 706 must be byte-identical. Preserve
all 222 decoded opening frames exactly. Failure of either condition stops
export approval and requires diagnosis within this scope.

Use a fresh complete capture and its current source binding. Existing sample
replay, frame timestamp, decode, black-tail, mux and provenance gates remain
unchanged. Never rebind an old MP4 or reuse stale captured frames after editing.

Independent source review must verify this exact two-line diff. Full native
review must cover all 932 frames; actual normal and quarter-speed playback
must subsequently pass as one aligned comparison stream. Audio and offline
player verification remain separate gates. A visual pass does not establish
heard sonic resemblance. All steps use existing local tools with zero provider
calls or additional paid spend.
