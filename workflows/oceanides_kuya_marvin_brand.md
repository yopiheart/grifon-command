# Kuya Marvin ng Oceanides — Personal Brand SOP

**Status:** PLANNED 2026-07-18 (grill-me + premortem with Neil; plan approved). Gate 1 pending — waiting on Marvin reference selfies + consent.
**Owner:** Neil (gates, payouts, final say) · agent (scripts, renders, QA) · Marvin (face + field clips)
**Sister docs:** [oceanides_daily_posts.md](oceanides_daily_posts.md) (distribution doctrine hard lines) · [oceanides_referrer_program.md](oceanides_referrer_program.md) (tracking sheet, GC) · [believability_dna.md](believability_dna.md) (register system, raw-first rule) · [believability-samples/ZAM-AVATAR-NOTES.md](believability-samples/ZAM-AVATAR-NOTES.md) (identity-lock pattern na ginagaya)

## The decision (2026-07-18, Neil + Marvin)

Personal brand para sa Oceanides: **"Kuya Marvin ng Oceanides"** — si Marvin Balaba, ang field inspector/closer (siya ang nagche-check ng tank bago ang serbisyo, kausap ng client sa site, kolektor, bantay ng crew — ang totoong trust moment ng business).

- **Goal:** mas maraming **booking calls** (local lead gen). Hindi fame. Ang personal brand ay trust-layer sa ibabaw ng 15 branch pages — ito ang pumapatay sa scam-fear ng avatar (Homeowner Henry/Helen, tingnan ang [../clients/oceanides/Oceanides market-research.md](../clients/oceanides/Oceanides%20market-research.md)).
- **Production: pure AI-generated.** Ayaw/hindi kaya ni Marvin ang on-cam delivery, pero payag siya sa mukha niya. Realistic AI avatar via ang existing believability system (reference-anchored identity + raw-ugc register + Veo 3.1 native audio + ElevenLabs STS) — parehong pattern ng kay Zam.
- **Disclosure: label-compliant.** Platform AI labels (TikTok AIGC label / Meta AI disclosure) sa realistic AI-human content. Never i-claim na live footage ang AI. Aamin kapag tinanong. Totoo ang tao, totoo ang serbisyo — production method lang ang AI.
- **Accounts: company-owned.** Bagong 1 TikTok + 1 FB Page, handle target `@kuyamarvin.oceanides`, credentials kay Neil/Oceanides. Ang "ng Oceanides" sa pangalan ang nagdadaloy ng equity sa company. Ang 15 branch pages ang re-sharer.
- **Persona:** "Kuya Marvin" — ang kapitbahay na expert na hindi ka lolokohin (Cialdini: Liking + Unity + Authority). Premium Taglish, hindi malalim, hindi street.

**Premortem failure modes (Neil, 2026-07-18):** (1) halatang AI, walang naniwala; (2) views pero zero bookings. Ang dalawang hard gates sa ibaba ang direktang sagot — hindi sila nego.

## HARD GATE 1 — Believability (bago ang LAHAT)

**Walang account creation, walang launch, hangga't hindi pasado ang avatar sa MOTION.** (Ang Zam Veo motion test ay hindi pa tapos — unproven pa in-house ang talking-avatar lane. Stills are not an avatar.)

1. **Reference selfies + consent.** Neil kukuha kay Marvin ng 3–5 angles (front / 3-quarter / profile / smiling) + simpleng nakasulat na consent: mukha + pangalan, company-owned accounts, kasama kung ano ang mangyayari sa content kapag naghiwalay ng landas. → i-commit sa `clients/oceanides/kuya-marvin/refs/` (private repo lang, never sa mirror).
2. **Identity-lock still set** via codex-image `--edit` (Zam pattern): **raw-ugc register LANG** (trust winner — never cinematic para dito). Target ≥90% identity hold across 4+ scenes/angles.
3. **ONE Veo 3.1 talking test** — maikling Taglish education line, RAW/ungraded, 1080×1920, maikling shot (artifacts compound over duration). Grade: `render_qa.mjs` + mata ni Neil.
4. **GO:** pasado sa motion → unlock ang Lane A (talking avatar). Finishing lang pagkatapos: captions + UGC LUT + fast cuts (believability_dna sequencing rule — LUT is step 3, not step 1).
   **NO-GO:** hindi pasado → **fallback format, buhay pa rin ang brand:** totoong jobsite footage + ElevenLabs Taglish VO ("boses ni Kuya Marvin") + identity-locked stills — walang talking avatar. Si Marvin ay nasa field araw-araw; 30-sec phone clips ng tangke/trabaho ang raw material — hindi siya kailangang magsalita sa camera.

**Gate 1 result:** _(pending — in progress)_

**Gate 1 progress log:**

- **2026-07-19 — identity-lock v1 (5 raw-ugc stills, face-refs only): PARTIAL FAIL kay Neil.** lock-1 (yard selfie) at lock-5 (smiling close) okay; lock-2/3/4 "parang kinabit ang ulo" — pasted-face look. **Root cause:** face-only reference set → ini-imbento ng model ang katawan, tapos idinidikit ang sharp na mukha (mismatch sa light/texture/sharpness). Chest-up frames lang ang ligtas sa face-only refs.
- **2026-07-19 — GPT 5.6 Sol skill reviewed + adapted.** Si Neil nag-open ng pasted-face issue kay GPT 5.6 Sol (2026-07-18 gabi); ang gawa nitong `generate-marvin-oceanides-images` skill (zip archived sa `clients/oceanides/kuya-marvin/`) ay na-review at na-adapt sa **`.claude/skills/marvin-avatar/`** — ito na ang MANDATORY recipe sa bawat Marvin still. Core fix: `marvin-ref-5-body-master.jpg` (bagong ref, totoong katawan ni Marvin — kasama ang totoong forearm tattoo + wrist watch) na kasama sa BAWAT generation + integration block (face no sharper than body, tuloy-tuloy na jaw–neck–collar). Adaptation deltas vs Sol: tinanggal ang "Malabanan" (hard rule), positional na ang tattoo/watch phrasing (mirror-confusion risk sa left/right), selfie framing pinayagan sa chest-up plates lang, at naka-park na open question ang #38B6FF wardrobe accent (SOP: navy + gold).
- **2026-07-19 — identity-lock v2 regen (body-master recipe):** lock-2b + lock-3b pasado sa agent triage (integrated na, consistent tattoo/watch); lock-4b unang roll REJECTED sa QA gate (tattoo sa dalawang braso — dapat isa lang), retried with targeted correction. Prompts preserved sa `identity-lock/manifest.json` (v1) + `manifest-v2.json`.
- **2026-07-19 — Neil eyeball ng v2:** **lock-3b ✅ APPROVED** ("bagong gising" look pero overall okay; ang KATAWAN pasado na rin kay Marvin mismo). **lock-2b ❌** — kinabit/photoshop look pa rin (frontal face sa naka-crouch na katawan ang suspek). **lock-4b ❌** — head-to-body SIZE mismatch. v3 retry: `2c` (three-quarter face ref para tugma sa crouch + one-exposure rebuild block) + `4c` (Sol's head-scale retry block, 3m/50mm).
- **2026-07-19 — v3 verdict + LANE DECISION:** 2c/4c ❌ "mas lumala, mukhang edited" kay Neil. Samantala si GPT 5.6 Sol (ChatGPT flow ni Neil) nakagawa ng **8 APPROVED frames** — nasa [`clients/oceanides/kuya-marvin/Approved images from gpt 5.6/`](../clients/oceanides/kuya-marvin/) at ito na ang **canonical taste standard** (parang zam-99 winners). **DESISYON: si Sol ang generator ng lahat ng Marvin stills; ang agent (Claude) ang QA/triage laban sa body master + hard gates, scripts, SOP, attribution, AI-label compliance, at ang Veo motion test** (builder ≠ reviewer). Taste profile ng approved set: flat overcast light (never golden hour — iyon ang nagpapa-edited look), simpleng eksena na may totoong asul na vacuum truck, matte skin, selfie framing OK, navy tee na may light-blue accent (#38B6FF approved) / totoong OCEANIDES MALABANAN uniform. Detalye sa `.claude/skills/marvin-avatar/`.
- **2026-07-19 — TASTE-MATCH WIN, Claude lane validated:** pagkatapos ma-decode ang taste profile mula sa 8 approved frames ni Sol, tatlong bagong codex rolls (`marvin-taste-1-selfie-high-angle`, `-2-selfie-low-angle`, `-3-walking-side`) — **3/3 APPROVED ni Neil, hinusgahang lamang kay Sol** ("kay GPT parang PALE ang skin; kay Claude may saturation kaya mas realistic" — ang explicit warm-tan skin clause ang panalo vs ang dokumentadong pale-drift failure mode). **Claude codex lane na ang primary generator** (Sol = alternate/interactive lane); detalye sa `.claude/skills/marvin-avatar/`. Ang mga v1–v3 lock-* rolls ay binura per Neil; ang canonical standards ay ang Approved-images folder + ang taste trio.
- **✅ IDENTITY-LOCK STILLS: PASSED.** NEXT: **ONE Veo 3.1 motion test** gamit ang `marvin-taste-2-selfie-low-angle` bilang plate (front-facing chest-up) → render_qa + mata ni Neil → **GO/NO-GO ng Gate 1**.

## HARD GATE 2 — Booking attribution (Day 1, hindi Day 30)

- **Dispatcher script dagdag:** "Saan n'yo po kami nakita?" (kasama ng existing "May nag-refer po ba?"). I-log sa referrer tracking sheet — dagdag na Source column: `Referrer / Kuya Marvin / Branch page / Iba`.
- **Iisang CTA sa bawat video:** libreng inspection + numbers (Globe 0917-671-6383 / Smart 0939-245-6217) + **"sabihin n'yo, kay Kuya Marvin kayo."** Ang mention line ang attribution key.
- **Scoreboard = attributed calls at booked jobs. HINDI views.**
- **30-day checkpoint (pre-committed pivot):** kung may views pero zero attributed calls → i-shift ang mix pa-FB Reels + groups + offer-led content. Ang FB ang serviceable-geo lane (MM + Cavite-Laguna + Bulacan-Pampanga); ang TikTok ay nationwide reach na secondary sa booking goal.

## Content engine (pagkatapos lang ng Gate 1)

| Lane | Ano | Cadence | Pillar |
|---|---|---|---|
| **A. AI-avatar talking** | Education: 5 senyales, presyo transparency, scam red flags, tag-ulan prep, Q&A mula sa totoong dispatcher calls | 2/week | EDUCATION + TRUST |
| **B. Real proof** | Totoong before/after + jobsite clips (phone clips ni Marvin/crew), captions + VO, walang talking avatar | 1/week min | PROOF + BEFORE/AFTER |
| **C. Distribution** | Branch pages re-share A+B na may localized captions; referrer GC members ang unang followers/sharers | per post | — |

**Copy rules (TUNED-adjacent — same discipline as tb2-variants):**
- Scripts live SA ISANG LUGAR LANG: [`../clients/oceanides/kuya-marvin/script-pool.json`](../clients/oceanides/kuya-marvin/script-pool.json). Hook rules: named pain / curiosity gap, never brand name ang unang linya.
- Bawat bagong variant: **native-ear Taglish check** (linkers -ng/na, verb aspect, contractions — agent_lessons 2026-07-14). Modern Taglish ~50/50.
- **Never "Malabanan"** (grifon-cmo hard rule).
- **Proof ay laging totoo.** AI-avatar ay education/offer lang. AI recreations kailanman hindi ipe-present as actual work; kapag AI ang visual, educational framing only (same rule as daily posts UGC v1/v2).
- **Consent workflow bago mag-film sa bahay ng customer:** verbal OK ng may-ari; walang mukha ng customer o kitang address nang walang paalam.

**Visuals:** Oceanides brand — navy + gold `#F5B301`, Anton condensed (per existing templates). **HINDI** Grifon gold. Profile pic + cover via codex-image, raw-ugc register para sa avatar stills.

## Operate (weekly rhythm — sabay sa referrer program)

| Kailan | Sino | Ano |
|---|---|---|
| Mon | agent | Render + QA ng linggong batch (2 Lane A + 1 Lane B); AI label check bago i-publish |
| Daily | Dispatcher | "Saan n'yo po kami nakita?" → sheet |
| Per post | VA | Branch re-shares + PANG-SHARE lines (existing doctrine — max 1 group share per person per day) |
| Friday | Neil + agent | Attributed calls review, sabay ng referrer GC recap; winning hooks → palawakin ang variant pool (≥3-corroboration bago maging "pattern") |

## Deliverables map

- Itong SOP — living doc: gate results, checkpoint verdicts, learnings.
- `clients/oceanides/kuya-marvin/script-pool.json` — seed pool (10 education hooks). ✅ 2026-07-18
- `clients/oceanides/kuya-marvin/refs/` — 4 reference selfies (front-neutral, 2× three-quarter, front-smiling; 3072×4096, iisang session). ✅ 2026-07-18 — verbal consent given (Marvin present with Neil); written consent pending signature. **+ `marvin-ref-5-body-master.jpg`** ✅ 2026-07-19 — full-body reference (galing sa GPT 5.6 Sol skill assets); mandatory anchor sa bawat generation per `.claude/skills/marvin-avatar/`.
- `.claude/skills/marvin-avatar/` — ang identity-lock generation skill (adapted mula kay GPT 5.6 Sol). ✅ 2026-07-19. `identity-lock/manifest*.json` ang reproducible prompt sets.
- `clients/oceanides/kuya-marvin/consent-agreement-template.docx` — 1-page likeness/AI consent (fill-ins: company legal name, compensation, post-termination content choice). ✅ 2026-07-18 — emailed to Marvin via Gmail draft; awaiting signed copy.
- Accounts (TikTok + FB Page) — PAGKATAPOS lang pumasa ang Gate 1. _(pending)_

## Resume triggers

- Marvin selfies + consent dumating → identity-lock set → Veo motion test → GO/NO-GO kay Neil.
- Gate 1 GO → account creation + profile assets + unang 2-week batch mula sa script pool.
- Gate 1 NO-GO → fallback format brief (real footage + VO); balikan ang talking lane kapag may bagong avatar model/pipeline win.
- 30-day checkpoint → attributed calls > 0? Kung hindi: FB-first pivot (nakasulat na sa Gate 2, hindi na pagde-debatehan).
- Winning hook na may ≥3 corroborations → i-propose sa daily-posts variant pools (cross-pollination pabalik sa branch system).
