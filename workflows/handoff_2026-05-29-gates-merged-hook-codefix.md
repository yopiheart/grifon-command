# Session handoff — 2026-05-29 — BOTH gates merged to main (hook code-fix + CTA accent)

> **TL;DR.** Both pre-launch render-quality gates **PASSED and merged to `main`** (`b6b9791`).
> Gate 1's original prompt-only fix was proven **inert in vivo** (model tags the hook
> `referenceImage:"none"` 3/3) and was **replaced with a deterministic Step5 code fallback +
> a TUNED resolved-still prompt rule**. Gate 2 (CTA Filipino accent) **passed on Neil's ear**
> on a real Veo render. Audit mechanism changed: the video-auditor **Gem is retired** in favor
> of raw Gemini-3.5-Flash-via-Playwright (`workflows/video_audit_protocol.md`).

---

## On `main` now (`b52a429..b6b9791`, fast-forward)

| Commit | What |
|---|---|
| `b52a429` | docs: retire audit Gem → `video_audit_protocol.md` + agent_lessons entry |
| `713a144`/`83b7361` | merges of `fix/hook-endframe-ref` + `fix/cta-taglish-accent` (the two gated branches) |
| `b6b9791` | **fix(hook):** Step5 hero-anchor end-frame fallback (+guard) + TUNED resolved-still rule |

Build-gate green (`npm run build` exit 0), **crown-jewel leak check = 0** (the new server-side
rules stay out of the client bundle). Local fix branches deleted; remotes remain.

## Gate 1 (hook end-frame) — how it actually got fixed

The shipped `fix/hook-endframe-ref` (prompt rule telling the model to classify the hook
`referenceImage` product/both) **did not work** — in vivo the model returned `"none"` **3/3**
even when the end frame revealed the real product. See agent_lessons 2026-05-29 ("a fix that
depends on the model obeying a NEW classification rule…"). Real fix, all in `b6b9791`:

- **`components/Step5Storyboard.tsx` (CODE, fair-game):** when a hook-morph END frame's prompt
  **names the product**, force the hero `productUrl` + `product`/`both` mode onto it regardless
  of the model's `referenceImage` tag. **Guard** (`endFrameRevealsProduct`, productWords match)
  keeps purely abstract-metaphor hooks product-free. Start frame stays product-free.
- **`api/_lib/prompts.ts` (TUNED, Neil per-line approved):** STILL_FRAME_RULE now forbids
  transition/reveal verbs in frame prompts (`disintegrating`, `revealing`, `materializing`, …)
  + a **HOOK END-FRAME = RESOLVED REVEAL** clause (resolved product still, no narrated reveal,
  no stray humans). This removed the "disintegrating to reveal" morph language that was both
  ugly and the source of a hallucinated face.

**Validated in vivo (Ninja Blast, Taglish):** hook end frame now renders the clean Ninja product
(logo correct, no "Blast" invention, no face, no extra limb after a regen).

## Gate 2 (CTA Taglish accent) — PASSED

Real Veo render of the CTA *"Tara, click sa baba, first 50 may free shipping, subukan mo na."*
→ **Neil's ear: Filipino accent + lip-sync + camera movement all good.** `fix/cta-taglish-accent`
merged. (CTA MP4 was at a 24h-signed Supabase URL — expired by next session; re-render if needed.)

## Non-issues we chased down (NOT caused by the changes)

- **Scene 2 blank** = transient upstream **502** on `/api/gemini/image` (regenerated fine).
- **Scene 7 "black woman"** = stochastic classifier framing (product-only scene → no avatar
  anchored → invented stranger); correct Filipino male on the clean run.
- **Triple hand on the hook** = stochastic extra-limb; regen produced a clean product-only reveal.
- **15 unit-test failures** = pre-existing **crown-jewel-migration drift** (tests assert
  server-side prompt text in the *client* fetch body) + model-ID downgrades. The documented
  "test-suite repair" backlog, not this session's changes. App builds + runs clean.

See agent_lessons 2026-05-29 ("Don't accept 'your change broke X' without checking the path").

## Backlog status

- **#3 trailing dead-air → now roadmap item #10** (`post_beta_roadmap.md`): the AI Editor's
  **final-render executor (Remotion) + audio-based trailing-silence trim is UNBUILT.** Neil's CTA
  showed talk 0–4s then dead air + blur 4–6s; nothing trims it today (EDL is a script-text
  heuristic stub, no renderer). Biggest launch-readiness gap. **Scope, don't prompt-hack.**
- **#4 Scene-5 line displacement** — did **NOT** manifest this run (every scene carried its own
  correct line, in order). Still the nominal "next real fix," but un-reproduced here; needs a
  fresh trigger or a targeted trace of `generateVideoPrompts` line→scene mapping.
- **#5 "simwano"** (Veo TTS of "simula nung") + **#6** product-vs-brand ("Blast" vs "Ninja" in
  video prompts) — both still present, both post-launch/minor, unchanged.

## Pre-flight reminders (next session, cafe-PC defreezer)

- Only the repo persists; everything above is **pushed to `main`**. `npm install` if `node_modules`
  gone. Playwright MCP tools were already loaded this session (restore script if not).
- Hero photo for Ninja smoke lives at `.tmp/smoke-2026-05-29/hero.jpeg` (handheld, "NINJA" label) —
  but `.tmp/` is disposable; re-source if wiped. Cached MarketMind ("// LAST MARKET RESEARCH" →
  DIRECTOR AI) reuses the Ninja report with no paid re-analyze.
- **Hero-FIRST** before any wizard smoke (agent_lessons 2026-05-24 + 2026-05-26).
- **TUNED edits** (`prompts.ts`/`geminiService.ts`) need Neil's per-line approval; never `/goal`.
- **Image-API 502s were frequent this session** (Gemini under load) — transient; retry, don't debug.

## Next-session priority
1. **#10 (Remotion final-render + silence trim)** is the headline launch-readiness gap — scope it
   into an active workflow when Neil's ready to build (it's a multi-day render-pipeline build).
2. Re-trigger/trace **#4** line displacement if it recurs.
3. Otherwise launch_readiness pass toward beta.
