# NOW

**Stamped: 2026-08-01** · Anchor commit: `2e00dd7`

> The single resume doc. One screen, one next action. Read this first.
> **Freshness contract:** if the stamp is >5 days behind `git log -1`, treat as UNVERIFIED —
> re-derive from `git log --oneline -15` + open issues and rewrite. Enforced by
> `node tools/resume_doc_check.mjs` (SessionStart runs it `--quiet`).

---

## ▶ NEXT ACTION — OCEANIDES REDESIGN (price page), not Grifon

Neil's calls 2026-08-01: Grifon punch list **parked**; funnel structure of the price page is
**approved** — the next session REDESIGNS its visual world, then finishes the page. Paste this:

```
Ituloy natin ang Oceanides — redesign muna bago tapusin. Basahin mo:
  workflows/design_swipe_file.md          ← DGP-2 = the redesign recipe (evidence-cited)
  clients/oceanides/DESIGN.md             ← source of truth, refined by DGP-2, never overridden
  clients/oceanides/NEXT-SESSION-PRICE-PAGE.md
  clients/oceanides/kuya-gabriel/IDENTITY.md
Nasa branch feat/oceanides-price-page ang page, 22 commit. Hindi pa naka-merge.
```

⚠ **The work is on `origin/feat/oceanides-price-page`, NOT main.** Defreezer wipes local
branches; `origin/*` survives. Do not conclude anything is unbuilt from main's tree.
⚠ **Client world:** matte navy + amber, **no glass, no charcoal, no `#FFCC00`**, Taglish copy.
DGP-2 keeps that world (externally validated by D05/D14) and adds: serif display (DP2), price
proof-object in the fold à la Wise (DP8 — attacks the "magkano?" thread-death directly),
trust-stack numbers at the fold (DP6, gated on blocker #1), amber single-accent (DP3).

### 🔴 Four blockers only Neil can clear — read BEFORE building

1. **DENR badge is Region 7 (Cebu); we operate in NCR.** ⛔ Page cannot go live until fixed.
   Best fix per DGP-2 #4: replace borrowed seal with real numbers (SEC Reg. No. + BIR TIN) —
   Neil must supply them; never invent.
2. **Gabriel's signed likeness consent** — template: `kuya-marvin/consent-agreement-FINAL-2026-07-20.md`.
3. **Metres of hose INCLUDED** before ₱100/3m starts — Boss Jay gave rate, not baseline. Page
   says "kasama na ang standard na hose ng truck" — true, invents nothing. Keep until answered.
4. **Gabriel's verdict** on `profile-v2` + `website-v4` — he stays the last eye.

Why: 2 days of ads = ₱1,284, 100 messages, ONE order. The leak is the close at *"magkano?"*.

**🆕 Landed 2026-08-01 (main, `b030d95`→`2e00dd7`):** Design Swipe File built AND seeded — 15
external teardowns (D03–D17: Stripe, Wise, Cursor, Merry Maids, Derma Medical, Serhant, Graza,
IM8, Kylie, Gymshark, Skylrk[PH!], +4), Pattern Index DP1–DP11 (8 at `proposed`), DGP-2 =
Oceanides recipe. Plus: funnel-forge step-1 curation pass + CD step-5 client carve-out.

## 🅿 PARKED — Grifon punch list (resume trigger: Neil says so)

Detail lives in the GitHub issues — the durable record, not here.

- ✅ **#91** + **#94.1** fixed, **verified $0** (`4a7bd7b`+`8090420`+`abbe72f`). **#94.3** next,
  free, owns the real caption defect. **#94.2** → close NOT-REPRODUCIBLE (evidence in #94).
- **#96** `forced_alignment` granted ✅ — remaining work: make the failure loud.
- **#92** + **#89**/**#90** ride the Slice B batch; **#93** ⛔ TUNED — own regression-armed session.
- **Two Neil decisions open:** golden-snapshot diff + overlay drop-case (both argued in
  `4a7bd7b`'s commit body).

## ⛔ Gated — not without Neil

Any paid render · **P5 engine-default flip** · **Hyperframes product swap** (verdict STANDS) ·
**Slice 2** video rate-limit re-scope · merging `feat/oceanides-price-page` · DGP-2 execution
happens WITH Neil (his eyeball is the design gate).

## 🔧 Arm before starting

```powershell
.\scripts\restore-git-identity.ps1
.\scripts\restore-gh.ps1     # gh may miss bash PATH → $LOCALAPPDATA/Programs/GitHubCLI/bin/gh.exe
```

---

### How to maintain this file

**Overwrite it — never append.** History is `git log`'s job. Rewriting it is the **last** action
of every session that changed the state of the work. Keep it one screen — verifier fails past 90.
