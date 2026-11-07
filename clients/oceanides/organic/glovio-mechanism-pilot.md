# Oceanides Glovio-inspired mechanism pilot

2026-11-07. Status: **picture/copy accepted; approved music/SFX pass delivered for listening review**.
Local video production; three authorized audio generations, no publishing or deployment.
Reference analysis: [Glovio action breakdown](../../../workflows/reference_studies/glovio-boxing-action-breakdown.md).

## Intended behavior

Organic problem-awareness for residential/business customers: make a possible
cause of backed-up water visible and memorable. Show one pipe mechanism in an
isolated navy studio, with contained blue water and an amber restriction.
This is a stylized illustration, not a customer case or a diagnosis. The pipe
dimensions, accumulation speed, and removed front half are authored for clarity.

Use the approved Reel typography exception: centered white Inter with soft
shadow, no caption boxes. Retain navy instead of the source's black and the
updated transparent Oceanides mark. The source's condensed corner labels are not
copied. Three explanatory states give this audience more reading time than eight
sports actions compressed into seven seconds.

## Exact displayed draft

| Time | Copy | Visual function |
| --- | --- | --- |
| 0-2s | Umaatras yung tubig / pag nagfa-flush? | Open a recognizable question while the normal path is visible. |
| 2-4.5s | Kapag may bara / sa tubo... | Identify the illustrative restriction as it becomes visible. |
| 4.5-8s | Pwedeng bumalik / yung tubig. | Keep the explanation conditional while the upstream level rises. |
| 8-11s | I-message ang Oceanides | Approved contact-card wording from the first pilot. |

The first three states also display a small centered illustration label and a
one-of-three progress indicator. Slashes in the table represent line breaks.
The end card also reads:

> You can call us:
>
> Globe: 0917-671-6383
>
> Smart: 0939-245-6217

Neil accepted the new picture/copy after viewing the silent draft. The separate
[sound spec](glovio-sound-spec.md) received Neil's explicit 301-credit approval;
the [sound receipt](glovio-sound-receipt.md) records the completed pass and its
remaining listening checks. No delivery deadline, repair guarantee,
customer testimony, or assertion that a tank is full is included.

## Production and review

Working sources: `.tmp/oceanides-glovio-pilot/`. Local preservation:
`F:/CodexCreativeArchive/oceanides/organic/glovio-mechanism-pilot/`.

- `build_scene.py` -> editable `oceanides-glovio-mechanism.blend`.
- `render_preview.py` -> 192 frames, eight seconds, 540 x 960, 24 fps.
- `beats.json`, `composition.html`, `build_review.mjs` -> text, transparent logo,
  three-second end card, and silent 11-second review. Copy lives in JSON.
- `inter-variable.ttf` and `oceanides-logo-transparent.png` are copied from the
  accepted first pilot, whose sources remain unchanged.

Blender Studio's independent still review found disconnected/stepped water and
a cropped outlet in candidate one. The revised model has a continuous upstream
volume clipped by a horizontal plane, downstream drainage, and water geometry
excluded from the restriction. Framing includes the full outlet and both supports.
Independent re-review found both issues materially resolved, with no remaining
hard blocker visible in the three stills. Small low-flow seams remain; water's
opaque blue look is stylized. This is not proof of fluid simulation or finished
production quality. Candidate one is preserved under `v1/`.

The reference's audible grammar was not directly inspected. The original silent
review is preserved. The approved ElevenLabs pass adds one original score and
two water effects; no borrowed boxing audio, saved stock score or procedural
music was substituted. See the separate spec and receipt for the exact limited
authorization, generation evidence and new sound review. No VO was generated.

## Verification and next step

Text plates passed centered bounds, logo-corner transparency, and an editable
text check. Render/decode and sampled transition results are recorded with the
completed local output and in NOW.md. Sound-review duration, unchanged picture,
decode and stereo/mono levels passed. Actual listening/phone/Reels preview,
client technical review and published performance remain pending.

Reproduce in a working copy of the saved source, using installed Blender 5.2.2,
Playwright/Chromium, Sharp, and FFmpeg. Scripts overwrite task-owned filenames.
Use `OCEANIDES_RENDER_DEPS`, `OCEANIDES_CHROME`, and `OCEANIDES_FFMPEG` to point
to the existing local tools. `node build_review.mjs --plates-only` checks the
layout without re-encoding the film. Preserve the reviewed version before edits.
