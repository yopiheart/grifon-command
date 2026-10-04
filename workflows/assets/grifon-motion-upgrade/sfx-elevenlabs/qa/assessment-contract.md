# Audio assessment contract

Status: offline checks passed. Root received direct human approval for the frozen
spec and owns the saved authorization note and live execution. This worker made
zero provider/model calls. Independent review passed at runner SHA
`47384a97d1c02ec26d377e111330cfb94d1523d8ad3a4c5f3b72f9af17fa9a11`;
actual model assessment remains for root execution.

The first root attempt then failed in local SDK conversion, before transmission.
The installed Developer API converter rejects `countTokens.config.tools`, even
an empty array. The structural correction omits that unsupported countTokens
field; `generateContent` retains `tools: []` and every approved input/model/cap.
Corrected runner SHA is
`214bb249480658b62288814b499ed677b8be855d9447ed906e5431fed37e7a9d`.
Offline exact-request proof with a dummy key and global fetch blocker yielded
original fetch count 0 with the converter exception, and fixed fetch count 1
blocked before network. Request SHA remains
`4c467ede4336893f9b29a4ccc910b42e479a9816f513c29b96099ea04bc0bd41`.
No ledger entry was changed by this worker. Root must preserve the failed local
record and hashed no-transmission reconciliation before the first actual HTTP
attempt; generic retry/resume behavior was not added.
Both independent reviewers reproduced these exact old/fixed fetch counts with
the installed SDK and no real key, environment, network or ledger access. The
reviewer restored only the original tools field and recovered the prior
`47384a97…` source hash, proving this is the single structural correction.

The runner pins paid spec `26eb8ef67ced35afc04f958705859da04f8f6b96c3eba24b5cd47ca00bfe4807`,
History catalog `9a074cb1957d0beaff469a1dff6575e49c7a7c6cbaa4d884eab5b3fe8eb5366a`,
and cue plan `5e27af2b916188d10a3cbe2179cc270ccfaee6f148e73990ad2bc3763ca8ddd0`.
Default execution validates all 36 native PCM16 stereo48k WAV hashes and protected
reference/picture/music/voice inputs, then prints the deterministic plan. It makes
no network/model request and reads no environment value or credential file.

From the repository root:

```powershell
node workflows/assets/grifon-motion-upgrade/sfx-elevenlabs/audio-assess.mjs
node workflows/assets/grifon-motion-upgrade/sfx-elevenlabs/audio-assess.mjs --self-test
node workflows/assets/grifon-motion-upgrade/sfx-elevenlabs/audio-assess.mjs --prepare-audio
node workflows/assets/grifon-motion-upgrade/sfx-elevenlabs/audio-assess.mjs --family pencil
```

`--prepare-audio` is local only. It decodes the exact protected reference once
with installed FFmpeg, forced MOV input and local `file,pipe` protocols, to
PCM16 stereo48k WAV. The saved source/native WAV hashes are rechecked; the same
cached reference bytes enter every comparison. No Files API or silent upload
fallback is implemented. Requests exceeding 20 MiB including base64/JSON are
rejected before any live call.

Reference preparation passed using the installed local FFmpeg. The pinned
PCM WAV SHA is `425f08ad8ad98382ea76f123a3359590d679f19ca9b69cbb7526d4940d7ad91d`;
duration is 32.9173333333 seconds. The pencil dry request is 10,478,747 bytes,
contains reference first followed by candidate numbers 1–4, and binds one
corresponding pencil-outline motion cue. Preparation required local subprocess
permission because the sandbox rejected FFmpeg spawning; no provider or network
permission was used.

Live mode requires `--assess`, the exact `--approved-spec` SHA, and a separately
saved JSON note via `--authorization`. The CLI flag is never authorization.
Root must create that note only from actual direct human approval, with:
`status: HUMAN_APPROVED`, `source: direct-user-message`, `audioAssessment: true`,
the exact human `quote`, ISO `recordedAt`, matching `approvedSpecSha256` and
`cuePlanSha256`, and `mode: existing-only` or `existing-plus-generation`.
The script does not create human approval notes, generate ElevenLabs sounds,
or download assets. Current support is the exact nine History families plus
one final mix. Newly generated catalogs require a later scoped implementation.

After real approval, the command shape is:

```powershell
node workflows/assets/grifon-motion-upgrade/sfx-elevenlabs/audio-assess.mjs --assess --family pencil --approved-spec <exact-SHA> --authorization <repo-relative-human-note.json>
```

Each request contains the exact comparison prompt, deterministic corresponding
cue brief, the same reference WAV, and the four native candidates in order.
History family IDs map explicitly to cue-plan family IDs. Final mode uses
`--final <new.mp4> --selected-manifest <selected.json>`; local preparation with
those flags decodes the actual new MP4. Its replacement report, MP4, decoded
audio, selected manifest and selected History sources are hash protected.

Only `process.env.GEMINI_API_KEY` supplies the key after all approval/input gates.
The installed `@google/genai` uses only `models.countTokens` then
`models.generateContent`, `gemini-3.5-flash`, JSON response, `tools: []`,
2048 output tokens, 60000ms timeout and `retryOptions: { attempts: 1 }`.
CountTokens preflight must be at most 8192; its endpoint calls are recorded
separately from the cap of 13 generated assessments. No retry, fallback,
grounding, interaction API or alternate model exists.

An exclusive ledger reserves the full 8192-input/2048-output allowance before
preflight: $0.03072 per attempt at $1.50/$9.00 per million tokens. Thirteen
reservations total $0.39936, below the $0.50 hard cap. Candidate and thinking
tokens both enter known spend. Unknown, rejected and failed outcomes retain
their full reservation and consume the family's sole attempt. Any unresolved
or usage-unknown record stops the whole batch for explicit reconciliation.
Over-cap usage is persisted before parsing JSON and blocks all further calls.
Concurrent
reservation locks fail closed; stale locks are not silently cleared. Results
and ledgers live under ignored `.tmp/grifon-elevenlabs-assessment`. Live ledgers
use the canonical primary checkout plus spec SHA, so another worktree cannot
reset the paid counters; WAV caches and mock records remain checkout-local.

Syntax, default and mock self-test passed. Actual `--assess --family pencil
--approved-spec <exact SHA>` without an authorization note returned exit 1
before credentials or either endpoint. Offline mocks test missing/mismatched
human approval and mode, hashes, 13-call and dollar caps, 8193-token refusal,
thinking cost and transport failure without
retry. They never use credentials or a real model. Actual Gemini availability,
usage, candidate verdicts and final auditory assessment are unverified until
authorized calls run.

Independent reviewer verified the nine exact reference-plus-four-native
requests, prompts, cue mapping, approval refusals, 13-call limit, thinking cost,
exclusive/canonical ledger, unknown-outcome stop and zero SDK retries. The
corrected unknown/over-cap guards demonstrated failure against the original
draft defect and pass against this source. No remaining scoped finding was
reported; no reviewer provider call was made.

Gemini audio is mono-combined/downsampled. Machine judgments do not establish
spatial/full-band listening, physical-phone translation or user taste. Those
remain for human review. All future results retain that limitation.

The revised draft is isolated at
`.tmp/grifon-elevenlabs-assessment-draft/audio-assess.mjs`, SHA
`47aaecd3d3f3087e43a8fbc935b346d6a7a69231cf21b00accb869361e7912b4`.
Root completed its narrow review and explicitly authorized promotion while the
independent reviewer finishes before final delivery. The promoted source SHA is
`163fdc2dcc8d87efaebef614436b2f50336b7999419718af741f65597b25976e`;
the sole draft/source difference is the file-location anchor. Final source
syntax and card-pop dry request passed. The original `214bb249…` runner is
preserved byte for byte in ignored
`.tmp/grifon-elevenlabs-assessment-draft/original-audio-assess-214bb249.mjs`.
It pins revised spec
`c7f9c8f0eac1ece2585ae031c4005657184467d397c208ee27a6cf7d108affeb`.
Root received the exact direct approval “Approve LOW + one manual repeat; same
spending caps” and saved a fresh authorization note. The draft requires that
new spec SHA; the original note is rejected before SDK/key access.

Both original paid records and results remain byte protected. Their two calls,
$0.06144 full reservations and $0.039258 known actual cost carry into the
original canonical ledger. The maximum is 14 total including those calls;
14 full reservations total $0.43008 against the unchanged $0.50 cap.
The complete pencil result is reused without a call. The original card-pop
record is the sole known truncation exception, identified by exact byte hash
and known usage. Every other unknown/rejected outcome still stops the batch.
The draft never edits or reconciles the old entries.

New generation requests set `thinkingConfig: { thinkingLevel: 'LOW' }` and
retain 2048 output tokens, exact prompts/model/tools/assets and zero retries.
Card-pop requires `--manual-repeat-card-pop` plus fresh approval and uses only
`family-card-pop-manual-repeat-1`; its exclusive existing-attempt guard rejects
a second repeat. The old result and failed record remain intact.

Offline commands, from the task worktree:

```powershell
node .tmp/grifon-elevenlabs-assessment-draft/audio-assess.mjs --self-test
node .tmp/grifon-elevenlabs-assessment-draft/audio-assess.mjs --reuse-pencil
node .tmp/grifon-elevenlabs-assessment-draft/audio-assess.mjs --family card-pop --manual-repeat-card-pop
```

Syntax, default, self-test, pencil reuse and card-pop request planning passed.
The planned repeat request is 10,480,096 bytes, SHA
`61647833257cd00c55eea7b32d49db7865c45f9f18c4d7e94f9a6851a24b494a`.
Actual CLI controls rejected both the old note and a fresh note missing the
manual-repeat flag with exit 1 before SDK/key access. Mocks also confirm
14-call accounting, original reservation carry, one repeat only and future
unknown-outcome refusal. Independent revised-draft review is pending here.
The installed SDK also passed an offline wire proof with a dummy key and
intercepted mock fetch only: one countTokens request and one generateContent
request retained all five exact native audio hashes, LOW thinking, 2048 output,
JSON and empty tools. Network/provider/secret/paid-ledger writes were zero.

Optional generated sources use `--generated-catalog <local.json>` and
`--generated-catalog-sha <exact SHA>`. The catalog must have
`schemaVersion: 1`, `mode: approved-generated-sfx`, revised approved spec SHA,
cue-plan SHA, and actions for only keyboard/lens-focus/logo-resolve. Each action
records exact spec prompt/settings, positive quoted credits, starting/ending
credit balances, completed outcome and generation timestamp. Credit balances
must be continuous, known charged credits at most the quote, and total quoted
and charged credits at most 250 across no more than three actions. Each action
has four numbered candidates, exact prompt, `ElevenLabsWebsiteSoundEffects`
source label, unique IDs/native paths/native SHA hashes, bytes and duration.
PCM16 stereo48k native WAV bytes are protected. Final selected manifests may
use only the protected original or generated catalogs. No generation/download
is performed by this script; native source selection and actual final model
assessment remain root work.

Root's actual manual card-pop repeat then stopped with unknown generation
outcome and no usage/result. Its failed record remains unchanged at SHA
`5924664817b1f1f8fb3dcb7fc2351ab4bbd986d8767363ac521ab499bd72bfeb`.
No retry, reconciliation or reset was performed by this worker. Further live
work is blocked; the original discarded exception cannot be reconstructed.

The sole subsequent structural correction records bounded safe diagnostics
for future failures: phase, whitelisted error names/codes, integer HTTP status,
and at most three classified cause nodes. Raw messages, headers, bodies, URLs
and stacks are never read or saved by that classifier. Source SHA is
`3e316c1e82ae6b08fe9a28778a11196b98f92fef6816215319546056e303edda`.
Syntax and the offline self-test passed. A mock thrown ApiError with fake secret
content captured GENERATE_CONTENT, status 503, UNAVAILABLE and its ECONNRESET
cause. Forbidden raw-field getters and the fake secret were excluded from the
saved record; the second attempt was refused and generation count remained 1.
Approved requests, model/thinking/output knobs, hashes and paid ledger bytes
were unchanged by this diagnostics correction. No real key/provider was used.
