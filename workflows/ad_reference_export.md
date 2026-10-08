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

## Next production pilot

The next paid test remains unapproved. Use one supported physical product with
an observed, reviewed packet and one selected concept. The Grifon SaaS packet
remains review-only while that vertical is locked.

Before approval, freeze the product/presenter assets and hashes, full intake,
selected packet/concept, provider requests, output criteria, evidence plan and
maximum cost/submissions. Stop on unknown task state; never repeat a consumed
submission or substitute inputs. Review generated stills before video spend.
Success requires a reviewable MP4, correct audible track, resumed selection and
a server-derived receipt linking source observations to the creative ID.

After that pilot, connect a human-approved published creative to the existing
performance importer. Success for Milestone 3 is a joined result and a useful
next-concept recommendation. Automated competitor monitoring and campaign
actions are separate later work; ad longevity never replaces performance tests.
