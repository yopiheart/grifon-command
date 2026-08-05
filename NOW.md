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

**Nakabinbin: Tanong 2 — kaya ba talagang gumawa ng Oceanides ng DENR manifest,
Certificate of Proper Disposal, at Annual Compliance Certificate?** Buong hagdan
ni Paolo ay PAPELES ang binebenta. Kung hindi natin sya kayang ilabas, patay ang
buong plano. Wala ang sagot sa repo.

**Sunod na nakapila:** pisikal na hugis at gastos ng check (kailangan ba ng
truck?) · no-show risk · online checkout laban sa cash-on-arrival · capacity.

### Nabuong sanggunian (huwag nang ulitin — nagawa na)
- **Buong hagdan ni Paolo, may value stack:** `clients/oceanides/offer-optimizer-denr-2026-07-20.md`
  ⚠️ **RAW, hindi approved.** Tatlong flag sa loob: `₱9,500` core ay **lumalabag
  sa ₱12k/load floor** · **imbentong penalty-payment guarantee** (bawal sa copy
  hangga't walang tanggap ni Neil) · **pinark ang paid tripwire, "libre muna"**
  hangga't walang hiwalay na desisyon. **Yung hiwalay na desisyon ay ITO mismo.**
- **Avatar ni Paolo:** `clients/oceanides/Oceanides market-research.md` §2.
  Hindi na kailangan ng bagong market research.

## 🔴 Huwag kalimutan

1. **Ang ₱1,100 (inspector ₱500 + transport ₱600) ang SAHIG ng kahit anong bayad
   na check** — pattern **A4** sa ledger. Pero **hango sa ₱5,000 core** ang lumang
   "₱999" na rekomendasyon; iba na ang math kapag ₱48k ang core ni Paolo.
2. **Bawal ang CASH refund** sa tripwire — credit, hindi cash. Ang "ibabalik namin
   kung hindi puno" ang pinakamahal na kaso (₱1,100 gastos + ₱499 balik).
3. **A2 sa ledger:** sa KM-003, 41% ang nawala eksakto sa "libre ang tingin."
   Sariling babala natin laban sa diagnostic offer.
4. **MAGBILANG NG BOOKED JOB, hindi lead.** Break-even ₱900 kada booked job (A3).
5. **Coordinate radius ang geo, hindi region key** — lat `14.54` lng `121.02`.

## ✅ Tapos ngayong 2026-08-05 (session 7)

**Pixel-leak imbestigasyon: walang leak** — buhay ang dataset, host lang ang
naka-register kaya walang epekto ang `utm` link kada ad, at apat na host lang
natin ang nagpaputok sa 7 araw. **`FormViewed` custom pixel event** (`src/lib/pixel.ts`
+ `LeadForm.tsx`) — nasa pang-14 sa 17 section ang form at wala tayong scroll
data, kaya hindi mapaghiwalay ang "nakita at umatras" sa "hindi nakarating."
`trackCustom` para hindi magalaw ang AEM ranking. **Ledger:** buong post-mortem
+ bagong pattern **A4** (visit-cost floor ng tripwire).

⏳ **HINDI PA LIVE ang `FormViewed`.** Hindi git-connected ang funnel:
```bash
cd funnels/oceanides-price-page && npx vercel deploy --prod --yes
```

## 🅿 PARKED

**Oceanides:** Week 02 pack · GB-001 video · hook2 ng KM-004 · Kling b-roll ·
watermark ni Gabriel · SEC Reg. No. · FB About · reviews · page #2 DENR B2B ·
**AEM Configure Web Events hindi pa na-verify** (`Lead` dapat #1 sa
`oceanidesph.com`; browser + desktop mode, wala sa app).
**Grifon:** #94.3 next · #94.2 NOT-REPRO · #92+#89/#90 ride Slice B · #93 ⛔ TUNED.
⚠️ **Client world:** navy + amber print, no glass, no `#FFCC00`.

## ⛔ Gated · 🔧 Arm before starting

🔴 **UBOS ANG GEMINI API BUDGET.** Manwal sa Flow ang bagong clip. Gated: Kling.
`.\scripts\restore-git-identity.ps1` · `restore-gh.ps1` · `restore-codex.ps1`
⚠️ May sariling `node_modules` ang `funnels/oceanides-price-page` — `npm ci` doon
bago mag-build. **Huwag i-pipe ang build/deploy output** — pinapatay ang exit code.

---

### How to maintain this file
**Overwrite, never append.** Rewriting it is the last action of any session that
changed the work. Verifier fails past 90 lines.
