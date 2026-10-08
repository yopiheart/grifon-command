# Spy Intel — Ad Recon → Viral Autopsy loop

The competitive-intelligence pipeline that turns *"spy on this brand"* into
compounding swipe-file knowledge. **Ad Recon finds → Viral Autopsy dissects →
the Swipe File compounds.** This SOP covers the discovery half (Ad Recon); the
analysis half is owned by the `viral-autopsy` skill and
`workflows/viral_swipe_file.md`.

Orchestrated by the `.claude/skills/ad-recon/` skill via
`tools/find_winning_ads.py`. Dev-time agent tooling — NOT a customer-facing
in-app module (that stays parked in `post_beta_roadmap.md`).

## Why this exists

`viral-autopsy` is excellent at dissecting a video the user hands it, but it
explicitly leaves sourcing to humans ("discovery stays human… auto-discovery →
not built"). Neil doesn't want to hunt winners by hand. Ad Recon automates the
sourcing — *recommend a brand → get its winning ads* — without touching the
analysis layer or its guardrails.

## The loop

```
Brand/advertiser name
   │  Step 1: resolve → view_all_page_id   (paste from browser; 5s)
   ▼
tools/find_winning_ads.py  (advertiser-pinned URL, longevity rank)
   │  Step 2: Ad Recon Shortlist (top-N Winning Ads + captions + permalinks)
   ▼
Free fbcdn .mp4 capture (public ad)   (Step 3 — agent handles no login)
   ▼
viral-autopsy skill → analyze_video.py → Swipe File entry   (Step 4)
   ▼
workflows/viral_swipe_file.md  (entries + Pattern Index compound; gated)
```

## Hard rules (inherited + Ad Recon-specific)

1. **Brand-pinned search, never keyword.** `search_type=page&view_all_page_id=<id>`,
   not `q=<brand>`. Keyword search is contaminated (proven 2026-06-26: ~3,400
   fuzzy results incl. Sony/AbbVie vs ~2,400 pure IM8).
2. **Longevity shortlists candidates; it does not prove winning performance.**
   Date filters narrow discovery only. Rank elapsed days from a displayed
   start to the recorded observation; never fill or floor age using URL
   membership. Preserve operator-reviewed Page identity and complete, partial,
   blocked or unknown coverage. No profit, scaling or continuity inference
   follows from age or an impression range. Bare scraper output needs review.
3. **Ad Recon sources only.** No Swipe File writes, no preset/prompt proposals,
   no tuned-file edits. The ≥3-corroboration rule and Gated Proposals stay in
   `viral-autopsy`.
4. **No silent caps.** Report blocked/partial scrapes (login wall, captcha,
   timeout). Version 2 emits collection status and exclusions; exit 2 means blocked,
   exit 3 means no eligible candidates in this collection, not no advertising.

## Known-good reference (first live target)

- **IM8 Health** (Gary Brecka supplement, DTC/VSL) — `view_all_page_id =
  345914995276546`. Date-filtered genuine 30+ day winners (2026-06-26):
  the **"GLP-1 / Daily Essentials PRO"** benefit-list video (`1019504114362909`,
  ~38d) plus partner-page ads (*The Dodo*, *Health NewsExplained*). IM8's
  **authority/practitioner testimonial UGC** ("As a gastroenterologist…") is a
  strong format but was **autopsied (E6) and did NOT corroborate P9** — it's
  message-similar to a VSL but its edit-DNA is plain talking-head (new candidate
  **P10**), not the P9 kinetic grammar. **Lesson: P9 needs a genuine *kinetic*
  VSL, not just any long-running supplement ad.** See `viral_swipe_file.md`.

## Brand-selection guidance

Recon **DTC / direct-response** brands (the ad IS the sale): supplements,
skincare, gadgets, info-products. Avoid brand-awareness giants (Coca-Cola, Nike)
— their ads teach nothing about direct-response format. Prefer brands that are
DTC, run many long-running ads, and match a Grifon client's niche.

## Scrape fragility (Catch 2) — operating notes

The Ad Library is JS-rendered with anti-bot throttling (timeouts, `country=ALL`
flaky, occasional login walls — all observed live). Mitigations, in order:
1. Brand-pinned URL renders cleaner than keyword; use `country=US` not `ALL`.
2. Firecrawl stealth proxy, `waitFor ≥12s`.
3. If blocked, the agent scrapes via MCP/browser and feeds `--from-json`.
4. If it scales up or keeps breaking, graduate to a paid ad-spy API (Foreplay,
   AdSpy, AdMapix) — trades money for the fragility. WAT self-heal: keep all the
   brittle scrape logic in `tools/find_winning_ads.py` so one file absorbs DOM
   changes.

## Download (Step 3) — free, no login, no AdLibNote

The original "1B hybrid" plan was a one-click **AdLibNote** download. It turned
out to **paywall downloads behind a credit-card trial** (2026-06-26), so we
dropped it. The Ad Library is a *public* transparency tool — the ad video is an
`fbcdn.net` MP4 in the page — so we grab it ourselves for free, still with zero
login/credential handling:

1. Delegate to a **foreground `smoke-tester` subagent** (keeps the huge page
   snapshots out of the main context). It `browser_navigate`s the `ad_permalink`,
   clicks Play, then `browser_network_requests` to find the `fbcdn` `.mp4`
   request (progressive `sve_sd`/`sve_hd`; prefer HD).
2. `curl -L -A "<browser UA>" -o .tmp/ad-recon/<slug>.mp4 "<url>"`; verify size
   > ~200 KB (a few KB = error page → try the other variant). Proven this
   session: pulled a 1.5 MB / 38s IM8 MP4 with audio.
3. Bonus longevity signal: the video URL's decoded `efg` param carries
   `asset_age_days` (truer creative age than the displayed date). Parking a
   `find_winning_ads.py` enhancement to parse it.

If the video streams as DASH segments (no single `.mp4`) or a wall appears, fall
back to the viral-autopsy download ladder (snaptik-class resolver, screen-record
with audio).

## Follow-ups (parked, post-v1)

- **Static-image autopsy + headline/caption library** — FB Ad Library images are
  downloadable; analyze why an image ad wins. Pulls in `grifon-cmo` +
  `grifon-creative-director` to brainstorm.
- **Apply winning formats to Grifon's OWN marketing** — A/B test cross-industry
  winning formats that fit Grifon (a `grifon-cmo` consumer of swipe-file patterns).
- **Auto brand-resolution** (name → page-id) once an interactive Playwright path
  proves stable, removing the manual paste in Step 1.
