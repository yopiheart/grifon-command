# NOW — the resume doc

**Stamped: 2026-08-05** (session 8, madaling araw)

## ▶ NEXT ACTION — 🟢 COCKPIT LIVE · ❗ KAILANGAN ANG BILANG NI ZAM

**Tawag Cockpit v0 LIVE sa `/ops`** (`79495d9`) — briefing card kada lead, 3
objection cards, objection + follow-up log. Plano:
[`clients/oceanides/tawag-cockpit-plan.md`](clients/oceanides/tawag-cockpit-plan.md).

### A · Kay Neil
1. ❗ **Tanungin si Zam: ilan ang TUMAWAG o nag-Messenger mula 08-04?** Ito ang
   nag-iisang datos na wala sa Ads Manager — 59 LPV, 0 form, pero may Call
   button at Messenger ang page, kaya baka dun dumadaan ang leads. **Ang form
   ang sinusukat ng pixel, hindi ang tawag.** Kapag zero din si Zam sa susunod
   na ~40 LPV, saka ang page ang suspek (presyo nasa taas, form nasa dulo).
2. **Eyeball ng naka-login na `/ops`** sa PC at phone (ikaw ang huling gate):
   lead card → presyo → 3 cards → objection pindot → follow-up date → tunog.
3. **Kay Zam:** live na ang cockpit; **para sa pagpapabuti ng cards ang log,
   hindi panukat sa kanya** (premortem bitag #1).
4. Dating listahan (buhay pa): FB page refresh ni Marvin · `/pack/km-week-01.html`
   sa admin · password + `/presyo` kina Zam/Ejay · Instagram.

### B · Bantayan habang tumatakbo
- **`OCEANIDES-PRICE-01` day 2:** kabayo na ng CBO ang **km004-video** (48% ng
  spend, 37/59 LPV, 21% video completion). **hooktest-chalk** pinakamura
  (₱3.68/LPV, ₱125 CPM) — pangalawang brand signal para sa S34.
  **warranty-proof sinakal na ng CBO** (₱846 CPM) — opsyonal ang pause. Walang
  galaw sa budget; break-even **₱900 kada BOOKED job**. Buong basa:
  [`workflows/ad_performance_ledger.md`](workflows/ad_performance_ledger.md).
- **Cockpit metrics pagkatapos ng unang 20 leads:** bilis ng unang tawag +
  booking rate (plan doc §4).

### C · Zam toolkit
- **`/ops`** = booking list + Tawag Cockpit. **`/presyo`** = presyo cheat sheet.
- ⚠️ **Rates source of truth: `src/lib/rates.ts`**, HINDI na `Presyo.tsx`.
  Runbook: `workflows/funnel_deploys.md` (bash printf LANG, PowerShell `\r` trap).

---

## 🔴 Huwag kalimutan

1. **SQL bago deploy** — nakasulat sa commit `79495d9`.
2. **MAGBILANG NG BOOKED JOB, hindi lang lead.**
3. **Coordinate radius ang geo** — lat `14.54` lng `121.02`, 20km, `home`.
4. **Number change:** ~26 lumang templates may number pa ni Boss Jay — palitan
   bago i-render ulit (`workflows/oceanides_kuya_marvin_brand.md`).

## ✅ Tapos ngayong 2026-08-05 (session 8)

**PRICE-01 day-2 pull** (`9bc0860`) — 59 LPV, 0 form, km004 ang kabayo, chalk
pinaka-episyente; buong basa sa ledger. **Waymo/Dolgov brief eval** — hatol:
digital tayo sa lahat ng 4 gaps, wag gayahin ang nines-maximalism; isang tunay
na apply lang: **closed-loop simulated-user eval harness bilang HARD GATE bago
buuin ang AUTO Director brain** — 5 personas + transcript-level critic, nakasulat
sa `workflows/concierge_director_plan.md` §2 (katabi ng skills-as-workforce note).
**Cherny/Claude Code brief eval** — hatol: ZERO edits, doctrine na natin lahat;
ang Autopilot positioning frame lang ang na-park sa `post_beta_roadmap.md` #2.
**Repo tune-up** — LUMA NA ang "vitest sirang-sira": buong suite GREEN (1106
passed, 26 skipped) + build pasado; lockfile na-sync sa npm 11 (`323da07`).
NOIR artifact spec lumipat sa `workflows/artifact_noir_style.md` — mas payat
na ang CLAUDE.md boot, pointer na lang ang naiwan.

## 🅿 PARKED

**Oceanides:** Week 02 pack · GB-001 video · hook2 ng KM-004 · Kling b-roll ·
watermark ni Gabriel · SEC Reg. No. · FB About · reviews · page #2 DENR B2B.
**Cockpit phases:** v1 autopsy (gate: may laman ang objection log + consent line
kay Zam) · v2 chat copilot · Phase 2 Grifon high-ticket lane (English).
**Grifon:** #94.3 next · #92+#89/#90 ride Slice B · #93 ⛔ TUNED.
⚠️ **Client world:** navy + amber print, no glass, no `#FFCC00`.

## ⛔ Gated · 🔧 Arm before starting

🔴 **UBOS ANG GEMINI API BUDGET.** Manwal sa Flow ang bagong clip. Gated: Kling.
```powershell
.\scripts\restore-git-identity.ps1
.\scripts\restore-gh.ps1
.\scripts\restore-codex.ps1
```
⚠️ May sariling `node_modules` ang `funnels/oceanides-price-page` — `npm ci` doon
bago mag-build. **Huwag i-pipe ang build/deploy output** — pinapatay ang exit code.

---

### How to maintain this file
**Overwrite, never append** — history is `git log`'s job. Rewriting it is the last
action of any session that changed the work. Verifier fails past 90 lines.
