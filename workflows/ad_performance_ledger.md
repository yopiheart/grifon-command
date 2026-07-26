# Ad Performance Ledger

The compounding database behind the `grifon-ad-strategist` skill: every paid
campaign we run (Meta via the Ads CLI, TikTok by hand) gets an evidence-bound
entry here, patterns accumulate in the index, and nothing graduates to a
spend-strategy change without ≥3 corroborating campaigns. **Read top-to-bottom
before recommending any structure or budget** — the entire point is to stop
re-burning budget on lessons we already paid for. Maintained by
`.claude/skills/grifon-ad-strategist/`.

**Cafe-PC rule:** commit every update immediately
(`ad-strategist: log <campaign> — MER <x>`). Uncommitted work dies with the
reboot, and this file is the only thing that makes the skill smarter over time.

**North Star = MER** (Marketing Efficiency Ratio = total revenue ÷ total ad
spend). Target **3–5×**. Diagnostics (hook rate, hold rate, CTR, CPA, frequency)
explain *why* MER moves; we scale on MER/ROAS, never on a diagnostic alone.

## Pending Actions

- [ ] **Provision the Meta Ads CLI** (System User token + `AD_ACCOUNT_ID` in
  `.env`, scopes `ads_management` / `business_management` / `read_insights` /
  `pages_*`). Blocks every live `meta ads insights` pull. See
  `workflows/infra_setup.md` → "Meta Ads CLI".
  **2026-07-27:** `AD_ACCOUNT_ID=585951286230395` is set; `ACCESS_TOKEN` is
  commented out in `.env` with full generation steps. Token dies with the
  defreezer every reboot — keep it in a password manager.
- [ ] **FIRST CAMPAIGN READY TO LAUNCH — Oceanides / Kuya Marvin KM-003.**
  Creative done and Neil-approved (two hook variants). Structure decided:
  **Engagement → Messaging apps**, maximize conversations, 1 CBO / 1 ad set,
  PH broad + Advantage+, ₱500/day, ad account `585951286230395`. NOT Sales —
  at ₱500/day a sales-optimized ad set gets ~10 events/week against the ~50
  needed to exit learning, and Sales→Messaging additionally needs CAPI for
  Business Messaging to feed conversions back. No pixel: messaging conversions
  are counted at the Page, and the only dataset on that account is Neil's own
  "Grifon Pixel" (`1921429268517231`) which must NOT be attached.
  **Blocked on:** the token above, plus three numbers from Neil — average job
  value, conversation→booking rate, target CPA per booked job. Without them
  there is no break-even ROAS and no kill threshold.
  Full handoff: `clients/oceanides/kuya-marvin/ads/NEXT-SESSION.md`.
- [ ] **Creative diversification gap (Andromeda).** hook1 and hook2 share
  seg2-seg6 byte-for-byte — clean as an experiment, weak as delivery: the
  retrieval engine reads near-identical videos as cosmetic dupes and prices
  CPM accordingly. Playbook wants 4-6 genuinely distinct creatives in the ad
  set. Needs a `grifon-cmo` + `grifon-creative-director` brief for 2-4 new
  concepts (different opening visual/format, not a new hook on the same body).
- [ ] **Log the first real campaign** here once spend goes live — until then the
  Pattern Index is empty and the skill runs on canon, not on our own data.
- [ ] When ≥10 campaigns are logged, revisit whether the parked Python tools
  (`tools/run_meta_campaign.py`, `tools/sync_ad_insights.py`) are worth building
  to auto-append insights — see `workflows/post_beta_roadmap.md`.

## North-Star Tracker

Weekly MER and spend, revenue split by funnel stage. Update one row per week.

| Week | Platform(s) | Spend | Revenue | MER | New-cust rev | Returning rev | Retargeted rev | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| _(none yet)_ | | | | | | | | first row lands when live spend starts |

## Pattern Index

Status: `observed` (counting) → `proposed` (≥3 corroborations, in Gated
Proposals) → `applied` (now standard practice / wired into a CMO or CD brief).

| ID | Pattern | Corroborations | Status |
| --- | --- | --- | --- |
| _(none yet)_ | Patterns accrue as campaigns are logged. e.g. "Curiosity-gap hook + 9:16 UGC → ≥3× ROAS, PH skincare cold" | 0 | observed |

## Gated Proposals

*Spend-strategy changes (default structure, budget rules, kill thresholds,
standing creative briefs) awaiting Neil. Only patterns with ≥3 corroborating
campaigns may appear here. The skill never auto-applies these — and never spends
autonomously regardless.*

- _(none yet)_

## Entries

Append newest at the top. Use the template below.

### Entry template

```markdown
### <YYYY-MM-DD> — <campaign> (<platform>, <brand/niche>)
**Brief from:** grifon-cmo (<angle/offer>)  ·  **Creative from:** grifon-creative-director (<format, # concepts>)
**Structure:** <CBO/ABO, # ad sets, # creatives>  ·  **Objective:** <e.g. OUTCOME_SALES>  ·  **Budget:** <₱/day>  ·  **Window:** <Xd>
**Break-even ROAS:** <1 ÷ net margin = X>

| Spend | Revenue | MER | ROAS | Hook rate | Hold rate | CTR (link) | CPM | CPA | Frequency |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | | | |

**What happened:**
- <killed: which ad, why (cite the kill criterion + the number)>
- <scaled: which ad, the budget move made, the result>
- <Hook×Hold read per top creative>

**So-What for the next campaign:** *(mandatory — an entry without this is incomplete)*
<the one decision this changes next time, with the number behind it>

**Patterns:** corroborates <IDs>; new candidate: <or none>; contradicts: <or none>
```
