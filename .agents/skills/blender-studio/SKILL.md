---
name: blender-studio
description: Create polished, editable Blender assets and scenes for characters, product visualization, real-estate interiors/exteriors, and game props or environments. Use for finished 3D modeling, materials, lighting, renders, or improving a scene to the approved Grifon quality bar. Includes a proven soft-character recipe. Storyboard-only previz, raster-only art, and ordinary video edits use their own workflows.
compatibility: Blender Python and Cycles; bundled replay tested on Blender 5.2.2 LTS with CPU rendering. No external assets, add-ons, or paid APIs needed for the replay.
---

# Blender Studio

Turn a reference or brief into a polished, editable 3D asset or scene. Preserve
identity, dimensions, and the requested visual language. Share the disciplined
build-render-review process across subjects, not one universal material preset.
The accepted Grifon v05 proves the soft-character recipe; it is not evidence that
product, architectural, or game outputs have already passed their own checks.

## Select the production track

Read [the subject tracks](references/subject-tracks.md) for the chosen use case.

| Track | Main fidelity constraint | Delivery check |
| --- | --- | --- |
| Character / companion | Face, silhouette, expression, believable surface | Multi-angle likeness; rig/motion separately when requested |
| Product / commercial | Dimensions, silhouette, label, real material response | Macro details, reflections, label readability, turntable if requested |
| Real estate / environment | Plans, scale, openings, materials, lighting | Plan comparison, eye-level views, authored walkthrough if requested |
| Game asset / scene | Target art style plus engine/platform budget | Export/reimport, normals, UVs, pivots, LOD/collision as required; in-engine test |

For mixed scenes, assign one owning track per asset and verify the final scene
together. A shiny product should look metallic when its real material is metal;
do not transfer the griffin's nonmetallic/furry treatment to every subject.
Use the existing `3d-director` for storyboard-only directing previews and the
existing `img2threejs-lab` for procedural web prototypes when those are the actual
deliverables. Finished Blender modeling/look development belongs here. Those
project skills are optional integrations, not dependencies of this saved package.

## Load only what the task needs

- For soft characters, inspect [the accepted hero](assets/griffin-v05/griffin-master-v05-hero.png),
  [front](assets/griffin-v05/griffin-master-v05-front.png), and
  [close-up](assets/griffin-v05/griffin-master-v05-detail.png) before building.
- Read [the character production recipe](references/production-recipe.md) for geometry,
  grooming, materials, lighting, Blender API details, and exact replay commands.
- Read [the accepted case](references/accepted-case.md) for the five revisions,
  original identity, evidence, and limits. This is an approved example, not a
  benchmark proving every future character will be equally successful.
- Frozen source and hashes live in [the asset manifest](assets/griffin-v05/manifest.json).
- For Grifon soft-character finishing, use [the preferred neutral material study](references/neutral-material-finish.md),
  accepted on 2026-10-08, and its bundled hero/front/detail anchors. It preserves
  the v05 identity and groom while reducing the yellow lighting cast. The v05
  build remains the geometry baseline; the neutral study is the preferred still
  finish. Other subjects keep their own material and fidelity requirements.

## 1. Establish the visual contract

Use conversation context first. If a design is already approved, preserve it;
do not interview the user again or generate a replacement concept by default.
Record briefly in the conversation:

- Subject, track, references/plans, dimensions, silhouette, signature details.
- Intended material and finish; separate measured facts from authored assumptions.
- Deliverable: still master, rig, animation, or real-time integration.
- Success: subject fidelity, coherent geometry, believable material/light, and
  the track's actual output requirements.
- Failure: the chosen track's fidelity or delivery defects. Soft-character
  examples include changed face, metallic body, flat face patch, floating
  features, visible cuts, fiber intersections, or a hero hiding side-view defects.
- Verification: hero, straight-on, close-up, plus the subject track's checks.

For an existing Grifon, inspect the top-left neutral tile of
[the original identity atlas](assets/griffin-v05/griffin-sprites.webp).
For another subject, use its own reference; do not reskin the griffin mesh.
Ask only if missing identity or intended output materially changes the work.

## 2. Build the master locally

Discover and reuse the installed Blender executable. Check the version and actual
render hardware. CPU Cycles is valid; a discrete GPU is not a prerequisite for
this workflow. Do not install or buy a trainer to solve a modeling problem.

For character replay, copy the bundled scripts into a new, task-owned output directory before running
or adapting them. They clear the current scene and write beside the script, so
run them in a separate background Blender process, never in an unsaved user scene
or directly inside the frozen skill asset directory. Keep revisions separately.

Use `--python-exit-code 1`; Blender can otherwise exit successfully after a
Python error. Capture the process exit code and verify the output actually exists.

For all tracks, block out scale, proportions, silhouette, and camera first. Then
refine structure, bevels/joins, materials, lighting, and required motion. Author a
new scene builder for new subjects; inspect existing project builders before
reusing them because historical product tools can contain fixed paths and inputs.
Keep actual product labels and measured plans distinct from invented details.

### Soft-character recipe only

Build silhouette and face volume before expensive groom detail. Join intersecting
organic masses when a continuous contour is intended. Seat the eyes and beak into
the face; use coherent upper/lower anatomy. Bury attachment roots and round ends.
Keep separate editable parts for future rigging where their separation is natural.

Use actual native hair curves for fine fibers. Match their length, density,
taper, direction, irregularity, and color to each anatomical region. A noise bump
alone cannot provide soft edge fuzz. A single uniform long coat reads as felt or
spikes. Groom cream facial down around eyes; keep roots and tips out of eye surfaces.

Use nonmetallic body materials and restrained highlights. Make eyes glossy with
real area-light catchlights. Add gentle cheek volume and a soft face perimeter.
Blend color transitions through both the underlying mesh and the fibers.

## 3. Iterate against visible defects

Use the project's Gauntlet Loop when available. Otherwise use this bounded loop:

1. State the track-specific axis: believable subject preserving its reference
   and intended use. For the proven character recipe, preserve approved identity.
2. Start with a moderate render, normally 1000-1100 px and 64-96 samples.
3. Give an independent visual critic the identity anchor, inspected references,
   current image, and axis. Keep the builder's reasoning out of the critique.
4. Request one biggest visual gap plus any hard geometry blocker, without scores
   or a forced winner. If an independent critic is unavailable, disclose that.
5. Fix that gap, render a new version, and check whether it visibly improved.
6. Finish the accepted candidate at higher resolution; render front and close-up
   from the same saved model. Inspect small display size if chat use is in scope.

Default cap: six candidate revisions per round, or earlier owner acceptance or
immaterial gains. Stop refining an approved look toward a critic's preference.
If the cap leaves a material gap, report it and preserve the best candidate;
do not claim the user's target was met. A changed brief can start a new round.

The griffin's successful loop fixed anatomy before material polish. Avoid a list
of twenty simultaneous edits, repeated requests for the same approval, and
rendering the same unresolved defect at ever higher resolution.

## 4. Preserve and deliver

Save the editable `.blend`, reproducible source, hero/front/detail PNGs, and a
small manifest recording versions, render settings, files, and checks. Preserve
the original identity and accepted output with hashes. Keep binary masters in
the task's approved asset storage; do not treat an untracked desktop path as a
remote backup. Follow the owning repository's versioning instructions.

Show the actual render inline and link the source. Describe only verified facts.
Distinguish user acceptance, independent visual inspection, and executable replay.
For a new character, the user remains the final judge of appeal and likeness.

## Scope boundaries

- The proven bundled recipe creates a **still master**. A `.blend` plus pretty PNG does
  not prove a rig, blinking, cursor tracking, breathing, smooth mobile performance,
  GLB hair support, or chat integration. Build and verify those as separate stages.
- Gaussian splatting can be explored after look approval; it cannot repair a poor
  source model. Camera movement in a splat viewer does not establish character
  deformation. Do not promise export fidelity or FPS without measuring it.
- Paid image, render, or training services follow the user's applicable approval
  rules. Local replay needs none of them. Never reinterpret a past generation
  approval as permission for new paid calls.
- Full games, engineering drawings, automated building reconstruction, and
  production app integrations are separate deliverables. Do not label a game
  prop as a playable game or an architectural concept as measured construction
  documentation. Each new track earns its own approved example through use.
