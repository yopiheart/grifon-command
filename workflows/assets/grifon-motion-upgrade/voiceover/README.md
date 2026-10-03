# English narration pass

This is a separate Aira/ElevenLabs v4 English voice pass for the approved32.9s full Grifon upgrade.
The exact English input, casting, settings, assets, timing and credit ceiling are
in `test-spec.json`; the readable timed script is in `SCRIPT.md`.

Run the safe local input check from the repository root:

```powershell
node workflows/assets/grifon-motion-upgrade/voiceover/generate.mjs
```

The default path does not contact providers. It verifies the exact picture and
local approved premaster/SFX hashes, all phrase offsets/windows, and the budget.
`prepare-spec.mjs` authored the proposed input; do not rerun it after approval,
because a changed spec requires new approval.
The spec bytes retain their proposal label to preserve the exact approved hash;
received human approval is recorded separately in preflight-evidence.json.

Paid synthesis uses `generate.mjs --generate --approved-spec <exact SHA256>`
only after Neil approves that exact spec. The existing desktop credential must
arrive through the process environment, never through a copied secret file,
printed variable, CLI value or committed account state. Do not call the
application's standalone voice diagnostic, which generates additional takes.

The generator rechecks exact Aira library casting and voice/model1x rates before
POST. It consumes the single attempt in an exclusive ignored ledger before
sending; HTTP failure or uncertain timeout does not authorize another request.
The subscription read is unavailable (401), so the estimate is not a verified
account debit, remaining balance or dollar cost. No automatic regeneration.

The returned raw MP3, character alignment and attempt ledger belong in the
ignored local `.tmp/grifon-english-vo-v02/` folder. They are not deliverables or
authored music assets. Completed local finishing copies the accepted H264
payload into the new VO MP4, recovers the already-authored music from the approved
premaster/SFX, ducks only that music, and retains all original SFX contacts.
The no-VO approved film and comparison stay available unchanged.

The returned alignment may contain raw tags or spoken-only text. The generator
checks transcript identity, array lengths, finite ordered times, and declares
which form was returned. The local finisher must map phrases to that transcript
instead of indexing a spoken-only response using raw-tag offsets.

Neil approved the exact Aira/v4 take and500-credit cap. One request returned audio
with character timestamps; no reroll was made. Existing synthesis evidence is
in generation-evidence.json. Actual account debit is unavailable, so306 credits
is a conservative input-based estimate, not an observed balance change.
Technical timing/level checks are required; delivery, emotion and brand
pronunciation still require human audition.

## Completed mix and reproduction

The new export is `../grifon-full-upgrade-english-vo-1080p.mp4`,32.9s,1080p/30fps,
5,179,901 bytes, SHA256:
`b11bb7c7f572c249b20cb2e767c57b737c947145876f5b3df569be45e944f067`.
Actual AAC measurement is **-16.02 LUFS /-2.74 dBTP**. All eleven timing windows
fit, with pitch-preserving tempo at most1.12. Voice-only compression and phrase
gain give each phrase at least5.21dB RMS above its ducked musical bed; this is
level evidence rather than a listening verdict.

The actual common master is a linear gain of about0.62dB. The `loudness` object
contains read-only measurement filter diagnostics, while `mastering` describes
the filter that created the saved master. SFX samples/timings/envelope match
before that common gain and AAC encoding; final encoded audio is a new mix.
The accepted H264 picture payload is identical. Full strict decode,987 frames,
faststart, and digitally silent/exactly black final six frames passed independent
native QA in [media-smoke.md](media-smoke.md).

With the retained exact local take/alignment/ledger and approved stems present,
reproduce locally from the repository root, without a provider call:

```powershell
node workflows/assets/grifon-motion-upgrade/voiceover/finish.mjs
```

Finishing writes an ignored candidate, checks every output gate, then atomically
promotes it. Failed checks preserve the verified release; an identical rerun
leaves its file and modification time unchanged. Promotion negative controls
and the actual full rerun are recorded in `qa/promotion-contract.json` and
`qa/native-candidate-rerun.json`.

The generated voice raw files/intermediates remain local. The backup ZIP holds
the take/alignment/ledger with this voice source and final MP4. No account/session
credential or standalone licensed music file is part of that backup. Never run
paid synthesis again under the consumed one-request spec. The composition HTML's
original accepted soundtrack is retained; this VO is authored in the separate
timed finishing source and delivered in the new MP4.
