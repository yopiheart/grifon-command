# NOW — the resume doc

**Stamped: 2026-08-04** (session 5, madaling-araw)

## ▶ NEXT ACTION — 🟢 BUHAY NA ANG UNANG CAMPAIGN

**`OCEANIDES-PRICE-01` ay ACTIVE mula 2026-08-04.** ₱500/araw, 4 static, NCR.
Ang agent ang gumawa at nag-ON, hindi si Neil. Buong tala:
[`workflows/ad_performance_ledger.md`](workflows/ad_performance_ledger.md).

### A · Sa umaga, tatlong bagay (Neil)
1. **Tingnan kung Active nga ang apat na ad**, hindi `In review` na natigil o
   `Rejected`. Bagong account, kaya doon lalabas kung may policy flag.
2. **I-upload nang manwal ang `KM-004-AD-v1.mp4`** sa Ads Manager at idagdag sa
   ad set `120248564354250056`. **Hinarang ng Meta ang upload tool sa API**, kaya
   ito lang ang hindi ko nagawa. Piliin ang unang frame bilang thumbnail o
   i-upload ang `clients/oceanides/kuya-marvin/ads/km-004/KM-004-thumb-frame0.png`.
3. **Ikabit ang Instagram account** sa ad account — gated din ang lookup tool,
   kaya **Facebook lang ang delivery ngayon.**

### B · Kapag kumpirmado nang maayos ang delivery (agent)
4. Linisin ang pansamantalang hosting: `funnels/oceanides-price-page/public/ad/`
   at ang `*.mp4` sa `public/`, tapos i-redeploy. Hinayaan silang naka-host
   para hindi masira ang buhay na ads sa gitna ng gabi. May sariling hash na si
   Meta sa apat na larawan, kaya ligtas na sila burahin.

### C · Organic habang tumatakbo
6. `clients/oceanides/kuya-gabriel/organic/PAGE-POSTS-PRE-AD.md` — isa kada araw.

### 🆕 Talaan ng booking — buhay na
**`https://oceanidesph.com/ops`** — dito nakikita at pinupunan ni Zam ang bawat lead:
status, **magkano**, address, notes. May password, nasa `OPS_PASSPHRASE` (hindi nakasulat
sa repo; tingnan ang `workflows/funnel_deploys.md` kung paano palitan).
🔴 **Punan ang Magkano kada tapos na trabaho.** Kasama nun ang `utm_content`, at yun ang
tanging paraan para masagot kung **aling ad ang may booked job**, hindi lang kung alin ang
may murang lead. Yun mismo ang A3 na bitag ng KM-003.

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
carousel sa dalawang inspector, at naipasa ang `Lead` sa apex. ⛔ Tinanggihan ang
Hormozi na priced value stack (nasa header ng `funnel.config.ts` ang dahilan).

**Dalawang bagong static:** `hooktest-chalk-tankcover` (S34/S35 ni Brunson, tisa
sa takip, **walang logo** bilang sadyang A/B) at `advertorial-price` (Suby na
anyo ng artikulo, **hindi** pekeng balita).

**Sinuspinde at naibalik ang `ad-spend-gate.sh`** — may sentinel-file na switch
sya ngayon. Unang beses na gumastos ang agent, may basbas ni Neil.

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

**Overwrite it — never append.** History is `git log`'s job. Rewriting it is the **last**
action of every session that changed the state of the work. Keep it one screen — the
verifier fails past 90 lines.
