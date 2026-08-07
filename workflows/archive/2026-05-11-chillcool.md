# Handoff — 2026-05-11 ChillCool Face Mist Session

**Created so the next-session agent has durable context after the cafe-PC reboot wipes `~/.claude/`.**

---

## Where we are

- **Branch:** `combined-preview`
- **HEAD:** `426c9bd` (pushed; matches `origin/combined-preview`)
- **Status vs `main`:** 61 commits ahead. Beta-merge gate is Neil's pending decision.
- **Live test status:** Phase 3 fixes verified end-to-end. SCENE 02 of ChillCool storyboard rendered successfully at Veo 3.1 Lite, 720p, 8s. The Phase 2 persistent library + Phase 3 inline loading state + per-resolution constraint enforcement + clean b-roll prompts all worked.

---

## What shipped this session

| Phase | Commit | Summary |
|---|---|---|
| 1 | `da28f4c` | Generate Video module redesign — retired the 3-column engine-rail layout in favor of scene-pipeline-first single-column input + history rail. Removed 3 placebo Kling buttons; locked Kling 3.0 + Seedance 2.0 Fast/Quality behind BETA tooltips. Hid audio toggle. Smart-throttled RENDER ALL queue. Storyboard images auto-anchor as start frames. |
| 2 | `a68af1d` | Big preview (Edit / Preview segmented control) + persistent video library via JSON sidecars in Supabase Storage + new `/api/gemini/video/library` endpoint + tile actions (Preview, Download, Use Prompt) + relative timestamps + hover-autoplay. |
| 3 | `426c9bd` | 6 fixes from Neil's ChillCool wizard run: header layout overlap, big-canvas loading state, per-(model, resolution) duration whitelist (default 720p), storyboard start-frame compression, stripped stale `[Model: Kling O1]` labels from b-roll prompts (tuned-file edit, Neil-approved), Market Research PDF export (was plain .txt). |

### Audit reference (Phase 1 source material)

CD-skill 6-step competitor audit captured 4 reference apps via Playwright:
- Higgsfield (left-column input panel + history rail; single model pill)
- Dreamina Seedance (centered single-input panel; workspace asset gallery)
- Flow / Google Veo (bottom-center prompt bar; 3 Veo variants in dropdown, all audio-capable on Vertex)
- Kling 3.0 (left input + right history rail; Multi-Shot Storytelling; settings collapsed to one chip; native audio toggle separate)

Pattern stolen: single-column input + history rail with click-to-preview tiles. Pattern skipped: Kling Multi-Shot (we have upstream storyboard), Flow Ingredients (we have Asset Bay).

---

## Best next thing (after reboot)

**Wait for Neil's video-watching skill, then run #1 + #2 below together.**

Neil promised to provide a skill that lets the agent view/evaluate rendered videos. Without that, we're flying blind on output quality. Once the skill is in place:

1. Pull recent renders from `/api/gemini/video/library` (already exposed)
2. Watch SCENE 02 (Neil's first ChillCool test render) — grade motion plausibility, identity-lock hold on the avatar, lip-sync if talking, label preservation, prompt adherence
3. If lip-sync wobbles, the **talking** prompt template in `generateVideoPrompts` (services/geminiService.ts:1318-1326) is the next tuning target — Phase 3e cleaned only the b-roll branch
4. Use observations to propose Phase 4 prompt edits (with explicit Neil approval per tuned-file rule)

If the skill is delayed: do #2 below instead so Neil has a richer library to evaluate when the skill lands.

---

## Pending items (carryover punch list)

### P0 — likely next session

- Use Neil's promised video-watching skill to evaluate rendered SCENE 02 + future renders
- Full **9-scene RENDER ALL** test on the ChillCool storyboard (only SCENE 02 verified end-to-end; need to confirm queue throttling fires at scene 6, all 9 complete cleanly, scene-image preservation holds across `'none'` / `'product'` / `'both'` reference types)

### P1 — Neil-decision

- **Beta-merge gate:** `git checkout main && git merge combined-preview && git push`. 61 commits / shared-state action. Not auto-executed. Could ship now (Phase 3 closed all known issues from the ChillCool run) or after the full 9-scene verification.

### P2 — post-beta (not blocking)

- **Real Kling 3.0 API integration** (Phase 4, 4-8h) — for SCENE 1 start→end frame hooks. Lifts the BETA lock and enables Kling-style frame-bridge transitions. Requires finding Kling's HTTP API or SDK, auth flow, polling, Supabase upload, error mapping. Auto-suggest engine per scene type after integration ships.
- **Vertex AI migration** (Phase 5+) — unlocks native audio (Veo 3.1 audio gen), 1080p + 4/6s on all variants (today: only Lite is hard-constrained; Vertex relaxes this), 4k everywhere. Blocked by service-account JSON auth flow + different SDK surface than the API-key flow we use today.
- **Video stitching** — combine 9 scene clips into one continuous ad. FFmpeg/WASM client-side OR server-side concat. Was a P0 candidate but deferred until 9-scene RENDER ALL is verified.
- **Library duplicate-detection / pagination** — Neil noticed two SCENE 02 entries (yesterday's + today's, identical prompts). Dedupe by sceneIdx+prompt similarity, OR keep all and add filter UI. Pagination needed beyond 100 items.
- **Test suite repair** — 10 of 27 unit tests fail because they assert prompt text in client fetch bodies, but post-crown-jewel-migration prompts live server-side.
- **Step 2 UX upload-dropzone hint** — "Best results: clean product shot on neutral background, label fully visible, no people in frame." (from Phase 6c learning).
- **`Step2BusinessInfo` useState(data) anti-pattern** — same bug as Phase 6b but currently safe by mount timing. Single-line fix when needed.
- **SCENE 1 hook schema** — `referenceImage` hardcoded to `"none"`. If a user's script hook explicitly shows the product, fake-label bug returns.

---

## Cafe-PC reboot reality

- All commits on `combined-preview` pushed to `origin` — durable across reboot.
- Branch is `combined-preview`, NOT `main`. `main` is 61 commits behind.
- `node_modules/` may be missing → `npm install`.
- Dev server: `npm run dev` (lives on `:5174` if `:5173` is taken).
- `.env` `GEMINI_API_KEY` confirmed present today.
- If `git commit` fails with "Author identity unknown" → `.\scripts\restore-git-identity.ps1` (ran today, worked).
- If Playwright MCP needs restore → `.\scripts\restore-playwright-mcp.ps1` (requires VS Code restart, kills active conversation; only run if needed).
- `.tmp/` files do NOT survive reboot — Neil drops a fresh hero image if a fresh wizard run is needed.
- The 17 untracked `.png` screenshots from this session's audits + smoke tests (`higgsfield-*.png`, `dreamina-*.png`, `flow-*.png`, `kling-*.png`, `grifon-*.png`, `phase2-*.png`, `phase3-*.png`) and `.playwright-mcp/` are debug artifacts. Wipe at reboot — no commit needed.
- `~/.claude/plans/continuing-from-2026-05-10-karit-fluttering-pond.md` dies on reboot. This handoff doc + git log are the durable record.

---

## Key insight from this session

**Resolution↔duration constraints on Gemini API Veo are per-MODEL, not per-quota.** Neil being max-tier on the Gemini API doesn't lift Veo 3.1 Lite's hard lock of 1080p→8s. Higgsfield gets shorter durations at 1080p because they're on **Vertex AI Veo** (different Google product surface, different SDK, different auth). This is also what unlocks Veo's native audio generation that we currently hide.

Vertex migration is the single biggest feature unlock left for the Generate Video module — it closes the Higgsfield parity gap on flexibility AND turns on audio. Scope estimate: 1-2 days (service-account auth flow, SDK swap, env var plumbing, smoke testing).

---

## Opening prompt for the next session

Paste this into the next conversation:

```
Continuing from 2026-05-11 ChillCool Face Mist session.

Branch: combined-preview HEAD 426c9bd (pushed).
Read FIRST: workflows/archive/2026-05-11-chillcool.md (full session context).
Plan file (long, scan as needed): ~/.claude/plans/continuing-from-2026-05-10-karit-fluttering-pond.md (dies on reboot — handoff doc is the durable record).

Top-line summary:
- Phase 1 + 2 + 3 of the Generate Video redesign all shipped + smoke-verified.
- Bundle is 61 commits ahead of main. Beta-merge gate is my pending decision.
- Last test: SCENE 02 of ChillCool storyboard rendered successfully at Veo 3.1 Lite — Phase 3 fixes (default 720p, compressed start frame, per-resolution constraint, big canvas loading state, clean b-roll prompts, branded PDF export) all worked end-to-end.

Best next thing:
1. I will provide a video-watching skill so you can evaluate rendered videos directly. Once you have it, pull recent renders from /api/gemini/video/library, watch SCENE 02, grade motion + identity-lock + label preservation + lip-sync, and propose Phase 4 prompt tuning if needed (talking template at services/geminiService.ts:1318-1326 hasn't been cleaned yet — Phase 3e only touched b-roll).
2. If the skill isn't ready yet: kick off the full 9-scene RENDER ALL test on the ChillCool storyboard so I have a richer library to evaluate later. Watch for queue throttling at scene 6 (5/hr rate limit).
3. Then we decide on beta-merge gate (main merge) and Phase 4 (real Kling 3.0 API integration for SCENE 1 hooks).

Pending P2 items if bandwidth allows: video stitching, library dedupe/pagination, test suite repair, Step 2 upload hint, Step2BusinessInfo useState pattern.

Cafe-PC reboot reminders:
- node_modules may need reinstall, dev server: npm run dev (port :5174 if 5173 taken).
- If git commit fails: .\scripts\restore-git-identity.ps1
- .env GEMINI_API_KEY confirmed present today.
- .tmp/ wiped — I drop a fresh hero image if a wizard run is needed.

Bundle is 61 ahead of main — flag the beta-merge gate one-liner when natural; do NOT auto-execute.
```
