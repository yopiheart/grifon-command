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
exact opening below, with all original fields unchanged. The revised raw-file
SHA256 is `6d66cbfe539b9dc6fc5aa35193511e1378d51245d7a147c7cd6f0f4c2769e0cf`.
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

The proposed run is at most ten sessions of at most three minutes each, with one
active connection. Voice generation alone is approximately US$2.40 at US$0.08 per
minute for thirty minutes; applicable text/tool charges and a contingency must
fit within the same US$5 ceiling. This excludes future telephone-number setup and
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
totaling US$5.00**. Live access is exhausted and must remain blocked. These are
not confirmed xAI charges. Do not reset/refund/reclassify the ledger or increase
the cap to continue. Never put a key in chat, command arguments, a browser form,
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
audio format, tools, scenario inputs and global limits. The new `openingMessage`
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

The original ten-attempt / US$5 cap is exhausted. No new live listening result
has been established by the local checks or synthetic browser tests. Export any
future approved session report before a new session replaces displayed evidence.

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
