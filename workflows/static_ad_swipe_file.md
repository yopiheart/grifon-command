# Static Ad Swipe File

The compounding database of **static image ad** patterns worth stealing —
the still-image counterpart to `workflows/viral_swipe_file.md` (which is
*video*-only). Every reference ad gets a decoded entry (layout + the
persuasion lever it runs on + what Grifon can lift), patterns accumulate in the
index, and template proposals for **Image Ads Gen** (`generateAdCreatives` in
`services/geminiService.ts`) live as **Gated Proposals** until Neil approves.
Maintained by `grifon-creative-director` (visual DNA) + `grifon-cmo` (offer/lever
logic) when Neil drops a static ad to learn from. Feeds the
`grifon-ad-strategist` playbook (warm-retarget upsell angle).

**Cafe-PC rule:** commit every update immediately
(`swipe(static): add <slug>`). Uncommitted work dies with the reboot.

**The trust line (non-negotiable, both skills' hard constraint):** we steal
*structure and lever*, never the lie. No fake DMs, no fake countdowns, no
invented stats, no manufactured scarcity. Bryan's #1 objection is "just another
AI tool that lies" — trust is the brand asset. Real guarantee, real cohort cap,
real proof, or it doesn't ship.

## Pattern Index

Status: `observed` (counting) → `proposed` (≥3 corroborations / in a Gated
Proposal) → `applied` (shipped as an Image Ads Gen template or CMO playbook).

| ID | Pattern | Corroborations | Status |
| --- | --- | --- | --- |
| S1 | **Risk-reversal headline** — the promise IS the guarantee ("kick-off in 5 days OR all your money back"). Removes the buy-risk at the headline, not the fine print. | 3 (E1, E2, E3) | observed |
| S2 | **Authority portrait hero** — founder cut-out, confident pose, gold rim-light on black; the *person* is the proof when there's no physical product. | 4 (E1–E4) | observed |
| S3 | **Ticket / tier comparison** — Free (dull, glass) vs paid (gold, glowing) cards side by side; anchoring makes the upgrade obvious. | 2 (E3, E2-partial) | observed |
| S4 | **Offer-stack checklist** — gold/green ✅ list of what they GET (calls, templates, bonuses) + guarantee tag. Reciprocity + commitment. | 2 (E2, E3) | observed |
| S5 | **Gold-on-black SaaS palette** — `#FFCC00`-class gold + near-black, glassy cards, gold lozenge "VIP/PRO" badge, gold gradient CTA bar. (Already Grifon's palette.) | 4 (E1–E4) | observed |
| S6 | **CTA-bar color A/B test** — same creative shipped with gold / green / blue "Learn more" bars across the set; they're testing button color, not just creative. | 3 (E1 gold, E2 green, E4 blue) | observed |
| S7 | **Fake-DM / manufactured scarcity** — "pre-approved," blurred meeting invite, "selecting a few people." **ANTI-PATTERN for Grifon** — recorded so we copy the *layout* (cohort offer) but never the fabrication. | 2 (E4, E1-urgency) | observed (do-not-replicate) |
| S8 | **Hyper-specific niche callout** — "If you own a *[exact niche]* doing *[real revenue]* a year, we made this *[free asset]* for you." Self-identification + specificity (Sabri Suby dream-buyer). ONE template → N niche variants off a swapped variable. | 1 (E5 = 3 niche variants of one creative) | observed |
| S9 | **Anti-design text-only pattern interrupt** — flat solid bg, centered white sans, zero imagery/logo/CTA button; reads as a personal note, not an ad. **Contradicts S5 + Grifon's cinematic brand** — adopt the copy mechanic; test the bare visual only as a deliberate experiment. | 1 (E5) | observed (brand-conflict) |
| S10 | **Value-first lead magnet (TOF)** — gives a free asset ("Scaling Roadmap") to a cold dream-buyer. Top-of-funnel; the opposite end from the E1–E4 bottom-funnel upsell. | 1 (E5) | observed |

## Gated Proposals

*Image Ads Gen template changes awaiting Neil. Editing `generateAdCreatives`
touches the **TUNED** `services/geminiService.ts` (locked per `services/CLAUDE.md`)
— neither skill applies this autonomously. Approve → surgical edit + vitest +
verify.*

### GP-1 — Add a "SaaS Offer / Upsell" template family to Image Ads Gen

**Why:** Image Ads Gen ships exactly 3 templates today — `Press Clip`,
`Benefit Anatomy`, `Split-Screen` (`services/geminiService.ts:2440`) — all
**physical-product** angles (they assume a device/product on screen; "screen
must face the viewer," "labels pointing to product features"). A
**software/service** offer has nothing to photograph: the hero is the *promise,
the guarantee, and the person*. This family covers the warm-retarget **Free→Pro→
Business** upsell that has no creative template today. Decoded from E1–E4 below.

**Funnel slot:** warm retargeting (registered-but-not-upgraded), CMO Priority #2
(Free→Pro) and #1 (Business/Autopilot). Distinct from cold free-signup ads.

**Proposed templates** (each = CMO angle + CD visual recipe):

**1. `Guarantee Hero`** *(from E1)* — risk-reversal as the headline.
- **CMO angle:** headline = the outcome fused to the guarantee. Pattern:
  "*<dream outcome> in <real timeframe> — or <real reversal>*." `hookLogic` =
  Risk-reversal + Authority. Guardrail: reversal must be a real, honored policy;
  timeframe must be deliverable.
- **CD recipe:** founder/avatar cut-out centered, confident pose, **gold
  rim-light + radial spotlight on `bg-zinc-950`**; gold lozenge brand badge over
  chest line; headline in white Inter ExtraBold with the guarantee clause in
  `#FFCC00`; gold-gradient pill CTA. Portrait sourced from the wizard **Avatar**
  / uploaded founder photo (Zam/Neil for Grifon's own ads).

**2. `Ticket Compare`** *(from E3)* — anchoring via tier contrast.
- **CMO angle:** two/three cards — current tier (dull) vs target tier (gold).
  Target card lists what they GET (outcome verbs, not features) + the guarantee
  line. `hookLogic` = Anchoring + Commitment-consistency. Guardrail: every line
  must be a real tier benefit; no unlimited promises (hard constraint).
- **CD recipe:** stacked glassy ticket cards (notched edges), free card
  `bg-zinc-900/80 border-white/10` muted, paid card gold border + gold glow
  `shadow-[0_0_20px_rgba(255,204,0,0.4)]` + gold "PRO/VIP" lozenge; headline
  "CHOOSE WHAT YOU WANT"; gold CTA bar.

**3. `Offer Stack Checklist`** *(from E2)* — reciprocity + guarantee.
- **CMO angle:** headline = the guarantee ("I'll give all your money back
  if…"); ✅ list of what they GET (calls, templates, bonuses); close with the
  penny-back tag. `hookLogic` = Reciprocity + Risk-reversal. Guardrail: bonuses
  listed must actually exist.
- **CD recipe:** smaller portrait top, gold/`#FFCC00` check rows on black, each
  row white Inter; guarantee tag in a gold-glow text line; gold CTA bar. (Note
  E2 shipped a **green** CTA bar — wire CTA-bar color as a variant field, S6.)

**4. `Authority Promise`** *(replaces E4's fake-DM)* — the clean, honest version.
- **CMO angle:** one face + one outcome headline, MrBeast-clean (3–6 words). If
  scarcity is used it's a **real** cohort cap ("12 seats this cohort"), never a
  fabricated DM. `hookLogic` = Authority + (optional real) Scarcity.
- **CD recipe:** large founder portrait, arms-wide/open pose, big gold
  `AI`-lozenge-style logotype, single white+gold headline, gold CTA bar. No
  mock UI, no fake invite (that's the E4 anti-pattern, S7).

**Build scope / open decisions (for the gated task):**
- `templateType` enum gains 4 values **or** a `family: "product" | "saas-offer"`
  selector so the generator picks the right set (cleaner than 7 flat types).
- New input needs: **guarantee text**, **tier names + what-you-get per tier**,
  **authority/founder image source**. Decide: derive from existing `UplinkData`
  (`originalPrice`/`offerPrice`/`keyFeatures`) or extend `UplinkData` + the
  `AdVariant` schema in `types.ts` (schema change → vitest under `tests/unit/`).
- Keep the existing `CRITICAL VISUAL RULE` for product templates; SaaS family
  swaps it for an **APPEARANCE/PORTRAIT rule** (founder faces viewer, consistent
  identity).
- All four inherit the **trust guardrail** in the prompt so the model cannot
  emit fake DMs, fake countdowns, or invented numbers.

### GP-2 — Add a "Niche Callout" text-only template to Image Ads Gen

**Why:** E5 (Sabri Suby / King Kong) — a minimalist self-ID callout that's a
long-running winner. Cheapest creative to produce (pure typography; arguably no
image model needed) and the **highest-leverage for Grifon**: spin one template
into N PH-niche variants for Bryan's sub-segments (coffee shop, salon, e-com
seller, real-estate, resto, online coach). **Funnel slot:** cold TOF lead magnet
— CMO Priority #3 (free-signup from cold traffic).

- **CMO angle:** copy = "If you run a *[specific PH niche]* *[doing $X / real
  qualifier]*, we built *[the free asset]* for you." Fill the niche variable per
  ad set. `hookLogic` = Specificity + Self-identification + pattern-interrupt.
  This *already* matches our copy rules ("write to ONE person"; "if the hook
  fits any SaaS, rewrite"). Guardrail: the qualifier and the free asset must be
  real.
- **CD decision (flag, decide at build):** the flat-navy anti-design (S9)
  **conflicts with DESIGN.md** (cinematic gold-on-black; "if it could belong to
  any brand it's wrong"). Two ships: **(i) Grifon-cinematic** — `bg-zinc-950`,
  white Inter, the niche + qualifier in `#FFCC00`, subtle gold glow (on-brand,
  recommended default); **(ii) bare pattern-interrupt** — flat dark, no brand,
  white text only (off-brand by design, run purely as a scroll-stop A/B).
  Recommend ship (i) default + (ii) as the variant.
- **Build scope:** smallest of any template — a typography-only generator that
  can skip the image model entirely. New `callout` family (or a type in
  `saas-offer`) + `niche` / `qualifier` / `leadMagnet` inputs. Same TUNED gating
  as GP-1.

## Entries

Append newest at the top.

### 2026-06-20 — E5 Sabri Suby / King Kong "Scaling Roadmap" niche callout (FB/IG, B2B lead-gen) — 3 niche variants
**Why swiped:** Neil flagged it as a best-performing, long-running **active** ad from the Sabri Suby / King Kong stable (Sabri Suby = *Sell Like Crazy*, already canon in `grifon-cmo`). Long duration + still live = proven. **Format:** 4:5 / 1:1 feed static, text-only.
**Layout:** flat navy background, **no imagery, no logo, no CTA button**; one centered white sans paragraph; the **niche** and the **revenue qualifier** bolded. Observed variants (same creative, one swapped variable): "*machining* or *CNC business*," "*gutter installation company*," "*SEO agency*" — each "…doing $1M+ a year, we made this Scaling Roadmap for you."
**Levers:** Specificity + Self-identification (Sabri Suby dream-buyer callout) + Pattern-interrupt (looks like a personal message, not an ad) + Value-first lead magnet (free Scaling Roadmap).
**Weaknesses:** zero brand recall; rides entirely on copy; flat design conflicts with a cinematic brand.
**So What for Grifon:** the `Niche Callout` template (GP-2). The copy mechanic is pure CMO gold and matches rules we already run — spin per PH niche for Bryan's sub-segments. Decide cinematic-render vs bare pattern-interrupt at build.
**Patterns:** new candidates S8, S9, S10; corroborates the Sabri Suby specificity canon CMO already uses. Contradicts S5 (anti-design vs gold-on-black) — recorded as a deliberate brand decision, not an accident.

### 2026-06-20 — E1 Iman Gadzhi "Kick-Off in 5 Days or Money Back" (IG Sponsored, AI workshop/info-product)
**Why swiped:** long-running scaled upsell for a software/workshop offer; warm-audience retarget ("You already committed to watching the workshop…"). **Format:** 4:5 feed static.
**Layout:** authority portrait (arms crossed, glasses, black blazer) on gold-spotlit black → gold "AI INCOME [VIP] WORKSHOP" lozenge → headline "Get Your AI Online Business Ready to **Kick-Off in 5 Days** or **I Give All Your Money Back**" → gold-gradient pill CTA "UPGRADE TO VIP BEFORE IT'S TOO LATE" → gold "Learn more" bar.
**Levers:** Authority (portrait) + Risk-reversal (money back) + Urgency ("before it's too late").
**So What for Grifon:** the `Guarantee Hero` template (GP-1 #1). Risk-reversal headline > feature headline for warm upsell. Keep urgency only if a real deadline exists.
**Patterns:** S1, S2, S5, S6 (gold CTA); urgency edge of S7 (keep real).

### 2026-06-20 — E2 Iman Gadzhi "I'll Give All Your Money Back" + checklist (IG Sponsored)
**Why swiped:** pure risk-reversal + bonus-stack variant of the same campaign. **Format:** 4:5 feed static.
**Layout:** portrait (gray tee, open-hand shrug) → headline "**I'll give all your money back** if you're not 100% with the VIP Experience:" → ✅ list (Upgrade to VIP / Attend the 5 Implementation Calls / Get your business running / Compete for 5 MacBooks + 5 FaceTime Calls) → "💸 Still wasn't worth it? Get every single penny back" → gold-glow CTA "Click the button and upgrade now" → **green** "Learn more" bar.
**Levers:** Risk-reversal (dominant) + Reciprocity (MacBook bonuses) + Commitment (checklist).
**So What for Grifon:** the `Offer Stack Checklist` template (GP-1 #3). Note the green CTA bar — confirms they A/B CTA-bar color (S6); wire it as a variant field. Our bonuses must be real.
**Patterns:** S1, S2, S4, S5, S6 (green CTA).

### 2026-06-20 — E3 Iman Gadzhi "Choose What You Want — Free vs VIP Ticket" (IG Sponsored, @corybored repost)
**Why swiped:** the cleanest tier-anchoring creative in the set. **Format:** 4:5 feed static.
**Layout:** "CHOOSE WHAT YOU WANT WITH THIS WORKSHOP" → **FREE TICKET** card (dark/glass: "Learn the step-by-step / Do it yourself, no close guidance") → **VIP TICKET** card (gold, glowing: "We build your AI Business together, live / all the templates and workflows / ready to kick-off in 5 days / all your money back if not 100% satisfied") → "Click the button below to upgrade to VIP" → gold "Learn more" bar.
**Levers:** Anchoring/contrast (dull free vs gold VIP) + Commitment-consistency + Risk-reversal (in the VIP card).
**So What for Grifon:** the `Ticket Compare` template (GP-1 #2). Maps 1:1 onto Free → Pro → Business. The paid card must out-glow the free card (gold border + glow). No unlimited promises.
**Patterns:** S1 (in card), S3, S5, S6 (gold CTA).

### 2026-06-20 — E4 Iman Gadzhi "I'm Selecting a Few People" (IG Sponsored, reel-format static)
**Why swiped:** the scarcity/close creative — and the **anti-pattern** we record to NOT copy. **Format:** vertical reel still.
**Layout:** big gold "AI INCOME VIP WORKSHOP" logotype + arms-wide portrait → "I'M SELECTING A **FEW PEOPLE** to join me in **5 Private Implementation Calls**" → **mock DM / calendar invite** ("JANUARY 11 -12PM EST, Meeting ID…, Join Now") + "You've got pre-approved. All upside. No risk." → **blue** "Learn more" bar (Messenger-style).
**Levers:** Scarcity ("few people") + Social proof ("pre-approved") + Liking ("join me") — but executed via a **fabricated DM/invite**.
**So What for Grifon:** take the *cohort-offer layout* into `Authority Promise` (GP-1 #4) — but **strip the fake DM and "pre-approved."** Scarcity only as a real seat cap. This is S7, do-not-replicate. Blue CTA bar = third color in the A/B set (S6).
**Patterns:** S2, S5, S6 (blue CTA), **S7 (anti-pattern)**.
