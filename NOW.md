# NOW — the resume doc

**Stamped: 2026-08-04** (session 7, gabi)

## ▶ NEXT ACTION — 🟠 TAWAG COCKPIT NAKA-BUILD, DALAWANG PINDOT BAGO LIVE

**Tawag Cockpit v0 TAPOS at naka-push (`79495d9`)** — briefing card kada lead,
3 objection cards (deck approved ni Neil), objection log + follow-up, buhay na
`/ops` (60s poll, tab badge, tunog). Plano: [`clients/oceanides/tawag-cockpit-plan.md`](clients/oceanides/tawag-cockpit-plan.md).

### A · Kay Neil — pagkakasunod-sunod na BAWAL baligtarin
1. **I-apply MUNA ang SQL** sa Supabase SQL editor: yung UPGRADES section sa
   dulo ng [`supabase/funnel_leads.sql`](supabase/funnel_leads.sql) (idempotent,
   safe i-paste buo). ⚠️ Kapag na-deploy nang wala to, **500 ang buong /ops**.
2. **Tapos deploy:** sabihin lang kay agent na "deploy na" — armado ang Vercel
   CLI (`whoami` = neilmaglayabusiness22-2085, session 7) at nakahanda ang
   build. Manual: `cd funnels/oceanides-price-page` → `npx vercel deploy --prod --yes`.
3. **Eyeball sa live:** buksan ang `/ops` sa PC at phone — lead card → presyo →
   cards → objection pindot → follow-up date. Tapos ang usapan kay Zam:
   **para sa cards ang log, hindi panukat sa kanya.**
4. Dating listahan (session 6, buhay pa rin): FB page refresh ni Marvin ·
   ipasa ang `/pack/km-week-01.html` sa admin · sabihan sina Zam/Ejay ng bagong
   password + `/presyo` · Instagram.

### B · Bantayan habang tumatakbo
- **`OCEANIDES-PRICE-01` ACTIVE, lima ang ad** (km004-video ang pinakamalakas).
  Ledger: [`workflows/ad_performance_ledger.md`](workflows/ad_performance_ledger.md).
  Break-even **₱900 kada booked job**. Si Zam: punan ang How much kada trabaho.
- **Cockpit metrics pagkatapos ng unang 20 leads:** bilis ng unang tawag
  (target sub-15 min gising) + booking rate. Nasa plan doc §4 ang pagbasa.
- Agent, susunod na session: basahin ang delivery data ng campaign.

### C · Zam toolkit
- **`/ops`** = booking list + Tawag Cockpit. **`/presyo`** = presyo cheat sheet.
- ⚠️ **Lumipat ang rates source of truth:** `src/lib/rates.ts` na, HINDI na
  `Presyo.tsx` (parehong page kumukuha dun). Rotation runbook + registry:
  `workflows/funnel_deploys.md` (bash printf LANG, may PowerShell `\r` trap).

---

## 🔴 Huwag kalimutan

1. **SQL bago deploy** (A1→A2 sa taas) — nakasulat din sa commit `79495d9`.
2. **MAGBILANG NG BOOKED JOB, hindi lang lead.**
3. **Coordinate radius ang geo** — lat `14.54` lng `121.02`, 20km, `home`.
4. **Number change:** ~26 lumang templates may number pa ni Boss Jay — palitan
   bago i-render ulit (`workflows/oceanides_kuya_marvin_brand.md`).
5. **Root `npx vitest` sirang-sira (100/100 fail, import-time)** — PRE-EXISTING,
   hindi galing sa cockpit (na-verify via stash). Kasama ang `package-lock.json`
   na M sa gitStatus. Ayusin sa sariling session, wag ihalo sa ibang commit.

## ✅ Tapos ngayong 2026-08-04 (session 7, gabi)

**Tawag Cockpit v0** — grill-me buong desisyon-tree (hindi Zoom teleprompter:
outbound calls sa form leads ni Zam), plan doc + approved 3-card deck, build
via code-executor (rates.ts extraction 0-mismatch sa 124 inputs, cards verbatim,
closed objection enum, idempotent SQL), review pasado, push `79495d9`.
**Cognition FDE brief eval** — #26 sa roadmap (built-twice-for-clients →
product candidate) + Option C reframe sa concierge plan (`0308d0e`).

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
