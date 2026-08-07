# Handoff — 2026-06-11: Full-funnel kinetic redesign (landonorris.com-inspired)

**Branch:** `claude/landing-page-redesign-g7zaca` (14 commits, all pushed). NOT yet merged to `main` — Neil verifies on PC first, then open the PR.

## What shipped (one visual language, entrance → daily habit)

1. **Landing page** — full rebuild: kinetic ad-montage hero (phone cycling 3 CSS-built ads), Instrument Serif gold accent words, 2 infinite marquees, SignatureScribble system (underline/circle/strike), ONE cream proof band `#F2F1EA`, scattered proof gallery w/ next-card peek (OLED fix), pinned START FREE pill w/ hide-zones, squiggle scroll-spy nav. Old "See It In Action" section cut. Graded 90/100 vs old 66/100; brand-check re-check: BRAND_PASS_WITH_NITS 44/50, 0 critical.
2. **Pricing page** — surgical kinetic pass (serif accents, scribble strikes on value stack + ₱170K, marquee, 76vw card peek). Checkout logic untouched.
3. **Auth gateway** — outcome-first ("YOUR FIRST AD IS *30 minutes* AWAY."), default tab = sign_up (renamed START_FREE), benefit checks, stars-above trust row, fits ONE phone screen (compact-mode <700px height). GitHub OAuth ADDED + **configured live in Supabase** (verified end-to-end). Apple wired but OFF (`config/authProviders.ts` — needs $99/yr Apple dev account). Wordmark: `.AI` suffix dropped everywhere (header/footer/legal).
4. **Route veil** — gold-scanline page transition on marketing route changes (pricing/legal), `components/ui/RouteVeil.tsx`. Not on anchors or app-entry (boot sequence covers that).
5. **Checkout** — secure masthead, dot-grid backdrop, serif "— monthly", scribble-circled ₱/day line, receipt-stub total + "no auto-renew" line, GCash/Maya/Visa/MC trust strip. Payment logic untouched.
6. **Billing success** — "Founding Creator" ceremony: shareable card (real plan/email/date, "1 of 200" from FOUNDING_OFFER, no fake member #s), pointer tilt, SHARE MY CARD via html2canvas → native share, "Ikaw na ang studio." line, CREATE MY FIRST AD activation CTA.
7. **Dashboard** — time-aware greeting w/ scribbled first name, momentum line (real quota data, "Tuloy lang"), rotating outcome placeholders in omnibox. Older models' machinery (palette, drafts, flow strip) intentionally kept.

## Design-system changes (DESIGN.md amended, design:lint green)
- `serif-accent` token (Instrument Serif italic 400) — marketing surfaces + pre-auth gateway only, 1–2 words/headline, NEVER in-app type (dashboard greeting uses only the scribble stroke, not serif).
- `proof-band #F2F1EA` + marketing light-band exception (max ONE per page; `#B28F00` for accent text on band).
- Heading LAW (index.html h1–h6 !important): serif accents MUST be `<span className="font-serif italic normal-case tracking-normal">`.

## Tomorrow's PC verification checklist
- Vercel preview = newest deployment of the branch in dashboard (grifon-command project).
- Feel: hero scribble + montage, marquees, cream band snap, pinned pill hide-zones (offer stack/FAQ/footer), route veil on Pricing↔Home/legal, gateway one-screen, GitHub login (live), checkout look, success-page card SHARE button (test native share on phone!), dashboard greeting.
- Then: open PR `claude/landing-page-redesign-g7zaca` → `main`.

## Gotchas for future sessions
- Tailwind runs via CDN + inline config in index.html (no tailwind.config.js). Sandbox captures need locally-generated CSS injection (cdn.tailwindcss.com is often blocked in cloud sandboxes; headless screenshots of infinite animations need `animations: 'disabled'` or they render unpainted white layers).
- GoldButton keyword-matches button text for toasts (avoid GENERATE/ANALYZE/INITIATE etc. in marketing CTAs).
- `OAUTH_PROVIDERS` in config/authProviders.ts is the per-provider kill switch; visible providers must be enabled in Supabase Dashboard → Auth → Providers.
