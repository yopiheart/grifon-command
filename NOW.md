# NOW

**Stamped: 2026-08-02** · Anchor commit: `ec43d05` (main) · `feat/oceanides-price-page` MERGED na sa main

> The single resume doc. One screen, one next action. Read this first.
> **Freshness contract:** if the stamp is >5 days behind `git log -1`, treat as UNVERIFIED —
> re-derive from `git log --oneline -15` + open issues and rewrite. Enforced by
> `node tools/resume_doc_check.mjs` (SessionStart runs it `--quiet`).

---

## ▶ NEXT ACTION — OCEANIDES: Gate 2 full read → deploy → unang campaign sa page

Tapos na ang buong page at **nasa main na lahat** (merge `ec43d05`). Handoff:
`clients/oceanides/NEXT-SESSION-PRICE-PAGE.md`. Paste this to start:

```
Ituloy natin ang Oceanides. Basahin mo muna:
  clients/oceanides/NEXT-SESSION-PRICE-PAGE.md
  clients/oceanides/DESIGN.md
Naka-merge na sa main ang page. Gate 2 full read ni Neil, tapos deploy
(workflows/funnel_deploys.md ang runbook), tapos ang unang campaign papunta sa page.
```

⚠️ **Client world:** matte navy + amber print, no glass, no `#FFCC00`, Taglish.
Ang `clients/oceanides/DESIGN.md` ang batas doon, hindi ang Grifon `DESIGN.md`.

### ⛔ Kay Neil lang (naka-block ang deploy at ang ads)

1. **Gate 2** — buong basa ng landing + thank-you sa totoong phone nya. Ang 4 na
   5-carrier fix ay approved na (2026-08-02), pero ang buong page read ay hindi pa.
2. **Meta Pixel ID** — `tracking: {}` ngayon, PATAY. Walang Lead data at walang
   maiipong retargeting audience kung mag-a-ads nang wala nito. Hindi mababawi.

### Session 2026-08-02 (huli) — 5-carrier review + MERGE sa main

Suby 5 freight-carriers pass sa price page, CMO-approved, applied (`90b8479`):
headline "Walang **sorpresang** dagdag" · subhead "warranty **sa bara**" · semento
= sariling ticket line · P.S. #1 = guarantee restate (F01). Verified: lint-voice,
lint-layout, tsc, build, 390x844 smoke — lahat pasado. **Desisyon: walang CTA sa
fold, tama na ang StickyCta** (lumalabas paglabas ng hero, nagtatago sa form).
Tapos merge sa main `ec43d05` (isang conflict lang, taglish-guard hook, resolved).
Oras-ng-tawag blocker: SOLVED na (`d980286`, 8AM-5PM sa thank-you).

### Session 2026-08-02 (umaga) — GUARDRAIL, nasa main (`dd616d4`)

**Ad-spend gate** (`.claude/hooks/ad-spend-gate.sh`): deny sa activate/boost at create na
may ACTIVE o budget · ask sa staging writes · sakop ang CLI sa Bash · 17/17 test.
**Executor ledger** (`tools/executor_ledger.mjs`) + `Executor:` trailer, baseline 25%.

### 🅿 Parked sa Oceanides (di naka-block ang deploy)

**SEC Reg. No.** · **TIN sa page** nakapangalan kay Cepriano sa SEC, ipa-check sa BIR
2303 · utang sa 100 taong nangakuan ng "libre ang tingin" · FB About: buong SEC name ·
i-archive ang June 2025 AI-face post · 3-5 organic bago ang unang ad · hose baseline ·
logo-marquee · real-bookings feed · Suby follow-ups: FB-group voice-of-customer mining,
creative-reps counter sa ledger, print-ad seeding ng static swipe file.

### Pagkatapos ng deploy: ang unang campaign

**Leads ang objective sa page, hindi Messenger.** KM-003: 100 messages sa ₱13.33 pero
ISANG order, ang close ang butas. Mas mahal ang website leads habang walang pixel data,
kaya **cost per BOOKING ang titingnan.** `grifon-ad-strategist` ang magda-draft, si Neil
ang magpapaputok. Naka-block na sa hook ang sarili kong pag-fire.

## 🅿 PARKED — Grifon punch list (resume trigger: Neil says so)

- ✅ **#91**+**#94.1** fixed, $0 · **#94.3** next (owns the real caption defect) · **#94.2** close NOT-REPRODUCIBLE · **#96** `forced_alignment` granted ✅, make the failure loud.
- **#92**+**#89**/**#90** ride Slice B; **#93** ⛔ TUNED. Neil decisions: golden-snapshot diff + overlay drop-case.

## ⛔ Gated — not without Neil

Any paid render · P5 engine-default flip · Hyperframes product swap · Slice 2 video
rate-limit re-scope · ang DEPLOY (Gate 2 full read muna) · anumang ad spend.

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
