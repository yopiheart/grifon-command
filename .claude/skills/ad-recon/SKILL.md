---
name: ad-recon
description: Find a competitor BRAND's winning ads in the Meta Ad Library and hand them to viral-autopsy. Use when the user names a brand/product/business to "spy on", asks "get the top N winning ads of <brand>", "is <brand> running ads", "what's working for <competitor>", "find winning ads for <niche/brand>", or wants to source winning competitor creative to learn from. This is the DISCOVERY layer (sourcing); viral-autopsy is the ANALYSIS layer. NOT for analyzing a video the user already supplies (that's viral-autopsy directly), grading Grifon's own output (gemini-eval), or trend-discovery with no brand named (Ad Recon needs a brand/advertiser to point at).
disable-model-invocation: true
---

Ad Recon is the discovery half of Grifon's competitive-intelligence loop:
**Ad Recon finds → Viral Autopsy dissects → the Swipe File compounds.** It fills
the gap `viral-autopsy` deliberately leaves out ("discovery stays human"). You
source a brand's winning ads; you NEVER analyze them here and you NEVER touch
tuned prompts or presets — all of that lives downstream behind viral-autopsy's
guardrails.

## Hard guardrails (read first)

1. **Source only.** Ad Recon's job ends at a ranked **Ad Recon Shortlist**. It
   never writes Swipe File entries, never proposes a preset/prompt change, never
   edits `services/geminiService.ts`, `api/_lib/prompts.ts`, or `renderPresets.ts`.
   The ≥3-video corroboration rule and Gated Proposals all stay in `viral-autopsy`.
2. **Brand-pinned, never keyword.** Always search the advertiser
   (`search_type=page&view_all_page_id=<id>`). A keyword query (`q=im8`) returns
   contaminated, non-brand results (proven 2026-06-26: ~3,400 fuzzy vs ~2,400
   pure). If you only have a brand name, get its page-id first (Step 1).
3. **Longevity is a research signal, not performance proof.** Rank by elapsed
   days from the displayed start date to the recorded observation. A 30-day
   threshold narrows candidates; it does not prove continuous delivery,
   spend, sales, scaling or profitability. Date-filter membership never
   supplies a missing date or increases an ad's age. Keep unknown dates
   unknown. Never call a competitor ad a proven winner from age alone.
4. **No silent caps.** If the scrape is blocked/partial (login wall, captcha,
   timeout — Catch 2 fragility), say so. Never present a truncated list as "the
   winners."

## Procedure

### Step 0 — Open the Swipe File
Read `workflows/viral_swipe_file.md` Pattern Index + Pending Actions, so the
ads you source can *target* an existing pattern (e.g. a 3rd VSL long-runner to
push P9 over the ≥3 threshold) instead of being random.

### Step 1 — Resolve the brand → advertiser page-id
Auto-resolution (name → page-id) is not automated yet (it's the fragile part).
Fastest robust path: ask the user to open the Ad Library, search the brand,
click the brand result, and **paste the `view_all_page_id=<number>` from their
browser URL.** (5 seconds; proven this session — IM8 Health = `345914995276546`.)
Confirm the target niche + country.

#### Step 1 — Neil's verified browser procedure (2026-06-28, the reliable way)
A page-pinned scrape (`search_type=page&view_all_page_id=...`) **reliably returns
empty** — both Firecrawl and a real browser show *"No ads match your search
criteria."* That is a **known Meta Ad Library bug, not a wrong page-id.** Do this
**in a real browser (delegate to `smoke-tester`)**, in order:

1. **Set the filters FIRST, before searching:** "Select country" → **All**, and
   "Select ad category" → **All ads**. (Do this *before* typing the brand — Neil
   2026-06-28. Overrides the old "default US / ALL is flaky" note above.)
2. **Type the brand** (e.g. `Cursor`) in the search bar. The typeahead shows
   multiple advertisers — **pick the correct one** (usually the first / verified:
   for Cursor that's *Cursor · Software Company · @trycursor · 23.7K FB / 87.5K
   IG*). Beware decoys (*Cursor Oy*, a *Cursor* band, *@cursor.pk*).
3. After clicking the brand you'll see **"no ads match your search criteria" —
   this is the bug. Press F5 / refresh the browser.** The full list of video +
   image ads then renders.
4. **Only now apply the longevity filter** ("Impressions by date" → ≥30 days, i.e.
   the `start_date[max]` floor). **The bug fires AGAIN here** — after you change/set
   the date it reverts to "no ads match." **Press F5 / refresh once more** and the
   date-filtered list renders. (Rule of thumb: every filter change → refresh.)

Because the empty state only clears on an in-session refresh, **the keyword-search
JSON scrape can surface a brand's ads (good for a quick page-id sniff), but the
authoritative full-library scan must be the smoke-tester browser flow above.**

### Step 2 — Get the ranked shortlist
Preferred (deterministic tool does the ranking):

```bash
# If FIRECRAWL_API_KEY is configured, the tool scrapes + ranks in one shot:
python tools/find_winning_ads.py --page-id <id> --brand "<name>" --country US --top 5 --min-days 30
```

If there is no `FIRECRAWL_API_KEY` (or the scrape is blocked), split it:

```bash
python tools/find_winning_ads.py --page-id <id> --print-url   # get the pinned URL
```
Scrape that URL yourself with the agent's web tools (firecrawl MCP, stealth
proxy, waitFor ≥12s), save the result as `{ "ads": [...] }` JSON, then:
```bash
python tools/find_winning_ads.py --from-json scraped.json --brand "<name>" --top 5 --min-days 30
```

The tool emits version 2 research candidates, not profit-proven winners.
The input JSON needs reviewed collection metadata separate from scraper
output: `collection.observed_at` (ISO timestamp with timezone), `page_id`,
`advertiser`, advertiser-pinned `source_url`, matching `identity_source_url`,
`identity_reviewed: true`, a recorded `identity_evidence` explanation,
`method`, `status` (`complete|partial|blocked|unknown`) and `limitations`.
Claim `complete` only with recorded `completion_evidence`. Each ad needs
its confirmed `page_id`, numeric `library_id`, observed `activity`, and
displayed `started_running` date; do not manufacture missing fields.
Bare scraper output remains unverified review material. Dates are ranked
at the collection observation, never the host's later replay date.
Low-impression, duplicate, decoy, inactive and invalid records are excluded
with reasons. A partial sample cannot establish the brand's best ads.
Exit 2 means blocked acquisition; exit 3 means no eligible candidates in
this collection, not no advertising. The date filter is discovery only.

Heads-up: a page-pinned + date-filtered scrape can surface **partner/creator
pages** running the brand's branded content (e.g. IM8's ads via *The Dodo* /
*Health NewsExplained*). That's real brand spend, but if you want the brand's
*own* creative, prefer shortlist rows where `advertiser` == the brand.

### Step 3 — Present the shortlist + download the winner (free, no login)
Show the ranked table (rank · days-active · advertiser · hook · `ad_permalink`).
Then get the MP4 — **the Meta Ad Library is a public transparency tool, so the
video is just an `fbcdn.net` MP4 in the page; no login, no extension, no
payment.** (AdLibNote was the original plan but it paywalls downloads behind a
credit-card trial — 2026-06-26 — so we don't depend on it.)

Free download method (delegate to a foreground `smoke-tester` subagent so the
heavy page snapshots never enter the main context):
1. `browser_navigate` to the chosen `ad_permalink` (`?id=<library_id>`).
2. Wait for the card to render; click Play if needed.
3. `browser_network_requests` → find the request whose host contains `fbcdn`
   and path ends `.mp4` (progressive `sve_sd`/`sve_hd`). Prefer HD.
4. `curl -L -A "<browser UA>" -o .tmp/ad-recon/<slug>.mp4 "<video_url>"`; verify
   size > ~200 KB (a few KB = an error page → try the other variant).
The subagent returns just the path + URL. Tip: the video URL's decoded `efg`
param carries `asset_age_days` — a truer creative age than the displayed date.

Captions/headlines are already in the shortlist (`caption` field) — carry them
forward; they seed the working-hook idea bank without any extra step.

### Step 4 — Hand off to viral-autopsy (do NOT analyze here)
For each downloaded MP4, invoke the **viral-autopsy** skill with the file path,
the niche, and `--source fb-ad-library`, plus the *why-autopsied* rationale
("longest-running active ad for <brand>, <N> days"). viral-autopsy owns the
Gemini analysis, the Swipe File entry, the Pattern Index update, and all gating.

### Step 5 — Commit
Cafe-PC rule: the `.tmp/ad-recon/` JSON is disposable, but any Swipe File entry
viral-autopsy writes must be committed immediately. Ad Recon itself produces no
committed artifact beyond what viral-autopsy appends.

## Choosing brands to recon (when the user asks "who should I spy on?")
Target **DTC / direct-response performance brands** whose ad IS the sales
mechanism (supplements, skincare, gadgets, info-products) — NOT brand-awareness
giants (their ads optimize for awareness, not conversion, so there's no
direct-response format to learn). Prefer brands that (a) are DTC, (b) run many
long-running ads, (c) match a Grifon client's niche.

## Out of scope / wrong tool
- **Analyzing a video** → `viral-autopsy` (this skill hands off to it).
- **Grading Grifon's own ads** → `gemini-eval` / `brand-check`.
- **"What's trending" with no brand named** → not built; Ad Recon needs an
  advertiser to point at.
- **Static images, headline library, marketing-strategy remix** → parked
  post-v1 (see `workflows/spy_intel.md` follow-ups); don't scope-creep here.
- **Building this into an in-app customer module** → `post_beta_roadmap.md`.
