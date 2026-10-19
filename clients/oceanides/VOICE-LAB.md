# Oceanides Voice Lab

Internal browser evaluation for the proposed Oceanides callback assistant. This
is a local development tool, not a customer phone line or a deployed receptionist.

## Business contract

- Household septic-tank siphoning in Metro Manila.
- PHP 5,000 **per truckload**, with capacity up to 4,000 liters. The agent must not
  guess the number of loads or present this as the complete job price.
- Planned outbound calling window: daily, 08:00–17:00 Asia/Manila. This is not a
  promise that a crew is available during those hours.
- Neil or Zam checks with Boss Jay and approves the final price and service slot.
  A booking requires dispatch approval **and** the customer's acceptance of that
  exact price and slot. Changes invalidate the earlier acceptance.
- Unconfirmed fees, warranties, service claims, and arrival estimates are unknown.
  Escalate rather than invent them.

## Run locally

Use the funnel's own dependency installation. From
`funnels/oceanides-price-page` in PowerShell:

```powershell
npm.cmd ci
npm.cmd run dev:voice
```

Dependencies are already installed in this checkout. Reuse them; `npm.cmd ci`
is needed only for a fresh checkout or a dependency repair.

Open `http://127.0.0.1:5184/voice-lab.html` on the desktop. The separate Vite
configuration must not register `/api/lead`, `/api/ops`, or advertising events.
Port 5184 is strict: a conflicting process is an error, not a reason to silently
move the lab or stop an unrelated server.

## What to evaluate

Mock mode uses synthetic leads, scripted conversation behavior, and simulated
dispatch actions. It proves UI, tools, state transitions, and failure recovery.
It does **not** establish Grok's language understanding, naturalness, real speech
latency, microphone quality, or telephone reliability.

Use the scenario selector, start a session, and enter the suggested caller turns.
Inspect the transcript and tool log. Staff approval and customer acceptance are
separate actions. Test pending, approved, rejected, and failed dispatch decisions;
change an approved quote and confirm that it cannot reuse prior acceptance.
Request human help and inspect the saved handoff context.

Human ratings begin unset. Neil and Zam score Taglish, warmth, pacing, and tone
appropriateness from 1 to 5 only after hearing actual voice. The proposed target
is an average of at least 4 with no critical misunderstanding.

Proposed browser performance targets are median ordinary-response latency at
most 1.5 seconds and audible playback interruption within 300 milliseconds of
sustained caller speech. Report raw timings, sample counts, median, worst case,
and descriptive p95. Tool-dependent responses are a separate group. A filler
acknowledgment is not a completed relevant answer. A small sample cannot establish
production p95. Mock timings must remain labeled as mock or unmeasured.

## Paid test specification: approved, unchanged inputs only

Neil explicitly approved the exact draft on 2026-10-18: at most **10 sessions of
3 minutes within US$5**, one active session. He subsequently approved adding the
exact opening below, then explicitly approved one additional recovery attempt
with USD0.50 additional allowance. On 2026-10-19 he approved one further attempt
with the same voice/opening and another USD0.50. The current cumulative cap is
**12 attempts / USD6.00**; all eleven prior reservations remain counted.
The current raw-file SHA256 is `24427b8cd6819e9898369f9f148df4088d261b35755d7398e4d79e3266ac7758`.
The preceding eleven-attempt identity was
`3c2077baa62f6eddcc70a90f4253af847163cede28659c0683ee0e0202c7e663`.
The preceding opening-only identity was
`6d66cbfe539b9dc6fc5aa35193511e1378d51245d7a147c7cd6f0f4c2769e0cf`.
The original approved identity was
`09fc7b4f15acb4b327016c36fc4f31d173030f96647c5050f07a7221653eaeee`.
Preserve that approval; do not request it again for unchanged inputs. Any changed
model, voice, instruction, scenario input, asset, or generation setting requires
fresh approval.

Review the exact [paid-test specification](../../funnels/oceanides-price-page/dev/voice-lab/paid-test-spec.DRAFT.json),
including its full instructions, tool schemas, synthetic lead, ten caller scripts,
staff actions, and acceptance criteria. The filename retains `DRAFT`; the explicit
human approval applies only to the exact identity above. Verify it with:

```powershell
Get-FileHash funnels/oceanides-price-page/dev/voice-lab/paid-test-spec.DRAFT.json -Algorithm SHA256
```

All three server-only gates must match before a paid connection can open:
`OCEANIDES_VOICE_LIVE=1`, `OCEANIDES_VOICE_APPROVED_SPEC_SHA256` equal to that
approved file's SHA256, and an available `XAI_API_KEY`. Keep these unset during
ordinary development. This is a local approval interlock, not a substitute for
Neil's approval of the exact test. `liveReady` establishes local gates and budget;
it does not establish valid provider credentials, credit, or voice access.

The cumulative limit is twelve sessions of at most three minutes each, with one
active connection. The spec's voice cost basis is US$2.88 at US$0.08 per minute
for thirty-six minutes; applicable text/tool charges and a contingency must
fit within the US$6.00 ceiling. Eleven attempts are already reserved; exactly one
further attempt is authorized. This excludes future telephone-number setup and
customer phone tests, which are outside this milestone.

The server reserves budget before opening a paid connection. Reservations survive
restart and a specification change; an uncertain failed connection does not
release its reservation. There is no automatic paid retry or budget-reset button.
The lab's ledger constrains this lab, not other applications using the account.
Do not delete or reset the ledger to continue after the allowance is exhausted.
The persistent ledger is `.tmp/oceanides-voice-lab/budget.json` at the repository
root. An unresolved lock after a crash blocks further sessions; inspect the
owning process and ledger before recovery, preserving every reservation.

Server credentials come from the secure process environment. Never put the API
key in a browser-visible `VITE_*` variable, form field, transcript, screenshot,
report, or Git commit. Leave live mode disabled until the exact specification has
been approved. Approval artifacts and the usage ledger are local, ignored state.

No audio is automatically recorded. Use synthetic names, addresses, and contact
details during evaluation. Review any exported transcript before sharing it.

### Diagnose startup before another voice attempt

The first four manual live starts failed before a conversation. A free preflight
found that the loaded credential did not have the basic raw xAI key format.
Human re-entry passed validation; a fifth lab attempt has since been reserved.
Subsequent silent-session attempts reached the original limit: **ten reservations
totaling US$5.00**. The original allowance was exhausted; Neil approved and used
the single recovery extension specified below, reaching11 reservations/USD5.50.
These are not confirmed xAI
charges. Do not reset/refund/reclassify the ledger or exceed the approved
extension. Never put a key in chat, command arguments, a browser form,
or a file.

An explicit `POST /api/voice-lab/check-provider` with JSON `{}` performs a single
read-only `GET https://api.x.ai/v1/api-key`. It creates no voice session or budget
reservation and never retries. The request requires the exact loopback Host and
Origin. Status reads alone do not contact xAI. Missing or malformed credentials
are rejected locally before a fetch. Public results contain only format
plausibility, HTTP status, a fixed transport category, and projected account/ACL
booleans; key material, names, IDs, raw ACLs and response bodies are discarded.
A successful check is credential evidence, not proof of voice access or credit.

WebSocket failures now retain only a phase, elapsed time, numeric HTTP/close
status, and allowlisted error codes. Do not repeatedly press Start to diagnose an
authentication failure: each attempted voice connection reserves another slot.
The ignored desktop private launcher validates credentials through the same
free check before starting the armed Vite process. It never starts a paid voice
session automatically. Check the desktop microphone separately before Start.

### Approved opening and listening sequence

Neil explicitly requested this exact revised opening on 2026-10-18:

> Magandang araw po! Ako si Michael, AI assistant ng Oceanides. Anong service po ang kailangan n’yo?

Keep `grok-voice-3.0`, stock `eve`, all existing session instructions, server VAD,
audio format, tools and scenario inputs. The approved `openingMessage`
is part of the exact paid-spec identity. This approval does not reset the ledger
or authorize other prompt, voice or model substitutions.

The browser acknowledges audio readiness after microphone capture starts. Only
then may the configured bridge send the opening once as an interruptible
`force_message`. Do not send an additional `response.create` for that greeting.
It uses TTS synthesis, so replay the actual opening to assess its accent rather
than assuming it matches the model-generated greeting heard in the playground.
No fixed response delay or emotion parameter has been added.

### Silent-session recovery: local checks before paid connections

The original opening implementation could label a session Active after connecting
audio nodes without receiving any microphone/worklet frames. A stale browser
page also lacked the new `audio_ready` message but could still reserve a paid
connection; the server then suppressed greeting and input while waiting for it.
These are reproducible integration gaps. Historical silent sessions did not
retain enough stage information to prove the exact cause on Neil's separate
Chrome/Edge tab. A null provider error is not evidence that browser audio worked.

Use **Check microphone & speaker · no spend** after a hard refresh of the desktop browser. This
is local only: no service session, provider call, budget reservation, saved audio
or upload. Allow the microphone, speak while watching the level/frame indicator,
and confirm whether the quiet test tone is audible. Receiving frames establishes
capture activity; zero-level frames may still be silence or a muted input. A
scheduled tone does not prove the physical speaker is audible. Stop the local
check with **Stop local audio check** when finished; it remains available with
the paid allowance exhausted.

On 2026-10-18 Neil confirmed that the meter moves and the quiet test tone is
audible in his separate Chrome/Edge window. This establishes basic capture and
output routing on his hardware. It does not establish Grok connectivity, speech
understanding, voice quality or interruption behavior.

The updated client waits for a running AudioContext and a real worklet frame,
within a bounded preflight, before its paid REST/WebSocket start. Permission
denial, a stalled permission dialog, no frames, Stop, late permission grants,
processor failure and interrupted browser audio must not silently become paid
sessions. The REST start requires the current `audio-first-frame-v1` protocol;
older cached clients are rejected before allocation/reservation and must reload.

Public local status retains only bounded lifecycle flags, frame/chunk counts and
fixed event/stage names after the session stops. It must not retain raw audio,
transcripts, IDs, credentials, headers or provider bodies. These fields help
distinguish provider configuration, browser readiness, greeting delivery and
input/output activity during a future explicitly approved test.

The following listening sequence remains pending. It does not authorize an
additional attempt after exhaustion. Complete the local hardware check first;
any further paid test needs a fresh, concrete user-approved specification and
allowance. Preserve all ten old reservations. Use the existing scenario inputs:

1. **Repeated interruptions.** Say `Magkano po yung service?`, then interrupt
   audible speech with `Wait lang, may sasabihin pa ako.` and
   `Sandali, iba pala yung address.` Check actual sound stops, late buffered
   audio stays stopped, and the response addresses the correction. Record the
   estimated cutoff and listening judgment separately.
2. **Thinking pauses.** Say `Yung address namin...`, leave a 1-3 second pause,
   then use `Sandali lang, iniisip ko pa yung schedule.` and `Sa Quezon City po.`
   Listen for premature takeover or pressure; a gentle acknowledgment differs
   from launching a new question before the thought is finished. Browser silence
   timing alone cannot establish whether the model understands a thinking pause.
3. **Price objection / emotional appropriateness.** Use the existing lines
   `Parang mahal naman. May discount ba?` and `Hindi na muna, salamat.` A mildly
   frustrated delivery should receive a calm, respectful response, no invented
   discount, inappropriate laughter or continued selling after refusal. Rate
   Warmth and Appropriate tone from 1-5; do not insert speech tags into Grok.

The original ten-attempt / US$5 cap is exhausted; only the recovery below is added.
No new live listening result
has been established by the local checks or synthetic browser tests. Export any
future approved session report before a new session replaces displayed evidence.

### Approved single recovery probe

With the human local audio check passed, the smallest useful next step is one
additional **Natural inquiry** session. Neil explicitly answered **Approve this
one recovery test** on 2026-10-18. This approval covers the exact budget-only
candidate and sequence below. Do not request the same approval again.

Keep the exact opening, `grok-voice-3.0`, `eve`, server VAD, PCM24k, instructions,
tools, all existing scenario inputs and the synthetic Alex Test / Quezon City
lead from the currently approved specification. Select `natural-inquiry` and
speak only its existing first line:

> Hi, magkano po magpa-siphon sa Quezon City?

Listen to the opening, ask that question, listen to the relevant answer, then
Stop. Do not use dispatch approval, booking actions, extra caller lines, new
voice settings, deliberate interruptions or emotion tests in this recovery
probe. Those evaluations remain pending after end-to-end audio is established.

Pass requires Neil to hear both the exact opening and the response, with the
transcript reflecting the spoken question, a successful `lookup_rate`, and an
answer that states PHP5,000 **per truckload**, up to4,000L. No final-total or
confirmed-booking promise is allowed. Fail and Stop if the opening is still
inaudible 10 seconds after Active/readiness, or a relevant reply is still
inaudible 10 seconds after the question ends. Also Stop on connection, tool or
microphone failure. No automatic or manual retry is included.

Maximum: **one additional attempt, three minutes, USD0.50 additional local
allowance**. Stop after the first complete reply even if time remains. Preserve
all ten old reservations in the same ledger. The cumulative cap is now
11 attempts / USD5.50; this is not a ledger reset, confirmed provider bill or
authorization to buy credits or enable auto-recharge.

The exact approved budget-only delta is:

| Location | Previous | Approved |
| --- | --- | --- |
| `ledger.ts` HARD_LIMITS.maxAttempts | 10 | 11 |
| `ledger.ts` HARD_LIMITS.maxUsd | 5 | 5.5 |
| Paid spec limits.maxAttempts | 10 | 11 |
| Paid spec limits.maxUsd | 5 | 5.5 |
| Paid spec costBasis.maximumVoiceMinutes | 30 | 33 |
| Paid spec costBasis.maximumVoiceUsd | 2.4 | 2.64 |
| Paid spec costBasis.note | `USD 5 local allowance` | `USD 5.50 local allowance` |

All remaining spec bytes stay identical. The candidate raw spec is saved locally
at `.tmp/oceanides-voice-lab/paid-probe-PROPOSED.json`, SHA256
`3c2077baa62f6eddcc70a90f4253af847163cede28659c0683ee0e0202c7e663`.
The active spec now uses those candidate bytes. Approval also authorizes updating
the server/launcher exact-hash metadata to this identity after the budget checks
pass; never read or copy the existing key to accomplish that. The current
process approved the old hash and could not automatically accept this revision.
After checks, the identified inactive owned launcher/child were stopped and the
port verified free. The updated helper's `--validate-only` passed with ten
reservations / USD5 retained and one remaining attempt. A fresh private terminal
is open for human-only noecho key entry, titled **Oceanides Voice Lab - private
recovery key**. The first PowerShell wrapper did not keep the private helper
running; direct Node launch did. Use only the exact hidden-key prompt, never a
plain `PS ...>` prompt. No new approval source or gate bypass was added. Do not
read the console while the human enters a credential.

Neil subsequently confirmed private entry succeeded and the Vite URL appeared;
he also confirmed sufficient available xAI credit for the approved probe. Public
GET status now reports inactive, `liveReady: true`, the exact new spec hash,
10/11 attempts and USD5/USD5.50 reserved. The ledger bytes remain unchanged.
The refreshed browser showed Live voice available. No paid session was initiated
by the agent. This was the ready-state checkpoint before Neil ran the recovery;
its observed outcome and exhausted allowance are recorded below.

Recovery verification passed: 119 focused tests, full suite1692 passed/32 skipped,
voice typecheck, root/funnel/lab builds and applicable static checks. Independent
review passed62 focused tests and the exact budget-only spec/launcher changes.
Three new recovery regressions failed under the original caps before the fix.
This is setup evidence, not proof of an actual Grok conversation.

Evidence: local report/transcript, tool log, safe lifecycle flags/counts, raw
timing samples/count and Neil's audible-opening/audible-reply judgment. No raw
audio recording is needed. One probe cannot establish response-time statistics,
natural Taglish quality, emotion, thinking pauses or reliable interruption.
Read available xAI credit before the paid start; no funding action is included.

### Recovery outcome and cancellation follow-up: 2026-10-19

Neil reports no audible opening despite speaking the entire approved price
question. The transcript showed approximately one word; he refreshed before a
report was supplied. This is not a successful speech-understanding result.

Before runtime edits, the stopped session's public diagnostics were projected
into `.tmp/oceanides-voice-lab/recovery-silent-diagnostics-2026-10-19.json`:
provider configured, audio ready and opening written were true; 575 input-frame
append attempts and one output chunk were counted, no classified provider error
was retained, and the operator stopped the session. These counters do not prove
that the provider recognized the full utterance or that browser audio was heard.
At that checkpoint the ledger was11 attempts / USD5.50, inactive and exhausted.
Preserve all reservations. The subsequent authorization is recorded below.

A zero-network regression reproduced a backend cancellation race: speech while
an opening lacks a response ID could arm cancellation against the next caller
answer. The transport fix delegates server-VAD cancellation to the provider,
clears obsolete deferred client cancellation when VAD takes ownership, and
preserves cancellation of identified responses and explicit client interrupts.
It does not change the approved voice, opening, VAD thresholds or other generation
settings. A related canceled-response filter could also drop a completed caller
transcription that has no assistant response ID. Caller transcription is routed
before that assistant cancellation filter, while late canceled assistant audio
and text remain suppressed. These defects are not proven to be the cause of
the historical recovery; the one-word display cannot establish whether ASR itself
recognized only one word or the lab dropped other transcription events.

Additional bounded counters distinguish provider VAD, response creation/completion,
client interrupts, dropped canceled deltas, forwarded PCM bytes and browser
received/decoded/scheduled/ended/canceled/dropped chunks. Browser counters also
include decoded/nonzero sample totals and local/server-notification interruption
counts (`serverInterruptNotifications`), retained after operator Stop and in the
local report. Server-notification
counts can include the acknowledgment of a local interrupt; they are not unique
speech-onset counts. Only exact numeric fields are accepted, with no IDs, text,
audio, raw provider events or credential values retained in these diagnostics.

The new guarded native browser fixture injects known PCM through the fake socket
and actual UI callbacks. A downstream analyser confirms nonzero rendered audio,
natural playback drain, local/provider interruption, rejection of late canceled
chunks and playback of a later reply. All APIs and sockets are mocked or blocked
before navigation; no provider connection is made. This closes the previous gap
where native browser tests proved a local tone but did not exercise streamed
bridge audio. It does not establish actual Grok speech or physical audibility.

Final follow-up verification: backend65 and audio/connection22 tests passed;
full suite1700 passed/32 existing skips; voice typecheck and root/funnel/lab
builds passed. The new native browser fixture passed1/1, including the echo of
a local interrupt. Independent review reran53 service/audio tests and resolved
all three findings. New cancellation and caller-transcript regressions failed
before their fixes. Static/bundle/exclusion checks passed. No visual layout,
user-facing copy, approved spec bytes or exhausted ledger bytes changed.

The final runtime check found the private launcher and listener no longer running;
no active session or unresolved lock remained. The exit cause was not established.
The lab was restored with the standard local Vite command in mock-only mode,
explicitly clearing the live flag, approval environment and xAI key in that
development process. Public GET confirmed inactive,11/11 reservations and live
blocked; no key re-entry or provider call was needed for this restoration.

### Approved welcome and full-question recovery: 2026-10-19

Neil explicitly approved one additional live attempt, maximum three minutes and
USD0.50 additional allowance, using the same voice and opening. This extends the
cumulative cap from11/USD5.50 to12/USD6.00. All eleven existing reservations remain
unchanged; no refund, reset, automatic retry or credit purchase is included.
The preceding failed call remains a failed observation.

Use the exact same Natural inquiry sequence and ten-second silence stop rule as
the preceding approved probe: hear the approved Michael opening, say only
**Hi, magkano po magpa-siphon sa Quezon City?**, hear the first relevant answer,
then Stop. Hard stop at three minutes. No deliberate interruption, additional
line, dispatch action, voice substitution or emotion setting is added here.
Pass requires an audible opening/reply, a transcript reflecting the complete
question including Quezon City, successful rate lookup and the correct per-load
rate without an unapproved booking promise. Download the local report before
refreshing, even on failure; retain the new bounded playback/lifecycle counters.

Only the cumulative budget changes: ledger/spec maxAttempts11 to12, maxUsd5.5
to6, spec maximumVoiceMinutes33 to36, maximumVoiceUsd2.64 to2.88 and the note's
USD5.50 allowance toUSD6.00. All other raw spec bytes remain identical. The
private launcher must match the new raw SHA256 and cumulative limits before
human-only hidden-key entry. Approval receipt is local/ignored at
`.tmp/oceanides-voice-lab/paid-approval-welcome-2026-10-19.json`.

The startup check found no listener on5184 and no unresolved lock. Updated
launcher validation passed with11/12 attempts and USD5.50/6.00 reserved. The
direct Node private launcher is open for human-only hidden-key entry; do not
recover or copy a key from another process. The user must start the one paid
session in their separate Chrome/Edge window. A ready server is not proof of
actual voice.

Verification:68 focused budget/spec/service tests passed, with four expected
failures under the old cap. Independent review reran68 tests and found no
actionable defects; exact spec-byte equivalence, helper/receipt and unchanged
actual ledger hash checked. Root/funnel/lab builds, voice typecheck and static
checks passed. The first full run had three five-second timeouts during
concurrent checks; a full rerun without concurrent builds passed1700 tests with
32 existing skips. No timeout/test changes or new skips were used. The known
generated snapshot had only EOL changes and was restored after verification.

### Later comparison: ElevenLabs v4 Turbo

Current official docs distinguish produced-content `eleven_v4` from realtime
`eleven_v4_turbo`, with Filipino listed for the v4 family. The latter is the
candidate for the later live-agent comparison. Account access, exact Eleven
voice, system instructions, turn policy and paid ceiling still need a concrete
comparison specification; this lab does not yet contain an ElevenLabs adapter.
No ElevenLabs generation, account change or subscription is started here.

Reuse the approved opening and the same three scenario scripts/business rules.
Score natural Taglish, warmth, pacing, appropriate tone, premature takeover,
audible interruption cutoff and invented promises. Comparing complete
ElevenAgents and Grok setups measures the whole system, not TTS in isolation.
Vendor synthesis-latency claims do not include microphone/network/turn-detection
or tool delays. A standalone TTS sample cannot pass the live interruption test.

References: [xAI force message](https://docs.x.ai/developers/model-capabilities/audio/speech-to-speech#force-message),
[Grok prompting](https://docs.x.ai/developers/model-capabilities/audio/speech-to-speech/prompting-guide),
[ElevenLabs models](https://elevenlabs.io/docs/overview/models),
[ElevenLabs conversation flow](https://elevenlabs.io/docs/eleven-agents/customization/conversation-flow).

## Acceptance and next milestone

The first delivery requires passing mock logic and browser tests, build checks,
production-build exclusion checks, and independent review. Zero invented charges
or premature bookings is the functional bar. Actual Grok quality remains NOT RUN
until an approved live test is completed.

Run verification from the repository root:

```powershell
npm.cmd run test -- oceanidesVoice
npx.cmd playwright test --config playwright.voice-lab.config.ts
npm.cmd --prefix funnels/oceanides-price-page run typecheck:voice
npm.cmd --prefix funnels/oceanides-price-page run build
npm.cmd run build
npm.cmd run test
```

For the separate lab build, run `npx.cmd vite build --config
vite.voice-lab.config.ts` from `funnels/oceanides-price-page`. Its output stays in
that folder's ignored `.tmp/voice-lab-build` directory.

The dedicated browser suite explicitly disables live mode and server credentials.
Its mock evidence is local under `.tmp/oceanides-voice-lab/`; the ordinary funnel
build excludes the lab entry point. Current internal technical controls use
English; customer-facing Taglish instructions and caller lines remain governed
by the exact approved specification. Independent review of this recovery change
passed the Oceanides brand checks at desktop and both mobile widths.

If the browser voice evaluation passes, plan the real telephone route separately:
Philippine carrier and caller ID, incoming calls, outbound dialing, transfers,
duplicate prevention, and measured crew-approval time. Repeat acoustic tests over
that route before calling the customer pilot ready.

References: [Grok voice API](https://docs.x.ai/developers/model-capabilities/audio/speech-to-speech),
[pricing](https://docs.x.ai/developers/pricing),
[Reception call handling](https://elevenlabs.io/docs/reception-ai/receptionist/call-handling).
REA is an optional observation tool; it is not a dependency of this lab.
