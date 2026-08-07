# Session handoff — 2026-05-29 (PM) — merges to main + #1 hook-ref + #2 CTA accent + #3 dead-air verdict

> **TL;DR.** Merged last session's two fixes to `main`. Shipped backlog **#1**
> (Scene-1 hook end-frame now anchors to the hero product) and **#2** (CTA/Taglish
> American-accent fix — "TAGLISH ACCENT LOCK") as **two new branches, pushed but NOT
> merged** — each gated on an in-vivo Playwright check Neil drives. Verified **#3**
> (trailing dead-air): the editor does **not** trim trailing silence, and the
> final-render executor that would isn't built yet — reported, not fixed (per Neil).

---

## Merged to `main` this session (Phase 0)

| Commit | What |
|---|---|
| `2e12825` | merge `fix/wizard-deep-scroll-grid` (Step5/Step6 capped 2-col layout, layout-only) |
| `8076da2` | merge `fix/hook-length-cap` (TUNED: hook 5–8 word cap + `capHookLine` parser guard) |

Grid merged first (lowest risk → known-green main), hook-cap second (TUNED). Build-gate
passed after each; crown-jewel leak check 0. Both old local branches deleted.

---

## Open branches — pushed, NOT merged (each needs Neil's in-vivo gate)

| Branch | Commit | What | Gate before merge |
|---|---|---|---|
| `fix/hook-endframe-ref` | `0cd9a0c` | **#1.** TUNED (`api/_lib/prompts.ts`): Scene 1 no longer hardcoded `referenceImage:"none"` — model classifies the hook **reveal (end) frame** as product/both/none; anti-pattern guard intact. Wiring (`Step5Storyboard.tsx`): hook **start** frame stays product-free (preserves metaphor), **end** frame gets the hero PRODUCT_IDENTITY_LOCK. | Director-AI smoke (hero-FIRST): Scene 1 end-frame visually matches hero; Scene 2+ unchanged; abstract metaphor hooks still tag `"none"`. |
| `fix/cta-taglish-accent` | `e5d4265` | **#2.** TUNED (`api/_lib/prompts.ts`): demoted English-only "Universal CTA" allowance (Taglish-scoped); added **TAGLISH ACCENT LOCK** — every Taglish line ~70/30 Tagalog-dominant, **CTA must OPEN and CLOSE on a Tagalog word**. Testimonial + MrBeast CTA examples updated; fixed pre-existing banned-"I-click" contradiction. | Regenerate a Taglish script + **one real Veo render of the CTA** → confirm Filipino accent holds. |

Both build-green, leak 0. **Edit regions don't overlap** (#1 ≈ storyboard schema ~865/874;
#2 ≈ COMMON_RULES 286-305 + CTA beats 419/433-478) so both merge cleanly to main in any order
once their gates pass.

### #2 design rationale (from grill-me + premortem)
- Veo picks accent from each line's **dominant** language (~70/30 per Neil's recent renders) —
  a single "anchor word" is too weak.
- We **don't know** Veo's exact trigger (ratio vs first-word vs sentence-final), so the rule
  hedges all three: 70/30 dominance **AND** CTA opens+closes Tagalog, English verb/value-adds
  buried mid-line.
- Carve-outs stay English verbatim: brand name, numbers/scarcity ("first 50"), value-add nouns
  ("free shipping", "recipe ebook").
- **Verification is the arbiter:** if the Veo render still renders American, that render is the
  probe that reveals the true trigger → re-tune.

---

## #3 — Trailing dead-air: VERIFIED, verdict = NOT trimmed (no build, per Neil)

**The editor does not trim trailing silence by speech-end detection.** Two layers:

1. The EDL's `keepSegments` is a **script-text heuristic** (`scriptLine.length / 18`, clamped
   3–8s — `services/geminiService.ts:1269-1273`), **not** audio speech-end detection. The
   deliberate ~0.8s render overshoot (`suggestDurationForScript = words/2.5 + 0.8`,
   `services/geminiService.ts:467-475`) is acknowledged in-comment as *"dead air is
   downstream-trimmable by the AI Editor; truncation is not."*
2. **No downstream trimmer exists yet.** `components/EditVideo.tsx:266-269` states the EDL is
   from a "stub brain"; the Phase-2 Remotion Lambda that would render the EDL JSON into a final
   trimmed MP4 is **not wired**. The only output today is a downloadable EDL JSON
   (`EditVideo.tsx:70-71`). Nothing assembles a final video, so nothing trims silence.

**Implication:** trailing-silence removal is blocked on the unbuilt Remotion executor — a real
launch-readiness gap, NOT a prompt-tuning issue. Do **not** prompt-hack clip lengths to mask it.
Lands in the post-beta roadmap alongside item 9 ("Trim the Dead First Second").

---

## Pre-flight reminders (next session, cafe-PC defreezer)

- Only the repo persists. All work is pushed (main + the two fix branches) — safe.
  `npm install` if `node_modules` gone. Playwright MCP: `.\scripts\restore-playwright-mcp.ps1`.
- **Auth:** no test account; **Neil signs in himself** in the Playwright Chromium.
- **Hero-FIRST** before any wizard smoke (agent_lessons 2026-05-24 + 2026-05-26): find handheld
  hero photo w/ readable label FIRST → derive brand from label → MarketMind → Send to Director AI.
- **TUNED edits** (`prompts.ts` / `geminiService.ts`) need Neil's per-line approval — never
  autonomous; never `/goal` (guardrail-excluded).

## Next-session priority
1. Neil runs the two in-vivo gates → merge `fix/hook-endframe-ref` and `fix/cta-taglish-accent`
   to main (build-gate each).
2. Then continue render-quality backlog: #4 (Scene-5 line displacement / classifier) is the next
   REAL fix. #5 ("simwano") + #6 (cosmetic brand-vs-product name) are minor/post-launch.
3. Launch-readiness: the AI Editor final-render (Remotion) executor + audio-based silence trim is
   an unbuilt gap surfaced by #3 — scope it explicitly before relying on the EDL.

## Out of scope (do not drift): "simwano" slur, CMO deliverables 2-5, ElevenLabs voice-clone swap.
