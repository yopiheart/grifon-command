# KM-002 Pilot Ad — Shot Plan ("Gulatin sa presyo")

**Status:** DRAFT 2026-07-22 — plates in progress, hinihintay ang eyeball ni Neil per gate.
**Canonical script:** `clients/oceanides/kuya-marvin/script-pool.json` → **KM-002** (TRUST / solution_aware). Ito ay production breakdown LANG — kapag may script edit, sa pool muna bago dito.
**Recipe (lahat Gate-1 proven):** gpt-image-2 close-up plates (marvin-avatar skill) → `veo-3.1-lite-generate-preview` 1080×1920 (8s hard sa 1080p) + EXPRESSION LOCK → ElevenLabs STS sa Marvin voice clone (`jL41fXY8JXGEarmJ5g3f`) → edit (captions, stitch, AI label) via ai-editor.

## Format

- 9:16 vertical, 1080×1920, kabuuang ~52s
- Raw-ugc register: phone-selfie feel, jump cuts sa pagitan ng clips, burned-in captions
- Camera-distance rule: LAHAT ng talking clips ay CLOSE-UP (mukha pumupuno sa frame, ulo hanggang upper chest)
- Disclosure: Meta AI label ON bago i-publish

## Segments (6)

| # | Piraso | Linya (mula KM-002, verbatim) | Visual | Plate |
|---|---|---|---|---|
| 1 | HOOK (8s) | "Bakit ba takot tayong tumawag ng pasipsip? Kasi baka gulatin tayo sa presyo pagkatapos maghukay." | Talking close-up | A (van) |
| 2 | 8s | "Totoo yan, at tama lang na mag-ingat kayo. Kaya ganito ang ginagawa namin sa Oceanides:" | Talking close-up | A (van) |
| 3 | 8s | "Pupunta ako o ang team namin, chine-check muna namin ang tangke, libre yun." | Talking close-up | B (gate) |
| 4 | 8s | "Tapos sasabihin namin ang presyo BAGO kami magsimula. Walang dagdag pagkatapos, walang gulat." | Talking close-up | B (gate) |
| 5 | 8s | "Kapag hindi kayo pumayag sa presyo, aalis kami nang maayos. Ganun kasimple." | Talking close-up | C (street) |
| 6 | CTA (~12s) | FIXED CTA block mula sa pool `_cta` — VERBATIM, huwag i-reword (attribution key): "Kung ganyan na sa bahay nyo, LIBRE ang inspection, walang pilitan, at sasabihin namin ang presyo bago kami magsimula. Tawag lang: Globe 0917-671-6383 o Smart 0939-245-6217. Sabihin nyo, kay Kuya Marvin kayo." | END CARD (navy + gold #F5B301, Anton): numbers malaki + "Sabihin nyo: kay Kuya Marvin kayo" — VO ng Marvin clone (direct TTS), hindi talking avatar | — |

**Bakit end card ang CTA:** ang buong FIXED CTA ay ~14s — hindi kasya sa 8s Veo clip nang hindi rine-reword (bawal i-reword). Mas malakas din ang numbers na nakasulat nang malaki para sa direct response.

## Audio lane

1. Veo native audio ang nagsasalita ng linya per clip (Taglish, proven sa motion tests)
2. ElevenLabs **STS** per clip → boses ng totoong Marvin clone, preserved ang timing/lip-sync
3. Segment 6: ElevenLabs **TTS** ng FIXED CTA sa clone → patong sa end card
4. Phonetic normalization ng numbers sa TTS pass (zero-nine-one-seven... style) kung kailangan — test muna

## Plates (3, close-up neutral — kailangan NEUTRAL para sa expression lock)

| Plate | Eksena | Refs |
|---|---|---|
| A `plate-A-van` | Selfie sa tabi ng white cab + silver aluminum closed van (blurred sa likod ng balikat) | body master + front-neutral + **vehicle ref** (3rd edit, "do NOT turn into tanker") |
| B `plate-B-gate` | Selfie sa harap ng ordinaryong PH house fence/steel gate | body master + front-neutral |
| C `plate-C-street` | Selfie sa residential street, bahay/pader malabo sa likod | body master + front-neutral |

Specs: 1024×1536, flat overcast light, navy tee + light-blue accent, warm-tan skin clause, integration block, ban tail — buong recipe sa `.claude/skills/marvin-avatar/`.

## Eyeball gates (si Neil ang batas sa bawat isa)

1. ⬜ Shot plan approved
2. ⬜ Plates approved (bago ang anumang Veo spend)
3. ⬜ Veo clips approved (render → QA triage ng agent → Neil)
4. ⬜ STS voice pass approved (kapag first time, isang clip muna bago lahat)
5. ⬜ Final edit approved (captions + end card + AI label) → publish bilang organic sa FB page + ito rin ang unang ad creative sa ₱500/day

## Batch note

Kapag pasado ang pilot: KM-001, KM-008, KM-005 ang susunod (same recipe, mas mabilis na) — tapos ang unang 2-week Lane A batch.
