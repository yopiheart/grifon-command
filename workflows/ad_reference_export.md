# Sourced concept to traceable export

Milestone 1 selects a reviewed concept. Milestone 2 keeps that selection attached
to a producer export and preserves native clip audio when explicitly requested.
The existing generation prompts, models, presets and review gates remain in use.

```mermaid
flowchart LR
  A[Reviewed reference packet] --> B[Selected concept]
  B --> C[Owned producer run]
  C --> D[Durable scene clips]
  D --> E[Final render / creative ID]
  C --> F[Export receipt]
  E --> F
  F -. later .-> G[Published ad results]
```

The final-render server derives the receipt from the authenticated user's saved
run. Submitted scene indices and clip URLs must match completed scenes belonging
to that run. An expected reference selection guards against a missing or stale
checkpoint. A receipt records owner-provided observations; it does not certify
the competitor's performance or the truth of imported observations.
Selected sources carry their canonical Meta Library link, Library ID, advertiser
Page ID and observation date so the JSON remains useful outside the saved run.
The receipt is an editable audit record; it is not a signed attestation.

The receipt lives in render status, poll output, the producer checkpoint and a
downloadable JSON companion to the MP4. Keep the MP4 filename's creative ID when
using the existing Growth Loop ad-name convention. Download the receipt before
the temporary render media expires. A restored checkpoint retains the IDs;
expired playback URLs still require the existing media-recovery handling.

Legacy exports retain their existing creative ID. They do not have a durable
producer run, so this milestone does not fabricate a producer receipt for them.
Use `/app?osaEngine=producer` for the new producer receipt flow.

## Audio contract

| Scene policy | Base audio | Timing |
| --- | --- | --- |
| Omitted | Existing separate voiceover or silence | Existing voice timing |
| `replace` | Required separate voiceover | Existing voice timing |
| `preserve` | First native clip audio track; silence if absent | Visual duration |
| `mute` | Silence | Visual duration |

Preserve and mute ignore separate voice audio and its alignment. A shorter native
track is padded to the selected visual duration. Authored SFX and music remain
available; mute controls the scene's base audio. Pure Hype explicitly mutes base
audio so generated speech cannot enter its music-led format. The current intake
does not add a new native-audio production mode. The policy is a renderer/scene
contract for explicitly supplied native media.

## Free proof

Run `node tools/verify-native-audio-pilot.mjs` from the repository root. It checks
the exact accepted Vivo source SHA-256, supplies those local bytes to the real
renderer, and refuses unexpected network operations. It performs no provider
request, cloud upload or new paid generation. The consumed Vivo provider spec
and submission ledger remain untouched.

Output: `.tmp/ad-recon-milestone2/native-audio/grifon-vivo-native-audio.mp4` and
`verification.json`. Checks cover unchanged input, 1080x1920 output, duration,
audible audio and waveform correlation. These measure transport preservation,
not subjective listening quality, new creative quality or a Higgsfield win.

The browser/ownership tests use explicitly invented observations and mocked
backends. The Vivo proof uses real previously accepted media. They are separate
pieces of evidence; neither is a completed live competitor-to-generated-ad run.

## Evidence handoff and software preparation

Automatic intake now maps its supplied offer into the benefit field and leaves
the differentiator empty. Generated desires and reframes stay in the research
report; they are not promoted into these product fields. New automatically
mapped producer runs checkpoint an explicit mapping marker. A marked pending
script reprojects only these two fields and omits the generated contrarian hook
seed. Manual prefills and completed scripts retain their existing behavior.
Older pending checkpoints without the marker cannot safely be distinguished
from manual work, so their existing behavior remains unchanged.

This is a structural safeguard, not complete evidence-aware generation. Existing
generated angle text still enters the script prompt. The proposed optional
evidence-context policy is saved separately in
`assets/ad-recon/elevenlabs-evidence-prompt.proposed.patch`; it is not applied or
approved. It builds on PR171's source without duplicating its MarketMind change.
Structural transport, bounded input validation and output evaluation must follow
approval before the new policy can be consumed by either One-Shot engine.

One-Shot's **Prepare software demo** opens a separate local preparation screen.
Keep original PNG/JPEG setup/action/result screenshots (maximum 1 MiB each),
captions, source URLs, capture times and owner observations. Audience and
creative hypotheses are separate from supplied product details and references.
Review, save on this device, import and export work without creating a producer
run or calling an AI provider. Device storage is scoped to the signed-in owner;
portable exports contain the screenshot bytes, so review private screen content
before sharing. Missing assets and reference-review gaps remain visible.

The ElevenLabs pilot files are `assets/ad-recon/elevenlabs-2026-10-10.*`.
Import the `.preparation.json` into this screen. It intentionally contains no
screenshots or completed audio proof and does not pre-accept collection limits.
Four ElevenLabs cards are own-brand messaging benchmarks. Two Speechify cards
are adjacent consumer reader ads; direct Murf/WellSaid creative evidence remains
unknown. Three concepts are original hypotheses, ranked with audible proof first.
Neither the packet nor the preparation export is production authorization.

## Next production pilot

Neil selected ElevenLabs Text to Speech for the pilot. App/SaaS generation stays
locked: a preparation screen is not a faithful software-demo renderer. The next
step is matched real screens and permitted audio, approved SaaS script/storyboard
changes, authenticated asset registration and a renderer path that preserves
those screens instead of replacing them with generated UI. The focused evidence
policy proposal alone does not enable this production route.

Before approval, freeze the product/presenter assets and hashes, full intake,
selected packet/concept, provider requests, output criteria, evidence plan and
maximum cost/submissions. Stop on unknown task state; never repeat a consumed
submission or substitute inputs. Review generated stills before video spend.
Success requires a reviewable MP4, correct audible track, resumed selection and
a server-derived receipt linking source observations to the creative ID.

After that pilot, connect a human-approved published creative to the existing
performance importer. Success for the full learning loop is a joined result and
a useful next-concept recommendation, using actual activation and conversion
data. Automated competitor monitoring and campaign actions are separate later
work; ad longevity never replaces performance tests. The pilot JSON records the
completion milestones and an unapproved, non-executable trial draft with zero
spend/roll allowance until exact assets and requests are frozen and approved.
