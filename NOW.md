# NOW — the resume doc

**Stamped: 2026-08-04** (session 5, madaling-araw)

## ▶ NEXT ACTION — 🟢 BUHAY NA ANG UNANG CAMPAIGN

**`OCEANIDES-PRICE-01` ay ACTIVE mula 2026-08-04.** ₱500/araw, NCR, at **LIMA
na ang ad** — pasok na ang `km004-video` at sya pa ang pinakamalakas ang
delivery sa unang oras. Buong tala:
[`workflows/ad_performance_ledger.md`](workflows/ad_performance_ledger.md).

### A · Natitira (Neil)
1. **Gumawa ng Instagram** para sa page (wala pa), tapos ikabit sa ad account —
   FB placements lang ang tumatakbo hanggat wala.

### B · ✅ Tapos (session 6, umaga 2026-08-04)
- Kumpirmado sa API: **lahat ng LIMANG ad ay ACTIVE**, walang In review o
  Rejected sa bagong account.
- Nalinis ang temp hosting (`public/ad/` + mp4), na-redeploy, verified: 404 na
  ang temp files, 200 pa rin ang `/` at `/thank-you`.

### C · Organic habang tumatakbo
- **Kay KUYA MARVIN ang organic, hindi kay Gabriel** (Neil, 2026-08-04):
  `clients/oceanides/kuya-marvin/organic/PAGE-LAUNCH-POSTS.md` — isa kada araw.
- Nag-propose si Neil ng value-driven organic, Fibo Lim ang modelo — susunod na
  pag-uusapan; may dala syang inspiration posts.

### 🆕 Talaan ng booking — buhay na
**`https://oceanidesph.com/ops`** — dito nakikita at pinupunan ni Zam ang bawat lead:
status, **magkano**, address, notes. May password, nasa `OPS_PASSPHRASE` (hindi nakasulat
sa repo; tingnan ang `workflows/funnel_deploys.md` kung paano palitan).
🔴 **Punan ang How much kada tapos na trabaho.** Kasama nun ang `utm_content`, at yun ang
tanging paraan para masagot kung **aling ad ang may booked job**, hindi lang kung alin ang
may murang lead. Yun mismo ang A3 na bitag ng KM-003.

**Apat na kulang, sinunod ang bigat** (sinabi kay Neil 2026-08-04, hindi pa ginagawa):
**(1) abiso** — kapag hindi bubuksan ni Zam, hindi nya alam na may pumasok; ang lead na
umupo ng tatlong oras ay tumawag na sa iba. Hook point: `api/lead.ts`. **(2) buod kada ad**
— nandyan ang datos pero manwal pa ang pagbibilang kung aling ad ang may pinakamaraming
booked job. **(3)** kusang refresh. **(4)** search + export. Ginhawa lang ang huling dalawa.

---

## 🔴 Tatlong bagay na huwag kalimutan

1. **MAGBILANG NG BOOKED JOB, hindi lang lead.** Nakasulat sa lead ang kill gates,
   nasa **₱900 kada booked job** ang break-even. Apat na trabaho kada linggo para
   patas lang. Yun ang bitag na pumatay sa KM-003 (A3): pasado sa lahat ng gate,
   isang order.
2. **Coordinate radius ang geo, hindi region key** — lat `14.54` lng `121.02`,
   20km mula Makati, `home`. Kinopya sa KM-003. Walang region-lookup tool ang
   connector, kaya ito lang ang eksaktong paraan.
3. **`has_payment_method: false` ay HINDI sira** — nasa portfolio nakakabit ang
   card. **Test Events ang mali, hindi ang pixel** — third-party cookie blocking.
   Ang tamang tingin ay Network tab (`ev=Lead` + `200`).

## ✅ Tapos ngayong 2026-08-03/04

**Buhay ang price page** — apat na pagbabago sa offer na dumaan sa CMO, swipe
carousel, naipasa ang `Lead` sa apex. ⛔ Tinanggihan ang Hormozi na value stack.
**Dalawang bagong static:** `hooktest-chalk-tankcover` (S34/S35 ni Brunson,
**walang logo** bilang sadyang A/B) at `advertorial-price` (Suby, **hindi**
pekeng balita). **Sinuspinde at naibalik ang `ad-spend-gate.sh`** — may
sentinel-file na switch sya ngayon. Unang beses na gumastos ang agent.

## 🅿 PARKED
**Oceanides:** GB-001 video · hook2 variant ng KM-004 · Kling b-roll · watermark
ni Gabriel · SEC Reg. No. · FB About · reviews sa Page · page #2 = DENR B2B.
**Grifon:** #94.3 next · #94.2 NOT-REPRO · #92+#89/#90 ride Slice B · #93 ⛔ TUNED.
⚠️ **Client world:** navy + amber print, no glass, no `#FFCC00`.

## ⛔ Gated · 🔧 Arm before starting
🔴 **UBOS ANG GEMINI API BUDGET.** Manwal sa Flow ang bagong clip. Gated: Kling.
```powershell
.\scripts\restore-git-identity.ps1
.\scripts\restore-gh.ps1
.\scripts\restore-hyperframes.ps1
.\scripts\restore-codex.ps1
```
⚠️ May sariling `node_modules` ang `funnels/oceanides-price-page` — `npm ci` doon
bago mag-build. **Huwag i-pipe sa `tail`**, galing sa `tail` ang exit code.

---

### How to maintain this file
**Overwrite, never append** — history is `git log`'s job. Rewriting it is the last
action of every session that changed the work. Verifier fails past 90 lines.
