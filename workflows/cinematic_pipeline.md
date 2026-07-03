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

### 5. Harvest & assemble (micro-splicing)
A finished ad is the **best seconds of many takes**. Re-render the weak shots (`--force` on that id), then cut the keepers together in your editor. Budget credits for this — it's the workflow, not a failure.

## Quality checklist (from the skills' doctrine)
- [ ] Assets locked + single-variable tested before any video spend.
- [ ] Prompts English, < ~1000 words, formula-first (Subject/Frame + Environment + Camera + Temporal Action + Audio).
- [ ] Weight & force in the motion; SFX synced to the on-screen beat.
- [ ] Native 4K / 10-bit / no banding; no real faces; no Tagalog speech on Seedance (route those to in-app/Veo).
- [ ] Continuity held across scenes (same character/product/wardrobe).

## Notes / learnings
- **First live call (2026-07-03): auth + contract validated, but models need per-account ACTIVATION.** A fresh ARK key returns `404 ModelNotOpen` per model until the Seedance models are activated in the **BytePlus ModelArk Console → Model Management** (activate `dreamina-seedance-2-0-260128` AND `dreamina-seedance-2-0-fast-260128` separately). The error names the exact model id — it's account-side, not an API/key/contract problem.
- **Verified ModelArk contract (2026-07-03).** The `seedance_render.mjs` port implements this exactly (the old `.py` TODOs are resolved):
  - **Endpoints:** create `POST {base}/contents/generations/tasks`; poll `GET {base}/contents/generations/tasks/{id}` (~every 10s). Base default `https://ark.ap-southeast.bytepluses.com/api/v3`. Headers: `Authorization: Bearer <key>`, `Content-Type: application/json`.
  - **Params are TOP-LEVEL JSON**, not `--flags` appended to the prompt text: `resolution`, `ratio`, `duration`, `watermark:false`, `generate_audio:true`. **Do NOT send `seed`** — unsupported/ignored on Seedance 2.0.
  - **content[]:** `{type:'text',text}` + keyframes inlined as base64 data URLs `{type:'image_url',image_url:{url:'data:image/png;base64,…'},role:'first_frame'|'last_frame'}`. A last frame requires a first frame (both roles together).
  - **Status enum (6 values):** `queued | running | cancelled | succeeded | failed | expired`. Continue on queued/running; terminal on the other four. On `failed`, surface top-level `error.code` / `error.message`.
  - **Result:** `content.video_url` — **expires in 24h**, so download immediately (the tool streams it to `--out` and verifies non-zero size).
  - **Model IDs:** standard → `dreamina-seedance-2-0-260128` (only this full 2.0 model does **4K**); fast → `dreamina-seedance-2-0-fast-260128` (720p cap); mini → `dreamina-seedance-2-0-mini-260615` (720p cap). Requesting `--resolution 4k` with fast/mini errors out.
  - **Beta rate limits:** ~2 QPS, max 3 concurrent tasks (the pipeline renders **sequentially** for safety), ~20 free fast calls per month. `seedance_render.mjs` backs off on HTTP 429 (exponential, ~5 retries).
- `.tmp/` is disposable (gitignored) — outputs don't persist across a cafe-PC reboot; the manifest + this SOP regenerate them.
