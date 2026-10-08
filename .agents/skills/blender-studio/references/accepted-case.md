# Accepted Grifon case - 2026-10-06

The v05 identity and geometry remain accepted. On 2026-10-08 Neil preferred
[the neutral material finish](neutral-material-finish.md) for future work because
the earlier lighting appeared yellowish. Preserve this original build history;
use the newer reference when selecting the Grifon still finish.

Neil approved the v05 render in the originating conversation and asked to save
this workflow as a repeatable skill: "Save ka ng skill neto para maging repeatable
para if ever na may papagawa akong 3d na ganto ungg quality!"

## Identity lock

The original identity is the top-left neutral tile of the bundled 2x2 atlas:
rounded graphite body, warm cream face, glossy black oval eyes, compact hooked
gold beak, broad swept crest with two gold tips, folded dark/gold wings, and a
curled lion tail. No feet or ears. Earlier procedural 3D attempts changed the
identity and looked metallic. The successful direction preserved this design
while rebuilding it with actual soft fibers, volume, and controlled lighting.

## What the five revisions fixed

| Candidate | Visible problem | Correction carried forward |
| --- | --- | --- |
| v01 | Long leaf-like beak; detached lower nub; blunt tail root; capped crest tips | Compact hooked beak, buried tail attachment, gradual color transition |
| v02 | Brushed felt; mouth slivers; hard tip transition | Finer varied curves, smaller coherent lower beak, shared mesh/fiber gold mask |
| v03 | Cream face read as a flat cut-out panel | Gentle cheek volume, softer perimeter, longer fine facial down |
| v04 | Fibers at eye edges; tail looked like rubber tubing | Shorter eye-adjacent strands, fine tail nap and blended gold |
| v05 | Hero, front and close-up checked | No blocking geometry or fiber-intersection defects observed by independent critic; user accepted |

Remaining stylistic difference: the approved coat is more groomed than the
fluffier external references. Do not keep redesigning it toward the critic's
taste after owner acceptance. Acceptance is a visual judgment, not proof of FPS,
animation, conversion, or future characters' quality.

## External reference provenance

References actually inspected during the original task:
- Felipe: https://superspl.at/scene/ca6a4c9b
- Todd: https://superspl.at/scene/1fd435e0
- Creator: https://x.com/abstrakt314
- First-person process account:
  https://www.reddit.com/r/OpenAI/comments/1wvfapq/used_gpt6_astra_to_recreate_an_agent_dot_as_a_3d/
- Blender WIP: https://x.com/abstrakt314/status/2105973865113674068/photo/1

The creator described Blender/Cycles multi-view rendering followed by Gaussian
splat training. That established the importance of the source model and groom.
Grifon's accepted master used local Blender Python and Cycles only; it did not
reproduce or validate the creator's training pipeline, timings, or FPS claims.
No external creator mesh, splat, or texture is bundled in this skill.

## Evidence and recovery

The bundled hero/front/detail, original identity atlas, and exact scripts are
hash-bound by manifest.json. The roughly 35.7 MB `.blend` and complete ZIP remain
in the original local task directory:
`C:/Users/ADMIN/.codex/visualizations/2026/10/06/01a1103d-37d8-7492-82be-40b3d829d725`.
That path is provenance only, not a runtime dependency; use bundled source to
rebuild elsewhere. Git stores the source and visual anchors, not the large master.

Generalization beyond this griffin is a reusable method, not a completed new-
species benchmark. Automatic skill discovery in a fresh task is a separate check.
