# NOW — the resume doc

**Stamped: 2026-08-03** (session 3)
 
## ▶ NEXT ACTION — RUN ORDER (Neil). Huwag baligtarin.
🔴 **BASAHIN MUNA ANG `/kuya-marvin-ads` BAGO GUMALAW.**
🔴 **WAG I-ON HANGGAT WALA ANG TATLONG CREATIVE** — 2 static + 1 video.

### A · Mata ni Neil — $0, mga 5 minuto
1. **`clients/oceanides/out/warranty-proof.png`** — static #2 (30-araw warranty,
   totoong ba-1 litrato). Gawa, nababasa sa 375px, **wala pang hatol.** Ito na
   lang ang natitirang creative na naghihintay sayo.
2. **Deploy ng price page.** Dalawa na ang inspector dun (si Marvin at si
   Gabriel) at hindi pa naila-live. `cd funnels/oceanides-price-page &&
   npx vercel deploy --prod --yes`

### B · Buuin ang campaign — `kuya-gabriel/ads/CAMPAIGN-RUN-SHEET.md`
3. Paste-ready ang dalawang static block na may UTM. **Idagdag ang ikatlo:**
   `KM-004-AD-v1.mp4`, page ni Marvin `1184710811397498`, dulo ay
   `oceanidesph.com`. Kill gates at week-1 scoreboard nandoon.
4. Ad account `4165212657057538` — Active, may Visa. CBO ₱500/araw, dataset
   `1050997330667084`, event `Lead`, NCR living-in, Advantage+.

### C · Organic habang hinihintay
5. `kuya-gabriel/organic/PAGE-POSTS-PRE-AD.md` — sulat na ang lima, may larawan
   bawat isa. Isa kada araw, huwag baligtarin.

---

## ✅ Tapos ngayong 2026-08-03 (session 3)

**KM-004-AD-v1 — APPROVED ni Neil.** 29.97s, 720×1280, ibinalik ang script ng
GB-001 kay Marvin kasi data nya naman yun (hook nya sa KM-003, 98.5% sa 7,047
tao). 11 beat, 5 bayad na Veo roll. **Limang lever na wala pa sa GB-001 v3:**
per-word invert caption (unang beses na naitayo ang `spotlight`, naka-park sya
mula 2026-07-27), 9 na HTML overlay, may-kahulugang galaw ng b-roll, punch-in
sa edit, at isang segundong **katahimikan** bago ang `UUWI KAMI.`
Zero freeze, zero dead air, grade B, cropdetect `720:1280:0:0`.

**Apat na depektong nahuli ng verifier, hindi ng mata ko:** dalawang putol na
linya (render_audit), nakabaong subtitle ni Veo sa r3 (frame check), face-safe
violation sa `UUWI KAMI` (375px read), puting banda sa cards. **Tatlong hang at
isang patay na hangin ang nahuli ng TAINGA NI NEIL** — iisa ang ugat: 24fps na
source, 30fps na output, `zoompan` na dumodoble ng huling frame.

**Price page: dalawa na ang field inspector.** Si Marvin (bagong street-daylight
portrait, powder blue) at si Gabriel. Additive ang code — `second` prop, kapag
wala ay dating itsura. Naka-build, **hindi pa deployed.**

**Nalinis ang 204 MB** at naka-hook na ang `tools/ad_asset_sweep.mjs` sa
SessionStart para hindi na matambakan. Walong bagong aral sa `agent_lessons.md`.

## 🅿 PARKED
**Oceanides:** GB-001 video (hinihintay ang boses ni Gabriel, walang clone) ·
hook2 variant ng KM-004 kung saan ang `UUWI KAMI` mismo ang hook — isang roll
lang ang gastos, at nakabaon sa 20s ang pinakamalakas nating linya (basa ng CMO)
· Kling b-roll kung may credit ang hiwalay na account · watermark ni Gabriel na
wala kay Marvin · SEC Reg. No. · FB About · reviews sa Page · page #2 = DENR B2B.
**Grifon:** #94.3 next · #94.2 NOT-REPRO · #92+#89/#90 ride Slice B · #93 ⛔ TUNED.
⚠️ **Client world:** navy + amber print, no glass, no `#FFCC00` — `clients/oceanides/DESIGN.md`.

## ⛔ Gated · 🔧 Arm before starting
🔴 **UBOS ANG GEMINI API BUDGET NI NEIL.** Naka-lock sa 4 ang `maxPaidRolls` ng
KM-004 = eksaktong nagamit. Walang bagong Veo roll na makakadaan sa gate.
Manwal sa Flow ang bagong clip (720p lang ang libre). Gated pa rin: Kling ·
anumang ad spend · ⚠️ kapag nag `npm install`, i-check ang `package-lock.json`.

```powershell
.\scripts\restore-git-identity.ps1
.\scripts\restore-gh.ps1
.\scripts\restore-hyperframes.ps1   # ffmpeg -> .tools\ffmpeg\...\bin
.\scripts\restore-codex.ps1
```
⚠️ May sariling `node_modules` ang `funnels/oceanides-price-page` — `npm ci`
doon bago mag-build, kinakain sya ng defreezer.

---

### How to maintain this file

**Overwrite it — never append.** History is `git log`'s job. Rewriting it is the **last**
action of every session that changed the state of the work. Keep it one screen — the
verifier fails past 90 lines.
