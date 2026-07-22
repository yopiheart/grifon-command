# Hyperframes (HeyGen) — Evaluation Decision

**Status:** DECIDED 2026-07-22 (Neil-approved) — workflow-layer pilot endorsed, product adoption rejected.
**Deciders:** Neil + Claude (Fable 5) + GPT 5.6 Sol (consulted per Neil's request; full memo re-derivable — Sol independently read `omniPresets.ts`, `vercel.json`, the 2026-06-08 burn-in handoff, and Hyperframes' own Vercel template + rendering docs).
**Subject:** [github.com/heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) — Apache 2.0, LLM writes plain HTML/CSS/JS with `data-*` timing attributes; deterministic engine (headless Chrome + FFmpeg) freezes the clock, seeks frame-by-frame, screenshots, encodes MP4. `npx hyperframes init/preview/render`, Node 22+, ships ~19 agent skills, exports **transparent overlays**.

---

## The verdict

| Surface | Decision |
|---|---|
| Product FINAL_RENDER (`api/_lib/renderFfmpeg.ts`) | **NO — frozen.** Tuned + shipped; browser rendering doesn't fit the Vercel lambda (Hyperframes' own Vercel template provisions Vercel Sandbox; their ~11s example ≈ 2 min on 4 vCPUs / 3 Chrome workers; our route is capped at 300s). Also a security wall: LLM-authored HTML/JS in a multi-tenant renderer = executable untrusted content (SSRF, runaway compute). |
| FFmpeg caption engine | **NO — do not reopen** the 2026-06-08 burn-in-over-Remotion decision. The caption system is not just a font renderer (forced-aligned timing, face-safe bands, SFX restraint, loudnorm, fallbacks). |
| Neil's own marketing production (`ai-editor` skill lane) | **YES — pilot.** Sol score: product 1/5, workflow pilot 4/5. Same "HTML as the text/graphics layer" pattern already validated in-repo for stills (`utils/captureToPng.ts` / ImageAdsGen, `tools/render-social.mjs`), extended to motion. |
| Gemini Omni Flash edits | **NOT obsolete — narrowed.** Omni keeps generative-pixel work only (restyle, relight, subject-aware motion, paper-collage). Browser-shaped work (kinetic typography, UI cards, editorial inserts, behind-subject matted captions) is contestable by Hyperframes for free — Omni must earn every paid $0.10/sec. `premium-reel-v2` + `vox-explainer-v1` are the most at-risk presets; test, don't assume. |

Swipe-file evidence backing the workflow fit: **S20 Product-UI-as-hero** (20 corroborations) and **P11 UI pop-up card proof device** are exactly browser-shaped graphics; the stalled `creator-ui-pop-v1` Omni draft (gate-failed on hex leak) is deterministic and free in HTML.

## Pilot plan (not started — no code/install yet)

1. **Move 1 — one real launch/demo video** through the `ai-editor` lane: product-UI-as-hero sequence, exact pricing/offer graphics, one talking-head treatment. Hyperframes renders visual layers → existing FFmpeg layer finishes audio/captions/master (transparent-overlay handoff; FFmpeg keeps final authority).
2. **Move 2 — three-way bake-off** on one 6–8s talking clip: Omni `premium-reel-v2` vs Hyperframes (matted behind-subject type + punch-ins, via their embedded-captions skill) vs FFmpeg baseline. Log per-move ownership verdicts into `workflows/omni_edit_presets.md`.
3. **Move 3 — reusable alpha-motion kit** (UI-card reveal, stat hit, lower third, non-text transition) authored in Hyperframes, consumed as transparent assets by FFmpeg — same pattern as the existing `sweep.png`. **No prices/₱/captions in the kit.** This is the ONLY path by which Hyperframes output may ever (indirectly) reach the product — as static assets, never as a runtime.

**Pass criteria (Move 1) / stop condition:** must beat the current process on finished-video quality, revision count, exact-text integrity, and total founder time — "it rendered" is not a pass. If Move 1 fails these, **drop Hyperframes entirely.**

## Guardrails & traps

- **Name collision:** `workflows/believability_dna.md` uses "hyperframes" as an internal Surface-A caption/motion element — unrelated to HeyGen. Before adoption, rename ours or add an UBIQUITOUS_LANGUAGE disambiguation entry.
- **Defreezer friction:** matting pulls ~168 MB of model weights; tooling leans Bash/`uvx`; fast-moving 0.x dependency. If the pilot passes, add `scripts/restore-hyperframes.ps1` (restore-codex pattern) before relying on it.
- **One design system:** any motion kit consumes DESIGN.md tokens (Grifon Gold `#FFCC00`, zinc-950, Inter Black). `components/ui/motionTokens.ts` stays app-UI-only per its own guardrail.
- **Roadmap note:** if the parked "Remotion Lambda final-render executor" (post_beta_roadmap §10) ever revives, Hyperframes supersedes Remotion as the candidate (plain HTML > framework-specific React for LLM authoring).

## Move 2 — bake-off round 1 (2026-07-22, PENDING NEIL EYEBALL)

**Setup:** Same 4.0s skincare raw clip (`workflows/assets/omni-poc/skincare-raw-talking.mp4`,
the clip premium-reel-v2's approved round used). Lane A = committed Omni approved sample.
Lane B = Hyperframes v0.7.68 local render (Chrome headless + FFmpeg, cafe PC, 1 GB free RAM,
2 workers). Lane C = raw control. **Omni spend this round: $0.00** (Lane A reused the
committed approved sample). Eval-gate Gemini calls: 1× analyze_video + 2× render_audit
(cents). Hyperframes iterations: 3 renders × ~37s each, $0.

**Lane B treatment (deterministic translation of the premium-reel-v2 signature):** layered
gold `#FFCC00` THIRSTY (Inter 900 italic, dark stroke + shadow per swipe P2 outline-not-box),
blurred white echo layer behind, pop at 1.20s (silencedetect-timed to the spoken word),
felt punch-in 1.02→1.09 power2.out with visible easing, 3 water-droplet glow accents,
exit at 3.12s. Composition: `workflows/assets/hyperframes-bakeoff/composition-index.html`.

**Machine gates (Lane B): ALL PASS.**
- Blind believability (`analyze_video.py`, analyzer not told what the file is):
  `real-human`, "perfect lip-sync" — parity with raw baseline (by construction; footage
  pixels untouched). Note: the autopsy-schema validator exited non-zero on unrelated
  sections (4s clip vs viral-autopsy schema strictness); the believability block is clean.
- Text integrity (`render_audit.mjs`): first render FAILED — the oversized echo layer's
  trailing ghost "Y" read as "THIRSTYY" at 1.75s. Fixed with one CSS line (blur the echo
  into a glow), re-rendered in 37s, re-audit clean: single letter-perfect THIRSTY,
  `covers_face: false`, no band/box. **This is the lane thesis in one incident: a text
  defect that would have been a $0.40 stochastic Omni re-roll was a deterministic
  1-line/37-second fix.**
- Hyperframes' own `check` gate caught 4 real authoring errors pre-render (GSAP/CSS
  transform conflict, nested-timed-media freeze, track overlap) — the contrast pass runs
  with the echo layer as a documented decorative exception (hero word passes 3:1).

**Practical numbers:** render = 96 frames @1080×1920/24fps in ~37s local; setup from
zero (Chrome shell + FFmpeg full build + scaffold) ≈ 10 min on the cafe PC. Friction
confirmed: whisper-cpp not installed (timed the word via FFmpeg silencedetect instead);
Node 24 fine; low RAM fine at 2 workers.

**Evidence (committed):** `workflows/assets/hyperframes-bakeoff/` — 720p sample of Lane B,
3-lane comparison sheet (RAW / OMNI / HYPERFRAMES × 0.3s/1.5s/2.2s/3.0s), and the
composition HTML. Full-res lanes staged for eyeball at `.tmp/hyperframes-bakeoff/`
(disposable; re-render via the committed composition if wiped).

**NEIL EYEBALL: PASS (2026-07-22).** Verbatim: *"Wow ang galing bro :) sakto ung timing
and premium feel din tapos libre? Perfect to lalo sa mga content/ads ng grifon and
oceanides :) Yes masasabi kong kaya nyang mag compete dun sa omni premium reel na
typography. Ang wala lang ung parang emoji or graphics na lumalabas sa pisngi nung babae
na nag dedefine ng sinasabe sa script. Anyways di naman ganun ka big deal."*

**Round 1 outcome:** Hyperframes lane VALIDATED for workflow-layer deterministic
typography (competes with premium-reel-v2's signature at $0). Noted gap: speech-matched
face-adjacent illustrative graphics (the circled-icon device in Omni's version) — absent
from round 1's treatment but fully buildable deterministically (icon pop-ins at
silencedetect/transcript-timed positions); queued as a round-2 iteration, not a lane
limitation.

**Per-move ownership after round 1 (workflow layer ONLY — the product's shipped
`OMNI_STYLE_ROUTING` presets are untouched; Hyperframes never enters the product
runtime, see verdict table):**
- Kinetic display typography (directed words, layered type) → **Hyperframes** ($0,
  letter-perfect, iterable)
- Punch-ins / camera-feel zooms on locked-off footage → **Hyperframes or FFmpeg** (both
  deterministic; Hyperframes easier to art-direct)
- Speech-matched illustrative icons/graphics → **Hyperframes** (pending round-2 demo)
- Generative-pixel work (restyle, relight, subject-aware motion, paper-collage) →
  **Omni keeps** — must earn every paid second
- Critical text (prices, ₱, offers, captions, end cards) → **FFmpeg, unchanged**

Move 1 (launch video) is UNLOCKED.

**Round 2 (2026-07-22, same session) — speech-matched icon badges, PENDING NEIL EYEBALL.**
Closed the gap Neil flagged in round 1: circled icon badges pop face-adjacent, timed to
the script — moon on "pagod" (0.52s), water droplet on "thirsty" (1.38s), gold sparkle on
"skin mo" (2.28s). Pure SVG iconography (no letterforms, by design — text-gate safe),
badges live inside the camera rig so they travel with the punch-in. Hyperframes `check`
caught 1 error + 1 warning pre-render (exit fades need `tl.set` hard kills at clip
boundaries for seek determinism; tween overlap) — both fixed in one pass. Text gate:
PASS (single letter-perfect THIRSTY, icons not misread as text, `covers_face: false`).
Cost: $0; ~3 minutes wall-clock from request to rendered output. Evidence:
`lane-b-round2-720p-sample.mp4` + `round2-badges-strip.jpg` in
`workflows/assets/hyperframes-bakeoff/`; full-res at `.tmp/hyperframes-bakeoff/`.

**NEIL EYEBALL round 2: PASS (2026-07-22).** Verbatim: *"Alright, okay na yan bro."* —
same message green-lit Move 1 (launch video) + the defreezer restore script
(`scripts/restore-hyperframes.ps1`).

## Move 1 — Grifon launch video v1 (2026-07-22, PENDING NEIL EYEBALL)

**Built same session, $0, ~1 hr wall-clock including site capture.** 20s · 9:16 ·
1080×1920/24fps · music-led (no VO — TEMU-grammar P16, validated pattern).

- **Structure:** Hook "GASTOS KA ₱30K/MO SA AGENCY?" (P7 frame-1 text) → pain cards
  (3 DAYS / ₱5,000-per-video, both site-canonical claims) → "MEET GRIFON." → 3 live-site
  screenshot cards with pans + gold chips (S20 Product-UI-as-hero; captured from
  grifon.ai via `hyperframes capture` — 17 shots, 10 sections) → offer "₱997/MO · 30
  MINUTES. Not 3 days. · FIRST AD — FREE" → CTA (griffin emblem + GRIFON.AI + site's own
  button copy "CREATE MY FIRST AD — FREE").
- **Design:** DESIGN.md world — zinc-950, Grifon Gold #FFCC00, Inter 900 + Instrument
  Serif italic accents (matches the live site), JetBrains Mono `// chips`.
- **Audio:** repo bed `api/_lib/assets/music/mrbeast.mp3`, FFmpeg finishing (fades +
  loudnorm −14 LUFS) — division of labor per the verdict table.
- **Gates:** `check` clean (1st pass); text audit letter-perfect on ALL prices/CTA
  (₱30K/MO, ₱5,000, ₱997/MO, GRIFON.AI, CREATE MY FIRST AD — FREE). Iterations: 2
  (v1 portrait cards were wrong for landscape screenshots → v2 landscape cards +
  price-size fix; ~50s per re-render, 1 worker on low RAM).
- **Evidence (committed):** `workflows/assets/grifon-launch-video/` — 720p sample,
  composition HTML, the 3 site screenshots it needs, scene strip. Full-res master:
  `.tmp/hyperframes-bakeoff/GRIFON-LAUNCH-v1.mp4` (re-render via composition if wiped;
  emblem/logo referenced from `public/`).
- **Iteration hooks for Neil:** copy/wording, scene lengths, music choice
  (temu/testimonial beds available), VO pass (ElevenLabs) — all cheap deterministic
  edits.

## Resume trigger

Next session on this: invoke `/ai-editor`, re-read this file. If Move 2 round 1 above is
still PENDING NEIL EYEBALL, present `.tmp/hyperframes-bakeoff/` (or re-render from the
committed composition) and record his verdict. After a passing verdict: Move 1 (launch
video). Install is `npx hyperframes init` in a scratch dir — do NOT add it to the product
`package.json`.
