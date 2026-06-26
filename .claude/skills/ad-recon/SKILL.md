---
name: ad-recon
description: Find a competitor BRAND's winning ads in the Meta Ad Library and hand them to viral-autopsy. Use when the user names a brand/product/business to "spy on", asks "get the top N winning ads of <brand>", "is <brand> running ads", "what's working for <competitor>", "find winning ads for <niche/brand>", or wants to source winning competitor creative to learn from. This is the DISCOVERY layer (sourcing); viral-autopsy is the ANALYSIS layer. NOT for analyzing a video the user already supplies (that's viral-autopsy directly), grading Grifon's own output (gemini-eval), or trend-discovery with no brand named (Ad Recon needs a brand/advertiser to point at).
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
3. **"Winning" = longevity, not impressions.** Rank by days-active: ≥30d =
   winner, ≥60–90d = scaled. Impressions is a tiebreaker only. The tool enforces
   this; don't override it with "highest impressions" reasoning.
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
Confirm the target niche + country (default `US`; `ALL` is flaky).

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

The tool drops "Low Impression Count" ads, computes `days_active`, filters by
`--min-days`, ranks by longevity, and writes the shortlist to
`.tmp/ad-recon/<brand>-<date>.json`. Exit code 3 = no ad cleared the bar (report
it; don't invent winners).

### Step 3 — Present the shortlist + point to the downloads
Show the ranked table (rank · days-active · advertiser · hook · `ad_permalink`).
Tell the user exactly which `ad_permalink`s to open and **one-click download via
the AdLibNote browser extension** (hybrid model: the agent never handles the
login; the user's own logged-in browser does the download). Capture each
returned MP4 path.

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
