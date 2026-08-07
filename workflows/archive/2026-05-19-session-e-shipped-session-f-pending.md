# Handoff — 2026-05-19 evening — Session E shipped, Session F pending

> **For the next session.** Paste this whole file in as your briefing. Then
> read in order: this file → `workflows/archive/2026-05-19-session-e-hook-audit.md` (the Session E plan + full log) → `agent_lessons.md` → `CLAUDE.md` →
> `UBIQUITOUS_LANGUAGE.md`. Then enter plan mode for Session F
> as described in the "P0 next" section below.

---

## TL;DR

- **HEAD:** `3a33887` on `origin/main`. Working tree clean (untracked screenshots are defreezer-disposable artifacts). All Session E commits pushed.
- **Session E shipped the hook video-prompt audit.** Two commits to `services/geminiService.ts`:
  - `31d65f4` — plumbed `scene.transitionEffect` through `generateVideoPrompts` storyboardText (pure code)
  - `4a82d99` — split Option A into Option A-Hook (Scene 1 hook) + Option A-Regular (Scene 2+ b-roll, unchanged behavior)
- **Effective behavior now:** hook scene route → Kling Omni → Flash sees the storyboard's `transitionEffect` choice → Option A-Hook translates that choice into anchor-bridge prose with hook-scoped negative tail (no morphing/melting/deformation suppression).
- **Gate 2 PASS confirmed by Neil 2026-05-19.** Render B (post-audit Flash output) substantively beats Render A (pre-audit Flash output) on anchor-bridging at t=2.5s. Doesn't fully match Step 0 NEW's hand-crafted quality but is what every user gets automatically — the production win.
- **Kling balance:** ~$8.00 remaining (Session E spent $1.00 of the $1.50 cap; $0.50 banked).
- **P0 next (Session F):** **empirical Scope β validation** — render hook scenes for the other 5 TransitionEffect values to confirm the audit's "translate TransitionEffect label into anchor-bridge prose" instruction works across the full VIRAL VFX MENU. ~$1.25 spend.

## Commits that landed this session

| Commit | What | Status |
|---|---|---|
| `802e689` | docs(workflows): Session E plan mirror — Hook video-prompt audit | ✅ pushed |
| `31d65f4` | feat(prompts): plumb scene.transitionEffect through generateVideoPrompts storyboardText | ✅ pushed, live |
| `4a82d99` | feat(prompts): split generateVideoPrompts Option A into A-Hook + A-Regular (TUNED) | ✅ pushed, live |
| `2d72a56` | docs(workflows): log Session E Commits 2a + 2b shipped; Gate 2 queued | ✅ pushed |
| `3a33887` | docs(session-e): close-out — Gate 2 PASS, audit shipped, lesson recorded | ✅ pushed |

`31d65f4` adds an optional `TransitionEffect: <value>` line to the storyboardText fed to Flash, only when `scene.transitionEffect` is set (Scene 1 only per the storyboard generator's schema at [api/_lib/prompts.ts:822](../../api/_lib/prompts.ts)). `4a82d99` splits the Option A b-roll rules into Option A-Hook (Scene 1, drops morphing/melting/deformation from negative tail, opens with anchor transformation, uses TransitionEffect verbatim) and Option A-Regular (Scene 2+, behaviorally identical to pre-audit Option A).

`3a33887` added a new `agent_lessons.md` entry: *"Audit upstream before designing new downstream logic"* — the load-bearing finding from Session E was that the storyboard generator already classifies transitions via the 6-effect VIRAL VFX MENU, but `generateVideoPrompts` was dropping that signal. The audit just plumbed the existing signal through; the redesign was unnecessary.

## What Session E shipped vs. what's still open

**Mechanically shipped (live in prod):**
- `scene.transitionEffect` now reaches Flash via storyboardText for every Scene 1 hook.
- Option A-Hook fires for Scene 1 b-roll with anchor-bridging discipline.
- Option A-Regular preserves Neil's two-year-tuned b-roll formula for Scene 2+ exactly.
- Gate 2 live render confirmed Flash-via-Option-A-Hook produces a visible "drip" / anchor-bridge composition that beats the pre-audit Flash output on the cinematic Bukidnon Brew test.

**Not tested in this session (Session F scope):**
- Hook renders for the other 5 TransitionEffect values (Object Materialization, Teleport/Snap Cut, Explosion Reveal, Chaos Burst, Invisible Effect). Gate 1 text-diff confirmed Flash produces effect-appropriate PROSE for Object Materialization and Chaos Burst, but no live Omni render verifies they actually render well.
- Hook renders across non-coffee product types (skincare, food delivery, B2B SaaS, fashion, real estate, services). The audit is structurally product-agnostic but only empirically validated on one product.
- RENDER ALL mixed-scene flow (1 hook Omni + 3 b-roll V3 + 1 talking Veo in one queue). Carried forward from Session D, still not validated.

## What we learned this session

1. **`transitionEffect` plumbing alone delivers most of the value.** Gate 1 text-diff showed Flash naturally varies per-effect prose just from seeing the storyboard's choice in its input — *without* any new instructions. "Chaos Burst" produced "hyper-realistic explosion" prose with zero rule changes. The Option A-Hook block (Commit 2b) added discipline on top, but the load-bearing improvement was the plumbing.

2. **Camera motion must be MANDATORY in Option A-Hook, not optional.** Gate 1 v1 made camera motion optional ("weave in only if it serves the morph"). Flash interpreted that as "default to static." Static 5s Omni clips are an anti-pattern. Fix: replaced with `CAMERA MOTION (required, subtle, serves the morph)` + STATIC SHOTS FORBIDDEN. Re-run produced "gentle push-in toward the anchor point" consistently.

3. **The Gate 1 cheap-iteration loop works.** A disposable Node script that called Gemini Flash directly with 3 meta-prompt variants × 3 TransitionEffect values cost ~$0.001 and surfaced the static-composition regression BEFORE any Kling burn. Investigation scaffolding > production validation when the question is "what does Flash do with these rules?"

4. **Render B (Flash output via Option A-Hook) is good but not Step 0 NEW (hand-crafted) good.** This is expected — instruction → Flash → prose is always looser than human hand-crafting. The gap could be closed with more Option A-Hook iteration, but diminishing returns. Customer feedback should drive any further tightening, not preemptive iteration.

## P0 next — Session F scope

**Goal: empirically validate that the audit generalizes across the full 6-effect VIRAL VFX MENU, not just Character Morph.**

The current Option A-Hook block tells Flash to "translate the TransitionEffect label into anchor-bridge prose; do not invent a different transition." Gate 1 text-diff confirmed this works for the 3 tested values (Character Morph, Object Materialization, Chaos Burst). Gate 2 live-rendered ONLY Character Morph on Omni. We don't yet know whether Object Materialization or Chaos Burst RENDER as well as their prose suggests.

**Concrete steps:**

1. **Pick the 5 untested TransitionEffect values:** Object Materialization, Teleport/Snap Cut, Explosion Reveal, Chaos Burst, Invisible Effect.
2. **Reuse the Bukidnon Brew beans/latte frame pair as the test substrate** (consistent anchor, eliminates product variance).
3. **For each effect, run `generateVideoPrompts` with a Bukidnon Brew storyboard whose Scene 1 has that effect.** The Gate 1 harness at `.tmp/gate1-textdiff.mjs` (if not wiped) or a fresh equivalent can do this. Print the Flash output prompt for each.
4. **Render each Flash-output prompt against the same beans/latte frames on Kling Omni.** $0.25 × 5 = $1.25.
5. **Extract frames at t=0/2.5/4.9 via Playwright HTML5 video** (the established pattern — see `omni-cinematic-gate2-*.png` from Session E). Inspect against the anchor-bridging criterion.
6. **Decision matrix per effect:**
   - **PASS (anchor visibly bridges at t=2.5s):** the "translate label" instruction is sufficient for this effect. No explicit clause needed.
   - **WEAK (anchor present but transformation feels rote):** add an explicit clause to Option A-Hook for this specific effect. Surgical, Gate-1-validated, Gate-2-validated. Per-edit Neil approval.
   - **FAIL (anchor lost, looks like camera motion or static):** investigate whether the effect is fundamentally Omni-incompatible (e.g., "Invisible Effect" might not have a two-frame interpretation that works) and document. Possibly flag for storyboard-generator pruning in a future session.

7. **For each FAIL or WEAK effect**, draft a TUNED clause for the Option A-Hook block (citation Rule 2: cite which effect needed the explicit handling and why). Each clause = independent commit, per-edit Neil approval.

**Out of scope for Session F (defer to G+):**
- Cross-product validation (skincare, food, B2B, etc.). Single product variance keeps the per-effect test clean.
- Crown-jewel migration of `generateVideoPrompts` to `api/_lib/prompts.ts`. The audited prompt content is now in the public bundle; eventually it should move server-side. Big workstream, separate scope.
- Pre-existing 10 test failures in `tests/unit/geminiService.schemas.test.ts` (crown-jewel migration test gap). Documented in Session E commits. Test-rewrite is its own workstream.
- Customer-feedback-driven tightening of Option A-Hook to push Flash closer to Step 0 NEW quality.

## Critical files for Session F

| File | Notes |
|---|---|
| [services/geminiService.ts:1671-1699](../../services/geminiService.ts) | Option A-Hook + A-Regular blocks. **TUNED — every prompt edit needs per-edit Neil approval.** Citation Rule 2 (every clause cites its source). |
| [api/_lib/prompts.ts:773-823](../../api/_lib/prompts.ts) | Storyboard generator's VIRAL VFX MENU + Scene 1 schema. **Crown-jewel, hard rule: do NOT edit.** Read-only reference for which effects Flash picks. |
| [services/geminiService.ts:539-562](../../services/geminiService.ts) | Omni dispatcher. Already correct, don't touch. |
| `.tmp/gate1-textdiff.mjs` (if not wiped by defreezer) | The Gate 1 harness pattern. Rebuilds quickly if wiped — see Session E plan/log for the structure. |
| [workflows/archive/2026-05-19-session-e-hook-audit.md](2026-05-19-session-e-hook-audit.md) | The Session E plan + full execution log. Read for context on what's been validated and why. |
| [agent_lessons.md](../../agent_lessons.md) entries 2026-05-19 (×3) | Session D + Session E lessons — deferred-essential-piece antipattern, V3-formula-portability, plumb-upstream-before-redesigning. |

## DO NOT (Session F)

- **Don't touch `api/_lib/prompts.ts`** beyond read-only inspection (crown-jewel rule, [CLAUDE.md](../../CLAUDE.md)).
- **Don't change Option A-Regular** — its behavior is preserved Scene 2+ b-roll, Neil's two-year-tuned formula. The audit explicitly protected it.
- **Don't bundle TUNED prompt edits with code refactors** ([agent_lessons.md](../../agent_lessons.md) 2026-05-09).
- **Don't ship explicit per-effect clauses** without Gate 1 text-diff confirming they improve prose AND Gate 2 live render confirming they improve frames. The Session E gate pattern is the established procedure.
- **Don't speculatively expand to non-coffee product types** until per-effect generalization is established. One axis of variance at a time.
- **Don't burn Kling balance speculatively** — Session F budget is $1.25 (5 effects × $0.25). Total Sessions A-F aggregate would be ~$3.75 of $10.
- **Don't trust prose text-diff alone** — Gate 1 says "the prose is good"; Gate 2 says "the actual render is good." Both required before shipping a per-effect clause.
- **Don't assume the audit generalizes across product types** — it's a hypothesis. The agent_lessons 2026-05-19 (third entry) Lesson explicitly flags that test-breadth was limited to one product. Real customer renders will surface edge cases; address those specifically.

## What's already working — DON'T touch

- **Omni dispatcher** at [services/geminiService.ts:539-562](../../services/geminiService.ts) (Session D + hotfix `2d943b6`).
- **`autoRouteModelForType`** at [components/GenerateVideo/RenderAllRunner.ts:39-49](../../components/GenerateVideo/RenderAllRunner.ts) — scene 0 b-roll → Kling_O1.
- **Storyboard generator's HOOK LOGIC + VIRAL VFX MENU** at [api/_lib/prompts.ts:769-780](../../api/_lib/prompts.ts) — crown-jewel, picks the right effect per Scene 1.
- **Option A-Regular** at [services/geminiService.ts:1681-1699](../../services/geminiService.ts) — Scene 2+ b-roll, Neil's tuned formula intact.
- **Option A-Hook with the camera-motion fix** at [services/geminiService.ts:1671-1679](../../services/geminiService.ts) — Scene 1 hook, anchor-bridging discipline + mandatory camera motion + hook-scoped negative tail + TransitionEffect translation.
- **JWT refresh** in Kling proxies (Session B).
- **F2 morph-fallback** at [services/geminiService.ts:444-456](../../services/geminiService.ts) — Veo morph fallback for talking-scene edge cases.
- **Crown-jewel prompt registry** at [api/_lib/prompts.ts](../../api/_lib/prompts.ts) — TUNED, server-side only.

## Alternative P0 priorities (if Neil wants something else)

If Neil prefers a different next step over Scope β validation, alternatives in rough order of leverage:

- **Alt 1 — Cross-product validation.** Test the shipped audit against 2-3 non-coffee product types (skincare, food, B2B SaaS). $0.50-1.50. Validates the cross-product generalization hypothesis. Higher information value per dollar than per-effect validation if multiple effects already worked in Gate 1.
- **Alt 2 — RENDER ALL mixed-scene flow validation.** Render a full ad (1 hook Omni + 3 b-roll V3 + 1 talking Veo) via the RENDER ALL queue. Confirms multi-engine handoff still works with the new behavior. ~$1.00. Carried forward from Session D, never validated.
- **Alt 3 — Fix the 10 pre-existing test failures.** `tests/unit/geminiService.schemas.test.ts` expects prompts in fetch body (pre-crown-jewel pattern). Rewrite to test against the server-side prompts via a different mechanism. Cleans the build-gate signal. ~1-3 hours, no Kling spend.
- **Alt 4 — Migrate `generateVideoPrompts` to crown-jewel registry.** Move Option A-Hook + A-Regular + B + C blocks to `api/_lib/prompts.ts`, replace client-side function with thin proxy wrapper. Big architectural workstream — likely needs its own grill-me + plan-mode session. Defer until customer-visible reason.
- **Alt 5 — Continue post-beta roadmap.** Open [workflows/post_beta_roadmap.md](../post_beta_roadmap.md) for endorsed-but-deferred ideas (nightly regression `/loop`, Odyssey-as-Cron / Autopilot tier). Strategic moves, not tactical.

## Cafe-PC reboot reminders

- `npm install` if `node_modules` wiped.
- `npm run dev` (likely `:5173` or `:5174`).
- `.env` keys to confirm: `GEMINI_API_KEY`, `KLING_ACCESS_KEY`, `KLING_SECRET_KEY`, `ELEVEN_LABS_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `VITE_PAYMONGO_PUBLIC_KEY`. Restore from password manager if `.env` is empty.
- Git identity restore: `powershell -ExecutionPolicy Bypass -File scripts/restore-git-identity.ps1`.
- Playwright MCP auto-loads via project-scope `.mcp.json`. Frame extraction pattern: load MP4 in a `<video>` element, seek to time, screenshot the element. See Session E for the established pattern (browser_evaluate + browser_take_screenshot).
- The Session D/E `npm run dev` background pattern: `Bash run_in_background` with the until-grep wait pattern for `"Local:"` in the output file.
- ffmpeg is NOT installed on cafe-PC. Use Playwright HTML5 video frame extraction (the established Session D/E pattern).

## How Neil should pick up next session

1. `cd c:\Users\Administrator\Desktop\grifon-command`
2. `git log -5 --oneline` — confirm HEAD is `3a33887` or further.
3. Open a fresh Claude session, paste this whole handoff doc as the opening message.
4. Tell Claude: *"Read in order: this file → `workflows/archive/2026-05-19-session-e-hook-audit.md` → `agent_lessons.md` → `CLAUDE.md` → `UBIQUITOUS_LANGUAGE.md`. Then enter plan mode for Session F. The P0 is empirical Scope β validation (render the 5 untested TransitionEffect values on Omni). Use `grill-me` for the per-effect test design — multi-decision plan needs interview-style alignment."*
5. Confirm Kling balance (~$8.00 expected).
6. Approve the plan, approve the goal, then execute.
