# Landing "Last Dance" — Reference-Site Teardown + Upgrade Spec (2026-07-16)

Neil's directive: final improvement pass on the marketing landing page, reverse-engineered
from 4 reference sites, Fable 5 × GPT 5.6 Sol collab, full autonomy granted ("AMAZE ME").

## 1. Reference-site teardown (live Playwright recon, desktop 1440×900)

| Site | Key computed values | Most stealable idea |
|---|---|---|
| **vertus.ai/superintelligence** | H1 48px/500/−1.44px on pure black; fixed transparent 52px nav; white full-pill CTA (r=500px); CTA pair repeated every section | ONE full-bleed gradient panel placed immediately before the final CTA as the page's single color climax |
| **chatcut.io** | H1 82.5px/400/−2.475px, line-height < font-size; sticky 64px nav; dark squircle CTA (r=9px); section padding alternates 112px ↔ 48px; light theme, one orange accent chip | Hero IS a live product demo; every feature section ends in a task-specific CTA that deep-links into the app with the demoed prompt pre-filled (`?prompt=…`) |
| **github.com** (logged out) | H1 64px/425 (variable font)/−2.24px on `#0d1117`; absolute 72px nav; green primary + **frosted-glass ghost secondary** (`rgba(31,35,40,.4)` + light-blue text); glow front-loaded behind hero only | The primary/secondary CTA pairing: solid brand color vs translucent glass ghost |
| **apple.com/apple-tv** | Pure black; thin 44px absolute nav that scrolls away; autoplay video hero; 64px/700 tagline with line-height == font-size; 9533px page, 5 sticky elements; CTA-light | Full-bleed chrome-free content carousel — output art edge-to-edge, no cards/frames/shadows |

Cross-site rules extracted: hero 64–80px with −0.02/−0.03em tracking (we already comply);
one saturated accent used sparingly (we comply); glow energy front-loaded hero + one climax
(we have hero Aurora, no climax); big/small section rhythm (we're near-uniform); FAQ + structured
footer closers (we comply); primary+ghost CTA pairs (we have single CTA); task-specific CTAs
(we have none). Screenshots archived in session scratchpad (ephemeral); computed values above
are the durable record.

## 2. Sol collab verdict (GPT 5.6, read-only brainstorm, 2026-07-16)

Ranked ship list = friction microcopy > decision-based spacing > intent-preserving module CTAs >
hero-phone category selector > demoted ghost secondary > (defer) offer halo. **CUT the Vertus-style
ticker** — even honest rotating feeds pattern-match to fabricated live activity, and the page
already carries two marquees. Spacing should be *decision-based* (expand proof/offer/FAQ, compress
connective sections), not mechanical alternation.

## 3. Final ship list (Fable × Sol synthesis)

1. **Unified friction-killer microcopy** — one identical reassurance line at all three signup
   touchpoints (Hero, PinnedCtaPill, OfferStack): `Free plan · No card required · Upgrade anytime`.
   All three claims are literally true (Free ₱0 tier exists; no card at signup; self-serve upgrade).
2. **Decision-based spacing rhythm** — compress connective sections (StackReplace, RoiMetrics,
   marquee paddings), keep/expand high-consideration sections (ProofGallery, OfferStack, TrustFaq).
3. **Task-specific module CTAs** — each of the 4 module cards in "WHAT YOU GET" gets a non-gold
   ghost/text CTA ("Research my market →" etc.) that stores module intent (popIntendedPlan-style)
   and routes through signup; App.tsx applies the intent post-auth. One gold CTA per fold preserved.
4. **Hero phone → category selector** — the 3 existing CSS ad frames (Real Estate / F&B /
   E-Commerce) become tappable chips; tap jumps the phone to that vertical and pauses autoplay.
   ChatCut's "hero is the demo" advantage without building an editor.
5. **Demoted ghost secondary in hero** — small frosted text-pill "SEE A COMPLETE CAMPAIGN ↓"
   anchoring to #reviews (ReceiptsRail), GitHub glass-ghost treatment, visually subordinate.
6. **OfferStack static gold halo** — restrained, *static* radial glow behind the offer panel
   (the page's one mid-body color climax, Vertus pattern), reduced on mobile. Flagged for
   screenshot review — cut if it muddies gold-as-action-signal.

**Cut:** live-output ticker (deceptive-pattern adjacency + motion overload). **Deferred:**
unframed Hiraya output rail merged into ProofGallery — blocked on (a) Neil eyeball-grading the
`tests/fixtures/sample-batch-v2/` set and (b) webp compression (currently 2.3 MB/PNG). Resume
trigger: Neil grades the v2 set → compress to ≤200 KB webp in `public/samples/` → edge-to-edge
swipe strip inside ProofGallery with factual labels ("Grifon sample · F&B · script+video+captions").

## 4. Guardrails carried into the build

One gold CTA per fold; one cream band per page; serif accents as spans (heading LAW);
motion via DUR/EASE tokens only, all reduced-motion gated; no GENERATE/ANALYZE/INITIATE in
CTA copy (GoldButton toast matcher); Tailwind is CDN + inline config — dynamic class names
must be full literals; no new deps; no fabricated social proof.

## 5. Login recon addendum (2026-07-16, same session)

Neil asked what the reference sites teach us about the login screen. Live recon of
github.com/login (+signup — Cloudflare-blocked), ChatCut's auth, account.apple.com/sign-in,
Vertus's "Join Now" (turns out to be a lead-gen modal, not real auth), vs our `/login`.

**Verdict: our passwordless OTP gateway already matches or beats all four references.**
We share ChatCut's passwordless two-step pattern but add reassurance chips + value-reminder
heading; GitHub still leads with a password form; Apple's trust paragraph is heavier than our
chips; Vertus has no real auth. Grifon had the boldest, clearest primary CTA of the set.

**Gaps worth taking (not yet implemented — Neil to greenlight):**
1. **Validation UX — the one real weakness.** Typing an invalid email and blurring produces
   nothing (no inline error, no gating); errors only at submit. Apple pattern: primary button
   `disabled` until the field is plausibly valid + on-blur format check. Small App.tsx change.
2. **OTP auto-verify** — auto-submit when the 6th digit lands (input already strips non-digits,
   `autoComplete="one-time-code"`). Cuts one tap from every login forever. Mind the
   agent_lessons 2026-06-30 OTP-length coupling (6 digits hardcoded ~5 places + Supabase dashboard).
3. **Opt-in box visual weight** — the gold-bordered Members-only-deals card is the heaviest
   element between field and CTA; references keep that path empty. Can demote container styling
   (thinner border/smaller) WITHOUT touching the consent mechanics — must stay unchecked,
   affirmative, informed, Privacy-linked (consent_capture_plan.md constraints).
4. **GitHub OAuth button audience fit** — dev-tool convention; our audience is SMB owners.
   Consider flagging it off (`OAUTH_PROVIDERS`) → one decision fewer (Google + email covers PH).
5. Already-queued carry-forwards unchanged: OAuth avatar/display-name on dashboard header;
   passkey upsell (deferred on OAuth telemetry — GitHub ships "Sign in with a passkey" today).

Constraints any login change must respect: marketing opt-in stash-and-reconcile for OAuth
(`grifon_oauth_marketing_opt_in`), `?plan=` intent resume, module-intent deep-link, and the
federated-OAuth-neutral-surface + no-hand-transcribed-brand-SVG rules (agent_lessons 460-466).

## 6. Status

- Branch: `feat/landing-last-dance`
- Build: delegated to `code-executor` (Opus 4.8) — UI-heavy lane per codex-executor trial rules;
  Sol contributed strategy only (logged in `workflows/codex_executor_trial.md` scope: brainstorm,
  no diff).
- Verification: build gate + vitest + smoke-tester screenshot pass (desktop 1440 + mobile 390).
