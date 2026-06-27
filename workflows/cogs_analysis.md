# COGS Analysis — Cost-Aware Model Routing (Phase 1 decision)

**Status:** Phase 1 complete. **Decision: STOP text routing. Pivot to image generation.**
**Date:** 2026-06-18 · **Origin:** "9 AI Agent Trends" eval → Trend 8 (cost-aware routing).

This is the go/no-go gate for the cost-aware-routing plan. It answers one question with
numbers: **is routing Grifon's non-tuned text calls to a cheaper model worth building?**

## TL;DR

**No — not for text.** The text calls that are *safe* to route are already on Gemini's
*cheapest* tier (`gemini-3.1-flash-lite`), so the absolute savings are pennies. The spend
that actually matters is **image generation** (and video), which the brief's Open-Router
recipe structurally cannot touch (Open Router has no image generation). We shipped the
telemetry so beta traffic confirms this with real numbers, and we are **not** building the
text-routing abstraction. The real lever — a cheaper image provider — is named as the
follow-up.

## What we shipped in Phase 1

- `api/_lib/modelCosts.ts` — server-only unit-cost table + `estimateTextCostUsd` /
  `estimateImageCostUsd` + `logModelUsage` / `logImageUsage` (fire-and-forget structured
  `{"tag":"cogs",...}` log lines; logging never throws).
- Wired one log line at every generation point: the 5 crown-jewel flows + the Temu
  classifier + the legacy passthrough in `api/gemini/text.ts`, and the generation call in
  `api/gemini/image.ts`. **No prompt content touched; no response contract changed.**
- `tests/unit/modelCosts.test.ts` — encodes the cost math and the routing-decision
  invariant (one image ≫ a typical text call).

Default-safe: this is observability only. Behavior is byte-for-byte unchanged.

## The back-of-envelope (per full ad)

> ⚠️ Per-unit prices are order-of-magnitude PLACEHOLDERS (see header of `modelCosts.ts`) —
> confirm against live pricing. The **ratios** drive the decision and hold regardless.

| Surface | Calls / units per ad | Est. unit cost | Est. per-ad cost | Share |
|---|---|---|---|---|
| **Text** (flash-lite: marketmind, adscript, storyboard, captions, describe*, etc.) | ~6–8 calls | ~$0.001–0.004 / call | **~$0.02** | **<1%** |
| **Image** (avatar + scene images + thumbnail) | ~6–10 images | ~$0.04 / image | **~$0.30** | ~9% |
| **Video** (Veo/Kling render, ~30s) | 1 render | dollars / clip | **~$3.00+** | ~90% |

Text is **<1%** of full COGS — and even if you ignore video entirely, text is only ~6% of the
text+image subtotal. The *routable* slice is smaller still: only ~7 of ~20 text functions are
non-tuned/safe to route, and a cheaper model saves maybe half their cost. So the realistic
ceiling on text routing is **a fraction of a fraction of 1%** of spend.

Against the plan's go/no-go threshold (build only if routable text ≥ ~15% of COGS), text comes
in **an order of magnitude below the bar.** Clear STOP.

## Why not build the abstraction anyway (as a future seam)?

Considered and declined. The provider adapter (Gemini-native ↔ OpenAI-chat-completions) is
~50–80 lines of code that would need its own quality gating (`gemini-eval`) and ongoing
maintenance, in exchange for ~zero savings today. That trades real surface area for no payoff
— against the project's surgical-edit / anti-waste discipline. When a future tier introduces a
genuinely expensive *text* model worth offloading, the telemetry shipped here will flag it and
the seam can be added then, justified by data.

## The real lever (recommended next plan — NOT done here)

**Cheaper image generation.** Image is ~9% of COGS today and ~100% of the *addressable*
non-video savings. It needs its own plan because:

- Open Router can't do image generation — requires evaluating a direct alternate image
  provider.
- Scene/avatar/thumbnail images are **brand-critical**: tuned IDENTITY_LOCK / LUMEN_SYNC
  consistency rules (`services/geminiService.ts`). Any alternate provider must pass
  `gemini-eval` on character/consistency fidelity, not just price.
- Video (the ~90% slice) is already user-selectable between Veo and Kling; revisit only if a
  materially cheaper renderer reaches parity.

## Verification (this phase)

- `npm run build` — PASS (tsc + vite).
- `npm run test` — 239 passed / 12 skipped, incl. `modelCosts.test.ts`.
- `npm run check:bundle-leak` — OK, 0 crown-jewel markers (new code is server-only `api/_lib`).
