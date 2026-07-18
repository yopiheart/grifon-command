---
name: codex-image
description: Generate or edit real image assets (hero/product shots, ad creatives, logos, mockups, icons, banners, Batch Creative Gen plates) via the Codex CLI's built-in gpt-image-2 bridge, billed to the ChatGPT plan. Use whenever the task must CREATE or EDIT an actual image, or the user says "generate/make/draw an image". Requires Codex CLI installed + logged in (local machine only, not the web sandbox). NOT for analyzing existing ad images (static-autopsy).
---

This skill is a **bridge**: Claude Code has no native image generation, but the OpenAI **Codex CLI** ships a built-in one (`gpt-image-2`, triggered with `$imagegen`). This skill shells out to Codex to produce a real image file, billed to the user's **ChatGPT subscription** — no API key.

## Prerequisites (one-time per machine)

This runs Codex **on the same machine as Claude Code**. It does **not** work in the Claude Code web sandbox (no Codex there). On a local PC:

0. **A paid ChatGPT plan (Plus $20/mo or higher).** The Codex CLI is free, but the `codex login` path bills against your ChatGPT plan's limits — the **free** ChatGPT tier does **not** include Codex usage. ("$0 cost" means no per-image charge on top of the sub, not no sub.) Image-gen (`$imagegen`) inclusion/limits per tier can change — confirm on OpenAI's plan page. (The alternative — an `OPENAI_API_KEY` — is pay-per-image and is *not* the path this skill uses.)
1. `npm i -g @openai/codex`
2. `codex login` — sign in with the ChatGPT account (writes an OAuth token to `~/.codex/auth.json`). No `OPENAI_API_KEY` needed.

On the cafe PCs (defreezer wipes `~/`), re-arm both steps after a reboot with **`scripts/restore-codex.ps1`**.

## How to use it

Call the wrapper with a prompt and an output path. The wrapper preflights that Codex is installed + logged in, then dispatches to `codex exec` with `$imagegen`:

```bash
node .claude/skills/codex-image/generate.mjs --prompt "<what to draw>" --out <path.png> [--size 1024x1536] [--edit <input.png>]
```

- `--prompt` (required) — the image description, or an edit instruction when `--edit` is set.
- `--out` (required) — where to save the PNG.
- `--size` — `1024x1024` (default), `1024x1536` (portrait), `1536x1024` (landscape).
- `--edit <input>` — edit mode: pass an existing image for Codex to modify. Repeatable (`--edit a.png --edit b.png`) for multi-reference composition — e.g. an identity anchor + a body/scene anchor, per the `generate-zam-images` dual-anchor pattern (codex `-i` is variadic).

**Safety:** the wrapper always runs Codex in its workspace-write sandbox (`--full-auto`) and refuses output paths outside the repo. It never disables Codex's sandbox or approval gates — so keep `--out` inside the repo (e.g. `.tmp/hero.png`).

### Examples

Generate a hero plate:
```bash
node .claude/skills/codex-image/generate.mjs \
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

**Realistic timing (measured, not aspirational):** each image is a *full* `codex exec` agentic session (~2 min of agent overhead), and Codex throttles to ~**8 concurrent** — so wall-clock scales with the number of 8-wide waves, NOT toward a single image. A real 12-image run took **~6.4 min** (first 8 in ~130s, last 4 queued to ~320–380s). Extrapolated, **100 images is ~25–50 min, not 4 min.** The "100 in ~4 min, $0" line in `tools/batch-creative-codex.mjs` and `workflows/batch_creative_codex.md` is aspirational — it is **not achievable on the `codex login` ($0) path**, because the bottleneck is the per-image Codex-agent overhead, not the image generation itself. Genuine 100-in-~4-min needs the OpenAI **Images API** directly (`gpt-image-1`, high parallelism), which is **pay-per-image** (~$1–4 / 100, needs `OPENAI_API_KEY`) — i.e. NOT this skill's $0 bridge.

**Two batch runners exist — pick by need:**
- `tools/codex-image-batch.mjs` — simple manifest fan-out (`[{prompt,out,size}]`), skips-existing, prints a wall-clock timer. Use for ad-hoc multi-image runs.
- `tools/batch-creative-codex.mjs` — brand-master workflow: one locked Grifon master prompt over an *angles* list, optional Zam `--ref`, a `--require-cmo` copy gate, and a manifest. Use for on-brand ad-creative batches (see `workflows/batch_creative_codex.md`).

## After generating

- Verify the file exists (the wrapper prints `✓ saved <path>` and exits non-zero if not).
- To show the user, read the image back (Read tool) or `SendUserFile`.

## Troubleshooting

- **"Codex CLI not found on PATH"** → not installed. `npm i -g @openai/codex`, then `codex login`. In the **web sandbox this is expected** — Codex can't be installed there; tell the user it only runs on their local machine.
- **"not logged in / no auth.json"** → run `codex login`.
- **"codex finished but no file"** → choose an `--out` inside the repo (e.g. `.tmp/hero.png`) so Codex can write it within its workspace sandbox.
- **Flag rejected by `codex exec`** → Codex flag names can change between versions; check `codex exec --help` and adjust `generate.mjs`.

## Scope

- This is a **dev-time** asset tool for the agent — it is **not** wired into the Grifon product. The shipped Batch Creative Gen module generates its hero via the app's own **Gemini** integration; this skill is for generating/previewing images during a session (e.g. a real hero plate to demo the module).
