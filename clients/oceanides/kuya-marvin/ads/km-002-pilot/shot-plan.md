# KM-002 Pilot Ad — Shot Plan v2 (aligned sa tuned ad formula)

**Status:** DRAFT v2 2026-07-22 — PENDING NEIL APPROVAL. (v1 scrapped: ginawa mula sa organic Lane A pool nang hindi binabasa ang tuned adscript/storyboard rules; kinorek ni Neil. Lesson sa agent_lessons.md.)
**Formula source (batas):** `api/_lib/prompts.ts` — UGC PRO CONTINUOUS PERFORMANCE (Tutorial — SERVICE) + COMMON_RULES word counts + TAGLISH ACCENT LOCK + APPEARANCE_LOCK + ONE OPERATOR ONE JOBSITE.
**Renderer:** Marvin agency lane (Gate-1 proven): gpt-image-2 plates → Veo 3.1 Lite 1080×1920 8s + expression lock → ElevenLabs clone (`jL41fXY8JXGEarmJ5g3f`) → ai-editor finishing.

## Bakit UGC Pro Tutorial ang format (hindi ibang variant)

- **Services Testimonial 6-beat** = CUSTOMER ang nagsasalita ("Ako si...") — hindi fit; si Marvin ay operator.
- **Transformation 4-beat** = kailangan ng before/after — pero ang "Proof ay laging totoo" rule: bawal i-present ang AI visuals bilang totoong trabaho. Naka-park hanggang may Lane B real footage.
- **UGC Pro Tutorial (Service)** = "ganito namin ginagawa" authority-builder, operator-to-camera, continuous performance — LIFTED ang 3-consecutive-talking ban (tamang-tama sa raw-ugc close-up register ni Marvin), at ang "b-roll" ay ang TOTOONG work beats (hands-only allowed), hindi environment-only.

## Tuned rules na sinusunod ng v2 (ang checklist ni Neil)

| Rule (mula prompts.ts) | Application dito |
|---|---|
| Hook: ≤2s, **5–8 words TOTAL**, pattern interrupt, 2 variations | ✅ hooks sa ibaba |
| Body lines: **7–12 words**, 3–5s bawat isa (Sabri Suby Slide) | ✅ bawat scene line |
| OPENING ACCENT TRIGGER: Tagalog word sa unang 2 salita | ✅ "Takot ka..." |
| TAGLISH ACCENT LOCK: ~70/30 Tagalog-dominant; CTA opens+closes sa Tagalog | ✅ |
| Steps open with spoken number ("Una," "Pangalawa," "Pangatlo,") | ✅ S2–S4 |
| CTA: BOOK/MESSAGE/INQUIRE lang, walang peso amount, walang "buy now" | ✅ numbers sa end card, hindi binibigkas |
| ONE OPERATOR, ONE JOBSITE — same location bawat scene | ✅ iisang jobsite (gate/driveway na may van) |
| HARD CUTS ONLY, walang transition effects | ✅ |
| APPEARANCE_LOCK: consistent wardrobe/props — sa atin: navy tee + light-blue accent, white cab + silver aluminum van (via vehicle ref), walang imbentong gear/logo | ✅ locked sa plates |
| Scene variety sa framing/pose (hindi identical na kuha bawat scene) | ✅ varied angles WITHIN close-up (camera-distance rule ni Marvin ang ceiling: talking = laging close-up; hands-only work shots = malayang framing, walang mukha = walang identity risk) |
| PH ground-truth realism | ✅ ordinaryong PH bahay/kalsada |

## Script (KM-002-AD — derived sa KM-002; idadagdag sa script-pool.json `ads` section pag-apruba)

Typography rules applied (walang apostrophe sa contractions, walang em dash).

| Scene | Beat | Linya | Words | Visual |
|---|---|---|---|---|
| S1 | HOOK | hook1: **"Takot ka tumawag ng pasipsip? Tama ka."** · hook2: "Nagulat ka na ba sa presyo ng pasipsip?" | 7 / 8 | Talking close-up, eye-level selfie, jobsite gate + van hint sa likod |
| S2 | STEP 1 | "Una, chine-check muna namin ang tangke nyo. Libre yun." | 10 | **Hands-only work insert** (gloved hands sa tank cover/inspection) + VO ng clone (TTS, walang lip-sync na kailangan) |
| S3 | STEP 2 | "Pangalawa, sasabihin namin ang presyo bago kami magsimula. Walang dagdag." | 11 | Talking close-up, slight low-angle, ibang spot sa same jobsite |
| S4 | STEP 3 | "Pangatlo, kapag hindi kayo payag sa presyo, aalis kami nang maayos." | 11 | Talking close-up, slight high-angle selfie |
| S5 | RESULT + CTA | "Ganun kasimple. Libreng inspection, i-message nyo lang kami. Sabihin nyo, kay Kuya Marvin kayo." | 15 (CTA beat) | Talking close-up eye-level → END CARD overlay: numbers (Globe 0917-671-6383 / Smart 0939-245-6217) + "Sabihin nyo: kay Kuya Marvin kayo", navy + gold Anton |
| — | — | Kabuuang binibigkas ≈ 20–25s; render 5×8s tapos trim sa edit → target ~30s final | | |

Attribution key preserved: "Sabihin nyo, kay Kuya Marvin kayo" (Gate 2) — binibigkas + nakasulat sa end card + sa caption.

## Consistency reference set (para hindi naliligaw ang kwento — lahat ng scene, iisang mundo)

- **Marvin:** body master + front-neutral refs, navy tee + light-blue collar accent, LAHAT ng scene
- **Sasakyan:** white cab + silver aluminum closed van (`assets/Aluminum-C-VAN-6-Wheeler-Truck-14-m.jpg` bilang 3rd edit ref) — kapag kita
- **Lugar:** IISANG jobsite: residential gate/driveway, beige fence, overcast — lahat ng plates same location, iba lang ang angle/pose
- **Tools (S2):** ordinaryong gloves + concrete tank cover/putol na hose, walang branded/imported gear, walang exposed sewage

## Production checklist

1. ✅ Neil approves v2 plan + script (2026-07-22)
2. ✅ Plate set generated + agent triage passed (2026-07-22): `plates/s1-eyelevel-van.png`, `s2-hands-tankcover.png` (v1 clean-arms) + `s2-hands-tankcover-v2-tattoo.png` (tattoo continuity — NEIL PICKS ONE), `s3-lowangle-gate.png`, `s4-highangle-driveway.png`, `s5-eyelevel-vanclose.png`. End card: `endcard-1080x1920.png` (galing sa `clients/oceanides/templates/kuya-marvin-endcard.html`). KM-002-AD nasa script-pool.json `ads` section na.
   - Triage flags para kay Neil: (a) S4 tattoo sa selfie arm — i-verify kung tamang braso; (b) S2 v1 walang tattoo / v2 may tattoo sa kanang-frame na braso — piliin ang tugma sa totoong braso ni Marvin; (c) backgrounds magkakapareho ang mundo (beige fence + black gate + van) pero hindi pixel-identical — jump-cut raw-ugc register ang nagtatago nito.
3. ✅ Neil approves plates + scenes (2026-07-22). End card copy corrected per Neil: "walang gulatan" + "SEC Registered • DENR Accredited". S2 pick (v1 clean vs v2 tattoo) — sa edit stage na, hindi blocker. **COPY-LANE DIRECTIVE mula ngayon: si Sol/Gemini ang nagsusulat ng Tagalog copy, si Claude ang brief + QA (see agent_lessons 2026-07-22).**
4. 🔶 Veo renders DONE + agent triage passed (2026-07-23, Neil GO on cost) — `clips/s1-hook.mp4`, `s3-step2.mp4`, `s4-step3.mp4`, `s5-cta.mp4` (lahat 8s 1080×1920 lite). **PENDING NEIL EYEBALL ng 4 clips.** Motion end card din tapos: `endcard-motion-1080x1920.mp4` (Hyperframes, $0, composition committed). Production notes: (a) **RAI LESSON:** unang s5 roll hinarang ng Veo filter dahil sa pangalang "Kuya Marvin" sa dialogue — walang pangalan sa Veo-spoken lines kailanman; attribution line lumipat sa end-card VO (clone TTS), nakasulat na rin sa card; (b) triage flags: s1 may bahagyang ngiti sa dulo (posibleng expression drift sa tail — ikaw ang batas), s5 last-second facial read i-verify; (c) 5 successful renders ang na-spend (4 clips + 1 filtered attempt).
5. ✅ Voice pass DONE (2026-07-23): STS lahat ng 4 clips sa clone (`audio-post/*-sts.mp4`, robust stability) + TTS `s2-vo.mp3` at `endcard-vo.mp3`. Rig: `test-rigs/audio-post.mjs`.
6. ✅ Edit DONE (2026-07-23): **`KM-002-AD-v1.mp4`** (40.3s, 1080×1920) — trims sa speech end, S2 = still push-in (v2 tattoo plate) + VO, burned-in captions bawat scene, testimonial music bed (0.13 + fadeout), SFX (swish sa cuts, ding sa endcard, pop sa attribution), loudnorm −14 LUFS. **LETTERBOX FIX:** ang 2:3 plates ay nile-letterbox ni Veo sa 9:16 → center-crop `crop=908:1614:86:153,scale=1080:1920` sa lahat ng talking segs (lesson sa marvin-avatar skill). Intermediates sa `edit/` (gitignored, rebuild via commands dito). **✅ APPROVED ni Neil (2026-07-23, v4).** Iteration history: v1 (static captions) → v2 (karaoke + trims + drawtext hook) → v3 (IMPACT chunk-pop grammar) → v4 (Hyperframes hook overlay) = FINAL. Future-ad feedback ni Neil naka-encode sa `.claude/skills/kuya-marvin-ads/` (pacing word-budget, energy delivery, verifier gates, flash transitions, Sol scripts).
7. ⬜ AI label + publish (organic sa page muna, tapos ito rin ang unang ₱500/day ad creative) — **AI label ON sa Meta bago i-post, huwag kalimutan**
8. ⬜ Log sa `workflows/ad_performance_ledger.md` paglabas ng numbers

## Note sa v1 plates (committed na)

`plate-A-van`, `plate-B-gate-v2`, `plate-C-street-v3` — tatlong MAGKAIBANG lugar, kaya hindi pwede sa ad na to (one-jobsite rule). HINDI sila sayang: valid silang Lane A ORGANIC plates (bawat organic video ay sarili niyang lugar). Ang ad plates ay bagong same-location set.
