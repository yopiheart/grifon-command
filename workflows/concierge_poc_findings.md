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

---

# V2 — Scene-1 re-render with the REAL Taglish hook (2026-07-21)

Session resume: closed **gap #1** from the list above. The generic-words clip is
superseded — Scene 1 now speaks the real hook.

## What shipped

- **Hook locked (Neil, Checkpoint B):** Option A meta-reveal —
  *"Buong ad na to, ginawa ng AI. Pati yung mukha ko."* (CMO pass: proof-by-
  demonstration, Cialdini Social Proof, works on Unaware cold traffic; drafted
  under the Taglish voice spec + typography rules.)
- **New plate via the World Cup formula** (`scene1-zam-v2.png`, PASSED Neil
  eyeball): dual anchor (`zam-face-reference.jpg` primary +
  `zam-approved-scene-reference.png`), eyes-open rule, hair-silhouette lock,
  explicit warm-brown skin tone, raw-ugc register, strong-prior location
  (bedroom creator corner). Anchors restored from Neil's committed
  `generate-zam-images.zip` (extracted to the skill's `assets/`, still
  NOT committed individually per the identity-data rule).
- **Gemini comparison** (`scene1-zam-gemini.png`): exact TUNED Director AI
  scene payload (IDENTITY_LOCK + MEDIUM_FRONTAL + Aspirational-UGC + NO_TEXT,
  `gemini-3.1-flash-lite-image`, single avatar ref) replicated via direct SDK
  call — zero tuned-file edits. Verdict (Neil): **"Mas okay talaga ung World
  Cup"** — consistent with the 2026-07-16 shootout + register mapping (tuned
  Gemini formula targets *aspirational/polished* UGC by design; World Cup
  targets *raw* believability).
- **Veo 3.1 Fast re-render** (`scene1-v2-veo.mp4`): plate as start frame, hook
  baked as quoted dialogue per the tuned OPTION B pattern (frame-0
  mid-syllable, 35mm gentle push-in, stable background), 6s / 9:16 / 720p,
  ~40s render.
- **STS + mux** (`scene1-v2-final.mp4`): ElevenLabs Voice Changer
  (`eleven_multilingual_sts_v2`, natural settings, Zam voiceId
  `7zOl6q4ddocCWzFMrbcr`) on the Veo clip, muxed `-c:v copy` — lip-sync
  preserved.

## Scripts now committed (defreezer lesson applied)

The v1 scratchpad scripts died with the reboot; the v2 harnesses live in
[`concierge_poc/scripts/`](concierge_poc/scripts/): `render-scene1-v2.mjs`
(direct Veo submit+poll), `sts-scene1-v2.mjs` (STS + ffmpeg-static mux),
`gen-gemini-scene1.mjs` (tuned-formula comparison harness). All read keys from
`.env`; direct `@google/genai` SDK calls (equivalent to the pure proxies).

## Remaining gaps (unchanged from v1 list)

- Neil ear/eyeball on `scene1-v2-final.mp4`: did Veo pronounce the Taglish
  line cleanly, and does identity hold in motion?
- Demo beats 3–5 (real Grifon screenshots), Phase 6 CaptionHeadline,
  gemini-eval grade.

---

# V3 — BGC walking scene + the STEADY-FACE RULE (2026-07-21, same session)

## NEW RULE (Neil, verbatim intent): steady face while talking

Neil's diagnosis after eyeballing V2 motion: **multiple changing facial
emotions/reactions during speech are a major red flag that destroys character
consistency** — the face drifts identity with every expression shift. The V2
Veo prompt itself caused this (it choreographed "half-smile builds → eyebrow
raise → head tilt" micro-expressions).

**Rule for ALL future Zam (and any avatar) talking renders:**
- ONE locked facial state for the entire clip — no smile changes, no eyebrow
  raises, no head tilts, no reaction beats. Only the mouth moves (speech) +
  natural blinks.
- ALL expressiveness lives in the body: hand gestures, walking rhythm, posture.
- Bake it into the Veo prompt explicitly as a CRITICAL FACIAL DISCIPLINE block
  + negative tail ("face warping, identity change, changing facial features").

NOTE: the TUNED OPTION B video-prompt rules in `services/geminiService.ts`
say "Performance & Micro-expressions: Describe facial tension, eye movement,
and mouth shapes" — per this rule that guidance is now suspect for identity
consistency, but it is a TUNED file: flagged here as a gated-proposal
candidate, NOT edited.

## The walking test (closes "can Zam hold identity in motion outdoors")

- Plate: `scene-walk-bgc-zam.png` (PASSED Neil) — World Cup dual-anchor,
  BGC sidewalk selfie-vlog framing, extended right arm in frame, free left
  hand mid-gesture, steady neutral-warm expression baked at plate level.
- Veo: `scene-walk-bgc-veo.mp4` — same hook line as V2 (apples-to-apples),
  walking sway smooth, CRITICAL FACIAL DISCIPLINE block in prompt, 6s/9:16/720p.
- Final: `scene-walk-bgc-final.mp4` — STS to Zam voice + `-c:v copy` mux.
- Scripts: `scripts/render-walk-bgc.mjs`, `scripts/sts-walk-bgc.mjs`.

Pending: Neil ear/eyeball verdict on the walking clip (face steadiness +
identity hold + Taglish pronunciation).

---

# V4 — Motion-believability battery: Zam vs Marvin vs auto-cast (2026-07-21, same session)

## Verdicts na pumasok (Neil eyeball/ear, the only valid grader)

- **Zam STS voice + lip-sync: WORKING at accurate** (desk V2 + walking takes).
- **Zam in motion: mukhang AI** kahit take-2 hardened prompt (tumawa pa rin sa take 1;
  take 2 AI-looking). Pero yung plate STILL ay "realistically siya talaga."
- **Marvin walking clip (Veo 3.1 LITE + close-up + expression lock): 100% REALISTIC
  sa image AT video** — "ultra real kahit gawing content hindi mahahalatang AI."

## ROOT CAUSE (Neil diagnosis, corroborated ng repo history): IMAGE SOURCE REFERENCE QUALITY

Si Marvin: 5 RAW phone-photo refs (body master + 4 face angles). Si Zam: iisang
makinis/"studio selfie" na face ref — ang kinis/preset ng source ay BINIBITBIT ng
model papunta sa motion. **LESSON: ang identity source refs ay dapat Marvin-grade —
raw phone photos, multiple camera angles, walang filter/preset.** Ito rin mismo ang
naka-pending na next step sa ZAM-AVATAR-NOTES.md since 2026-06-27 ("Zam to send 3–5
reference angles") — hindi pa nangyayari; ngayon may motion-believability na dahilan,
hindi lang drift-tightening.

## Validated motion recipe (mula sa Marvin lane, gumana sa BGC test)

**Veo 3.1 LITE** (`veo-3.1-lite-generate-preview`, raw beats polished) + **CLOSE-UP
framing** (mukha pumupuno sa frame, top-of-head→upper chest — ang malayong framing ang
nagpapalitaw ng AI slop sa motion) + **EXPRESSION LOCK** (skill wording) + **HAND RULE**
(camera hand LOCKED, free hand lang ang gumagalaw) + flat overcast light.

## Auto-cast head-to-head (Test A vs Test B — full-AI UGC, walang character consistency)

Setup: parehong "20s Filipina office employee sa BGC, walking selfie, left hand
gestures, emotions ALLOWED", parehong Veo 3.1 Lite ang motion lane, same line.

- **Test A — tuned Director AI formula sa `gemini-3.1-flash-lite-image` (NO ref):**
  `autocast-gemini-v2.png` → `autocast-gemini-veo.mp4`. Neil sa plate: "ang gara."
  - **v1 FAILURE:** tuned HIGH_ANGLE_SELFIE angle lang → THIRD-PERSON shot na kita ang
    phone (object-logic bug) + masyadong malayo. **FIX na nag-work:** explicit
    first-person block ("this image IS the front camera view; phone NEVER visible;
    fill frame top-of-head→chest"). GATED-PROPOSAL CANDIDATE para sa
    AVATAR_CAMERA_ANGLES/tuned formula — HINDI ginalaw ang tuned file.
  - Observation: nakalusot ang readable na "Mind Museum" signage sa background kahit
    may NO_TEXT_CONSTRAINT (Gemini-lane text-leak, dating na-obserbahan sa scaffold test).
- **Test B — World Cup scaffold sa gpt-image-2, TEXT-ONLY (NO ref):**
  `autocast-worldcup.png` → `autocast-worldcup-veo.mp4`. Scaffold DNA buo: sweat
  shine, gusot na polo, nakabaliktad na ID lanyard, delivery rider, kalat sa planter.
- Pending: Neil video verdicts sa dalawang autocast clips (alin ang di halatang AI
  sa motion, ano ang limitations ng full-AI vs reference-anchored).

## Assets/scripts dito sa commit na ito

marvin-walk-bgc.png/.mp4 · scene-walk-bgc-veo-take2 + final-take2 (laughed/AI takes,
evidence) · autocast-gemini(.png/-v2.png/-veo.mp4) · autocast-worldcup(.png/-veo.mp4) ·
scripts: render-walk-bgc-take2 / render-marvin-walk / gen-gemini-autocast-v2 /
render-autocast-pair.

## V4 FINAL VERDICT (Neil, 2026-07-21) — the auto-cast vs upload answer

Neil eyeball sa autocast A/B videos: **"Mas maganda at mukhang realistic pa ung AI
generated auto mode vs sa upload reference presenter"** — BOTH lanes (gpt-image-2
World Cup AND gemini flash-lite tuned formula) ay mukhang real sa motion pag
auto-cast. Marvin (raw-ref-anchored) realistic pa rin pero talo ng automode sa
head-to-head. Zam (makinis na single ref) ang pinaka-mahina.

**Motion-believability hierarchy (evidence-based):**
1. AUTO-CAST (no reference) — pinaka-believable; the model animates a face it
   invented, walang identity debt.
2. Reference-anchored + RAW multi-angle refs (Marvin) — realistic pa rin; ang
   presyo ng consistency ay maliit KUNG raw ang refs.
3. Reference-anchored + polished/preset ref (Zam) — AI-looking sa motion; ang
   kinis ng source ang bumibitbit.

**PRODUCT ANSWER sa §10 open decision (auto-cast vs upload):** auto-cast ang
tamang default ng Concierge/One-Shot (validates the existing One-Shot AUTO
default). Presenter-upload ay Business-tier lane para sa personal brands, na may
REQUIREMENT: Marvin-grade raw ref set (body master + 3-4 face angles, real phone
photos, walang filter) — onboarding SOP candidate. Reference = bayad na
believability; gamitin lang pag kailangan ng cross-scene/brand consistency.
