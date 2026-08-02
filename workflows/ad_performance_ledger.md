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

- [x] **Provision the Meta Ads CLI** — ✅ **DONE 2026-07-27.** System User
  `Oceanides Automation` (`61592724653740`), non-expiring token in `.env`,
  `AD_ACCOUNT_ID=585951286230395`. Full runbook (with the three traps that cost
  90 minutes) in `workflows/infra_setup.md` §7. Token dies with the defreezer
  every reboot — Neil keeps it in Bitwarden.
- [ ] **FIRST CAMPAIGN BUILT, ONE TOGGLE FROM LIVE — Oceanides / Kuya Marvin
  KM-003.** All three objects exist and are **PAUSED** (₱0.00 spent):
  campaign `120250672316430347` · ad set `120250672331730347` · ad
  `120250673468830347`. **Engagement → Messaging apps**, maximize conversations,
  1 CBO / 1 ad set, **NCR (20 km radius)** + Advantage+, ₱500/day.
  NOT Sales — at ₱500/day a sales-optimized ad set gets ~10 events/week against
  the ~50 needed to exit learning, and Sales→Messaging additionally needs CAPI
  for Business Messaging to feed conversions back. No pixel: messaging
  conversions are counted at the Page, and the only dataset on that account is
  Neil's own "Grifon Pixel" (`1921429268517231`) which must NOT be attached.
  **Remaining before Neil flips it ON:** 3–5 organic posts on the Page, verify
  the AI label, and switch Advantage+ *Text improvements / Translate* OFF.
  **The three numbers are no longer blocking** — the gate was split (week 1 runs
  on cost-per-conversation alone), and Neil's manual `Create order` / `Mark as
  lead` recording in the Page inbox will generate two of the three by Day 7.
  Full handoff: `clients/oceanides/kuya-marvin/ads/NEXT-SESSION.md`.
- [ ] **Agent can now BUILD campaigns, not just read.** Nine
  `mcp__claude_ai_Meta_Ads__ads_create_*` / `_get_*` rules are allowlisted in
  `.claude/settings.json`. **`ads_update_entity` and `ads_activate_entity` are
  deliberately absent** — they are the only tools that flip a campaign ACTIVE,
  so the "never spend autonomously" guardrail is enforced by the permission
  system, not only by this skill's policy. Do not add them without Neil.
- [ ] **Creative diversification gap (Andromeda).** hook1 and hook2 share
  seg2-seg6 byte-for-byte — clean as an experiment, weak as delivery: the
  retrieval engine reads near-identical videos as cosmetic dupes and prices
  CPM accordingly. Playbook wants 4-6 genuinely distinct creatives in the ad
  set. Needs a `grifon-cmo` + `grifon-creative-director` brief for 2-4 new
  concepts (different opening visual/format, not a new hook on the same body).
- [x] **Log the first real campaign** — ✅ **DONE 2026-08-03.** KM-003 (Meta,
  Oceanides): ₱1,284.92, ~100 messages, ₱12.85 each, **1 order.** Four patterns
  opened (A1-A4), all `observed` at 1/3. The skill now runs on canon **plus one
  data point** — still not enough to change a spend rule (≥3 gate).
- [ ] When ≥10 campaigns are logged, revisit whether the parked Python tools
  (`tools/run_meta_campaign.py`, `tools/sync_ad_insights.py`) are worth building
  to auto-append insights — see `workflows/post_beta_roadmap.md`.

## North-Star Tracker

Weekly MER and spend, revenue split by funnel stage. Update one row per week.

| Week | Platform(s) | Spend | Revenue | MER | New-cust rev | Returning rev | Retargeted rev | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-07-28 → 08-03 | Meta | ₱1,284.92 | 🔴 1 order, halaga **hindi kumpirmado** | — | — | — | — | KM-003. 2 araw lang ang delivery, tapos naka-off (Marvin→Gabriel pivot, HINDI performance kill). **Walang MER: hindi pa ibinibigay ni Neil ang halaga ng order, at bawal mag-imbento.** Lumang ₱4,000-4,500 pricing pa yun, hindi ₱5,000. |

## Pattern Index

Status: `observed` (counting) → `proposed` (≥3 corroborations, in Gated
Proposals) → `applied` (now standard practice / wired into a CMO or CD brief).

| ID | Pattern | Corroborations | Status |
| --- | --- | --- | --- |
| **A1** | **Mechanism-diagnosis hook** ("hindi X, Y pala") sa Solution Aware na kategorya → elite retention sa 0:03 at pinakamababang CPM sa account. KM-003: ₱79.29 CPM laban sa ₱119-₱340 ng bawat ibang video sa parehong account. | 1 | observed |
| **A2** | **Ang alok na nangangailangan ng ISA PANG USAPAN ay kumakain ng mid-video retention.** KM-003: 41% ang nawala sa 9.2s-18.4s, eksaktong kinaroroonan ng "libre ang tingin". Matatag ang retention bago at pagkatapos nun (58.8% → 70.6% → 73.2% → 88.4%). | 1 | observed |
| **A3** | 🔴 **Ang murang cost-per-conversation ay FALSE POSITIVE kapag masama ang close.** KM-003: ₱12.85/message (3× mas mura sa ₱40-80 target band) pero 100 message → **1 order = 1%**. Ang kill gates na naka-base sa gastos-kada-usapan ay pumasa habang bumabagsak ang negosyo. | 1 | observed |
| **A4** | **Ang haba ay dapat sukatin sa kung saan bumabagsak ang retention, hindi sa kung ano ang kasya sa script.** 36.8s ang KM-003; 10s ang average na panonood; 8.0% lang ang umabot sa dulo. Ang CTA sa 36s ay nakikita ng 8 sa bawat 100. | 1 | observed |

## Gated Proposals

*Spend-strategy changes (default structure, budget rules, kill thresholds,
standing creative briefs) awaiting Neil. Only patterns with ≥3 corroborating
campaigns may appear here. The skill never auto-applies these — and never spends
autonomously regardless.*

- _(none yet)_

## Entries

Append newest at the top. Use the template below.

### 2026-07-28 → 08-03 — OCEANIDES-KM003-hook2 (Meta, PH septic tank siphoning / local service)

**Brief from:** grifon-cmo (mechanism reframe: *"hindi barado, puno na"*) · **Creative from:** kuya-marvin-ads (**1** concept, 9:16 UGC, 36.8s)
**Structure:** 1 CBO / 1 ad set / **1 creative** · **Objective:** OUTCOME_ENGAGEMENT → Messaging apps, maximize conversations · **Budget:** ₱500/araw · **Window:** 2 araw ng delivery
**Break-even:** hindi kalkulado. Walang net margin si Neil noon; sinadyang hinati ang gate (linggo 1 = proseso lang). Gross kada residential job = **₱650** (`oceanides_offer_price_page.md` §3).

| Spend | Revenue | MER | Messages | ₱/message | CTR | CPM | Frequency | Reach |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ₱1,284.92 | 🔴 1 order, halaga di kumpirmado | — | ~100 | **₱12.85** | 6.57% | **₱79.29** | 1.39 | 11,666 |

**Video funnel** (15,040 plays sa 16,205 impressions):

| Play → 9.2s | → 18.4s | → 27.6s | → 35s | → dulo | ThruPlay | Avg |
| --- | --- | --- | --- | --- | --- | --- |
| 4,460 (29.7%) | 2,621 (**58.8%**) | 1,850 (70.6%) | 1,355 (73.2%) | 1,198 (88.4%) | 3,710 | **10s / 36.8s** |

**Ano ang nangyari:**
- **Hindi pinatay dahil sa performance.** `single_all_ad_off` matapos ang 2 araw — **Marvin→Gabriel pivot** (Neil, 2026-07-30). Mahalaga ang pagkakaiba: ang pinakamagandang creative sa account ang huminto sa kadahilanang wala sa numero.
- **Pinakamagandang video na napatakbo sa account na ito, sa dalawang sukat nang sabay.** Pinakamababang CPM (₱79.29 laban sa ₱119.67 / ₱150.87 / ₱251.51 / ₱148.59) at pinakamataas na completion (8.0% laban sa 7.7% / 6.2% / 6.0% / 3.8%), sinuri laban sa lahat ng 30 ad sa `585951286230395`.
- **₱12.85/message = 3× mas mura kaysa sa ₱40-80 na target band.** Pasado sa bawat linya ng kill gate.
- 🔴 **At isang order pa rin.** 11,666 na naabot → ~100 message → **1**. Ang butas ay ang close, hindi ang lead gen. Pare-pareho ang namamatayan: *magkano?* → *"depende sa location, 4k to 4500"* → tahimik.
- **Hook×Hold:** mataas ang hook (29.7% ang umaabot sa 9.2s), **bumabagsak ang hold sa gitna** (58.8% lang ang nakakatawid sa 18.4s), tapos matatag ulit. Ang 41% na yun ay hindi kumakalat sa buong video — nakaupo sya sa isang bloke, at doon mismo nakalagay ang **"libre ang tingin."**

**So-What para sa susunod na campaign:** **Hindi ang murang usapan ang panalo. Ang close.** Dalawang bagay ang binabago nito, at pareho nang naaprubahan (Neil, 2026-08-03): (1) ang destination ay **price page**, hindi Messenger, para hindi na kailangang sagutin ng tao ang *"magkano"*; (2) ang alok sa creative ay hindi na *"libre ang tingin"* (isa pang usapan, at yun ang kumain ng 41%) kundi **"nakasulat ang presyo"** — kayang tapusin mag-isa. Hawak ang hook, pinapalitan ang dulo, **15-20s hindi 36.8s.**

**Patterns:** bagong kandidato **A1, A2, A3, A4** (lahat 1/3, `observed` — isang campaign ay anecdote). Sinasalungat: wala. ⚠️ **A3 ang pinakamahalaga at ito rin ang pinaka-mapanganib** — kung nagbago ang kill gate natin dahil dito habang 1/3 pa lang, nagpapalit tayo ng patakaran base sa isang campaign. Hindi pa sya gated proposal.

**Kulang pa:** halaga ng isang order (kay Neil lang galing) at net margin. Kapag dumating, mabubuo ang unang totoong MER row.

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
