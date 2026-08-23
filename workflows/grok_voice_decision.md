# Grok Voice Think Fast 2.0 Decision (2026-08-23)

Verdict on xAI's Grok Voice Think Fast 2.0, evaluated against the Grifon voice
stack. Sources: [x.ai/news/grok-voice-think-fast-2](https://x.ai/news/grok-voice-think-fast-2)
(announcement, dated 2026-07-29) and
[docs.x.ai/developers/model-capabilities/audio/speech-to-speech](https://docs.x.ai/developers/model-capabilities/audio/speech-to-speech).
Pattern sibling of [twelvelabs_decision.md](twelvelabs_decision.md) and
[hyperframes_decision.md](hyperframes_decision.md) — open this before any Grok
Voice / xAI audio work.

**Evidence caveat:** both x.ai domains are blocked by the Claude-on-the-web
egress proxy. Both pages were read through the firecrawl MCP connector; the docs
page came from a cache stamped **2026-08-23 10:56 UTC**. Re-verify the language
table from source before acting on the reopen trigger below.

## Verdict — NO for the product. Two bookmarks, neither urgent.

Do not wire Grok Voice into the render pipeline, the Signal Modulator, or any
`api/elevenlabs/*` path. ElevenLabs stays. The model is genuinely strong on its
own axes — it is aimed at a job Grifon does not have.

## The terminology trap (read this before anything else)

xAI's "speech-to-speech" is **not** Grifon's "speech-to-speech." Same words,
opposite jobs. Assuming a drop-in swap for `api/elevenlabs/speech-to-speech.ts`
is the expensive mistake available here.

| | xAI STS | Grifon STS (`api/elevenlabs/speech-to-speech.ts:145`) |
| --- | --- | --- |
| What it is | Realtime conversational agent (WebSocket, PCM16 frames) | Voice *conversion* — file in, file out |
| Who picks the words | **The model does** | The script does; words + timing preserved |
| Transport | `wss://`, session-based, full duplex | `POST` multipart, `Accept: audio/mpeg` |
| Batch endpoint | **None** — `batch` / `audio file` / `offline` return zero hits in the docs | The only mode we use |

`talking` scenes route to STS *specifically* to keep lip-sync —
`sceneVoiceRoute.ts:25`, and the comment at `audioExtract.ts:10-11`: *"STS
preserves the original timing, so lip-sync survives the voice swap (TTS-over-Veo
would desync the lips)."* A generative voice model emits new words at new
timings. It cannot occupy that slot.

## Blockers, ranked by how fatal

1. **No Tagalog.** Not in the 20-language `Supported Languages` table, not in
   the 25-language WER chart. Indonesian (`id`) and Vietnamese (`vi`) made the
   cut; Filipino did not. The docs' escape hatch — *"also capable of conversing
   in additional languages beyond those listed above, with varying degrees of
   accuracy"* — is not a footing for our core value prop.
   `filipinoLibrary.ts:14` already sets the bar we enforce on every voice in the
   picker: *"verify acceptable Tag-lish performance."* xAI has not cleared it.
2. **It is a fifth invention surface, opened while we are closing four.** The
   standing next action is one diff adding never-invent rules to the image and
   video layers, because Veo improvised *"Ito nang kanina ka."* into scene 7. A
   model whose entire design is *deciding what to say* — auto-detecting language
   and "responding naturally in the same language" — is that same failure class
   promoted to the audio track. The script-layer guards at
   `prompts.ts:512,940,941` exist because generation-that-invents is the
   recurring bug. Do not add another generator between an approved script and
   the render.
3. **The transcription win is worth zero here.** 1.5–2.0x better WER than
   ElevenLabs Scribe v2, ~10x in noise — a real result, and their most
   defensible claim. But **Grifon does no ASR anywhere**: grepping `api/`,
   `services/`, `components/` for transcribe / whisper / scribe / STT returns
   nothing. Captions are drawtext filters keyed off script text we already hold
   (`renderFfmpeg.ts:200-254`). We never need to guess what was said.

**Pricing is a shape mismatch, not just a number.** $0.08/min bills conversation
wall-clock, including silence and the user talking. Our accounting is
per-synthesis with daily counters (`TTS_DAILY` / `STS_DAILY`, `budget.ts:30-34`).
There is no per-scene unit to bill against.

## Bookmarks (note them; do not build)

- **B1 — Concierge, voice-in/voice-out.** `concierge_director_plan.md` is
  text-driven today (voice appears only as "Optional SignalModulator", line 336).
  Spoken intake is genuinely the profile this model wins on: 0.70s time-to-first-
  audio, 95.1% Full Duplex Bench, 56.5% tau-voice agentic vs GPT-Realtime's
  45.7%, plus native tool calling into the existing skill router. Blocked on
  Tagalog; Concierge is still PoC/Phase-0 and Business-tier.
- **B2 — Custom Voices as a slot hedge.** xAI clones from a short reference clip.
  Our cloning is dark (`GRIFON_VOICE_CLONING_ENABLED`) and capped by ElevenLabs
  workspace slots — `voiceConfig.ts:4-5` spells out the squeeze: 10 global on
  Starter, ~5 already held by the Filipino library. A second provider would
  relieve it. But the cloned voice serves the *realtime agent*, and Tagalog
  quality is the same unknown. Worth ~30 min of probing before an ElevenLabs
  tier upgrade, not before.
- **B3 (parked) — Kuya Marvin inbound voice agent.** xAI's own case study is the
  Starlink sales line, and Oceanides' Messenger ad inquiries are that shape. But
  they are Tagalog, they carry a client's brand voice, and Neil answers them by
  hand with three tuned reply scripts (`clients/oceanides/kuya-marvin/ads/`).
  Same blocker, higher stakes.

## NOT doing

- No fourth AI provider in product runtime — same scope line the TwelveLabs and
  Hyperframes verdicts drew.
- No replacement of `eleven_multilingual_sts_v2` (`speech-to-speech.ts:16`) or
  `eleven_v3` (`text-to-speech.ts:16`).
- No touching the 2026-06-13 decision that raw Taglish goes to TTS verbatim
  (`voiceService.ts:42-47`); accent handling lives at the prompt layer.
- No ASR layer built just to consume a transcription advantage we have no use for.

## Reopen trigger

**xAI adds `tl` or `fil` to the Supported Languages table.** At that point B1
earns a real PoC, scoped the way the TwelveLabs pilot was: a live smoke against a
known Taglish specimen, with Neil's ear as the pass gate — never a benchmark
number. Absent that, this verdict stands and the voice stack is not the
bottleneck.

## Timing note

`grok-voice-latest` moved from `grok-voice-think-fast-1.0` to
`grok-voice-think-fast-2.0` on **2026-08-05** — already past. Anything intending
to pin 1.0 had to do so before then. Not our problem today; recorded so a future
session does not re-derive it.

## Status

- [x] Evaluated 2026-08-23, declined. No code changed.
- [ ] Re-check the language table if/when B1 comes up — cached-source caveat above.
