# Grifon creative library and reference led production roadmap

Decision record from Neil's October 14, 2026 planning conversation. This is a
product roadmap, not a runtime configuration or authorization for paid work.
Current execution status belongs only in [NOW.md](../NOW.md).

## Product outcome

A customer supplies a reference video or chooses a Grifon Recipe, adds up to
five photos of a character, product or clothing, and explains the desired ad.
Grifon handles research, creative direction, script, generation and editing.
The customer reviews understandable plans and results in chat; the same finished
version appears in Assets. They should not need editing or prompting skills.

Neil's highest priorities, in order:

1. Avoid expensive, slow jobs that produce unusable videos.
2. Keep the reference edit recognizable and preserve face/product identity.
3. Minimize questions and let Grifon handle execution.
4. Build creative judgment beyond a single reference through reusable evidence
   and tested production methods.

## Agreed behavior

- **Adapt for brand** is the default. **Match closely** is optional. Record the
  reference's signature structure, pacing, cuts, typography and timing, then
  explicitly identify which elements change for the brand.
- **Auto** chooses among eligible, validated Recipes using the brief, assets,
  language, intended outcome and budget. It recommends fit; it does not claim
  proven sales prediction without outcome data.
- Review direction, script or visual plan, and cost before production. Optional
  **You decide** delegates decisions within an explicitly approved scope and
  budget. It never removes the spending limit.
- First release targets UGC, motion launch and cinematic spec ads, up to 60
  seconds. First implementation validates a 15-30 second UGC product ad.
- Inputs are a reference video or Recipe plus up to five photos. Source-footage
  editing is outside the initial customer flow. Longer references receive a
  proposed shorter adaptation, not silent truncation.
- Brand-specific scripts use supplied facts, research, audience, offer and CTA.
  Reference dialogue is not automatically copied. Silent ads have a visual plan.
- A customer character reference takes precedence. When absent, an original AI
  presenter can be proposed; normal review includes its preview before talking
  footage. You decide can delegate this choice explicitly within its scope.
- Original fitted music follows [the music workflow](background_music_production.md).
  A supplied permitted track is an explicit alternative. Match closely does not
  silently copy reference music. Preserve accepted audio when revising a film.
- Repair only failed or changed dependencies. Start with one bounded targeted
  repair round inside the approved cap; do not loop until the budget is exhausted.
- Chat and Assets refer to the same durable output/version. Preserve accepted
  versions and editable sources.

## Creative library

The library is external knowledge retrieved for a job, not automatic retraining
of a foundation model. Saved lessons must reach the runtime decision process.

| Layer | Contents | Use |
| --- | --- | --- |
| Examples | Canonical source, accessible media, transcript, measured Edit DNA, frames, creator breakdown, available performance evidence | Inspect what happened |
| Lessons | Technique, intended purpose, suitable context, exceptions, confidence and supporting examples | Choose an approach |
| Executable Recipes | Versioned production method, source/code, asset requirements, timing rules, accepted outputs, limitations and cost evidence | Produce and adapt an ad |

Use the existing [Swipe File](viral_swipe_file.md) and
[Viral Autopsy skill](../.agents/skills/viral-autopsy/SKILL.md) as starting
evidence. Distinguish observation, creator explanation, inference and measured
performance. Views or ad longevity alone do not prove sales or editing causality.
The existing three-independent-video rule filters proposed general patterns;
it is not statistical proof. A one-off reference may still guide its own remake.

Start with one UGC, one motion and one cinematic reference. Expand toward 30
curated videos, roughly ten per category, in batches driven by production gaps.
This is a collection target, not a guarantee of competence. Include contrasting
styles and weaker examples. Pair tutorials with their finished outputs.

A Recipe becomes eligible for Auto only after an accepted adaptation to another
brand and recorded limitations. Retrieve a small relevant selection, rather than
merging every creator's style into a generic average.

## Production choices to validate

- Omni 1.1 Flash is the initial candidate for Tagalog/Taglish speaking UGC based
  on Neil's tests. Validate the exact provider contract and prices before wiring
  it in. Existing Omni editing code is not automatically this generation path.
- Use 360p for development experiments where it saves total cost/time. Validate
  identity and visual quality at delivery resolution. Omni documentation labels
  1080p/4K as upscaled. Upscaling an accepted take and generating a new take are
  different operations; the latter can change speech and identity.
- Do not require a low-resolution and high-resolution generation on every order.
  Promote a finishing path only after testing whether it preserves accepted work.
- Seedance is a candidate for cinematic and non-speaking footage based on Neil's
  experience; route by shot requirements, not an exclusive category restriction.
- Frontier reasoning/coding models author new motion approaches. Retain accepted
  source and adapt it for later brands instead of rebuilding every animation.
  Exact model IDs and effort settings remain subject to approval of their diff.
- Existing Genjutsu, Blender, motion and editing skills are production capability
  candidates. Desktop workflows require service integration before customers can
  rely on them while Neil's machine or chat is offline.

## Delivery sequence

1. Build and verify one complete Taglish UGC flow. Detailed scope and dependencies:
   [first UGC implementation plan](ugc_reference_implementation_plan.md).
2. Validate one Recipe in each category, including adaptation to a second brand.
3. Connect library retrieval and eligibility to production planning and Auto.
4. Validate ten varied briefs, then invite five Filipino business owners to a
   private beta. Record failures and repair costs, not just accepted showcases.
5. Expand the library and category support based on observed failures.
6. Launch categories only when their usability, identity, cost and recovery gates
   pass. October foundation, November beta and December release are targets,
   not commitments or evidence that the feature is already ready.

## Migration

For new reference-led projects, retire legacy named script choices and automatic
edit treatments from the customer decision flow. Preserve useful research,
authentication, quotas, billing, storage and rendering. Keep existing projects
readable and reproducible under their recorded version. Do not delete old work.
Tuned-content changes require approval of the specific diff.

## Inputs and decision boundaries

Neil is gathering three reference videos and a real brand asset set. Exact
media hashes, source links, brand facts, approved claims, signature traits,
test cost ceiling and permitted paid attempts belong in the pilot test spec.
No paid analysis, generation, render or provider validation is authorized by
this roadmap. No deployment, merge or production data mutation is authorized.

## Supporting references

- [Google Omni generation and resolution documentation](https://ai.google.dev/gemini-api/docs/omni)
- [Google Omni 1.1 announcement](https://blog.google/innovation-and-ai/technology/developers-tools/build-with-gemini-omni-1-1-flash/)
- [Contextual retrieval](https://www.anthropic.com/engineering/contextual-retrieval)
- [Higgsfield Katana](https://higgsfield.ai/blog/higgsfield-katana)

These explain capabilities and product inspiration; they do not establish
Grifon's measured quality, costs, model superiority or market-first status.
