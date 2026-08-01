# NOW

**Stamped: 2026-08-01** · Anchor commit: `ecb64c5`

> The single resume doc. One screen, one next action. Read this first.
> **Freshness contract:** if the stamp is >5 days behind `git log -1`, treat as UNVERIFIED —
> re-derive from `git log --oneline -15` + open issues and rewrite. Enforced by
> `node tools/resume_doc_check.mjs` (SessionStart runs it `--quiet`).

---

## ▶ NEXT ACTION — OCEANIDES, not Grifon

Neil's call 2026-08-01: the Grifon punch list is **parked**; next session finishes the
Oceanides price page. Paste this to start:

```
Ituloy natin ang Oceanides. Basahin mo muna:
  clients/oceanides/NEXT-SESSION-PRICE-PAGE.md
  clients/oceanides/DESIGN.md
  clients/oceanides/kuya-gabriel/IDENTITY.md

Nasa branch feat/oceanides-price-page ang lahat, 22 commit. Hindi pa naka-merge.
```

⚠ **The work is on `origin/feat/oceanides-price-page`, NOT on main.** The defreezer wipes local
branches; `origin/*` survives. Do not conclude anything is unbuilt from main's tree.

⚠ **Different world, different rules.** Client work follows
[`clients/oceanides/DESIGN.md`](clients/oceanides/DESIGN.md) — matte navy + amber print, **no
glass, no charcoal, no `#FFCC00`**. Grifon's NOIR/DESIGN.md does **not** apply. Copy is Taglish
by that client's market (the `grifon-cmo` English-landing-page rule is Grifon-only — carve-out
now written down in that skill).

### 🔴 Four blockers only Neil can clear — read BEFORE building

1. **DENR badge is Region 7 (Cebu); we operate in NCR.** ⛔ **The page cannot go live until this
   is fixed.** Options: remove it, swap for the correct NCR one, or replace the borrowed seal
   with real numbers (SEC Reg. No. + BIR TIN + DENR-accredited disposal partner) — a specific
   number beats a borrowed seal. Was flagged once before (`content-calendar.md` L70) and not
   actioned. **Worth deciding before the session so it isn't discovered mid-build.**
2. **Gabriel's signed likeness consent** — legal, not technical. Template:
   `kuya-marvin/consent-agreement-FINAL-2026-07-20.md`.
3. **How many metres of hose are INCLUDED** before the ₱100/3m rate starts. Boss Jay gave the
   rate, not the baseline. Page currently says "kasama na ang standard na hose ng truck" — true,
   and invents no number. Keep it that way until he answers.
4. **Gabriel's verdict** on `profile-v2` + `website-v4`. He has out-caught the agent's QA three
   times — he stays the last eye.

Why the page exists: 2 days of ads = **₱1,284 spend, 100 messages, ₱12.84/message, ONE order.**
The leak is the close, not lead-gen — every thread dies at *"magkano?"*.

## 🅿 PARKED — Grifon punch list (resume trigger: Neil says so)

Detail lives in the GitHub issues, which are the durable record — not here.

- ✅ **#91** + **#94.1** fixed and **verified $0** (35.80s → 33.70s on the real failing footage).
  Committed `4a7bd7b` + `8090420` + `abbe72f`.
- **#94.3** was next, free, and owns the real caption defect (EDL `8 hours` vs script `Eight hours`).
- **#94.2** → close as NOT-REPRODUCIBLE (evidence in the #94 comment).
- **#96** key scope — `forced_alignment` now granted ✅; remaining work is making the failure loud.
- **#92** + **#89**/**#90** ride the Slice B batch (`sample_batch_test_spec.md`), never a solo render.
- **#93** ⛔ TUNED — own regression-armed session.
- **Two Neil decisions still open:** the golden-snapshot diff (8 lines, one field) and the overlay
  drop-case — both argued in `4a7bd7b`'s commit body. On the real footage nothing vanished.

## ⛔ Gated — not without Neil

Any paid render · **P5 engine-default flip** · **Hyperframes product swap** (verdict STANDS) ·
**Slice 2** video rate-limit re-scope · merging `feat/oceanides-price-page`.

## 🔧 Arm before starting

```powershell
.\scripts\restore-git-identity.ps1
.\scripts\restore-gh.ps1     # gh may miss bash PATH → $LOCALAPPDATA/Programs/GitHubCLI/bin/gh.exe
```

---

### How to maintain this file

**Overwrite it — never append.** History is `git log`'s job; appending is how the last resume doc
rotted three pointers deep. Rewriting it is the **last** action of every session that changed the
state of the work. Keep it one screen — the verifier fails past 90 lines.
