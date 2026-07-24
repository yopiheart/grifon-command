# KM-003-AD — Script + Storyboard (for Neil approval)

**Chain:** CMO+CD brief (`km-003-brief.md`) → Sol draft (2026-07-25, Codex CLI) →
Claude QA vs formula → **NEIL GATE (this doc)** → plates (marvin-avatar) → clips
(veo-produce) → audio → overlays → edit → VERIFIER → publish.
**Format:** `kinetic-vsl-compressed` · **Awareness:** `problem_aware` ·
**Derived from:** OP2 (still ACTIVE 129d; vault `ksi_019f94f0…`).

## Script v2 (Sol, 2026-07-25 — OP2 craft injected; v1 rejected ni Neil as
"kopya lang ng KM-002"; hook1 LOCKED ni Neil)

```
hook1 (LOCKED): Ilarawan ko ang banyo nyo ha. Sabihin nyo kung tama ako.
```

| # | Beat | Spoken / VO | Words |
| --- | --- | --- | --- |
| s1 | HOOK (talking) | Ilarawan ko ang banyo nyo ha. Sabihin nyo kung tama ako. | 11 |
| s2 | AGITATE micro-scene (VO, hands-only bathroom b-roll) | Nagbubuhos ka ng timba para lang bumaba, plunger nang plunger, libreng workout. Hay, bukas ko aayusin, sabay konsensya. | 18 |
| s3 | EPIPHANY + analogy (talking) | Kapag puno na ang tangke, timba at plunger, parang nagmo-mop habang umaapaw ang lababo. Delikado ring ipahawak sa kung sino-sino. | 20 |
| s4 | SOLUTION (talking, fresh mechanism wording) | Titingnan ang lagay ng tangke nang libre. Ipapakita ang buong singil bago simulan. Walang dagdag, puwede kayong humindi. | 18 |
| s5 | VOICED OBJECTION + CTA (talking) | Alam ko ang iniisip nyo: "Baka iba ang singil pagdating." Hindi dito. Message nyo kami para sa libreng inspection. | 19 |
| s6 | END-CARD VO (clone TTS — name allowed HERE only) + share-nudge | Ako si Kuya Marvin. Kung may kakilala kayong ganyan din ang banyo, i-send nyo ito sa kanya. | 17 |

**On-screen text (v2):**
- s1 OVERLAY (Hyperframes hook stack, y≈170–540): `TAMA BA AKO?`
- s2 WORD-CARDS (full-frame, 2.0s each, gold word bold): `TIMBA NA NAMAN` ·
  `PLUNGER ULIT` · `BUKAS NA LANG`
- s4 TITLE-CARD (@~15.5s, hard cut, 1.2s): `OCEANIDES` / `MALINAW BAGO
  MAGSIMULA` *(QA fix — Sol's v2 card dropped the brand + "BUONG SINGIL MUNA"
  was malabo; P9 slam is a BRAND card, v1 card restored)*
- s6 END-CARD: `BANYONG MABAGAL` / `LIBRENG INSPECTION` / `MESSAGE LANG`
  (+ numbers/contact — written only, never spoken)

**s2 b-roll CHANGED (v2):** bathroom hands-only inserts — (a) timba pour sa
toilet bowl, (b) plunger mid-plunge — first-person looking down, ordinary PH
home bathroom, tattoo/watch anchors per body master, walang mukha. Ito ang
banyo ng CUSTOMER (mundo ng viewer), hindi jobsite — sadyang ibang lugar.
Plates: `s2a-hands-timba-toilet.png`, `s2b-hands-plunger-toilet.png`.

**QA notes v2 (Claude):** lahat ng 5 One Peak craft moves present (micro-scene
+ guilt beat, analogy, voiced objection, kuya humor, share-nudge); zero
recycled KM-002 lines, mechanism intact sa sariwang wording; word budgets
11/18/20/18/19 pasok lahat; walang pangalan sa s1–s5; walang peso; walang
apostrophe sa on-screen text. V1 script archived sa git history (d421578).

## Storyboard

| # | t (target) | Visual | Plate spec (marvin-avatar) | Veo/motion | Text layers | Audio |
| --- | --- | --- | --- | --- | --- | --- |
| s1 | 0.0–4.0 | Talking close-up, **eye-level**, jobsite gate + van hint sa likod (KM-002 s1 DNA) | close-up neutral, jobsite A, pre-crop 864×1536 | Veo Option B formula: FRAME 0 mid-syllable, dialogue-first, ONE slow push-in, END-CLEAN, EXPRESSION LOCK | Hook stack overlay ONLY — walang captions (lesson #4) | STS clip audio; music bed enters low |
| — | @4.0 | **Flash transition 0.07s** (1/3) | — | — | — | whoosh SFX |
| s2 | 4.0–10.5 | **v2:** bathroom hands-only inserts — timba pour sa bowl → plunger mid-plunge (customer's bathroom, sadyang ibang lugar sa jobsite) | hands-only, free framing, NO face; tattoo/watch per body master | still + FFmpeg push-in (b-roll lane; Kling O1 gated pa) | 3 word-cards center-frame, 2.0s each; captions BEGIN (1–2 word chunks, speech-locked) | Clone TTS VO |
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
