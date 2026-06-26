# Believability DNA — spec (viral-autopsy extension)

**Status:** specced + empirically grounded 2026-06-26 (grill-me + premortem + live
3-register Codex test). Not yet built. Build the *capture* half first (safe); the
*apply* half is frozen behind a validation loop (below).

## Why this exists

`viral-autopsy` today captures **Edit DNA** — cuts, captions, camera, pace —
which feeds the **renderer/presets**. It does NOT capture what makes a human
subject feel **real and trustworthy**: the cues that decide whether our AI
avatars read as authentic or as "AI slop." **Believability DNA** extends the
autopsy to capture those cues from winning UGC/ads and route them to the surface
that can actually execute them. The goal is avatars that look like **real
people** (trust) — explicitly NOT "produced/cinematic," which reads as ad/AI.

## The 3 control surfaces (a cue is only useful if routed to the surface that can execute it)

The avatar pipeline: **Veo 3.1 generates the talking avatar with native synced
audio**; **ElevenLabs speech-to-speech then re-timbres** it to ONE consistent
brand voice (preserving delivery + lip-sync); our ffmpeg renderer burns captions/
graphics on top. So a captured cue has three possible destinations:

| Surface | Controls | Slop risk |
| --- | --- | --- |
| **A. Renderer / presets** (our ffmpeg, post-production) | titles, motion graphics, caption design, fonts, hyperframes | **none** — AI never sees these |
| **B. Veo 3.1 video prompt** (dominant) | visual performance (body/energy/eye-contact/gesture/affect), camera, lens, lighting, image realism, **+ voice delivery for `talking` scenes** | the risk bucket |
| **C. ElevenLabs TTS** | voice delivery only for `cinematic`/narrator-VO scenes | low |

**Routing rule:** a voice-delivery cue → `talking` scene = **Veo prompt** (B);
`cinematic` scene = **TTS** (C). For `talking` scenes ElevenLabs is only a fixed
re-timbre (consistency), NOT a delivery lever.

## The 6 believability dimensions + reading engine

| # | Dimension | Best engine |
| --- | --- | --- |
| 1 | Performance — energy, eye-contact-to-lens, gesture, emotion arc, authenticity cues | video-watch + frames |
| 2 | Voice delivery — tone, pace, emphasis, pauses | audio |
| 3 | Lighting | still frames (`render_audit`) |
| 4 | Camera / lens | still frames |
| 5 | Image realism — skin texture, imperfections, lived-in background, real props | still frames |
| 6 | Lip-sync fidelity — mouth↔audio match | frames + audio sync |

Surface-A (Edit DNA) additions captured alongside: overlay titles, motion
graphics, caption design, fonts, hyperframes. **Zero slop risk** — capture freely.

## Realism registers (3 — fixed curated fragment each)

The autopsy classifies each ad into ONE register + records the raw cues as
evidence, but only ever emits the register's **fixed curated prompt fragment** to
Veo — never a raw technical spec dump. (Over-specification is what produces slop.)

1. **`raw-ugc`** — phone selfie, available light, handheld drift, natural
   unretouched skin, lived-in background. **← winner for trust.**
2. **`polished-ugc`** — creator-grade, ring light, steady, clean-but-real.
3. **`cinematic`** — premium/studio (the Cinematic Spec Studio vocab belongs
   here); reads as "an ad" — use only when the archetype calls for it.

**Principle (validated 2026-06-26): more production ≠ more real.** The cinematic
register reads as ad/AI; raw-ugc reads as a real human.

### Resolution / imperfection principle

Resolution and realism are different axes. Authentic phone-UGC carries softness,
grain, slight focus imperfection — those ARE the trust signals. Do **not** chase
4K / over-sharpen / skin-smoothing for UGC avatars: naive upscaling strips the
imperfections and reads plastic/AI. Delivery is **1080×1920 vertical** (platforms
compress hard anyway). **Preserve imperfection at delivery resolution > add
clarity.** (Clarity/4K is only "right" for the cinematic register — the one that
reads as an ad.)

## AI-slop source guardrail (premortem failure-mode 1)

A 30-day winner might **itself be AI slop**. Copying it wholesale amplifies slop.

- New autopsy field **`source_realism_verdict`**: `real-human | likely-ai | mixed`
  (+ evidence).
- Believability proposals may **only** draw corroboration from `real-human`
  sources. A long-running but AI-looking ad is **excluded** from the count.
- `likely-ai` sources are **not wasted** — they feed a separate **"AI-tells /
  avoid" anti-pattern catalog** (what makes *theirs* fake = what to avoid in ours).
- Principle: **longevity qualifies a candidate; human-authenticity qualifies a
  *believability* source.** Grifon's editorial judgment overrides "it ran 30
  days" — we are the experts at AI ads, so we follow what we know is right.

## Validation loop (anti-slop keystone)

A believability cue becomes a tuned generation-prompt change ONLY after:

1. **≥3 corroborations** across `real-human` autopsied winners → candidate
   register fragment = **Gated Proposal** (same gate as P9).
2. **Manual A/B at proposal review**: render ONE fixed **reference scene** twice
   (baseline vs. with-fragment) on our **actual Veo/Gemini pipeline**.
3. Grade both with **`render_qa.mjs`** (generative slop + lip-sync/caption lag) +
   Neil's eye.
4. Keep ONLY if it **measurably lowers slop / holds lip-sync** (more real, not
   less). If worse → reject + record as a contradiction (just as valuable).

Manual + gated (≈2 Veo renders per candidate). **Step zero:** establish our own
avatar **baseline + consistency** (identity-lock) before any fragment A/B — the
Codex test produced 3 *different* people across separate generations, so
cross-generation consistency is a live, unsolved risk.

## Build plan: capture-all now, apply staged by risk

- **Capture (safe, build first):** extend `tools/analyze_video.py`'s
  `ANALYSIS_PROMPT` with one `believability` block (all 6 dims + observed register
  + `source_realism_verdict`). Cheap; compounds from the next autopsy. No tuned-
  prompt change. `render_audit.mjs` frame-vision cross-checks the visual register
  (Step 3c).
- **Apply (staged):** surface-A (post-production) findings → presets via normal
  review. Surface-B/C (generation-prompt) findings **frozen** behind the ≥3 + A/B
  loop.
- **Patterns:** new **P11+ "Believability" family**, each tagged with its target
  surface (A/B/C), same gating as P9.
- **Hard guardrail:** never propose anything that breaks the **Veo-native-audio +
  STS** path for `talking` scenes — lip-sync is the trust signal; TTS-on-silent-
  video would desync the mouth.

## Empirical proof (2026-06-26)

Codex `gpt-image-2` (1024×1536) generated the same UGC subject across all 3
registers (`.tmp/believability-registers/`, disposable). `raw-ugc` read most
authentically human (skin texture, messy kitchen, selfie framing); `cinematic`
read as a produced ad. Validates the taxonomy + the "production ≠ trust" thesis.
**Caveat:** gpt-image-2 stills ≠ the production Veo/Gemini stack — the *direction*
is proven, the exact register *fragments* still need the real A/B-on-Veo
validation before they touch a tuned prompt.

## Next steps

1. Build the **capture schema** (analyze_video.py `believability` block +
   `source_realism_verdict`). Safe — no tuned-prompt change.
2. Add "Believability & Source-Authenticity" rows to the viral-autopsy entry
   template; seed the P11+ pattern family (surface-tagged).
3. Establish the **avatar baseline + consistency** (identity-lock) before any
   fragment A/B.
4. Only then: per-fragment **Gated Proposals** through the validation loop.
