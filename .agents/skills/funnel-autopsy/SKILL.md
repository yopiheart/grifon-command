---
name: funnel-autopsy
description: Run an evidence-bound teardown of a LIVE lead-gen funnel (section walk, verbatim copy, form anatomy, post-opt-in map via dummy-data walk, ad→LP mapping) and append it to the Funnel Swipe File. Use when Neil drops a landing-page/funnel URL and wants it decoded, asks "why does this page convert" or "what can we steal from this funnel", says "funnel autopsy" or "add to the funnel swipe file". NOT for static image ads (static-autopsy), video (viral-autopsy), scraping a competitor's FB page (ad-recon), or building our own funnel (funnel-forge).
disable-model-invocation: true
---

For Codex tool execution, read [the desktop adapter](../_shared/codex-runtime.md) before following the workflow below.

# Funnel Autopsy

Decode a live direct-response funnel into an evidence-bound entry in
[workflows/funnel_swipe_file.md](../../../workflows/funnel_swipe_file.md).
Output IDs: **F<NN>** entries, **L<N>** patterns, **FGP-N** gated proposals.
Screenshots: `assets/funnel-swipe/F<NN>/` (compressed, committed).

## Guardrails (non-negotiable)

1. **Never edit TUNED files** (`services/geminiService.ts` prompts, `api/_lib/prompts.ts`) and never self-apply findings to `funnels/_template/`. Findings become **FGP Gated Proposals** addressed to Neil.
2. **≥3-corroboration gate.** A pattern moves `observed → proposed` only with ≥3 corroborating entries, independent brands strongly preferred (3 across 3 operators beats 5 from one). One funnel is an anecdote.
3. **AI reads are hypotheses.** WebFetch text passes carry `confidence`; every structural claim must be eyeball-verified against the smoke-tester screenshots before the entry is written. Never write an entry from text extraction alone.
4. **The trust line.** Steal the *structure* and the *lever*, never the lie. Fake stock counters, evergreen countdowns, unverifiable claims → record in `trust_flags`, mark do-not-replicate.
5. **Specificity validator.** An entry must contain: verbatim headline quotes per section, real form field names + required flags, an exact CTA census (count + variants), and verbatim consent/disclaimer language. If you can't produce those, the read is GENERIC_OUTPUT — STOP, re-capture, don't write a fluffy entry.
6. **Playwright NEVER in the main loop.** All browsing/screenshots/funnel walks go through the `smoke-tester` subagent (foreground).
7. **Checkpoint reviewed entries** with the completed task: `swipe(funnel): add F<NN> <brand>`.

## Procedure

**Step 0 — Read the swipe file end to end** (Pattern Index, open FGPs, RESUME block). Corroborate, don't rediscover. **Dedupe by URL**: a known funnel gets its existing entry updated (dated re-walk note), no new F-number, no Pattern bump.

**Step 1 — Collect from Neil:** URL(s), operator/brand, niche, and **why swiped** (the outlier rationale). If he just dropped a URL, ask for the why.

**Step 2 — Text pass (hypothesis).** WebFetch the page → draft SECTION WALK + verbatim copy capture, tagged with confidence. Cloudflare-blocked? Skip to Step 3 and build the walk from DOM snapshots instead.

**Step 3 — Ground truth via smoke-tester (foreground).** Brief it to: full-page screenshot at **390×844** and **1440×900** → `assets/funnel-swipe/F<NN>/{mobile,desktop}.png`; capture form field names/types/required flags + consent text verbatim; then the **funnel walk** — submit the recon identity (name "Grifon Recon", email `neilmaglaya.business22+recon@gmail.com`, PH-format dummy phone if required) and screenshot every post-opt-in page (`post-optin-1.png`, …), noting order bumps, upsells, calendars, VSLs, and each page's URL. Compress screenshots to ≤ ~400KB each before committing.

**Step 4 — Ad→LP mapping.** Run `ads_library_search` (Meta Ads MCP) on the operator's page; record which ad hooks point at this LP vs sibling LPs — the "different ads → different landing pages" doctrine. If the MCP is unavailable, write "not run — <why>".

**Step 5 — Verify then write.** Cross-check every Step-2 claim against the screenshots (guardrail 5). Append the entry **newest-first** using the template at the bottom of the swipe file. Bump the Pattern Index: corroborations enumerated by F-ID, new candidates at count 1, **contradictions noted loudly**. Update the RESUME block ("Next F-number = …").

**Step 6 — Commit** (guardrail 7).

**Step 7 — Remix on demand only.** If Neil wants it applied: draft the FGP (CMO angle via `grifon-cmo` + CD recipe via `grifon-creative-director`, both citing F-/L-IDs) and stop there — Neil approves FGPs.

## Out of scope / wrong tool

Static image ads → `static-autopsy`. Video ads → `viral-autopsy`. Competitor FB-page discovery → `ad-recon`. Grading our own pages → `brand-check`. Building a funnel → `funnel-forge`.
