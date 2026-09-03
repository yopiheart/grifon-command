# NOW — the resume doc
**Stamped: 2026-09-03** (session 43)

## ▶ NEXT ACTION — Neil pushes his font board, then the card gets rebuilt

Session 43 was **Oceanides client work**, not Grifon product. Branch:
`claude/oceanides-business-card-design-ppwhtx` (2 commits, pushed, no PR opened).

**Blocked on Neil, two things, one line each:**
1. **Push the font-combo folder** to `clients/oceanides/brand/type-inspo/` (README there
   states what a face must survive). The wordmark is a placeholder until it lands.
2. **Marvin's real job title.** He is Talent under the likeness agreement. Inventing
   "Field Inspector" rebuilds the fake-credential problem in a nicer font.

Then: rebuild the business card on the new mark. Card spine is **registrations only**
(SEC · BIR · OPC legal name) — Certificate of Treatment is CUT, Neil and CEO Agosto
both rejected it. Four services: **Siphoning · Declogging · Plumbing · Pest Management**
("Grease Trap" was invented by the agent; zero repo hits). **No location line.**

## ✅ SHIPPED — the vector brand mark

`clients/oceanides/brand/` — mark, mark-small (<24px, no mosquito), mark-mono,
logo-primary, logo-lockup. All from ONE geometry source,
`tools/brand/build-oceanides-logo.py`. **Never hand-edit the SVGs; edit the script.**
Artifact: `https://claude.ai/code/artifact/5c523b6d-caa7-49ec-9ffe-bc71ac25d586`

Why it was rebuilt, measured not guessed: **18,832 distinct colours** in a 316px JPEG,
a gradient wordmark, seven competing elements, and **no vector master anywhere**
(`public/logo.svg` is a stub rendering the word "LOGO"). Full write-up now lives in
`clients/oceanides/DESIGN.md` under "Ang marka".

⚠️ **Amber has ZERO basis in the mark** — 0 of 99,856 pixels are warm. Navy matches
well (RGB distance 14.7 to `surface`). Whether the shield gains a warm accent is
**Neil's call**, deliberately not decided inside a redraw.

## 🔴 OPEN — an unshipped compliance landmine

`funnels/oceanides-paolo/src/funnel.config.ts:288-311` still carries
`'DENR-registered hauler'`, `'LLDA permit'`, and **both third-party ID numbers**
(`OL-TR-R3-14-000080` is Globaltec's; `BEHMC(1)WHN0095001WW260318` is another
company's, with a confidentiality clause) as receipt rows attributed to Oceanides.

That funnel is **NOT** in `workflows/funnel_deploys.md`, so it is unshipped, not live.
**Do not deploy oceanides-paolo until those rows are pulled.** The same claim in the
FOOTER of both funnels WAS live and is fixed — Neil still needs to redeploy
`oceanides-price-page` for that to reach production.

## 📌 The card comps from round 1 (superseded, kept for the record)

`https://claude.ai/code/artifact/1c17b8c3-2373-4a0b-a4d0-aad6d98d65fd` — three concepts
built on the Certificate of Treatment spine. **That spine is dead**; the layouts and the
print lessons are still good. Two of those lessons are worth carrying forward:

- **540px = 90mm, so 1pt = 2.117px.** A ladder set by eye put every tier at 4–6pt and
  the legal line at 3.3pt, which no press holds. Size print type in POINTS.
- The 390×844 mobile gate ran through a **local script**, not the configured
  smoke-tester — Playwright MCP fails to connect in the web sandbox (`ENOENT: cmd`,
  a Windows shim on Linux). Say which path was used; don't imply the real gate ran.

## ⏸ GRIFON PRODUCT — parked exactly where session 42 left it

Nothing in this session touched Grifon. `origin/main` is still at `4f76359` with
sessions 41 + 42 in full. The next product action is unchanged: **produce the next
sample** — either re-run the unboxing brand for a second data point on the 🎲
(`bbbed45` still has a sample of one), or go to **2 · Silid Home (Unboxing ASMR)** in
`workflows/sample_brand_briefs.md`, which exercises the same S2 pair under `asmrFlag`
and doubles as that data point. Neil picks.

Setup after a reboot: `restore-ffmpeg.ps1`, `enable-dev-unmetered-video.ps1`,
`npm run dev`. Run at `/app?osaEngine=producer`, vertical `product`, presenter `Auto`,
BOTH photos. **Paste the offer, never type it** — a past run typed 113 of 153 chars and
lost the first sentence. Smoke login: `workflows/expert_manual_mode.md:440`.
