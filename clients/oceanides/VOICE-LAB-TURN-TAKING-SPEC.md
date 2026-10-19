# Oceanides interruption and thinking-pause test

Revision: **TT-2026-10-19-r1**. Status: **PROPOSED; awaiting Neil's approval**.
Preparation grants no paid-call, cap change or runtime activation authority.

## Decision requested and maximum budget

Approve exactly **two additional attempts, each at most180 seconds, USD1.00
additional local allowance total**. One active session; no replacement/retry.
Existing12 reservations/USD6 remain counted. Proposed cumulative limits are
14 attempts/USD7, with USD0.50 reserved before each provider connection.
Failed, interrupted or invalid attempts retain their reservation. No ledger
reset, refund, new ledger directory, automatic reconnect, auto-recharge or credit
purchase is included. Check available account credit before the future run.

The additional maximum connected voice time is6 minutes. Official pricing
checked2026-10-19 is USD0.08/minute plus USD0.004/text input: six minutes has a
USD0.48 voice basis, with the remaining USD0.52 reserved for applicable text
inputs and contingency. No typed caller messages or paid external tools are
planned. The opening uses the existing force-message path; applicable provider
text charges still count. USD1 is the lab's conservative reservation ceiling,
not a guarantee of the provider's final bill or an instruction to top up.

Sources: [xAI pricing](https://docs.x.ai/developers/pricing),
[server VAD and voice API](https://docs.x.ai/developers/model-capabilities/audio/speech-to-speech).

## Identity and unchanged configuration

Baseline active spec:
`funnels/oceanides-price-page/dev/voice-lab/paid-test-spec.DRAFT.json`.
Baseline raw SHA256:
`24427b8cd6819e9898369f9f148df4088d261b35755d7398e4d79e3266ac7758`.
Existing ledger raw SHA256:
`dc6c13fe5aaf23de45ea815f63623d7962c4564ea443ea08bc905bfe828968a2`.

Proposed inactive candidate:
`clients/oceanides/voice-lab-turn-taking.PROPOSED.json`.
Candidate raw SHA256: `0582839db5f331a3a7337030537c78dd4744bb7a666a4f481060c957db7f2c48`.
The candidate is a review artifact; the running lab still reads the baseline.

Keep `grok-voice-3.0`, stock `eve`, `server_vad`, PCM24k input/output, current
system instructions, all eight tool schemas, shared synthetic lead and empty
scenario overrides unchanged. No fixed response delay, VAD threshold, reasoning,
emotion, voice or model setting changes. The same exact opening in both calls:

> Magandang araw po! Ako si Michael, AI assistant ng Oceanides. Anong service po ang kailangan n’yo?

Initial lead in each independent session: Alex Test; TEST-999-NOT-DIALABLE;
Quezon City;12 Sample Street, Quezon City; household septic tank needs siphoning;
street access requires crew confirmation; tomorrow subject to crew confirmation.
Session B resets to this lead, not Session A's corrected state.

Metro Manila household siphoning remains PHP5,000 **per truckload**, up to4,000L.
Final total/crew slot require Neil/Zam checking Boss Jay and customer acceptance.
Callback window08:00-17:00 Manila is not crew availability. All tools and records
are simulated. No real customer, production record, dispatch approval or booking.

## Setup and shared rules

After approval only, verify exact candidate/protocol identities, cumulative
caps and unchanged prior reservations before arming the existing private launcher.
Do not inspect/copy credentials. Use the same separate Chrome/Edge, mic/speaker
route and room as the successful recovery. Headphones are preferred if already
available; record any equipment change. No extra speaker, background audio,
emotion acting or deliberate whispering. Normal conversational Taglish/volume.

Hard-refresh before Session A while inactive. Use Live voice and the specified
scenario. The human speaks the quoted lines **through the microphone**, not the
Caller message box, scenario buttons or manual Interrupt button. The runtime's
English mock buttons and older caller-turn list are not this live script.
Use a silent visual stopwatch; bracketed actions below are never spoken.
Target each planned1/2/3-second gap within roughly0.25 seconds and record the
actual estimate. Mistimed/missed probes are invalid or untested, never passes;
do not repeat a line or start a replacement session to fix operator timing.

After each session: Stop, enter listening checklist/notes and four1-5 voice
ratings, then download the local report **before refresh or another Start**.
Include A1/A3 or B1/B2/B3 outcomes and actual gap/overlap estimates in Reviewer
notes. Save one report per attempt. No raw audio recording is required or
authorized here. Only the two scenarios below are authorized by this proposal.

## Session A: two spoken interruptions

Select **Repeated interruptions** (`interruptions`). Hear the full welcome.

| Step | Exact spoken line / timed action | Required observation |
| --- | --- | --- |
| A0 | **Magkano po yung service?** | Acknowledge the question and reach a substantive rate explanation. A short pre-tool acknowledgment is not the target. |
| A1 | [About1 second into the substantive spoken price explanation, while the agent is still speaking] **Sandali, iba pala yung address. Sa 24 Revised Street, Pasig po.** | Actual playback yields; the entire correction is heard/transcribed. Successful `update_details` sets cityPasig and address24 Revised Street, Pasig. The next relevant reply uses the correction. Canceled speech does not restart. |
| A2 | [After the completed relevant reply and successful update above] **Paki-read back po yung updated details.** | Agent begins a readback of the corrected details. This is not caller confirmation. |
| A3 | [About1 second into that readback, while the agent is still speaking] **Sandali, mali yung number. Sa 42 Revised Street, Pasig po. Pakiulit po yung updated address.** | Actual playback yields again. Successful `update_details` changes24 to42 while keeping Pasig. The subsequent address readback says42/Pasig; no old24/QuezonCity continuation. |
| End | [Stop after that complete corrected-address reply; do not say yes/confirm] | Details remain unconfirmed, dispatch pending, no confirmed booking. Download report. |

If A1 is not successfully understood/applied, stop Session A and mark A3 untested.
If there is no audible overlap opportunity for a probe, stop and mark that probe
untested; do not manufacture a longer answer or add a trigger line. Brief
pre-tool filler does not count as the substantive explanation/readback target.

## Session B: three thinking pauses

Select **Thinking pauses** (`thinking-pauses`). New session, baseline lead and
full same welcome. Start each probe only after the prior complete relevant reply
and visible successful update. Speak each prefix, keep the timed silence, then
deliver its continuation exactly. Do not read the brackets or say "pause".

| Probe | Exact speech with unspoken silence | Expected state after continuation |
| --- | --- | --- |
| B1, unfinished thought | **Yung address namin...** [silent1 second] **Sa 24 Revised Street, Pasig po.** | `update_details` cityPasig/address24; coherent relevant response using the complete address. |
| B2, explicit hold | **Sandali lang, iniisip ko pa yung schedule.** [silent2 seconds] **Sa November one, 2026 po, morning lang ang preference ko, subject pa sa crew.** | `update_details` preferredTime includes2026-11-01 morning as preference, never confirmed availability. |
| B3, unfinished thought | **Yung access sa bahay...** [silent3 seconds] **Makitid yung street, kailangan munang i-check ng crew.** | `update_details` records narrow-street access requiring crew review; no promise that a truck fits. |
| End | [Stop after the complete relevant reply to B3; no confirmation/extra question] | No booking or crew promise. Download report. |

If the agent starts speaking during a gap, keep the clocked gap and deliver the
continuation at its scheduled time anyway; do not improvise. Mark premature
takeover. This incidental overlap belongs to the pause probe, not an additional
passed interruption. A failed probe does not justify repeating it. Continue the
remaining B probes only if audio is stable, state was correctly updated and no
critical safety/business failure occurred; otherwise stop and mark them untested.

## Per-probe pass/fail

A1/A3 pass only if speech itself triggers yielding, the listener hears competing
speech stop, canceled content stays stopped, the correction is complete and the
successful tool/resulting state and subsequent reply reflect its meaning.
An ASR mismatch on city/number is a failed semantic check; do not assume the
operator changed the approved line. A missed timing/overlap is invalid/untested.

B1/B3 pass only if the unfinished thought is allowed to finish without an agent
question, substantive answer, guessed completion or workflow progression during
the gap. B2 may have at most one brief wait acknowledgment (roughly one second
or less), followed by silence; it must not ask a new question, assume a schedule,
progress booking or talk over the scheduled continuation. After all continuations,
the transcript, successful update and reply must preserve the caller's details.

All five completed valid probes must pass, with zero critical misunderstanding,
invented fee/discount/total/crew promise or unapproved booking. A content guard
failure fails the session; invalid/untested probes prevent an overall pass.
Score natural Taglish, warmth, pacing and appropriate tone1-5 for each session;
target average at least4 with no critical misunderstanding. This does not create
an emotion-performance pass or estimate a population success probability.

## Stop rules and sequence

Maximum180 seconds per session, enforced by the existing server timer; stop
earlier when its script ends. Stop if no audible welcome10 seconds after Active,
or no relevant audible progress20 seconds after any completed caller line or
continuation. Also stop for tool/provider/network/mic/playback failure, invented commitment,
unexpected confirmed details/request/booking progression, lost context or an
unusable transcript. Do not use staff approval/failure/disconnect controls.

Run A first. After export and review, proceed to B only if the bridge/audio
remain healthy and A had no critical misunderstanding, business promise or
unapproved state progression. A pure yielding/overlap failure may still allow B;
an infrastructure/critical failure stops the pair. Unused B allowance stays unused;
it does not authorize a replacement A. No retry, resumption or substitution.

## Evidence and timing limits

Collect separate A1/A3/B1/B2/B3 outcomes (pass/fail/invalid/untested), exact spoken
lines/timing deviations, transcript, tool log, final lead/dispatch state,
operator Stop reason, local JSON reports, bounded lifecycle/playback counters,
and listening notes: overlap/late replay/premature question/missed correction.
Compare existing12 reservation entries before/after; preserve new reservations.

Retain unique raw timings and counts, excluding the duplicated arrays. Separate
startup, tool response, post-interruption and genuinely ordinary turns. Report
descriptive median/worst only for correctly identified groups; no general
percentile or reliability claim from two correlated interruptions/three pauses.
Any ordinary median1.5-second target is descriptive and unassessed if no clean
ordinary samples exist; it does not determine these five turn-taking outcomes.

The browser estimates speech-energy onset to queue cancellation plus baseLatency;
it is not an acoustic measurement. Report any local cancellation estimates versus
the provisional300ms engineering target separately from human audible-yielding
judgment. **Physical audible cutoff at most300ms remains unverified** without
a separately approved acoustic measurement method. Do not count an echoed local
interrupt notification as another independent spoken interruption.

Existing `server_vad` may start a response during silence. This is a genuine
possible test failure; do not tune settings, add delay/prompt text, silently
replace the voice or call again to obtain a pass. Diagnose with saved evidence.

## Exact changes proposed for later activation

| Item | Active | Proposed after approval |
| --- | --- | --- |
| Ledger HARD_LIMITS maxAttempts/maxUsd |12 /6 |14 /7 |
| Spec limits maxAttempts/maxUsd |12 /6 |14 /7 |
| Cost basis maximumVoiceMinutes/maximumVoiceUsd |36 /2.88 |42 /3.36 |
| Cost note local allowance |USD6.00 |USD7.00 |
| Interruptions callerLinesForReview/staffAction |Earlier generic script |Exact A0/A1/A2/A3 lines and this timing/validation protocol |
| Thinking-pauses callerLinesForReview/staffAction |Earlier generic script |Six B prefix/continuation segments and1/2/3-second gaps |

All other candidate spec bytes remain identical to baseline. No active file,
HARD_LIMITS, private launcher or approval metadata is changed by preparing this
proposal. After explicit approval of this revision/candidate, implement only
these deltas, verify guards offline including blocked15th attempt/stale hash,
and then rearm the exact candidate through the existing private-key process.
Any new prompt, voice/model/knob, script, asset, retry or increased cap requires
a separately reviewed proposal. Emotion/ElevenLabs/phone tests are outside this one.
