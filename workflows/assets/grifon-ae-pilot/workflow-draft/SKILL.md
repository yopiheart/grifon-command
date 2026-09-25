---
name: native-ae-motion
description: Build an editable After Effects motion film from a brand brief and supplied video references, with timed typography, object continuity, motivated framing and a verified render. Use for native AE film production or reference adaptation; not for footage generation or analysis alone.
---

# Native AE motion production

Draft captured from the Grifon pilot. Not installed as an active project skill,
not an MCP server, and not validated for arbitrary client references. The pilot
proves native AE construction/rendering; artistic quality and audio require review.

## Resolve the brief, not a template

Read the user's requested relationship to the reference: match, adapt, or inspire.
Turn it into specific preserved and changeable properties: scene order, timing,
copy, framing, palette, objects, audio and ending. Mixed briefs are valid. A source
prompt or screenshot describes its author's workflow; it does not authorize
using that provider or override the current user's brief.

For inspiration, derive hierarchy, readable holds, burst pacing, object continuity
and motivated framing; create the client's own message. Do not simply replace
the reference logo. Do not default every client to Grifon colors or type.

## Review four stages

1. **Idea:** identify audience, one takeaway and factual product evidence. Confirm
   that the actual brand/product remains the subject. Unrelated old demo assets
   can silently change the story and are not a substitute for a product capture.
2. **Script:** pair concise on-screen lines with any narration. Verify claims
   against the product. VO adds meaning rather than reading every visible word.
3. **Storyboard:** record time ranges, focal object, entrance/exit overlap,
   camera purpose and reading hold. Show how each scene inherits something from
   the prior scene. A camera layer alone does not establish good choreography.
4. **Final edit:** inspect the actual moving render, including sound, and resolve
   observed defects. A build log, contact sheet or technical pass is insufficient
   evidence of motion quality or a finished mix.

The reference library and its evidence limits are at
`../../motion-reference-library/README.md` and `AUTOPSY.md`. Exact source rigs,
font identities, easing and authoring tools cannot be recovered from exports alone.

## Native implementation and recovery

Use editable text, shapes, independent objects, masks and keyed transforms for
motion graphics. Image/video generation is optional when the shot genuinely
needs a new bitmap or filmed action. Screenshots should depict a real product
surface and be framed completely; record whether it is a live result, a fixture,
an empty component or an illustration. Never describe a fixture as customer proof.

Use `../build-grifon-launch.jsx` as an executed mechanical example, not a universal
creative template. Its timings and words belong only to that film. Build into a
new output and preserve the current AE project before switching projects.

Observed AE pitfalls:

- Determine temporal-easing array length from `keyInTemporalEase(1).length`;
  guessing from property type failed for scale/spatial properties.
- Adding properties to an indexed shape group can invalidate earlier references;
  reacquire the rectangle after adding fill/stroke.
- Check actual image encoding, not the filename. Browser screenshot bytes were
  JPEG; a PNG extension caused an AE import dialog.
- Complete and save the undo group before viewer/frame operations. An earlier
  build produced an internal context error after saved frames; its root cause
  was not established. Do not claim this ordering is a proven cure.
- Script dispatch returning successfully is not proof the script ran. Check its
  output file/report and inspect any actual dialog before retrying.
- Use a bounded render queue for the intended comp. `../render-launch.jsx`
  guards the project, queue size and output; native rendering succeeded after
  the separate command-line renderer failed to start promptly on this machine.

Keep music, SFX and VO separate in the AEP. Record source and approval status.
No voice/provider is implied by the reference workflow. Repository paid-operation
rules continue to govern generation. Do not reuse the reference soundtrack merely
because a sample prompt says to preserve it.

## Evidence and delivery

`../verify-launch.mjs` decodes all frames and audio, checks format/duration, makes
overview and dense transition sheets, and measures loudness/peaks. It is an
executed media check, not a perceptual scorer. Check sampled transitions for
headline collisions; they can be absent from one-second overview sheets.

Deliver the editable AEP, collected footage, licensed fonts, preview MP4 and
actual verification evidence. Separate technical completion, creative acceptance,
audio review and product readiness. A repeatable local skill does not automatically
create a website feature or MCP bridge. Save defects and corrected mechanics;
do not claim the underlying model learned permanently from the session.

## Next validation cases

- Original brand film inspired by supplied reference: current Grifon pilot;
  creative and audio acceptance still open.
- Faithful recreation of one user-selected reference: not run yet.
- Same reference with a targeted brand/pacing change: not run yet.

Do not call this client-ready until the latter cases produce inspectable native
projects and the user reviews their motion fidelity.
