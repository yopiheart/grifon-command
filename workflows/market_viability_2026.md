# Market Viability Check — September 2026

**Question asked (Neil, 2026-09-01):** *"Are we still on track? With Fable/Opus-class models and
tools like Higgsfield and Grok already this good, is our way of making ads still competitive or
standout in the PH market? Is it still worth doing?"*

**Verdict: YES, but the thing that is worth doing is narrower than what the landing page currently
sells, and the window is about 12 months wide.** Nothing found in this research kills the project.
Two findings do change what we should ship next.

All claims below are sourced. Where a number is a vendor's marketing claim rather than an
independent measurement, it is labelled as such.

---

## 1. The threat that is real: Meta is coming for the bottom of our market

Meta's stated 2026 goal is full ad automation from a URL or product image — the AI generates the
creative, picks the audience, sets placement, and suggests budget. The URL-to-campaign system is in
test with selected advertisers now, with broader availability expected later in 2026. Their
Image-to-Video tool already turns up to 20 product images into multi-scene video ads.
([Yahoo/Reuters](https://finance.yahoo.com/news/meta-automate-ads-end-end-135910411.html),
[Pixis](https://pixis.ai/blog/metas-fully-automated-ads-by-2026-what-performance-teams-should-prepare-for/),
[Alex Neiman](https://alexneiman.com/meta-generative-ai-features-2026/))

This is the single biggest structural risk to Grifon, because it is free, it is inside the tool the
customer is already in, and Facebook reaches 97.7% of PH internet users
([Flex](https://www.flex.com.ph/articles/facebook-ads-in-2026-still-worth-it-for-ph-businesses)).

**What it does NOT do, and this is where we live:**
- It is Meta-only. It does not produce an asset you can also run on TikTok, put on a landing page,
  or send to a client.
- It generates *creative*, not an *offer*. Nothing in Meta's stack does market research, an offer
  stack, or a Filipino direct-response angle.
- Brands are already complaining that ceding creative control dilutes their voice, and that current
  AI-generated visuals in the industry are "distorted or unusable"
  ([Marketing Brew](https://www.marketingbrew.com/stories/2026/04/07/meta-ai-ad-creation)).
- Meta's own guidance to advertisers is that the winners under automation are the ones who focus on
  what they still control: **creative quality and variety**
  ([Media Performance](https://www.mediaperformance.co.uk/meta-automated-campaigns-2026/)).

The last bullet is the whole argument. Automation increases the demand for creative *input* it can
choose between. That is what Grifon manufactures.

## 2. The threat that is overrated: Higgsfield / Sora / Veo / Grok

These are **clip generators**, not ad systems. Higgsfield's pitch is 15+ frontier models (Sora, Veo,
Kling, Seedance) behind one $9-$65/mo subscription, aimed at brand-cinematic work rather than batch
direct response ([hyperfx](https://www.hyperfx.ai/blog/arcads-vs-creatify-vs-higgs-field-vs-hyper-2026)).
A Filipino SMB owner handed Higgsfield gets a beautiful 8-second clip and still has no script, no
hook, no offer, no voiceover in their own register, and no finished ad.

The tools that actually compete with our *shape* are the UGC-ad platforms: Arcads ($110-$410/mo) and
Creatify ($39-$597/mo) ([layer3labs](https://www.layer3labs.io/guides/best-ai-ugc-video-tools),
[hyperfx](https://www.hyperfx.ai/blog/best-ai-ugc-tools-for-ads-2026)). Both are English-first,
USD-priced, and card-only. Grifon Starter is ₱997 (~$17) and Pro ₱2,497 (~$43) with PayMongo — Pro
sits *below* Arcads' entry tier and is payable by a Filipino who has no international card.

**Nobody found in this sweep is doing Filipino direct-response as a system.** What exists is
Tagalog *TTS* and Tagalog *video* — HeyGen translation, Simplified, Notevibes (which explicitly
tunes for Taglish code-switching), PinoyGPT slogans, GlobalGPT's "AI Tagalog Video Generator" whose
own pitch is jeepneys and fiestas ([Notevibes](https://notevibes.com/filipino-text-to-speech/),
[GlobalGPT](https://www.glbgpt.com/features/ai-tagalog-video-generator)). That is language support,
i.e. a feature. Our LANGUAGE LOCK, the anti-manual-Tagalog word list, and
`workflows/taglish_2026_model.md` are a *register* model — the difference between a machine that can
pronounce Tagalog and one that writes the way Neil's customer actually talks.

## 3. The evidence that AI ads work — and where they stop working

- A four-university study (Columbia / Harvard / TUM / CMU) found AI-generated ads beat human-made
  ads on CTR: 0.76% vs 0.65% ([Taboola](https://www.taboola.com/press-releases/genai-ads-study-2026/)).
- But conversion drops 8% on purchases over $100 and 14% over $500. AI creative "wins on attention
  and loses on intent," and the crossover depends on price point
  ([AdBeacon](https://www.adbeacon.com/ai-creative-wins-clicks-loses-conversions/)).
- The AOV parity threshold moved from ~$25 in early 2025 to ~$100 by Q1 2026, tracking toward $200
  ([digitalapplied](https://www.digitalapplied.com/blog/ai-ad-creative-benchmark-2026-ctr-roas-data)).

**Read this against the PH market and it is good news for us.** Grifon's customer sells at PH price
points — almost everything a Filipino SMB advertises on Facebook is well under $100 AOV. That is
exactly the band where the research says AI creative should be the *default* production method.
We are not fighting the ceiling; our whole market sits under it.

Adoption is there too: SEA small businesses adopt AI tools at 48% vs 37% in the US, and PH SMB
digital budgets start around ₱30,000-₱80,000/month
([Truelogic](https://www.truelogic.com.ph/blog/manila-smbs-ai-marketing-spend/),
[Spiralytics](https://www.spiralytics.com/blog/content-marketing-philippines/)). Our ₱997-₱2,497 is
1-8% of a budget that already exists. We are not asking anyone to create a new line item.

## 4. The threat we have to answer ourselves: commoditization

CB Insights and Gartner both put AI-wrapper failure at roughly 80% by end of 2026; the pattern is an
undifferentiated wrapper commoditized in ~18 months, churn spiking to 15-20% monthly
([preuve](https://preuve.ai/blog/are-ai-wrapper-startups-worth-building-2026),
[Bay Tech](https://www.baytechconsulting.com/blog/why-generic-ai-startups-are-dead-executive-playbook-moats)).

The named survivable moats are three: **the data the product generates through its own use**, **the
workflow it becomes the official record for**, and the rights to keep both
([Innovation Attorney](https://theinnovationattorney.com/proprietary-data-moats-and-ai-startup-defensibility-in-2026/)).

Grifon already builds all three — but **on the agent side, not the product side**. The Swipe Files
(`viral_swipe_file.md`, `static_ad_swipe_file.md`, `funnel_swipe_file.md`), the Ad Performance
Ledger, `locked_wins.md`, and the ≥3-corroboration gate are literally "proprietary signal you can
only collect by being in the workflow." Today that signal improves *Neil's* prompts. It does not
yet compound inside the product for a paying user. **That gap is the moat work.**

One pricing note from the same research: consumption billing posts ~108% net revenue retention vs
~95% for seat-based, with seat-only correlating to ~2.3x higher churn. Grifon's credit model is
already the right shape — worth defending against any future "just make it a flat seat" instinct.

---

## 5. Correction to section 2: xAI is a closer competitor than Higgsfield

The first pass of this file treated the generative-video field as clip generators. That was right
about Higgsfield and wrong about xAI, and the gap matters.

- **Grok Imagine Agent Mode** shipped 2026-05-01: an infinite-canvas creative agent that plans,
  generates, edits, and **stitches 6-second clips into longer films** — explicitly pitched at the
  "prompt to image variations to short video previews" loop for rapid ad concepts, storyboards, and
  social creative testing ([codersera](https://codersera.com/blog/grok-imagine-agent-mode-launch-2026/),
  [LinkStart](https://www.linkstartai.com/en/agents/grok-imagine)).
- **Grok Bot** shipped in beta 2026-08-11: persistent agents, each on its own cloud computer, that
  sign into the user's existing tools and finish multi-step work unattended
  ([ayautomate](https://www.ayautomate.com/blog/grok-bot-xai-ai-agents-explained),
  [Beam](https://beam.ai/agentic-insights/grok-bot-enterprise-ai-agents)).
- In one quarter xAI shipped Build Mode, Automations, Imagine Image 2.0, a voice-agent builder, and
  Office/Workspace integrations ([Big Hat Group](https://www.bighatgroup.com/blog/xai-weekly-2026-05-06/)).

That is a general-purpose engine that can assemble a video ad. It still does not do market research
into a Filipino offer, does not write in register, and is English-first on a USD card. But the honest
statement is that **the assembly step is no longer our differentiator; only the Filipino
direct-response layer is.** Any pitch that leans on "we string clips into a finished ad" is already
commoditized.

## 6. The "AI OS community" threat is real but points the other way

The pattern Neil is seeing — communities teaching Filipino entrepreneurs to run a one-person
business on agent stacks — is the visible edge of a genuine 2026 shift. AI-OS products for
entrepreneurs are launching ([Genius OS, July 2026](https://tashios.com/blog/ai-os-entrepreneurs-july-2026)),
and PH businesses are named as well positioned because they already run on the exact tools agents
orchestrate: Messenger, Gmail, spreadsheets
([Quantum Growth PH](https://thequantum-growth.com/blog/ai-trends-2026-philippines)).

Three reads, in order of how much they should change behavior:

1. **It compresses our price ceiling and competes with our story.** "Bakit ka magbabayad ng software
   kung kaya na ng bot" is a real objection we will now hear in every sales conversation. It needs a
   scripted answer, and the answer is time-to-first-ad, not features.
2. **But it is also the best distribution channel we have.** People who join an AI-OS community are
   self-selected early adopters with budget who already believe AI can run their marketing. They are
   the warmest possible list. Historically, DIY-agent enthusiasts are heavy tool BUYERS, not
   abstainers — they buy the thing that removes the setup.
3. **The person who can wire a Grok agent stack is not our ICP.** Our buyer is the owner who cannot
   brief in English, will not maintain a workflow, and wants a finished ad. The community member is
   a potential reseller or affiliate, not a lost sale.

**Unverified.** No specific Philippine community was inspected for this file. Before acting on any
of the above, go into one, see what members actually ship, and how much they pay per month. That is
a cheap probe and it beats every citation here.

## 7. Probability of success, 2026-2027

Asked directly, so answered directly. **These are calibrated judgments, not measurements** — there
is no Grifon usage data to compute them from, and the largest term in every one is founder
behaviour, not market structure.

Success bar defined three ways, from launch through end of 2027:

| Tier | Bar | Probability |
|---|---|---|
| A — Alive and validated | 30+ paying users, ~₱30-50k MRR, still operating end-2027 | **~50%** |
| B — Replaces a salary | ~₱150k+ MRR (roughly 100 Pro seats or the credit equivalent) | **~15%** |
| C — Breakout | ₱1M+ MRR, hiring, category presence in PH | **~4%** |

**Why Tier A is a coin flip and not lower:** the product exists and works, which already puts it past
where most attempts die; the ICP band is evidence-backed (section 3); PH distribution via Facebook is
cheap and reachable; and there is an existing client channel (Oceanides) that proves the founder can
deliver outcomes, not just software.

**Why it is not higher:** zero paying users today, no list, no launched distribution, a solo founder
whose whole capacity has gone to engineering for 40+ sessions, and a two-front clock (Meta full-auto
creative, xAI shipping monthly).

**The conditional is the whole answer.** These are the numbers that should actually drive the
decision:

- If the next 90 days are **distribution** — samples out, 10 real conversations a week, first paid
  users, price tested — Tier A goes to roughly **70%**.
- If the next 90 days are **more engineering**, Tier A falls to roughly **15%**, because the
  advantage decays whether or not the code improves.

Same product, same market, same competitors. The spread between 70% and 15% is entirely about which
work gets done next. That is the finding.

---

## What this changes — ranked

1. **Ship. The clock is the finding, not the competition.** Meta's full-auto creative lands "later
   in 2026." Every month spent polishing the pipeline is a month of that window closing. Nothing in
   this research says build more; it says get the existing thing in front of paying Filipinos.
2. **Narrow the pitch from "AI video ads" to the part nobody else does.** "AI video ads" is the
   commoditized category with 50 competitors. Ours is: *market research → offer → Taglish script →
   finished ad, for a Filipino business, in pesos.* Meta does creative without an offer; Higgsfield
   does clips without a script; Arcads does English UGC at 6x the price.
3. **Position with Meta's automation, not against it.** Advantage+ consumes creative variety. We are
   the variety factory. That framing survives even the full-auto launch, and it is what Meta itself
   tells advertisers to focus on.
4. **Move the compounding loop inside the product.** Per-user winning-hook memory, angle reuse from
   what actually performed — the same ≥3-corroboration pattern the Swipe Files already use. This is
   the only listed moat we can build without a bigger model.
5. **Fix the false proof claim before any traffic.** `ProofGallery` says real businesses ran these
   ads (`NOW.md` open item #8). In a market where the objection is "is this real," shipping a
   provable falsehood is the fastest way to burn the launch. Free to fix, expensive to keep.
6. **Under-$100 AOV is the ICP, and now it is evidence-backed.** Sari-sari-tier ecommerce, food,
   services, small courses. Do not chase high-ticket B2B — the conversion data says AI creative
   loses there today.

## What does NOT need to change

The tech direction, the Taglish tuning, the credit model, and the PH-first distribution all survived
this check unchanged. The honest summary is that the product bet was right and the *sequencing* is
the risk: we are late to market with a thing whose advantage decays.

## Re-open trigger

Revisit this file when any one of these happens:
- Meta's URL-to-campaign creative ships to PH advertisers in general availability.
- Any competitor ships Filipino-register (not merely Tagalog-language) ad copy as a headline feature.
- We have 10 paying users — real churn and retention data outrank every citation above.
- Grok Imagine ships Filipino-register output or a PH-priced tier.
- A Philippine AI-OS community is actually inspected (section 6) — that probe replaces guesswork
  with observation and may move the section 7 numbers in either direction.

---
*Research conducted 2026-09-01 from live sources. No claim here was verified against Grifon's own
usage data, because there is none yet — that is itself the most important fact in the file.*
