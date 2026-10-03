# English narration pass

This is a separate voice pass for the approved 32.9s full Grifon upgrade.
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

Paid synthesis uses `generate.mjs --generate --approved-spec <exact SHA256>`
only after Neil approves that exact spec. The existing desktop credential must
arrive through the process environment, never through a copied secret file,
printed variable, CLI value or committed account state. Do not call the
application's standalone voice diagnostic, which generates additional takes.

The generator rechecks stock casting and the model's observed1x rate before
POST. It consumes the single attempt in an exclusive ignored ledger before
sending; HTTP failure or uncertain timeout does not authorize another request.
The subscription read is unavailable (401), so the estimate is not a verified
account debit, remaining balance or dollar cost. No automatic regeneration.

The returned raw MP3, character alignment and attempt ledger belong in the
ignored local `.tmp/grifon-english-vo-v01/` folder. They are not deliverables or
authored music assets. Later local finishing should copy the accepted H264
payload into a new VO MP4, recover the already-authored music from the approved
premaster/SFX, duck only that music, and retain all original SFX contacts.
The no-VO approved film and comparison stay available unchanged.

Technical timing/level checks are required, but the English delivery and brand
pronunciation still require human audition. No generated voice exists yet.
