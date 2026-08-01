# Funnel Swipe File

Compounding database of decoded LIVE lead-gen funnels — full-page teardowns of landing pages and their post-opt-in flows from proven direct-response operators (Sabri Suby, Alex Hormozi, Russell Brunson, and whoever Neil drops next). Each entry captures the page-level anatomy the image swipe files can't: section sequence, CTA cadence, form design, consent/disclaimer language, and the post-opt-in map. What compounds here: **L-patterns** (page/funnel-level structures) that graduate into the Funnel Forge template's section library and archetype rules. Maintained by the `funnel-autopsy` skill; `grifon-cmo` owns the persuasion-lever reads, `grifon-creative-director` owns the visual-DNA reads; findings feed `funnel-forge` builds, which must cite F-/L-IDs for every structural choice.

**Ingest loop:** driven by `.claude/skills/funnel-autopsy/` (user-invoked, `/funnel-autopsy`). Evidence per entry: WebFetch text pass (hypothesis) + `smoke-tester` full-page screenshots at 390×844 and 1440×900 (ground truth) + dummy-data funnel walk (post-opt-in map) + Meta Ads Library `ads_library_search` recon (ad→LP mapping). Screenshots live in `assets/funnel-swipe/F<NN>/` (compressed, committed). Dedupe by URL before fetching — a re-drop of a known funnel updates its existing entry (re-walk noted with date), no new F-number, no Pattern bump.

**RESUME (2026-07-29, batch 2 — Phase 1 complete):** F01–F06 seeded (Suby ×1, Brunson ×1, Hormozi ×4) with full funnel walks past the opt-in: Sabri walked to the payment gate (order bump captured verbatim), Brunson through the VIP-trial upsell to /confirmed, all four Hormozi magnets into the shared `/workshop-framework` $5k-workshop rail. Patterns L1–L10 seeded; **L1 L2 L4 L7 L8 = `proposed (baseline)`** → they define the Phase-2 template (thank-you-as-bridge, config-driven variants, verbatim server-stamped consent, minimal|longform archetypes, single-anchor CTA). `vsl-hybrid` third archetype parked at 2 corroborations (F02 F05). Trust flags recorded: Sabri's static stock-GIF, Brunson's hardcoded seat counter + "$97→FREE" trial conceal. Ad→LP: Hormozi 689 active ads (page 116482854782233) in campaign clusters; Sabri unmapped (revisit via ad-recon); Brunson via E82–E93. Recon email sequences now arriving at `neilmaglaya.business22+recon@gmail.com` — future swipe source. **Next F-number = F07. Next L-number = L11.**

**RESUME (2026-07-29, batch 1):** File created (Funnel Forge Phase 0). Recon identity for funnel walks: name "Grifon Recon", email `neilmaglaya.business22+recon@gmail.com` (Neil-approved 2026-07-29), PH-format dummy phone.

⚠ **Cafe-PC rule:** commit after every entry (`swipe(funnel): add F<NN> <brand>`). Uncommitted teardowns die with the reboot.

**The trust line:** steal the *structure* and the *lever*, never the lie. Fabricated scarcity (fake stock counters, evergreen "closing tonight"), unverifiable earnings claims, and fake-countdown patterns get recorded in `trust_flags` and are **do-not-replicate** — we take the section that carries the trick, not the trick.

---

## Pattern Index

Status legend: `observed` (counting corroborations) → `proposed` (≥3 corroborations across independent brands — same-brand repeats are weak evidence — and written up as an FGP below) → `applied` (shipped into the Funnel Forge template / a live funnel).

*(Note: patterns marked `proposed (baseline)` feed the Phase-2 `funnels/_template` design that Neil already approved in the 2026-07-29 Funnel Forge plan — they need no separate FGP. Post-baseline template changes DO need an FGP.)*

| ID | Pattern | Corroborations | Status |
|----|---------|----------------|--------|
| L1 | **Post-opt-in page sells the next rung** — the "thank-you" page is never a receipt: it's a VSL bridge, booking calendar, trial upsell, or order bump that monetizes the attention peak ("IMPORTANT – Before You Check Your Email, Watch This"). Grifon port: thank-you page = deliver the magnet + ONE next-step CTA (Starter bridge) — the `thankYou.nextStep` contract. | 6 across 3 operators (F01 F02 F03 F04 F05 F06) | proposed (baseline) |
| L2 | **Audience-skinned variants over one funnel backend** — same LP template re-skinned per vertical/segment, ads route hooks → variant: F03 vs F06 are the identical template with hero/eyebrow/testimonial swapped (slug `opt-in-financial-p-f` encodes the routing); F04 is a quiz-front variant into the same $5k rail; Hormozi page runs 689 active ads in campaign clusters. Cross-file: S34 "one copy / N worlds" (E82–E93, Brunson). Grifon port: `funnel.config.ts`-driven variants — the Funnel Forge thesis itself. | 4 across 2 operators (F03 F04 F06 + S34/E82–E93) | proposed (baseline) |
| L3 | **Progressive qualification** — light front (email + 1–2 selects), deeper profiling after commitment: F04 asks full mailing address at quiz step 4; F05 re-asks travel/"$5k works?" as radios post-form; F02 segments before registering. Selects double as lead scoring. | 5 across 2 operators (F02 F03 F04 F05 F06) | observed |
| L4 | **Verbatim consent block at the form** — Hormozi runs one identical TCPA-max consent string on every form ("automated telephone dialing systems and AI… even if… Do Not Call List"); Brunson uses an unchecked-default checkbox + "Consent is not required to attend". Grifon port: PH Data Privacy Act equivalent, server-stamped verbatim (`consent_text`), unchecked by default — already in `funnel_leads.sql`. | 6 across 3 operators (F01 F02 F03 F04 F05 F06) | proposed (baseline) |
| L5 | **Cosmetic scarcity** — Sabri: dynamic "As Of {today}" date over a STATIC stock-bar GIF; Brunson: hardcoded "2,745 registered" (unchanged after our own registration) + evergreen "Encore" countdown; contrast: Hormozi's sold-out workshop dates plausibly real. | 3 across 2 operators (F01 F02; contrast F03) | observed (**do-not-replicate**) |
| L6 | **Segmentation quiz as front-end** — F02 "Which One Best Describes You?" (4 personas, appears 3×); F04 quiz-as-magnet "in under 30 seconds"; F03/F06 revenue+ownership selects. Doubles as personalization + ad-matching + scoring. | 4 across 2 operators (F02 F03 F04 F06) | observed |
| L7 | **Two-archetype page family** — `minimal` (F03 F04 F06: form + gift name + mockup, near-zero scroll persuasion — the AD does the selling) vs `longform` (F01: 36-beat sales letter, ~96k px). F02/F05 suggest a third `vsl-hybrid` (mid-length + autoplay VSL) — parked until ≥3. Grifon port: `archetype` switch in `funnel.config.ts`. | 6 across 3 operators (all) | proposed (baseline) |
| L8 | **Single-anchor CTA repetition** — many buttons, ONE destination: F01 "RUSH ME A FREE COPY" ×16 → `#free-book`; F02 seat CTAs ×9 → one modal; F05 "I'M READY TO SCALE" ×3 → inline form. Never competing offers on one page. | 3 across 3 operators (F01 F02 F05) | proposed (baseline) |
| L9 | **Specific-number authority stack** — "$7.8 BILLION IN 1067 DIFFERENT NICHES" (F01); "processed over 12 billion dollars" + "bootstrapped a billion-dollar company — no investors" (F02); "$250M/yr portfolio" + director salaries "$350k, $600k, $900k+" (F05); "250,000 Business Owners" (F04). Precision *is* the credibility device. | 4 across 3 operators (F01 F02 F04 F05) | observed |
| L10 | **Escalating, personalized exit-intent** — F01 fires modal #1 pre-capture ("WAIT! BEFORE YOU GO…") and modal #2 on checkout interpolating the lead's first name ("WARNING GRIFON!"). Grifon's own landing already runs a tasteful version (ExitIntentModal). | 1 across 1 operator (F01) | observed |

---

## Gated Proposals

Template/build changes distilled from ≥3-corroborated L-patterns, awaiting Neil's explicit approval before entering `funnels/_template/`. Each FGP pairs a **CMO angle** (copy/structure pattern + guardrail) with a **CD recipe** (exact visual spec). Nothing here self-applies.

*(none yet)*

**Parked — endorsed-but-deferred (2026-07-29 plan), promote to FGPs when their trigger fires:**
- **Checkout / order bumps / upsells** (F01 checkout + F02 VIP anatomy decoded and waiting) — trigger: a funnel needs to SELL, not just capture. Needs PayMongo per client.
- **`vsl-hybrid` third archetype** (F02 + F05, 2 corroborations — one short of the gate) — trigger: a 3rd operator's VSL-bridge page gets autopsied.
- **A/B page variants** (L2 makes it config-cheap) — trigger: first funnel with enough traffic to split.
- **Email nurture sequences** — trigger: a sender (Resend/Brevo) gets wired; recon inbox sequences (`+recon` Gmail) are the swipe source.
- **Magic-link auto-account from funnel submit** (skip even the OTP screen) — trigger: same sender infra + auth-flow design with Neil.
- **`FunnelConfig.brand` expressive axes** (ground/texture treatment, card treatment `glass|solid|outline`, density, motion personality — today the block is colors+fonts+radius and the visual world is fixed Grifon DNA) — trigger: first client whose approved DESIGN.md the current block can't express. Evidence + full spec live as **DGP-1** in `workflows/design_swipe_file.md`; ships as an FGP here.

---

## Entries

Newest first. Entry template:

```
### F<NN> — <url> (<Operator>) — <YYYY-MM-DD>
archetype: minimal | longform        confidence: high | med | low
screenshots: assets/funnel-swipe/F<NN>/  (desktop.png, mobile.png, post-optin-*.png)
**Why swiped:** <what made this worth decoding>
**SECTION WALK (in order):** numbered list — section name · purpose · verbatim headline/key line · levers (Cialdini + Suby/Hormozi/Brunson device) · CTA text if present
**FORM:** fields + required flags · CTA verbatim · consent/disclaimer language verbatim
**CTA CENSUS:** count + all verbatim variants
**POST-OPT-IN MAP:** page 2+ URLs · what each sells · order bumps/upsells/calendars/VSLs observed · dummy data used
**AD→LP MAPPING:** ads_library_search evidence — which ad hooks point here (or "not run — why")
**trust_flags:** fabricated scarcity/counters/claims observed, or "none noted"
**STEALABLE:** 3–5 bullets → candidate L-patterns
**Patterns:** corroborates <L-IDs> · new candidate <or none> · contradicts <or none>
```

### F06 — acquisition.com/opt-in-financial-p-f (Alex Hormozi) — 2026-07-29
archetype: minimal        confidence: high (WebFetch + smoke-tester screenshots + full funnel walk)
screenshots: assets/funnel-swipe/F06/ (desktop, mobile, post-optin-1)
**Why swiped:** Phase-1 GOAT seed batch. The vertical-targeted twin of F03 — proof of audience-skinned LP variants.
**SECTION WALK:** 1· Minimal header (logo) · 2· Eyebrow **"Designed for Financial Planning Firms over $1M"** + "Financial Planning Firms:" heading + niche hero image (commitment/consistency via self-selection) · 3· Opt-in form "Free Gift: Get Our 5 Scaling Frameworks." (reciprocity) · 4· ★★★★★ testimonial: *"Five stars isn't enough… It was the best money I've ever invested in my business."* — Hunter Mabile, Verified Customer (social proof; absent on F03!) · 5· Footer + results disclaimer.
**FORM:** First name (opt) · Email* · Phone (intl widget, auto-detected +63 PH) · Annual Business Revenue* (9-band select) · Solo owner or partner(s)?* (5-option select). Submit: **"I want this -->"**. Consent verbatim: *"By providing your information you consent to Acquisition.com contacting you by phone, text, or email using automated telephone dialing systems and AI to the information provided, even if the phone number is present on a state or national Do Not Call List. We do not sell your personal information."*
**CTA CENSUS:** 1 — "I want this -->" (single-anchor page).
**POST-OPT-IN MAP:** → **same `/workshop-framework` VSL bridge as F03** (identical: "Confirmed… being sent to your inbox" banner → "IMPORTANT – Before You Check Your Email, Watch This Scaling Video" → testimonial montage → 3-benefit block → iClosed booking calendar → Las Vegas date table w/ sold-out rows + "7 seats left" → FAQ "$5k per seat"). Dummy data: Grifon Recon / +recon email / 09175550123 / $1M–$3M / majority owner.
**AD→LP MAPPING:** Hormozi FB page (id 116482854782233) runs **689 active ads**; newest ~50 all "Join Vantage as a Founding Member", earlier cluster "Learn How to Scale Your Business" — campaign clusters → dedicated LPs. URL slug itself (`opt-in-financial-p-f`) encodes the audience routing.
**trust_flags:** none noted beyond aggressive consent scope (see L4).
**STEALABLE:** vertical eyebrow qualifier as headline ("Designed for X over $Y"); testimonial-under-form placement for colder verticals; qualifying selects double as lead scoring.
**Patterns:** corroborates L1 L2 L3 L4 L7; contradicts none.

### F05 — acquisition.com/workshop-multi-2 (Alex Hormozi) — 2026-07-29
archetype: vsl-hybrid (mid-length, application-style)        confidence: high
screenshots: assets/funnel-swipe/F05/ (desktop, mobile, post-optin-1)
**Why swiped:** Phase-1 GOAT seed batch. The paid-offer ($5k) page the free magnets bridge into — shows the whole ladder's back end.
**SECTION WALK:** 1· Logo-only header + badge "LIVE In-Person Workshop | Las Vegas" · 2· H1 **"Are you the thing limiting your business?"** (problem-agitate, direct address) + H2 "Join Our Scaling Workshop – Remove Yourself as the Single Point of Failure" · 3· Autoplay VSL · 4· "It's a 2-day, interactive workshop…" + CTA · 5· Testimonial montage video (social proof) · 6· 3-benefit block: ACQ Directors / ACQ Scaling Framework ("how we… scale our $250M/yr portfolio") / "3-5 Tactical Next Steps" (authority + specificity) · 7· FAQ accordion incl. price reveal **"How much are tickets?" → "$5k per seat"** + qualification *"If you haven't made at least $5k from the free content, don't do it"* (price anchoring inside FAQ; takeaway selling) · 8· Final CTA · 9· Footer + "results are not typical" disclaimer.
**FORM (revealed inline on CTA click, multi-step HubSpot):** First*/Last* → Business Email* → Phone* → Annual Revenue* + same TCPA consent verbatim as F06. Submit: **"Check to see if you qualify"** (qualification framing, not "buy").
**CTA CENSUS:** 3 — all identical **"I'M READY TO SCALE"** (top/mid/bottom).
**POST-OPT-IN MAP:** → `/multi-step-workshop-calendar-2` — "Book your call below / attend our 2 day in-person in vegas" + iClosed calendar (July: "no time slots available") + 2 explicit qualifier radios re-asked: travel in 90 days? (Y/N/Maybe) and **"Tickets are $5k. Does that work for you?"** (Y/N) — answers pre-seeded in the redirect URL (`travel=Yes…&ticket=Yes, $5k works.`). Resolves to a booked sales call, never a checkout. Stopped at Continue; no slot booked.
**AD→LP MAPPING:** see F06 — same page's 689-ad cluster feeds these workshop LPs via the free-magnet bridge.
**trust_flags:** "keep the room quality high" scarcity is soft/unverifiable; sold-out dates on the sibling bridge page plausibly real.
**STEALABLE:** price only inside FAQ after value stack; "Check to see if you qualify" as submit copy (commitment escalation); disqualification line as trust builder; silent URL pre-seeding of qualifiers → re-confirmed as radios (intent filter).
**Patterns:** corroborates L1 L3 L4 L8 L9; new candidate: third archetype `vsl-hybrid` (with F02) — MVP keeps two, revisit at ≥3.

### F04 — acquisition.com/roadmap (Alex Hormozi) — 2026-07-29
archetype: minimal (quiz-front variant)        confidence: high
screenshots: assets/funnel-swipe/F04/ (desktop, mobile, post-optin-1)
**Why swiped:** Phase-1 GOAT seed batch. The interactive-magnet variant: quiz-as-lead-magnet with progressive profiling.
**SECTION WALK:** 1· Full nav header · 2· H1 **"Get Your Free Personalized $100M Scaling Roadmap...in under 30 seconds."** (speed + personalization promise) + product mockup screenshots (tangibilizes a digital freebie) · 3· Multi-step quiz form · 4· Trust line **"Requested by over 250,000 Business Owners"** (consensus) · 5· Quote/testimonial image · 6· Footer + disclaimer.
**FORM (multi-step, one question per screen):** Q1 First*/Last* ("What's your name?") → Q2 Business Email* ("Where should I email it to?") → Q3 Phone* → **Q4 full shipping address*** (street/city/state/country/zip — a physical-mail data grab for a "digital roadmap") → Q5 employees* + revenue* + ownership* selects. Buttons: "LET'S START" → "CONTINUE" ×4 → **"GET MY ROADMAP"**. Same TCPA consent verbatim.
**CTA CENSUS:** quiz-flow buttons only — zero competing CTAs (total tunnel).
**POST-OPT-IN MAP:** → `/roadmap-ty-b` "Thank You!" — same VSL-bridge pattern: "Confirmed: Your $100M Scaling Plan is being sent to your inbox" → "IMPORTANT – Before You Check Your Email, Watch This Scaling Video" → **"Book Your Call in 8s"** countdown-gated CTA → same $5k workshop rail. Quiz answers used: Just me some revenue / $1M–$3M / majority owner; address 123 Recon Street, Manila.
**AD→LP MAPPING:** see F06 (689-ad page cluster).
**trust_flags:** "in under 30 seconds" is false as experienced (5 screens incl. full mailing address); countdown-gated CTA on TY page is theatrical.
**STEALABLE:** one-question-per-screen removes form dread; mockup imagery makes a PDF feel like a product; sunk-cost ordering (easy asks first, address at step 4 when invested); defaulted selects reduce friction.
**Patterns:** corroborates L1 L2 L3 L4 L6 L7; contradicts none (but strains "minimal" — quiz-front is a sub-variant).

### F03 — acquisition.com/fivescalingframeworks (Alex Hormozi) — 2026-07-29
archetype: minimal        confidence: high
screenshots: assets/funnel-swipe/F03/ (desktop, mobile, post-optin-1)
**Why swiped:** Phase-1 GOAT seed batch. The purest minimal opt-in in the set — the baseline of the archetype.
**SECTION WALK:** 1· Logo-only nav · 2· Product mockup + opt-in form headed **"Free Gift: Get Our 5 Scaling Frameworks"** (reciprocity, numbers-specificity) · 3· Delivery-expectation line *"Please Note: When you click the button above, please check your inbox…"* · 4· Footer (full nav reappears only here) + results disclaimer. That's the whole page — zero scroll persuasion; the ad does the selling (see AD→LP).
**FORM:** identical to F06 (First name / Email* / Phone intl / Revenue* / Ownership*), submit **"I want this -->"**, same TCPA consent verbatim.
**CTA CENSUS:** 1.
**POST-OPT-IN MAP:** → `/workshop-framework` VSL bridge (as F06; original discovery here): Confirmed banner → VSL "Are You the Biggest Risk to Your Own Business?" → testimonial montage → 3-benefit block → iClosed calendar w/ 2-question qualifier → **Vegas dates table: Aug 14 sold out · Sept 18 sold out · Oct 23 "7 seats left" · Nov 20 open** → FAQ "$5k per seat" → repeated "I'M READY TO SCALE".
**AD→LP MAPPING:** see F06 — 689 active ads; "Learn How to Scale Your Business" cluster is this magnet's likely feeder.
**trust_flags:** none on-page; seat counts unverified but consistent with a real event.
**STEALABLE:** the entire minimal doctrine — page = form + gift name + mockup; qualifying selects as the ONLY friction (each select is a lead-scoring field, not a nicety); nav stripped at top, restored in footer.
**Patterns:** corroborates L1 L2 L3 L4 L7; contradicts none.

### F02 — aisecretschallenge.com (Russell Brunson / Marketing Secrets LLC) — 2026-07-29
archetype: vsl-hybrid (challenge registration)        confidence: high
screenshots: assets/funnel-swipe/F02/ (desktop, mobile, popup-registration, post-optin-1-vip-upgrade, post-optin-2-vip-checkout-popup, post-optin-3-confirmed)
**Why swiped:** Phase-1 GOAT seed batch. The challenge-funnel archetype + the most aggressive post-opt-in monetization in the set. Pairs with static entries E82–E93 (Brunson image ads, S34–S37).
**SECTION WALK:** 1· Hero H1 **"AI Just Made Most Online Businesses Disposable. Here's How To Build The One Kind AI Can't Touch... In 5 Days..."** (fear + mechanism + timeframe) · 2· Muted autoplay VSL (Voomly) · 3· Segmentation quiz **"Which One Best Describes You?"** (4 verbatim options: side hustle / founder-coach-consultant / department leader / ambitious employee) · 4· Countdown "Challenge Starts In: 5 DAYS…" + **"High Demand — 2,745 registered"** + "Available Seats · 100% Free · Virtual" · 5· Sticky CTA band "SECURE MY FREE SEAT NOW / August 3-7 · 90 Minutes/Day" · 6· Value-prop "How To 'Switch On' An AI System That Lets One Person Run What Used To Take An Entire Team!" + 5 rotating italic subheads · 7· Authority "…processed over 12 billion dollars in sales for our clients" · 8· Story "We Bootstrapped A Billion-Dollar Company From Scratch…" · 9· Testimonial marquee · 10· Footer (Marketing Secrets LLC, Eagle ID).
**FORM (modal, "STEP 2 OF 3"):** Name · Email · Phone (intl, auto +63) + **unchecked-default consent checkbox**, verbatim: *"Yes, please keep me updated about the AI Secrets Challenge and future offers by email, text, and automated calls, including prerecorded or AI-generated voice messages. Consent is not required to attend the challenge or purchase anything. Msg/data rates may apply."* Submit: **"RESERVE MY FREE SEAT / 5 Days · 90 Minutes/Day · 100% Free"**. Backend: ClickFunnels (`cfAR` form → `/register-d`). Modal header says "AI Secrets Challenge **Encore**" → evergreen replay funnel.
**CTA CENSUS:** 9 registration CTAs in 5 verbatim variants ("RESERVE MY FREE SEAT…" ×4, "SECURE MY FREE SEAT NOW · Seats Are Filling FAST!" ×2 + 2 variants, "…August 3-7" ×1) + "Show Me How" ×2, "Lock In Your Ticket Now" ×1.
**POST-OPT-IN MAP:** (segment picked: founder/coach/consultant) → **`/vip-upgrade`**: 3-step progress bar (Registered → Upgrade → Instant Access), "WAIT! DON'T EXIT" banner, "UPGRADE CLOSES IN 00:19:35" countdown, first-name personalization ("Hey Grifon!"). **VIP Backstage Pass "$97 → FREE today"** — actual mechanism in checkout popup: **14-day trial of marketingsecrets.ai converting to $97/month**. Value stack verbatim: Daily VIP Pre-Sessions ($25,000+ Value) · VIP Zoom Room ($497) · Encore Replay ($297) · Training Vault ($1,997) · Funnel Oracle ($497) · Backstage Community ($197) · "Normally: $28,485+ / Today: FREE!" Decline link is a shame-frame: *"No thanks, Russell. I understand this is my only chance… I'd rather figure it out on my own."* → `/confirmed`: 4-step next-steps incl. a SECOND VIP pitch + **affiliate recruitment ("40% commission")**. Stopped at card entry; no payment.
**AD→LP MAPPING:** Ad Library keyword search noisy (romance-drama apps dominate "AI Secrets Challenge" terms); one third-party "Register Now for the August 10–14 Challenge" hit (page "Adley") consistent with the affiliate program seen on `/confirmed`. Primary Brunson ad evidence = E82–E93 in the static swipe file (12 ads, one campaign, S34 "one copy / N worlds").
**trust_flags:** **"2,745 registered" is hardcoded** (byte-identical across reload AND after registering); countdown is live JS but paired with evergreen "Encore" framing; "$97 → FREE" conceals a $97/mo trial conversion; "Three Days" vs "5 Days" copy inconsistency on /confirmed (stale template).
**STEALABLE:** segmentation quiz doubles as personalization + ad-matching; "STEP 2 OF 3" momentum framing on a first-touch modal; consent UNCHECKED by default with "consent not required" line (cleaner than Hormozi's implied consent); value-stack table with per-item prices; decline-link honesty inversion (we'd use a respectful version).
**Patterns:** corroborates L1 L3 L4 L6 L8 L9; L5 (do-not-replicate evidence); new candidate `vsl-hybrid` (with F05).

### F01 — selllikecrazybook.com/free (Sabri Suby / King Kong) — 2026-07-29
archetype: longform        confidence: high (DOM-verified section walk; ~96,500px page)
screenshots: assets/funnel-swipe/F01/ (11 desktop + 10 mobile scroll strips; post-optin-1, -1-filled, -2, -2-payment-gate)
**Why swiped:** Phase-1 GOAT seed batch. The long-form monster — the maximal counter-archetype to F03, from the operator whose copy system grifon-cmo already encodes.
**SECTION WALK (36 sections, DOM-verified; key beats):** 1· Hero H1 **"SHARK TANK INVESTOR AGREES TO GIVE AWAY 10,000 COPIES OF HIS #1 BESTSELLING BOOK JUST TO PROVE HIS MARKETING STRATEGIES WORK BETTER THAN ANYTHING ELSE"** (authority + reciprocity + reason-why) · 2· Controversy hook ("POSSIBLY THE MOST CONTROVERSIAL MARKETING AND SALES BOOK…") · 3· **"6704 CUSTOMER REVIEWS"** · 4· Results claim **"MORE THAN $7.8 BILLION IN SALES IN 1067 DIFFERENT NICHES… OUT OF 'THIN AIR'"** · 5· Audience qualifier ("WHO NEEDS THIS 'SECRET SELLING SYSTEM'?") · 6· Raving-fans teaser · 7· Origin/unique mechanism ("THE ONLY BOOK OF ITS KIND") · 8· Contents tease ("A MERE FRACTION OF THE GOLD…") · 9· Logo wall ("THESE COMPANIES HAVE USED OUR METHODS") · 10–14· Five chapter-tease blocks (leads, "begging to buy" demand, contrarian "WHAT NEVER, EVER TO PUT ON YOUR WEBSITE", desire, system-name) · 15· **"I SWEAR UNDER OATH THAT THIS 'SECRET SELLING SYSTEM' IS ENTIRELY 100% LEGAL!"** (objection-preempt as theater) · 16· Press logos · 17· Testimonial carousel (6 quote headlines) · 18· Review-count reassurance ("NO NEED TO ADJUST YOUR INTERNET…") · 19· Pattern-interrupt CTA **"CUT THE BULLSHIT AND SHOW ME SOME GODDAMN PAGES FOR FREE…"** · 20· "BUT YOUR BUSINESS IS DIFFERENT…" objection flip · 21· Benefit restatement · 22· "HERE'S WHAT TO DO NEXT" (Suby's explicit-instructions beat) · 23· **"THERE IS ABSOLUTELY NO CATCH, WHATSOEVER! (PINKY PROMISE)"** risk reversal · 24· "WHY AM I GIVING THIS BOOK AWAY 100% FREE?" reason-why · 25· Aspirational close ("CALL YOUR MUMMA…") · 26· **"MY TOTALLY OUTRAGEOUS, 'HE'S LOST HIS MARBLES' GUARANTEE"** · 27· Bonus #1 (dream-clients training) · 28· "AHHHHH HE GOT RICH TELLING PEOPLE HOW TO GET RICH" objection-preempt · 29· Mindset urgency · 30· Bonus-stack CTA · 31· Bonus #2 **"A FREE TICKET TO THE SELL LIKE CRAZY SUMMIT $97 FREE!"** · 32· Media-demand scarcity · 33–35· P.S. / D.P.S. / T.P.S. · 36· FAQ accordion.
**FORM (in-page anchor `#free-book`):** First Name* · Last Name* · Email* · Phone (placeholder says required, DOM `required=false`). Submit (two-line): **"Claim Special Offer / Yes! I Want This Book Now!"** Surrounding copy verbatim: *"HURRY! STOCK OF THIS BOOK AS OF JULY 29 IS LOW" / "⚠️ THIS IS A STRICTLY LIMITED OFFER" / "*Sell Like Crazy retails for $23.95… we've bought it for you! We just ask that you cover the shipping and handling costs…"*
**CTA CENSUS:** 186 clickable elements; conversion CTAs: **"RUSH ME A FREE COPY" ×16** (all → `#free-book`), combined reviews-widget button ×1, form submit ×1. (150 "Read more" testimonial expanders.)
**POST-OPT-IN MAP:** form advances in-place to SHIPPING tab (exit-intent modal #1 intercepts first submit: "WAIT! BEFORE YOU GO…" / "RUSH ME A FREE COPY") → `/checkout/`: 3-step indicator (Checkout → Order Confirmation → Instant Access) · price selector "Physical Book Only ~~$23.95~~ **$0.00**" vs "+ Audiobook + eBook + 7 reports ~~$410.00~~ **Add for $37.00**" · shipping form (PH accepted) · **order bump verbatim ("🔥 MOST POPULAR OPTION 🔥", "72% Of Our Members Choose This Upgrade"):** *"YES! UPGRADE MY ORDER WITH THE AUDIOBOOK, EBOOK + 7 EXCLUSIVE REPORTS ($410.00 VALUE)… today only $37 ($373.00 savings)… (This offer is not available ANYWHERE else online!)"* → "YES, ADD TO MY ORDER" · totals: book $0.00 + **Shipping US$2.99 = Total US$2.99** · 30-day money-back guarantee · influencer testimonials (Nathan Chan, Dan Lok, Gretta Van Riel, Craig Ballantyne, Mike Dillard) · exit-intent modal #2 **personalized**: *"WARNING GRIFON! …you must confirm that you are permanently passing on your chance…"* → "CLAIM THIS LIMITED OFFER NOW". Stopped at card entry ("Your card number is incomplete"); steps 2–3 gated behind payment.
**AD→LP MAPPING:** not conclusively mapped — "Sell Like Crazy" keyword search returns unrelated noise; Sabri's ads run via personal/King Kong pages (page_id not resolved this session). Revisit with ad-recon.
**trust_flags:** **stock-scarcity is cosmetic** — "As Of {date}" span is dynamically rendered (matched today's date) but the stock-level bar is a static GIF (`stock-levels.*.gif`), not inventory-driven; "10,000 copies"/"strictly limited" unverifiable; review count self-hosted.
**STEALABLE:** the 36-beat long-form spine (hook → proof → mechanism → chapter teases → objection theater → instructions → risk reversal → reason-why → guarantee → bonuses → P.S. ladder → FAQ); single-anchor CTA discipline (16 buttons, ONE form); "here's what to do next" explicit-instruction beat; free-plus-shipping continuity into one $37 bump (not a bump ladder); personalized exit-intent (name interpolation).
**Patterns:** corroborates L1 L4 L7 L8 L9; sole source (so far) of L5 GIF-mechanics + L10 exit-intent.
