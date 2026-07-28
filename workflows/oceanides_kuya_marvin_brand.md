# Kuya Marvin ng Oceanides — Personal Brand SOP

**Status:** 🟢 **LIVE — nasa PAID ADS na (2026-07-28).** Ang doc na ito ay ang
founding SOP (PLANNED 2026-07-18, grill-me + premortem kay Neil); ang mga gate
sa ibaba ay **napasa na** — historical record na sila, hindi hinihintay.
Kasalukuyang estado: FB Page live at may laman, refs + consent tapos, KM-003
video ad tumatakbo sa Meta (₱500/araw, ₱13.33 kada message sa Day 1).
👉 **Ang buhay na estado ay nasa [`clients/oceanides/kuya-marvin/ads/NEXT-SESSION.md`](../clients/oceanides/kuya-marvin/ads/NEXT-SESSION.md)** —
doon tumingin, hindi dito, kung ano ang ginagawa ngayon.
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

## HARD GATE 1 — Believability (bago ang LAHAT) — ✅ NAPASA

> **Napasa na ito.** Live ang FB Page mula 2026-07-20, at tatlong AI video ad
> (KM-002 pilot, KM-003 v2 + hook2) ang naipirmi at nai-render — hawak ng
> talking-avatar lane. Ang seksyong ito ay panuntunan pa rin para sa **bagong**
> avatar/register, pero hindi na siya humaharang sa Kuya Marvin.

**Walang account creation, walang launch, hangga't hindi pasado ang avatar sa MOTION.** (Ang Zam Veo motion test ay hindi pa tapos — unproven pa in-house ang talking-avatar lane. Stills are not an avatar.)

1. **Reference selfies + consent.** Neil kukuha kay Marvin ng 3–5 angles (front / 3-quarter / profile / smiling) + simpleng nakasulat na consent: mukha + pangalan, company-owned accounts, kasama kung ano ang mangyayari sa content kapag naghiwalay ng landas. → i-commit sa `clients/oceanides/kuya-marvin/refs/` (private repo lang, never sa mirror).
2. **Identity-lock still set** via codex-image `--edit` (Zam pattern): **raw-ugc register LANG** (trust winner — never cinematic para dito). Target ≥90% identity hold across 4+ scenes/angles.
3. **ONE Veo 3.1 talking test** — maikling Taglish education line, RAW/ungraded, 1080×1920, maikling shot (artifacts compound over duration). Grade: `render_qa.mjs` + mata ni Neil.
4. **GO:** pasado sa motion → unlock ang Lane A (talking avatar). Finishing lang pagkatapos: captions + UGC LUT + fast cuts (believability_dna sequencing rule — LUT is step 3, not step 1).
   **NO-GO:** hindi pasado → **fallback format, buhay pa rin ang brand:** totoong jobsite footage + ElevenLabs Taglish VO ("boses ni Kuya Marvin") + identity-locked stills — walang talking avatar. Si Marvin ay nasa field araw-araw; 30-sec phone clips ng tangke/trabaho ang raw material — hindi siya kailangang magsalita sa camera.

**Gate 1 result:** ✅ **GO — Lane A (talking avatar) unlocked.** Napatunayan ng
KM-002 pilot at ng KM-003 na naipadala sa Meta. Ang buong production record ay
nasa [`clients/oceanides/kuya-marvin/ads/km-003-script-storyboard.md`](../clients/oceanides/kuya-marvin/ads/km-003-script-storyboard.md)
at sa `.claude/skills/kuya-marvin-ads/`.

**Gate 1 progress log:**

- **2026-07-19 — identity-lock v1 (5 raw-ugc stills, face-refs only): PARTIAL FAIL kay Neil.** lock-1 (yard selfie) at lock-5 (smiling close) okay; lock-2/3/4 "parang kinabit ang ulo" — pasted-face look. **Root cause:** face-only reference set → ini-imbento ng model ang katawan, tapos idinidikit ang sharp na mukha (mismatch sa light/texture/sharpness). Chest-up frames lang ang ligtas sa face-only refs.
- **2026-07-19 — GPT 5.6 Sol skill reviewed + adapted.** Si Neil nag-open ng pasted-face issue kay GPT 5.6 Sol (2026-07-18 gabi); ang gawa nitong `generate-marvin-oceanides-images` skill (zip archived sa `clients/oceanides/kuya-marvin/`) ay na-review at na-adapt sa **`.claude/skills/marvin-avatar/`** — ito na ang MANDATORY recipe sa bawat Marvin still. Core fix: `marvin-ref-5-body-master.jpg` (bagong ref, totoong katawan ni Marvin — kasama ang totoong forearm tattoo + wrist watch) na kasama sa BAWAT generation + integration block (face no sharper than body, tuloy-tuloy na jaw–neck–collar). Adaptation deltas vs Sol: tinanggal ang "Malabanan" (hard rule), positional na ang tattoo/watch phrasing (mirror-confusion risk sa left/right), selfie framing pinayagan sa chest-up plates lang, at naka-park na open question ang #38B6FF wardrobe accent (SOP: navy + gold).
- **2026-07-19 — identity-lock v2 regen (body-master recipe):** lock-2b + lock-3b pasado sa agent triage (integrated na, consistent tattoo/watch); lock-4b unang roll REJECTED sa QA gate (tattoo sa dalawang braso — dapat isa lang), retried with targeted correction. Prompts preserved sa `identity-lock/manifest.json` (v1) + `manifest-v2.json`.
- **2026-07-19 — Neil eyeball ng v2:** **lock-3b ✅ APPROVED** ("bagong gising" look pero overall okay; ang KATAWAN pasado na rin kay Marvin mismo). **lock-2b ❌** — kinabit/photoshop look pa rin (frontal face sa naka-crouch na katawan ang suspek). **lock-4b ❌** — head-to-body SIZE mismatch. v3 retry: `2c` (three-quarter face ref para tugma sa crouch + one-exposure rebuild block) + `4c` (Sol's head-scale retry block, 3m/50mm).
- **2026-07-19 — v3 verdict + LANE DECISION:** 2c/4c ❌ "mas lumala, mukhang edited" kay Neil. Samantala si GPT 5.6 Sol (ChatGPT flow ni Neil) nakagawa ng **8 APPROVED frames** — nasa [`clients/oceanides/kuya-marvin/Approved images from gpt 5.6/`](../clients/oceanides/kuya-marvin/) at ito na ang **canonical taste standard** (parang zam-99 winners). **DESISYON: si Sol ang generator ng lahat ng Marvin stills; ang agent (Claude) ang QA/triage laban sa body master + hard gates, scripts, SOP, attribution, AI-label compliance, at ang Veo motion test** (builder ≠ reviewer). Taste profile ng approved set: flat overcast light (never golden hour — iyon ang nagpapa-edited look), simpleng eksena na may totoong asul na vacuum truck, matte skin, selfie framing OK, navy tee na may light-blue accent (#38B6FF approved) / totoong OCEANIDES MALABANAN uniform. Detalye sa `.claude/skills/marvin-avatar/`.
- **2026-07-19 — TASTE-MATCH WIN, Claude lane validated:** pagkatapos ma-decode ang taste profile mula sa 8 approved frames ni Sol, tatlong bagong codex rolls (`marvin-taste-1-selfie-high-angle`, `-2-selfie-low-angle`, `-3-walking-side`) — **3/3 APPROVED ni Neil, hinusgahang lamang kay Sol** ("kay GPT parang PALE ang skin; kay Claude may saturation kaya mas realistic" — ang explicit warm-tan skin clause ang panalo vs ang dokumentadong pale-drift failure mode). **Claude codex lane na ang primary generator** (Sol = alternate/interactive lane); detalye sa `.claude/skills/marvin-avatar/`. Ang mga v1–v3 lock-* rolls ay binura per Neil; ang canonical standards ay ang Approved-images folder + ang taste trio.
- **✅ IDENTITY-LOCK STILLS: PASSED.** NEXT: **ONE Veo 3.1 motion test** gamit ang `marvin-taste-2-selfie-low-angle` bilang plate (front-facing chest-up) → render_qa + mata ni Neil → **GO/NO-GO ng Gate 1**.
- **2026-07-19 — Veo motion tests (taste-2 plate, Taglish line, lahat 9:16/1080p/8s):**
  - **test-1 (lite):** ❌ kay Neil — prompted na "slight brow raise" nag-trigger ng mid-video identity morph. **Lesson → EXPRESSION LOCK rule** (motion corollary ng eyes-open rule; nakadokumento sa `.claude/skills/marvin-avatar/`): bibig/panga lang ang gumagalaw + blinks; ang emosyon dala ng BOSES, hindi ng mukha.
  - **test-2 (lite + expression lock):** ✅ **"legit okay na"** kay Neil; minor mouth morph, tinanggap bilang kilalang weakness ng kasalukuyang video models. render_qa B-.
  - **test-3 (quality + expression lock):** ❌ kay Neil KAHIT render_qa clean sweep — "masyadong malinis" (believability failure sa raw-ugc register!), nagbago ang reaction, lumaki ang bibig, hindi rin nasolve ang mouth morph. **Isa pang patunay: machine QA ay triage lang; ang mata ni Neil ang batas.**
  - **📌 PRODUCTION MODEL VERDICT: `veo-3.1-lite-generate-preview`** ang Lane A model (lumabas na mas believable ANG mas mura — raw beats polished). Native 1080×1920 ang lite output — walang kailangang upscale.
  - **test-4 (lite, high-angle, taste-1 plate):** ❌ kay Neil — sa mid-distance framing, halata pa rin ang AI. render_qa: bumalik ang expression breaks (ang smiling plate ay lumalaban sa expression lock — **rule: neutral plates para sa talking videos; smiling plates ay stills lang**).
  - **test-5 (lite, CLOSE-UP, taste-5 plate): ✅✅ APPROVED — pati ni MARVIN at ZAM mismo ("looks real").** Expression held constant buong 8s, stable ang facial structure, minor mouth softness lang (tinanggap na model weakness). Raw = native 1080×1920; may 2160-upscale comparison din (FFmpeg lanczos).
  - **📌 CAMERA-DISTANCE RULE (Neil, 2026-07-19): ang AI feel/slop ay lumalabas lang kapag MALAYO ang camera** (taste-1/2/3 na framing) — sa close-up (register-1 na lapit, mukha ang pumupuno sa frame), nawawala ang AI tell dahil sa mukha napupunta ang buong detail budget ng model. **Lane A production framing: CLOSE-UP arm's-length selfie, neutral plate, lite model, expression lock.**

**FINAL LESSONS-LEARNED (Neil, 2026-07-19 — pagkatapos ng buong image+motion campaign):**

- **gpt-image-2 (codex lane): 100% si Marvin** — kinumpirma ni Marvin mismo ("nagulat na nakopya sya literal"). Kaso 1024×1536 lang ang max — ang mababang plate resolution + malayong camera ang nagpapalitaw ng morph sa bibig/mukha sa video. Sa close-up plates (taste-4/5) → video, kinumpirma ni Marvin at ni Neil: **100%, hindi halatang AI.** Kailangan lang constant ang facial reaction (expression lock) para sa character consistency.
- **nano banana 2 (Gemini lane): ~90% si Marvin sa stills** (2K ang lakas — mas detalyadong mukha), pero **bumababa sa ~87% kapag ginawang video.** Approved bilang IMAHE ang nano-C/C1/C2; ang C3 (walking) ay conditional pass — panalo pa rin ang codex sa walking angle.
- **OVERALL WINNER: gpt-image-2 ang plate factory** (character consistency + realism). Wishlist: kung magka-2K ang gpt-image-2, subukan ulit ang layuan.
- **CONTENT RULE: iwasan ang malalayong camera angle kay Marvin sa lahat ng content** — para walang morph, walang AI slop, preserved ang 100% realism.
- **✅ APPROVED VIDEO TAKES (Neil): `marvin-veo-test-2` (low-angle), `marvin-veo-test-4-highangle-lite` (raw o upscaled — pareho okay), `marvin-veo-test-5-closeup-lite` (raw o upscaled — pareho okay).** Lahat ng hindi approved na video tests + identity-lock experiments ay binura per Neil.

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
- `clients/oceanides/kuya-marvin/refs/` — 4 reference selfies (front-neutral, 2× three-quarter, front-smiling; 3072×4096, iisang session). ✅ 2026-07-18 — verbal consent given (Marvin present with Neil); **written consent EXECUTED 2026-07-20** (tingnan sa ibaba). **+ `marvin-ref-5-body-master.jpg`** ✅ 2026-07-19 — full-body reference (galing sa GPT 5.6 Sol skill assets); mandatory anchor sa bawat generation per `.claude/skills/marvin-avatar/`.
- `.claude/skills/marvin-avatar/` — ang identity-lock generation skill (adapted mula kay GPT 5.6 Sol). ✅ 2026-07-19. `identity-lock/manifest*.json` ang reproducible prompt sets.
- **Consent — ✅ EXECUTED 2026-07-20, 3:31 PM.** Hindi na ito bukas na item.
  Naipadala 3:30 PM sa thread na "Agreement - Oceanides Contract" (Oceanides
  account); tinanggap ni **Dan Marvin Balaba** 3:31 PM sa email reply
  ("Nabasa ko at sumasang-ayon ako…"). Effective 2026-07-20. Ang Gmail thread
  ang legal na ebidensya sa ilalim ng R.A. 8792 — **huwag i-delete, i-archive
  at i-label.** Buong teksto + record copy:
  [`clients/oceanides/kuya-marvin/consent-agreement-FINAL-2026-07-20.md`](../clients/oceanides/kuya-marvin/consent-agreement-FINAL-2026-07-20.md).
  *(Obsolete na ang lumang `consent-agreement-template.docx` na "awaiting
  signed copy" — email-reply consent ang naging path, hindi pirma.)*
- Accounts — ✅ **FB Page LIVE** (`facebook.com/kuyamarvin.oceanides`, ID
  `1184710811397498`) mula 2026-07-20, may profile/cover/About/posts at
  nagpapatakbo na ng paid ads. ⏸️ **TikTok — hindi pa ginagawa** (walang
  naka-connect na Instagram man sa Page; Messenger lang ang destination ng
  KM-003).

## RESUME STATE (2026-07-22 — LANE A BATCH IN PROGRESS)

**Neil updates ngayong session (2026-07-22):**

- ✅ **Call Now button naka-set na** sa FB page (item 1 partial done).
- ⏸️ **Messenger greeting + auto-reply DEFERRED** ("huli na to") — balikan pagkatapos ng unang batch.
- ⏸️ **Resharers (branch pages) + referrer/affiliate wave DEFERRED** — wag munang isipin per Neil; focus sa content + ads.
- ✅ **Ads budget FINAL: ₱500/day (~₱15k/month), Metro Manila target geo.** Breakeven math kumpleto na sa `oceanides_business_model.md` (nut ₱27–30k/mo ≈ 3–4 certified loads o 20–30 residential).
- ✅ **MARVIN VOICE CLONED** — ElevenLabs voice ID `jL41fXY8JXGEarmJ5g3f` (details sa `clients/oceanides/kuya-marvin/voice-sample-script.md`). Bagong audio lane: Veo native audio → ElevenLabs STS sa clone, o direct TTS — ang final VO ay totoong boses ni Marvin.
- ▶️ **GO sa Lane A unang 2-week batch** (4 talking videos mula script-pool) + Marvin ADS production (Kling balance funded na; lane decision sa ibaba).

Legacy state (2026-07-20 GABI session end — PAGES LIVE, unang FB posts NA-POST na):

**Tapos ngayong session (huwag nang ulitin):**

- ✅ **FB Page LIVE at may laman: `facebook.com/kuyamarvin.oceanides`** — name/bio/specialties/credentials set (CMO fill-ins), profile pic = `profile-4-fullteeth-van.png`, cover = `cover-3-with-text.png` (Anton navy+gold overlay: Libreng Health Check + numbers + attribution line). **3 seed posts NA-POST na ni Neil** (pinned trust + 5-senyales + libreng health check; drafts na sumunod sa bagong typography rules). Botcake comment moderation naka-set (phone-number hide ON = anti-sulot; "kanal/canal" TINANGGAL sa keywords — customer language yun, hindi insult).
- ✅ **TikTok account created na rin** (setup details i-verify next session).
- ✅ **Consent/follow-up/tracker lahat verified tapos**; insurance = usapan next month.
- ✅ **Comp FINAL:** commission-only tiered (res tig-₱250 / certified tig-₱1,000 / lusong tig-5%) + ₱5k residential ANCHOR (tawad room hanggang ₱4–4.5k, 30-day watch clause). Nasa business-model doc.
- ✅ **Schwartz adopted:** `awareness` tags sa script-pool, Awareness Ladder sa grifon-cmo skill, **B2B "Compliance-Pressured Paolo" avatar** sa market-research doc (RA 9275 grounding).
- ✅ **Offer Optimizer run tapos** (2 tracks) — output + CMO triage sa `clients/oceanides/offer-optimizer-denr-2026-07-20.md`. **3 PENDING RULINGS ni Neil:** (1) Run B ₱9.5k ay below ₱12k floor → i-restore floor; (2) inimbentong penalty-payment guarantees → tanggapin ba ang liability?; (3) paid ₱497 tripwire vs LIBRENG Health Check → reco: manatiling libre.
- ✅ **Typography rules (PERMANENT):** walang `'` sa contractions (nyo/yan/yun/to/wag) + walang em dash sa lahat ng user-facing copy — nasa `_shared/taglish-voice.md` + agent_lessons; script-pool normalized na.
- ✅ **Post images:** `post2-inspection(-4x5)`, `post3-selfie-jobsite(-4x5)` (v1 = pick ni Neil; may maliit na tattoo mark sa watch arm — kilala ni Neil ang trade-off; `-v2` = clean-arm alt), `post3-selfie-gate(-4x5)` extra asset. LESSON: bawat generation roll may SARILING filename — huwag mag-overwrite (muntik mawala ang v1; na-recover sa codex cache, na ephemeral sa defreezer).

**NEXT SESSION, dito magsimula:**

1. **Page launch follow-through (i-verify kung nagawa na ni Neil):** Call Now action button; Messenger greeting + auto-reply (may "Saan nyo po kami nakita?" attribution question); referrer GC invite wave (pagkatapos lang buo ang page).
2. **TikTok profile setup:** profile pic (pwede `post3-selfie-gate` para hindi identical sa FB, o `profile-4`), bio, handle `@kuyamarvin.oceanides`.
3. **UNANG 2-WEEK LANE A BATCH (ang malaking piraso):** 4 talking videos mula script-pool (2/week; balansehin ang awareness tags) — close-up neutral plate, `veo-3.1-lite-generate-preview`, expression lock, AI label bago i-publish. + 1 Lane B brief kay Marvin (totoong jobsite clips, 30-sec phone shots).
4. **Neil rulings** sa 3 Offer Optimizer items (itaas) → tapos i-final ang DENR package copy.
5. **Ads budget/month** ang huling unknown → i-final ang breakeven sa business-model doc.
6. **Phase 0 Day 1 ni Marvin** — schedule + unang canvassing/content day coordination.

Legacy state (2026-07-20 umaga — consent EXECUTED, Gate 1 GO):

**Verification pass 2026-07-20 (bagong session, kinumpirma ni Neil):**

1. ✅ **Tracker v2 shared na** — uploaded sa Drive as Google Sheets, shared kay Marvin.
2. ✅ **Follow-up email SENT + "Noted, agree ako dito" na si Marvin** (via OCEANIDES account thread "Agreement - Oceanides Contract"). Kumpleto na ang documented work arrangement: consent + comp + schedule/attendance/commission rules — lahat may assent reply.
3. ⏸️ **Accident insurance DEFERRED** — pag-uusapan next month (hindi blocker sa launch, pero nasa follow-up email ang pangako, kaya dapat matupad bago mag-heavy field phase).
4. ✅ **`websiteinspodesigns/` loose end RESOLVED** — sinadya ni Neil; removal committed (`3c5ae16`).
5. 🧹 **Gmail cleanup para kay Neil:** 3 STALE drafts pa sa personal Gmail (2× "Kasunduan" 06:11/06:47 + 1× "[COPY-PASTE MO ITO]" 07:49) — tapos na ang mission ng lahat (consent + follow-up ay na-execute sa Oceanides account thread); pwede nang burahin. Ang lumang SOP note na nakaturo sa draft id `r-4555505156925715555` ay obsolete na — ang actual na na-send ay ang v3 text sa Oceanides thread.

**Natitirang next steps:**

1. **Gate 1 GO execution:** Neil gumawa ng TikTok + FB Page → **✅ profile assets APPROVED (Neil 2026-07-20 gabi): `profile-4-fullteeth-van.png` (profile pic, TikTok+FB) + `cover-3-van-standing.png` (FB cover) sa `clients/oceanides/kuya-marvin/profile-assets/`** (complete-teeth + real-aluminum-van batch; unapproved deleted). Susunod: text-overlay version ng cover (Anton, navy+gold: "LIBRENG SEPTIC HEALTH CHECK" + numbers + "Sabihin n'yo: kay Kuya Marvin kayo") → unang 2-week batch mula script pool. Day 1 ni Marvin = Phase 0 launch sprint (₱500/day, Day-14 deliverables checkpoint).
2. ✅ **Neil/Zam comp RESOLVED (2026-07-20):** commission-only tiered (res ₱250 / certified ₱1,000 / lusong 5% — tig-ganoon), ₱5k residential ANCHOR na may tawad room hanggang ₱4–4.5k. Detalye sa `workflows/oceanides_business_model.md`.
3. **Breakeven math** — ads budget/month na lang ang natitirang unknown.
4. **Schwartz adoption GO (2026-07-20):** ✅ `awareness` tags sa script-pool.json; ✅ Awareness Ladder section sa grifon-cmo skill; NEXT: **B2B compliance-buyer avatar research** (CMO stack, same method as Henry/Helen) → **Offer Optimizer run** sa DENR Compliance Package na may 2 message tracks (Unaware=liability education / Solution-Product Aware=package comparison).

Legacy state (2026-07-19):

- **GATE 1 = GO (pormal, Neil 2026-07-20).** Next execution: account creation (TikTok + FB Page) + profile assets (gpt-image-2 lane per marvin-avatar skill) + unang 2-week batch mula sa script pool.
- **Consent status KOREKSYON (2026-07-20):** ang "emailed via Gmail draft ✅ 2026-07-18" ay HINDI pala tumuloy — walang sent email o draft sa Gmail (hinanap 2026-07-20). Hindi pa hawak ni Marvin ang agreement. Desisyon ni Neil: **email-reply consent ang path** (walang print/pirma) — valid ito bilang electronic consent sa PH (RA 8792 E-Commerce Act). **FINALIZED 2026-07-20:** buong agreement + work arrangement ay nasa BODY ng Gmail draft (id `r-4555505156925715555`, subject "Kasunduan — Kuya Marvin ng Oceanides") — mas malakas na evidence kaysa attachment dahil ang terms at ang assent reply ay nasa iisang thread. Fills: company = Oceanides Plumbing Siphoning & Pest Management Services OPC; likeness fee ₱1,500/month simula Phase 1, hiwalay sa field-work pay; post-termination = remain published (may Section 3 objection right pa rin). Kopya ng buong final text: [`clients/oceanides/kuya-marvin/consent-agreement-FINAL-2026-07-20.md`](../clients/oceanides/kuya-marvin/consent-agreement-FINAL-2026-07-20.md). **Walkthrough artifact (screen-share kay Marvin, Oceanides navy+gold):** `https://claude.ai/code/artifact/1d1745d8-ac19-424a-82a9-5b01efc9c40a` — i-update via Artifact tool `url` param, huwag mag-mint ng bago. **Si Neil na lang:** palitan ang recipient (placeholder = sarili niyang email) ng totoong email ni Marvin → i-walk through in person → send → hintayin ang reply-to-agree bago ang unang live post.
- **Marvin comp structure APPROVED (Neil 2026-07-20, phased para sa cash runway):** Phase 0 unang 14 araw = ₱500/scheduled working day + transport reimbursed + incentives from day 1 (₱250/certified load supervised, 5% ng lusong mula sa kanyang inspection, ₱500/maintenance signup), weekly GCash payout tuwing Sabado, Day-14 DELIVERABLES checkpoint (hindi revenue: pages live, content batch, canvass visits, booked Health Checks). Phase 1 trigger = unang ₱30k gross collected O unang B2B contract na may downpayment → base ₱15k/month + incentives + likeness fee. Phase 2 = Day-90 review, lipat kinsenas/katapusan. Rationale + anti-poach logic: [`workflows/oceanides_business_model.md`](oceanides_business_model.md).
- **Seedream 5.0 test DROPPED (2026-07-20, per Neil):** hindi na itutuloy — noise lang; kumpleto na ang working lanes (codex/gpt-image-2 = plate factory, nano = 2K stills). Ang mga `seedream-*` rigs sa test-rigs/ ay naiwan sa folder pero retired — huwag nang i-resume maliban kung may bagong likeness evidence na magpapabago ng research verdict (NEGATIVE vs nano).
- **Test rigs preserved sa [`clients/oceanides/kuya-marvin/test-rigs/`](../clients/oceanides/kuya-marvin/test-rigs/)** (galing .tmp bago ang defreezer): `veo-motion-test.mjs` (Veo lite/quality talking test, expression lock + Taglish line), `nano-marvin-test.mjs` (+ `nano-prompt-C.txt` — ang approved minimal formula). Lahat tumatakbo mula repo root, `.env` keys.
- Cafe-PC re-arm sa pagbabalik: `scripts/restore-codex.ps1` (codex-image lane) + repo-local git identity (`git config user.name/user.email`).
- **Flash-lite UGC-formula test CLOSED — REJECTED for Marvin (2026-07-20, Neil verdict):** tinest ang "One BFF Selfie" authentic-UGC prompt pack (Neil's Google Doc: `docs.google.com/document/d/1JlMxda1PfUNajLr90xtfBaeeOGOCCemy2vXA2fMPn5M`) sa `gemini-3.1-flash-lite-image`, identity-anchored per marvin-avatar skill. Stills: close-up umabot ng 95% likeness kay Neil na may love sa realism; high-angle nasira ang mata v1 / naayos v2; low-angle full-body = ibang tao (kumpirma ng camera-distance rule — maliit na face sa pixels = wala nang identity). **Pero sa Veo 3.1 lite talking test, NAGBAGO ANG FACE pagsalita → hindi approved.** Final na kongklusyon ni Neil: **walang tatalo sa gpt-image-2 sa 100% character consistency + realism na SUSTAINED hanggang video** — hindi na magte-test ng alternative stills lane para sa talking pipeline. Lahat ng flash-lite outputs/rig/prompts ay dineleted (unapproved, per SOP). Prompt-craft learnings na dala: (1) skin tone — ituro ang face reference bilang EXACT color target, hindi adjectives ("medium-deep/rich brown" = sobrang dilim; walang clause = pale drift); (2) flash-lite sinusunod ang realism/light/Apple-computational language pero BINABALEWALA ang exact camera-geometry numbers (degrees/heights); (3) ang UGC formula ay POSIBLENG magamit sa STATIC creatives lang na walang taong pagagalawin (hal. Image Ads Gen backgrounds/scenes) — hindi kailanman sa talking-avatar pipeline.

## Resume triggers

- Marvin selfies + consent dumating → identity-lock set → Veo motion test → GO/NO-GO kay Neil.
- Gate 1 GO → account creation + profile assets + unang 2-week batch mula sa script pool.
- Gate 1 NO-GO → fallback format brief (real footage + VO); balikan ang talking lane kapag may bagong avatar model/pipeline win.
- 30-day checkpoint → attributed calls > 0? Kung hindi: FB-first pivot (nakasulat na sa Gate 2, hindi na pagde-debatehan).
- Winning hook na may ≥3 corroborations → i-propose sa daily-posts variant pools (cross-pollination pabalik sa branch system).
