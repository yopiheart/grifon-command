# Grifon material study

Local Blender look development requested on 2026-10-08. The approved character is the starting point: graphite coat, cream face, black oval eyes, compact gold beak, swept two-tip crest, folded wings and curled tail.

## Contract

- Improve material and light response while preserving mesh topology, vertex coordinates, transforms and every native hair attribute. The source master has 404,000 native curves.
- Compare the approved look and trial from identical cameras, exposure, view transform, resolution and sampling for each view.
- Inspect hero, front, facial detail, profile and actual 64px chat size. A hero image alone cannot establish attachment quality or suitability in chat.
- Reject identity drift, metallic/plastic coat, eye-crossing fibers, detached features or a result that gains only theatrical lighting.
- Use an independent visual critic without builder rationale. Fix one visible gap at a time; stop if further material changes are immaterial.

## Decision

Two moderate 1000px/96-sample trials were reviewed. v01 gives the clearest restrained improvement: rounder face shading and a more seated beak. The v02 root/tip material experiment did not visibly resolve the main coat limitation and is retained as a declined trial. v01 is selected for the owner comparison, not automatically accepted as the new app mascot.

The remaining limitation is coat coherence: the outer flyaway fringe and mottled inner nap still resemble synthetic fleece. Materials cannot change actual strand direction, length or clumping. No additional speculative revision was made.

Final independent inspection covered the paired hero/front/detail/oblique-profile renders and actual 64px display. Both versions read clearly at chat size, with no obvious material advantage there. Larger views show the restrained eye/beak seating and face-volume gain. No hard visible attachment or fiber blocker was found in the supplied views; hidden back geometry and a full side/back view were not assessed. Owner acceptance remains pending.

The supplied [creator clip](https://x.com/0xWast3/status/2107898724286361928) informed the tactile material/lighting axis. It does not establish the creator's exact production method or prove equivalent real-time performance. No claim of matching its quality is made.

## Delivery and replay

The offline viewer is `artifacts/griffin-material-study.html`. Rebuild with:

```powershell
node tools/artifacts/build-griffin-material-study.mjs
```

The builder embeds only selected, SHA-verified committed PNGs from `comparison.json`; its HTML has no network dependency. It uses the shared artifact encoding gates and a hash-based content policy.

Blender sources, version manifests and images live under `assets/3d-lab/griffin-material-study/`. Per-run source snapshots preserve each trial. The exact input is the locally stored approved master:

`C:/Users/ADMIN/.codex/visualizations/2026/10/06/01a1103d-37d8-7492-82be-40b3d829d725/griffin-master-v05.blend`

SHA256: `1f5469d46972ec14490f78a33d17a8b611e8b86810d7aec35820cd1cfacd34e7`.

Run the source with Blender 5.2.2 LTS and `--python-exit-code 1`, following the recorded commands in the study manifest. The script rejects a different master or an existing output directory. The frozen original builder remains in `.agents/skills/blender-studio/assets/griffin-v05/`; rebuilding it is not a guarantee of the exact saved `.blend` file hash.

Editable `.blend` files are excluded by the scoped study `.gitignore`. The selected scene, exact source and manifest were also copied with matching hashes outside the managed worktree to `C:/Users/ADMIN/.codex/visualizations/2026/10/06/01a1103d-37d8-7492-82be-40b3d829d725/griffin-material-study-2026-10-08/`; see `qa/local-scene-storage.json`. This protects the working source if the worktree is archived. Git backs up scripts, render anchors, manifests, QA and the offline viewer; it does not back up those local binary scenes. The worktree copy is `assets/3d-lab/griffin-material-study/candidate-final/griffin-material-final.blend`.

## Scope limits

These are Cycles still renders. The accepted rig, public companion textures, runtime reactions, cursor tracking and chat interface are unchanged. Rigging, texture export, motion quality and app FPS have not been retested or inferred from the stills. Promoting a look into the animated companion is a separate step after owner review.

No provider call, paid render, deployment, merge or production data write is part of this study. Application build/unit tests are not evidence for this asset-only change; relevant checks are render exits, exact source/geometry invariants, image integrity, visual review and browser verification of the offline viewer.
