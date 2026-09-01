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

## Pricing call for the pilots

Free for the first three, in exchange for permission to publish the numbers. That permission is the
actual price and it is worth more than ₱997. From the fourth onward, charge for the outcome
(a three-ad pack plus setup) rather than for seats, and only route people to the ₱997/₱2,497 self-
serve tiers once they have seen an ad of their own perform. **This is a recommendation to test in
week two, not a settled price.**

## The honest risk

Seven days of service work produces no code and no recurring revenue, and if all 30 conversations
go nowhere, the week is spent. That is the point: it is the cheapest possible test of the one
assumption everything else rests on, which is that a Filipino SMB will pay for this at all. It has
never been tested. Forty-plus sessions of engineering have not made it any more likely to be true.

## Re-open

Rewrite this file on 2026-09-08 with the three Day-7 numbers in it, then re-score
`market_viability_2026.md` section 7 against them.
