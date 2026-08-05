# NOW — the resume doc

**Stamped: 2026-08-05** (session 7, tanghali)

## ▶ NEXT ACTION — 🔴 PATAY ANG ADS. NASA GITNA TAYO NG PAGPALIT NG OFFER.

**Pinatay ni Neil ang `OCEANIDES-PRICE-01` noong 2026-08-05, 1:47 PM.**
₱482.79, 1,996 impressions, **77 landing page views, 0 lead.** Buong post-mortem
+ per-ad table: [`workflows/ad_performance_ledger.md`](workflows/ad_performance_ledger.md).

**Gumana ang ads** (₱6.27 kada bisita, panalo si km004-video, pinakamura si chalk
sa CPM). **Ang offer o ang page ang bumagsak.** Isa-isang pinatay ang bawat ibang
suspek: hindi pixel, hindi ang `utm` link, hindi ang form (sinubok mismo ni Neil,
dumating ang row), at **walang tumawag at walang nag-message** (kumpirmado ni Zam).

### 🔴 DESISYON NA GINAGAWA NGAYON — grill in flight

Lumilipat sa **tripwire + core** na hagdan. **NAPAGDESISYUNAN NA (2026-08-05):**

> **Si "Compliance-Pressured Paolo" (B2B) ang bibili, hindi si Helen (bahay).**
> Sya lang ang may pinagfa-filan ng reseta, sya ang bumabalik taon-taon, at ang
> tanong sa kanya ay *"tanggap ba to ng DENR"* — kayang sagutin ng papeles, hindi
> ng reviews na wala pa tayo.

⚠️ **Ibig sabihin nun: `home` ang tinarget ng patay na campaign. Mali na sya.**
Bagong targeting, bagong creative, bagong page ang kailangan ni Paolo.

✅ **KUMPIRMADO: kaya ng Oceanides ang papeles** (Neil, 2026-08-05) — kumpleto sa
DENR, **may LLDA na** (hinahanap ng malalaking kompanya), hauler na may MOA sa
treatment facility, nakakapag-issue ng manifest na nakapangalan sa kliyente, at
marami nang naibigay si Boss Jay. **₱12k-15k kada dokumentadong load, at 15 ARAW
bago dumating ang certificate mula sa partner** — kaya hindi sya pang-emergency.

🔴 **HARD GATE bago ang kahit anong ads, page, o creative: dapat DUMAAN at
MABAYARAN sa treatment facility ang bawat dokumentadong load, at galing sa
facility ang certificate.** Ang kabuuan ng ibinabayad ni Paolo ay ang hindi
mananagot sa RA 9275; kapag hindi totoo ang papel, ang panganib mismo ang
ibinebenta natin. **Hindi naman sya kailangan** — ₱6,500 na ang gross kada load
kahit bayad ang ₱6,000 na facility. Lunas: **unang labas ang ₱6,000 mula sa perang
hawak ni Neil sa PayMongo**, bago ang kahit ano. Buong dahilan: ledger §HARD GATE.

**Tapos na ang grill.** ➡️ **BUONG BUILD SPEC:
[`clients/oceanides/paolo-funnel-brief.md`](clients/oceanides/paolo-funnel-brief.md)**
— alok, page, teknikal, operasyon, AI report, at ang dalawang blocker. Buksan yun,
hindi ang chat. Sunod: sarahin ang gate (meeting kay Boss Jay), sagutin ang dalawang
blocker, tapos **copy sa SARIWANG session** (masyadong malalim ang session 7).

**Nagawa na, huwag nang ulitin:** avatar ni Paolo (`Oceanides market-research.md`
§2) at ang buong hagdan na may value stack (`offer-optimizer-denr-2026-07-20.md`,
⚠️ RAW at may 3 flag). Nakalista sa brief kung alin ang bawal dalhin nang buo.

## 🔴 Huwag kalimutan

1. **Route density ang lever, hindi presyo** (**A4**): ₱1,100 kada bisita kapag
   iisa sa maghapon, ~₱400 kapag apat. **Higpitan ang geo, isang siyudad muna.**
2. **Bawal ang CASH refund** sa tripwire — credit, hindi cash.
3. **A2:** sa KM-003, 41% ang nawala eksakto sa "libre ang tingin."
4. **Patay na ang ₱900 break-even.** Kay Paolo: **₱4,900 kada 1-load na trabaho**,
   ₱30,900 sa lima. Kaya nang gumastos ng hanggang ₱4,900 kada booked job.
5. **Coordinate radius ang geo, hindi region key** — lat `14.54` lng `121.02`.

## ✅ Tapos ngayong 2026-08-05 (session 7)

**Pixel-leak imbestigasyon: walang leak.** **`FormViewed` custom pixel event**
(`src/lib/pixel.ts` + `LeadForm.tsx`) — nasa pang-14 sa 17 section ang form at
walang scroll data, kaya hindi mapaghiwalay ang "nakita at umatras" sa "hindi
nakarating." **Ledger:** post-mortem, bagong **A4**, buong grill, HARD GATE.

⏳ **HINDI PA LIVE ang `FormViewed`.** Hindi git-connected ang funnel:
`cd funnels/oceanides-price-page && npx vercel deploy --prod --yes`

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
