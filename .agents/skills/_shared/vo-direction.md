# VO DIRECTION — Sabri's speaking checklist, aimed at synthesized delivery

> Source: Neil, 2026-08-01 (Sabri Suby speaking checklist). **Reframed on purpose.**
> We do not do live speaking, so filing this as general "speaking advice" would be a
> doctrine nobody ever triggers. Eight of its ten items map onto something we ship every
> week — the **voice-over track** ElevenLabs synthesizes for every ad. So this is a
> voice-DIRECTION file: each principle is paired with the lever we actually control.
>
> **Scope:** agent-authored VO direction — Grifon ads, client ads (Kuya Marvin et al.),
> `ai-editor` work, and the non-tuned audio-tag mapper in issue #95.
> **Out of scope:** the VO scripts the PRODUCT generates. Those come from TUNED
> `api/_lib/prompts.ts` — changing how they sound goes through a gated proposal, not this file.
> Language/register decisions come first from [`taglish-voice.md`](taglish-voice.md) STEP 0.

## The levers we actually have

| Principle | The lever |
|---|---|
| Eliminate filler ("um, uh, like") | Free — TTS only says what the script says. **The script is the filler filter.** Cut verbal throat-clearing at the writing stage: "So basically," "Ang ganda kasi na," "You know." |
| Master the pause — silence gives impact | **Punctuation is the pause control.** A period buys more silence than a comma; a line break buys more than a period. Write the beat you want to hear. Do NOT try to buy a pause with trailing silence in the audio — the trim anchors to measured speech end (`#91`) and will cut it. |
| Adjust tone & pace to audience | Sentence length IS pace. Short sentences read fast (younger, scroll-stopping); longer clauses slow the read (older, trust-building). Same lever as the copy rhythm rule — you are writing the tempo, not annotating it. |
| Downward inflection for authority | Statements, not questions. End the CTA on a period. A rising line reads as asking permission — fatal on the close. |
| Mirror audience language & energy | STEP 0 in `taglish-voice.md` decides Taglish vs English; then match the avatar's actual vocabulary (Bryan says "grabe" → you say "grabe"). |
| Repetition to drive key points | Repeat the offer/claim verbatim, not paraphrased. Paraphrase reads as a new idea and costs comprehension; verbatim repetition compounds. |
| Ruthless clarity, no ambiguity | Same test as the copy rules: would a 45-year-old sari-sari store owner say this out loud without stumbling? A line that survives reading but not *saying* is a VO defect. |
| Visual storytelling — metaphor, mental pictures | Concrete nouns over abstractions. The listener has no rewind button; an abstract line is simply lost, not re-read. |
| Record yourself, analyze tone/pacing | **Listen to the rendered MP3, not the script.** The `$0` restitch harness (`tests/integration/restitch-real.test.ts`) plays back real footage without a paid render — that is our "record yourself." |
| Always review and refine | Ledger discipline: a VO finding is a pattern only at ≥3 corroborating instances, same gate as the Swipe File. One good read is not a rule. |

## Audio tags — validate before trusting (issue #95)

ElevenLabs v3 supports inline audio tags, and `#95` exists because their pronunciation
behavior is **unverified here**. Until that validation runs:

- Do NOT sprinkle tags into scripts on the assumption they work. Test one, listen, then adopt.
- Any tag→behavior mapping ships as a **non-tuned mapper** (per `#95`), never by editing
  tuned prompt content.
- Remember the deleted precedent: `services/phoneticNormalizer.ts` was removed in `2e70c5a`
  because per-word respelling made output *worse* on A/B listening. **Treat any new
  pronunciation layer as guilty until Neil's ear says otherwise.**

## Hard constraint

**Forced alignment must be available** or none of the timing craft above survives the render:
captions silently fall back to even-spread estimates and the speech anchor goes inert
(issue [#96](https://github.com/yopiheart/grifon-command/issues/96)). Confirm the ElevenLabs key
carries the `forced_alignment` permission before any batch that matters.
