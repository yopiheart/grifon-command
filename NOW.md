# NOW — the resume doc

**Stamped: 2026-08-06** (session 8)

## ▶ NEXT ACTION — 🟡 NAPAGKASUNDUAN ANG GATE, HINDI PA SARADO. ITAYO, WAG BUKSAN.

**PATAY ANG ADS mula 2026-08-05** (`OCEANIDES-PRICE-01`: ₱482.79, 77 landing page
views, 0 lead). Lumilipat kay **"Compliance-Pressured Paolo"** (B2B). Post-mortem:
[`workflows/ad_performance_ledger.md`](workflows/ad_performance_ledger.md).

**Kausap na ni Neil si Boss Jay (2026-08-06), apat sa apat, kumpirmado:** dumadaan
sa facility ang bawat load, **100% sang-ayon** sa ₱6,000/load diretso sa facility
bago ang ibang payout, **normal na 15 araw** ang certificate, at **buhay pa ang
₱1,600 na payout** (inspector ₱500 + transport ₱600 + Zam ₱250 + Neil ₱250).

🔴 **PANGAKO PA LANG ITO. Wala pang load na dumaan, walang certificate na hawak.**
Sabi mismo ng gate: *totoo ang papel dahil binayaran sya, hindi dahil may
nagpaalam.* **Sarado sya kapag may isang load na diretsong binayaran ni Neil sa
facility + may certificate na hawak.** Bago iyon: itayo ang lahat, **wag buksan.**

➡️ **BUILD SPEC:** [`clients/oceanides/paolo-funnel-brief.md`](clients/oceanides/paolo-funnel-brief.md) ·
**COPY:** [`clients/oceanides/paolo-page-copy.md`](clients/oceanides/paolo-page-copy.md). Buksan yun, hindi ang chat.

✅ **NAKATAYO NA ANG PAGE:** `funnels/oceanides-paolo/` (2026-08-06). Build green,
pasado sa smoke sa 390 at 1440. **Hindi pa naka-deploy, patay ang pixel**, may
dalawang `⟦PENDING⟧` sa loob.

**Sunod:**
1. 🔴 **TAWAGAN ANG SUPERVISOR NG FACILITY — ito ang humaharang sa lahat.**
   Buong script + apat na tanong: [`clients/oceanides/facility-call-script.md`](clients/oceanides/facility-call-script.md).
   Tapos ituro ang **susunod na DENR job** na papasok sa bagong proseso — hindi
   kailangang galing sa funnel ang proof load.
1b. 🔴 **SA PAREHONG MESSAGE KAY BOSS JAY: sino ang mga na-issuehan nya ng DENR
   certificate?** Klase ng negosyo, siyudad, sino ang nagpa-follow-up. **Hindi pa
   sarado ang target-market validation** (nakalista syang OPEN sa
   `market-research.md` §5 mula pa 2026-07-20). Yan ang tanging totoong listahan
   ng bumibiling Paolo na hawak natin, at libre sya.
2. Punan ang dalawang `⟦PENDING⟧` (dalawang string lang), tapos deploy:
   `cd funnels/oceanides-paolo && npx vercel deploy --prod --yes` → env var
   (kamay ni Neil ang service key) → **redeploy**, kundi walang epekto ang env.
3. 🆕 **Dalawang alok, naka-preselect ang mas mahal** (aral sa IM8): ₱999 na
   check laban sa **Annual Compliance Plan**. Taon-taon ang renewal ni Paolo at
   isang bisita lang ang inaalok natin. Kailangan muna ang presyo sa facility.
4. Checkout. ⏳ Hinihintay ang **PayMongo keys ng Oceanides**. ⛔ Hindi ang key
   ng Grifon sa root `.env`.
5. Bagong creative at targeting — **`home` ang luma, mali na sya.** ⏳ Aling
   siyudad ang una (isa lang, hindi 20km).

**Nagawa na, huwag ulitin:** avatar ni Paolo (`market-research.md` §2, **wag nang
mag-bagong research**, pero **bukas pa ang target-market validation** sa §5),
value stack (`offer-optimizer-denr-2026-07-20.md`, ⚠️ RAW), grill (session 7),
pixel-leak (walang leak), copy + page ni Paolo.

## 🔴 Huwag kalimutan

1. **Route density ang lever, hindi presyo** (**A4**): ₱1,100 kada bisita kapag
   iisa sa maghapon, ~₱400 kapag apat. **Isang siyudad muna.**
2. **Bawal ang CASH refund** sa tripwire, credit, isang taon ang bisa.
3. **A2:** sa KM-003, 41% ang nawala eksakto sa "libre ang tingin."
4. **Patay na ang ₱900 break-even.** Kay Paolo: **₱4,900 kada 1-load na trabaho**.
5. **Coordinate radius ang geo, hindi region key** — lat `14.54` lng `121.02`.
6. ⚠️ **Enterprise ang malalaking pangalan sa client list** (Ayala, Jollibee,
   Uniqlo). Galing sila sa procurement at referral, **hindi sa Facebook ad.**
   Yan ang pinakamalaking hindi pa napapatunayang hula ng buong plano.

## ✅ Tapos ngayong 2026-08-06 (session 8)

Napagkasunduan ang **HARD GATE** kasama si Boss Jay (pangako pa lang, hindi pa
sarado). Sinara ang **"sariling sistema"** thread. Buong copy ni Paolo
(`paolo-page-copy.md`) at **itinayo ang page** (`funnels/oceanides-paolo/`):
17 section, form pang-6, build green, pasado sa smoke sa 390 at 1440.

**Apat na pag-ayos gabi ng 08-06 (review ni Neil):** inalis ang ₱12-15k sa hero
ticket at nasa FAQ na sya (nag-anchor tayo sa presyo natin bago sa risk niya) ·
pinalitan ang "isang presyo, hindi range" (kay Helen yun) · **5 qualifier naging
3** · bagong FAQ sa presyo ng load. ⛔ Tinanggihan: ang may-presyong value stack
ng IM8, parehong 3 dahilan ng 2026-08-03.

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
