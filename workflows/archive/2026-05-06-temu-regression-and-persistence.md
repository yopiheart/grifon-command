# Archive: 2026-05-06 — TEMU+TESTIMONIAL regression + wizard state persistence

**Session theme:** Run 1 (TESTIMONIAL) partial — completed through Step 6 thumbnail, auth expired before Step 7. Run 2 (TEMU) not started. Pivot: enough signal captured to stop and address the surfaced bugs first; resume TEMU run after fixes. Then in the evening: shipped wizard state persistence to close the JWT-expiry-loses-state regression.

**Pre-flight verified clean:** Steps 7/8 code paths verified end-to-end against the 208ba1a build (script render path, thumbnail no-crop, EXPORT_BUNDLE, GENERATE_VIDEO_NOW deeplink wiring, CLEAR_SESSION pill). All 5 pending criteria from 2026-05-05 confirmed at the code level. Build green: 2237 modules, 5.59s.

## Code shipped (morning, single edit)

- **ImageModal portal fix** ([components/ui/ImageModal.tsx](../../components/ui/ImageModal.tsx)) — wrapped return JSX in `createPortal(..., document.body)` plus `import { createPortal } from 'react-dom'`. Root cause: the wizard main panel at [App.tsx:511](../../App.tsx#L511) has `backdrop-blur-xl`, which per CSS spec creates a new containing block for fixed-positioned descendants. Modal's `fixed inset-0` was being scoped to that 9-scene-tall panel instead of the viewport, opening off-screen when the user clicked images on Scene 7+ of a long storyboard. Portal escapes the containing-block trap. **Confirmed working in browser by user.**

## TESTIMONIAL Run 1 — observations

**What worked (validated, no regression vs MrBeast):**
- ✓ Avatar appearance consistency across Scenes 2 + 8 — face, wardrobe, hair, spot all locked. IDENTITY_LOCK + APPEARANCE_LOCK_RULE + ENVIRONMENT_SYNC firing correctly. The wiring fix from 2026-05-05 holds for TESTIMONIAL.
- ✓ Spot variation — kitchen / dining / counter inside one residence (ENVIRONMENT_SYNC working).
- ✓ Body copy quality — solid Taglish testimonial structure, named pain, transformation arc.
- ✓ Director Critique — coherent strategic reasoning ties to features + pacing.

**What's broken (system-level bugs surfaced — affect every formula, not just TESTIMONIAL):**

1. **P0 — `AVATAR_CAMERA_ANGLES` applied unconditionally to b-roll scenes.** Scene 7 (coffee close-up b-roll) generated a hallucinated woman's face — non-Filipino, not in prompt — because the talking-head "intimate close-up" angle was injected into a non-avatar scene at variationIndex 0/6. Scene 2 + Scene 8 also locked into side-profile/non-camera angles when the script intent (intro "Hi, ako si Mark" / CTA "nodding confidently") clearly called for camera-facing. The parked item from 2026-05-05 ("Separate BROLL_CAMERA_ANGLES menu") is no longer parkable — beta has surfaced the symptom. Fix paths: (a) intent-aware angle selection (intro/CTA scenes always face camera), (b) split the angle pool by scene type (avatar-talking vs avatar-action vs product-broll), (c) script-level flag that overrides rotation. **CLAUDE.md-tuned area, needs re-grill before changing.**

2. **P0 — Logo/text rendering on Gemini Flash Image.** Step 6 thumbnail rendered a kraft coffee bag with garbled letters: "Coffee TWEN LADET FOUM BET KEVU LIKE" / "TIPID LANG" — hallucinated text mimicking logo shapes. Same root cause as 2026-05-05 Scene 9 logo strip. Model-level limitation; Gemini Flash Image's diffusion pipeline cannot reliably preserve typography. **Three real fix paths:** (a) post-process logo overlay — composite user's actual uploaded logo onto generated images, perfect text + zero per-image cost increase, ~2-3 days build; (b) hybrid model — gpt-image-1 for thumbnails + branded shots only (~$0.19/image vs Gemini's $0.04), ship as Pro+ tier perk; (c) UI affordance for manual logo overlay by user post-generation. **CMO call already locked: defer to Pro+ tier upgrade post-beta. Beta documents this as a known limitation; users use logo-free hero shots in the wizard for now.**

3. **P0 — Hand hallucination on multi-prop shots.** Scene 4 (product shot) added a woman's hand not in prompt. Step 6 thumbnail showed three hands holding mug + 2 coffee bags. PRODUCT_IDENTITY_LOCK at [services/geminiService.ts:1451-1458](../../services/geminiService.ts#L1451-L1458) explicitly enforces "anatomical accuracy (2 hands, 5 fingers each)" — model violates its own rule on multi-prop compositions. **Tuned area; needs re-grill or accept as Gemini Flash Image limitation.**

4. **P1 — Start/end frame product continuity.** Scene 1 hook end-frame: white ceramic mug → black mug. Prompt explicitly said "same mug" but start and end frames are independent generation calls (`variationIndex` vs `variationIndex + 100`), so they share no continuity reference. Same drift class as character drift, applied to props.

5. **TRANSIENT — PROXY_TIMEOUT on Scenes 3 + 6.** Gemini infra blip; the 55s ceiling at [services/geminiService.ts:25](../../services/geminiService.ts#L25) fired correctly (5s safety margin under Vercel's 60s hard cap). REGEN unblocks. Not a code bug.

**TESTIMONIAL prompt issues (script tuning, lower priority):**
- Hooks intermittently dump into `body` array instead of `hook1`/`hook2` — REGENERATE worked on second roll, suggests Testimonial structure's `0.` numbering for Hook (vs MrBeast's `1.`) confuses the parser. Probabilistic flake.
- LANGUAGE_LOCK violation: "barista level kape" — direct violation of the `[geminiService.ts:697-702](../../services/geminiService.ts#L697-L702)` rule that maps "cafe-quality goodness → parang barista ang lasa." Model wrote exactly the thing the rule forbids.
- Tagalog grammar drift: "matabang kape" missing linker "na" → should be "matabang **na** kape."
- Forced English-Tagalog hybrid: "ro-roast" → not natural Tagalog; should be "i-roast" or "na-roast."
- Voice mismatch: "nila" (third-person plural) in first-person testimonial line.

## UX bugs surfaced

- **P0 — No wizard state persistence.** Auth expired mid-Step 7, forced re-auth wiped wizard state (in-memory React state in App.tsx, never persisted). User lost ~12 Gemini calls of generation. Quotas already consumed; state loss = paid credits worthless. Closed in evening ship — see below.

- **P0 — Failed-scene retry gap.** REGEN button at [Step5Storyboard.tsx:478](../../components/Step5Storyboard.tsx#L478) only renders when `(scene.imageUrl || scene.endFrameImageUrl)` exists. When a scene fails to generate (PROXY_TIMEOUT, etc.), there's no per-scene retry button — user must hit GENERATE_ALL (which works as workaround: skips scenes with `imageUrl`, retries failures). Fix: drop the `imageUrl` requirement from the conditional, change button label to `GENERATE` when no image, `REGEN` when image exists. ~5-line edit.

- **P0 — Long-session JWT expiry handling.** Hit twice in one session. Supabase JWT defaults to 1-hour TTL; refresh token also expires. `getSession()` returns the expired token, server rejects with 401, user gets PROXY_ERROR_401. **Fix paths:** (a) bump Supabase JWT TTL in dashboard (no code, but security trade-off), (b) proactive `sb.auth.refreshSession()` poll every ~50 minutes, (c) global error boundary catching `PROXY_ERROR_401` → show re-auth modal → preserve wizard state → retry call. **Recommended: (c) + state persistence above. Together they make any auth interruption invisible.**

- **P1 — Step 6 thumbnail tile aspect mismatch.** Tile container aspect doesn't match the user's `aspectRatio` selection, so 9:16 thumbnails get vertical letterbox (zinc-950 black bars left/right) inside a wider container. Yesterday's `object-cover → object-contain` fix at [Step6Thumbnail.tsx:92-99](../../components/Step6Thumbnail.tsx#L92-L99) prevented cropping but exposed the aspect mismatch. **Fix:** match Step 8's pattern at [Step7FinalOutput.tsx:46](../../components/Step7FinalOutput.tsx#L46) — pick `aspect-[9/16]` for 9:16, `aspect-video` for 16:9. ~5-line edit.

## Logo/text rendering — locked decision

CMO call locked, do not relitigate without new data: **stay on Gemini Flash Image for beta. Defer gpt-image-1 to Pro+ tier as a paid upgrade.** Document the text-rendering limitation publicly; tell beta users to use logo-free product hero shots. The hybrid model architecture (gpt-image-1 for thumbnails/branded shots only) becomes a Free→Pro conversion driver, not a beta blocker.

---

## Wizard state persistence shipped (2026-05-06 evening)

**Status: built + tsc/build green + dev server up on :5174. Smoke testing deferred to next session, then PASSED.**

### What shipped (uncommitted at first, smoke-tested next morning)

- **New file:** [services/wizardSessionStore.ts](../../services/wizardSessionStore.ts) — thin IndexedDB wrapper, ~80 LOC, no new deps. Three exports: `getSession(userId)`, `setSession(userId, blob)`, `clearSession(userId)`. Single object store `sessions` in DB `grifon_wizard`, keyed by Supabase `user.id`. Session blob shape is the exported `WizardSessionV1` interface; schema-versioned (`version: 1`); version mismatch on read returns null (silent overwrite path for future migrations).

- **Edited:** [App.tsx](../../App.tsx) — additions only, no removals:
  - `userId` state captured from both `getSession()` and `onAuthStateChange()`.
  - **Load useEffect** — fires when `userId` lands; reads IndexedDB → `pendingSession` state.
  - **Auto-restore-decision useEffect** — once load finishes, marks `hasRestored=true` if no saved session OR if user already started fresh wizard work (in which case the saved record is cleared).
  - **Debounced save useEffect** (500ms) — writes `WizardSessionV1` blob on any wizard state change. Suppresses writes while wizard is pristine. Wraps in try/catch; once-per-session sonner error toast on quota/transaction failure.
  - `handleLogout` — explicit logout calls `clearSession(userId)` before `signOut`. Auth-expiry path doesn't hit `handleLogout`, so saved state survives JWT timeout (the original bug from the morning's TESTIMONIAL run).
  - `resumeSession` / `declineSession` handlers.
  - **Resume pill** above StepIndicator inside wizard `<main>`. Shows `// PREVIOUS_SESSION_DETECTED — STEP_NN_OF_08 — BRAND_NAME`. `[ START_FRESH ]` ghost + `[ RESUME ]` GoldButton.
  - **Spinner gate** `// LOADING_SESSION...` while initial IndexedDB read resolves.
  - On resume: sonner banner `// SESSION_RESUMED — STEP_NN_OF_08`, 6s duration.

### Locked design decisions (via grill-me)

| # | Decision | Locked |
|---|---|---|
| 1 | Scope | Wizard-only (10 fields + currentStep). Cinematic Studio state excluded — separate Dashboard module, different failure economics. |
| 2 | Library | Thin custom wrapper, no dep. Native IndexedDB API. |
| 3 | Per-user key | Supabase `user.id` (UUID, stable across email change, lower PII surface). |
| 4 | Restore behavior | Jump to saved currentStep + sonner banner. StepIndicator's existing back-nav handles "review my earlier inputs." |
| 5 | Save trigger | Single debounced useEffect (500ms) + `hasRestored` state guard. |
| 6a | Pristine check | `currentStep === 1 && !brandName && !product && script === null`. |
| 6b | Pill placement | Inline above StepIndicator (not toast, not modal). |
| 7a | Logout | Explicit logout clears IndexedDB; auth-expiry preserves it. |
| 7b | Write failures | try/catch + console.warn always + sonner once-per-session. |
| 7c | Schema | `version: 1` field; mismatch = silent overwrite. |
| 7d | Initial load | Spinner gate inside wizard `<main>`. |

### Known caveats / what this does NOT solve

- **JWT auto-refresh + 401 error boundary not yet shipped.** Without it, an expired JWT still throws PROXY_ERROR_401 mid-call; persistence preserves state but the user still sees an error and has to manually re-auth, then click `[ RESUME ]`. Pairs with this; the recommended next ship.
- **Cinematic Studio state not persisted.** Out of scope per design lock #1. Add later under same DB with a `version: 2` upgrade path if it bites.
- **Smoke test pending at first.** Build green (2238 modules, 6.66s after cache wipe — html-inline-proxy flake hit; documented `Remove-Item node_modules/.vite, dist` remediation worked). Smoke test was completed next morning — all 8 tests + bonus Step 8 reload PASSED.

### Smoke test plan that was run

Open `localhost:5174/` (NOT `/app` directly — Windows case-insensitive routing serves App.tsx as JS). Sign in.

1. **Pristine + no saved record** — Click Director AI. Spinner flashes. No pill. No console errors.
2. **Autosave fires** — Type brand name on Step 1. Wait 1s. DevTools → Application → IndexedDB → `grifon_wizard` → `sessions`. Row exists keyed by user.id with `clientDetails.brandName` matching.
3. **Resume pill on hard reload** — F5. Click Director AI. Spinner → resume pill: `// PREVIOUS_SESSION_DETECTED — STEP_01_OF_08 — BRAND`. Step 1 inputs still pristine (no auto-restore).
4. **RESUME hydrates state** — Click `[ RESUME ]`. Brand name appears. Sonner: `// SESSION_RESUMED — STEP_01_OF_08`. Pill gone.
5. **START_FRESH clears record** — F5. Pill appears. Click `[ START_FRESH ]`. Pill gone. IndexedDB row deleted.
6. **Multi-step jump** — Fill Step 1, Next to 2, fill product, Next to 3. F5. Pill says `STEP_03_OF_08`. Resume → lands on Step 3 (not Step 1). StepIndicator back-nav shows Step 1+2 data intact.
7. **Explicit logout clears** — Logout via dropdown. Sign back in. Click Director AI. No pill. IndexedDB row gone.
8. **Image-bearing payload survives reload** — Generate avatar (Step 4) + at least one storyboard scene (Step 5). F5. Resume. Avatar + scene image render without re-generation. No quota toast.

## Documented behavioral lessons from this session

Worth folding into `agent_lessons.md` if it bites again, but not blocking:
- **Wiring bugs masquerade as content bugs.** The Bucket B IDENTITY_LOCK rewrite (2026-05-05) was content-correct but never executed because `Step5Storyboard.tsx` wasn't passing `referenceImageMode`. Diagnosis path: when prompt edits don't produce expected output, grep call sites for the gated parameter before iterating on prompt text. The `generateSceneImage` signature has 11 positional args; only `InfluencerForge.tsx` was passing them all.
- **Vite html-inline-proxy first-build flake remediation:** wipe `node_modules/.vite` + `dist`, then retry. The "second invocation passes" recipe is unreliable; the cache wipe is deterministic.
