# NOW

**Stamped: 2026-08-02** · Anchor commit: `69e202c` (main) · lahat ng Oceanides work ay nasa main

> The single resume doc. One screen, one next action. Read this first.
> **Freshness contract:** if the stamp is >5 days behind `git log -1`, treat as UNVERIFIED —
> re-derive from `git log --oneline -15` + open issues and rewrite. Enforced by
> `node tools/resume_doc_check.mjs` (SessionStart runs it `--quiet`).

---

## ▶ NEXT ACTION — OCEANIDES: pixel ID + domain → deploy → unang campaign

Tapos na ang buong page at **nasa main lahat**. Handoff:
`clients/oceanides/NEXT-SESSION-PRICE-PAGE.md`. Paste this to start:

```
Ituloy natin ang Oceanides. Basahin mo muna ang
clients/oceanides/NEXT-SESSION-PRICE-PAGE.md at ang clients/oceanides/DESIGN.md.
Nasa main na ang page. Kailangan ang Meta Pixel ID at ang domain bago ang unang
ad. Deploy runbook: workflows/funnel_deploys.md.
```

⚠️ **Client world:** matte navy + amber print, no glass, no `#FFCC00`, Taglish —
`clients/oceanides/DESIGN.md` ang batas doon, hindi ang Grifon `DESIGN.md`.

### ⛔ Kay Neil lang (naka-block ang deploy at ang ads)

1. **Meta Pixel ID** — Events Manager → Data sources → bagong dataset →
   kopyahin ang 15-16 digit na ID. Libre, walang kailangang domain. `tracking: {}`
   pa rin, PATAY: walang Lead data, walang naiipong audience, hindi mababawi.
   **Build-time sa `funnel.config.ts` → bagong deploy kapag napalitan.**
2. **Domain** — di kailangan ng pixel at di humaharang sa deploy, pero kailangan
   **bago ang unang ad**: di mave-verify sa Meta ang `*.vercel.app`, at nahahati
   ang pixel data kapag pinalitan ang URL habang tumatakbo na ang ads.
3. **Gate 2** — buong basa sa totoong phone. `npm run build` sa
   `funnels/oceanides-price-page`, `npx vite preview --port 4173 --host`, buksan
   ang LAN URL sa phone. SAGOT NA ang 24-oras vs 8AM-5PM: hayaan.

### Session 2026-08-02 (huli) — 3 hiling ni Neil, IM8 ang reference (`69e202c`)

**costOfDelay** bago ang form: sarado ang fake countdown (DESIGN.md) at hindi
totoong tumataas ang presyo sa paghihintay, kaya ang nawawala ay ang PAGPILI,
hindi pera. **Guarantee**: seal na "30 ARAW" + 6 na audit chip, nailipat sa
kaliwang rail (naka-gitna pala at walang SectionHeading; nakalusot sa lint kasi
`text-center` className, hindi ang prop). **Tinanggihan: star rating at review
count** kahit yun ang device ng IM8 — zero review, hard ban ang pag-imbento.

### Pagkatapos ng deploy: ang unang campaign

**Leads ang objective sa page, hindi Messenger.** KM-003: 100 messages sa ₱13.33
pero ISANG order, ang close ang butas. Walang pixel data pa, kaya **cost per
BOOKING ang titingnan.** `grifon-ad-strategist` ang magda-draft, si Neil ang
magpapaputok.

## 🅿 PARKED

**Oceanides (di naka-block ang deploy):** SEC Reg. No. · utang sa 100 taong
nangakuan ng "libre ang tingin" · FB About: buong SEC name · i-archive ang June
2025 AI-face post · 3-5 organic bago ang ad · hose baseline · logo-marquee ·
real-bookings feed · **reviews sa FB Page** (bubuksan ang rating chip).

**Suby 27-minute brief** (walang sariling doc, mawawala kapag na-overwrite to):
FB-group voice-of-customer mining · creative-reps counter sa
`ad_performance_ledger.md` · print-ad seeding ng `static_ad_swipe_file.md` · wala
sa `grifon-cmo` ang 5-freight-carriers lens, kaya di maulit sa bagong session.

**Grifon punch list** (resume trigger: Neil says so): ✅ #91+#94.1 fixed, $0 ·
#94.3 next · #94.2 NOT-REPRODUCIBLE · #96 `forced_alignment` granted ✅ ·
#92+#89/#90 ride Slice B · #93 ⛔ TUNED.

## ⛔ Gated — not without Neil

Any paid render · P5 engine-default flip · Hyperframes swap · ang DEPLOY · ad spend.

## 🔧 Arm before starting

```powershell
.\scripts\restore-git-identity.ps1
.\scripts\restore-gh.ps1     # gh may miss bash PATH → $LOCALAPPDATA/Programs/GitHubCLI/bin/gh.exe
```

---

### How to maintain this file

**Overwrite it — never append.** History is `git log`'s job. Rewriting it is the **last**
action of every session that changed the state of the work. Keep it one screen — the
verifier fails past 90 lines.
