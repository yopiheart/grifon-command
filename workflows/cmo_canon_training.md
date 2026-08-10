# CMO Canon Training — parked spec

**Status: PARKED 2026-08-10.** Neil raised it mid-session; we chose to finish the
sample-batch quality gates first. **Resume by typing `/grill-me` yourself** — the skill is
`disable-model-invocation: true`, an agent cannot fire it and must not imitate it.

**The ask:** train `grifon-cmo` on the sales/marketing canon, because Neil's read is that our
marketing strategy is not as sharp as it should be. His five: Carnegie *How to Win Friends*,
Ries + Trout *Positioning*, Cialdini *Influence*, Tracy *The Psychology of Selling*, Rackham
*SPIN Selling*. Open questions: split sales from marketing? what is missing? where to source?
how does it reach the workflow, and possibly the product?

---

## 1. Audit of what the CMO already knows (done 2026-08-10, read the file)

`.claude/skills/grifon-cmo/SKILL.md` is 16.7 KB and **already carries three of the five**:

| Already in | Where |
|---|---|
| Cialdini's 7 principles, in full, used by name in reasoning | § PERSUASION STACK |
| Schwartz awareness ladder + market sophistication | § AWARENESS LADDER (Neil-approved 2026-07-20) |
| Sabri Suby offer architecture, MrBeast thumbnail law (decoded from 15 real files) | § OFFER ARCHITECTURE, § THUMBNAIL RULES |
| KX funnel lens (Schultz / Meta) | § KX FUNNEL LENS |

**So the diagnosis is not "under-trained on persuasion."** Two things are genuinely absent, and
one is structural:

1. **Positioning — completely absent.** There is an avatar (Bryan) but no framework for *who we
   are positioned against*: the ₱30K agency, Canva, or the owner's own six hours. Ries/Trout is
   exactly this hole.
2. **Sales as a discipline — four bullets.** `§ SALES SCRIPT RULES` is four lines, in a skill
   whose name is Chief Marketing **and Sales**.
3. **No ledger of its own — the structural weakness.** `viral-autopsy` feeds
   `viral_swipe_file.md`; `static-autopsy` feeds `static_ad_swipe_file.md`; `grifon-ad-strategist`
   feeds `ad_performance_ledger.md`. **`grifon-cmo` reads all three and owns none.** It never
   scores its own output, so it cannot compound. No quantity of book knowledge fixes this — if the
   session only adds reading material, the CMO will feel exactly as sharp as it does today.

## 2. The contradiction inside Neil's five books

**Rackham's central empirical finding contradicts Tracy's core method.** SPIN Selling reports
Huthwaite's observation of roughly 35,000 sales calls: classic closing techniques *reduce* success
as deal size grows, and only help in small transactional sales. Tracy's *Psychology of Selling*
teaches those closes. Put both in one skill file and it holds two contradicting instructions,
resolving them by whichever sits higher in the file.

The fix is not to pick one. It is to **route by deal size**, which is Rackham's own prescription.
Grifon has all three lanes live:

| Lane | Shape | Governing source |
|---|---|---|
| Starter ₱997 self-serve | small, single-sitting, transactional | Tracy + Cialdini |
| Autopilot ₱29,997+, Enterprise procurement, `funnel-forge` client work | large, multi-call, consultative | Rackham (SPIN) |
| Kuya Marvin Messenger replies | small but human, live conversation | Voss + Carnegie |

## 3. Recommended architecture (attack this in the grill)

**Keep sales and marketing combined for now; build it in a shape that splits cleanly later.**

- Canon goes into `.claude/skills/_shared/` as reference files — the established pattern
  (`thumbnail-law.md`, `taglish-voice.md`, `pricing-ladder.md`, `vo-direction.md`). `SKILL.md`
  gets short pointers plus the deal-size router, so it does not bloat past skim-length.
- **Do not build a `grifon-closer` skill yet.** The `grifon.ai` door is shut and there is no
  inbound volume to close; a second persona is pure passive context load today. Lift it out when a
  real conversation lane has volume — the `_shared/` layout makes that a move, not a rewrite.
- **Give the CMO a ledger.** This is the highest-leverage item in the whole initiative and it is
  not a book. Shape TBD in the grill; the three sibling ledgers are the precedent, including the
  ≥3-corroboration gate.

## 4. Books to add, ranked by load-bearing weight for Grifon

1. **$100M Offers, Hormozi.** The Value Equation currently sits in `SKILL.md` attributed to Sabri
   Suby; **it is Hormozi's.** Our own file has the wrong source. `funnel_swipe_file.md` is already
   full of Hormozi-derived F-entries, so we read the descendants without the original.
2. **The Ultimate Sales Machine, Chet Holmes.** The Buyer's Pyramid (~3% buying now, 7% open,
   ~90% not thinking about it). Consequence: an ad written only for the 3% competes for the most
   expensive traffic on the platform. Pairs directly with the Schwartz ladder already in place.
3. **Obviously Awesome, April Dunford.** Ries/Trout says positioning matters; Dunford gives the
   10-step procedure. Take both — doctrine plus process.
4. **Never Split the Difference, Voss.** For the one-to-one lane. More operational than Carnegie in
   a live Messenger thread, and mirroring/labeling transfer unusually well into Taglish.
5. **Ogilvy on Advertising.** Craft and testing discipline, for a product that generates ads.

**Honest subtraction: Carnegie is the weakest fit of Neil's five for Grifon's actual jobs.** Most
of what is usable is already covered by Cialdini's Liking principle. It matters more to the Kuya
Marvin lane than to the CMO. Rank it last; do not spend a paid subscription month on it.

## 5. Citation honesty — the constraint that shapes the whole session

Neil's extraction template asks for page/section citation "so I can verify later." **An agent
cannot produce verifiable page numbers from memory.** Pagination varies by edition (Cialdini alone:
1984, 2007 revised, 2021 expanded with a 7th principle). Fabricated page numbers are worse than no
citation, because they defeat the exact requirement that motivated the template.

| Mode | Cost | What holds | What breaks |
|---|---|---|---|
| **A — from model knowledge** | ₱0, immediate | frameworks, named studies, structure, chapter-level location | exact quotes (paraphrase reads as quote), exact statistics, all page numbers |
| **B — read the real text** | book cost | everything, with real page/location cites | nothing; this is what the template actually asks for |

**Plan: Mode B for the three heaviest, Mode A for the rest.** Under Mode A every statistic ships
tagged `⚠ verify` and every quote is marked paraphrase unless certain.

Prefer **Kindle location numbers** over page numbers where possible — stable per edition and
citable. Audiobook timestamps also satisfy the template.

## 6. Sourcing (legal routes, ranked for a PH budget)

- **Everand (ex-Scribd)** ~₱400–500/mo — carries most of these; one month likely covers all five.
  Best value.
- **Kindle** — Carnegie and Cialdini are cheap, and locations beat pages for citation.
- **Libby / OverDrive** with a library card — free; PH coverage is thin but some university
  libraries participate.
- **Spotify Premium** — includes audiobook hours; timestamps are citable.
- **Shortform** ~$24/mo — rigorous chapter-by-chapter summaries. A scaffold, never a quote source.
- **Possible ₱0:** PH copyright is life + 50 (RA 8293). Carnegie died 1955-11-01, so *How to Win
  Friends* is likely public domain in the Philippines since 2005. **Sanity-check before relying on
  it — this is not legal advice.** The other four are all still protected.

## 7. Into the product — gated, not free

Neil floated putting this "inside the app." That is a far larger step than a skill file: it means
editing `api/_lib/prompts.ts` and `services/geminiService.ts`, both **TUNED**. The sanctioned path
already exists — a Gated Proposal behind the ≥3-corroboration bar, same as the swipe files.
**Workflow layer first; product layer only through the gate.** Open question for the grill: does
the shipped product already encode the awareness ladder anywhere, or only the CMO skill? Not
checked as of this writing.

## 8. Resume

```
/grill-me

Read workflows/cmo_canon_training.md. Training grifon-cmo on the sales/marketing canon.
Decisions I need grilled: (1) does the CMO get its own ledger, and what scores an entry?
(2) combined vs split sales skill, and what event triggers the split? (3) which 3 books get
Mode B (real text, real cites) and am I buying Everand? (4) does any of this reach TUNED
product prompts, or workflow layer only?
```

**Related:** [`../.claude/skills/grifon-cmo/SKILL.md`](../.claude/skills/grifon-cmo/SKILL.md) ·
[`ad_performance_ledger.md`](ad_performance_ledger.md) ·
[`static_ad_swipe_file.md`](static_ad_swipe_file.md) ·
[`funnel_swipe_file.md`](funnel_swipe_file.md)
