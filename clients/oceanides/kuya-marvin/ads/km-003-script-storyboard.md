# KM-003-AD — Script + Storyboard (for Neil approval)

**Chain:** CMO+CD brief (`km-003-brief.md`) → Sol draft (2026-07-25, Codex CLI) →
Claude QA vs formula → **NEIL GATE (this doc)** → plates (marvin-avatar) → clips
(veo-produce) → audio → overlays → edit → VERIFIER → publish.
**Format:** `kinetic-vsl-compressed` · **Awareness:** `problem_aware` ·
**Derived from:** OP2 (still ACTIVE 129d; vault `ksi_019f94f0…`).

## Script (Sol draft + QA fixes applied — Sol original preserved below)

```
hook1: Ilarawan ko ang banyo nyo ha. Sabihin nyo kung tama ako.
hook2: Hindi barado ang inodoro nyo. Puno na.
```

| # | Beat | Spoken / VO | Words |
| --- | --- | --- | --- |
| s1 | HOOK (talking) | *(hook1 o hook2)* | 11 / 7 |
| s2 | AGITATE (VO, hands-only) | Mabagal ang flush. Umaangat o bumabalik ang tubig. Tapos, may amoy lalo sa gabi. | 14 |
| s3 | EPIPHANY (talking) | Ang totoo, hindi yan barado. Puno na ang tangke. At ang mas delikado: kung sino-sino ang tatawagin nyo. | 18 |
| s4 | SOLUTION (talking) | Ang proseso namin: chine-check muna namin ang tangke nang libre, tapos sasabihin namin ang presyo bago magsimula. | 17 |
| s5 | OBJECTION (talking) | Ganun lang kasimple. Kung hindi kayo payag sa presyo, aalis kami nang maayos. Walang dagdag, walang gulat. | 17 |
| s6 | CTA (spoken, end of s5 clip) | I-message nyo kami ngayon. Libre ang inspection. | 8 |
| s6 | END-CARD VO (clone TTS — name allowed HERE only) | Sabihin nyo lang, kay Kuya Marvin kayo. | — |

**On-screen text:**
- s1 OVERLAY (Hyperframes hook stack, y≈170–540): `Parang kilala ko` / `ang banyo nyo?`
- s2 WORD-CARDS (full-frame, 2.0s each, gold word bold): `Mabagal na FLUSH` ·
  `Tubig BUMABALIK` · `Amoy sa GABI`
- s4 TITLE-CARD (@~15s, hard cut in, 1.2s hold): `OCEANIDES` / `MALINAW BAGO MAGSIMULA`
- s6 END-CARD: `OCEANIDES` / `LIBRENG INSPECTION` / `I-MESSAGE NYO KAMI NGAYON`
  (+ numbers/contact — written only, never spoken)

**QA notes (Claude, vs formula):** s1 trimmed from Sol's 17-word version (3rd
sentence pre-announced s2; word-cards carry the "3 signs" structure visually —
Sol original: "…May tatlong warning signs kayong napapansin."). hook2 replaced
(Sol's drifted to scam-fear = solution_aware lane; A/B swaps s1 only, so the
variant must still flow into s2 symptoms — CMO Option B used verbatim). All
hard rules pass: no name s1–s5, no peso, no Malabanan, no apostrophe in
overlays, word budgets in range.

## Storyboard

| # | t (target) | Visual | Plate spec (marvin-avatar) | Veo/motion | Text layers | Audio |
| --- | --- | --- | --- | --- | --- | --- |
| s1 | 0.0–4.0 | Talking close-up, **eye-level**, jobsite gate + van hint sa likod (KM-002 s1 DNA) | close-up neutral, jobsite A, pre-crop 864×1536 | Veo Option B formula: FRAME 0 mid-syllable, dialogue-first, ONE slow push-in, END-CLEAN, EXPRESSION LOCK | Hook stack overlay ONLY — walang captions (lesson #4) | STS clip audio; music bed enters low |
| — | @4.0 | **Flash transition 0.07s** (1/3) | — | — | — | whoosh SFX |
| s2 | 4.0–10.0 | Hands-only: tank cover lift → hose sa drainage → panlabas na tubo (3 quick inserts OK) | hands-only, free framing, NO face | still + FFmpeg push-in (b-roll lane; Kling O1 gated pa) | 3 word-cards center-frame, 2.0s each; captions BEGIN (1–2 word chunks, speech-locked) | Clone TTS VO |
| s3 | 10.0–16.0 | Talking close-up, **slight-low**, tank area backdrop | close-up neutral, jobsite A, ibang angle | Veo Option B, slow push-in | Captions (face-safe y≈1267–1560); punch-in 10–15% sa "Puno na ang tangke" | STS |
| — | @~15.5 | **TITLE-CARD SLAM** — hard cut in (P3), 1.2s | Hyperframes (scaffold: endcard-motion-composition.html) | — | OCEANIDES / MALINAW BAGO MAGSIMULA | slam/pop SFX (flash 2/3) |
| s4 | 16.0–22.0 | Talking close-up, **eye-level**, tabi ng van (branding kita, hindi nakaharang) | close-up neutral, jobsite A | Veo Option B | Captions; gold emphasis sa "libre" at "bago magsimula" | STS |
| s5 | 22.0–28.0 | Talking close-up, **slight-high**, street/driveway side | close-up neutral, jobsite A | Veo Option B | Captions; punch-in sa "Walang dagdag" (flash 3/3 sa cut papasok) | STS; CTA line sa dulo ng clip |
| s6 | 28.0–31.0 | END CARD — reuse KM-002 `endcard-motion-1080x1920.mp4` composition, updated copy | Hyperframes | — | End-card text + contact | Clone TTS attribution VO; music out |

**Production notes:** 4 Veo clips (~$4) + hands-only inserts (stills + FFmpeg
motion, $0) + 2 Hyperframes comps ($0). Trims: speech end +0.25s; speedup
1.05–1.12x kung lumagpas sa ~31s. Transitions: flash ×3 MAX. Captions: IMPACT
grammar via `build-captions.mjs`, drawPlan constants as-is, 1–2 word chunks,
karaoke sa speech map (`silencedetect -30dB/0.3`). VERIFIER lahat bago kay Neil:
dead-air, caption-sync, cropdetect, text integrity + face-occlusion.

## Neil gate — open picks

1. **hook1 vs hook2** ang unang render (yung isa = cheap A/B, re-render s1 lang, ~$1).
2. Proof numbers (taon/bahay/trak) — wala sa script ngayon by design (no fake
   stats); kung may ibibigay ka, may puwang sa s4 line rewrite o end card.
3. GO para sa plates (marvin-avatar, jobsite A set, 4 talking angles + hands-only set).
