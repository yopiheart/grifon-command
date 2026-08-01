# Design Swipe File

Compounding database of decoded **design worlds** — evidence for WHY a premium site reads as
premium, per niche. The blind spot it exists to close (Neil, 2026-08-01): we compound at funnel
structure (`funnel_swipe_file.md`) and ad visuals (`static_ad_swipe_file.md`) but had no evidence
loop for *aesthetics* — so every new client's design world risked being authored as a Grifon
re-skin with swapped hexes, which is exactly the "corporate AI default" that produces slop. What
compounds here: **DP-patterns** (aesthetic mechanisms) that graduate into per-client `DESIGN.md`
authorship and, when template-shaped, into `funnels/_template` via FGPs. Consumed by
`funnel-forge` step 1 — **a new client's DESIGN.md must cite D-/DP-IDs for its aesthetic
choices**, same contract as F-/L-IDs for structure. No evidence → anchor to the closest
calibration world (D01/D02) and say so.

**Ingest loop:** `grifon-creative-director` owns extraction — its 6-step reference breakdown
(layout walk → system extraction → interactions → tech read) IS the autopsy tool; steps 1–4
become the D-entry, step 5's port is optional (a Swipe-File ingest needs no port). Evidence per
entry: `smoke-tester` screenshots at 390×844 + 1440×900 (committed to
`assets/design-swipe/D<NN>/`, compressed) + the written extraction. Sources: live sites Neil
drops, Mobbin, Land-book, Godly, Awwwards — curated galleries are legitimate inspiration
sourcing, not theft, when they set macro direction. Dedupe by URL; a re-drop updates the entry.

**The trust line (design edition): steal the system, never the identity.** Tokens, type scales,
spacing rhythm, motion personality, premium mechanisms — all fair game. Logos, illustrations,
proprietary motifs, brand names, verbatim copy — never. If a port would be mistaken for the
source brand, it's too close.

⚠ **Cafe-PC rule:** commit after every entry (`swipe(design): add D<NN> <brand>`). Uncommitted
teardowns die with the reboot.

---

## Anti-Slop Doctrine

Distilled 2026-08-01 from the "Claude Design 2.0" knowledge transfer + our own shipped lessons.
These are method rules, not patterns — they need no corroboration count; they're how the file
gets used.

1. **World before pixels.** Curate 3–5 live references in the niche and lock the design system
   (palette, type, texture, motion personality) BEFORE any layout is generated. The AI default
   is corporate slop; picking an expressive direction upfront is the countermeasure. This is
   funnel-forge step 1's design-curation pass.
2. **Never clone the house style for a client.** Grifon NOIR is Grifon's world, not a template.
   D01 vs D02 diverge on *every* axis — the 2026-07-28 NOIR-on-Oceanides artifact rebuild is the
   standing scar. Per-client DESIGN.md derives from D-entries in the client's niche.
3. **First pass is a draft.** Expect ~5–6 targeted micro-passes with **exact spatial
   constraints** ("center the icon inside the stroke", not "make it nicer"). Slop is the
   quantity of unexamined first-pass output that survives, not a property of the tool.
4. **Custom assets beat described assets.** A generic section becomes distinctive through one
   custom visual (hero motif, texture, illustration) — generate it via `codex-image`, feed it
   back into the build. Rough concept drafts are fine as intermediate steering inputs.
5. **Mobile floor is law.** 390×844 is the primary renderer, not the degradation target. No
   scroll-jacking, no Lenis-style libraries, no external CDNs — motion goes through
   `motionTokens` + `reducedMotion()`. Fragile CSS (backdrop-filter, background-clip:text,
   fixed attachments) follows the hard-won artifact rules in CLAUDE.md: solid-color default,
   effect as pure enhancement.
6. **Conversion outranks expression.** Distinctiveness serves trust and memorability, measured
   like everything else. A beautiful page that buries the CTA fails; creative-director
   principle #1 keeps rank.

---

## Pattern Index

Status legend: `observed` (counting corroborations) → `proposed` (≥3 corroborations across
independent external brands — **calibration entries D01/D02 never count**; they're our own work)
→ `applied` (shipped into a client DESIGN.md authorship rule or, via FGP, the template).

| ID | Pattern | Corroborations | Status |
|----|---------|----------------|--------|
| DP1 | **World-first, tokens-second** — a brand's premium read comes from a coherent *world* (ground treatment, texture, type personality, motion character moving together), not from any single token. Swapping hexes inside a foreign world produces slop; D01 and D02 sit opposite on every axis yet both read premium *because* each is internally coherent. | 2 in-house calibration only (D01 D02) — needs 3 external | observed |

*(Next DP-number = DP2. Candidates to watch on external entries: restraint-as-luxury (small
palette + one signature device), print-vs-cinematic ground treatments by niche, motion
personality as a trust signal.)*

---

## Gated Proposals

Design-system changes distilled from ≥3-corroborated DP-patterns, awaiting Neil's explicit
approval. Template-shaped changes ALSO ship as FGPs in `funnel_swipe_file.md` (that file owns
`funnels/_template`).

*(none yet)*

**Parked — endorsed-but-deferred (2026-08-01 evaluation), promote when the trigger fires:**
- **DGP-1: `FunnelConfig.brand` expressive axes** — today the block carries colors + fonts +
  radius; the visual world (glass cards, section rhythm, texture, motion) is fixed Grifon DNA.
  Proposed axes: ground/texture treatment, card treatment (`glass | solid | outline`), density
  scale, motion personality. **Trigger: the first client whose approved DESIGN.md cannot be
  expressed by the current brand block.** Ships as an FGP (template change) with the D-entries
  as evidence. Do not build speculatively.

---

## Entries

Newest first. Calibration entries (our own shipped worlds) are marked and never count toward
corroboration gates. Entry template:

```
### D<NN> — <url or source> (<Brand>, <niche>) — <YYYY-MM-DD>
world: <3–6 word mood name>        confidence: high | med | low
screenshots: assets/design-swipe/D<NN>/  (desktop.png, mobile.png, detail-*.png)
**Why swiped:** <what made this worth decoding>
**LAYOUT WALK:** hero → footer — containers, grid, spacing rhythm, section cadence
**SYSTEM EXTRACTION:** fonts (exact or closest match) · hex + where used · type scale ·
  spacing tokens · radius · texture/motif
**MOTION & INTERACTION:** scroll/hover/transition behavior, easing personality, mobile behavior
**PREMIUM MECHANISM:** the 2–3 specific devices that make it read expensive — the why, not the what
**MOBILE FLOOR CHECK:** what survives 390×844, what each effect degrades to
**STEALABLE:** 3–5 bullets → candidate DP-patterns
**Patterns:** corroborates <DP-IDs> · new candidate <or none> · contradicts <or none>
```

### D06 — serhant.com (SERHANT., luxury real estate) — 2026-08-01
world: masthead luxury media-brand        confidence: high (smoke-tester capture + computed tokens)
screenshots: assets/design-swipe/D06/ (desktop-fold, desktop-section, mobile-fold)
**Why swiped:** Tier-1 real-estate niche — how a personal brand becomes an institution.
**LAYOUT WALK:** transparent header over video hero → white-ground listings grid (3-col photo cards, price huge) → **black-ground "trophy listings" band ($89M/$76M/$47M)** → regions picker. Grounds alternate pure black/white per section.
**SYSTEM EXTRACTION:** Montserrat only, H1 68px/800 with **-1.5px tracking** (dense masthead feel) · black + white grounds, deep royal `#001A72` accent (pill text, headers) · pills 100px radius vs plain text-links · all-caps ribbons ("FOR SALE").
**MOTION & INTERACTION:** autoplaying behind-the-scenes video hero (only on-load motion in batch); rest static.
**PREMIUM MECHANISM:** (1) media-company positioning — the hero shows the brand *being filmed*, selling attention as the product; (2) price-as-proof — $89M cards ARE the social proof; (3) tight-tracked heavy sans reads as a masthead, not a website.
**MOBILE FLOOR CHECK:** video crops tighter, search collapses to one line, nav → icons; clean.
**STEALABLE:** alternating black/white section grounds as drama; founder-on-camera as trust anchor; specificity-as-proof (cross-file: L9).
**Patterns:** corroborates DP1 · new candidates: single-accent discipline; stat-as-trust · contradicts none.

### D05 — dermamedicalus.com (Derma Medical, aesthetics clinic/training) — 2026-08-01
world: clinical-luxury navy-and-gold academy        confidence: high (smoke-tester capture + computed tokens)
screenshots: assets/design-swipe/D05/ (desktop-fold, desktop-section, mobile-fold)
**Why swiped:** Tier-1 clinic niche — and an EXTERNAL validation of the Oceanides navy+warm-metal axis (D02).
**LAYOUT WALK:** navy header w/ gold serif wordmark → asymmetric hero (text-left on solid navy, clinical-editorial photo right, accreditation badges) → city ticker → vertical-tab content module (gold active-underline) → two-tone serif section heads.
**SYSTEM EXTRACTION:** serif display 82px/500 (Times-class) over Montserrat body · deep navy `#001F3C` ground + muted gold `#CD9253` accent · **CTAs sharp-cornered (0px radius), solid gold, dark text** + plain text-arrow secondary · two-tone headline device (gold word + white/navy words) as structure.
**MOTION & INTERACTION:** 20%-off lead popup auto-fires on desktop (conversion-first, costs elegance); mobile gets a sticky bottom tab bar (Home/Courses/Call/Chat) — app-like nav desktop doesn't have.
**PREMIUM MECHANISM:** (1) academic authority stack — serif + credential badges (ACCME/CPD) + navy = institution, not spa; (2) gold used sparingly and always with dark text = warm metal restraint; (3) clinical-artistic photography (anatomy markings as art direction) signals expertise viscerally.
**MOBILE FLOOR CHECK:** hero stacks, image becomes tall right-bleed crop; badges/CTA stack fine.
**STEALABLE:** two-tone headline as a rhythm device; credentials-at-the-fold; sharp-corner CTA as a "serious institution" signal (vs consumer pills); sticky mobile action bar for call-now businesses.
**Patterns:** corroborates DP1 · new candidates: serif-display-over-sans-body premium; navy+warm-metal institutional; single-accent discipline · contradicts none.

### D04 — merrymaids.com (Merry Maids, home cleaning franchise) — 2026-08-01
world: boutique editorial home-service warmth        confidence: high (smoke-tester capture + computed tokens)
screenshots: assets/design-swipe/D04/ (desktop-fold, desktop-section, mobile-fold)
**Why swiped:** THE Tier-1 find — a cleaning franchise that reads boutique-hospitality. Direct evidence for the Oceanides redesign: premium is available in "unglamorous" service niches.
**LAYOUT WALK:** white header w/ green pill CTA → full-bleed warm lifestyle hero (family + dog, natural light) → 4-up bordered value-prop cards (thin line icons) → centered serif testimonial carousel → "5-star Promise" split panel w/ overlapping circular badge.
**SYSTEM EXTRACTION:** **serif display Borax VF 72px/400** over geometric sans Alexandria body · white/off-white ground, warm grey text `#4E4B48`, ONE accent: leafy green `#78BE21` (CTAs, badges, logo — nothing else) · pills 50px radius, filled primary / ghost secondary.
**MOTION & INTERACTION:** essentially static; testimonial carousel with arrow paging. Calm.
**PREMIUM MECHANISM:** (1) hospitality codes in a utility niche — big soft serif + warm candid photography where every competitor goes corporate-sans + stock; (2) one-accent discipline makes the green feel like a brand, not a highlight color; (3) whitespace + regular-weight display = confidence (shouting is downmarket).
**MOBILE FLOOR CHECK:** hero recrops, headline reflows 3 lines, cards stack single-column; nothing breaks.
**STEALABLE:** serif-display-over-sans-body as THE premium lever for service brands; circular promise badge overlapping photography; warm-documentary photo direction brief.
**Patterns:** corroborates DP1 (vs D03 — same niche, opposite world, this one reads premium) · new candidates: serif-display premium; single-accent discipline · contradicts none.

### D03 — janiking.com (JaniKing, commercial cleaning franchise) — 2026-08-01
world: corporate franchise navy trust        confidence: high (smoke-tester capture + computed tokens)
screenshots: assets/design-swipe/D03/ (desktop-fold, desktop-section, mobile-fold)
**Why swiped:** Tier-1 services niche — the ESTABLISHED-BUT-NOT-PREMIUM pole; the measured contrast case for D04.
**LAYOUT WALK:** utility bar (phone/search) → split hero (two desaturated navy-graded photo panels, all-caps captions, ghost buttons) → navy trust band → stat strip ("6,900 Unit Franchises", crown icon) → team-photo + slate panel ("56 years of trust") → 4-up service icon grid → diagonal-cut band transitions.
**SYSTEM EXTRACTION:** Poppins only, H1 37px/700 · white ground + deep navy `#1A3354` bands, sky-blue icon accent + **a mustard CTA that appears only on mobile** (accent drift) · CTAs 3px radius, weight 900, all-caps · grey body `#777`.
**MOTION & INTERACTION:** static; cookie + chat popups float over the hero (clutter at the money moment).
**PREMIUM MECHANISM (and its ceiling):** institutional scale numbers + uniformed-staff photography + navy = *dependable*, but blunt directive headlines, small tight display type, accent drift, and popup clutter cap it at "established," never "premium." The gap between D03 and D04 is pure design world — same industry, same trust ingredients.
**MOBILE FLOOR CHECK:** hero collapses to one photo + stacked full-width CTAs in TWO different accent colors; chat bubble overlaps stat numbers.
**STEALABLE:** stat-as-trust band placement (number + icon + navy); the anti-pattern list above (what to NOT do) is itself the value.
**Patterns:** corroborates DP1 · new candidate: stat-as-trust · contradicts single-accent discipline (the exception that proves it).

### D02 — clients/oceanides/DESIGN.md (Oceanides, PH local water-delivery service) — 2026-08-01 — CALIBRATION
world: matte municipal print, warm trust        confidence: high (our own shipped work)
screenshots: none — the governing DESIGN.md + the live `feat/oceanides-price-page` branch are ground truth
**Why swiped:** our second design world, built for a Taglish local-service market — proof that the
right client world can be the *exact opposite* of the house style on every axis and still read
premium-for-its-niche.
**SYSTEM EXTRACTION:** see [clients/oceanides/DESIGN.md](../clients/oceanides/DESIGN.md) — that
file is the source of truth; do not restate tokens here. Axes vs D01: matte navy + amber print
(vs charcoal radial + gold glow), **no glass, no grain, no `#FFCC00`**, print-like solidity over
cinematic depth, Taglish register over English.
**PREMIUM MECHANISM:** (1) print-like matte solidity reads as *established and municipal* — the
trust register a local utility-adjacent service needs; (2) restrained two-hue palette (navy +
amber) signals institutional confidence, not startup gloss; (3) verifiable specifics beat
borrowed authority (the SEC-number-over-DENR-badge call, NOW.md blocker #1).
**STEALABLE:** trust-register-matched ground treatment for local service niches; two-hue
institutional palettes; specifics-as-authority.
**Patterns:** corroborates DP1 (calibration) · new candidate: none yet · contradicts none.

### D01 — DESIGN.md + assets/grifon-social/noir/ (Grifon AI, PH SaaS) — 2026-08-01 — CALIBRATION
world: cinematic noir, gold restraint        confidence: high (our own shipped work)
screenshots: none — DESIGN.md + the NOIR asset folder are ground truth
**Why swiped:** the house world, decoded as a calibration point so future D-entries have a
measured baseline for "coherent premium dark."
**SYSTEM EXTRACTION:** see [DESIGN.md](../DESIGN.md) (source of truth). Signature devices:
charcoal radial ground + film grain, single gold accent `#FFCC00` as sole driver, glass panels,
mono `// EYEBROW` labels, serif-accent italic for 1–2 marketing words, silver-gradient display
(desktop only — banned in artifacts per the mobile-render scars in CLAUDE.md).
**PREMIUM MECHANISM:** (1) one accent color doing ALL the work — restraint reads as confidence;
(2) cinematic lighting (radial ground, glow, grain) borrows film-production authority; (3) mono
terminal labels signal engineering seriousness under the marketing gloss.
**MOBILE FLOOR CHECK:** hard-won and documented — contrast floors are measured not estimated
(`#C4C4CB` gradient stop, `#9A9AA3` mono captions), fragile CSS demoted to enhancement.
**STEALABLE:** single-accent restraint; lighting-as-authority; measured contrast floors as a
reusable QA device for ANY dark world.
**Patterns:** corroborates DP1 (calibration) · new candidate: none yet · contradicts none.
