# KM-003 Brief — "Ilarawan Ko" (kinetic-VSL-compressed, 30s)

**Status:** CMO brief drafted 2026-07-25 — for CD visual pass → Neil approval →
Sol script draft → pipeline per `.claude/skills/kuya-marvin-ads/SKILL.md`.
**Derived from:** OP2 (One Peak "Format Finder" kinetic VSL, FB Ad Library
779064774935809, **still ACTIVE 129 days** — ground-truthed 2026-07-25, see
`workflows/viral_swipe_file.md`). Vault: `ksi_019f94f0-e46d-7b60-b2d4-4d4d3826d58b`.

## Strategy (CMO)

- **Awareness:** `problem_aware` (complements KM-002-AD's `solution_aware` —
  batch-mix rule). Diagnostic-callout hook = OP2's proven self-identification
  mechanic (Commitment/Consistency micro-yes). Emergency-purchase caveat: this
  converts symptom-active households; recall play for the rest.
- **Sophistication:** vs the "mura! mabilis!" swarm — identity + mechanism
  (Kuya Marvin himself + transparent process), never louder claims.
- **Key OP2 ground-truth insight applied:** kinetic feel = 0.4s caption churn +
  word-cards + motion, NOT cut count (shots median 5.5s; P1, 11×). All kinetic
  layers are FFmpeg/Hyperframes = $0 deterministic. 4 Veo talking clips only.

## Beat map (30s target after trims)

| t | Beat | Line intent (word budget) | Visual / layer |
| --- | --- | --- | --- |
| 0–3 | HOOK | hook1/hook2/hook3 below (≤10 words) | Veo talking close-up, eye-level; overlay text ONLY, no captions (lesson #4) |
| 3–9 | AGITATE | 3 symptoms, ~14 words VO | hands-only b-roll (tank cover / drainage), clone TTS VO; captions begin; Hyperframes solo word-cards: `MABAGAL` → `UMAANGAT` → `AMOY` (gold keyword, ~2s each) |
| 9–15 | EPIPHANY | "hindi barado — puno na; at delikado ang basta-basta tatawagin" (~16 words) | Veo talking close-up, slight low |
| 15–21 | SOLUTION | Oceanides **title-card slam @15s** (P9 slam, 50% mark) + libreng inspection mechanism (~16 words) | Veo talking close-up + Hyperframes card |
| 21–26 | OBJECTION | presyo-takot kill — KM-002 DNA reuse: presyo bago magsimula, walang dagdag (~14 words) | Veo talking close-up, slight high |
| 26–30 | CTA | "I-message nyo kami ngayon. Libre ang inspection." | end card (Hyperframes motion), attribution VO = clone TTS (RAI lesson #1); numbers written on card only |

## Hooks (Neil picks; A recommended)

- **A (85%):** "Ilarawan ko ang banyo nyo ha. Sabihin nyo kung tama ako." —
  OP2 mechanic, Commitment/Consistency micro-yes.
- **B:** "Hindi barado ang inodoro nyo. Puno na." — contrarian named-pain.
- **C:** "Yung amoy na yan sa banyo? Hindi abala. Warning." — sensory pattern
  interrupt (risk: Meta negative-sensory flag; narrower callout).

## Kinetic layer spec (all $0 deterministic)

- Captions: FFmpeg IMPACT grammar via `build-captions.mjs`, 1–3 word chunks,
  white + gold emphasis on symptom/benefit words, face-safe zones (skill rule).
- Word-cards + title-card slam + end card: Hyperframes compositions (committed
  per KM-002 pattern); per-LINE centering (lesson #5), no fallback fonts (#6).
- Motion: Veo slow push-in per Option B formula (FRAME 0 RULE, END-CLEAN);
  FFmpeg 10–15% punch-ins at beat pivots; flash transition after hook +
  every 2nd cut max 3 (lesson #7).
- Speedup 1.05–1.12x if pace drags (PACING fix #5).

## Open items (Neil)

1. **Proof numbers — REQUIRED before Sol drafts the proof line:** years in
   service / households served / trucks. NO fake stats; if none provided, proof
   beat falls back to mechanism transparency only (weaker, honest).
2. Hook pick (A/B/C) or edit.
3. Approve `kinetic-vsl-compressed` as a new format tag in script-pool `ads`.

## CD visual pass (2026-07-25)

- **Location variety = backdrop variety, ONE jobsite:** s1 gate+van hint
  (KM-002 s1 DNA) · s3 tank area slight-low · s4 beside van eye-level ·
  s5 street/driveway slight-high. Side-angle talking NOT in this ad (gated,
  separate test). Hands-only s2 = free framing.
- **Caption churn CORRECTION:** 0.4s OP2 churn is dishonest at our 2.2 w/s
  budget — churn follows SPEECH. Use **1–2 word chunks** (not 1–3) for a
  natural ~0.5–0.9s effective swap, locked to the speech map (VERIFIER
  caption-sync must pass).
- **Hyperframes specs:** hook stack y≈170–540, per-LINE centered, no
  fallback-font families; symptom word-cards full-frame center (no face in
  b-roll), ~78% viewport width, one gold-accent word each, 2.0s, GSAP pop
  (scale 0.92→1.0, 120ms); title-card slam @15s = hard cut in (P3), 1.2s hold,
  0.07s flash (1 of max 3); scaffold from `endcard-motion-composition.html`.
  Palette: inherit `build-captions.mjs` drawPlan constants exactly — no new
  hexes.
- **Camera:** NO handheld in Veo prompts (formula law) — kinetic energy comes
  from FFmpeg punch-ins 10–15% at pivots + flash transitions + caption churn +
  word-cards (the OP2 ground-truth lesson itself).
- **Production notes:** pre-crop plates 864×1536 before Veo (letterbox lesson
  #2); end card reuses KM-002 `endcard-motion-1080x1920.mp4` composition.
- **Skill-update verdict:** kuya-marvin-ads SKILL.md NOT updated yet — lessons
  enter the skill AFTER KM-003 production proves/disproves the
  kinetic-compressed lane (receipts, not hypotheses).

## Guardrails carried

Never-Malabanan · no price spoken or in thumbnail · no name in Veo dialogue
(RAI) · TAGLISH ACCENT LOCK per `_shared/taglish-voice.md` · typography: no
apostrophe/em-dash in overlay text · face-safe text zones · AI label ON at
publish · log to `workflows/ad_performance_ledger.md` with `awareness` +
`format` tags.
