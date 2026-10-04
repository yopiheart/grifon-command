---
name: 3d-director
description: Plan or build an editable 3D directing preview from a creative brief or reference video before AI video generation. Use for 3D storyboards, camera guides, previz, or transferring an approved scene's direction into a different visual style. Ordinary video editing and standalone motion graphics use their own workflows.
---

# 3D Director

Read [the desktop adapter](../_shared/codex-runtime.md) before execution.
The initial skill orchestrates agent-authored scenes; a universal scene generator
does not exist.

## Purpose and scope

Turn creative intent into a preview the user can direct before purchasing video
generation. Use simple geometry to convey composition, action, timing, scale,
camera movement and cuts. Product and character references define appearance;
the 3D proxies are directing guides rather than the required final visual style.

Read [the proven pilot](references/proven-pilot.md) before reusing an existing
tool. Read [the product integration scope](references/integration-slices.md)
only when asked to implement the Grifon application flow.

Choose the requested stopping point:

- Planning: deliver a shot plan and the important assumptions. This is the
  default for recommendations, setup discussions and unapproved generation.
- Preview: author an isolated Blender scene and local review outputs for the
  requested brief. Agent-authored scene work is allowed; disclose what required
  custom staging or animation instead of implying automated reconstruction.
- Generation handoff: prepare an exact, provider-compatible test specification.
  Submitting it remains subject to the repository's paid-operation rules.

## 1. Establish the creative target

Extract the intended outcome, product or subject, audience, final look, length,
aspect ratio, important actions, dialogue language and desired stopping point.
Distinguish hard requirements from preferences. Ask only for missing information
that changes the story, supplied identity or feasibility; continue independent
planning with stated, reversible assumptions.

Use 3D when spatial staging, camera paths, product handling or multiple viewpoints
need review. For a straightforward single-camera talking head, recommend the
existing avatar/video workflow unless the user wants a 3D preview. Avoid adding
a scene-building step that does not help direct the requested result.

Record the supplied product, character and location references with their roles.
Use separate cast IDs when more than one person appears. Bind each cast member
to identity references, wardrobe and any selected voice. A character sheet is
an identity source; convert it into appropriate reference images only when the
provider and approved inputs support that use. Do not promise guaranteed identity.

Keep the final look separate from directing: the same guide may be intended for
live action, animation, a game aesthetic or a commercial. Do not default to
reproducing the clay/gray proxy appearance in the finished video.

## 2. Read reference evidence honestly

For supplied videos, use the existing video-analysis workflow when relevant.
Read `viral-autopsy` for a video teardown; its tool calls may need a paid spec.
Prefer existing observations or locally available footage for an initial plan.
Check runtime tools before calling an analysis step free.

Record what was actually inspected: continuous playback, timestamps, stills,
transcript or written observations. Separate observed source events from newly
authored ideas. A transcript cannot establish camera movement, facial acting or
sound design; sampled frames cannot establish continuous timing or audio quality.
If the source is inaccessible, offer a provisional original treatment and label
the missing evidence. Do not claim to have watched it.

Identify transferable story beats, framing, camera paths, action rhythm and sound
intent. Adapt them to the requested product's actual features and original cast.
Avoid inventing product claims or treating inspiration as exact reconstruction.

## 3. Write the directing brief and shot plan

Keep one versioned brief per job. Include an asset inventory, cast bindings,
final-look target, duration/aspect, dialogue/audio intent, proposed provider and
unverified requirements. Mark unknown capability or pricing as pending.

For each shot record:

- Shot ID and start/end time.
- Story purpose and the visible action/result.
- Characters/product present, wardrobe and continuity state.
- Framing, viewpoint, camera movement and subject placement.
- Action cues, contact/handoff needs and any editorial ellipsis.
- Final-look notes and intended dialogue, ambience, SFX or music beat.

Check that shot durations sum to the target, the product feature is clear, the
story resolves and continuity is plausible. Include a deliberately held shot
when it helps the story; constant motion is not a quality requirement.

Use this brief as the shared plan for the scene author, reviewer and provider
handoff. A prose prompt alone is not the reproducible job contract. Do not add
or alter production response schemas as part of using this skill.

## 4. Author and verify the local directing preview

Reuse installed Blender and FFmpeg. Keep every new job in its own output folder;
preserve existing studies, approved media and consumed provider ledgers. The Vivo
builders have fixed paths and actions and are not generic command-line tools.
Inspect them as examples rather than running them against unrelated inputs.

Start from simple product proxies, reusable camera moves and a small set. Add
character proxies and authored poses only when the story needs them. Verify
contact and readable gesture beats for handling shots. Surface unsupported or
unconvincing action before expensive generation.

Deliver an editable scene, a labeled review preview, storyboard frames and a
clean camera-guide MP4. The clean guide excludes review slates/captions and any
other non-directing material; keep requested audio reference separate.

Verify the command exit status, complete media decode, duration, aspect, shot
boundaries, framing and key action beats. Distinguish technical checks from
visual judgement. Review the full motion when possible; state sample-only limits.
Hash the exact guide and appearance references intended for generation. Do not
copy a fixed unique-frame threshold: static holds may be intentional.

Show the preview and explain the story briefly. Capture the user's revisions
before preparing the paid request. Approval of the storyboard does not by itself
approve a changed prompt, reference set, provider or cost.

## 5. Prepare the provider handoff

Verify the requested provider's current official API contract, account access
when possible, reference roles, clip limits, output resolution, speech/audio
support and price. Do not substitute another model because it is available.
Keep credentials server-side and out of review artifacts.

Use the clean video guide for direction and approved product/character images
for appearance when supported. If a provider needs split guides or other adapted
inputs, make those assets reviewable and bind them to the new exact test spec.
Preserve the approved story across the split and inspect continuity at joins.

Read `workflows/smoke_test_setup.md` and follow AGENTS.md: purpose, pass/fail
criteria, exact prompt/assets/parameters, evidence, maximum cost and attempt cap
must be user approved. The existing fixed Vivo and bottle runners are exhausted
historical studies; neither accepts an arbitrary new job. Do not reset their
ledgers, advertise a nonexistent generic `--spec` option or rerun their POSTs.

When no safe runner exists for the new spec, deliver the request proposal and
identify the required implementation. A written guardrail is not evidence of
enforcement. Ordinary checks leave all paid/live switches unset.

## 6. Review and finish the result

Compare the approved guide with the generated video for story/action transfer,
camera movement, product geometry, cast continuity, hands, timing and final-look
transformation. Separate measured results from taste. A single successful pilot
does not prove universal fidelity or eliminate rerolls.

Preserve the raw result. For sound finishing, explicitly choose which native
dialogue/ambience to preserve or replace, then plan music, SFX and voice levels.
The current final renderer can discard scene-native audio; inspect that seam
before using it for a talking-avatar result.

Custom voices need compatible speech/lip-sync generation or timing-preserving
voice conversion. New TTS over existing mouth movements is not proof of sync.
Use Signal Modulator and Edit Bay capabilities where they fit; authored motion
graphics belong to `grifon-motion-director`.

Deliver the requested stage, exact assets and concise evidence/limitations. Make
mobile review links available through the existing authorized delivery route.
Do not publish, deploy, merge or spend beyond the approved scope.
