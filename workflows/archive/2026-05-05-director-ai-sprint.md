# Archive: 2026-05-05 — Director AI beta-readiness fix sprint

**Session theme:** Working tree dirty, build green, NOT committed. Single bundled commit pending the Bukidnon Brew regression run. Eight files modified across this + the prior session — all share one theme (beta-readiness for 5–10 hand-picked Filipino owners).

## What shipped this session

**Step 8 (Final Output) — full redesign** ([components/Step7FinalOutput.tsx](../../components/Step7FinalOutput.tsx)):
- Tabbed asset viewer (`// SCRIPT // AVATAR // THUMBNAIL // STORYBOARD // VIDEO_PROMPTS`) — one panel visible at a time, replaces the prior 5-card vertical scroll. Disabled tabs auto-detect missing assets.
- `EXPORT_BUNDLE (.ZIP)` builds `BrandName_Bundle.zip` with `script.txt`, `storyboard.json`, `video_prompts.txt`, `avatar.png`, `thumbnail.png`, `scenes/scene_*.png`. Filename uses sanitized `clientDetails.brandName`.
- `◀ BACK` returns to Step 7 with state intact.
- `GENERATE VIDEO NOW ▶` deeplinks to GenerateVideo with all wizard prompts pre-loaded. `restart()` is *not* called on this path so wizard state is preserved.
- Click-to-zoom on Avatar/Thumbnail tabs via existing `ImageModal`. Switched from `object-cover` (cropping bug) to `object-contain` with `aspect-[9/16]` / `aspect-video` containers.
- `// Clear Session & Restart` visibility-bumped from `text-zinc-600` → `text-zinc-500` + `RotateCcw` icon + `border border-white/5 rounded-full` pill. Discoverable on scan, still secondary to gold CTAs.

**Wizard ↔ GenerateVideo handoff** ([App.tsx:421, 505](../../App.tsx); [components/GenerateVideo.tsx:14-17, 53-63, ~377](../../components/GenerateVideo.tsx)):
- `seedPrompts?: VideoPrompt[]` prop on GenerateVideo. When present, `config.prompt` initializes from `seedPrompts[0]` and a scene-picker chip row renders above the KINETIC_DIRECTIVE textarea (`SCENE_01 ... SCENE_NN`). Click a chip → swaps prompt content and highlights gold. Hygiene: when GenerateVideo is launched from the Dashboard (no wizard), `seedPrompts` is undefined and the chip row doesn't render.
- App.tsx mirrors the existing `<SignalModulator globalScript={finalScript}>` precedent at [App.tsx:425](../../App.tsx#L425).

**Bucket A — code-only fixes** (no CLAUDE.md tuning gate):
- **A1 — REGEN button race condition fixed** ([components/Step5Storyboard.tsx:135-188, 459](../../components/Step5Storyboard.tsx)). `handleGenerateSingleScene(index, force=true)` bypasses the skip gate. REGEN button now shows `REGENERATING...` with spinning icon while running. Prior bug: race between `setStoryboardData` and the closure-captured stale state caused the skip gate to fire and silently no-op.

**Bucket B — prompt tuning** (CLAUDE.md gated, approved via grill-me protocol):
- **B1 — `WARDROBE_PROTOCOL` injection stripped** ([services/geminiService.ts:~1442](../../services/geminiService.ts)) and the unused `WARDROBE_LOGIC` constant deleted (~7 lines removed at line 244). Wardrobe is now solely owned by IDENTITY_LOCK rule 1.
- **B2 — `IDENTITY_LOCK + ENVIRONMENT_SYNC` rewritten** ([services/geminiService.ts:~1413-1421](../../services/geminiService.ts)). Five numbered rules: **LOCKED** (face/skin/hair/wardrobe/body) vs **VARIES** (expression/gaze/pose/hands/props), with **FLEXIBLE** environment scope (same residence, different spots — kitchen → dining table → counter, never to unrelated locations).
- **B3 — `APPEARANCE_LOCK_RULE` added** to `generateStoryboard` system instruction ([services/geminiService.ts:~1295-1322](../../services/geminiService.ts)). Forbids appearance redescription in avatar scene prompts (no clothing, hair, body, face, ethnicity descriptors). Lists what's required (action, expression, gaze, hands, props, pose, spot, lighting). Includes wrong/correct example pair.
- **B4 — `STILL_FRAME_RULE` added** ([services/geminiService.ts:~1295-1308](../../services/geminiService.ts)). Names the contract: frames = stills, transitions carry motion. Forbids motion verbs in `imagePrompt` / `startFramePrompt` / `endFramePrompt`. Tightened Scene 1 schema field descriptions.

**IDENTITY_LOCK wiring fix** (the hidden bug surfaced by the camera-angle question):
- Discovered while auditing camera angles: `Step5Storyboard.tsx` was never passing `variationIndex` or `referenceImageMode` to `generateSceneImage`. Result: every avatar scene rendered at `AVATAR_CAMERA_ANGLES[0]` = INTIMATE_CLOSE_UP, AND `referenceImageMode` defaulted to `'none'` so **IDENTITY_LOCK and PRODUCT_IDENTITY_LOCK never fired in the wizard's main path**. The model was getting STRICT_NEGATIVE rules ("NO HUMANS, NO faces, NO hands") which it ignored due to the reference image arriving in the same call.
- Fix at [components/Step5Storyboard.tsx:158-188](../../components/Step5Storyboard.tsx#L158-L188): start frame passes `index` for variationIndex and `scene.referenceImage` for referenceImageMode. End frame uses `index + 100` so Scene 1's two frames land on different camera angles for visual punch.
- **Implication:** B1+B2 from above were dead code at ship time; this wiring fix makes them actually execute. The next regression run is the *first time* IDENTITY_LOCK has ever fired in the wizard.

## Files in working tree at end of day

```
M  api/gemini/image.ts                 (prior session — Tier 1.5)
M  api/gemini/text.ts                  (prior session — Tier 1.5)
M  vercel.json                         (prior session — Tier 1.1)
M  index.css                           (prior session — UX.3 keyframes)
M  services/geminiService.ts           (this + prior — Tier 1.2, 2.A, 2.B, B1-B4)
M  components/Step5Storyboard.tsx      (this + prior — Tier 1.3, 1.4, UX.1/3/4, 3.1, 3.2, A1, wiring fix)
M  components/Step7FinalOutput.tsx     (this — Step 8 redesign + A2 + A3)
M  components/GenerateVideo.tsx        (this — seedPrompts + scene chips)
M  App.tsx                             (this — wizard ↔ GenerateVideo wiring)
?? .claude/skills/grifon-cmo/          (prior session — untracked CMO persona skill)
```

Build state: green (`tsc && vite build` → 2237 modules, ~5.9s). Cache wipe (`Remove-Item node_modules/.vite, dist`) is the reliable remediation when the documented html-inline-proxy first-build flake triggers.

## Regression run — partial pass (evening 2026-05-05)

Live regression with Bukidnon Brew (Taglish, 9:16, MrBeast formula). **Stopped at Step 6** to wrap session; resume tomorrow at Step 7 → 8.

**Test brand** (reconstruction from prior session's screenshots since exact field text wasn't captured):
- Brand: `Bukidnon Brew` · Script: MrBeast formula · Language: Taglish · Aspect: 9:16
- Product: 250g single-origin Bukidnon highland coffee beans, medium roast, resealable valve bag

Observed pass criteria:
- ✓ #1 — Scene 1 hook end-frame static (mug → bowl-of-beans, both stills, B4 STILL_FRAME_RULE held)
- ✓ #2/#3/#5 — Scene 2 avatar consistency: mustard sweater + hair + residence context all match reference; spot varies (breakfast nook ≠ reference's main room). **First proof B1+B2+B3+wiring fix all fire correctly.**
- ✓ #4 — Scene 2 expression follows prompt (mild frustration at phone), does NOT inherit reference's smile.
- ✓ #6 — Camera angles vary across scenes (Scene 7 head-on close-up vs Scene 2 medium shot — `index` / `index + 100` variationIndex pass at Step5Storyboard.tsx:158-188 working).
- ✓ #7 — REGEN button works on Scene 7 (initial roll: avatar looking down, no product → after regen: eye contact + holding product). A1 confirmed.

New observations (not failures, but worth logging):
- **Scene 4 product shot may be passing through the reference image** rather than re-rendering. The hero shot Neil uploaded already had rustic wood + warm light + bokeh, which matched the storyboard prompt verbatim — so we can't tell whether `PRODUCT_IDENTITY_LOCK` is doing surgical extract-and-replace or just echoing the reference. **Follow-up test post-beta:** run the same brand with a plain white-background product photo and check if Scene 4 still produces the wooden-board composition. If not, real bug.
- **Scene 7 prompt ambiguity:** "pointing down towards the screen with a friendly inviting smile" can read as "looking down at where you're pointing" *or* "eye contact + finger pointing at frame bottom." First interpretation produced a miss; REGEN got the right roll. Tighter phrasing (`eye contact with camera, finger pointing toward bottom edge of frame`) would reduce REGEN-needed rate. Bucket B tuning, deferred — REGEN is the user-facing fix.

Pending criteria (resume tomorrow):
- ☐ #8 — Step 8 thumbnail tab: no crop, click-to-zoom modal works
- ☐ #9 — Step 8 EXPORT_BUNDLE: produces `Bukidnon_Brew_Bundle.zip` with all assets
- ☐ #10 — Step 8 GENERATE_VIDEO_NOW: deeplink works, scene chips load, click swaps prompt
- ☐ #11 — // CLEAR_SESSION_&_RESTART pill is visible and works

New code shipped this evening (folds into the same bundled commit):
- **ImageModal zoom/pan** ([components/ui/ImageModal.tsx](../../components/ui/ImageModal.tsx)) — click-to-zoom (cursor `zoom-in` → `grab`/`grabbing`), drag-to-pan when zoomed, ZoomOut button (top-left) when zoomed, hint copy `// CLICK_IMAGE_TO_ZOOM_IN` / `// DRAG_TO_PAN · CLICK_TO_ZOOM_OUT`. Hand-rolled with `transform: scale() translate()`, no new dep. Single component → applies to Step 4/5/6/7/8.
- **Step 6 thumbnail tile no-crop fix** ([components/Step6Thumbnail.tsx:92-99](../../components/Step6Thumbnail.tsx#L92-L99)) — `object-cover` → `object-contain` + `bg-zinc-950` letterbox. Tile now shows the same image the modal shows (no aspect surprise on click). Same fix Neil already applied to Step 8 in this morning's redesign; Step 6 was missed in that pass.

Build state: green (`tsc && vite build` → 2237 modules, ~5.8s after one cache wipe for the documented html-inline-proxy flake).
