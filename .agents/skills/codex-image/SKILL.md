---
name: codex-image
description: Generate or edit real image assets (hero/product shots, ad creatives, logos, mockups, icons, banners, Batch Creative Gen plates) using available Codex image generation tools, with an optional local CLI fallback. Use whenever the task must CREATE or EDIT an actual image. NOT for analyzing existing ad images (static-autopsy).
---

For Codex tool execution, read [the desktop adapter](../_shared/codex-runtime.md) before following the workflow below.

Use the native image generation/editing tool through the installed `imagegen` skill first. Inspect every reference image before editing and preserve the approved inputs and identity anchors. Show the returned image and link its saved local output when available.

## Optional local CLI fallback

Use the wrapper only if native generation is unavailable and the installed CLI supports `$imagegen`. Confirm `codex exec --help` and `codex login status` without reading credentials. Desktop sign-in does not prove a separately installed CLI is authenticated. Installation/login uses `scripts/restore-codex.ps1`; do not reinstall merely because this optional route is unused.

This path consumes the configured account's usage. Do not promise a particular tier, price, quota or image count. All paid operation approval boundaries in AGENTS.md apply.

## How to use it

Call the wrapper with a prompt and an output path. The wrapper preflights that Codex is installed + logged in, then dispatches to `codex exec` with `$imagegen`:

```bash
node .agents/skills/codex-image/generate.mjs --prompt "<what to draw>" --out <path.png> [--size 1024x1536] [--edit <input.png>]
```

- `--prompt` (required) — the image description, or an edit instruction when `--edit` is set.
- `--out` (required) — where to save the PNG.
- `--size` — `1024x1024` (default), `1024x1536` (portrait), `1536x1024` (landscape).
- `--edit <input>` — edit mode: pass an existing image for Codex to modify. Repeatable (`--edit a.png --edit b.png`) for multi-reference composition — e.g. an identity anchor + a body/scene anchor, per the `generate-zam-images` dual-anchor pattern (codex `-i` is variadic).

**Safety:** the wrapper always runs Codex in its workspace-write sandbox (`--sandbox workspace-write`) and refuses output paths outside the repo. It never disables Codex's sandbox or approval gates — so keep `--out` inside the repo (e.g. `.tmp/hero.png`).

### Examples

Generate a hero plate:
```bash
node .agents/skills/codex-image/generate.mjs \
  --prompt "Photorealistic studio product shot: white supplement jar with a gold lid beside a golden doodle puppy on a cream blanket, warm soft lighting, shallow depth of field, no text" \
  --out .tmp/demo/hero.png --size 1024x1536
```

Then feed that PNG into **Batch Creative Gen** as the hero, or composite it locally.

**Batches (multiple images) — ALWAYS run in parallel, never one-at-a-time.** When the request is for **more than one image**, do NOT loop the single-image wrapper sequentially (slow: N × ~2 min). Reach for the parallel batch runner automatically — the user should not have to ask for parallelism:

```bash
node tools/codex-image-batch.mjs --manifest <manifest.json> [--concurrency 8] [--force]
# manifest.json = [{ "prompt": "...", "out": "public/x.png", "size": "1024x1024" }, ...]
```

It fans all prompts out concurrently, **skips files that already exist** (re-runnable), and **prints a per-image + total wall-clock timer**.

**Realistic timing (measured, not aspirational):** each image is a *full* `codex exec` agentic session (~2 min of agent overhead), and Codex throttles to ~**8 concurrent** — so wall-clock scales with the number of 8-wide waves, NOT toward a single image. A real 12-image run took **~6.4 min** (first 8 in ~130s, last 4 queued to ~320–380s). Extrapolated, **100 images is ~25–50 min, not 4 min.** The "100 in ~4 min, $0" line in `tools/batch-creative-codex.mjs` and `workflows/batch_creative_codex.md` is aspirational — it is **not achievable on the `codex login` ($0) path**, because the bottleneck is the per-image Codex-agent overhead, not the image generation itself. These are historical measurements, not current timing, price or quota guarantees.

**Two batch runners exist — pick by need:**
- `tools/codex-image-batch.mjs` — simple manifest fan-out (`[{prompt,out,size}]`), skips-existing, prints a wall-clock timer. Use for ad-hoc multi-image runs.
- `tools/batch-creative-codex.mjs` — brand-master workflow: one locked Grifon master prompt over an *angles* list, optional Zam `--ref`, a `--require-cmo` copy gate, and a manifest. Use for on-brand ad-creative batches (see `workflows/batch_creative_codex.md`).

## After generating

- Verify the file exists (the wrapper prints `✓ saved <path>` and exits non-zero if not).
- To show the user, inspect the image with the available image viewer and return a clickable absolute local file link.

## Troubleshooting

- **"Codex CLI not found on PATH"** → not installed. `npm i -g @openai/codex`, then `codex login`. Use native desktop image generation if available; CLI availability is host-specific.
- **"not logged in / no auth.json"** → run `codex login`.
- **"codex finished but no file"** → choose an `--out` inside the repo (e.g. `.tmp/hero.png`) so Codex can write it within its workspace sandbox.
- **Flag rejected by `codex exec`** → Codex flag names can change between versions; check `codex exec --help` and adjust `generate.mjs`.

## Scope

- This is a **dev-time** asset tool for the agent — it is **not** wired into the Grifon product. The shipped Batch Creative Gen module generates its hero via the app's own **Gemini** integration; this skill is for generating/previewing images during a session (e.g. a real hero plate to demo the module).
