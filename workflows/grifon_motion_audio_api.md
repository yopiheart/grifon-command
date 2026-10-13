# Future motion audio integration

Recorded 2026-10-04 after Neil accepted the Grifon motion film. This is a
requirements/design record, not an installed skill, active provider configuration,
paid execution spec or shipped feature. See [production workflow](grifon_motion_production.md).

## User preferences

Music direction updated 2026-10-13: follow the
[shared music workflow](background_music_production.md) for new scores:
ElevenLabs Music v2.5, one variant, fitted custom duration, Auto, No Finetune,
instrumental by default. The source-reuse and fallback options below apply to
SFX; they do not authorize saved-stock or procedural music substitution.
Existing accepted soundtracks remain preserved. This records production intent,
not an implemented API model switch or authorization for a paid call.

- The agent owns sound selection and placement; users review the finished video.
- Write positive sound descriptions. Neil's tests found exclusion phrases such
  as "No ..." harmed his ElevenLabs results.
- Generate appropriate SFX and music through ElevenLabs and attach them to the
  scene timeline automatically. Keep music, SFX and narration as separate stems.
- Voice preference: "eleven v4 fast". The current official fast v4 variant is
  **Eleven v4 Turbo**, API ID `eleven_v4_turbo`. This is the documented mapping
  of that preference, pending account/voice/endpoint compatibility verification
  when implementing. Do not invent `eleven_v4_fast` or silently substitute Flash
  v2.5. The existing approved Aira recording is unchanged.

## Proposed generation and finishing flow

1. Derive an action map from the editable scene timeline: fast travel, selection,
   material contact, anticipation, reveal and holds. Each cue gets a timeline
   contact, desired duration, energy and source provenance.
2. Group compatible cues into a coherent sound palette. Reuse suitable cleared
   sources within the project; avoid buying a generation for every repeated click.
3. Request **one SFX candidate first** per missing sound family. The SFX API
   returns one audio file per request; the website's four-option interaction is
   not an API requirement. A prompt cannot guarantee semantic, timing or taste
   accuracy. Higher prompt influence narrows variability, not uncertainty to zero.
4. Check file validity, duration, clipping/silence and contact timing. Check actual
   audio fit through a supported listening route; waveform checks alone cannot
   certify taste. A fixed four-way comparison or Google scorer is not required.
   An unsuitable result may receive a bounded targeted retry under the future
   job's approved budget, or a suitable rights-cleared fallback. Preserve unknown
   provider outcomes before retrying. Do not silently keep spending until success.
5. Generate a music bed through the dedicated Music API. Specify mood, energy
   progression, duration and a resolving ending. Prompt mode supports
   `force_instrumental: true`, avoiding exclusion clauses in creative text.
   A composition plan is an alternative input for section structure; it is not
   combined with a prompt, and that instrumental flag is prompt-mode-only.
6. Synthesize narration with the verified fast-v4 configuration and authorized
   voice/script. Fit phrase windows through measured alignment and deliberate
   editing. Model speed does not establish correct delivery or scene timing.
7. Trim source padding, align each meaningful transient to its visual contact,
   fade edits, balance SFX and duck music under narration. Verify the encoded
   result. Present one finished review with revision controls, rather than a
   mandatory sound-selection worksheet.

## Implementation acceptance boundary

The future feature needs server-only credentials, tenant-isolated assets/jobs,
per-job limits and cancellation, recoverable provider outcomes, versioned source
and cue manifests, separate stems, and output checks. Account API entitlements,
pricing, commercial end-product rights and any cross-customer library rights
must be established for the actual assets/plan. A paid website subscription by
itself does not establish every API format or redistribution entitlement.

Application model/prompt/settings changes require their specific approved diff;
paid tests require their exact approved spec. No new generation, model switch,
product implementation, merge or deployment was performed for this record.
The recovery ZIP preserves the accepted film checkpoint; this later API design
record is versioned in Git separately from that immutable archive.

## Official sources checked 2026-10-04

- [SFX endpoint](https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert):
  `POST /v1/sound-generation`, single audio response, prompt influence and duration.
- [Music endpoint](https://elevenlabs.io/docs/api-reference/music/compose):
  `POST /v1/music`, prompt or composition plan, instrumental flag.
- [Model catalog](https://elevenlabs.io/docs/overview/models):
  `eleven_v4_turbo` is the fast expressive v4 variant; `eleven_v4` is distinct.
