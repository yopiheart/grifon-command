# Design Swipe File

### D19 — Magnific editorial and blue corporate profiles — 2026-10-06

Neil supplied the company-profile gallery and requested comparison across its
styles. Six public preview layouts were visually inspected, including these:

- Solmedia, clean editorial: https://www.magnific.com/premium-psd/architecture-company-profile-brochure-template_422722673.htm
- robi123, blue corporate: https://www.magnific.com/premium-vector/modern-company-profile-brochure-template-layout_422990779.htm
- ArtBoy, photographic corporate: https://www.magnific.com/premium-vector/brochure-template-layout-design-corporate-minimal-company-profile-multipage-brochure-template_49936642.htm
- creativespacepro, dense blue: https://www.magnific.com/premium-vector/company-profile-minimalist-brochure-template-annual-report-a4-size-with-modern-concept-layout_402587092.htm

Evidence: observed public JPEG previews and screenshots; private comparison files
under `.tmp/oceanides-premium/`. The gallery UUID did not identify a selected
template. Exact typefaces and source design files were not extracted.

Mechanisms: the clean editorial layout uses narrow text columns, generous white
space, fine rules and large rectangular photographs. The blue corporate layout
adds solid navy/blue panels and a clear two-column service rhythm. Photographic
corporate supports trust with prominent people imagery. The dense blue variant
uses small charts, angles and many thumbnails, unsuitable for this compact A5
brochure. Earlier yellow and blue signage-style variants were also compared.

Application: combine the editorial grid with Oceanides blue headings, a navy
closing page and large service imagery. Use actual before/after proof; disclose
generated illustrations. Keep sentence case and editable text. These are layout
principles, not copied artwork or claimed reference fonts/colors. The supplied
23-slide Oceanides.pptx adds a supported 2021 founding year; its stale contacts,
credentials, fleet and client wall are excluded.

### D18 — Apple report + OpenAI design guidelines — 2026-10-01

Sources: https://www.apple.com/environment/pdf/Apple_Environmental_Progress_Report_2025.pdf
and https://openai.com/brand/ . Local Apple reference renders inspected at
`.tmp/oceanides-profile/reference/minimal/apple-001.png` through `apple-005.png`.
OpenAI's guidelines were read via web; full brand portal requires authentication,
and no browser surface was available. No claim of live website screenshot review.

Layout: Apple cover uses a dominant left-aligned subject with generous space and
contained photography. Inner pages use quiet navigation, restrained rules and
clear typographic hierarchy. Its card-heavy data pages are not the Oceanides
composition reference. OpenAI describes a geometric, approachable sans family
and generous clear space. Exact Apple fonts were not extracted; OpenAI Sans is
named by its own guidelines. Local editable substitute: Arial Regular/Bold.

System: neutral light/dark grounds, one subject per composition, sentence case,
large type and subordinate metadata. Colors in Oceanides are a new client-specific
combination, not claimed extracted reference hex values. Interaction: print PDF
has none; live motion/hover behavior unobserved. Technical: PDF layout is inspected
directly, but the websites' frameworks are unverified.

Application: Oceanides company profile uses warm white, ink, retained navy and
sparse blue. Keep actual evidence and clear service scopes, remove signage plates
and repeated high-volume contact bands. Axis: clarity and procurement credibility.

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
| DP1 | **World-first, tokens-second** — premium comes from a coherent *world* (ground, texture, type personality, motion moving together), not any single token. Sharpest evidence: three same/adjacent-niche pairs where one brand reads premium and the other doesn't on world-coherence alone — D03 vs D04 (cleaning), D13 vs D14 (supplements — both work, for opposite registers, each coherent), D15 vs D17 (athletic energy). | 15 external (all entries) + D01/D02 calibration | proposed — process port already shipped (funnel-forge step-1 curation pass, 2026-08-01) |
| DP2 | **Serif-display over sans-body = instant authority premium in service/consumable niches** — a large low-weight serif headline over a clean sans body is the single most repeated premium lever: D04 (Borax VF 72px, cleaning), D05 (Times-class 82px, clinic), D12 (Garamond Condensed 72px, food), D14 (Arizona Flare 40px, supplements). The sans-only competitors in the same niches (D03, D13) read functional, not premium. | 4 external, 4 niches | **proposed → DGP-2** |
| DP3 | **Single-accent discipline** — ONE color owns every CTA/interactive/trust moment: D04 green, D05 gold, D07 indigo, D08 green, D10 pink, D14 oxblood, D17 neon. Register-dependent counter-cases, all deliberate: D13 (candy multi-accent = impulse CPG), D16 (module-matched variants = personality-led), D15 (accentless = photography-led). The only version that ALWAYS reads slop is accent *drift* (D03's mobile-only mustard). | 7 external + 3 deliberate exceptions | proposed |
| DP4 | **Type-posture-as-register — pick an extreme, never the middle** — premium brands commit to a pole: thin-at-scale (D07 48px/300), poster-mega (D08 105px/900; D17 96px condensed), or radical restraint (D09 26px; D15 24px; D16 quiet caps). The middle (D03: 37px/700 default bold) is the slop zone — it signals no decision was made. | 6 external + 1 counter | proposed |
| DP5 | **Specific-number authority** — precision is the credibility device: D03 "6,900 franchises", D06 $89M cards, D07 "1.69% of global GDP", D08 live "121.38 PHP" fee math, D13 "100,000 reviews", D14 "22,104 verified". Cross-file: L9 (funnel swipe) — same pattern, page level. | 6 external (+ L9 cross-file) | proposed |
| DP6 | **Trust-stack-at-the-fold** — credibility assets live IN the first viewport, not below: D05 accreditation badges beside the H1, D13 ratings line ABOVE the headline, D14 badge+trial-stats+rating+celebrity in one screen, D08 app-ratings row (mobile). | 4 external | proposed |
| DP7 | **Warm-ground-not-white** — consumer premium avoids pure white: D09 bone `#F7F7F4`, D12 cream `#F6E6D9`, D13 pale cream, D14 cream bands, D16 cream `#F0E6D8`. Register-dependent: institutional fintech (D07 D08) correctly stays clinical white. | 5 external | proposed |
| DP8 | **Proof-object-in-the-fold** — the fold shows the real thing working, not an abstraction: D08 live fee calculator, D09 actual IDE screenshot, D11 products-as-the-page, D12 in-use squeeze video, D15 garment-in-motion video. | 5 external | **proposed → DGP-2** (the price-calculator port) |
| DP9 | **Keyword-color / two-tone headline emphasis** — accent lands on the one load-bearing word: D05 gold+navy two-tone, D07 black+gradient runs, D10 pink "Brain", D13 green "You'll Actually Crave", D17 green "ACTION". The cheapest portable premium device in the file. | 5 external | proposed |
| DP10 | **Grain/texture over dark gradient ground** (the D01 NOIR axis) — D11 (film grain + shifting blue→black gradient, PH brand). | 1 external | observed |
| DP11 | **Craft-density as anti-slop signature** — bespoke typographic set-pieces (D12's melting wordmark, typewriter body, hand annotations) that prove a human with taste made it. | 1 external | observed |

*(Next D-number = D18. Next DP-number = DP12. Deliberate-exception ledger matters: DP3/DP4/DP7
are REGISTER rules, not universals — the entry must say which register the client's market is in.)*

---

## Gated Proposals

Design-system changes distilled from ≥3-corroborated DP-patterns, awaiting Neil's explicit
approval. Template-shaped changes ALSO ship as FGPs in `funnel_swipe_file.md` (that file owns
`funnels/_template`).

### DGP-2 — The Oceanides redesign recipe (endorsed by Neil 2026-08-01: "redesign natin ung oceanides kasi okay na ung funnel nun"; execution = next Oceanides session, WITH Neil)

Scope: visual world of the price page / site on `feat/oceanides-price-page`. The funnel
structure is approved and untouched; [clients/oceanides/DESIGN.md](../clients/oceanides/DESIGN.md)
remains source of truth and is REFINED by this, never overridden. Copy stays Taglish.

1. **Keep the navy+amber world — now externally validated.** D05 (navy+gold = clinical
   institutional authority) and D14/D16 (warm oxblood+cream premium health/beauty family)
   prove D02's axes were right. This is refinement, not replacement.
2. **The DP2 lever (biggest single upgrade):** serif display over sans body. D04 is the exact
   precedent — a cleaning franchise that reads boutique-hospitality via a 72px soft serif.
   Oceanides currently has no display-type posture at all (DP4: the undecided middle).
3. **The DP8 port that attacks the actual business problem:** the page exists because every ad
   thread dies at "magkano?" (₱1,284 → 1 order). Wise's D08 answer: put the REAL math in the
   fold — a price panel/calculator ("X drums → ₱Y, kasama na ang hose") as the hero's
   proof-object, not a rate card buried below. Answer "magkano" before it's asked.
4. **DP6 + DP5 trust-stack at the fold:** SEC Reg. No. + BIR TIN + served-count as specific
   numbers beside the headline (blocker #1 in NOW.md gates this — numbers must come from Neil;
   NEVER invent them, per the trust line).
5. **DP3:** amber owns every CTA and trust moment, nothing else does. Watch for accent drift
   (D03's failure mode).
6. **DP9:** two-tone Taglish headline with the amber punch word.
7. **Mobile recomposition, not shrinkage** (D14 text-first flip / D16 overlay→card): design the
   390px composition as its own layout decision.

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

### D17 — gelblaster.com (Gel Blaster, outdoor toy/gaming DTC) — 2026-08-01
world: neon-dark tactical gaming-toy        confidence: high (smoke-tester capture + computed tokens)
screenshots: assets/design-swipe/D17/ (desktop-fold, desktop-section, mobile-fold)
**Why swiped:** the high-energy pole done with DISCIPLINE — proof that loud and premium can coexist when the accent stays singular.
**LAYOUT WALK:** saturated-green announcement bar → near-black condensed-caps nav → full-bleed action photo hero (player aiming at camera), **96px Rajdhani condensed H1 "GET IN THE ACTION" — white words + green punch word** → "SHARE HOW YOU PLAY" UGC panel (@gelblaster IG/TikTok chips) → 3 category tiles w/ glowing green headline treatment.
**SYSTEM EXTRACTION:** Rajdhani condensed display 96px/700 caps over Roboto body · near-black ground `#111318` + ONE neon green `#6DD747` (CTAs, highlights, glows, punch words — nothing else) · 12px-radius solid-green primary + green-outline secondary, repeated as a pair · 10%-off email popup on entry.
**MOTION & INTERACTION:** static hero (video lives behind a "Watch It In Action" CTA instead of autoplay — deliberate choice).
**PREMIUM MECHANISM:** (1) maximum energy, minimum palette — one neon on near-black reads gaming-grade intentional, where three accents would read toy-store cheap; (2) community-as-trust (UGC solicitation, zero review stars) fits a play brand; (3) condensed caps at 96px = kinetic authority.
**MOBILE FLOOR CHECK:** hero recomposes to stacked (headline splits, green word gets its own line — the two-tone device survives); CTAs go full-width below the photo.
**STEALABLE:** two-tone punch-word headline; energy-with-discipline formula; UGC panel as a trust section for community brands.
**Patterns:** corroborates DP1; single-accent discipline; type-posture (maximal pole); keyword-color emphasis · contradicts none.

### D16 — kyliecosmetics.com (Kylie Cosmetics, celebrity beauty DTC) — 2026-08-01
world: warm celebrity beauty editorial        confidence: high (smoke-tester capture + computed tokens)
screenshots: assets/design-swipe/D16/ (desktop-fold, desktop-section, mobile-fold)
**Why swiped:** Tier-1 beauty niche — trust carried ENTIRELY by personality; the quiet-luxury pole of DTC.
**LAYOUT WALK:** cream utility strip → lowercase nav ("new, best sellers, fragrance+…" — lowercase as intimacy device) → full-bleed campaign photo (Kylie on sun-bleached rocks, product ABSENT from frame), small "INTRODUCING" eyebrow + quiet caps headline + one outline CTA → asymmetric 2×4 mood-board collage (product macros + lifestyle tiles) → plain email-capture band.
**SYSTEM EXTRACTION:** sans-only — rounded body face (Tt-Chocolate 17px), bold grotesk display used SMALL · warm cream ground `#F0E6D8`, deep oxblood `#3F2021` core accent + dusty rose-browns · 4px-radius buttons in FOUR color variants matched per module (no single CTA color — deliberate, personality-led) · desaturated-earth photo grade.
**MOTION & INTERACTION:** essentially static; hero has a pause control (slide rotation).
**PREMIUM MECHANISM:** (1) celebrity IS the trust stack — zero reviews, zero badges, zero guarantees anywhere at the fold; (2) quiet type + negative space where the category screams (the restraint pole of beauty); (3) mood-board grid sells a WORLD, not SKUs.
**MOBILE FLOOR CHECK:** headline moves from photo-overlay to its own cream card below the image — deliberate recomposition; announcement bar gains promo copy desktop didn't show.
**STEALABLE:** lowercase-as-intimacy; mood-board collage section; overlay→card mobile recomposition pattern; warm oxblood+cream palette (mirrors D14 — a warm-maroon premium family emerging in health/beauty).
**Patterns:** corroborates DP1; warm-ground-not-white; type-posture (restraint pole) · **deliberately contradicts single-accent discipline** (module-matched variants; personality-led register — same lesson as D13).

### D15 — row.gymshark.com (Gymshark, athletic apparel DTC) — 2026-08-01
world: stark athletic-editorial monochrome        confidence: high (smoke-tester capture + computed tokens)
screenshots: assets/design-swipe/D15/ (desktop-fold, desktop-section, mobile-fold)
**Why swiped:** Tier-1 fitness niche — a billion-dollar brand running near-zero decoration; the drop-model restraint case.
**LAYOUT WALK:** thin shipping-threshold strip → full-bleed autoplay video hero (torso pulling off a shirt, moody dark grade), lower-third **24px uppercase H1** ("DEVANT JUST DROPPED") + stacked white-solid/white-outline CTAs → 4-up product carousels on warm beige studio grounds (star ratings, NEW chips, wishlist hearts) → Women/Men pill toggle grid → SEO copy dump → utility footer.
**SYSTEM EXTRACTION:** Montserrat heads / Roboto body, sans-only · black/white core, NO brand accent — the garment colorway supplies the only color · **0px-radius rectangles**, small 14px labels, exactly one primary+secondary pair per module · announcement strip as the only warm note.
**MOTION & INTERACTION:** autoplay muted hero video w/ pause control; arrow carousels; nothing else moves.
**PREMIUM MECHANISM:** (1) drop-culture framing — "JUST DROPPED" headline treats apparel like limited releases (scarcity without counters); (2) accentlessness as flex — the brand is confident enough to let product photography be the palette; (3) sharp rectangles + small type = editorial fashion codes, not e-com codes.
**MOBILE FLOOR CHECK:** app-install banner + promo strip stack above hero (pushes fold down — a cost they accept for app conversion); carousel gains visible add-to-cart icons mobile-only.
**STEALABLE:** drop-language for launches; studio-ground product cards (one consistent warm backdrop = instant catalog coherence); honest star ratings even when mediocre (★2.8 shown — radical trust).
**Patterns:** corroborates DP1; type-posture (restraint pole); product-as-hero · contradicts "premium needs an accent color" — accentless is a valid world when photography is strong.

### D14 — im8health.com (IM8, celebrity supplement DTC) — 2026-08-01
world: clinical-premium celebrity wellness        confidence: high (smoke-tester capture + computed tokens)
screenshots: assets/design-swipe/D14/ (desktop-fold, desktop-section, mobile-fold)
**Why swiped:** Tier-1-adjacent supplement DTC — premium health authority done at celebrity scale; has a PHP currency selector (sells to our market).
**LAYOUT WALK:** countdown promo bar (30% welcome offer, live timer) → serif `I·M·8` wordmark nav → split hero: Beckham candid kitchen photo left, copy stack right (Clinicians' Choice badge · clinical stats 95%/85%/80% · 4.8★ 22,104 reviews · dual pill CTAs) → solid oxblood trust band → authority section (caps eyebrow + serif head) → 3 product cards w/ NSF CERTIFIED SPORT badges on peach gradients.
**SYSTEM EXTRACTION:** serif display **ABC Arizona Flare 40px/400** over Aeonik sans body · white/cream grounds banded with deep oxblood `#A40011` · pills 100px, solid-oxblood primary + outline-ghost secondary as a repeated PAIR · caps eyebrows for credentials only.
**MOTION & INTERACTION:** live countdown ticking; gamified scratch-card popup on entry (no discoverable close — Escape only; dark-pattern flag).
**PREMIUM MECHANISM:** (1) serif-authority + sans-utility split — pharma-adjacent gravitas, zero playfulness; (2) trust stacked AT the fold, not below it: badge + trial stats + rating + celebrity in one viewport; (3) one oxblood owning every interactive and every trust band.
**MOBILE FLOOR CHECK:** hero flips text-first (photo drops below fold) — deliberate mobile recomposition, opposite of desktop; countdown reflows 2 lines.
**STEALABLE:** trust-stack-at-the-fold ordering; primary+ghost CTA pairing; dark-band trust interludes between white sections. Flag: the no-close popup is a do-not-replicate.
**Patterns:** corroborates DP1; serif-display premium; single-accent discipline; stat-as-trust · new candidate: trust-stack-at-fold · contradicts none.

### D13 — gruns.co (Grüns, superfood gummies DTC) — 2026-08-01
world: candy-bright wellness conversion machine        confidence: high (smoke-tester capture + computed tokens)
screenshots: assets/design-swipe/D13/ (desktop-fold, desktop-section, mobile-fold)
**Why swiped:** the ENERGY pole of DTC — maximum conversion pressure styled as fun; the measured contrast to D14's clinical restraint in the same broad niche.
**LAYOUT WALK:** pink emoji promo bar → hero: 4.8★/100k-reviews/1M-members line ABOVE the headline, bold sans head with green keyword emphasis ("You'll Actually Crave"), pouch shot + red "limited edition" starburst → 3 yellow stat circles (60+/21/6g) → greyscale press bar (Forbes, TODAY, People…) → flavor cards w/ ribbon tags → white value cards on flat kelly-green field scattered with 3D gummy bears.
**SYSTEM EXTRACTION:** Work Sans ONLY — no serif; 44px/700 head, -2.2px tracking · cream/pale-yellow ground, kelly-green anchor + yellow badges + red starburst (deliberately multi-accent) · pills, dark-green fill, the single most-repeated element on the page · green color-highlighting replaces a second typeface as the emphasis device.
**MOTION & INTERACTION:** 52%-off segmentation quiz popup on entry (asks which problem you're solving — lead-scoring, cross-file: L3/L6) + persistent peeled "Get 52% Off" edge tab; countdown-free urgency.
**PREMIUM MECHANISM (different target):** this world optimizes CRAVE, not premium — candy palette + food-photography grade + offer pressure. The lesson is fit-to-outcome: for impulse CPG, "premium restraint" would LOWER conversion. Design world must match the buying temperature.
**MOBILE FLOOR CHECK:** hero recomposes photo-first (opposite of D14's text-first flip — both deliberate); sticky offer tab persists.
**STEALABLE:** review-line-above-headline ordering; quantified stat circles; keyword-color emphasis instead of a display font; the segmentation-quiz popup pattern (cross-file: L6).
**Patterns:** corroborates DP1; stat-as-trust; trust-stack-at-fold · **deliberately contradicts single-accent discipline** — evidence the pattern is register-dependent, not universal.

### D12 — graza.co (Graza, DTC olive oil) — 2026-08-01
world: playful editorial olive-oil zine        confidence: high (smoke-tester capture + computed tokens)
screenshots: assets/design-swipe/D12/ (desktop-fold, desktop-section, mobile-fold)
**Why swiped:** Tier-1 food niche — the craft-personality masterclass; distinctiveness through typographic craft, zero badges.
**LAYOUT WALK:** thin serif wordmark nav w/ cream pills → full-bleed hero VIDEO (hand squeezing the teal bottle, warm cinematic grade), condensed-serif head bottom-left, lime pill CTA → hand-drawn olive-branch line art + "*DRIP*" annotation → **giant melting-drip "GRAZA" wordmark set-piece (letters melt at the baseline)** → product carousel w/ pill category tags + autoplay videos (pause controls).
**SYSTEM EXTRACTION:** **ITC Garamond Condensed 72px/400 display over GT Alpina TYPEWRITER body** — the boldest type pairing in the file · warm cream ground `#F6E6D9`, deep olive text `#3C422E`, lime CTA + mustard cap accents · pills everywhere, sentence-case headlines · hand-lettered annotations as an accent device.
**MOTION & INTERACTION:** autoplay muted product videos (with pause controls); the melting wordmark reads as a designed scroll set-piece.
**PREMIUM MECHANISM:** (1) craft-density — custom drip type, typewriter body, hand annotations: every detail says a human with taste made this (the literal anti-slop signature); (2) product-in-use video, never static pack shots — appetite through motion; (3) warm cream ground instead of white = pantry, not supermarket.
**MOBILE FLOOR CHECK:** hero recrops vertical, head + CTA stack below video; holds.
**STEALABLE:** one bespoke typographic set-piece per page as the personality anchor; typewriter/mono body as craft signal; warm-ground food palette; in-use video hero.
**Patterns:** corroborates DP1; serif-display premium · new candidates: craft-density; warm-ground-not-white (w/ D09) · contradicts none.

### D11 — skylrk.com (SKYLRK, PH streetwear e-com) — 2026-08-01
world: moody noir product-float gallery        confidence: high (smoke-tester capture + computed tokens)
screenshots: assets/design-swipe/D11/ (desktop-fold, desktop-section, mobile-fold)
**Why swiped:** Neil's drop — turns out to be a PHILIPPINE brand (₱ pricing) proving world-class hype design ships from our market. External corroboration for the D01 NOIR axis (grain + dark gradient ground).
**LAYOUT WALK:** no sections — one continuous scroll canvas: glass-pill chrome (wordmark, cart "0 +", `[ ₱PHP ]` toggle) over 14+ products floating at varying depths/sizes on a shifting icy-blue→near-black gradient with heavy film grain. Most items "Sold out."
**SYSTEM EXTRACTION:** Suisse Intl · pure black ground + animated gradient overlay + grain · **no H1 anywhere** — type confined to small tracked-out UI chrome · no accent color: the PRODUCTS are the color, popping against the cool dark ground · glass pills as the only chrome.
**MOTION & INTERACTION:** shifting gradient ground + depth-float parallax implied; no CTA buttons at all — products themselves are the interface.
**PREMIUM MECHANISM:** (1) gallery-not-catalog — scattered non-grid float says art object, not inventory; (2) hype-by-absence — no headline, no pitch, "Sold out" stamps as the persuasion; (3) grain + gradient dark ground gives physical texture to a digital page.
**MOBILE FLOOR CHECK:** collapses to one floating product per viewport; world holds.
**STEALABLE:** grain-over-gradient as texture (validates D01 NOIR externally); glass-pill chrome; scarcity-as-copy. NOT stealable for lead-gen: the no-CTA model (hype brands only).
**Patterns:** corroborates DP1; D01's grain/dark-gradient axis (1st external) · new candidate: product-as-hero · contradicts none (the no-CTA anti-pattern is model-specific).

### D10 — vertus.ai/superintelligence (Vertus AI) — 2026-08-01
world: uncanny biological sci-art minimalism        confidence: high (smoke-tester capture + computed tokens)
screenshots: assets/design-swipe/D10/ (desktop-fold, desktop-section, mobile-fold)
**Why swiped:** AI SaaS — how to be unforgettable with ONE image and near-zero copy.
**LAYOUT WALK:** plain white nav → hero: photoreal 3D render (pink coral-organic growth on pale bone) filling >80% of viewport, headline low-left over white fade → pink-eyebrow value section ("Built Like a Brain, not a Database", pink-highlighted keyword) → two gray comparison cards (fixed-architecture vs dynamic-topology process chains) → closing CTA band.
**SYSTEM EXTRACTION:** Aspektavf custom sans, H1 48px/500, -1.44px tracking · white ground, pure black/white/gray + ONE hot-pink/magenta accent (hero form, eyebrow icon, highlighted word — nothing else) · pills 500px radius, black fill / white outline pair, 3× repetition.
**MOTION & INTERACTION:** static in capture.
**PREMIUM MECHANISM:** (1) one singular uncanny image carries the entire brand — everything else stands down; (2) accent color appears ONLY where meaning lives (the brain word, the organic form) — color as semantics, not decoration; (3) zero trust devices — pure conceptual confidence (works for frontier-tech positioning, nowhere else).
**MOBILE FLOOR CHECK:** hero crops to the coral form, text block stacks at bottom; holds.
**STEALABLE:** highlighted-keyword device (accent on the one load-bearing word); comparison-card process chains; the "one image, total restraint" formula for category-creator positioning.
**Patterns:** corroborates DP1 · new candidate: single-accent discipline · contradicts none.

### D09 — cursor.com (Cursor, AI coding agent) — 2026-08-01
world: quiet technical minimalism, painterly warmth        confidence: high (smoke-tester capture + computed tokens)
screenshots: assets/design-swipe/D09/ (desktop-fold, desktop-section, mobile-fold)
**Why swiped:** Grifon's competitive category (Tier 3) — the extreme-restraint pole of premium.
**LAYOUT WALK:** flat text nav + black pill Download → hero: **26px H1** ("Cursor is your coding agent…"), left-aligned, plain → full IDE screenshot on a muted oil-painting landscape backdrop → agent-workflow UI panels → right-aligned bold claim + cloud-agent browser mockup.
**SYSTEM EXTRACTION:** CursorGothic custom grotesque, everything ~400 weight · warm bone ground `#F7F7F4`, near-black `#26251E` — low-saturation, paper-like, NO accent color at all · black pills + plain arrow-links · mono appears only inside product UI, never in marketing type.
**MOTION & INTERACTION:** static reliance on real product screenshots as imagery.
**PREMIUM MECHANISM:** (1) a hero headline SMALLER than body copy — ultimate "the product speaks" flex; confidence signaled by what's withheld; (2) painterly fine-art texture humanizes a technical tool; (3) real dense product UI as proof — no marketing illustration anywhere.
**MOBILE FLOOR CHECK:** ⚠ the IDE screenshot does NOT reflow — scaled-down desktop UI, illegible text, clipped columns. A real responsive weakness; do not copy the screenshot-as-hero without a mobile-specific crop.
**STEALABLE:** understatement as register; product-as-hero (with a mobile plan D09 lacks); warm-bone ground as the anti-slop alternative to pure white.
**Patterns:** corroborates DP1 · new candidates: product-as-hero; type-posture-as-register (restraint pole) · contradicts the "big display type = premium" assumption.

### D08 — wise.com/ph (Wise, fintech) — 2026-08-01
world: bold flat fintech poster-green        confidence: high (smoke-tester capture + computed tokens)
screenshots: assets/design-swipe/D08/ (desktop-fold, desktop-section, mobile-fold)
**Why swiped:** Tier-2 trust-critical fintech, PH-localized page — the maximalist-type pole of premium.
**LAYOUT WALK:** nav (PH flag + green pill) → centered mega-headline on plain white → gray subhead + one green pill → animated 3D globe (teal earth, gold coin discs w/ ₱, pause control) → **send-money calculator card on full-bleed brand-green panel ("121.38 PHP", "Arrives by Monday")** → localized value section → two-col product cards (balance UI, physical card).
**SYSTEM EXTRACTION:** custom Wise Sans **105px/900** display over Inter 18px body — the batch's most extreme type jump · white ground + ONE saturated green `#9FE870`, near-black text, high contrast · pills 9999px, very high CTA density (3+ per two screens).
**MOTION & INTERACTION:** confirmed animated globe (has a pause control — accessibility-correct autoplay).
**PREMIUM MECHANISM:** (1) poster-grade type scale — 105px/900 reads as a statement of scale itself; (2) REAL product math in the fold (live fees, arrival day) — the calculator is the trust device, not a badge; (3) one brand green owning every interactive element.
**MOBILE FLOOR CHECK:** adds an app-rating trust row (4.8★ / 152K + 1.3M reviews) not prominent on desktop — mobile gets MORE trust, not less. Headline wraps 4 lines and stays huge.
**STEALABLE:** proof-object in the fold (calculator/live math) — directly portable to service pricing pages; mobile-specific trust row; single-green CTA ownership.
**Patterns:** corroborates DP1 · new candidates: single-accent discipline; proof-object-in-fold; type-posture-as-register (maximal pole) · contradicts none.

### D07 — stripe.com (Stripe, payments infrastructure) — 2026-08-01
world: airy editorial fintech gradient-glass        confidence: high (smoke-tester capture + computed tokens)
screenshots: assets/design-swipe/D07/ (desktop-fold, desktop-section, mobile-fold)
**Why swiped:** Tier-2 — the institutional-trust masterclass; the internet's default "premium SaaS" reference.
**LAYOUT WALK:** thin text nav → editorial hero (multi-line headline mixing black + gradient-tinted runs, diagonal rainbow-mesh ribbon bleeding off-edge) → indigo pill + Google-outline pill → 7-logo enterprise bar (Amazon, Nvidia, Ford, Coinbase, Google, Shopify) → two-tone section heads → product triad (AI chat UI, pastel card mockup, globe-dots viz) → floating dashboard mockup on pink-purple gradient panel.
**SYSTEM EXTRACTION:** Söhne, H1 48px at **weight 300** with -0.96px tracking — thin-at-scale airiness · white ground, indigo primary, rainbow gradient as decorative BLEED (never a text ground) · pills 4px-adjacent radius, low CTA density.
**MOTION & INTERACTION:** scroll-reveal likely; not confirmed in static capture.
**PREMIUM MECHANISM:** (1) thin weight at display size — effortlessness as authority (the inverse of D08, same conclusion); (2) gradient quarantined to decoration so text stays maximum-contrast; (3) trust stack of logos + a live oddly-specific stat ("1.69% of global GDP") — precision as credibility (cross-file: L9).
**MOBILE FLOOR CHECK:** ribbon becomes full-width backdrop behind text, logo bar truncates to 2, CTAs stack; holds.
**STEALABLE:** two-tone headline emphasis; gradient-as-bleed discipline; the specific-stat trust line; product-UI mockups as section imagery.
**Patterns:** corroborates DP1 · new candidates: single-accent discipline; type-posture-as-register (thin pole); stat-as-trust (w/ D03 D06) · contradicts none.

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
