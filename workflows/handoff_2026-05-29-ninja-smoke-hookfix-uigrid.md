# Session handoff — 2026-05-29 — Ninja smoke + hook-cap fix + wizard deep-scroll fix

> **TL;DR.** Ran the Priority-1 contrasting-brand smoke (Ninja Blast Portable
> Blender, a real Lazada gadget — hero-FIRST). All 8 scenes rendered + reviewed.
> Shipped **two fixes on two branches (both pushed, NOT yet merged to main)**:
> (1) `fix/hook-length-cap` — prompt + deterministic parser guard capping the
> ad-script hook at 5–8 words; (2) `fix/wizard-deep-scroll-grid` — Storyboard +
> Video-Prompts steps reflowed to a capped 2-col grid, killing the deep scroll.
> Smoke surfaced a clean backlog of render-quality items (below).

---

## What shipped (two open branches → need PR/merge to main)

| Branch | What | Files | Verified |
|---|---|---|---|
| `fix/hook-length-cap` | Hook overshoot fix. Prompt: scope 7–12 word rule to BODY only, hook 5–8 single-flip. **Parser guard** `capHookLine` (≤2 sentences AND ≤12 words) in `parseAdScriptResponse`. | `api/_lib/prompts.ts` (TUNED) | Build green; in-vivo re-gen 18/14/21→**7/7 words**, contrarian retained |
| `fix/wizard-deep-scroll-grid` | Step 5 scene stack → `grid lg:grid-cols-2` in `max-h-[58vh]` internal scroll + vertical cards; Step 6 → 2-col, `max-w-6xl`. | `components/Step5Storyboard.tsx`, `components/Step6VideoPrompts.tsx` | Build green; Playwright 1280 + 375 (page ~1900px→~1065px, CONFIRM always reachable) |

Both are **single-concern, independently mergeable**. Hook fix is a TUNED edit
(per-line approved by Neil). UI fix is layout-only (no tuned/state/service change).

---

## Smoke result — Ninja Blast (Testimonial + Taglish, Result-Reveal angle)

Pipeline PASSED end-to-end on a fresh contrasting brand: MarketMind → Director
prefill (no `[object Object]`) → hero AI read "Ninja" → Step-3 angle picker →
**Hook Seed Protocol fired** (hook1[0] = "Hindi ka busy. Chained ka sa kusina.")
→ avatar (clear-skinned) → storyboard 8/8 (identity + Ninja label consistent) →
thumbnail (label preserved) → Step-7 classifier B-T-T-B-T-B-T-T → RENDER ALL 8/8.

**Original target bugs — in-vivo verdicts:**
- **Bug 22 (em-dash) — PASS.** CTA rendered "Click below, first 50…" (comma, no "ensten").
- **Bug 18 (dead-air padding text) — held.** No `[silent pause]` text. (But fixed-clip-vs-speech gap remains — see backlog.)
- **Bug 17A (Tagalog) — largely good.** Two edge cases (simwano slur, CTA accent — backlog).
- **Hook Seed — works**, contrarian hook rendered on Scene 1.

---

## Backlog — render-quality findings (prioritized, NOT yet done)

1. **Scene-1 hook end-frame product inconsistency (REAL, pre-launch worth it).**
   Hook scene generates frames from TEXT only — hero NOT passed as reference
   (`SCENE_01.referenceImage` effectively "none"). Veo/img-gen invents its own
   "NINJA" blender ≠ hero. Fix: when product appears in hook, pass hero as
   start/end-frame reference like other product scenes. (Scene-image gen; the
   latent "SCENE 1 hook schema" item in launch_readiness.)
2. **CTA American-accent (REAL, TUNED prompt).** Veo picks accent from the line's
   dominant language; all-English CTA → American. Fix: CTA (and every line in
   Taglish mode) must keep Tagalog anchor words. e.g. "Mag-click sa baba, first 50
   may libreng shipping at recipe ebook." Touches CTA beat + COMMON_RULES Taglish.
3. **Dead air = EDITOR's job (confirmed).** Veo renders fixed ~6s clips; VO is
   4–5s → trailing silence on Sc 2/3/7/8. Not a prompt fix. Verify the AI
   Editor/EDL trims trailing silence (detect speech-end, cut). Optionally request
   5s renders to shrink the gap.
4. **Scene-5 line displacement (REAL, classifier).** When a b-roll scene precedes
   a talking scene, the b-roll's VO line migrates onto the next talking scene,
   dropping that scene's own line. Scene 5 spoke Scene 4's discovery line. Trace
   the Step-7 prompt builder / classifier. (Also moots the "simwano" slur, which
   was on that displaced line.)
5. **"simwano" slur (minor).** Veo TTS hallucination of "simula nung". Bug 21
   class (Tagalog TTS accuracy → ElevenLabs swap, post-launch). Don't
   phonetic-respell (that's the reverted Bug 17A that caused "lahong").
6. Minor: Veo prompts say "Blast Portable Blender" while script body says "Ninja"
   (product vs brand name) — cosmetic.

**Post-launch (unchanged):** dead-first-second Omni trim, CMO deliverables 2–5,
ElevenLabs voice-clone swap, test-suite repair.

---

## Pre-flight reminders (next session, cafe-PC defreezer)

- Only the repo persists. Both fix branches are pushed — safe. `npm install` if
  `node_modules` gone. Playwright MCP: `.\scripts\restore-playwright-mcp.ps1` (VS
  Code restart kills the convo — do at session start).
- Auth: no test account; **Neil signs in himself** in the Playwright Chromium.
- Hero-FIRST rule held this session and worked (Ninja label matched MarketMind).
- MarketMind reuse: the "// LAST MARKET RESEARCH" banner → DIRECTOR AI re-enters
  with cached report (no paid re-analyze). Used it for the clean re-run.

## Next-session opening priority

Decide merge order for the two branches to main, then pick from the backlog:
**#1 (hook end-frame ref)** and **#2 (CTA accent)** are the two highest-value
pre-launch render-quality fixes. #3 (editor trim) is verification, not a build.

---

## Copy-paste opening prompt for the next session

```
Continuing GRIFON COMMAND launch-prep. Last session = 2026-05-29 (Ninja Blast smoke + 2 fixes).

READ FIRST, in this order:
1. workflows/handoff_2026-05-29-ninja-smoke-hookfix-uigrid.md  ← full context + backlog
2. CLAUDE.md (Plan→Goal pipeline, TUNED rules, cafe-PC defreezer)
3. agent_lessons.md (Director AI pre-flight: hero-FIRST 2026-05-24 + 2026-05-26)
4. services/CLAUDE.md + api/CLAUDE.md (TUNED-file rules)

STATE: Two fixes are pushed but NOT merged to main — both single-concern, independently mergeable:
- fix/hook-length-cap   (api/_lib/prompts.ts — TUNED: hook 5-8 word cap, prompt + parser guard)
- fix/wizard-deep-scroll-grid  (Step5/Step6 components — capped 2-col grid, layout-only)

FIRST: tell me your recommended merge order for those two branches to main, then wait for my go.

THEN, the pre-launch render-quality backlog (prioritized in the handoff):
- #1 Scene-1 hook end-frame: pass hero as reference so the hook product matches the
     hero like other b-roll scenes (SCENE_01.referenceImage is effectively "none").
- #2 CTA American-accent: in Taglish mode the CTA (and every line) must keep Tagalog
     anchor words so Veo holds the Filipino accent. TUNED prompt — needs per-line
     approval + grill-me before editing.
I want #1 and #2 as today's targets. #3 (editor trims trailing dead air) is verification,
not a build — confirm the AI Editor/EDL cuts trailing silence, don't prompt-hack it.

RULES: TUNED edits (prompts.ts / geminiService.ts) need my per-line approval — never
autonomously. Hero-FIRST before any wizard smoke. I sign in myself in Playwright (no test
account). Commit early (defreezer). Don't drift into post-launch items (CMO 2-5, ElevenLabs
swap, "simwano" slur).

Today's goal: launch by June. Pick up from the handoff's backlog, not from scratch.
```
