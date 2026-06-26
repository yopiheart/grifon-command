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
Neil one-click AdLibNote download   (Step 3 — agent handles no login)
   ▼
viral-autopsy skill → analyze_video.py → Swipe File entry   (Step 4)
   ▼
workflows/viral_swipe_file.md  (entries + Pattern Index compound; gated)
```

## Hard rules (inherited + Ad Recon-specific)

1. **Brand-pinned search, never keyword.** `search_type=page&view_all_page_id=<id>`,
   not `q=<brand>`. Keyword search is contaminated (proven 2026-06-26: ~3,400
   fuzzy results incl. Sony/AbbVie vs ~2,400 pure IM8).
2. **"Winning" = longevity.** Rank by `days_active` (≥30d winner, ≥60–90d
   scaled). Impressions is the Ad Library's only sort, so the pinned URL sorts by
   `total_impressions` as a *candidate* surface; the tool then re-ranks by days.
3. **Ad Recon sources only.** No Swipe File writes, no preset/prompt proposals,
   no tuned-file edits. The ≥3-corroboration rule and Gated Proposals stay in
   `viral-autopsy`.
4. **No silent caps.** Report blocked/partial scrapes (login wall, captcha,
   timeout). The tool emits `page_state` + stats and exits 3 on no-winners.

## Known-good reference (first live target)

- **IM8 Health** (Gary Brecka supplement, DTC/VSL) — `view_all_page_id =
  345914995276546`, ~2,400 active ads. Winning format visible from copy alone:
  **authority/practitioner testimonial UGC** ("As a gastroenterologist…", "20
  years in sports medicine, I'm skeptical…"). This is the candidate **3rd VSL
  long-runner** that could push Pattern **P9** (`vsl` preset) over ≥3
  corroborations → unlock its Gated Proposal. See `viral_swipe_file.md`.

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

## Follow-ups (parked, post-v1)

- **Static-image autopsy + headline/caption library** — FB Ad Library images are
  downloadable; analyze why an image ad wins. Pulls in `grifon-cmo` +
  `grifon-creative-director` to brainstorm.
- **Apply winning formats to Grifon's OWN marketing** — A/B test cross-industry
  winning formats that fit Grifon (a `grifon-cmo` consumer of swipe-file patterns).
- **Auto brand-resolution** (name → page-id) once an interactive Playwright path
  proves stable, removing the manual paste in Step 1.
