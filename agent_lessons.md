# Agent Lessons

A living log of behavioral guidance that emerges from actual mistakes made in this repo. This file is read at session start — it is deliberately kept **compact**: each entry is the dated rule kernel plus pointers. Full original post-mortems (Context / What went wrong narratives) live verbatim in [workflows/agent_lessons_archive.md](workflows/agent_lessons_archive.md) and git history.

Rules of the file:

- **New lessons are written here FULL-LENGTH first** (format below). Compaction happens on later hygiene passes, not at write time.
- Do not pre-write rules for hypothetical mistakes — that's `CLAUDE.md` / `.claude/skills/`. This file captures lessons that only become apparent after they bite us.
- **When the same lesson lands twice, promote it** (Tier 4 in [workflows/loops.md](workflows/loops.md)): turn it into a skill or hook, then compress the entries here to a pointer. Already promoted: Director-AI pre-flight → `director-smoke`; icon/SVG eyeballing → `brand-check`; output-boundary / motion-window / model-compliance / regression-triage verification rules → `verify-changes` ("Repo-specific verification rules").

## Format (new entries)

```
### YYYY-MM-DD — One-line summary of the mistake
**Context:** What was being attempted
**What went wrong:** The specific failure
**Lesson:** What to do differently next time
```

## Entries

### 2026-05-04 — Vite dev plugin silently 404s prod-style dynamic API routes
**Lesson:** Any new `[param].ts` route under `api/` must be smoke-tested in `npm run dev`, not just on a Vercel preview — the `vercelApiDevPlugin` resolver must stay feature-equivalent with Vercel's filesystem router. Patch landed 2026-05-04 (single-level dynamic segments).

### 2026-05-04 — vite.config.ts env loader made .env edits silently stale
**Lesson:** If the running dev server isn't picking up a `.env` change, don't trust Vite's "server restarted" message — kill the npm process (and orphan node on the port) and start fresh. Patched 2026-05-04: every config reload now overwrites `process.env` from `.env` (`vite.config.ts:97`).

### 2026-05-04 — Shared-workspace visibility filters must fail-closed (allowlist), not fail-open (denylist)
**Lesson:** Anywhere the app fans a shared account-level resource (ElevenLabs voices, Gemini Files, Supabase Storage without RLS) out to multi-tenant UI, visibility defaults to **hidden** with an explicit allowlist — never "show everything that isn't mine." Canonical pattern: `api/_lib/filipinoLibrary.ts` (admin blesses entries explicitly).

### 2026-05-09 — Outside framework (NotebookLM brief) used to override grifon-cmo without Neil's permission
**Lesson:** The default response to "apply this notebook/article/expert framework to Grifon" is **analysis-and-flag-conflicts, not rewrite-the-strategy**. Ask Neil whether the lens fits Grifon BEFORE executing any skill through it — `grifon-cmo` output is *Neil's voice through Claude*, not Claude's strategic opinion. Specific precedent: Boris Cherny's "process is dead as a moat" applies to Anthropic-style agent coding, NOT to SMB SaaS where customers buy the OUTPUT (the converting ad) — tuned prompts ARE a moat here. (7 unauthorized copy edits were reverted before commit. Reaffirmed 2026-06-12 on the "Hermes Agent" brief — evaluated, conflicts flagged, not applied.)

### 2026-05-04 — One localStorage key, two unrelated gates: don't dedupe by name
**Lesson:** Before recommending deletion (or refactoring) of any flag/key/env var, `grep -rn` for **all** consumers — if one name is used in two places, assume the intents differ until both are read. (`grifon_admin` was both an IVC feature gate AND the Dashboard's admin-only MORE-MODULES preview switch; deleting it hid 7 modules on prod.)

### 2026-05-13 — Veo 429 after N scenes in RENDER ALL is by-design, not a code bug
**Lesson:** Veo enforces an hourly per-key cap; the queue in `components/GenerateVideo/RenderAllRunner.ts` catches the 429, shows the cooldown badge, and auto-resumes — tell the user to leave the tab open; do NOT add a manual retry button. Code audit only if the queue stops resuming (AbortController/signal) or 502s recur systematically on single-scene generate (then audit `api/gemini/video.ts` timeout config).

### 2026-05-18 — Verify canonical docs before wiring a new "variant" of an existing API surface
**Lesson:** "Variant X is just Variant Y with a different model name" is false until the docs prove it true — Kling Omni differed from image2video in model enum, endpoint path, AND body shape; the guessed wiring needed a full revert. Any new `VIDEO_MODEL_ROUTING` entry for an untested provider model requires a doc-fetch verification step BEFORE writing the dispatcher branch. Bot-protected docs (Kling returns 446 to WebFetch) → use Playwright in a real browser.

### 2026-05-18 — HTTP 429 can mean TWO different things from one upstream; inspect the envelope
**Lesson:** Never map HTTP status 1:1 to retry semantics. Kling: 429 + envelope `code:1102` = balance exhausted → surface HTTP **402** `kling_balance_exhausted`, user-actionable, no auto-retry; 429 + anything else = real rate limit → 429 `kling_quota` with retry-after. Every new proxy under `api/` gets reviewed for "does this upstream overload a retry-semantic status?" — the status is a hint, the envelope is the truth.

### 2026-05-19 — Deferring "the actual point of the feature" to a follow-up is the planning antipattern
**Lesson:** When a plan defers work as "follow-up," interrogate whether the deferred piece is the **load-bearing differentiator** (Omni without `end_frame` = no morph = the entire routing change was a regression). Decorative deferrals are fine; fundamental ones are scope reductions that must be re-titled. Standing grill-me checkpoint: *"If we ship exactly this plan, what does the user GET that they didn't have before — and is the deferred work part of that answer?"* Plan agents and Goal evaluators do NOT catch this; they review the plan-as-described.

### 2026-05-19 — Prompt formulas tuned for one engine don't auto-port to a sibling engine
**Lesson:** Before re-routing an existing prompt to a new model, re-grade it against the new engine's *behavior*, not just its API contract: (a) which parts were decorative on the old engine but load-bearing on the new one; (b) whether the negative phrase suppresses the new engine's intended behavior (V3 auto-morphs at the API level, so "avoid morphing" was safe; Omni's morph is prompt-driven, so the same phrase killed it); (c) whether structural priorities (mandatory-first ordering) still match.

### 2026-05-19 — Audit upstream before designing new downstream logic
**Lesson:** The first question of any redesign: *"what does upstream already emit that downstream is dropping?"* Grep upstream schema/output fields against downstream consumers before inventing a parallel mechanism (`scene.transitionEffect` already existed and was being dropped at the `generateVideoPrompts` boundary; plumbing it through was a 5-line fix that beat a planned second classifier). The 2026-05-09 crown-jewel migration left some fields un-retrofitted — assume signals are still being dropped. Pairs with 2026-05-26 classifier-vocabulary below.

### 2026-05-08 — Subscription-model copy must match backend reality, not founder intent
**Lesson:** Auto-renew / trial / refund-window / "cancel anytime" / pause claims are **backend feature gates masquerading as copy choices**. When the founder pivots on billing behavior, the next question is always "does the backend support this?" BEFORE drafting copy that asserts it. If support is missing → separate engineering workstream ([workflows/auto_renew.md](workflows/auto_renew.md)) + neutral copy meanwhile.

### 2026-05-22 — A frame-sampling grid tuned for a slow transition silently misses a fast one
**Lesson:** A sampling grid is only valid relative to the speed of what it samples: first locate WHERE the motion happens (coarse pass), then sample that window densely — never inherit a grid from a prior test whose subject moved at a different speed. Generalizes to any inherited measurement methodology (poll interval, timeout, token budget). Promoted into `verify-changes` → "Repo-specific verification rules."

### 2026-05-24 — Don't tool-install rabbit-hole when the user's observation alone is sufficient
**Lesson:** When the root cause is deterministic from already-visible code/data (the prompt literally contained `Rack focus pull`), ship the fix first; sensory validation only if it doesn't take. Answer "did you check X?" honestly with "no, but I can tell from Y." Before any mid-session tool install: (1) is the data load-bearing for the decision, or validation theater? (2) what's the fallback if the install takes >5 min? Never download/extract inside the vite-watched workspace while the dev server runs — use `$env:TEMP`.

### 2026-05-24 + 2026-05-26 — Director AI smoke pre-flight (hero-FIRST, MarketMind-first, prefill verification)
**PROMOTED → [.claude/skills/director-smoke/](.claude/skills/director-smoke/SKILL.md)** — the skill is the live source of truth (handheld hero with readable label FIRST, derive brand FROM the label, MarketMind before Director, never hand-type Step 1/2, prefill verification, VISUAL-ASSETS-MISSING is a hard stop, unmeter local video first). Original rules incl. Neil's verbatim instructions: archive.

### 2026-05-26 → 2026-05-29 — Video/audio QA: audit every render before it propagates (Gem retired)
**Lesson (consolidated, 3 entries):** Claude can't ingest video/audio. The live protocol is [workflows/video_audit_protocol.md](workflows/video_audit_protocol.md): **Playwright = eyes, raw Gemini 3.5 Flash = ears (fresh Claude-authored prompt pasted each render — no stored Knowledge), Claude = integration layer.** Gemini is BANNED from naming filenames/functions/paths (it confabulates them). For CRITICAL gate decisions run 2–3 passes and take the union; if passes disagree on a launch-blocking call, **Neil's ear is ground truth**. Never propagate renders to Signal Modulator without explicit per-scene approval. Don't rebuild a pre-configured Gem — embedded Knowledge rots and drives confabulation (the "lahong" phonetics disaster).

### 2026-05-26 — Cross-session library binding via sceneIdx-only matching (Bug 12)
**Lesson:** Any state matcher that hydrates from a shared multi-tenant resource (Supabase library, ElevenLabs workspace) must require an **identity field** (prompt text, batchId, wizardSessionId) — never just a positional key (sceneIdx), which collides across brands/sessions and binds fresh state to stale neighbors (7 Curology scenes auto-bound to Battlecreek MP4s; "7/7 RENDERED" before any render fired). Litmus before any hydrating `library.filter(...)`: *"with 50+ entries from prior wizards, does this falsely match at the same index?"* Fix: `components/GenerateVideo/index.tsx:302`.

### 2026-05-26 — Hand-transcribed inline SVGs and icon-text rhythm must be eyeballed, not build-verified
**Lesson:** (1) Never hand-transcribe brand-mark SVGs — copy canonical paths, render, zoom 200%. (2) Bold/uppercase button text pairs with 20px icon + 12px gap; normal weight with 16px + 8px — cramping reads amateur. (3) Federated OAuth buttons go on NEUTRAL surfaces (white/dark), never the gold accent — multicolor marks need contrast. (4) Inspect at **element** zoom, not page zoom: build-clean + screenshot-glance ≠ visually correct. Checklist appended to `brand-check`.

### 2026-05-26 — Grep wiring before declaring a cross-module feature shipped
**Lesson:** A utility crossing module boundaries needs `grep -rn` for every call site, and the question: is that site the **output boundary** (value reaches the external system) or an intermediate one? Then test the **side effect** (real Veo audio on a Taglish line), not the data transformation (`normalizeTaglish('lang')==='lahng'` passed; Veo still said "lahong"). Promoted into `verify-changes`.

### 2026-05-26 — Classifier rules must match the vocabulary the upstream generator actually produces
**Lesson:** Before shipping a downstream classifier rule, sample 3 real upstream outputs and grep for the proposed anchor phrases — hit rate must be >0 (the strict "lips parted" rule had zero overlap with the storyboard generator's actual "smiling at camera" vocabulary, so everything fell to b-roll and CTAs lost lip-sync). "Avatar visible in frame" ≠ "talking scene" — PACING_RULE controls rhythm, the classifier controls engine routing; complementary layers. Durable fix direction: have the storyboard emit a typed per-scene `type` field (TUNED — needs its own plan).

### 2026-05-29 — A fix that depends on the model obeying a NEW classification rule must be verified in-vivo
**Lesson:** Don't trust a new prompt classification/labeling instruction — sample the model's actual field output 2–3× before merging (the hook-`referenceImage` rule was ignored 3/3; the "fix" was inert while looking shipped). When the downstream effect is deterministic and compliance is unreliable, **anchor it in code, not the prompt** (guarded Step5 fallback forcing the hero ref onto hook-morph end frames, commit `b6b9791`). Promoted into `verify-changes`.

### 2026-05-29 — Don't accept "your change broke X" without checking the change touches X's code path
**Lesson:** First `git diff` — does the change touch the failing path at all? Then classify the symptom: **upstream** (console 502/timeout → provider, retry), **stochastic** (regenerate; a clean second sample disproves a code regression), or **real regression**. Reporting "the changes didn't cause this, here's the actual cause" with evidence beats defensively fixing a phantom. Promoted into `verify-changes`.

### 2026-05-30 — `backdrop-filter` (and `transform`/`filter`) on an ancestor traps `position: fixed` to that ancestor's box
**Lesson:** An ancestor with non-`none` `transform` / `filter` / `backdrop-filter` / `perspective` / `will-change` / `contain:paint` becomes the containing block for `fixed` descendants. When a fixed overlay is mysteriously parent-sized: measure its rect, walk ancestors for those properties — stop chasing z-index/opacity. Robust fix: `createPortal(...)` to `document.body`. Sibling gotcha: `overflow-x: hidden` on a tall root breaks `position: sticky` — use `overflow-x: clip`.

### 2026-06-08 — A leaked face in a product-only frame is the REFERENCE image, not the prompt (and not always the avatar)
**Lesson:** When an image defies a clearly-worded prompt ("no human" frame rendered a western woman), suspect the **reference image + consistency-lock mode FIRST** — an attached reference + IDENTITY_LOCK beats prompt text (the model completed a whole person from the western hand in the hero photo). Before blaming the avatar, check a talking scene to see the avatar's actual render. Fix: TUNED `'product'`-mode guard in `generateSceneImage`, commit `627ccb2`. Keep the handheld hero (it's the size anchor) — fix the rule, not the hero.

### 2026-06-08 — ffmpeg burn-in: filtergraph escaping + drawbox can't animate (build-passes ≠ renders-right)
**Lesson:** (1) Keep drive-colons out of filtergraphs: copy fonts/textfiles into the scene temp dir, run ffmpeg with `cwd=dir` + bare filenames; protect commas in expression values by **single-quoting**, not backslash-escaping. (2) `drawbox` w/x/y/h are eval-once (no `eval=frame` in this build) — animate via N `enable='gte(t,...)'`-gated static slices instead. (3) Assert the **motion** by extracting frames INSIDE the animation window; a resolved frame proves nothing. Keep `tests/integration/burnin-render.test.ts` seeded with the nastiest real input (Taglish apostrophe+comma+emoji).

### 2026-06-08 — Audio for ads: judge full-ad not excerpts; SFX timing must be engine-deterministic; less is more
**Lesson:** (1) Never judge a music mix on a short excerpt — confirm on the whole timeline, and pin final loudness deterministically (`loudnorm I=-14:TP=-1.5:LRA=11` master; bed 0.18 + hard 4:1 duck). (2) A text LLM can't time in-scene SFX — anchor SFX to events the ENGINE knows exactly (cuts, `HOOK_DELAY`, each overlay's `startSec`); drop EDL-guessed anchors. (3) Restraint pass: 3–5 SFX per 30s max, no two within 0.4s — silence is premium, mistimed noise is cheap. Verify audio by re-stitching + uploading the real ad for Neil to *hear*.

### 2026-06-08 — ffmpeg drawtext `fontsize` DOES animate per-frame (verified)
**Lesson:** drawtext re-evaluates `y`, `alpha`, AND `fontsize` per frame; only drawbox geometry is eval-once in this build. Before relying on any filter's `t`-expression, run the 30s one-clip capability smoke instead of assuming. `HOOK_REVEAL` ships `bounce`/`slam`/`flip`; keep `pow()` bases ≥0 via `(1-p)`; verify inside the punch window (0.42–0.60s) — wider samples land post-settle and look identical.

### 2026-06-10 — Background subagents auto-deny every permission prompt; split tools-vs-reading
**Lesson:** Permission prompts can't surface from `run_in_background` agents — anything off the allowlist is auto-denied (~30k tokens/agent burned discovering it). Division of labor: the FOREGROUND thread runs every privileged command (ffmpeg, curl, Playwright) and writes artifacts to `.tmp/`; BACKGROUND agents get read-only briefs (Read/Glob) over those artifacts. Re-set repo-local `git config user.email/user.name` before the first commit each session (defreezer wipes it). Bonus ffmpeg trap: any dynamic `scale` in a per-scene chain must end `,setsar=1` or SAR drift breaks concat — only the real-render harness (RUN_BURNIN) catches this class.
