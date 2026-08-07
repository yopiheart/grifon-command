# Handoff — 2026-06-26 — Ad Recon v1 shipped, ready for first live run

**For the next session (likely VS Code on a cafe PC).** This conversation does
not survive the move; the repo does. Read this + `CLAUDE.md` +
`UBIQUITOUS_LANGUAGE.md` and you're caught up. Everything below is already
committed on branch `claude/codex-plugin-architecture-eval-s1wetk`.

## How we got here (the thread, condensed)

Started as an evaluation of OpenAI Codex's "Record & Replay" + "Plugin
Architecture" brief against Grifon. Verdict: **don't adopt either** — Record &
Replay is macOS-only (we're on Windows cafe PCs) and records desktop *actions*,
not video content (can't replace Gemini for autopsy); the Plugin Architecture is
org-scale distribution we don't need and would duplicate the skills system.

The conversation then pivoted to a genuinely valuable idea Neil had: **auto-source
winning competitor ads → feed Viral Autopsy.** We validated it live against the
real Meta Ad Library and built it. That's **Ad Recon**.

## What Ad Recon is

The discovery half of the competitive-intelligence loop that `viral-autopsy`
deliberately leaves to humans: **Ad Recon finds → Viral Autopsy dissects → the
Swipe File compounds.** Dev-time agent tooling, NOT an in-app customer module.

## Decisions locked (don't re-litigate)

- **"Winning" = LONGEVITY, not impressions.** Days-active ≥30 = winner, ≥60–90 =
  scaled. Advertisers kill losers, so a still-active old ad is profit-proven.
  Impressions is a tiebreaker only.
- **Brand-pinned search, NEVER keyword.** Use
  `search_type=page&view_all_page_id=<id>`. Proven live: `q=im8` → ~3,400
  contaminated results (Sony, AbbVie); pinned → ~2,400 pure IM8.
- **Download model = 1B hybrid.** Agent builds the URL + ranks + hands off; Neil
  one-click downloads via the **AdLibNote** browser extension. The agent never
  handles any login (this is why we chose it — zero credential risk).
- **v1 scope = 2A.** Winning **video** ads + **captions/headlines** (the captions
  come free in the shortlist). Static images + headline library + CMO/CD
  marketing-strategy layer are **parked for v2**.

## What's built + committed (all tested)

- `tools/find_winning_ads.py` — URL builder + longevity ranking. Scrapes via
  Firecrawl if `FIRECRAWL_API_KEY` is set; else `--print-url` / `--from-json`.
  Tested live on real IM8 data: ranks 143d>17d>15d, drops Low-Impression + bad-date
  ads, exit 3 on no-winners, exit 1 on missing target.
- `.claude/skills/ad-recon/SKILL.md` — discovery skill; sources only, hands off
  to `viral-autopsy`, inherits all tuned-prompt/≥3-corroboration guardrails.
- `workflows/spy_intel.md` — the full SOP.
- `UBIQUITOUS_LANGUAGE.md` — Ad Recon / Winning Ad / Ad Recon Shortlist terms.
- `viral_swipe_file.md` — pending 3rd-VSL autopsy now points at IM8 Health.

## Key facts to reuse

- **IM8 Health** advertiser page id = **`345914995276546`** (~2,400 active ads).
  Winning format (visible from copy): **authority/practitioner testimonial UGC**
  ("As a gastroenterologist…", "20 yrs in sports medicine, I'm skeptical…").
- Use `country=US` (the `ALL` value is flaky / fails to bind on scrape).
- Pattern **P9** (`vsl` preset) sits at 2/3 corroborations — autopsying ONE IM8
  long-runner could push it to ≥3 and unlock its Gated Proposal.

## NEXT STEP — the first live run (this is where to resume)

Do a full end-to-end on IM8, which needs the cafe-PC keys (`GEMINI_API_KEY`,
optionally `FIRECRAWL_API_KEY`) in `.env` + outbound network:

1. `python tools/find_winning_ads.py --page-id 345914995276546 --brand "IM8 Health" --country US --top 5 --min-days 30`
   - If no `FIRECRAWL_API_KEY`: add `--print-url`, scrape that URL with the
     agent's web tools, save as `{ "ads": [...] }`, re-run with `--from-json`.
2. Open the top `ad_permalink`(s), AdLibNote → Download → grab the MP4 path(s).
3. Invoke `viral-autopsy` on each MP4 (`--source fb-ad-library`, niche
   "supplements", rationale "longest-running IM8 ad, <N>d").
4. Check whether the entry corroborates **P9**; if it's the 3rd, draft the `vsl`
   Gated Proposal (addressed to Neil — never auto-applied).
5. Commit the Swipe File update immediately.

Gotcha to expect: the Ad Library scrape is fragile (anti-bot, timeouts) — Catch 2.
It's isolated in `find_winning_ads.py`; if it breaks, the `--from-json` path
(agent scrapes via MCP) always works.

## Paste-ready kickoff for the VS Code session

> Resuming Ad Recon (see `workflows/archive/2026-06-26-ad-recon-v1-shipped.md`).
> v1 is built + committed on this branch. Let's do the first LIVE end-to-end run
> on IM8 Health (page 345914995276546): run `tools/find_winning_ads.py`, I'll
> AdLibNote-download the top winner, then hand it to `viral-autopsy` and see if it
> pushes pattern P9 to ≥3. Confirm my `.env` has GEMINI_API_KEY first.
