# Workflow: Launch Readiness

**Objective:** Track what's required before GRIFON COMMAND can take real paying users at `app.grifon.ai`.

This is the meta-workflow. It doesn't do the work itself — it points to the workflows that do, and tracks overall progress.

## Status as of 2026-05-05 (Director AI beta-readiness fix sprint)

**Working tree: dirty, build green, NOT committed.** Single bundled commit pending the Bukidnon Brew regression run. Eight files modified across this + the prior session — all share one theme (beta-readiness for 5–10 hand-picked Filipino owners).

### What shipped this session

**Step 8 (Final Output) — full redesign** ([components/Step7FinalOutput.tsx](components/Step7FinalOutput.tsx)):
- Tabbed asset viewer (`// SCRIPT // AVATAR // THUMBNAIL // STORYBOARD // VIDEO_PROMPTS`) — one panel visible at a time, replaces the prior 5-card vertical scroll. Disabled tabs auto-detect missing assets.
- `EXPORT_BUNDLE (.ZIP)` builds `BrandName_Bundle.zip` with `script.txt`, `storyboard.json`, `video_prompts.txt`, `avatar.png`, `thumbnail.png`, `scenes/scene_*.png`. Filename uses sanitized `clientDetails.brandName`.
- `◀ BACK` returns to Step 7 with state intact.
- `GENERATE VIDEO NOW ▶` deeplinks to GenerateVideo with all wizard prompts pre-loaded. `restart()` is *not* called on this path so wizard state is preserved.
- Click-to-zoom on Avatar/Thumbnail tabs via existing `ImageModal`. Switched from `object-cover` (cropping bug) to `object-contain` with `aspect-[9/16]` / `aspect-video` containers.
- `// Clear Session & Restart` visibility-bumped from `text-zinc-600` → `text-zinc-500` + `RotateCcw` icon + `border border-white/5 rounded-full` pill. Discoverable on scan, still secondary to gold CTAs.

**Wizard ↔ GenerateVideo handoff** ([App.tsx:421, 505](App.tsx); [components/GenerateVideo.tsx:14-17, 53-63, ~377](components/GenerateVideo.tsx)):
- `seedPrompts?: VideoPrompt[]` prop on GenerateVideo. When present, `config.prompt` initializes from `seedPrompts[0]` and a scene-picker chip row renders above the KINETIC_DIRECTIVE textarea (`SCENE_01 ... SCENE_NN`). Click a chip → swaps prompt content and highlights gold. Hygiene: when GenerateVideo is launched from the Dashboard (no wizard), `seedPrompts` is undefined and the chip row doesn't render.
- App.tsx mirrors the existing `<SignalModulator globalScript={finalScript}>` precedent at [App.tsx:425](App.tsx#L425).

**Bucket A — code-only fixes** (no CLAUDE.md tuning gate):
- **A1 — REGEN button race condition fixed** ([components/Step5Storyboard.tsx:135-188, 459](components/Step5Storyboard.tsx)). `handleGenerateSingleScene(index, force=true)` bypasses the skip gate. REGEN button now shows `REGENERATING...` with spinning icon while running. Prior bug: race between `setStoryboardData` and the closure-captured stale state caused the skip gate to fire and silently no-op.

**Bucket B — prompt tuning** (CLAUDE.md gated, approved via grill-me protocol):
- **B1 — `WARDROBE_PROTOCOL` injection stripped** ([services/geminiService.ts:~1442](services/geminiService.ts)) and the unused `WARDROBE_LOGIC` constant deleted (~7 lines removed at line 244). Wardrobe is now solely owned by IDENTITY_LOCK rule 1.
- **B2 — `IDENTITY_LOCK + ENVIRONMENT_SYNC` rewritten** ([services/geminiService.ts:~1413-1421](services/geminiService.ts)). Five numbered rules: **LOCKED** (face/skin/hair/wardrobe/body) vs **VARIES** (expression/gaze/pose/hands/props), with **FLEXIBLE** environment scope (same residence, different spots — kitchen → dining table → counter, never to unrelated locations).
- **B3 — `APPEARANCE_LOCK_RULE` added** to `generateStoryboard` system instruction ([services/geminiService.ts:~1295-1322](services/geminiService.ts)). Forbids appearance redescription in avatar scene prompts (no clothing, hair, body, face, ethnicity descriptors). Lists what's required (action, expression, gaze, hands, props, pose, spot, lighting). Includes wrong/correct example pair.
- **B4 — `STILL_FRAME_RULE` added** ([services/geminiService.ts:~1295-1308](services/geminiService.ts)). Names the contract: frames = stills, transitions carry motion. Forbids motion verbs in `imagePrompt` / `startFramePrompt` / `endFramePrompt`. Tightened Scene 1 schema field descriptions.

**IDENTITY_LOCK wiring fix** (the hidden bug surfaced by the camera-angle question):
- Discovered while auditing camera angles: `Step5Storyboard.tsx` was never passing `variationIndex` or `referenceImageMode` to `generateSceneImage`. Result: every avatar scene rendered at `AVATAR_CAMERA_ANGLES[0]` = INTIMATE_CLOSE_UP, AND `referenceImageMode` defaulted to `'none'` so **IDENTITY_LOCK and PRODUCT_IDENTITY_LOCK never fired in the wizard's main path**. The model was getting STRICT_NEGATIVE rules ("NO HUMANS, NO faces, NO hands") which it ignored due to the reference image arriving in the same call.
- Fix at [components/Step5Storyboard.tsx:158-188](components/Step5Storyboard.tsx#L158-L188): start frame passes `index` for variationIndex and `scene.referenceImage` for referenceImageMode. End frame uses `index + 100` so Scene 1's two frames land on different camera angles for visual punch.
- **Implication:** B1+B2 from above were dead code at ship time; this wiring fix makes them actually execute. The next regression run is the *first time* IDENTITY_LOCK has ever fired in the wizard.

### Files in working tree (uncommitted)

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

Build state: green (`tsc && vite build` → 2237 modules, ~5.9s). Cache wipe (`Remove-Item node_modules/.vite, dist`) is the reliable remediation when the documented html-inline-proxy first-build flake triggers (Open follow-up #3 in the 2026-05-04 section).

### Next action — Bukidnon Brew regression run

The single most valuable next action is **running the regression**, not building anything new. Reasons: (1) eight uncommitted files all depend on the storyboard rules and IDENTITY_LOCK actually producing better output; (2) the wiring fix means this is the first time IDENTITY_LOCK has ever fired — zero data on whether the rewritten content is actually correct; (3) one bundled commit per the prior session's pattern.

**Test brand** (reconstruction from prior session's screenshots since exact field text wasn't captured):
- Brand: `Bukidnon Brew` · Script: MrBeast formula · Language: Taglish · Aspect: 9:16
- Product: 250g single-origin Bukidnon highland coffee beans, medium roast, resealable valve bag
- Same 3 stock product photos as prior regression for clean apples-to-apples (if Neil still has them; otherwise pure regression baseline shifts)

**Pass criteria:**
- [ ] Scene 1 hook end-frame: static composition (frozen hand, suspended droplets), NOT another splash
- [ ] Avatar scenes: same wardrobe across all (gray pullover from reference, not blue chambray drift)
- [ ] Avatar scenes: same hair across all
- [ ] Scene 3-equivalent: avatar follows prompt (looking down, holding empty mug, brow furrowed) — does NOT inherit reference's smile
- [ ] Avatar scenes: same residence context, but spot varies (kitchen → dining → counter as prompts drive)
- [ ] Camera angles vary across scenes (no more all-close-up)
- [ ] REGEN button works (clears + re-renders the scene; shows `REGENERATING...` with spinning icon)
- [ ] Step 8 thumbnail tab: no crop, click-to-zoom modal works
- [ ] Step 8 EXPORT_BUNDLE: `Bukidnon_Brew_Bundle.zip` with all assets
- [ ] Step 8 GENERATE_VIDEO_NOW: deeplink works, scene chips load, click swaps prompt
- [ ] // CLEAR_SESSION_&_RESTART pill is visible and works

**If all pass:** commit everything as one bundled "beta-readiness" commit, then beta-source 5–10 real Filipino owners (operational, not engineering — out of plan scope).
**If any fail:** the failure mode tells us which rule needs tightening; fix → retest → commit.

### Regression run — partial pass (evening 2026-05-05)

Live regression with Bukidnon Brew (Taglish, 9:16, MrBeast formula). **Stopped at Step 6** to wrap session; resume tomorrow at Step 7 → 8.

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
- **ImageModal zoom/pan** ([components/ui/ImageModal.tsx](components/ui/ImageModal.tsx)) — click-to-zoom (cursor `zoom-in` → `grab`/`grabbing`), drag-to-pan when zoomed, ZoomOut button (top-left) when zoomed, hint copy `// CLICK_IMAGE_TO_ZOOM_IN` / `// DRAG_TO_PAN · CLICK_TO_ZOOM_OUT`. Hand-rolled with `transform: scale() translate()`, no new dep. Single component → applies to Step 4/5/6/7/8.
- **Step 6 thumbnail tile no-crop fix** ([components/Step6Thumbnail.tsx:92-99](components/Step6Thumbnail.tsx#L92-L99)) — `object-cover` → `object-contain` + `bg-zinc-950` letterbox. Tile now shows the same image the modal shows (no aspect surprise on click). Same fix Neil already applied to Step 8 in this morning's redesign; Step 6 was missed in that pass.

Build state: green (`tsc && vite build` → 2237 modules, ~5.8s after one cache wipe for the documented html-inline-proxy flake). Dev server still running on :5173 as background task `bjup4hu4o`.

**Tomorrow's starting point:** test video generation end-to-end with the wizard's video prompts. Neil's words: *"build the video generation so I can test the video prompts to action."* Implies GenerateVideo module needs Veo wiring proven (or the multi-scene queue from the parked list is what unlocks the test). Open `components/GenerateVideo.tsx` + `services/geminiService.ts` video-related calls first thing to scope what "build" means. Don't commit the working tree yet — regression isn't complete; wait until #8–#11 pass.

### Parked / deferred (non-blocking)

| Item | Reason |
|---|---|
| `ImageAdsGen.tsx` + `OrganicCalendar.tsx` wiring fix — same `referenceImageMode` bug, different modules | Outside current test path; Tier 4 cleanup post-beta |
| Separate `BROLL_CAMERA_ANGLES` menu — current `AVATAR_CAMERA_ANGLES` are talking-head framings ("focus on eyes") applied unconditionally including to product B-roll | Defer until beta tells us if B-roll framing is a problem |
| ChatGPT/Higgsfield-style persistent asset library — Supabase tables, RLS, CRUD, gallery UI | Greenfield multi-day initiative; export-bundle covers beta |
| Multi-scene queueing in GenerateVideo — auto-render all 8 scenes in sequence | Manual scene-chip swap is the v1 UX; beta will tell us if tedious |
| `// 3RD_REGENERATION_DETECTED` soft warning toast | Optional UX nudge; existing per-tier daily quotas (commit `5855fb3`) handle abuse |
| Strategic Audit prompt rewrite — current is generic and self-praising | Quality concern, not a beta blocker |
| 40-second ad length — tighten storyboard prompt to 5-6 scenes (~25-30s ads) | Beta will tell us if length is the bottleneck |

### Documented behavioral lessons from this session

Worth folding into `agent_lessons.md` if it bites again, but not blocking:
- **Wiring bugs masquerade as content bugs.** The Bucket B IDENTITY_LOCK rewrite was content-correct but never executed because `Step5Storyboard.tsx` wasn't passing `referenceImageMode`. Diagnosis path: when prompt edits don't produce expected output, grep call sites for the gated parameter before iterating on prompt text. The `generateSceneImage` signature has 11 positional args; only `InfluencerForge.tsx` was passing them all.
- **Vite html-inline-proxy first-build flake remediation:** wipe `node_modules/.vite` + `dist`, then retry. The "second invocation passes" recipe from the 2026-05-04 entry is unreliable; the cache wipe is deterministic.

## Status as of 2026-05-04 (evening update)

ICANN domain verification confirmed (Gate 6 follow-up closed). ElevenLabs upgraded to **Starter plan** (10 voice slots, IVC enabled). Voice cloning smoke-tested end-to-end in local dev: clone → cloned voice usable in TTS → delete frees the slot. Today's session shipped:
- `api/elevenlabs/voices/clone.ts` — fixed data-URL parser to accept MediaRecorder's `audio/webm;codecs=opus` output; split error mapper to distinguish "API key missing scope" from "plan tier insufficient"; added user-readable `message` to all 400/415/429 paths so the UI surfaces real reasons.
- `vite.config.ts` — taught `vercelApiDevPlugin` to resolve `[param].ts` dynamic routes and inject the segment value into `req.query`. Without this, the DELETE handler at `api/elevenlabs/voices/[id].ts` was unreachable in dev (worked in prod via Vercel's filesystem router).

**IVC unlock — CLOSED 2026-05-04.** Voice cloning is live for Creator+ users on `app.grifon.ai`. End-to-end smoke test on prod passed: cloned voice created, used in TTS, deletable. Voice Changer (uploaded + recorded) and Voice DNA library voices also confirmed working post-deploy. The Supabase `user_voices` table is live in prod (proven by behavior).

Operational changes flipped in Vercel (Production scope) and redeployed:
- `GRIFON_VOICE_CLONING_ENABLED=true`
- `ELEVEN_LABS_API_KEY` rotated to a key with `Voices=Write + TTS + Models` scopes (the prior key was missing `Voices=Write`, which would have 401'd cloning even with the flag on).

Shipped same session (commits `fa1fec1`, `9837d0b`, `66df4ca`):
- Plan-tier gate at `components/SignalModulator/index.tsx:24-25` — Voice Cloning tab now renders only when `useSubscription` reports Creator+ (`planAtLeast(plan_id, 'creator')`); free-tier users no longer see the tab.
- `MAX_VOICES_PER_USER` bumped 1 → 2 at `api/_lib/voiceConfig.ts:4` to give Creator/Pro users headroom without exhausting the 10-slot Starter pool.

Signal Modulator polish — CLOSED 2026-05-04 (extended session). Three-part ship:

**Part 3 — Session history + regenerate** (commit `e42e563`):
- New `// LOG` button at top-right of Signal Modulator header opens a slide-in drawer.
- In-memory session log capped at 20 takes, mixing TTS + Voice Changer in one chronological list.
- Each take: voice name, snippet/source, relative time, ▷ play, ⟲ restore, 🗑 remove.
- **Restore** rehydrates voice + text + stability + (for VC) sourceFile + sourceLabel into the form and auto-switches tab if needed. Implemented via `pendingRestore` state in `useSessionHistory` consumed by per-tile useEffect.
- **Regenerate** button inline next to DEPLOY AUDIO when an output is showing. Capped at 3 per take with visible `// 3_LEFT` counter. Re-fires API with the take's *stored* params (so editing the form mid-take doesn't change what regen produces). At 0, disables with hint copy.
- Copy updated: `// OUTPUTS_NOT_STORED` → `// LOGGED_TO_SESSION — DEPLOY_AUDIO_TO_KEEP_AFTER_REFRESH`.
- Cleared on browser refresh (no backend, no storage cost). Files: `useSessionHistory.ts` (hook), `SessionHistory.tsx` (drawer), updates in `index.tsx` + both tiles + `utils.ts` + `types.ts`.
- **Cost-protection caveat**: 3-regen cap is a band-aid. There is currently *no per-user daily/monthly TTS quota* — entire app shares ElevenLabs Starter's 30,000 credits/month. Per-tier daily quotas are a separate ship needed before any real userbase scales (see follow-ups below).

**Part 2 — Native download dedup** (commit `94762a3`):
- `<audio controls>` 3-dot menu was exposing a second download path that bypassed the `downloadAudio()` branded-filename helper. Added `controlsList="nodownload"` on both tiles' audio elements. Single clear save action via DEPLOY AUDIO.

**Part 1 — Voice picker curation + leak fix** (commit `b6b0c68`):

1. **Recommended-for-Ads curation**  (`components/SignalModulator/pinoyReady.ts` populated with 8 American stock voices: Sarah/Liam/Laura/Will/Jessica/Brian/Bella/Bill). ElevenLabs stock catalog has zero `language: "fil"` voices, so "Filipino default" can't be a metadata filter; curation is by hand. Picker now defaults to `// RECOMMENDED_FOR_ADS` section + a `// SHOW_ALL_21_STOCK_VOICES` toggle that expands the by-language groups. Default voice for new TTS / Voice Changer sessions prefers cloned → recommended → first stock.

2. **FILIPINO_LIBRARY allowlist + workspace-leak fix** (`api/_lib/filipinoLibrary.ts`). Replaced the fail-open `category !== 'premade' && !myIdSet.has()` filter with an explicit allowlist of 5 admin-curated voices: Pinay Spokesperson, Pinoy Reviewer, Pinay Vlogger, Pinoy TikToker, Pinoy Kid Voice. Display names override the admin's internal ElevenLabs labels (e.g., "SEAMAN TIKTOK" → "Pinoy TikToker") so users see persona-driven labels and admin internals stay private. Voice descriptions sourced from Gemini 3.1 Pro audio analysis (AI Studio, run by user). Hidden post-deploy: James, Ellen, Zam Grifon voice, NEIL MAGLAYA NEW VOICE — all correctly suppressed. See `agent_lessons.md` 2026-05-04 entry for why allowlist must be the default for any shared-account multi-tenant resource.

Note: the `localStorage.grifon_admin` key is **still in use** by `Dashboard.tsx:440,463` as an admin-only preview switch for the MORE MODULES section (7 in-progress modules). Do not advise users to remove it — see `agent_lessons.md` 2026-05-04 entry for the regression that taught this.

Dev-quality follow-up shipped same session: `vite.config.ts:97` env loader guard dropped so `.env` edits are picked up on every config reload (see `agent_lessons.md` 2026-05-04 entry).

**Part 4 — Per-user daily quotas + voice cloning UX polish** (commit `5855fb3`, shipped same evening):

1. **Cost firewall — per-user daily TTS/STS/clone quotas, plan-tier-aware.** Closes Open Follow-up #1 from earlier in this same session. Approach: kept request-count caps (not character-cost) to avoid an SQL migration; the existing `rate_limit_check` RPC handles variable limits per call, so per-tier limits drop in by passing the tier-resolved number. New: `api/_lib/userPlan.ts` (server-side plan lookup from `subscriptions` table, defaults to free for missing/cancelled), `api/_lib/quota.ts` (per-tier `TTS_DAILY` / `STS_DAILY` / `CLONE_DAILY` maps + `peekQuota()` read-only helper for the budget endpoint), `api/elevenlabs/budget.ts` (GET endpoint returning per-bucket `{used, limit, remaining, resetSeconds}`). Daily checks added to `text-to-speech.ts`, `speech-to-speech.ts`, and `voices/clone.ts` after the existing per-minute throttles. UI: `// X_LEFT_TODAY` indicator in Signal Modulator header reflecting the active tile's bucket, color-shifts gold/red as it depletes, refreshed via `onUsageReported` callback fired by tiles after every synth/regen/clone. Limits per day: free 3/2/0, creator 20/15/2, pro 60/40/5, business 150/100/10 (TTS/STS/clone). Edit `api/_lib/quota.ts` to retune.

2. **Tier-aware voice slots.** `MAX_VOICES_PER_USER` (fixed 2) replaced with `VOICE_SLOTS` map: free 0, creator 1, pro 3, business 5. Cap is intentionally conservative because ElevenLabs Starter has 10 total slots workspace-wide and ~5 are already held by the admin-curated Filipino library. One Business user filling 5 slots and one admin clone consumes the remaining capacity. Upgrading the ElevenLabs tier (Creator/Pro plan on the ElevenLabs side, not Grifon) raises the global ceiling. Slot meter in cloning tile UI now reflects the real plan cap.

3. **Voice cloning UX polish.** Consent paragraph bumped from 10px zinc-300 → 12px zinc-100 (legal text needs to be legible); `// CONSENT_REQUIRED` label switched to gold for legal-importance signal; sample-guidelines bullets bumped from 10px zinc-500 → 11px zinc-300.

4. **Audio player hardening.** Native `<audio>` playback-speed control was a UX trap — changing speed in the player only affected playback, not the downloaded file (downloaded file was always 1x). Added `noplaybackrate` to `controlsList` on both TTS and Voice Changer audio elements (alongside the existing `nodownload`). If real users want pacing control, the right primitive is the inline `[slow]` / `[fast]` ElevenLabs delivery tags already wired in `TTS_TAGS`.

5. **SAVE button per take in `// LOG` drawer.** Each session-history entry now has a download action using the same `downloadAudio()` branded-filename helper as the main DEPLOY AUDIO. Lets users save older takes without restoring them first.

### Open follow-ups (non-blocking, prioritized)

1. ~~**Per-user daily/monthly TTS quota**~~ — **CLOSED 2026-05-04 in commit `5855fb3`.** Shipped Option A (request-count caps per tier, not character-cost) — see Part 4 above. Open question for follow-up if telemetry shows users gaming the cap with max-length scripts: upgrade to character-cost daily budgets (would require a new SQL function `rate_limit_consume_cost` and ~half-day of work).
2. **Form state lost on Signal Modulator tab switch** — switching TTS↔VC unmounts the inactive tile, so typed scripts evaporate. Restore-from-history is the workaround. Fix would lift form state to parent or always-mount both tiles. Low priority; flag if real users complain.
3. **Vite HTML-proxy cache flake** — local builds (`npm run build`) intermittently fail on first invocation with `[vite:html-inline-proxy] Could not load index.html?html-proxy&inline-css&index=0.css`. Always succeeds on retry. Suspect Windows + Vite 5 + index.html inline `<style>` interaction. Vercel CI builds clean (different env, no leftover `.vite` cache). Worth investigating if it ever bites a deploy; benign for now.
4. **Vite dev: Windows case-insensitive routing serves `App.tsx` for `/app`.** Discovered 2026-05-04. On Windows, navigating directly to `localhost:PORT/app` makes Vite serve the transformed `App.tsx` JS module instead of `index.html` (case-insensitive filesystem matches `/app` to `App.tsx` before SPA fallback kicks in). Workaround: navigate to `/` first, let the in-app router take you to `/app`. Vercel prod is unaffected (proper SPA fallback). Latent dev-only bug; only affects Windows devs hitting `/app` directly.

## Status as of 2026-05-02 (evening update)

**All 7 launch gates are CLOSED.** Site is live at https://app.grifon.ai. Test-mode billing now fully proven end-to-end on prod (checkout → PayMongo → webhook → Supabase row → UI tier upgrade). Only outstanding item to take real money is the PayMongo live-key cutover (Gate 3-prod below).

Today's session shipped two fixes, both deployed:
- `5c6525a` — Upgrade buttons (top banner + profile dropdown) had no `onClick`; now route to `/pricing`
- `23fac77` — dropped dead `{CHECKOUT_SESSION_ID}` placeholder from PayMongo `success_url` (Stripe syntax PayMongo doesn't substitute)

Plus three Vercel config changes (no commit): added PayMongo test env vars, changed `APP_URL` to `https://app.grifon.ai`, and registered test webhook in PayMongo dashboard at `https://app.grifon.ai/api/webhook` for `checkout_session.payment.paid`. See [paymongo_webhook_setup.md](../../.claude/projects/c--Users-Administrator-Downloads-grifon-command----your-ai-marketing-team/memory/paymongo_webhook_setup.md) memory for the gotcha that cost ~30 min of debugging.

## Readiness Gates

### Gate 1: App works (no crashes) — CLOSED 2026-04-23
- [x] `SignalModulator` voiceService crash fixed
- [x] `GenerateVideo` submit handler implemented
- [x] Error boundaries around each module (`App.tsx:16` wraps every route)
- [x] Gemini API key no longer throws at import
- [x] Director AI rules-of-hooks crash fixed (state hoisted to top level — `App.tsx:87`)

### Gate 2: Real auth — CLOSED 2026-04-18
- [x] Plaintext `ACCESS_PASSWORD` removed from `App.tsx`
- [x] `ALLOWED_EMAILS` hardcode removed
- [x] Supabase email/password login wired
- [x] Session persistence (refresh doesn't log out)
- [x] Logout button in Dashboard profile dropdown

### Gate 3-dev: Billing wired (test mode) — CLOSED 2026-04-23
- [x] PayMongo hosted-checkout integration: `api/checkout.ts`
- [x] Webhook with signature verification: `api/webhook.ts`
- [x] Subscriptions table updated on payment events
- [x] Checkout flow matches `GrifonPricingPage.tsx` tiers
- [x] PayMongo helper lib: `api/_lib/paymongo.ts`

### Gate 3-prod: Live billing cutover — IN PROGRESS
Test-mode plumbing fully proven on prod 2026-05-02 (E2E test purchase activated subscription row in Supabase). Live cutover blocked only on PayMongo merchant verification.

Live cutover steps (repeat the test-mode setup with live values):
- [ ] PayMongo dashboard: complete merchant verification (Philippine business registration required)
- [ ] PayMongo dashboard: flip to Live Mode
- [ ] Pull live `PAYMONGO_SECRET_KEY` (`sk_live_...`) — only this one is read by code (`api/_lib/paymongo.ts:6`); `PAYMONGO_PUBLIC_KEY` is stored but unused
- [ ] Update `PAYMONGO_SECRET_KEY` in Vercel → Settings → Environment Variables (Production scope)
- [ ] Register live webhook URL `https://app.grifon.ai/api/webhook` in PayMongo Live Mode dashboard, listening for `checkout_session.payment.paid`
- [ ] Copy live signing secret (`whsk_live_...`) → update `PAYMONGO_WEBHOOK_SECRET` in Vercel
- [ ] Redeploy (Deployments → ⋯ → Redeploy, no cache)
- [ ] Test purchase with a real card on Creator tier (₱997); confirm row in Supabase, then refund yourself in PayMongo dashboard

### Gate 4: Production-safe code — CLOSED 2026-04-23
- [x] Zod input validation in all Gemini + ElevenLabs + checkout API routes (8 endpoints)
- [x] Rate limiting wired via `rateLimitCheck()` in 10 API routes (sliding-window via Supabase RPC)
- [x] Webhook bodyParser disabled for raw signature verification
- [x] Cron cleanup for stale Gemini videos: `api/cron/cleanup-gemini-videos.ts`

### Gate 5: Mobile responsiveness — CLOSED 2026-04-23
- [x] Dashboard upgrade banner padding fix for close-button overlap (`Dashboard.tsx:146`)
- [x] Director AI hook-branch crash fix (`App.tsx:87`)
- [x] Footer logo wired (`LandingPage.tsx:627`)
- [x] Legal page header logo wired (`LegalPageLayout.tsx:28`)
- [x] Wall-of-Proof carousel: 3-col grid → 9:16 swipeable cards w/ snap-proximity (`LandingPage.tsx:155-200`)
- [x] Phone-verified live on preview before promotion
- Open follow-ups (P1/P2/P3 from original 15-finding mobile audit deferred — non-blocking)

### Gate 6: Domain + hosting — CLOSED 2026-05-02
- [x] `grifon.ai` purchased (via Vercel registrar)
- [x] `app.grifon.ai` DNS + SSL (auto-provisioned by Vercel)
- [x] Production build deployed (Vercel project `grifon-command` linked to GitHub `yopiheart/grifon-command`, branch `main`)
- [x] Env vars set in host (Supabase, Gemini, ElevenLabs, APP_URL, APP_ENV=production, GRIFON_VOICE_CLONING_ENABLED=false)
- [x] Verified live: landing loads, auth works, session persists, Gemini AI generates, logout works
- Open follow-ups (non-blocking):
  - Vercel billing address incomplete — fix in Vercel → Settings → Billing → Update Address
  - ~~ICANN email verification for `grifon.ai`~~ — DONE 2026-05-04 (verified before deadline)
  - SignalModulator voice list — confirm whether empty list = no voices on ElevenLabs vs API failure

### Gate 7: Legal — CLOSED 2026-04 (effective date 2026-04-20)
- [x] Terms of Service (`components/TermsOfService.tsx`, 160 lines, Haste Enterprises / Republic of the Philippines)
- [x] Privacy Policy (`components/PrivacyPolicy.tsx`, 135 lines, covers Gemini data handling)
- [x] Refund Policy (`components/RefundPolicy.tsx`, 88 lines)
- [x] Support page (`components/Support.tsx`, 77 lines)
- All 4 share `LegalPageLayout` and have routes in `App.tsx`

## How to use

1. After every session that closes a gate, update this file's checkboxes IN THE SAME SESSION before clearing context.
2. The `git log` is more authoritative than this file — when in doubt, check what code actually shipped.
3. Treat this file as a *summary* of completed work, not a source of truth. Source of truth = the code.
