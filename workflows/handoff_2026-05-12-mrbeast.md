# Handoff — 2026-05-12 MrBeast Smoke-Test Session

**Created so the next-session agent has durable context after the cafe-PC reboot wipes `~/.claude/`.**

---

## Where we are

- **Branch:** `combined-preview`
- **HEAD:** `d511643` (pushed; matches `origin/combined-preview`)
- **Status vs `main`:** 71 commits ahead. **Beta-merge gate is Neil's pending decision.**
- **Live test status:** Phase 4 fully validated through two end-to-end MrBeast wizard runs on the Monat Hydrate & Refresh Face Mist (Filipina avatar, office setting). Two SCENE 02 renders frame-graded via Playwright MCP:
  - Pre-4e (Veo 3.1 Fast, 6s, old talking template): **speech started at t≈1.9s** → 1.5s of pre-speech dead air
  - Post-4e (Veo 3.1 Lite, 6s, FRAME 0 RULE talking template): **speech started at t≈0.5s** → ~1.4s dead air reclaimed
  - Post-4g (Veo 3.1 Lite, 4s, full Phase 4g stack): speech immediate, script ends at ~3.5-4s, **smart-duration auto-picked 4s correctly**

---

## What shipped this session

| Phase | Commit | Summary |
|---|---|---|
| 4a-c | `7f65a78` | Cost guardrail + diagnostic logging (`[grifon:gv:click/proxy/submit]` with correlated requestId), smart-default duration heuristic + AUTO badge + hint line, library dedupe (`useMemo` by `(sceneIdx, prompt)`) + `Nx` variant counter pill |
| 4d | `b66a274` | IndexedDB resume for in-flight renders — same-device disconnect/tab-close/reboot resilience via `services/activeJobStore.ts`. New `resumeVideoOperation()` + `pollUntilDone()` helpers in `geminiService.ts`. RunQueueOpts gains `userId`. Resume effect on GenerateVideo mount |
| 4a fix | `8cb6590` | False-positive fix: match scene checkmark + guardrail intercept on `(sceneIdx, prompt)` not just `sceneIdx`, so a fresh wizard run doesn't falsely fire against a prior storyboard's renders |
| docs | `3edbdf9` | First 3 post-beta roadmap entries: MarketMind reuse UX, product scale anchoring, avatar emotion-vs-identity dial |
| 4e | `24d436c` | **TUNED-FILE EDIT.** Talking template `OPTION B` in `generateVideoPrompts`: added `FRAME 0 RULE (CRITICAL)` — "avatar is ALREADY mid-syllable when the clip opens." Stripped pre-speech setup phrasing ("initially resting", "As they speak"). Goal: reclaim 1-2s of pre-speech dead air. **Validated by frame grade — 1.4s reclaimed.** |
| 4f | `938db9d` | Regenerate button on Step 7 Video Prompts so users can re-run `generateVideoPrompts` without rebuilding the storyboard. Also enables A/B testing prompt-template changes |
| 4g | `96abaa1` | Four follow-up fixes after Phase 4e smoke: (g.1) restored camera physics directives in talking template — Neil flagged that dolly/parallax/rack-focus is the viral-formula engagement hook; FRAME 0 RULE kept, camera physics added back with "CAMERA MOVE BEGINS WITH FIRST SYLLABLE — never before" reframe. (g.2) Tightened smart-duration buffer 0.8s → 0.3s after evidence that 9-word Taglish actually runs ~4s, not ~4.4s. (g.3) DONE badge clipping — `top-1.5/right-1.5` → `top-2/right-2 + z-10`. (g.4) Added Delete button to library tiles (red-tinted Trash2 icon next to Download + Use Prompt) |
| 4h | `fee9a81` | Final polish pre-merge: (h.1) default model Veo 3.1 Fast → **Veo 3.1 Lite** for beta cost-control. (h.2) **New server-side delete endpoint** `api/gemini/video/delete.ts` using `supabaseAdmin` (service role) + path-prefix ownership check — fixes client-side `storage.remove()` silently failing on RLS denial. Retrofits Phase 4a Replace flow to use the same endpoint. (h.3) StatusBadge restyled with bold 2px borders + white text on done/failed + slight green glow. (h.4) Auto-load `Scene.endFrameImageUrl` as the END frame for any scene that has it. (h.5) Filed CTA parity audit as roadmap item #6 — grep confirmed MRBEAST and TESTIMONIAL CTAs are *structurally identical*, only tone framing differs |
| 4h.4 fix | `d511643` | Corrected end-frame logic — was wrongly piping `storyboard[1].imageUrl` (next scene's start) as SCENE 1's end-frame; fixed to `storyboard[activeIdx].endFrameImageUrl` (the scene's OWN end image from the storyboard step). Now SCENE 1's hook-end shot auto-loads correctly |

---

## Best next thing

**Neil's decision: pick ONE of (a) (b) or (c) below — they're sequenced this way for a reason.**

### (a) Beta-merge — 71 commits to `main` (~5 min, ZERO new credits)

```bash
git checkout main
git merge combined-preview
git push
```

Greenlit. Every smoke test passed in the prior session. Phase 4 delivers the full cost-control story for the redesigned Generate Video module (guardrail, smart duration, dedupe, resume, FRAME 0 RULE, delete fix, Scene 1 end-frame). Until this merges, beta users can't see any of it.

### (b) Phase 5 — Vertex AI migration (1-2 days)

Originally planned next phase. Unlocks:
- **Native audio generation** (Veo 3.1 audio gen — currently hidden behind `audioEnabled: false` per `services/geminiService.ts:357`)
- **Lifts the per-(model, resolution) duration locks** — Veo 3.1 Lite gets 1080p + 4s/6s on Vertex (today locked to 8s on Gemini API)
- **4k resolution chip** on Quality model
- Higher per-call cost than Gemini API Veo

Scope:
1. Service-account JSON auth flow (`GCP_SERVICE_ACCOUNT_JSON` env var)
2. SDK swap: `@google/genai` (API key) → `@google-cloud/vertexai` (service account)
3. Re-enable audio toggle UI in Generate Video (hidden today per Phase 1)
4. Lift duration whitelists in `VIDEO_MODEL_SPECS`
5. Unlock 4k chip
6. Smoke test full 9-scene RENDER ALL with audio
7. Compare audio quality vs Gemini API renders

Risk: changes the upstream provider for ALL Veo calls. Defense-in-depth from Phase 4a (guardrail + diagnostic logs) caps double-render blast radius if it recurs on the new provider.

### (c) Quick post-beta polish — pick from the roadmap (~20-60 min each)

[workflows/post_beta_roadmap.md](post_beta_roadmap.md) has 6 entries. The ones surfaced THIS session:

| # | Item | Scope | Why it's a quick win |
|---|---|---|---|
| 3 | MarketMind/Offer Optimizer "Reuse last research" UX | ~1-2h | Pure localStorage + UI; data already persists, just no surface to re-load it |
| 4 | Product-scale hints (Step 2 description + Step 1 hero upload) | ~20 min for mitigations 1+2 | Buyer-trust protection. Pure copy change |
| 5 | Avatar emotion vs identity-lock tradeoff | ~1 day, gated by Vertex | Tuned-prompt edit, needs Phase 5's finer control surface — defer |
| 6 | **MrBeast CTA parity audit** | ~30-50 min | Gated by Neil pasting 2 real CTAs (same product, both scriptTypes). Then A/B + propose tone-directive edit if real gap |

**My recommendation for (c) if Neil wants a quick morale win before Vertex:** ship item #4 (product-scale hints) — 20 min, materially reduces the "ad-looks-bigger-than-product" complaint risk. Item #6 (MrBeast CTA) is the next-most-impactful but requires Neil providing inputs.

---

## Pending items (carryover punch list)

### P0 — Beta-merge gate

Neil's call. Documented in (a) above. Bundle is green-lit.

### P1 — Phase 5 Vertex AI migration

Multi-session work. See (b) above. Renames pending: original "Phase 4 — Real Kling 3.0" was bumped to **Phase 6** in this session's planning; **Vertex is now Phase 5**.

### P2 — Double-render bug still un-root-caused

Three Explore-agent sweeps couldn't pinpoint a code path. Top hypotheses (state race in mode-switch, resolution auto-clamp setState stack, async compression promise race) remain. **Diagnostic logging (`[grifon:gv:click/proxy/submit]` + correlated `requestId`) is now in place** — the next time the double-render fires in real use, the logs will reveal:

- Two `:click:` lines → UI double-fire (tighten `busy` check)
- One `:click:` + two `:proxy:` with **different** resolutions → config-state race (snapshot config at click time)
- One `:click:` + two `:proxy:` with **same** resolution → server-side fan-out

The Phase 4a cost guardrail caps blast radius (user must explicitly confirm Replace or Add Variant) regardless of which hypothesis is real.

### P2 — Post-beta roadmap items

All 6 entries in [workflows/post_beta_roadmap.md](post_beta_roadmap.md). The fresh entries from this session are #3-#6. Items #1-#2 (nightly regression loop, Odyssey-as-Cron Autopilot tier) carry over from prior sessions.

---

## Cafe-PC reboot reality

- All commits on `combined-preview` pushed to `origin` — durable across reboot.
- Branch is `combined-preview`, NOT `main`. `main` is 71 commits behind.
- `node_modules/` may be missing → `npm install`.
- Dev server: `npm run dev` (lives on `:5174` or `:5175` if `:5173` is taken — prior session bound to `:5175`).
- `.env` `GEMINI_API_KEY` confirmed present in prior session.
- If `git commit` fails with "Author identity unknown" → `.\scripts\restore-git-identity.ps1` (established pattern, ran cleanly in prior sessions).
- The 20+ untracked `.png` debug screenshots and `.playwright-mcp/` dir die with the reboot — no commit needed, they're debug artifacts.
- `package-lock.json` had an npm-dedup edit that wasn't committed (orphan `@types/react` removal) — unrelated to any Phase 4 work; safe to ignore or `git checkout package-lock.json` to reset.
- `~/.claude/plans/logical-nibbling-hinton.md` dies on reboot. **This handoff doc is the durable record.**

---

## Key insights from this session

1. **Pre-speech dead air was prompt-engineered, not a Veo quirk.** The talking template literally said *"initially resting their chin on their hand"* and *"As they speak"* — Veo rendered that pre-state beat faithfully. Stripping those phrases (Phase 4e FRAME 0 RULE) reclaimed 1.4s of useful frame time. **Lesson: when output has temporal padding, audit the prompt before blaming the model.**

2. **Smart-duration calibration needs empirical iteration.** Initial `words/2.5 + 0.8s` buffer over-predicted; tightening to `+ 0.3s` snapped to the right valid duration. The wpm constant (2.5 for Taglish) and buffer are now calibrated against MrBeast SCENE 02 evidence — if other scriptTypes / languages produce different pacing, the heuristic needs another pass.

3. **Supabase Storage `.remove()` does NOT throw on RLS denial** — it returns `{ data, error }`. Phase 4g.4's delete button silently failed in production for this reason. **Always inspect `error` field on Supabase client calls, OR route through a service-role server endpoint.** The Phase 4h.2 fix is the latter (more robust to future RLS policy changes).

4. **Identity-lock dominates over per-scene emotional cues in current talking template.** Neil's MrBeast SCENE 02 prompted *"looking tired with brow slightly furrowed"* — render showed the avatar at normal alertness with only a slight furrow. The IDENTITY_LOCK directive is load-bearing for cross-scene consistency, but it suppresses Veo's response to emotional state directives. **Filed as roadmap item #5** — won't fix until Vertex gives finer control surface (Phase 5).

5. **Product scale is a generative-video industry limitation.** 100ml Monat bottle rendered ~2× actual size in Scenes 5/7. Same issue on every Veo / Higgsfield / Flow / Kling output. Cheap mitigations exist (Step 2 size-description hint + Step 1 hero upload context-shot hint) — filed as roadmap item #4. Bigger fix requires explicit reference-image scale anchoring at storyboard-prompt time.

---

## Opening prompt for the next session

Paste this into the next conversation's first message:

```
Continuing from 2026-05-12 MrBeast smoke-test session.

Branch: combined-preview HEAD d511643 (pushed, 71 commits ahead of main).
Read FIRST: workflows/handoff_2026-05-12-mrbeast.md (full session context).

Top-line summary:
- Phases 4a–4h all shipped + validated through MrBeast SCENE 02 frame grades.
- Talking-template FRAME 0 RULE (Phase 4e) reclaimed ~1.4s of pre-speech dead air. Smart-duration auto-picks 4s correctly for typical Taglish scripts (Phase 4g.2). Server-side delete endpoint fixes Supabase RLS gap (Phase 4h.2). Default model is now Veo 3.1 Lite for beta cost-control.
- Bundle is greenlit for beta-merge. 71 commits ready.

Best next thing — Neil chooses ONE:
1. BETA-MERGE: `git checkout main && git merge combined-preview && git push` (~5 min, 0 credits). Documented in the handoff. Don't auto-execute — Neil decides timing.
2. PHASE 5 VERTEX AI MIGRATION: 1-2 days. Unlocks native audio gen, lifts duration locks, 4k chip. Originally-planned next phase.
3. QUICK POLISH from workflows/post_beta_roadmap.md: item #4 (product-scale hints, ~20 min) is the cheapest morale-booster; item #6 (MrBeast CTA parity audit) is gated by Neil pasting 2 real CTAs side-by-side.

P2 carryover: double-render bug still un-root-caused — diagnostic logs in place, will reveal hypothesis on next reproduction. Guardrail caps blast radius.

Cafe-PC reboot reminders:
- node_modules may need reinstall, dev server: npm run dev (port :5174 or :5175 if 5173 taken).
- If git commit fails: .\scripts\restore-git-identity.ps1
- .env GEMINI_API_KEY confirmed present in prior session.
- ~20 untracked .png screenshots + .playwright-mcp/ are debug artifacts, ignore.

DO NOT auto-execute the beta-merge — flag the gate one-liner when natural and let Neil call timing.
```
