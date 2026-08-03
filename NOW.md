# NOW — the resume doc

**Stamped: 2026-08-03** (session 4, gabi)

## ▶ NEXT ACTION — RUN ORDER (Neil). Huwag baligtarin.
🔴 **BASAHIN MUNA ANG `/kuya-marvin-ads` BAGO GUMALAW.**
🟢 **KUMPLETO NA ANG TATLONG CREATIVE.** Aprubado na ang `warranty-proof.png`
(Neil, gabi ng 2026-08-03). Wala nang creative na naghihintay sayo.

### A · Isang gate bago gumastos — $0, mga 3 minuto
1. **Mag-test submit sa `oceanidesph.com`**, hindi sa `.vercel.app`. Ang tanging
   `Lead` na pumutok noon ay galing sa `.vercel.app`, at dalawang beses nang
   na-deploy ang page mula noon. Tingnan sa Events Manager → Test events, tapos
   burahin ang test row. **Kapag hindi pumutok yan, ₱500 kada araw kang
   gagastusin na walang natututunan si Meta.**

### B · Buuin ang campaign — `kuya-gabriel/ads/CAMPAIGN-RUN-SHEET.md`
2. **Isulat ang ikatlong block** (naiwan 2026-08-03, ubos ang budget kaya bukas):
   `KM-004-AD-v1.mp4`, page ni Marvin `1184710811397498`, dulo ay
   `oceanidesph.com` na may `utm_content=km004-video`. Paste-ready na ang
   dalawang static block. ₱0 ang gastos nito, doc lang.
3. Ad account `4165212657057538` — Active, may Visa. CBO ₱500/araw, dataset
   `1050997330667084`, event `Lead`, NCR living-in, Advantage+. Kill gates at
   week-1 scoreboard nasa run sheet.

### C · Organic habang hinihintay
4. `kuya-gabriel/organic/PAGE-POSTS-PRE-AD.md` — sulat na ang lima, may larawan
   bawat isa. Isa kada araw, huwag baligtarin.

---

## ✅ Tapos ngayong gabi ng 2026-08-03 (session 4)

**BUHAY NA ANG PRICE PAGE.** Naka-deploy sa `oceanidesph.com`, tugma ang bundle
hash. Kasama si Gabriel bilang pangalawang field inspector.

**Apat na pagbabago sa offer, dumaan sa CMO** (`092fb5d`): (1) `form.reassurance`
— 8AM-5PM na oras ng tawag + ang anti-promise (*"hindi kami mangangako ng bukas
kung hindi namin kaya"*); (2) bagong dalawang-hanay na **₱2,500 vs ₱5,000**,
kasunod ng objectionReversal, walang bagong claim; (3) bagong **pangalawang
guarantee: ang "uuwi kami", may ₱0 na selyo**; (4) tinanggal ang FAQ #3, dahil
#2 na ang bahay nya.

🔴 **Dalawang bagay na huwag babaligtarin.** Ang bilis ng truck ay **hindi
pwedeng ipangako** (nakadepende sa available na truck, Neil) — ang tawag lang
ang ipinapangako. At ang ₱0 ay **hindi "libreng tingin"**: may tawag muna bago
umalis ang truck, doon nasasala ang ₱200-300 na biyaheng walang trabaho.

**⛔ TINANGGIHAN: ang Hormozi na priced value stack.** Nakasulat ang tatlong
dahilan sa header ng `funnel.config.ts` para hindi na muling imungkahi:
mangangailangan sya ng imbentong halaga sa page na ang buong benta ay totoo
lahat ng numero; tunog sya ng scammer sa market na sunog na sa "sobrang ganda
para totohanin"; at ang leak ay ang **CLOSE** (100 message, isang order), hindi
ang desire. Ang ginamit sa halip ay ang bakanteng bahagi ng Value Equation.

**Swipe carousel sa field inspector** (`607c5ff`). Lapad ang sanhi, hindi CSS:
140px lang bawat mukha sa loob ng dalawang hanay. Sariling hanay na ang litrato,
mga 350px sa PC at 270px sa cellphone. Purong CSS scroll-snap, walang library,
at nananatili sa rail (walang full-bleed) kasi print world to.

## 🅿 PARKED
**Oceanides:** GB-001 video (hinihintay ang boses ni Gabriel) · hook2 variant ng
KM-004 kung saan ang `UUWI KAMI` mismo ang hook, isang roll lang (basa ng CMO) ·
Kling b-roll kung may credit · watermark ni Gabriel · SEC Reg. No. · FB About ·
reviews sa Page · page #2 = DENR B2B · full-bleed na carousel sa cellphone.
**Grifon:** #94.3 next · #94.2 NOT-REPRO · #92+#89/#90 ride Slice B · #93 ⛔ TUNED.
⚠️ **Client world:** navy + amber print, no glass, no `#FFCC00` — `clients/oceanides/DESIGN.md`.

## ⛔ Gated · 🔧 Arm before starting
🔴 **UBOS ANG GEMINI API BUDGET NI NEIL.** Walang bagong Veo roll na makakadaan
sa gate. Manwal sa Flow ang bagong clip (720p lang ang libre). Gated pa rin:
Kling · anumang ad spend · ⚠️ kapag nag `npm install`, i-check ang
`package-lock.json`.

```powershell
.\scripts\restore-git-identity.ps1
.\scripts\restore-gh.ps1
.\scripts\restore-hyperframes.ps1   # ffmpeg -> .tools\ffmpeg\...\bin
.\scripts\restore-codex.ps1
```
⚠️ May sariling `node_modules` ang `funnels/oceanides-price-page` — `npm ci`
doon bago mag-build, kinakain sya ng defreezer. **Huwag i-pipe sa `tail`** —
ang exit code ng pipe ay galing sa `tail`, kaya nagre-report ng 0 ang pumalpak
na install (nangyari 2026-08-03). Kapag na-reject ng OS, `rm -rf node_modules`
muna bago ulitin.

---

### How to maintain this file

**Overwrite it — never append.** History is `git log`'s job. Rewriting it is the **last**
action of every session that changed the state of the work. Keep it one screen — the
verifier fails past 90 lines.
