# Concierge PoC — Findings (Scene-1 end-to-end, 2026-06-28)

Companion to [`concierge_director_plan.md`](concierge_director_plan.md) (branch
`claude/video-ads-workflow-fgg2sy`). This is the **Step-1 PoC** from that plan's
build order (§5): a 1-scene mini-ad to de-risk the pipeline before building
Concierge. **Status: core chain PROVEN.** Assets saved under
[`concierge_poc/assets/`](concierge_poc/assets/) (committed so they survive the
cafe-PC defreezer; `.tmp/` is wiped on reboot).

## What we proved (the full chain, end-to-end)

```
Ad-Recon → Viral-Autopsy → CMO brief → gpt-image-2 plate → Veo talking-head → Zam Voice-Changer (STS)
```

Competitor recon'd: **Cursor** (AI code editor). Winner autopsied:
**Andrewcodesmith × Cursor** — a 57-day-old real-human polished-UGC talking-head
("solo-builder aspiration story": hook → problem(doing it alone) → solution(tool
as enabler) → demo → CTA). Remixed into a Grifon self-promo (Zam founder, push
Free, Testimonial formula). Rendered **Scene 1 only** (the hook) to cap cost.

## Verdicts

### gpt-image-2 via Codex CLI (the `codex-image` skill) — ✅ strong, ₱0
- **Likeness preserved** from the real source (`zam-ref-source.jpg`) across 3 plates (scenes 1/2/6) using **`--edit` (edit-mode conditioning on Zam's photo)**.
- **Relight = clean.** It took Zam's flat studio selfie and relit her into a new room with directional light + contact shadows — she reads as photographed there, NOT pasted. **This is the opposite of the Expert-mode upload-composite problem** → the folded-in "upload vs auto-cast" question is answered: **upload + gpt-image-2 edit relights well.**
- **Consistency** (face + wardrobe + set) held across scenes.
- **Cost ₱0** (billed to ChatGPT plan, no API spend). Wardrobe kept = the real cream zip sweater (on-register for UGC).
- Gotcha: Codex's sandbox sometimes goes read-only and its `✓ saved` is a false positive — recover the PNG from `~/.codex/generated_images/<session>/` and copy it.

### Veo 3.1 Fast image-to-video (talking-head) — ✅ good
- Animated the plate into a real talker: **mouth movement + hand gestures + head motion**, likeness preserved, no distortion, background stable. 9:16, 720p, 6s, ~40s render.
- Carried an **audio track** despite the spec's `supportsAudio:false` note (Gemini API) — worth re-checking whether Veo now emits audio on this surface.

### ElevenLabs STS Voice-Changer (Signal Modulator) — ✅ works
- Applied **Zam's real cloned voice** (`voiceId 7zOl6q4ddocCWzFMrbcr`) to the talking clip; muxed audio back with `-c:v copy` so **lip-sync timing is preserved**.
- STS endpoint accepts a `video/mp4` `sourceFile` directly (extracts audio) and returns MP3.

## The Grifon voice flow (learned the hard way — see agent_lessons)
Encoded in [`api/_lib/sceneVoiceRoute.ts`](../api/_lib/sceneVoiceRoute.ts):
- **talking + has video → STS (Voice Changer)** on the scene MP4 → **preserves lip-sync**.
- **b-roll → TTS** on the script line (this is the *voice-over*).
- cinematic → TTS if there's a line, else silent.
- **NEVER overlay a TTS voice-over on a talking avatar — it desyncs the lips.** VO is for b-roll only.
- STS **swaps the voice but keeps the words.** For a talking avatar to say a specific **Taglish** line, the line must be **baked into the Veo render as quoted dialogue** (talking-scene Veo prompts open with the dialogue in quotes — geminiService ~L2256). THEN STS swaps the timbre.

## Direct-render pattern (important)
Grifon's `GenerateVideo` is coupled to the wizard's storyboard+prompts; driving
the full wizard to render one pre-made plate **regenerates a whole script +
storyboard** (waste + overrides our work). Instead, call the app's own endpoints
**directly**: `POST /api/gemini/video` (Veo, talking) or `/api/kling/video`
(Kling, b-roll) with the plate as the start frame + a Supabase bearer token →
poll → download. Scripts: `scratchpad/render-scene1.mjs`, `sts-scene1.mjs`.
**Model routing rule (Neil): talking = Veo 3.1; b-roll = Kling.**

## Bridges measured (the PoC's real deliverable)
- **Bridge #1 (autopsy → brief):** manual — `grifon-cmo` translated the autopsy
  into a Grifon-voice brief by hand. Works, but it's a human step Concierge must
  automate (Director brain reads the autopsy → picks formula + writes hook/beats).
- **Bridge #2 (final video → CaptionHeadline):** NOT run this PoC (deferred).
- **New friction found:** the `analyze_video.py` specificity validator exits
  `GENERIC_OUTPUT` (≥3 `why_it_works` required) even on rich analyses — false
  negative; it under-reports success. And it can't decode silent UI-demo ads
  (Cursor's brand-direct track) — UGC is where the edit DNA lives.

## Known gaps / next steps
1. **Words are generic** in the rendered clip (Veo's own audio, voice-changed to
   Zam). For the real Taglish hook: re-render Scene 1 with the hook as quoted
   dialogue, THEN STS. (Neil chose to test STS on the existing clip first.)
2. **Demo beats 3–5** = real Grifon screenshots (captured to `poc-shots/`,
   defreezer-wiped) — not yet assembled.
3. **Phase 6** (CaptionHeadline) + **gemini-eval** grade still pending.
4. **Editing-style capture** (the autopsy's word-pop UGC grammar → a Grifon
   preset) remains gated: ≥3 corroborations + Neil approval (it's a TUNED
   `renderPresets.ts` change). One ad ≠ a preset.

## Setup notes (defreezer — re-arm each session)
- Python not installed by default → install 3.12 (per-user, PrependPath).
- `.env` dev flags: `GRIFON_DEV_UNMETERED=true` + `GRIFON_DEV_UNMETERED_VIDEO=true`
  (bypass quota + hourly render rate-limit; LOCAL only).
- `npm run dev` (:5173). Test account: `smoketest-dc@grifon.dev` / `GrifonDcSmoke!2026`.
- Codex CLI logged in (ChatGPT) for `codex-image`.
- **Ad Library scrape:** see the corrected `ad-recon` SKILL procedure (refresh-bug
  + ALL/ALL flow) — committed on branch `docs/ad-recon-adlib-refresh-bug`.
