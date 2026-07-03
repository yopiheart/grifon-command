# Cinematic Pipeline — local Codex → Seedance prototyping (SOP)

**Objective:** produce a hyper-real cinematic ad **locally and cheaply** — Codex CLI (`gpt-image-2`) for every image, Seedance 2.0 API for every clip — so quality is validated on the PC **before** any in-app wiring. This is the Phase-A workflow behind [`cinematic_ad_studio_prd.md`](cinematic_ad_studio_prd.md).

> Read [`wat-framework.md`](wat-framework.md) first. Tools used: `tools/cinematic_pipeline.mjs` (driver), `tools/seedance_render.mjs` (video), `.claude/skills/codex-image/generate.mjs` + `tools/codex-image-batch.mjs` (images). Skills used: `cinematic-ad-prompt`, `seedance-shotlist-director`, and `cinematic-ad-prompt/references/asset-prep.md`.
>
> **Runtime: Node, not Python.** On cafe PCs the defreezer wipes Python entirely, so the `.mjs` ports (`cinematic_pipeline.mjs`, `seedance_render.mjs`) are the runnable path and supersede the `.py` originals (kept for reference). They use Node built-ins only — no npm deps, no `pip`.

## Stack (no Higgsfield)
- **Images = Codex CLI `gpt-image-2`** — billed to the ChatGPT plan (no per-image API charge), local-only. Asset sheets + first/last keyframes + on-screen text.
- **Video = Seedance 2.0 API** (BytePlus ModelArk) — the only step that spends video credits. So **iterate images first, render video last.**

## Prerequisites (local PC)
1. **Codex CLI** installed + logged in: `npm i -g @openai/codex` then `codex login` (cafe-PC re-arm: `scripts/restore-codex.ps1`). See the `codex-image` skill.
2. **Seedance key** in repo-root `.env`: `ARK_API_KEY=...` (or `SEEDANCE_API_KEY=...`). Optional `SEEDANCE_BASE_URL`, `SEEDANCE_MODEL_ID`.
3. Node (ships with the repo toolchain — no pip / Python needed for these tools).

## Steps

### 1. Lock assets first (cheap, Codex only)
Per `asset-prep.md`: build the **character sheet** (3-panel: close-up + front + back, neutral grey, one face — *generated*, never a real upload), the **product sheet** (multi-angle), and any **location plate** (3/4 angle). Use the `codex-image` skill, or batch:
```
node tools/codex-image-batch.mjs --manifest .tmp/cinematic/<project>/assets.json
```
**Single-variable test:** before committing, render ONE cheap Seedance baseline per candidate asset (same motion prompt, change one variable) — keep only assets that hold up under motion.

### 2. Write the shotlist
Invoke **`seedance-shotlist-director`** with the script/brief → it produces the global Style Prefix + CUT-structured 15s prompts (English; Filipino spoken scenes flagged `[ENGINE: in-app/Veo]`, NOT Seedance). For a single shot, use **`cinematic-ad-prompt`** instead.

### 3. Build the manifest
Turn the shotlist into `.tmp/cinematic/<project>/shots.json`:
```json
{ "project": "<slug>", "shots": [
  { "id": "scene1",
    "keyframe_prompt": "Codex gpt-image-2 prompt for the FIRST frame (no real faces; readable text)",
    "keyframe_size": "1024x1536",
    "last_frame_prompt": "optional end keyframe",
    "video_prompt": "Seedance prompt — English, < ~1000 words, weight & force, audio synced",
    "aspect": "9:16", "duration": 5, "mode": "standard" }
] }
```

### 4. Dry-run, then keyframes, then render
```
node tools/cinematic_pipeline.mjs --manifest .tmp/cinematic/<project>/shots.json --dry-run        # inspect every command
node tools/cinematic_pipeline.mjs --manifest .tmp/cinematic/<project>/shots.json --keyframes-only  # lock images (cheap)
node tools/cinematic_pipeline.mjs --manifest .tmp/cinematic/<project>/shots.json                   # render clips (spends credits)
```
(`--force` to regenerate existing outputs; `--only <id>` to (re-)run a single shot.)
Outputs: `.tmp/cinematic/<project>/<id>.png` (+ `.end.png`) and `<id>.mp4`. Re-runnable — existing files skipped unless `--force`.

### 5. Harvest & assemble (micro-splicing) — now manifest-driven
A finished ad is the **best seconds of many takes**. Re-render the weak shots (`--force` on that id), then cut the keepers at pace — fast sections at ~1s per shot, not full-clip concats. The edit is REPRODUCIBLE, not hand-driven:

1. Give each shot an optional `"cut": {"in": s, "out": s}` harvest window in `shots.json` (omit = full clip), and optionally a manifest-level `"assembly": ["s1", ...]` order.
2. `node tools/assemble_cut.mjs --manifest .tmp/cinematic/<project>/shots.json` → trims, normalizes, concats → `FINECUT-<project>.mp4` **plus `SEAMS-<project>.png`** — one row per cut point: LAST frame of clip N beside FIRST frame of clip N+1. A broken story bridge (world jump, motion-vector flip, teleporting product) is visible as a mismatched pair before anyone watches the video.
3. Judge the seam sheet + fine cut (render_qa.mjs with a sequence-focus prompt), tune the windows, re-run — the tool is idempotent and takes seconds. Neil's editor pass stays the final word; this gets the cut 90% there deterministically.

## Quality checklist (from the skills' doctrine)
- [ ] Assets locked + single-variable tested before any video spend.
- [ ] Prompts English, < ~1000 words, formula-first (Subject/Frame + Environment + Camera + Temporal Action + Audio).
- [ ] Weight & force in the motion; SFX synced to the on-screen beat.
- [ ] Native 4K / 10-bit / no banding; no real faces; no Tagalog speech on Seedance (route those to in-app/Veo).
- [ ] Continuity held across scenes (same character/product/wardrobe).

## Production doctrine v2 — Nike ZF6 session lessons (2026-07-03, Neil's retro)

The first full ad run (Nike Zoom Fly 6 "Dawn City Road", ~24.5s rough cut) produced clips that each
passed per-clip QA but read as **disconnected** when assembled. Neil's verdict: S2 (boulevard rip) and
S5 (logo-lock end card) were the only sequence-perfect scenes. The doctrine below is mandatory for the
next run — **sequence first, clips second**:

0. **STORY GATE — story before sequence (v3 rule, 2026-07-03, supersedes everything below).** Before
   any style prefix, asset, or shotlist: write (a) the **logline** (who wants what, what transforms),
   (b) the **one-sentence viewer takeaway** a zero-context watcher should be able to say after one
   viewing, and (c) the **intended audience read**. Neil approves these three lines FIRST. Mine the
   product's own copy/positioning for the story seed (ZF6's medial side prints "RACE DAY TO EVERYDAY.
   FLY HIGH, FAST FORWARD" — the brief was on the shoe). Every scene in the shotlist must answer
   *"what does this beat make the viewer understand or feel?"* — not just *"where does the energy
   point?"* C-IDWORLD's real meaning: the product's PERSONA dictates the world (Ja = raptor), not its
   palette. A no-human film works only when the product carries a persona-character; a mass product
   for everyday humans usually needs the human. **QA counterpart: the NAIVE-VIEWER TEST** (render_qa
   with a zero-context story-comprehension focus) is mandatory on every assembled cut — if the blind
   watcher can't state story/message/audience correctly, the film fails regardless of craft grades.
   The ZF6 v2 run passed every mechanical gate and failed exactly this one.
1. **QA the SEQUENCE, not just the clip.** Assemble a rough cut (ffmpeg concat of harvest cuts) and
   judge the flow BEFORE calling any scene done. A beautiful clip that breaks the motion/story chain is
   a failed clip.
2. **Motion at 0s — no wind-ups.** Every clip must open already at full speed/action (like Director AI's
   avatar speaking on frame 1). Chained-start clips especially: the first 1s is the ONLY second that
   survives the edit, so a 1s ramp-up = a dead clip. Prompt explicitly: *"already at full speed from the
   first frame, no acceleration phase."*
3. **Micro-shots need story bridges, not attachments.** An angle change must be *motivated*: continue the
   previous clip's motion vector (same direction, same speed read), same world state, camera logic that
   follows the action. Write the S4-style launch sequence as ONE storyboard whose every clip begins
   where the previous one's energy points — never as independent clips stitched later.
4. **Background and product motion must agree.** If the background streaks with speed, the product must
   read as moving (trail, spray, vibration); a static product on a rushing background reads broken (the
   S4c macro failure).
5. **Transitions fast, spec-ad pace.** Reveals/morphs happen FAST — the slow orb unfurl (S3 v2) was weaker
   than the quick v1 transition. Prefer v1-speed transitions with product locked via the anchored END
   frame (best of both).
6. **Angle rules (final form):** free motion = ONE angle per generation · controlled turns = allowed ONLY
   with start+end frame locks on both anchors · multiple angles = split into separate scenes but
   story-aligned per rule 3 · never free-rotate an unanchored product.
7. **Chain the end frame only when the SHOT logic continues.** End-of-N as start-of-N+1 works for
   continuous action; when cutting to a NEW angle, generate a fresh keyframe that matches the motion
   state (speed cues baked into the still), not a static composition.
8. **Vary SFX per clip.** Identical audio directions converge (three clips came back with the same
   "bubble" SFX). Give each shot a distinct audio line; final sound design happens in the edit anyway.
9. **Frames vs refs stays exclusive** (see below) — pick per shot: chained keyframes for
   morph/reveal/turns, multi-angle refs for free motion.
10. **Product-free connective scenes are legit (Neil, 2026-07-03; Karsten ground truth).** Not every
    scene needs the product in frame — the JA 3's first 11.6s is logo→creature energy with no shoe.
    Story continuity outranks product presence: brand-energy beats (the ribbon/trail), empty-world
    beats, and transition bridges can carry whole scenes as long as each begins where the previous
    clip's energy points. Corollary: a **bridge shot** (chained: previous clip's REAL last frame →
    next scene's keyframe) is the standard fix when two adjacent shots read as "kinabit lang" —
    generate the journey between them instead of cutting across it.
11. **Intake spec (productization, Neil-approved direction):** require the full angle set from the user
    (front, back, both sides, sole, top, logo) like Real Estate ad intake; auto-detect + generate missing
    angles (confirm with user); auto-generate a brand-matched end card from the logo; feed per-scene
    asset+location+prompt bundles; deliver ffmpeg pre-cut harvests + a rough-cut preview.

### Next-session kickoff (paste-ready)

> Fresh run ng Nike Zoom Fly 6 commercial (o bagong product) sa Cinematic Pipeline. Basahin muna:
> `workflows/cinematic_pipeline.md` (lalo ang Production doctrine v2) + swipe file entry E8 (+ addendum).
> Assets: re-scrape ang 8 Nike refs (URL nasa E8/manifest) o bagong product uploads; Codex keyframes
> regenerate from the doctrine. Storyboard FIRST with sequence-level motion-vector plan (bawat clip
> nagsisimula kung saan tumutok ang energy ng nauna, motion at 0s), ipa-approve kay Neil ang storyboard
> stills, saka lang mag-render (720p ladder → 4K). Ang shotlist HTML template + manifest schema ay nasa
> SOP; ang dating manifest ay `.tmp` (wiped) pero ang prompts/structure ay nasa shotlist section ng E8 docs.

## Notes / learnings
- **Frames vs references are MUTUALLY EXCLUSIVE (verified live 2026-07-03).** The API 400s when
  `reference_image` content is mixed with `first_frame`/`last_frame` content. Per shot, pick ONE
  consistency lever: **chained keyframes** (exact start/end control — best for morph/reveal shots
  where the end frame IS the approved product plate) or **multi-angle `reference_image` refs, max 9**
  (design-lock from every angle — best for free-motion shots where the product turns/is chased and
  the model would otherwise hallucinate unseen sides). `seedance_render.mjs` fails fast on the mix.
- **First live call (2026-07-03): auth + contract validated, but models need per-account ACTIVATION.** A fresh ARK key returns `404 ModelNotOpen` per model until the Seedance models are activated in the **BytePlus ModelArk Console → Model Management** (activate `dreamina-seedance-2-0-260128` AND `dreamina-seedance-2-0-fast-260128` separately). The error names the exact model id — it's account-side, not an API/key/contract problem.
- **Verified ModelArk contract (2026-07-03).** The `seedance_render.mjs` port implements this exactly (the old `.py` TODOs are resolved):
  - **Endpoints:** create `POST {base}/contents/generations/tasks`; poll `GET {base}/contents/generations/tasks/{id}` (~every 10s). Base default `https://ark.ap-southeast.bytepluses.com/api/v3`. Headers: `Authorization: Bearer <key>`, `Content-Type: application/json`.
  - **Params are TOP-LEVEL JSON**, not `--flags` appended to the prompt text: `resolution`, `ratio`, `duration`, `watermark:false`, `generate_audio:true`. **Do NOT send `seed`** — unsupported/ignored on Seedance 2.0.
  - **Duration minimum is 4s in i2v (verified live 2026-07-03):** `duration: 3` returns `400 InvalidParameter` on `dreamina-seedance-2-0` i2v; 4s and 5s pass. Want a 3s beat? Render 4s and trim in the edit (micro-splicing). **480p is accepted** as a `resolution` value (cheapest ladder rung, verified same day).
  - **content[]:** `{type:'text',text}` + keyframes inlined as base64 data URLs `{type:'image_url',image_url:{url:'data:image/png;base64,…'},role:'first_frame'|'last_frame'}`. A last frame requires a first frame (both roles together).
  - **Status enum (6 values):** `queued | running | cancelled | succeeded | failed | expired`. Continue on queued/running; terminal on the other four. On `failed`, surface top-level `error.code` / `error.message`.
  - **Result:** `content.video_url` — **expires in 24h**, so download immediately (the tool streams it to `--out` and verifies non-zero size).
  - **Model IDs:** standard → `dreamina-seedance-2-0-260128` (only this full 2.0 model does **4K**); fast → `dreamina-seedance-2-0-fast-260128` (720p cap); mini → `dreamina-seedance-2-0-mini-260615` (720p cap). Requesting `--resolution 4k` with fast/mini errors out.
  - **Beta rate limits:** ~2 QPS, max 3 concurrent tasks (the pipeline renders **sequentially** for safety), ~20 free fast calls per month. `seedance_render.mjs` backs off on HTTP 429 (exponential, ~5 retries).
- `.tmp/` is disposable (gitignored) — outputs don't persist across a cafe-PC reboot; the manifest + this SOP regenerate them.
