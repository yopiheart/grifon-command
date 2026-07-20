# Apple-Pattern Pass (apple.com/os → Grifon marketing surfaces)

**Origin:** Neil's Liquid Glass / apple.com/os evaluation request, 2026-07-20. Verdict: adopt the
*doctrine + page patterns* (scroll-snap galleries, localnav sticky segmented control, scroll-edge
chrome, card grammar) — do NOT chase the Liquid Glass material simulation (GPU-hostile on the
low-end-Android PH audience, brand-dilutive, and web can't do real lensing).

## RESUME STATE 2026-07-21 (madaling araw) — PASS 1 SHIPPED TO PROD

Merged to `main` and deployed (grifon.ai, Vercel READY):

- **PR #62** (pre-existing last-dance branch) — landing conversion pass + login gateway polish.
- **PR #65 — Apple-pattern pass 1:**
  - NEW `components/landing/SnapRail.tsx` — reusable snap rail: next-card peek, paddle arrows
    (end-disable, pending-target-index chaining for rapid taps, released on 150ms scroll-quiet,
    cleared on pointerdown/wheel), mobile edge fade, reduced-motion-safe. **Adoption candidates:
    ProofGallery + the pricing card rail** — fold in when next touching those.
  - `Modules.tsx` — 4 secondary module cards = swipe rail on mobile (85vw, equal heights via flex
    stretch — do NOT re-add `h-full` to the cards, it kills stretch), ghost CTAs pinned `mt-auto`;
    md+ grid unchanged; Director AI ViewfinderFrame untouched.
  - `SegButton.tsx` — `variant="marketing"`: rounded-full pills, sliding gold thumb
    (`layoutId` + `SPRING.snappy`), `aria-pressed`. Wizard path byte-identical.
  - `GrifonPricingPage.tsx` — billing toggle on the marketing SegButton in a sticky bar
    (ResizeObserver-measured header offset). **Root `overflowX: hidden → clip`** — fixed a
    pre-existing bug where the root scroll-container silently killed every sticky descendant
    on /pricing. Never revert to `hidden` there.
  - `SiteHeader.tsx` — scroll-edge: transparent at rest, frosted once scrolled (rAF, lazy init).
- **PR #66** — billing bar frosts ONLY while pinned (at rest the tint read as a stray dark band —
  Neil's prod report). Scroll-edge doctrine: treatment exists only when content is beneath the bar.

Process record: fresh-context review per `pr_review_loop.md` ran on #65 (no Critical/Major; 5
minors fixed). 6 smoke rounds total, final at Neil's 1365×800 + 375×812.

## NEXT SESSION — Move 2: real ad video loops in the module cards

The approved ranked list's remaining big move (Apple's core lesson: premium feel = real footage in
cards, not CSS keyframes). Replace/augment `InclusionDemos` CSS animations with real Grifon-rendered
ad clips, done Apple's way:

- Muted `playsinline` MP4 loops, IntersectionObserver-gated (no offscreen load), poster frame,
  keep the existing CSS demo as the reduced-motion / slow-connection fallback.
- Art-directed sizes per breakpoint; PH mobile-data budget is the constraint.
- **BLOCKED ON NEIL: pick the rendered ad clips** (one per module: Director AI, Market Research,
  Offer Optimizer, Caption & Headline, Image Studio — Director's matters most). WS2 client UGC
  videos on R2 (see ProofGallery comment) may overlap — check before generating new ones.

Smaller parked follow-ups, in rough order:
1. SnapRail adoption for ProofGallery + pricing card rail (consistency + paddles everywhere).
2. Move 6 (opportunistic): overlays materialize via blur+opacity on `EASE.veil` (modals,
   CommandPalette) — do alongside other work, not standalone.
3. `npm run design:lint` is BROKEN on clean main (design.md CLI exits 1, zero output) — tooling
   fix; it silently no-ops the brand gate.
4. Pre-existing Framer Motion console warning ("non-static position … scroll offset") on landing +
   pricing — harmless but noisy; root-cause when nearby.
5. Pricing page inline-`style={{}}` Tailwind-ization — known debt, explicitly out of scope so far.
