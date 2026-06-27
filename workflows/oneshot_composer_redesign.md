# One-Shot Ad — Higgsfield-style Composer Redesign

**Status:** Revive SHIPPED to `main` (`f2aebef`). This doc is the spec for the
**redesign** that sits on top. Reference: Higgsfield Marketing Studio (composer
pattern). Owner: Neil. CD spec authored 2026-06-23.

## Locked decisions (Neil, 2026-06-23)
- **Sequencing:** revive merged to main first ✅ → redesign on a fresh branch.
- **First pass = Phase 1 only:** composer layout + token system. Asset modals stay
  simple (single upload); format picker stays current. Phases 2–3 deferred.
- **Settings:** Aspect / Quality / Language / Voice live in ONE "Settings ▾"
  popover. **Voice gets a 3-sec ElevenLabs play-preview** (Grifon edge).
- **Layout:** Option A "composer bar" on `md+`, reflows to a vertical stack on
  mobile (same component). NOT a separate mobile component.
- **Palette:** keep Grifon Gold `#FFCC00`. REJECT Higgsfield's pink/magenta CTA
  (banned color).

## Hard contract (do not break)
- `LaunchScreen` must keep emitting the SAME `onLaunch(input: AutopilotInput)`
  ([services/oneShotIntake.ts](../services/oneShotIntake.ts)). The container
  ([components/OneShotAd/index.tsx](../components/OneShotAd/index.tsx)) and App
  wiring stay untouched — redesign is presentational only.
- No tuned edits (geminiService prompts/schemas/model IDs). scriptType selection only.

## TOKEN SYSTEM (define at top of file BEFORE layout — one source of truth)
- **CONTROL HEIGHT:** `h-11` (44px) on EVERY interactive control (pills, tiles,
  inputs, selects, CTA). Meets the 44px mobile tap-target floor. No exceptions.
- **Radius — 3 tiers:** control `rounded-xl` (12px) · panel `rounded-2xl` (16px) ·
  modal `rounded-3xl` (24px).
- **Spacing (4px base), only these gaps:** `gap-2` (8) tight · `gap-3` (12) default ·
  `gap-4` (16) group · `gap-6` (24) section.
- **Type:** display `text-4xl md:text-5xl font-black tracking-tight` · control
  `text-sm font-semibold` · value `text-xs font-mono` · label (meta only)
  `text-[10px] uppercase tracking-widest font-mono`. Interactive floor = `text-xs`.
- **Icon rhythm:** `w-4 h-4 + gap-2` normal · `w-5 h-5 + gap-3` bold/uppercase ·
  always `shrink-0` in flex.
- **In-app CTA radius = `rounded-xl`** (DESIGN.md), NOT the current `rounded-full`.

## LAYOUT — Phase 1 (Option A composer, responsive)
Desktop (`md+`): one `GlassPanel` (`max-w-4xl`, centered):
- Display headline (outcome-first; final copy via grifon-cmo — candidate
  "TURN ANY PRODUCT INTO A VIDEO AD", beats "ONE-SHOT AD").
- Composer: textarea "Describe your offer…" → maps to `offer` (+ default
  `productDescription`).
- Control row (all `h-11`, wrap on mobile): Vertical pill [Product/Service/Real
  Estate/App] · Format pill (▾) · Settings pill (▾ popover).
- Asset `+tiles`: PRODUCT, AVATAR. Each shows thumbnail + gold check when filled.
- GENERATE (gold, `rounded-xl`, `h-11`/`h-12`) with credit cost "✦ N → M scenes".

Mobile (375px): stack — headline → textarea → vertical (scroll-x, `h-11`) →
asset rows (`h-20`) → Format (`h-11` full-w) → Settings (`h-11` full-w) →
GENERATE sticky-bottom (`h-12`, full-w). No horizontal bar forced onto 375px.

Settings popover contents: Aspect (9:16/1:1/16:9) · Quality (720p / 1080p-Biz) ·
Language (Taglish/English; English-locked for Commercial) · Voice (Filipino
library first, then clones; **play-preview**; hidden for Commercial).

## Phase 2 (deferred) — context-aware asset modal, the headline feature
Per-vertical photo slots, each `+` → thumbnail, EACH WITH A REAL REFERENCE EXAMPLE
(brand-spec.md / Codex, not CSS mocks):
- Product → hero "product-in-hand" + up to 2 optional angles.
- Real Estate → `facade / living / kitchen / bedroom / bathroom`.
- Service → `exterior / interior / staff / before / after`.
**Wire to `BusinessInfo.servicePhotos` slot enum** (already exists in
[types.ts](../types.ts) line ~53) so it feeds the per-scene real-photo router the
Services/RealEstate ad styles were built for. This is the real unlock — not just UI.

## Phase 3 (deferred) — format sample picker
Tabs filtered BY vertical (no Real Estate/Service duplication across vertical AND
format). Product → {UGC[Testimonial/MrBeast], Product UGC[Temu], Commercial}.
Real Estate / Service → their own formula. Each strategy card gets a video sample
slot — **samples pending Neil's clips**; build the shell with empty slots now.

## Ideas / gaps captured
- Filled-state feedback on every +tile; GENERATE disabled with a precise reason.
- Generate fast-path: product photo + offer alone can generate (rest defaults).
- Credit cost transparency on GENERATE (cost → value mapping).
- Vertical drives Format options (reconcile the vertical-vs-format overlap).

## Phase 1 build checklist
1. Branch `feat/oneshot-composer` off main.
2. Token constants block at top of LaunchScreen.
3. Rebuild LaunchScreen as the responsive composer; keep `onLaunch` contract.
4. Settings popover subcomponent + voice play-preview (voiceService).
5. Verify: build-gate + tests + brand-check (separate critic) + smoke-tester
   (desktop + 375px). brand-check must clear the in-app bar (≥35/50, 0 critical).
6. Commit + push.
