# Workflow: Design Polish Backlog

**Objective:** Track design + brand polish work flagged during the 2026-05-07 marketing-surfaces audit session. Distinct from [launch_readiness.md](launch_readiness.md) — that's feature shipping; this is brand integrity.

This file is the durable handoff. The auto-memory at `~/.claude/projects/.../memory/` and the in-session todo list both die on cafe-PC reboot — only this repo persists.

---

## Status as of 2026-05-07

**Six commits shipped this session.** Marketing surfaces (landing, pricing, hero mockup, OG card) are now cinematic-coherent end-to-end. Body copy is brand-pure ("Grifon" not "Grifon AI"). Vertical gradient direction canonized across all 25 page-title surfaces. DESIGN.md amended with marketing-pills rule + demo-chrome shadow exception + `goldButtonGhost` variant + vertical gradient direction.

### Commits (newest → oldest)

| SHA | Title |
|---|---|
| `287aad1` | feat(brand): cinematic-coherence sweep — vertical gradient + Dashboard h1 + dead font purge |
| `04ceba9` | feat(og): purpose-built OG card replaces stretched-logo placeholder |
| `c451144` | copy(brand): drop "Grifon AI" from body copy — wordmark carries the AI cue |
| `9de1011` | feat(landing): show-don't-tell hero mockup, fix stacked-windows centering, social meta |
| `81c4bbd` | fix(pricing): purge purple/green/red, strip Oswald, cinematic gradient sweep |
| `a4522b5` | fix(landing): purge off-brand purple/yellow-500, add cinematic headline gradient |

### Three-zones framework (load this before any new design work)

After auditing 6 reference brands (Apple, OpenAI, ChatGPT, Anthropic, Claude, Grok, Genspark, Higgsfield), Neil greenlit the framework:

1. **Zone 1 — Marketing surfaces** (landing, pricing, sales, OG card): cinematic peak. Big gradient h1s, aurora, oversized type, pill CTAs. **Already shipped.**
2. **Zone 2 — Product chrome** (dashboard nav, sidebar, settings forms, wizard input steps): utility-first. Solid colors, no gradient h1s, no aurora, dense affordances, brand color reserved for active states + primary CTAs only. Reference: Genspark / ChatGPT / Linear.
3. **Zone 3 — Output reveal moments** (storyboard generated, ad rendered, research report output, final asset reveal): cinematic-coded. Gradient title on the reveal, gold ambient under the result, glass panels with backdrop blur. Reference: Higgsfield.

When any new module is built or audited, classify which zone it lives in first, then apply the matching register.

---

## Pending — your hands

### P0 · Cache-bust social platforms (2-min, browser-only)

Open these in 3 tabs, paste `https://app.grifon.ai/` into each, click the refresh/scrape button:
- **Facebook / Messenger / Viber:** https://developers.facebook.com/tools/debug/
- **Twitter / X:** https://cards-dev.twitter.com/validator
- **LinkedIn:** https://www.linkedin.com/post-inspector/

**Why:** Platforms cache OG previews aggressively. Until you nudge them, they keep serving the old logo preview from their CDN even though the new card is live at `app.grifon.ai/og-card.png`.

**Verification:** Paste the URL into your own Viber group. If the preview shows "Your entire ad agency, built into one app" with the gold price anchor, success.

---

## Pending — next agent session (when Neil greenlights)

### P1 · CDN Tailwind → PostCSS migration

**Status:** Production hygiene blocker before paid traffic.

**Why deferred:** Migrating off `cdn.tailwindcss.com` (which throws "should not be used in production" warning) requires `tailwind.config.js` + `postcss.config.js` + verification that styling didn't shift across the entire app, not just marketing surfaces. Every page in the app would need eyeballing.

**Scope:** ~30 lines added (config files), 1 line removed ([index.html:8](../index.html#L8) script tag), ~1-2 hours of regression testing across landing / pricing / dashboard / each module.

**How to resume:** `index.html` currently loads `cdn.tailwindcss.com` + has an inline `tailwind.config = {...}` block. The `index.css` file already has `@tailwind` directives waiting for PostCSS to process them. Add the configs, remove the CDN script + inline config, run the dev server, smoke each route.

### P1 · Module-by-module Zone 3 deep audit

**Status:** Only 3 of 11 modules deeply read in the audit session ([Step7FinalOutput.tsx](../components/Step7FinalOutput.tsx), [Step5Storyboard.tsx](../components/Step5Storyboard.tsx), [MarketResearch.tsx](../components/MarketResearch.tsx)). The other 8 received only the systemic gradient direction sweep + dead font cleanup, but their per-module **output reveal moments** weren't individually inspected.

**Why deferred:** Going module-by-module would have ballooned the session past 10+ commits. The systemic sweep delivered ~80% of the brand coherence value. The remaining 20% is per-module Zone 3 polish.

**Scope:** ~200 lines per module, 30-60 mins per audit + fix.

**Modules to audit (in priority order):**

1. [components/GenerateVideo.tsx](../components/GenerateVideo.tsx) — video output reveal is the most ambitious moment in the app. Currently has audio-level meter using `bg-[#10B981]` (Tailwind green-500) — verify if that's a brand violation or a deliberate signal-strength cue.
2. [components/EditVideo.tsx](../components/EditVideo.tsx) — video result panel + thumbnail grid. Check if generated-result panels have ambient gold glow.
3. [components/CinematicSpecStudio.tsx](../components/CinematicSpecStudio.tsx) — name implies cinematic, must deliver. Has a `bg-red-500` recording-state pulse — likely intentional but worth confirming.
4. [components/ImageAdsGen.tsx](../components/ImageAdsGen.tsx) — image generation output zone.
5. [components/CaptionHeadline.tsx](../components/CaptionHeadline.tsx) — output panel uses `bg-zinc-900/50` — check if Zone 2 (utility) or Zone 3 (output reveal).
6. [components/OfferOptimizer.tsx](../components/OfferOptimizer.tsx) — offer stack output is the "value pyramid" reveal.
7. [components/OrganicCalendar.tsx](../components/OrganicCalendar.tsx) — calendar output, likely Zone 2 utility.
8. [components/ImageEditor.tsx](../components/ImageEditor.tsx) — image edit output zone.
9. [components/InfluencerForge.tsx](../components/InfluencerForge.tsx) — 925 lines, biggest module, deserves its own session.
10. [components/SignalModulator/index.tsx](../components/SignalModulator/index.tsx) + 5 tile children — voice synthesis output reveal moments.
11. [components/IntelligenceUplink.tsx](../components/IntelligenceUplink.tsx) — flagged in gradient sweep, not yet visually verified.

Wizard steps to audit (8 items, [Step1ClientDetails.tsx](../components/Step1ClientDetails.tsx) → [Step7FinalOutput.tsx](../components/Step7FinalOutput.tsx)):
- Steps 1-4 are inputs (Zone 2 utility) — already correctly registered.
- Steps 5 (Storyboard), 6 (Thumbnail / VideoPrompts), 7 (FinalOutput) are output reveals (Zone 3) — Step 5 + 7 already deeply cinematic. Step 6 needs a closer look.

**How to resume:** Per module, read the file → identify the output reveal section (usually after a `generate*` async call) → apply Zone 3 treatments (gradient h2 on result section, gold ambient blur halo behind output, gold-bordered glass panel for "this is yours" emphasis, label-caps "// YOUR OUTPUT" type subhead). Don't add drama to inputs/forms — those stay Zone 2.

### P2 · Per-route OG card variant for `/pricing`

**Status:** Optional polish.

**Why deferred:** Default `/og-card.png` already covers all surfaces. A pricing-specific card would convert harder for prospects who specifically share the pricing URL.

**Scope:** 5-min add. Same template at [public/og-card.html](../public/og-card.html), different copy emphasizing the price anchor more aggressively. Add `og:image` override on the pricing route or via per-route meta tag injection.

**How to resume:** Copy [public/og-card.html](../public/og-card.html) → `public/og-card-pricing.html`, edit headline to lead with the ₱997 anchor + "All 5 modules. ₱30K agency replaced." Render to `public/og-card-pricing.png` via Playwright at 1200×630. Add route-aware `og:image` swap in [App.tsx](../App.tsx) routing logic or inject via a `<Helmet>`-style component.

### P2 · Legal pages cinematic polish

**Status:** Low traffic, low conversion impact, but cosmetic inconsistency.

**Why deferred:** Most users never see legal pages. Brand drift there only matters if someone DOES click and the page reads like an unstyled HTML dump.

**Scope:** ~30-50 lines per page across 4 pages. Wrap content in [GlassPanel](../components/ui/GlassPanel.tsx), add gradient h1, mono caps subhead, brand-coherent footer.

**How to resume:** [components/ui/LegalPageLayout.tsx](../components/ui/LegalPageLayout.tsx) is the wrapper. Apply gradient h1 + glass panel content body. The 4 pages: [Terms](../components/TermsOfService.tsx), [Privacy](../components/PrivacyPolicy.tsx), [Refund](../components/RefundPolicy.tsx), [Support](../components/Support.tsx). Also strip `Grifon.AI` → `Grifon` in body copy where it isn't legal-precision-required.

### P2 · Above-fold social proof on landing hero

**Status:** CMO-flagged conversion lift, not a brand defect.

**Why deferred:** Requires real numbers (current testimonial count, revenue claims). Don't fake it — that violates the "no fake social proof" hard constraint in CLAUDE.md.

**Scope:** ~10 lines added to [LandingPage.tsx](../components/LandingPage.tsx) hero section, just below the START FREE CTA.

**How to resume:** Add a single trust strip: `★★★★★  Trusted by [REAL_NUMBER]+ Filipino business owners`. Confirm the count with Neil first — pricing page currently says "100+" so that's the canonical claim until the number changes.

### P2 · Replace hollow content placeholders

**Status:** Content gap, not design system.

**Why deferred:** Need real generated assets to show.

Two specific spots:
1. **"MADE BY AI" carousel cards** ([LandingPage.tsx:165-200](../components/LandingPage.tsx)) — three cards have empty centers with generic lucide icons (Building2, UtensilsCrossed, ShoppingBag) instead of real 9:16 ad still frames from generated campaigns.
2. **"SEE IT IN ACTION" stacked windows** ([LandingPage.tsx:435-540](../components/LandingPage.tsx)) — three browser windows are empty chrome with just a play button. Should show actual Grifon module screenshots (Director AI wizard step, Market Research output, Image Studio result).

**Scope:** Content prep + ~5 lines per slot to swap icon for `<img>`.

**How to resume:** Generate 3 real 9:16 ad campaign stills + 3 real Grifon module screenshots. Drop into `/public/showcase/`. Replace the lucide icon `<Icon className="..." />` lines with `<img src="/showcase/condo-ad.jpg" alt="..." />`.

### P2 · Proper Grifon favicon stack

**Status:** Cosmetic.

**Why deferred:** Current `/logo.svg` works as a fallback favicon. Multi-size .ico + apple-touch-icon would be more polished but isn't visible to anyone except the user looking at their own bookmark bar.

**Scope:** Generate the icon stack (favicon-16, favicon-32, apple-touch-icon-180, etc.) from the existing logo, drop into `/public/`, update `<link>` tags in [index.html](../index.html).

---

## Resume protocol for next agent session

When Neil opens a new session and points you here:

1. **Read this file first.** Note which P0/P1/P2 items are still pending vs completed (Neil will have updated the checklist or asked you to).
2. **Re-read [DESIGN.md](../DESIGN.md)** — it has the canonized rules (vertical gradient, marketing pills, demo-chrome shadow exception, `goldButtonGhost`) that came out of this session.
3. **Re-load the three-zones framework** (above) — applies to every new design call.
4. **If the task is module-by-module audit:** start with the priority-1 module from the list, follow the per-module audit pattern (read → identify output reveal → apply Zone 3 treatments → leave Zone 2 chrome alone).
5. **If the task is something else:** match it to the framework. Marketing surface? Zone 1 peak. Form/dashboard chrome? Zone 2 utility. Output reveal? Zone 3 cinema.
6. **Saved feedback memories** (in ephemeral `~/.claude/.../memory/` so re-establish if missing): `feedback_explicit_deferral.md` (name deferred options with reasons), `feedback_surprise_me_greenlight.md` (when Neil says "surprise me," do CD-confident sweep, not minimum compliance).

---

## Things explicitly NOT in this backlog (out of scope, by design)

- **Half-built modules** (the modules not on the working-modules list per CLAUDE.md hard constraint). These don't ship to landing/pricing/ads, so brand polish on them is wasted effort until they're production-ready.
- **`services/geminiService.ts` styling work** — that file is tuned, not a UI surface, no design polish applies.
- **Auth-gated screens we couldn't smoke-test** — the dashboard renders fine in code review but visual confirmation requires a Supabase login. Deferred to a session where Neil is logged in.
