# NOW — the resume doc

**Stamped: 2026-08-04** (session 6, umaga)

## ▶ NEXT ACTION — 🟢 CAMPAIGN LIVE + KUMPLETO NA ANG ZAM TOOLKIT

**`OCEANIDES-PRICE-01` ACTIVE, LIMA ang ad** (kasama ang km004-video, sya pa ang
pinakamalakas). Kumpirmado 2:35 AM: lahat delivering, walang rejected, ~₱8 pa
lang gastos. Ledger: [`workflows/ad_performance_ledger.md`](workflows/ad_performance_ledger.md).

### A · Kay Neil (mga pipindutin lang, ready na lahat ng file)
1. **FB page refresh ni Marvin:** profile = `profile-5-frontal-van-2026-08-sq.png`,
   cover = `cover-4-zam-number.png` (nasa `clients/oceanides/kuya-marvin/profile-assets/`),
   bagong bio (nasa chat 2026-08-04), **Call button → 0935 258 9927 (Zam)**,
   i-check ang Messenger instant reply kung may lumang number.
   Profile pic description: pinili na ba sa 3 options? (Option A ang recommend.)
2. **Ipasa sa admin:** `https://oceanidesph.com/pack/km-week-01.html` (Linggo 1
   posting pack, isang post kada araw 6PM, may copy buttons).
3. **Sabihan sina Zam/Ejay:** bagong password (rotated 2026-08-04, kay Neil ang
   value) + ang bagong `https://oceanidesph.com/presyo`.
4. **Gumawa ng Instagram** tapos ikabit sa ad account (FB lang muna ngayon).

### B · Bantayan habang tumatakbo
- **Si Zam: punan ang How much sa `/ops` kada tapos na trabaho.** Yun lang ang
  sasagot kung aling ad ang may BOOKED JOB. Break-even **₱900 kada booked job**,
  ~4 trabaho kada linggo. Yan ang bitag na pumatay sa KM-003 (A3).
- Agent, susunod na session: basahin ang unang araw ng delivery data.

### C · Zam toolkit — buhay na lahat (2026-08-04)
- **`/ops`** = booking list. **`/presyo`** = presyo cheat sheet: location check
  (NCR + provincial city rates NA MAY +₱1,500 NA, wag nang dagdagan), kalapit-
  lugar fallback, spiels na puting chat bubble na may copy, 7-field form, bawal
  list. Source of truth ng rates: `src/pages/Presyo.tsx` mismo.
- Registry + rotation runbook (⚠️ bash printf LANG, may PowerShell `\r` trap):
  `workflows/funnel_deploys.md`.

---

## 🔴 Huwag kalimutan

1. **MAGBILANG NG BOOKED JOB, hindi lang lead** (tingnan ang B sa taas).
2. **Coordinate radius ang geo, hindi region key** — lat `14.54` lng `121.02`,
   20km, `home`. Walang region-lookup ang connector.
3. **`has_payment_method: false` ay HINDI sira** (portfolio card) at **Test
   Events ang mali, hindi ang pixel** — Network tab ang tamang tingin.
4. **Number change:** tanggal na ang dalawang number ni Boss Jay sa lahat ng
   BAGONG creative; ~26 lumang templates may luma pa — palitan bago i-render
   ulit (nakatala sa `workflows/oceanides_kuya_marvin_brand.md`).

## ✅ Tapos ngayong 2026-08-04 (session 6)

**Value Week 01** — 7 organic posts (Fibo model, decoded mula sa 7 totoong post
nya), 6 bagong Marvin stills (iba-iba ang suot/angle/register), 4 hook cards +
BA composite, posting pack sa `/pack/km-week-01.html` + artifact twin.
**Page refresh assets** — bagong frontal profile still, cover na kay Zam na ang
number, bio copy. **`/presyo` cheat sheet** shipped + provincial rates + form
80/20 + chat-bubble spiels. **OPS_PASSPHRASE rotated.** Temp ad hosting nalinis.

## 🅿 PARKED

**Oceanides:** Week 02 pack (hihintayin ang Week 01 engagement; may 3 CD tweaks
sa card template sa chat 2026-08-04) · GB-001 video · hook2 ng KM-004 · Kling
b-roll · watermark ni Gabriel · SEC Reg. No. · FB About · reviews · page #2
DENR B2B · s3 still may bahagyang extra tattoo (kung regen o hayaan).
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
bago mag-build. **Huwag i-pipe ang build/deploy output** (`tail`, `Select-Object
-First`) — pinapatay nito ang exit code; nadale ulit 2026-08-04.

---

### How to maintain this file
**Overwrite, never append** — history is `git log`'s job. Rewriting it is the last
action of any session that changed the work. Verifier fails past 90 lines.
