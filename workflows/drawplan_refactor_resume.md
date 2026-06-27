# Resume — drawPlan refactor & pre-render look-lock

**Branch:** `drawplan-refactor` · **Last session:** 2026-06-27

Paste-ready context so next session starts without re-explaining. Read this + the
approved plan summary below, then continue **manually, calmly — NO `/goal`** (the
autonomous goal caused a chaotic over-build last session; Neil felt overwhelmed).

> **Where to pick up (2026-06-27):** Phase A (refactor) + look-lock **Pieces 1 & 2
> are SHIPPED** on this branch (commit `d308061`) — lock-only (option **C**) works
> end-to-end. The one open decision is the **composite image preview: option B vs
> ship lock-only**. See "NEXT" below. Branch is committed but **not pushed**.

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

## ✅ SHIPPED — pre-render look-lock, Pieces 1 & 2 (commit `d308061`, 2026-06-27)

**Goal:** reduce end-stage surprise — let the user lock the edit-style look at
GenerateVideo's "Render All", BEFORE the video+voice+render spend, so the finished
ad matches what they picked. Built **manually, one reviewed piece at a time** (NOT
via `/goal`). Lock-only (option **C**) now works end-to-end; AUTO keeps today's
rotation byte-identical.

**Piece 1 — the tested pipe** (premortem #1: locked id silently dropped on the
GenerateVideo → `editorBatch` → EditVideo → `renderFinalVideo()` hop):
- `types.ts` — named union `LockablePresetId` (`classic|impact|hype|clean`), reused
  in `FinalRenderRequest.preset.id`. `resolvePreset()` already honors an explicit id.
- **`services/renderLock.ts`** (new) — `buildLockedPreset(id)`, the ONE pure
  chokepoint that builds `FinalRenderRequest.preset`: id → `{id}`, absent →
  `undefined` (server rotates). All preset construction funnels through here.
- **`tests/unit/renderLock.test.ts`** (new) — proves the id survives verbatim for
  all 4 presets, and absence = rotate (not a dropped id). The premortem-#1 guard.
- Threaded `lockedPresetId` through all three hops: GenerateVideo prop
  `onSendToAiEditor(batch, lockedPresetId?)` → App.tsx `editorBatch` state →
  `components/EditVideo.tsx` `BatchEditMode` render call (now
  `preset: buildLockedPreset(editorBatch.lockedPresetId)`).

**Piece 2 — the picker UI** (`components/GenerateVideo/index.tsx`):
- `LOOK_OPTIONS` (module-level) + `lockedPresetId` state + a `// LOOK` second row in
  the Render All command bar: **AUTO** (default, no lock) + **Impact / Hype / Clean**.
  `classic` deliberately NOT surfaced (kill-switch, not a creative choice; pipe still
  supports it). Hints condensed from each preset's doc comment in `renderPresets.ts`.
- **Copy note:** dropped the originally-planned label *"static look preview — motion
  & timing added at render"* — that promises a preview IMAGE that only exists once
  option B is built. Lock-only copy says `· applied at final render` instead. **If
  you build B, restore the "static look preview" wording.**

Verified: `npm run build` clean · the drawPlan snapshot guard stayed green (proof the
tuned look is byte-identical) · 90 unit tests pass.

---

## ⏭️ NEXT — the ONE open decision: composite image preview (B) vs ship lock-only (C)

Everything else is settled and shipped. The remaining choice (Neil's call) is whether
to show the scene image with the caption/hook burned on, faithfully, at the Render All
entry — or stop at the working lock-only UI.

- **B) server `api/render/preview-frame.ts`** — additive, isolated ffmpeg-on-a-still
  endpoint reusing `drawPlan` in Node with the real fonts. Faithful; doesn't touch the
  existing render path. The grilled plan chose this. If built: panel is non-blocking,
  at the Render All entry, and restore the label *"static look preview — motion &
  timing added at render."*
  - (Rejected alt **A**: client-side render from `planScene` — now importable, but
    client `.js`-resolution + font-serving hurdles make it riskier.)
- **C) ship lock-only, no image composite** — already shipped & working. Smallest.

**v1 scope (read-only), deferred either way:** caption reposition/retype, per-scene
looks, motion preview, collision detection.

**TUNED guardrail (always):** never edit the look/preset/prompt CONTENT of
`renderFfmpeg.ts`, `drawPlan.ts`, or `renderPresets.ts`. The snapshot test failing
= you changed the look = stop & ask Neil.

---

## How to resume

1. `git checkout drawplan-refactor`
2. Skim this file + confirm `npm run build` + the snapshot test are green
   (`npx vitest run tests/unit/drawPlan.snapshot.test.ts tests/unit/renderLock.test.ts`).
3. Lock-only (C) is shipped & working. The only open question is the **composite
   preview: B vs C** — ask Neil which before building anything. If C, the feature
   is done; if B, build `api/render/preview-frame.ts` (and restore the "static look
   preview" label per the copy note above).
4. Branch is committed (`d308061`) but **not pushed** — push if/when Neil asks.
5. **No `/goal`. Manual. One piece, review, next piece.**
