# Handoff — 2026-05-19 morning — Session D shipped, Track B (Hook-Effects Library) is Session E

> **For the next session.** Paste this whole file in as your briefing. Then
> read in order: this file → `agent_lessons.md` → `CLAUDE.md` →
> `UBIQUITOUS_LANGUAGE.md`. Then enter plan mode for Session E
> as described in the "P0 next" section below.

---

## TL;DR

- **HEAD**: `2d943b6` on `origin/main`. Working tree clean. All Session D commits pushed.
- **Effective routing**: hook (scene 0, type b-roll) → **Kling O1 Omni**; regular b-roll + cinematic → **Kling V3**; talking → **Veo 3.1 Lite**.
- **Kling balance**: ~$9.00 remaining (Session D spent $0.25 on a single hook smoke render).
- **Two confirmed Session D defects** still need design work in Session E — the live render mechanically succeeded, but **didn't actually morph** because of one code bug (now fixed in `2d943b6`) and one prompt-formula mismatch (still open, Session E scope).
- **P0 next (Session E)**: (a) optional ~$0.25 live re-render to verify the `2d943b6` hotfix actually morphs, then (b) the Hook-Effects Library research + TUNED prompt redesign.

## Commits that landed this session

| Commit | What | Status |
|---|---|---|
| `7fd3da8` | chore(prompts): re-apply Session C P1–P4 TUNED text fixes | ✅ pushed, live |
| `171dadb` | feat(kling): omni proxy + Kling_O1 hook routing + apiSurface refactor | ✅ pushed, live |
| `2d943b6` | fix(kling): send end_frame in Omni image_list for true morph | ✅ pushed, live, **NOT yet re-verified with a live render** |

`171dadb` introduces a new `apiSurface` discriminator on `VIDEO_MODEL_ROUTING` (replaces the coarse `provider` field) and adds the new Kling Omni proxy pair at `api/kling/omni-video.ts` + `api/kling/omni-video/poll.ts`. `2d943b6` fixes the dispatcher to send `image_list` with both `first_frame` and `end_frame` entries when both are present.

## What Session D shipped vs. what Session D failed to deliver

**Mechanically shipped (working in prod):**
- `Kling O1 (Omni)` appears in the model picker (`ACTIVE_MODELS` last entry).
- Single-scene picker + RENDER ALL both route scene-0-b-roll to Omni via `autoRouteModelForType(type, fallback, sceneIdx)`.
- `POST /api/kling/omni-video` proxies correctly to `https://api.klingai.com/v1/videos/omni-video` with raw-base64 frame, returns `task_id`.
- Poll endpoint downloads MP4, uploads to Supabase Storage `gemini-videos` bucket, returns signed playback URL.
- Render time: ~2–3 min at std/720p/5s (normal for Omni; longer than V3 ~60–120s but expected).
- Cost per Omni hook render: ~$0.25 (verified against actual balance drawdown).

**Failed to deliver (Session E work):**
- The hook didn't actually morph — see "What we learned about Omni" below.

## What we learned about Kling Omni from the Session D live test

1. **Omni morph requires BOTH frames in `image_list`** with explicit `type: 'first_frame'` / `type: 'end_frame'` tags. Session D's original dispatcher only sent the start frame, which silently degraded the render to camera motion on a single frame (a forward dolly). Hotfix `2d943b6` now sends both when both are present. (Documented as agent_lessons 2026-05-19 — "Deferring 'the actual point of the feature' to a follow-up session is the planning antipattern.")

2. **Omni's morph behavior is prompt-driven**, unlike V3 which auto-morphs between hardcoded `image + image_tail` params at the API level. The prompt language now matters far more than it did on V3. Three directives in the existing `generateVideoPrompts` Option A formula now actively fight each other on Omni:
   - `CAMERA PHYSICS (MANDATORY — open the prose with this, never static)` — first, bolded, forces camera-motion-first.
   - `SCENE 1 (HOOK) DIRECTIVE: Describe a morphing/transition` — buried in third position.
   - `NEGATIVE PHRASE: Avoid... morphing, melting, deformation` — last (image models weight final tokens heavily), suppresses the morph.

   On V3, all three coexisted fine (morph was hardcoded; negative-morphing guarded against artifacts). On Omni, the model picks camera motion as the most consistent signal. (Documented as agent_lessons 2026-05-19 — "Prompt formulas tuned for one engine don't auto-port to a sibling engine.")

3. **2–3 min Omni render time is normal**, not a regression. Veo 3.1 Lite is ~60–90s; Omni is the slower, more cinematic engine.

4. **Kling V3 image_tail morph is still good for non-hook b-roll.** Don't try to push V3 b-roll to Omni without a reason — V3 is faster, cheaper, and produces consistent results because morph is hardcoded at the API level.

## P0 next — Session E scope

**Goal:** Make the hook scene actually deliver morph drama on Kling O1 Omni — both mechanically (code) and semantically (prompt formula). Track B from the Session D end-of-session conversation.

**Optional Step 0 — verify `2d943b6` actually morphs ($0.25):**

Cheap and decisive. Before designing the Hook-Effects Library, run one live re-render of the hook scene with the hotfix in place:

1. `npm run dev` → `localhost:5174` (or whatever port Vite picks).
2. In Generate Video → single-scene picker, choose `Kling O1 (Omni)`.
3. **Use two visually distinct frames**: start = beans only (no latte), end = latte only (no beans). Don't use a composite image as the start frame — it makes the diagnosis impossible.
4. Use a Grifon-formula-correct hook prompt that explicitly emphasizes morph and drops `morphing/melting/deformation` from the negative tail. Concrete test text:

   > "Macro texture of Bukidnon Brew coffee beans morphs into rosetta crema. Kinetic compression of bean mass into espresso pull. Aggressive speed-ramp outward as crema swirls into latte-art rosetta. Two hands cradle a white ceramic cup, steam rising. Avoid low quality, blurry, distorted, glitching, extra limbs, text, watermark, writing, letters, subtitles."

5. DevTools → Network → confirm `image_list` has TWO entries with `type: 'first_frame'` and `type: 'end_frame'`. If you only see one, hard-reload to bust Vite's cache.
6. After the ~2–3 min render lands, fetch the signed URL through Playwright and screenshot frames at t=0, t=2.5, t=4.9 (the pattern from Session D — see `.tmp/omni-frame-{00,25,49}s.png`). Frame 0 should look like beans-only; frame 4.9 should look like latte-only; mid-frames should show actual transformation.

**Decision tree on Step 0 outcome:**

- **If the hotfix delivers true morph** → Track B is purely a prompt-formula expansion job (cataloging effects, mapping to product/scene context, expanding `SCENE 1 (HOOK) DIRECTIVE` into a structured effect menu, splitting the negative phrase for hook vs regular b-roll). No more dispatcher changes needed.
- **If the hotfix STILL degrades to camera motion** even with both frames + the Grifon-formula prompt → the issue is deeper than the formula. Track B has to start with research into how Omni actually interprets `image_list` + prompts (which the docs are thin on). May need a `WebSearch` / `grifon-cmo` research pass on the Omni API surface before any prompt work.

**Track B proper — Hook-Effects Library:**

The user (Neil) signaled at end-of-Session-D that he wants the hook to support a *menu* of effects, not just morph. Categories he named: "Pattern Interrupts — sudden visual assets such as a drop, smash, morph, burst, explosion etc." Best content-creator examples to research:

- MrBeast (thumbnail-into-video pattern interrupts)
- Iman Gadzhi (entrepreneur/SaaS hook style — whip-pan reveals, freeze-snaps)
- GaryVee (jump-cut + B-roll inserts)
- Filipino Tagalog/Bisaya creators (specific to Grifon's SMB market — Mommy Pinoy / Wil Dasovich / etc.)

**Effect catalog to research (initial list — expand during research):**
1. Morph (texture → texture, the Session D test)
2. Smash cut (hard cut + impact frame)
3. Drop (gravity-based reveal — product drops into frame from above)
4. Burst (explosion outward from center)
5. Explosion (radial debris from product)
6. Swap (object A becomes object B via instant replacement)
7. Whip-pan reveal (fast lateral pan that resolves on the product)
8. Freeze-and-snap (action pauses, then snaps to next state)
9. Parallax push (foreground/background separation accelerates)
10. Glitch-stutter (frame-skip aesthetic)
11. Crash-zoom (rapid push-in to a focal point)
12. J-cut reveal (audio leads the image)
13. Match-cut (compositional rhyme between scenes)

For each effect, design needs:
- A punchy physics-based prompt template (matches the existing VFX TRANSITION PROTOCOL voice at `services/geminiService.ts:1643-1646`)
- A mapping rule: which product types / scene contexts pair with this effect?
- Test renders ($0.25 each — budget ~$3 for cataloging the top ~10 effects)
- A `STILL_FRAME_RULE`/`APPEARANCE_LOCK_RULE`-style identity protection so the effect doesn't disfigure the product mid-transition

**Where the effect-routing decision lives:**
- Option A — `autoRouteEffectForScene()` helper in `services/geminiService.ts`, called by the `generateVideoPrompts` formula at build time. AI sees the chosen effect and writes the prompt accordingly.
- Option B — user picks the effect via a chip in the Generate Video UI (more control, more clicks).
- Option C — AI classifier picks the effect from product/scene context (similar to how `buildAdScriptPrompt` already classifies Temu/Testimonial/MrBeast subtypes). Most aligned with Grifon's "user shouldn't have to think" philosophy.

**TUNED prompt edits Session E will need (per-edit Neil approval required):**
- Split `OPTION A` (b-roll) in `services/geminiService.ts:1671-1679` into hook-scoped and regular-b-roll-scoped variants.
- Hook-scoped variant: drop `CAMERA PHYSICS (MANDATORY first)`, promote `SCENE 1 (HOOK) DIRECTIVE` to first/mandatory position, expand the directive into the effect menu.
- Hook-scoped negative phrase: drop `morphing, melting, deformation`; keep `low quality, blurry, distorted, glitching, extra limbs, text, watermark, writing, letters, subtitles`.

**Out of scope for Session E (defer to F+):**
- Migrate `generateVideoPrompts` to the crown-jewel prompt registry at `api/_lib/prompts.ts` (it's currently still client-side per `services/CLAUDE.md`). Smaller scope to leave alone for now.
- Hook-effect picker UI (Option B above) — start with auto-classification (Option C); UI is a follow-up if Neil wants manual override.
- RENDER ALL mixed-scene verification (1 hook Omni + 3 b-roll V3 + 1 talking Veo) — still deferred from Session D's plan. Useful but not blocking; same routing logic as single-scene.

## Critical files for Session E

| File | Notes |
|---|---|
| `services/geminiService.ts` lines 1631–1698 | `generateVideoPrompts` Option A / B / C blocks + Cinematic VFX TRANSITION PROTOCOL block. TUNED — every prompt edit needs per-edit Neil approval. |
| `services/geminiService.ts` ~line 543 | Omni dispatcher block — already correct after `2d943b6`. Don't touch unless Step 0 verification reveals a new issue. |
| `api/_lib/prompts.ts` | Crown-jewel prompt registry. **Do NOT touch** without explicit per-flow approval (CLAUDE.md hard rule). |
| `components/GenerateVideo/index.tsx` | If Session E adds a hook-effect picker UI, this is where it would go. Probably defer. |
| `.claude/skills/grifon-cmo/` | Load this skill for the effect research lens — it carries MrBeast/Cialdini/Sabri Suby/Filipino SMB context. |
| `.claude/skills/grill-me/` | Use BEFORE writing any prompt edits. Session E is multi-decision (which effects to support, which routing, which prompt language). Grill is appropriate. |

## DO NOT (Session E)

- **Don't touch `api/_lib/prompts.ts`.** Crown-jewel prompts are out of scope. (CLAUDE.md hard rule.)
- **Don't migrate `generateVideoPrompts` to the crown-jewel registry in Session E.** That's a separate workstream — bundling it with the effect-library design balloons scope.
- **Don't bundle TUNED prompt edits with code refactors** in one commit. Each TUNED prompt edit needs an independent commit identity for clean reverts. (agent_lessons 2026-05-09.)
- **Don't ship more "deferred-essential-piece" plans.** Session D's `image_list` defer became the centerpiece bug. Before approving any Session E plan, grill: "If we ship exactly this, does the hook actually morph (or smash, or burst, or whatever effect)?" (agent_lessons 2026-05-19 first entry.)
- **Don't assume a prompt formula transfers across engines.** The current Option A formula was V3-tuned. Omni interprets it differently. (agent_lessons 2026-05-19 second entry.)
- **Don't burn Kling balance speculatively.** Falsifiable hypothesis or no spend. Sessions A+B+C+D total spent ~$1.00 of $10.
- **Don't ship a hook-effect picker UI before the auto-classifier works.** Manual override is a UX escape hatch, not the primary path.

## What's already working and DON'T touch

- **JWT refresh** in both Kling proxies — Session B+ one-shot 401 retry. Working.
- **F2 morph-fallback** at `services/geminiService.ts:444-456` — Veo morph fallback. Kept for talking-scene edge cases.
- **Crown-jewel prompt registry** at `api/_lib/prompts.ts` — TUNED, server-side only.
- **MarketMind output schema** — load-bearing for multiple downstream consumers.
- **`apiSurface` field on VIDEO_MODEL_ROUTING** — Session D introduced this. Don't refactor without reason.
- **`autoRouteModelForType(type, fallback, sceneIdx)`** at `components/GenerateVideo/RenderAllRunner.ts:36-48` — Session D added the sceneIdx-aware hook route. Don't refactor unless adding new scene-position-based rules.

## Cafe-PC reboot reminders

- `npm install` if `node_modules` wiped (the cafe-PC defreezer wipes `C:\Users\Administrator\` including this).
- `npm run dev` (likely `:5174` if 5173 is taken).
- `.env` keys to confirm: `GEMINI_API_KEY`, `KLING_ACCESS_KEY`, `KLING_SECRET_KEY`, `ELEVEN_LABS_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `VITE_PAYMONGO_PUBLIC_KEY`. Restore from password manager if `.env` is empty.
- Git identity restore: `powershell -ExecutionPolicy Bypass -File scripts/restore-git-identity.ps1`.
- Playwright MCP auto-loads via project-scope `.mcp.json`. Useful for inspecting rendered MP4 frames (used heavily in Session D — `.tmp/omni-frame-*.png` pattern).
- The Session D `/loop`-style "wait for Vite ready" pattern uses `Bash run_in_background` with an `until grep -q "Local:"` loop reading the output file.

## How Neil should pick up next session

1. `cd c:\Users\Administrator\Desktop\grifon-command`
2. `git log -3 --oneline` — confirm HEAD is `2d943b6` or further.
3. Open a fresh Claude session, paste this whole handoff doc as the opening message.
4. Tell Claude: *"Read in order: this file → `agent_lessons.md` → `CLAUDE.md` → `UBIQUITOUS_LANGUAGE.md`. Then enter plan mode for Session E. Start with Step 0 (the optional $0.25 hotfix re-verify). Use `grill-me` because Session E is multi-decision."*
5. Optionally first run `npm run dev` if you want to do Step 0 yourself while Claude is reading.
6. Approve the plan, approve the goal, then execute.
