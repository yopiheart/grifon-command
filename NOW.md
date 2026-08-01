# NOW

**Stamped: 2026-08-01** · Anchor commit: `65df29d` (main) · branch head: `b26f533`

> The single resume doc. One screen, one next action. Read this first.
> **Freshness contract:** if the stamp is >5 days behind `git log -1`, treat as UNVERIFIED —
> re-derive from `git log --oneline -15` + open issues and rewrite. Enforced by
> `node tools/resume_doc_check.mjs` (SessionStart runs it `--quiet`).

---

## ▶ NEXT ACTION — OCEANIDES: thank-you page pass → Gate 2 → DEPLOY

Ang landing page ay REDESIGNED at **inaprubahan ni Neil 2026-08-01** ("Okay na saken
tong first page"). Ang detalyadong handoff ay nasa branch:
`clients/oceanides/NEXT-SESSION-PRICE-PAGE.md`. Paste this to start:

```
Ituloy natin ang Oceanides. Basahin mo muna:
  clients/oceanides/NEXT-SESSION-PRICE-PAGE.md
  clients/oceanides/DESIGN.md
Nasa branch feat/oceanides-price-page ang lahat, 30 commit. Hindi pa naka-merge.
Una ang thank-you page pass, tapos Gate 2 read ni Neil, tapos deploy.
```

⚠ **The work is on `origin/feat/oceanides-price-page`, NOT main.** Defreezer wipes local
branches; `origin/*` survives. Do not conclude anything is unbuilt from main's tree.
⚠ **Client world:** matte navy + amber print, no glass, no `#FFCC00`, Taglish. Ang
redesign evidence (DGP-2, D-entries) ay nasa `workflows/design_swipe_file.md` DITO sa main.

### Session 2026-08-01 sa isang tingin (branch `1e42e74..b26f533`)

Hero price ticket (Wise DP8) · chapter grounds · papeles+totoong numbers sa fold (DENR
cert no., DENR ID, TIN) · "Mahigit 1,000 na tangke" (Boss-Jay-vouched; tinanggihan ang
imbentong "1,347") · 14-client marquee (deck-verbatim, names hindi logos) · before/after
wipe slider (orientation bug nahuli ni Neil, ayos na) · Gabriel section (consent ✅) ·
watermarks nakapaso sa webp · DENR cert FAQ (₱12k/₱15k, hiwalay na serbisyo) · semento
fix sa bakbak · tel: thank-you CTA + email-rider bug fix · ==highlighter== channel.
Tinanggihan at hindi ginawa: fake countdown, fake booking popups, AI before/after
(labag lahat sa no-fake-proof law; totoo pala ang existing pairs — kumpirmado ni Neil).

### 🅿 Parked sa Oceanides (hindi humaharang sa deploy)

**SEC Reg. No.** (Neil: "balikan nalang") · hose baseline ni Boss Jay · logo-marquee
option · real-bookings feed (post-launch, totoong data lang) · Kuya Marvin utang sa 100
messages ("libre ang tingin" — sinuman tumawag, libre) · 3-5 post sa Page ni Gabriel
bago mag-ads.

## 🅿 PARKED — Grifon punch list (resume trigger: Neil says so)

Detail lives in the GitHub issues — the durable record, not here.

- ✅ **#91** + **#94.1** fixed, verified $0 (`4a7bd7b`+`8090420`+`abbe72f`). **#94.3**
  next, free, owns the real caption defect. **#94.2** → close NOT-REPRODUCIBLE.
- **#96** `forced_alignment` granted ✅ — remaining: make the failure loud.
- **#92** + **#89**/**#90** ride the Slice B batch; **#93** ⛔ TUNED — own session.
- **Two Neil decisions open:** golden-snapshot diff + overlay drop-case (sa `4a7bd7b` body).

**🆕 Landed sa main 2026-08-01:** Design Swipe File (D01–D17, DP1–DP11, 8 proposed,
DGP-2) + funnel-forge curation step + CD client carve-out — `b030d95..65df29d`.

## ⛔ Gated — not without Neil

Any paid render · P5 engine-default flip · Hyperframes product swap (verdict STANDS) ·
Slice 2 video rate-limit re-scope · merging `feat/oceanides-price-page` · ang DEPLOY
mismo ay pagkatapos lang ng Gate 2 full read ni Neil.

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
