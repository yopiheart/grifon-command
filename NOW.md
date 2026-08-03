# NOW

**Stamped: 2026-08-03** · Anchor: `cf3a022` (main) · **GB-001 v2 tapos. Naghihintay ng boses ni Gabriel.**

> The single resume doc. One screen, one next action. Read this first.
> **Freshness contract:** if the stamp is >5 days behind `git log -1`, treat as UNVERIFIED —
> re-derive from `git log --oneline -15` + open issues and rewrite. Enforced by
> `node tools/resume_doc_check.mjs` (SessionStart runs it `--quiet`).

---

## ▶ NEXT ACTION — RUN ORDER (Neil, 2026-08-03). Huwag baligtarin.

🔴 **BASAHIN MUNA ANG `/kuya-marvin-ads` BAGO GUMALAW.**
🛑 **Naka-hold ang ad hanggang may boses si Gabriel.** Desisyon ni Neil: hindi
muna ilalabas ang GB-001 habang boses pa ni Veo ang naririnig.

### A · Page assets — $0, mga 10 minuto, walang naghihintay dito
1. **Cover photo** → `kuya-gabriel/identity-lock/gabriel-cover-v3.png`.
   **APPROVED na** (Neil + Gabriel, 2026-07-30). I-upload na, walang tanong.
2. **Profile pic** → `gabriel-profile-v2.png` (walang ngiti, ginawa para sa bilog
   na crop, `bb4d3f3`). ⚠️ **Walang naitalang hatol** — ang larawan ay nandyan na,
   ang kulang ay ang tingin. **Kay Gabriel ang mukha at sa kanya ang huling salita**
   (IDENTITY.md). Ang FB profile pic ang **tanging** bukas na exception sa no-smile rule.

### B · Organic — 5 araw, isang post kada araw, $0
3. **SULAT NA ANG LIMA.** `kuya-gabriel/organic/PAGE-POSTS-PRE-AD.md`:
   Si Gabriel · Hindi barado puno na · Ang mga dagdag · Before at after · Ang papeles.
   **Huwag baligtarin ang order** — ang Page na nagsisimula sa presyo ay mukhang ad.
   ⚠️ Kumpirmado ni Neil na **BLANGKO** ang Page `291924520660232`.

### C · Boses — kasabay ng B, hindi pagkatapos
4. **Consent muna, na sakop ang BOSES** hindi lang ang mukha. Template sa
   `kuya-marvin/consent-agreement-FINAL-2026-07-20.md`. Legal na harang.
5. **I-record ni Gabriel** ang `kuya-gabriel/voice/RECORDING-SCRIPT.md` — 30s,
   **tatlong take sa isang file**. Nandyan lahat ng paano at bakit.
6. **Gumawa ng ElevenLabs clone** (`GRIFON_VOICE_CLONING_ENABLED=true` na, buhay
   doon ang clone ni Marvin). Itala ang voice ID sa `kuya-gabriel/voice/`.
7. **STS pass sa GB-001** — boses ni Gabriel kapalit ng kay Veo, tapos rebuild
   (`build-cut.sh`). Dito rin nawawala ang pangangailangan ng `r4-vo` roll (~$1).

### D · Bago ang unang piso ng ad
8. **Redeploy ng funnel + test submit sa apex.**
9. **Tatlong sagot ni Neil na naka-harang pa rin:**
   - `maxPaidRolls` sa `script.spec.json` — **wala pa, kaya naka-harang ang LAHAT
     ng bayad na render.** Sinadya.
   - **Kling** para sa 2 b-roll (still + FFmpeg zoom pa lang sila). Bayad, gated.
   - Ulitin ba ang r2/r3 nang **isang linya kada roll** (PACING Fix 2, ~$6-8)?

### E · Campaign
10. `kuya-gabriel/ads/CAMPAIGN-RUN-SHEET.md` — paste-ready, may UTM.

---

## ✅ Tapos ngayong 2026-08-03

**`GB-001-AD-v2.mp4`** — 22.1s, 1080×1920, **pasado sa dalawang gate** (`ad_preflight
--build/--video` + `render_audit` grade **B**, `vo_accent_ok`, walang dead air,
`covers_face:false`). Walong beat: hook · plunger b-roll · takot · phone b-roll ·
**HTML quote card** · screen scroll · CTA · end card. Recipe: `make-plates.mjs`,
`make-broll.mjs`, `captions.mjs`, `overlays/`, `build-cut.sh`.

**Ang aral, at ang gate na ipinalit (`797bdf0`).** Sampung tawag sa Veo noong **dalawa**
lang ang inaprubahan, at pumasa pa sa gate ang script kahit **dalawang linya ang
nakasaksak sa bawat 8s roll** — ang binawi ni Neil noong 2026-07-27. Binibilang ng lumang
gate ang salita kada LINYA, hindi kada CLIP. Ngayon: isang linya kada roll ·
`maxPaidRolls` na binibilang ng hook, pati hinarang ng RAI · b-roll ay dapat may Kling
lane · kailangan ng HTML overlay + end card + zoom.
⚠️ **Butas pa rin:** kapag HTML ang overlay, nilalaktawan ang feed-safe check (`band()`
ang hinahanap). At mali ang `volume=` na binabasa nya — SFX 0.45, hindi music 0.20.

## 🅿 PARKED
**Oceanides:** SEC Reg. No. · FB About: buong SEC name · logo-marquee · reviews sa Page ·
page #2 = DENR B2B · **per-word invert ng `spotlight`** (chunk-pop lang ang gawa).
**Grifon:** #94.3 next · #94.2 NOT-REPRO · #92+#89/#90 ride Slice B · #93 ⛔ TUNED.
⚠️ **Client world:** navy + amber print, no glass, no `#FFCC00` — `clients/oceanides/DESIGN.md`.

## ⛔ Gated · 🔧 Arm before starting
Any paid render · Kling b-roll · **anumang ad spend**.

```powershell
.\scripts\restore-git-identity.ps1
.\scripts\restore-gh.ps1
.\scripts\restore-hyperframes.ps1   # ffmpeg -> .tools\ffmpeg\...\bin
.\scripts\restore-codex.ps1
```

---

### How to maintain this file

**Overwrite it — never append.** History is `git log`'s job. Rewriting it is the **last**
action of every session that changed the state of the work. Keep it one screen — the
verifier fails past 90 lines.
