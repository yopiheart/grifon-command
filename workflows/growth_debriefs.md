# Growth Debriefs

The compounding log behind the `growth-debrief` skill (Phase 2b of
[`growth_loop.md`](growth_loop.md)). Each run reads the growth-loop data
(`ad_performance` + `events` funnel + `feedback`) via `tools/growth_debrief_pull.py`
and lands an evidence-bound, ranked **"why it won / why it failed"** entry here.
Read the most recent entry's **Watch list** before every new run.

**Ingest-only.** Nothing in this file publishes, pauses, or spends. Winners are
*routed* (to `viral-autopsy` for Edit-DNA, to `grifon-cmo` for the next brief) and
tuned-prompt implications become **Gated Proposals** in
[`viral_swipe_file.md`](viral_swipe_file.md) — Neil ships, the skill never does.

> **No live entries yet.** Phase 2a's live Meta pull is blocked on an ad account +
> `ads_read` token (see [`growth_loop_phase2_checklist.md`](growth_loop_phase2_checklist.md)),
> so `ad_performance` is empty until Neil runs `meta_insights_pull.py` for real. The
> aggregation path is verified against `tools/fixtures/growth_debrief_sample.json`;
> the first real debrief lands once live data exists.

## Watch list (carried between runs)

*Fatiguing creatives to re-check, unproven winners needing more spend, funnel leaks
under investigation. The skill reads this first and updates it each run.*

- _(none yet — first live debrief will seed this)_

## Routes opened (open loops to close)

*Where findings went and whether they landed: swipe-file corroborations, CMO briefs,
`app_audit.md` items, Gated Proposals with Neil.*

- _(none yet)_

---

## Entry template

```markdown
### <YYYY-MM-DD> — debrief (window: <since>→<until>, <N> days, source: <supabase|fixture>)
**Totals:** spend ₱<X> · purchases <N> · purchase-value ₱<X> · blended ROAS <X>× · tagged creatives <N>

**Per-creative ranking:**
| Creative | Class | Spend | ROAS | CPA | Hook% | Hold% | CTR% | CVR% | Freq | Read (why) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| grifon-<id> | WIN | … | 9.3× | … | … | … | … | … | 1.6 | <one-line diagnosis> |
| grifon-<id> | FATIGUING | … | 0.7× | … | … | … | … | … | 4.9 | seen ~5×; refresh, not a concept miss |
| (untagged) | INCONCLUSIVE | … | … | … | … | … | … | … | … | below data floor |

**Funnel:** PageView <n> → ViewContent <n> → Lead <n> → InitiateCheckout <n> → Purchase <n>
· biggest step-down: <stage→stage, %> · checkout abandon: <%>

**Feedback:** NPS <score> (<promoters>/<passives>/<detractors>) · themes: <recurring free-text>

**So What (the one lever this window):** <single highest-impact move — scale X / fix leak Y>

**Routed:**
- Winner grifon-<id> → `viral-autopsy` (Edit DNA) · corroborates <P-ID> / new candidate
- Winning angle → `grifon-cmo` brief: "<evidence-cited ask>"
- Funnel leak → `app_audit.md`: "<ranked item>"
- TUNED implication → Gated Proposal (viral_swipe_file.md), with Neil

**Watch list updates:** <fatiguing creative to re-check / unproven winner needing spend>
```

## Entries

_(none yet — appended newest-first once live data exists)_
