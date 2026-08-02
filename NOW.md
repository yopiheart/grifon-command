# NOW

**Stamped: 2026-08-02** · Anchor commit: `HEAD` (main) · **LIVE na ang Oceanides page**

> The single resume doc. One screen, one next action. Read this first.
> **Freshness contract:** if the stamp is >5 days behind `git log -1`, treat as UNVERIFIED —
> re-derive from `git log --oneline -15` + open issues and rewrite. Enforced by
> `node tools/resume_doc_check.mjs` (SessionStart runs it `--quiet`).

---

## ▶ NEXT ACTION — OCEANIDES: domain + privacy read → unang campaign sa page

**LIVE na:** https://oceanides-price-page.vercel.app · Gate 2 APPROVED ni Neil
2026-08-02 · live lead test GREEN (row pumasok sa `funnel_leads`, binura) ·
Meta Pixel `1050997330667084` buhay sa prod bundle. Registry:
`workflows/funnel_deploys.md`. Paste this to start:

```
Ituloy natin ang Oceanides. Live na ang page:
https://oceanides-price-page.vercel.app
Basahin mo muna ang workflows/funnel_deploys.md at ang
clients/oceanides/kuya-marvin/ads/NEXT-SESSION.md (seksyon: Website campaign
infrastructure). Dalawa na lang bago ang unang ad: domain at privacy read.
```

⚠️ **Client world:** matte navy + amber print, no glass, no `#FFCC00`, Taglish —
`clients/oceanides/DESIGN.md` ang batas doon, hindi ang Grifon `DESIGN.md`.

### ⛔ Kay Neil lang — dalawa na lang, at pareho silang bago ang UNANG AD

1. **Domain** — di pa nabibili. Hindi mave-verify sa Meta ang `*.vercel.app`, at
   nahahati ang pixel data kapag pinalitan ang URL habang tumatakbo na ang ads.
   Reco: brand domain (`oceanidesph.com`), hindi keyword domain. ~₱600-1,200/taon.
2. **Basahin ang Privacy Policy** — https://oceanides-price-page.vercel.app/privacy
   Legal notice sya ng totoong kompanya, hindi marketing copy. Hango sa kung ano
   talaga ang ginagawa ng code, pero hindi pa nya nababasa.

### Tatlong desisyon na hinihintay (naka-record sa `oceanides_business_model.md`)

Segmented payment policy + QR-first collection · disposal slip kada byahe (**may
risk to**: nakalimbag na sa page ang "legal na tapunan" pero crew ang nagmamaneho
at walang per-job na papel ang ₱5,000) · libre ba o ₱499 ang Health Check.

### Session 2026-08-02 — 3 hiling ni Neil, pixel, privacy, DEPLOY

**costOfDelay** bago ang form: sarado ang fake countdown at hindi totoong tumataas
ang presyo, kaya ang nawawala ay ang PAGPILI. **Guarantee**: "30 ARAW" seal + 6
audit chip, nailipat sa kaliwang rail. **Tinanggihan: star rating** (zero review).
**Pixel** naka-wire, **Advanced Matching OFF at walang CAPI** — parehong hashed
PII papuntang Meta at hindi sya sakop ng consent natin. **Privacy Policy** ginawa
(static, walang JS, zero Meta request). **Deploy + live e2e GREEN.**

## 🅿 PARKED

**Oceanides:** SEC Reg. No. · utang sa 100 taong nangakuan ng "libre ang tingin" ·
FB About: buong SEC name · 3-5 organic bago ang ad · logo-marquee · real-bookings
feed · **reviews sa FB Page** (bubuksan ang rating chip) · **pangalawang page =
DENR Compliance B2B**, hindi Health Check · dalawang Oceanides FB page, alin ang totoo.

**Suby 27-minute brief** (walang sariling doc): FB-group voice-of-customer mining ·
creative-reps counter sa `ad_performance_ledger.md` · print-ad seeding ng
`static_ad_swipe_file.md` · wala sa `grifon-cmo` ang 5-freight-carriers lens.

**Grifon punch list** (resume trigger: Neil says so): ✅ #91+#94.1 fixed, $0 ·
#94.3 next · #94.2 NOT-REPRODUCIBLE · #96 `forced_alignment` granted ✅ ·
#92+#89/#90 ride Slice B · #93 ⛔ TUNED.

## ⛔ Gated — not without Neil

Any paid render · P5 engine-default flip · Hyperframes swap · **anumang ad spend**.

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
