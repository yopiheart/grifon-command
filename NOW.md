# NOW — the resume doc

**Stamped: 2026-08-06** (session 8)

## ▶ NEXT ACTION — 🟡 NAPAGKASUNDUAN ANG GATE, HINDI PA SARADO. ITAYO, WAG BUKSAN.

**PATAY ANG ADS mula 2026-08-05** (`OCEANIDES-PRICE-01`: ₱482.79, 77 landing page
views, 0 lead). Lumilipat kay **"Compliance-Pressured Paolo"** (B2B) — bagong page,
bagong creative, bagong targeting. Post-mortem: [`workflows/ad_performance_ledger.md`](workflows/ad_performance_ledger.md).

**Kausap na ni Neil si Boss Jay (2026-08-06) — apat sa apat, kumpirmado:** dumadaan
sa facility ang bawat load at babayaran ang nararapat (sinabihan sya nang diretso
ni Neil na hindi papayag na dodoctorin ang certificate), **100% sang-ayon** sa
mekanismong ₱6,000/load diretso sa facility bago ang ibang payout, **normal na 15
araw** ang certificate, at **buhay pa ang ₱1,600 na payout system** (inspector ₱500
+ transport ₱600 + Zam ₱250 + Neil ₱250).

🔴 **PANGAKO PA LANG ITO. Wala pang load na dumaan, walang certificate na hawak.**
Sabi mismo ng gate: *totoo ang papel dahil binayaran sya, hindi dahil may
nagpaalam.* **Sarado sya sa araw na may isang load na diretsong binayaran ni Neil
sa facility + may certificate na hawak.** Bago iyon: itayo ang lahat, **wag lang
buksan.**

✅ **Sariling sistema ni Neil, hindi na dependent kay Boss Jay — pareho** (logistics
AT financial), phased: mga contact ni Boss Jay muna sa hauler at dispatch habang
naghahanap ng sarili, at diretso na si Neil ang nakikipag-transact sa supervisor
ng facility para sa pera (walang middleman).

➡️ **BUONG BUILD SPEC:** [`clients/oceanides/paolo-funnel-brief.md`](clients/oceanides/paolo-funnel-brief.md).
Buksan yun, hindi ang chat.

**Sunod:**
1. 🔴 **Unang tawag sa supervisor ng facility** — tatlong tanong na hindi kayang
   hulaan (ledger §HARD GATE): **saan kinukuha ang waste** (may pagitan ba na
   pinaghahaluan ng load ng ibang kliyente?), **kailan ang bayad** (sa pickup o
   sa day-15?), **magkano talaga** (tantsa pa rin ang ₱6,000).
2. Copy ng page (`grifon-cmo` + `grifon-creative-director`) sa **sariwang session**
   — masyadong malalim ang session 7/8 para sa magandang copy.
3. Checkout (`code-executor` o `codex-executor`, may buong brief).
4. Bagong creative at bagong targeting — **`home` ang luma, mali na sya.**

**Nagawa na, huwag nang ulitin:** avatar ni Paolo (`Oceanides market-research.md`
§2), value stack (`offer-optimizer-denr-2026-07-20.md`, ⚠️ RAW may 3 flag), buong
grill ng offer (session 7), pixel-leak imbestigasyon (walang leak — `FormViewed`
event nasa `src/lib/pixel.ts` + `LeadForm.tsx`).

## 🔴 Huwag kalimutan

1. **Route density ang lever, hindi presyo** (**A4**): ₱1,100 kada bisita kapag
   iisa sa maghapon, ~₱400 kapag apat. **Higpitan ang geo, isang siyudad muna.**
2. **Bawal ang CASH refund** sa tripwire — credit, hindi cash.
3. **A2:** sa KM-003, 41% ang nawala eksakto sa "libre ang tingin."
4. **Patay na ang ₱900 break-even.** Kay Paolo: **₱4,900 kada 1-load na trabaho**,
   ₱30,900 sa lima. Kaya nang gumastos ng hanggang ₱4,900 kada booked job.
5. **Coordinate radius ang geo, hindi region key** — lat `14.54` lng `121.02`.
6. ⏳ **HINDI PA LIVE ang `FormViewed`.** Hindi git-connected ang funnel:
   `cd funnels/oceanides-price-page && npx vercel deploy --prod --yes`

## ✅ Tapos ngayong 2026-08-06 (session 8)

Napagkasunduan ang **HARD GATE** kasama si Boss Jay — apat na kondisyon, pero
**pangako pa lang, hindi pa sarado.** Sinara ang **"sariling sistema"** thread —
pareho (logistics + financial), phased. Nalabas ang tatlong tanong sa facility
na hindi kayang hulaan. Na-update ang ledger + brief.

## 🅿 PARKED

**Oceanides:** Week 02 pack · GB-001 video · hook2 ng KM-004 · Kling b-roll ·
watermark ni Gabriel · SEC Reg. No. · FB About · reviews · page #2 DENR B2B ·
**AEM Configure Web Events hindi pa na-verify** (`Lead` dapat #1 sa
`oceanidesph.com`; browser + desktop mode, wala sa app).
**Grifon:** #94.3 next · #94.2 NOT-REPRO · #92+#89/#90 ride Slice B · #93 ⛔ TUNED. ⚠️ **Client world:** navy + amber print, no glass, no `#FFCC00`.

## ⛔ Gated · 🔧 Arm before starting

🔴 **UBOS ANG GEMINI API BUDGET.** Manwal sa Flow ang bagong clip. Gated: Kling.
`.\scripts\restore-git-identity.ps1` · `restore-gh.ps1` · `restore-codex.ps1`
⚠️ Sariling `node_modules` ang `funnels/oceanides-price-page` (`npm ci` doon bago mag-build) · **huwag i-pipe ang build/deploy output**, pinapatay nito ang exit code.

---

### How to maintain this file
**Overwrite, never append.** Rewriting it is the last action of any session that
changed the work. Verifier fails past 90 lines.
