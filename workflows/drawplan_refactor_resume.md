# Resume — drawPlan refactor & pre-render look-lock

**Branch:** `drawplan-refactor` · **Last session:** 2026-06-27

Paste-ready context so next session starts without re-explaining. Read this + the
approved plan summary below, then continue **manually, calmly — NO `/goal`** (the
autonomous goal caused a chaotic over-build last session; Neil felt overwhelmed).

---

## ✅ DONE & SHIPPED on this branch (Phase A — the refactor)

Pure structural extraction, **byte-identical tuned look**, fully tested:

- **`api/_lib/drawPlan.ts`** (new) — the extracted pure draw engine: caption
  chunking, layer planning (`planScene`), hook-title layout, sfx-restraint,
  transitions, and the `buildTextFilter`/`buildBoxFilter` filtergraph builders.
  No ffmpeg/fs I/O — that all stayed in `renderFfmpeg.ts`.
- **`api/_lib/renderFfmpeg.ts`** (modified) — imports from `drawPlan.ts` and
  `export * from './drawPlan.js'` re-exports everything, so all consumers + tests
  are unchanged. Diff was −982 / +19 (the +19 are only imports/re-export/comments).
- **`tests/unit/drawPlan.snapshot.test.ts`** + its `.snap` — golden baseline
  pinning the full engine output across all 4 presets + every branch. Captured
  from the ORIGINAL code before extraction; it MATCHED after. This is the proof
  the tuned look didn't change. **If it ever fails after editing the engine →
  STOP, the look changed.**

Verified: `npm run build` zero errors · `npx vitest run tests/unit/drawPlan.snapshot.test.ts tests/unit/renderFfmpeg.test.ts` = 88 pass.
`api/_lib/renderPresets.ts` (the tuned look config) was NEVER touched.

---

## ⏭️ NEXT (the pre-render look-lock feature — was built then REVERTED, by choice)

The feature was fully scoped via `grill-me` + premortem, built end-to-end, then
**reverted** because it got rushed/overwhelming. Phase A (above) was the only part
kept. The design is sound — rebuild it **slowly, manually, one piece at a time,
with Neil reviewing each.** All decisions below are settled (from the grill):

**Goal:** reduce end-stage surprise — let the user **preview the composite look
(scene + caption/hook) and lock it** at GenerateVideo's "Render All", BEFORE the
video+voice+render spend, so the finished ad matches what they picked.

**Settled decisions:**
- **Lock mechanism (the easy, safe win — do this FIRST):** the user picks a look;
  it threads as `FinalRenderRequest.preset.id` (the override field already exists
  in `types.ts`; `resolvePreset()` already honors it). No lock → server rotates
  (today's behavior). The plumbing is half-built already.
- **Premortem #1 (the real risk):** the locked `presetId` silently getting dropped
  on the hop GenerateVideo → `editorBatch` (App.tsx state) → EditVideo →
  `renderFinalVideo()`. Guard with a tiny pure chokepoint helper + a unit test that
  proves the id arrives. (NOTE: `wizardSessionStore` does NOT persist `editorBatch`,
  so there's no draft-resume hop to worry about — simpler than the plan feared.)
- **Composite preview (the bigger piece — Neil to decide approach):** show the
  scene image with the caption/hook burned on, faithfully. Two options:
  - **B) server `api/render/preview-frame.ts`** — additive, isolated ffmpeg-on-a-
    still endpoint reusing `drawPlan` in Node with the real fonts. Faithful,
    doesn't touch the existing render path. The grilled plan chose this.
  - **A) client-side render from `planScene`** — now possible (drawPlan is pure/
    importable) but has client `.js`-resolution + font-serving hurdles → riskier.
    Rejected on reflection.
  - **C) ship lock-only, no image composite** — smallest.
- **Panel:** non-blocking, at the Render All entry, labeled exactly
  *"static look preview — motion & timing added at render."*
- **v1 scope (read-only):** preview + pick-ONE-look-per-ad. Deferred: caption
  reposition/retype, per-scene looks, motion preview, collision detection.

**Wiring map (from last session, for the rebuild):**
- Look picker / lock lives in `components/GenerateVideo/index.tsx` (the Render All
  command bar, `handleSendToAiEditorFromBar` ~L1675).
- Handoff: `onSendToAiEditor(batch, lockedPresetId?)` → App.tsx `editorBatch` state
  (~L203) → `<EditVideo editorBatch=...>`.
- Apply: `components/EditVideo.tsx` `BatchEditMode` final-render call (`renderFinalVideo({ scenes, aspectRatio, music })` ~L272) — add `preset: { id: lockedPresetId }`.

**TUNED guardrail (always):** never edit the look/preset/prompt CONTENT of
`renderFfmpeg.ts`, `drawPlan.ts`, or `renderPresets.ts`. The snapshot test failing
= you changed the look = stop & ask Neil.

---

## How to resume

1. `git checkout drawplan-refactor`
2. Skim this file + confirm `npm run build` + the snapshot test are green.
3. Pick up the look-lock rebuild — **start with the lock mechanism + its
   threading test** (smallest, safest, proves the core). Then ask Neil about the
   composite preview approach (B vs C) before building it.
4. **No `/goal`. Manual. One piece, review, next piece.**
