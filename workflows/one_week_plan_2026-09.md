# The One Week Plan — September 2026

**Asked (Neil, 2026-09-01):** *"God mode. If you were deciding right now, knowing where the project
is and what I am worried about, what is the move? You have one week."*

This is a decision, not a menu. It supersedes the ranked list in
[`market_viability_2026.md`](market_viability_2026.md) section "What this changes" for the next
seven days only; that file stays the strategic reasoning behind it.

---

## The decision in one line

**Stop selling software this week. Sell the outcome, using the one asset nobody else in the PH
market has: a real Filipino business whose AI-made ad hit ₱13.33 per message.**

## Why that asset and not a sample

`clients/oceanides/kuya-marvin/ads/NEXT-SESSION.md` records KM-003, Day 1 (2026-07-28), pulled from
Meta's API rather than typed by hand:

| Metric | Day 1 |
|---|---|
| Spend | ₱666.30 |
| Messages | 50 |
| Cost per message | **₱13.33** against a ₱40-80 target band |
| CTR | 6.20% |
| CPM | ₱92.39 |

⚠ **Verified only to Day 1.** That file is over a month old and nothing in the repo records what
happened after Day 7 (2026-08-03), including whether the messages became bookings. Neil knows;
the number to publish is whichever one is true today, pulled fresh.

Three reasons this outranks another sample render:

1. **It is the only thing the competition structurally cannot show.** Grok, Meta's automation and
   Higgsfield hand a Filipino owner a tool. None of them can hand him a septic-tank business in
   Bulacan with a receipt.
2. **It fixes the credibility hole instead of patching it.** `ProofGallery` currently claims real
   businesses ran these ads and that is false (`NOW.md` open item #8). The cure is not deleting the
   claim. It is making it true, which it already is, in the wrong folder.
3. **It is the moat, in the shape the research named.** Proprietary signal collected by being in the
   workflow. Every pilot run this week produces a row nobody can scrape.

## Positioning for the week

**Not** "AI video ad generator." That category is commoditized and both Meta and xAI are shipping
into it monthly.

**Instead:** *"Gagawa ako ng unang tatlong ad mo, at ipapakita ko ang numero."*
Done-with-you first, software second. The software is how the work gets done, not what is sold.

This is deliberately a service week. It is not a retreat from the product. Services first is how a
solo founder earns the right to sell the software, and it is the fastest legal way to manufacture
the proof and the usage data that the self-serve launch needs anyway.

---

## The seven days

**Day 0, tonight, ~2 hours.** Pull KM-003's real numbers to date from Meta. Rip out the false
`ProofGallery` claim and replace it with the Oceanides receipt: the ad itself, the spend, the cost
per message, the date. One true card beats six invented ones. Nothing else on the landing page gets
touched.

**Day 1.** Build the single case-study page. One page, one story: the business, the problem, the ad
Grifon made, the number Meta reported. `funnels/_template/` and the `funnel-forge` skill already do
this and have a live rep (`grifon-starter`, 2026-07-29), so this is assembly, not invention. Ends
with one offer and one button.

**Day 2. Outreach, 30 real conversations.** Not "try my app." The message is: *"May ginawa akong ad
para sa isang septic-tank business. ₱13 kada message. Gusto mo bang gawan kita ng isa? Libre ang
una. Kung gumana, doon tayo mag-usap."* Sources: existing network, PH SMB groups, and **one AI-OS
community** — that also discharges the unverified probe from `market_viability_2026.md` section 6.

**Days 3-4. Deliver three pilot ads by hand.** Neil operates the pipeline himself. This is not
dogfooding for its own sake; it is the fastest path to three finished Filipino ads. Every failure
that shows up here (a refused scene dying, open item #7) becomes a prioritized bug with a customer
attached to it, which is worth more than the same bug found in a sample run.

**Day 5. Get one pilot to spend ₱500-1,000 and record what came back.** One live number from a
business that is not Oceanides is the entire difference between one data point and a pattern.

**Day 6. Publish the second case study, or publish the honest failure.** Both are content. A public
"here is what did not work and why" outperforms silence and is the only version that survives
contact with a market that has been lied to by every AI tool ad it has seen.

**Day 7. The gate, with real numbers, not estimates.** Three of them:
- Of 30 conversations, how many said yes to a free pilot?
- Of the pilots delivered, how many spent their own money?
- What was the cost per message or lead, on a business that is not Oceanides?

Those three replace every probability in `market_viability_2026.md` section 7. Any founder-judgment
percentage loses to a week of real conversations.

## What does NOT happen this week, deliberately

- No new sample renders. Two shipped samples already exist (`real_talk`, `unboxing`).
- No pipeline work except a bug a pilot customer actually hit.
- No self-serve launch, no pricing-page redesign, no paid spend on Grifon's own brand.
- No Concierge, no Autopilot, no new module. The build backlog in `NOW.md` waits seven days.

## This is NOT a change of offer

The product offer stays exactly as it is: ₱997 Starter, ₱2,497 Pro, self-serve. What changes for
seven days is the **first step of the funnel**, not the thing being sold.

Selling ₱997/month software cold to a Filipino SMB who has never seen it work asks them to believe
a claim. Saying *"gagawan kita ng ad, ikaw na lang bahala sa ad spend mo"* asks them to believe
nothing. The service is the on-ramp; the software is still the destination.

**The trap this creates, named so it can be avoided:** a solo founder on cafe wifi cannot run an
agency. If pilots are still the main activity in month three, the week failed, whatever the numbers
said. Hence the hard cap below.

## Who pays what, and the cap

| Item | Who pays | Rough size |
|---|---|---|
| Ad production (API calls: text, images, video render) | **Neil** | ~₱200-800 per finished ad |
| Ad spend on Meta | **The client, from peso one. Never Neil.** | their call, ₱500 minimum to count |
| The "price" of the free ad | The client: permission to publish the numbers, plus a yes/no date | — |

Production cost is derived from [`cogs_analysis.md`](cogs_analysis.md): ~$0.02 text + ~$0.30 images
+ ~$3.00 per ~30s video render per ad. ⚠ That file flags its unit prices as order-of-magnitude
placeholders, and a 4-scene ad carries more than one render, so **confirm against live pricing
before committing to a number publicly.** Three pilots land somewhere under ₱2,500 all-in, which is
less than one day of the ad spend the plan is trying to earn the right to ask for.

**The client's ad spend is non-negotiable and it is the point, not a cost.** If Neil funds the
spend he learns nothing: every pilot "works" and nobody has revealed anything about their intent.
A business owner who will not risk ₱500 of their own money on an ad made for them for free is a
business owner who will never pay ₱997 a month. That refusal is a result, and it arrives free.

**Hard cap: three pilots. Written down here so it is a rule and not a mood.** From the fourth
onward, charge, and charge for the outcome (a three-ad pack plus setup) rather than for seats.
Route people to the self-serve tiers only after they have watched an ad of their own perform.
The paid price is a week-two decision, not settled here.

## The landing page: one change now, the rewrite later

**Day 0 touches the proof section only** — the false `ProofGallery` claim comes out, the Oceanides
receipt goes in. Nothing else.

**The full repositioning waits, deliberately.** Rewriting the page today means rewriting it from a
guess, and the guess would be this file's, not the market's. The thirty conversations on Day 2 ARE
the copy research: whichever sentence makes a stranger reply, and whichever objection keeps coming
back, is the headline and the FAQ. Write the page in week two out of their words. Doing it in the
other order is how a page ends up beautiful and unread.

## The honest risk

Seven days of service work produces no code and no recurring revenue, and if all 30 conversations
go nowhere, the week is spent. That is the point: it is the cheapest possible test of the one
assumption everything else rests on, which is that a Filipino SMB will pay for this at all. It has
never been tested. Forty-plus sessions of engineering have not made it any more likely to be true.

## Re-open

Rewrite this file on 2026-09-08 with the three Day-7 numbers in it, then re-score
`market_viability_2026.md` section 7 against them.
