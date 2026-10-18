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

## Paid test specification: review required

The user accepted a **US$5 planning ceiling**, not permission to run this exact
configuration or spend. The implementation prepares a draft specification with
the proposed instructions, model, voice, inputs, and expected results. Review
that complete draft before enabling paid mode. Any changed model, voice,
instruction, scenario input, asset, or generation setting requires fresh approval.

Review the exact [paid-test specification](../../funnels/oceanides-price-page/dev/voice-lab/paid-test-spec.DRAFT.json),
including its full instructions, tool schemas, synthetic lead, ten caller scripts,
staff actions, and acceptance criteria. The file remains a draft; its existence
does not authorize a call. Obtain the current raw-file identity with:

```powershell
Get-FileHash funnels/oceanides-price-page/dev/voice-lab/paid-test-spec.DRAFT.json -Algorithm SHA256
```

All three server-only gates must match before a paid connection can open:
`OCEANIDES_VOICE_LIVE=1`, `OCEANIDES_VOICE_APPROVED_SPEC_SHA256` equal to that
approved file's SHA256, and an available `XAI_API_KEY`. Keep these unset during
ordinary development. This is a local approval interlock, not a substitute for
Neil's approval of the exact test. No paid session has been run for this delivery.

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
English; customer-facing Taglish instructions and caller lines are proposed in
the approval draft. That internal-language exception remains a brand-review nit.

If the browser voice evaluation passes, plan the real telephone route separately:
Philippine carrier and caller ID, incoming calls, outbound dialing, transfers,
duplicate prevention, and measured crew-approval time. Repeat acoustic tests over
that route before calling the customer pilot ready.

References: [Grok voice API](https://docs.x.ai/developers/model-capabilities/audio/speech-to-speech),
[pricing](https://docs.x.ai/developers/pricing),
[Reception call handling](https://elevenlabs.io/docs/reception-ai/receptionist/call-handling).
REA is an optional observation tool; it is not a dependency of this lab.
