# Team workflow first, product integration second

The skill captures judgement and orchestration. Deterministic tools execute the
job. The future Grifon UI should submit the same validated directing brief rather
than maintain a separate master prompt and divergent workflow.

## First useful release

Install the reviewed team skill, then complete one new prompt-to-local-preview
job and one reference-inspired job. Each should deliver an authored editable
scene, storyboard, clean guide and evidence without a paid video submission.
Label the agent-authored parts. Preview usability and creative quality need
human review; document/JSON checks alone are not that test.

A first configurable engine should cover tabletop products, simple box/cylinder
proxies and push/orbit/slide camera rigs. Verify duration/aspect/shot boundaries,
product framing, job isolation and complete decode end to end. Character acting,
hands, contacts and handoffs form a separate scene family, with their own proof.
Do not put all possible UGC interactions behind one unvalidated generic prompt.

## Future Grifon slices

Each slice needs its own success contract, approved tuned diffs where relevant,
implementation and applicable application checks. These are proposals, not
completed features or an instruction to modify existing production prompts.

1. **Approve a directing preview.** Storyboard input -> validated directing
   brief -> isolated worker job -> clean guide/storyboard -> editable review.
   Main seams: `types.ts`, existing Director AI storyboard flow, client service
   jobs and server job/media infrastructure. Keep Blender work off a short-lived
   request handler; local authoring today is not deployed render infrastructure.
2. **Generate from the approved guide.** Reviewed assets -> provider capability
   validation -> exact paid spec -> server submission -> polling -> raw result
   with evidence. Main seams: `services/geminiService.ts`, server video handlers,
   job state and Render Bay. A provider adapter must prove its supported reference
   roles, duration/resolution and approved cost before an option is unlocked.
3. **Keep a cast and voice across jobs.** Uploaded/generated references -> named
   cast bindings -> suitable per-provider images -> shots -> character/voice QA.
   Main seams: `types.ts`, `components/Step4Avatar.tsx`, provider reference handling
   and `api/voice/consolidate.ts`. Current single-avatar and single-voice behavior
   does not establish multi-character continuity.
4. **Finish sound without losing dialogue.** Approved scene clips -> explicit
   preserve/replace audio policy -> voice/SFX/music mix -> final review. Main seam:
   `api/_lib/renderFfmpeg.ts`, which currently maps external voice or silence in
   place of scene audio. Reuse existing mixing/ducking after this policy is clear.

Use the canonical Director AI, Render Bay, Signal Modulator and Edit Bay modules.
Do not assume that installing an agent skill installs a consumer product feature.
