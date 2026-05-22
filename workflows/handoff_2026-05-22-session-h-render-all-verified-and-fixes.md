# Handoff — 2026-05-22 — Session H (RENDER ALL verified · 2 bug fixes · Remotion editor scoped)

> **Status: PAUSED mid-Fix-2.** Resume at the **Fix 2** section below — it is fully
> grilled and spec'd, just not yet coded.
> Plan mirror (defreezer-disposable): `~/.claude/plans/read-in-order-workflows-handoff-2026-05-distributed-acorn.md`.
> **This file is the durable copy** — it is self-contained; you do not need the plan file.

---

## TL;DR for tomorrow's agent

1. **Fix 1 — VoicePicker dropdown overlap → SHIPPED**, commit `7f021d0`. (Live eyeball still pending.)
2. **Fix 2 — strip audio/SFX from video prompts → PENDING.** Grilled, all decisions
   locked, exact edit spec is below. **This is where you resume.**
3. **Remotion AI Editor** — a big new feature Neil wants — is **deferred to its own
   dedicated `grill-me` PRD session**. Scope notes below; do NOT start building it
   without that PRD.

---

## What this session did

- **Verified the RENDER ALL → Signal Modulator hand-off** (code-trace + live spot-check) —
  committed earlier as `423dd06` (launch_readiness.md update).
- **Ran a full live end-to-end on a real product** — Glossier Soothing Face Mist
  (Neil's image): Market Research → Director wizard (all 8 steps) → RENDER ALL →
  Signal Modulator. **Result: 8/8 scenes rendered, ZERO errors**, the hook (Kling O1
  Omni) rendered clean, no rate-limit cap hit. Hand-off to Signal Modulator clean —
  8/8 scene voices generated ("Pinay Spokesperson", Taglish). The historical
  "hook always errors / some scenes don't generate" did **not** reproduce.
- **Neil flagged 3 improvements** → plan approved → Fix 1 shipped, Fix 2 grilled,
  Remotion editor scoped.

## Key findings (durable knowledge)

- **The generated videos are SILENT.** Every video model has `supportsAudio:false`;
  `generateAudio` is omitted on the Gemini API; Kling sends `sound:'off'`. So Signal
  Modulator is the **only** source of voice — it is **mandatory, not optional**. (This
  reversed Neil's initial "maybe voice-changing is optional" question.)
- **The "video effect" Neil disliked = a sparkle / white light-streak VFX** that flashes
  across talking-scene clips (~t≈1.8–2.0s). Diagnosed root cause: `generateVideoPrompts`
  in `services/geminiService.ts` **explicitly tells the model to write audio/SFX** into
  the video prompt (e.g. scene 8's prompt literally said *"subtle sparkle SFX"*). The
  silent video model can't make a sound, so it renders "sparkle" **visually** as
  light-streaks. Fix 2 removes that.

---

## Fix 1 — VoicePicker dropdown overlap — SHIPPED ✅

- **Commit `7f021d0`.** File: `components/SignalModulator/ScenePipelineTile.tsx`.
- Added `relative z-50` to the voice-config `GlassPanel`. `GlassPanel`'s `backdrop-blur`
  makes each panel its own stacking context, so the VoicePicker dropdown (`absolute
  z-30`) was trapped inside the voice-config panel and the later-in-DOM scene-list panel
  painted over it.
- Build-verified (`npm run build` green). **Live eyeball still pending** — on the next
  pipeline run, confirm the expanded voice dropdown (filters + `// FILIPINO_LIBRARY`)
  sits cleanly above the SCENE rows and every voice is clickable.

---

## Fix 2 — strip audio/SFX from video prompts — PENDING ⏳ (RESUME HERE)

**File:** `services/geminiService.ts`, function `generateVideoPrompts` (~L1611-1718).
**TUNED file** — per CLAUDE.md / `surgical-edit` rules, the edit needs **Neil's explicit
approval of the exact diff** before commit. It was fully grilled this session;
decisions are locked. Do NOT re-grill — just execute the spec, show Neil the diff,
get approval, build, commit.

### Locked decisions (from the grill)

1. **Scope = Robust** — remove the audio/SFX directives AND add anti-VFX negative phrases.
2. **Hook block (Option A-Hook) — untouched.** It isn't exhibiting the bug and its
   negative phrase was deliberately tuned across Sessions C–G. Keep the morph.
3. **Temu audio block — stripped now** (don't wait for the Temu re-spec).
4. **`daylight`→`like` typo — fix all 4** in the same commit.
5. **Verification = diff-review + next pipeline run** (no isolated paid render now).

### Exact edit spec (anchor on text, not line numbers — lines shift as you edit)

1. **Remove the Temu audio block.** Delete the entire
   `if (scriptType === 'Temu') { additionalInstructions = \`…TEMU / VIRAL HAUL AUDIO
   RULES…\` }` branch. Temu then falls through to `additionalInstructions = ""`.

2. **Option A-Regular — OUTPUT FORMAT line.** Change
   `…end with the audio direction and the negative phrase as natural prose.`
   → `…end with the negative phrase as natural prose.`

3. **Option A-Regular — NEGATIVE PHRASE.** Append anti-VFX terms before the closing
   quote/period: add `, light streaks, light rays, lens flare, sparkle effects, glitter,
   motion-graphic overlays, speed lines`.

4. **Option B (talking) — remove the Audio Landscape bullet** entirely:
   `- **Audio Landscape:** Define the sync-sound environment (SFX: distant room tone,
   Ambient: low electrical hum).`

5. **Option B (talking) — ADD a NEGATIVE PHRASE bullet** (Option B currently has NONE).
   Place it before the OUTPUT FORMAT bullet, mirroring A-Regular's style:
   `- **NEGATIVE PHRASE:** Append as a comma-separated tail — "Avoid low quality,
   blurry, distorted, deformation, morphing, melting, glitching, extra limbs, text,
   watermark, writing, letters, subtitles, light streaks, light rays, lens flare,
   sparkle effects, glitter, motion-graphic overlays, speed lines."`

6. **Option B — OUTPUT FORMAT line.** Update so it ends with the negative phrase, for
   consistency with A-Regular (e.g. add `…and end with the negative phrase as natural
   prose.`).

7. **Fix the `daylight`→`like` corruption — all 4:**
   - Cinematic block: `Use commands daylight:` → `Use commands like:`
   - Cinematic block: `No flowery adjectives daylight "Ethereal"` → `…adjectives like "Ethereal"`
   - Option B: `bracketed headers or labels daylight [Subject Performance]` → `…labels like [Subject Performance]`
   - Option C: `DO NOT use headers daylight INSTRUCTIONS:` → `…headers like INSTRUCTIONS:`

**KEEP UNTOUCHED:** all of Option A-Hook (morph + its hook-scoped negative phrase);
Option C structure (only its `daylight` typo changes).

### Risks to watch (premortem — Neil didn't get to answer it; these are the obvious ones)

- The sparkle diagnosis may be incomplete — Veo could still flourish without the audio
  prompt. The added negative phrase is the hedge. If the next pipeline run still shows
  sparkle on talking scenes, escalate: stronger negative terms, or it's Veo-inherent.
- New Option B negative phrase includes `morphing, melting, deformation` — good for a
  talking avatar (no face-warping), but eyeball that it doesn't dull natural mouth
  motion. Low risk.
- Anti-VFX terms could over-suppress a legit window lens-flare look. Low risk; terms are
  specific.

### Verify (per locked decision 5)

Make the edits → `npm run build` (must be green; build-gate Stop hook) → show Neil the
exact diff → Neil approves → commit. The live "talking scenes are sparkle-free, hook
morph still renders" confirmation rides on Neil's **next full pipeline run** (no isolated
paid render now).

---

## Deferred — Remotion AI Editor (its own `grill-me` PRD session)

Neil wants a real video editor: silence the raw videos, overlay the new Signal Modulator
voices at matched timeframes, auto-caption, SFX, transitions — driven by an AI
edit-analysis stage that first reviews the video and outputs a structured edit plan.

**Do NOT start building this without a dedicated `grill-me` PRD session.** Scope notes so
that session starts informed:

- **Greenfield** — no `remotion`, no `ffmpeg` in the repo. Needs Remotion +
  ffmpeg (mute source / trim) + a transcription step (auto-caption) + a server-side
  render environment.
- **"Lipsync" caveat (tell Neil up front):** the Veo videos were rendered with zero
  knowledge of the ElevenLabs voice — the avatar's mouth is generic talking motion.
  Overlaying the MP3 gives **scene-level sync** (right voice on the right clip, trimmed
  to length), **NOT lip-level sync** (mouth shapes matching words). True lipsync needs a
  separate mouth-re-render model. Neil has been told this; keep it on the table.
- **The existing "Viral Video Editor"** = `components/EditVideo.tsx` →
  `generateVideoEditPlan` in `geminiService.ts` (model `gemini-3.1-flash-lite-preview`).
  It outputs **prose**, not a structured plan, and analyzes the *script + screenshots*
  not the *actual video*. For the editor it must be rewritten to output a
  **structured/machine-readable** plan and to ingest the real video. That rewrite is
  part of the PRD, not separate.

---

## Resume instructions for tomorrow

1. **First:** if Playwright MCP is needed, run `.\scripts\restore-playwright-mcp.ps1`
   then restart VS Code (do it at session start — restart kills the conversation).
2. `npm install` if `node_modules/` is missing; `npm run dev` to bring the server up
   (it was down at end of this session — not a bug, just stopped).
3. **Fix 2:** open `services/geminiService.ts` `generateVideoPrompts`, apply the 7-item
   edit spec above, `npm run build`, show Neil the diff, get approval, commit.
4. Then offer Neil the **Remotion AI Editor `grill-me` PRD session** as the next big rock.
5. Optional small follow-up: append the RENDER ALL "8/8, zero errors" verdict to the
   2026-05-22 section of `workflows/launch_readiness.md` (it's the durable meta-doc;
   this result is a real beta-readiness signal).

## Environment / reboot reminders

- Cafe-PC defreezer wipes everything except the git repo. All commits this session are
  pushed to `origin/main`.
- Current branch: `main`. Session commits: `423dd06` (hand-off verdict doc),
  `7f021d0` (Fix 1), plus this handoff doc.
- Run `.\scripts\restore-git-identity.ps1` if `git commit` fails with "Author identity
  unknown".
- Disposable (gitignored / will be wiped, not committed): the `.playwright-mcp/`
  screenshots, the root `*-2026-05-22.jpeg` / `.png` frame grabs, and
  `.tmp/glossier-voices/` (the 8 generated MP3s). Re-generate if needed.
- Kling balance: was ~$5.75 at session start; the live Glossier RENDER ALL (8 scenes)
  + earlier Session-G spend drew it down — check the Kling dashboard before the next
  live render run.
