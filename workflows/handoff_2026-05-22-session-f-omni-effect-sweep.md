# Handoff — 2026-05-22 — Session F (Omni Hook-Effect Sweep — Scope β Validation)

> **Status:** SHIPPED — superseded by Session G
> ([handoff_2026-05-22-session-g-dead-first-second.md](handoff_2026-05-22-session-g-dead-first-second.md)).
> Predecessor:
> [handoff_2026-05-19-session-e-shipped-session-f-pending.md](handoff_2026-05-19-session-e-shipped-session-f-pending.md).
> Mirrors the approved plan at
> `C:\Users\Administrator\.claude\plans\read-in-order-workflows-handoff-2026-05-unified-emerson.md`
> (defreezer-disposable — this workflow file is the durable copy).

---

## Context

Session E (commits `31d65f4` + `4a82d99`) shipped the hook video-prompt audit and
Gate-2-validated it on **exactly one** effect — Character Morph. The storyboard
generator's VIRAL VFX MENU ([api/_lib/prompts.ts:773-780](../api/_lib/prompts.ts)) can pick
5 other effects per Scene 1; `generateVideoPrompts` Option A-Hook
([services/geminiService.ts:1673-1680](../services/geminiService.ts)) has prose for them but
**zero live-render proof**. Session F renders each of the 5 untested effects on Kling Omni
against one fixed substrate and grades them on **per-effect rubrics** — then surgically fixes
or documents whatever fails.

**Intended outcome:** know empirically whether each effect renders well on Omni; fix WEAK/
render-FAIL effects with a TUNED Option A-Hook clause (per-edit Neil approval) or document
them; produce an effect↔product-fit map; leave substrate + findings durable in the repo.

## Decisions locked in the grill

| # | Decision | Choice |
|---|---|---|
| 1 | Session identity | Session F as documented — empirical Scope β validation |
| 2 | Pass criterion | Per-effect rubric — each effect graded on its own terms, NOT a morph-only ruler |
| 3 | Invisible Effect | Gate 1 text-diff first; render only if prose coherent, else document + skip |
| 4 | Test substrate | Regenerate beans/latte pair + commit it (done — `825205d`) |
| 5 | Render path | Controlled disposable script → `/api/kling/omni-video` |
| 6 | Kling budget | $2.00 hard cap (~$1.25 sweep + ~$0.75 gated re-render headroom) |
| 7 | RENDER-FAIL handling | Document + defensive down-convert clause in Option A-Hook |
| — | PRODUCT-FIT-FAIL handling | Document only — no down-convert (storyboard generator's job, crown-jewel) |

## Test substrate

Committed `825205d` under [assets/session-f/](assets/session-f/) — see
[substrate.md](assets/session-f/substrate.md). One fixed pair: `substrate-start-beans.jpg`
(Omni `first_frame`) → `substrate-end-latte.jpg` (`end_frame`). The only variable across all
renders is the `transitionEffect`.

---

## LOCKED per-effect rubrics

Grounded by a `grifon-cmo` creator-playbook pass (2026-05-22). **Locked before any Kling
spend** — the verdict cannot be retrofitted to the render. Frames are extracted at the
baseline grid t=0 / 2.5 / 4.9s, but the verdict uses **effect-appropriate logic** (a Snap Cut
has no t=2.5 "bridge").

### 1. Object Materialization — *Option A-Hook clause exists*
- **Render quality:** t=0 amorphous/particulate start (bean field); t=2.5 the cup/latte
  visibly coalescing — recognizable, mid-build, NOT yet complete; t=4.9 fully resolved latte,
  sharp, identity-correct.
- **PASS:** legible build — the product is seen forming, recognizable mid-build, lands clean.
  **WEAK:** jumps start→end with little visible middle (reads as a fade), or target slightly
  malformed. **FAIL:** vague fog → abrupt product (no legible build), or crossfade / camera-
  move only.
- **Product-fit:** broad. Best for craft/artisan/premium (specialty coffee, skincare, baked
  goods, handmade). Weak energy — not wrong — for flash-sale/urgency hooks.

### 2. Teleport / Snap Cut — *Option A-Hook clause exists*
- **Render quality:** both states razor-sharp; the cut lands fast (<~1s); no morph/melt
  creeping in. **The t=2.5 "bridge" logic does NOT apply** — by t=2.5 the cut should already
  have landed. Key question: did a crisp instant cut occur, and are both states sharp.
- **PASS:** crisp instant cut, both states sharp, no ghosting/morph-mush. **WEAK:** brief
  melt/blur on the cut, or framing drifts. **FAIL:** Omni interpolates a morph anyway (no
  snap), or a state is unstable/soft.
- **Product-fit:** universal, tonally neutral. Strongest for before/after categories —
  skincare, fitness, cleaning/laundry, home repair, makeovers. Bryan's most reusable effect.

### 3. Explosion Reveal — *Option A-Hook clause exists*
- **Render quality:** t=0 start (beans) intact; t=2.5 start material fragmenting/flying
  OUTWARD, end subject beginning to emerge; t=4.9 end subject revealed clean and undamaged,
  debris cleared.
- **PASS:** real kinetic force, material flies outward, product emerges clean & undamaged,
  debris clears. **WEAK:** dispersion weak/slow (soft puff, no force), or end subject muddy /
  partly obscured. **FAIL:** crossfade with no burst, OR debris dirties/damages/obscures the
  end subject.
- **Product-fit:** high-energy impulse — snacks, energy drinks, streetwear, gadgets, toys,
  gaming/youth fashion. **CLASHES HARD** with trust/calm/premium — insurance, finance, real
  estate, clinics, law, funeral. Tonal mismatch here is a conversion killer.

### 4. Chaos Burst — *shares the Explosion clause in Option A-Hook*
- **Render quality:** t=0 start; t=2.5 chaotic multidirectional energy peak; t=4.9 end
  subject resolved clean.
- **PASS:** high-energy *controlled* chaos that STILL resolves to a clean, recognizable
  product — reads "exciting." **WEAK:** chaotic but never fully resolves, or energy reads as
  noise/artifact rather than intent. **FAIL:** unrecognizable mush; end subject lost.
- **Product-fit:** NARROWEST — gaming, energy drinks, youth streetwear, entertainment/events,
  hype merch only. Clashes with ~80% of Bryan's roster (food = unappetizing, skincare =
  harsh, services, premium, trust). **#1 product-fit risk of the five.**

### 5. Invisible Effect — *NO Option A-Hook clause; Gate 1 first*
- **Render quality:** TBD — Gate 1 decides whether it renders at all. IF rendered: **PASS** =
  a genuinely hidden cut (an element wipes the frame, new scene behind it); **WEAK** = the
  "mask" is obvious / the seam shows; **FAIL** = no coherent interpretation — degrades to a
  morph, a crossfade, or static.
- **Mechanical risk flag:** a masked cut needs a hidden third wipe-element; a two-frame
  start→end API has nothing to model that with. The risk is **capability, not tonal fit.**
- **Product-fit:** lifestyle/UGC/relatable — fashion, food prep, daily-vlog, services-in-
  context. No hard tonal clash.

## Effect ↔ product-fit map

Tonal-safety ranking (safest → riskiest): **Snap Cut → Object Materialization → Invisible
Effect → Explosion Reveal → Chaos Burst.**

| Effect | Suits | Clashes (tonal) | Flag |
|---|---|---|---|
| Object Materialization | craft/artisan/premium; gadgets | — | weak energy for urgency hooks |
| Teleport / Snap Cut | universal; esp. before/after | — | safest of the five |
| Explosion Reveal | snacks, energy drinks, streetwear, gadgets, toys | insurance, finance, real estate, clinics, law, funeral | high-energy gate needed |
| Chaos Burst | gaming, energy drinks, youth streetwear, events | food, skincare, services, premium, trust (~80% of roster) | **#1 product-fit risk** |
| Invisible Effect | fashion, food prep, UGC/lifestyle, services-in-context | — | capability risk on 2-frame API |

**Crown-jewel finding (flagged, not fixed):** the VIRAL VFX MENU
([api/_lib/prompts.ts:773-780](../api/_lib/prompts.ts)) says "Select the BEST VFX style" with
**zero product-category guardrail**. A future crown-jewel session should gate high-energy
effects (Explosion, Chaos) to impulse/youth/entertainment categories only. Session F documents
this; it does not edit the menu.

---

## Results

### Gate 2 verdicts (live Omni renders, beans→latte substrate, std/5s/9:16)

| Effect | Verdict | Evidence |
|---|---|---|
| **Object Materialization** | ✅ PASS | Legible build — cup rim forms ~t1.2s, beans→foam mid-build ~t1.7s, clean latte ~t2.5s |
| **Explosion Reveal** | ✅ PASS | Genuine kinetic dispersion — bean mass breaks + flies outward ~t1.2s, cup emerges clean |
| **Chaos Burst** | 🔶 WEAK | Rendered as a plain gradual materialization — zero chaotic/burst energy |
| **Teleport / Snap Cut** | ❌ FAIL | Omni interpolated a gradual morph — no instant cut. Two-frame interpolation cannot "snap." |
| **Invisible Effect** | ❌ FAIL (Gate 1) | No clause, no two-frame interpretation — Flash degraded it to morph prose. Not rendered. |

Gate-2 frame strips committed under [assets/session-f/](assets/session-f/) (`gate2-*.jpeg`).

### Two cross-cutting findings

1. **Omni's two-frame surface delivers exactly one motion: a gradual anchor-bridged
   transformation.** 3 of 5 effects (Snap Cut, Chaos Burst, Invisible) collapse toward "morph"
   because that is the engine's nature — only Explosion Reveal added a genuinely distinct
   visual. **The validated-on-Omni effect set is: Character Morph, Object Materialization,
   Explosion Reveal.** The other three are menu entries the engine cannot honor literally.
2. **Dead first ~1 second across ALL renders.** t=0/0.4/0.8 are static; the transition is
   back-loaded into t≈1.2–3s. For a hook (first second decides everything) this is a real
   weakness — cross-effect and structural, NOT per-effect. **Flagged for Session G** (needs its
   own investigation — Omni pacing vs. prompt-fixable; do not assume a quick clause fixes it).

### Remediation shipped

`84d542d` (TUNED, per-edit Neil-approved 2026-05-22) — one consolidated down-convert clause in
the Option A-Hook `USE THE STORYBOARD'S TRANSITION EFFECT` bullet: Snap Cut + Invisible Effect →
clean anchor morph; Chaos Burst → Explosion-Reveal dispersion. Removes the Snap Cut prompt
contradiction ("instant snap" vs "slow dolly"). Gate 1 (verbatim-template harness) + Gate 2
(live re-render of Snap Cut + Chaos Burst, $0.50) confirmed no regression. Magnitude: a
prompt-coherence fix + intentional degradation — not a dramatic visual change (Omni morphs
regardless). Option A-Regular untouched.

**Crown-jewel finding (flagged, NOT fixed):** the VIRAL VFX MENU at
[api/_lib/prompts.ts:773-780](../api/_lib/prompts.ts) offers Snap Cut, Invisible Effect, and
Chaos Burst as hook options Kling Omni cannot deliver, with no product-category guardrail. A
future crown-jewel session should prune those three from the Omni-hook menu (or gate them) and
add the high-energy→impulse-category gate from the effect↔product-fit map above.

## Session F status: ✅ SHIPPED.

- **What users get now:** hook scenes route to Kling Omni; the storyboard's `transitionEffect`
  reaches Flash; Option A-Hook translates all 6 VIRAL VFX MENU effects into Omni-deliverable
  morph-family prose. No effect produces a broken render — the 3 non-deliverable effects
  degrade intentionally to clean morph-family transitions.
- **Spend:** $1.50 of the $2.00 cap (4 initial renders $1.00 + 2 down-convert re-renders
  $0.50). Kling balance ~$6.50 remaining. Gemini text/image (Gate 1 + substrate) ~cents.
- **Out of scope, carried to Session G:** the dead-first-second hook weakness; cross-product
  validation (coffee only — n=1); the crown-jewel VIRAL VFX MENU prune; the 10 pre-existing
  `tests/unit/geminiService.schemas.test.ts` failures; RENDER ALL mixed-scene flow.

## P0 next — Session G

**Neil selected (2026-05-22): #1 — the dead-first-second fix.** Start it fresh (`/clear`);
use `grill-me` (an investigation that may yield a TUNED Option A-Hook edit — multi-decision).

1. **Dead-first-second fix (SELECTED).** Every Omni hook is static for its most important
   second — the transition is back-loaded to t≈1.2–3s. Research whether prompt language
   ("transformation begins on frame 1", a speed-ramp directive) or an Omni parameter can pull
   the transition earlier. Cheap to probe via the Session F Gate 1/2 harness pattern
   (`.tmp/sf-gate1-textdiff.mjs` rebuilds quickly; substrate is committed under
   [assets/session-f/](assets/session-f/)). Outcome is either a TUNED Option A-Hook tweak
   (per-edit Neil approval) or a documented Omni pacing limit. Grill checkpoint: "if we ship
   this, does the hook actually move in its first second?"
2. **Crown-jewel VIRAL VFX MENU prune (deferred).** Drop/gate Snap Cut + Invisible Effect +
   Chaos Burst as Omni-hook options; add the high-energy→impulse-category guardrail. Touches
   `api/_lib/prompts.ts` — needs explicit per-flow approval (crown-jewel hard rule).
3. **Cross-product validation (deferred).** Re-run the effect sweep on non-coffee substrates
   (skincare, B2B, fashion) — Session F is n=1.

## Session log

- **2026-05-22 — substrate.** Beans/latte pair generated + committed `825205d`. Pushed.
- **2026-05-22 — rubrics locked** via `grifon-cmo` grounding pass; committed `51654ff`.
- **2026-05-22 — Gate 1.** Verbatim-template harness (`.tmp/sf-gate1-textdiff.mjs`, anti-drift
  guard passed) generated video prompts for all 5 effects. All coherent + b-roll-typed. Found:
  Chaos Burst prose ≈ Explosion Reveal (shared clause); Invisible Effect degraded to morph
  prose (no clause). Neil-confirmed render set: 4 effects, skip Invisible Effect.
- **2026-05-22 — render sweep.** 4 effects rendered on Kling Omni direct (`kling-video-o1`,
  std/5s/9:16) — $1.00. All succeeded.
- **2026-05-22 — Gate 2 grading.** Dense 0–2.5s frame grid (the 0/2.5/4.9 grid missed the
  fast transitions). Verdicts: Object Materialization PASS, Explosion Reveal PASS, Chaos Burst
  WEAK, Snap Cut FAIL. Neil-confirmed.
- **2026-05-22 — down-convert clause.** `84d542d` TUNED edit, per-edit Neil-approved. Gate 1
  re-validated coherent prose; Gate 2 re-rendered Snap Cut + Chaos Burst ($0.50) — no
  regression, prompt contradiction resolved.
- **2026-05-22 — Session F closed.** SHIPPED.
