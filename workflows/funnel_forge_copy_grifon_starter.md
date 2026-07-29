# grifon-starter-v1 — Full Copy Doc (Neil Gate #2)

**Offer:** Option A "Libreng Ad Battle Plan" (picked 2026-07-29). Archetype: `minimal`,
quiz-front (F04 pattern). **Register: English 4th–5th grade** per house language rules
(landing pages = English; ads that point here stay Taglish). A Taglish page variant is a
later A/B via config swap — that's L2 working for us, zero code.

Every structural choice cites its evidence (F/L = funnel swipe file, S = static swipe file).

---

## 1. Landing page (`index.html`)

### heroOptin section

**Eyebrow:** `FREE FOR FILIPINO BUSINESS OWNERS` *(F06 vertical-qualifier eyebrow: "Designed for Financial Planning Firms over $1M" — self-selection before the headline)*

**Headline — 3 options, pick one:**

- **A (RECOMMENDED, 70%):** `Get Your Free Ad Battle Plan — Made For Your Business, In 60 Seconds.`
  *Direct port of F04's proven formula ("Get Your Free Personalized $100M Scaling Roadmap...in under 30 seconds" — 250,000 requested). Reciprocity + specificity + speed. Problem-Aware stage.*
- **B:** `Your Ads Don't Convert? Answer 4 Questions. See Why — Free.`
  *Named-pain hook (Bryan's bleeding neck verbatim) + curiosity gap. Sharper, but assumes he blames the ads and not himself.*
- **C (bold):** `Stop Guessing. Run The Ad The Winners Already Proved.`
  *Contrarian/authority angle off our decoded-ads corpus. Needs the subhead to carry the mechanism.*

**Subhead:** `Answer 4 quick questions about your business. We'll send you a free Battle Plan: the hook that fits your niche, the ad angle that's winning right now, and the first ad you should run this week.`
*(Mechanism + 3-item specificity; mirrors F04's tangibilized-freebie play — mockup image beside it.)*

**Form (the quiz — L3 progressive qualification, 5/6 corroborations):**
- Fields: **Name, Email** only. *(No phone — F01/F02/F03 all collect it but pair it with TCPA-aggressive consent (L4). We don't need calls for this funnel; less friction, cleaner DPA posture.)*
- Qualifiers (selects, stored as lead score per L3):
  1. `What's your business?` — Food & Beverage / Fashion & Beauty / Health & Wellness / Home Services / Professional Services / Online Store (E-commerce) / Coaching & Education / Other
  2. `Monthly ad budget?` — Wala pa / Under ₱5K / ₱5K–₱20K / ₱20K–₱50K / ₱50K+
  3. `Biggest problem right now?` — No time to make content / Ads don't convert / Don't know what to post / Agency is too expensive
- **CTA label:** `Get My Battle Plan →` *(F04 "GET MY ROADMAP" possessive-verb formula; F03's "I want this -->" arrow retained)*
- **Reassurance line:** `Free. No credit card. Check your inbox — it arrives in minutes.` *(F03's delivery-expectation line, honesty-first version)*

**Consent (unchecked by default — F02's cleaner mechanic, not Hormozi's implied consent):**
`Yes — send my Ad Battle Plan plus a short weekly breakdown of one winning ad. Unsubscribe anytime with one tap. Your details are protected under the Data Privacy Act of 2012 and our Privacy Policy. You'll get your Battle Plan either way.`
`policyVersion: funnel-dpa-v1-2026-07`
*(The magnet is delivered regardless (mirrors F02's "Consent is not required to attend"); the checkbox gates the nurture sequence only. Real, clean, PH-legal.)*

### socialProofBar section
`Built by Grifon — the AI that has already decoded 90+ winning ads and studied the funnels of the world's best marketers.` *(L9 specific-number authority — real number, our swipe files. No fake review counts: L5 is do-not-replicate.)*

### complianceFooter
Brand line: `GRIFON — AI Marketing, Philippines` · Links: Privacy Policy, Terms
Disclaimer: `Results vary by business. The Battle Plan is educational marketing guidance, not a guarantee of sales.` *(Every GOAT page carries one; ours is honest and short.)*

## 2. Thank-you page (`thank-you.html`) — L1 bridge (6/6 corroborations)

- **Headline:** `Your Battle Plan is on the way.`
- **magnetDelivery:** `Check your inbox in the next few minutes (look in Promotions if it's hiding).`
- **Body:** `While you wait — your Battle Plan tells you WHAT ad to run. Grifon makes it. Script, image, and caption — done in minutes, free to try.`
- **nextStep CTA (the ONE bridge):** label `Make My First Ad Free →` · href `https://grifon.ai/?utm_source=funnel&utm_campaign=battle-plan` *(KX lens: push them to SHIP with the free tier — usage before any paid pitch. No VSL, no upsell theater: we take L1's structure, not Brunson's trial-conceal.)*
- **steps:** 1 `Open your Battle Plan email` · 2 `Pick the ad it recommends` · 3 `Generate it free with Grifon`

## 3. The Battle Plan itself (fulfillment — 8 niche variants)

One per niche option above (Other → general variant). Each is a short, branded page/PDF
generated with our own modules (dogfooding): **(a)** the niche's winning hook pattern
(cited from swipe-file patterns with ≥3 corroborations only), **(b)** the angle to run
now + why, **(c)** "your first ad this week" — a fill-in-the-blanks script skeleton,
**(d)** last page = the Starter bridge (`Gusto mo, si Grifon na ang gumawa? Paste your
Battle Plan — free to start.`). Content build is a separate CMO task after this gate.

## 4. Brand block (funnel.config)
Straight from DESIGN.md frontmatter — Grifon Gold `#FFCC00` on zinc-950 world, rounded
`md`, Inter stack. (Dogfood funnel = root DESIGN.md; brand-check gates the build.)

---

**LOCKED (Neil, 2026-07-29):** (1) Headline **A** — "Get Your Free Ad Battle Plan — Made
For Your Business, In 60 Seconds." (2) Consent text approved as written. (3) Thank-you
bridge CTA → `https://grifon.ai/?utm_source=funnel&utm_medium=thankyou&utm_campaign=grifon-starter-v1`
(grifon.ai is the canonical production domain per index.html; UTMs make funnel-sourced
signups measurable). (4) Niches + **Real Estate** = 8 niches + Other → 9 Battle Plan
variants: Food & Beverage / Fashion & Beauty / Health & Wellness / Home Services /
Professional Services / Online Store (E-commerce) / Coaching & Education / Real Estate / Other.

**LOCKED (Neil, 2026-07-29): delivery = Option A, on-page.** The thank-you page renders
the Battle Plan variant matching the lead's niche answer (routed via redirect param).
Revised thank-you copy: headline `Your Battle Plan is ready.` · body `Here it is — the
hook, the angle, and the first ad to run this week for your business.` · below the plan,
the ONE bridge CTA (L1): `Make This Ad Free With Grifon →` → grifon.ai + UTMs. Email
nurture = later phase, once a sender (Resend/Brevo) is wired; consent checkbox already
captures permission for it. Reassurance line under the form changes to:
`Free. No credit card. Your plan appears instantly.` Battle Plan content for all 9
variants: `workflows/funnel_forge_battleplan_content.md`.
