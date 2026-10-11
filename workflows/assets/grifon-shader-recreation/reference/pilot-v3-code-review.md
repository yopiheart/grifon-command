# Independent v3 pilot code and reproduction review

**Code-review PASS: no open actionable findings in the reviewed scope.** The
two helper findings below were corrected and their exact fixes reviewed. The
current-helper receipt metadata was reconciled and independently rechecked.
Neither invalidates the independently matched current v3 video/source evidence
or its visual pilot verdict. This review does not approve the later full film.

## Reviewed checkpoint

Read the complete current `pilot.js`, `surfaces.frag`, `build-pilot.mjs`,
`render-pilot.mjs`, `verify-sdf.mjs` and spec; inspected the manifest, current
render/check/source receipts, builder dependencies and pending Git scope.
Skipped duplicated archived producers and the already reviewed audio/player
helpers. No source edit, rendering, provider call, install, broad CPU test,
secret read or Git mutation was performed.

The frozen output remains SHA256
`6815c6e5143257c2d8b4fa368735677754b8d57cc0685ccb7d2ce380459a1c69`.
The nine visual inputs are independently bound in
`reference/pilot-fidelity-review-v3.md`; current render/check/media receipts
agree with that same manifest. Additional reviewed helper hashes:

| File | SHA256 at review |
|---|---|
| `build-pilot.mjs` | `1909315a269b9cead317af3563df85caf9c3c0920bf2c26d12abd684fcaeb37d` |
| `render-pilot.mjs`, initial review | `e41219b4f75031d80023869e633df0e584e066f5ce3deb7fba141a3a1a866eb0` |
| `render-pilot.mjs`, reviewed fix | `6a5fac1046a2dba8ee0386aa7337530296971962a7f3e329b0dcf08f2c57f46d` |
| `verify-sdf.mjs` | `ae370875a04b1aefab7d362dcfe0e08c41991ecff726d38f8900747cc0c483ee` |
| exact encoded producer `qa/pilot-encode-renderer.mjs` | `047e955ed2f2b7a490d5890fd876aaf432f7716c9dbccb308e25bb9b7298556a` |
| `qa/pilot-render.json` | `af86de89ce4e5ed59ccd0d28dc3edb648a7b77c9f6a7bcb377eff721107675d1` |
| `qa/pilot-check.json` | `ea7c5a28b65e8621c3cb453e58e7baee0cc11a59cd28ee6fc831b96980e05fdf` |
| `qa/pilot-source-receipt.json`, initial review | `8482bb203ae49af29d43a1f6619fd3accd7e14de3622a5b3285013f81de18f8b` |
| `qa/pilot-source-receipt.json`, reconciled | `e75c1d6a6d2dd0cf16456d9c062cb715dc2ff7d9341831af95a53ec0c4665adf` |

The pending staged scope observed here contains artifact documentation,
evidence, prior failed-pilot preservation, audio and comparison helpers. The
current pilot source/media files were still untracked pending the parent's
checkpoint assembly. The scoped staged query for `api`, `services`,
`components`, `App.tsx`, `package.json`, `.agents` and `.codex` returned no
changes. This is a point-in-time scope observation, not approval of later
staging changes or a review of every duplicated evidence file.

## Actionable findings

### Addressed P2: Standalone media verification could relabel an old video with new sources

At `render-pilot.mjs` lines95-99, the `verify` command probes and strictly
decodes the existing MP4, then writes `pilot-media.json` with `sources:manifest`.
That manifest was computed from current files at startup. This branch never
checks a producer/capture receipt tying those files to that particular MP4.

Concrete trigger: edit `surfaces.frag` without rendering, then invoke
`node workflows/assets/grifon-shader-recreation/render-pilot.mjs verify`.
The old MP4 still satisfies width/fps/frame-count/decode checks, and its receipt
can now claim the edited shader as an input. `encode`/`render` have a capture
source check; `verify` bypasses it. This is established by the control flow;
the mutation/reproduction was not run against frozen files.

Correction: require an existing output-hash-bound producer receipt with the
same sources before asserting provenance, and reject source/output mismatch;
alternatively make standalone verification explicitly media-only and avoid
writing an asserted source binding. Keep the frozen nine visual sources and
encoded output untouched. A cheap isolated changed-source/changed-video
fixture should reject before an expensive decode.

Current v3 is not shown mismatched: its separately preserved encoded producer,
render/check receipts, current runtime hashes and independently inspected video
all agree. This finding concerns the helper's future evidence integrity.

### Addressed P3: An unsupported command printed PASS without performing a check

`render-pilot.mjs` selects branches only for known command strings but has no
initial supported-command guard. A typo such as `chek` or `verfiy` skips all
render/probe/verification branches and reaches line101's `PASS ${command}`.
This can make a failed-to-run gate appear successful in a reproduction log.
Reject values outside `samples`, `check`, `render`, `encode`, `verify` with a
nonzero exit before starting work. This is a manual control-flow finding; no
typo command was executed and no production artifact was rewritten.

## Reviewed correction and evidence

Current helper `6a5fac...` checks the existing producer media receipt's source
hashes, expected filename, byte count and MP4 hash before probing/decoding in
`verify`. It preserves `pilot-media.json` and writes verification evidence to a
separate `pilot-media-verification.json`. Unknown commands throw before working
state/server creation. These changes address the stated triggers without
changing any of the nine frozen visual inputs or encoded video.

Read the exact isolated test in `qa/pilot-provenance-guard.mjs` and its result.
The fixture copies actual inputs/output into ignored private scratch. It runs
the actual preserved legacy producer's `verify` against a changed shader and
demonstrates successful erroneous rebinding, then the corrected helper rejects
changed source, appended encoded bytes and misspelled command with exit1.
It checks original frozen files and media receipt hashes after the fixture.
The positive existing-video verification also passes; its producer hash is the
same corrected helper, binding original media receipt
`3375ea1795ce8ee221fd5a81d29f09f84f086ada5dcdc4601e57fd388b2889bf`
and MP4 `6815c6...` with strict decode PASS. I inspected these existing records
and their code; I did not repeat the fixture/decode run.

| Fix evidence | Independently read SHA256 |
|---|---|
| `qa/pilot-provenance-guard.mjs` | `4e509cb1b3b35ab353b9a0daaf63ee6137218318ab1ec67c32181aec6223f418` |
| `qa/pilot-provenance-guard.json` | `c658674dac5c9262ac5863642a80c7e7c2cdbf161fbd191a8778b7457e86f6bd` |
| `qa/pilot-media-verification.json` | `dedac7118c4cf0cc05481f14ec54c0add5e6940de82009106a29c40ddb94b316` |

The parent reconciled the current-helper source receipt entry after it initially
still listed `e41219...` at the changed path. The final receipt now records
`6a5fac...`/10,522 bytes and explicitly retains the old helper's
`historicalSha256`/9,408 bytes. Its `producerRevision` distinguishes the old
readiness helper, exact encoded producer `047e955...`, current guard-only
revision and positive/negative/joint-gate evidence. Independently rehashed
every listed current file: no mismatches. The MP4 still hashes to `6815c6...`
and the exact encoded tool still hashes to `047e955...`. This reconciliation is
addressed; historical media/render/check records were not silently relabelled.

## Other inspected behavior

- Absolute frame seeking sets the frame uniform directly, renders and waits
  for GPU completion. The shader derives geometry, materials and procedural
  phases from the frame/spec; it has no accumulated animation state or browser
  wall-clock dependency. Fractional frames are intentionally supported; native
  export uses integer0-221. Current spec ranges/key arrays are consistent.
- Buffer readiness precedes `__motionReady`. Local SDF/height contracts, one
  row flip and explicit texture uploads are present. Full finite SDF checks,
  sign coverage, counters and independent vector distances are in the separate
  verifier. Negative fixtures reject inverted, outside-only and truncated
  fields; the preserved original precision failure is recorded. Height data
  receives finite/range checks in the runtime.
- The render server binds only loopback and serves a fixed local allowlist.
  URI decoding is followed by exact route membership; path traversal and
  arbitrary files are not admitted. Browser requests outside its exact origin
  are aborted and cause the run to fail. No credentials/provider interface or
  audio input is in this reviewed pipeline.
- Capture checks current source hashes and complete frame counts before
  encoding, verifies each captured byte hash and exports silent yuv420p H264 at
  the rational native rate. Media dimensions/frame count/fps/audio absence and
  strict decode are separate from visual similarity. Current samples and the
  42 nonlinear/fresh replay cases agree across the existing receipts.
- The builder's normalized Inter contour input and copied Three/license
  dependencies under `grifon-motion-depth` are tracked. The source receipt
  records the vector input hash
  `4380d788d52f32f4cefb196f7af8e4349091ad834257c8ae8a02b453ce061078`.
  Rebuilding copy requires these local inputs and the documented asset rebuild;
  changing only JSON text cannot replace already generated glyphs.
- Initialization's two60-second failures and subsequent standalone success
  remain recorded. Successful readiness waits of roughly54 seconds leave a
  small margin; this code review does not establish reliability under other
  GPU/CPU load. Exact replay is established on the recorded AMD/ANGLE renderer,
  not universally across different GPUs/drivers.

Both concrete command/evidence behavior findings and the receipt metadata
detail are addressed. No further actionable correctness or security issue was
found within this bounded source review. Existing visual/audio limitations
remain as stated in their own reports.
