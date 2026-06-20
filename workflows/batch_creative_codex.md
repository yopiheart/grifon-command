# Workflow: Batch Creative Gen (Codex / distinct-plate)

**Objective:** Produce N genuinely distinct, on-brand ad creatives — each starring Zam in the Grifon "black canvas + gold glow + bold headline + VIP lockup" system — by looping the `codex-image` skill over a list of angles with one locked master prompt. This is the "100 creatives in ~4 minutes, $0" method (billed to the ChatGPT plan via `codex login`).

Use this when:
- You want many *different* photoreal creatives (different scene/angle per ad), not one hero reused.
- You're making Grifon/Zam ads for your own campaigns on a local machine with Codex logged in.

> **Two methods, don't confuse them.** The in-app **Batch Creative Gen** module (`components/BatchFanOut/`) is the *cheap* method: ONE Gemini hero + Canvas text overlay, and it bills customers via Gemini. **This** workflow is the *distinct-plate* method: one Codex image per angle, $0 on a personal ChatGPT sub — for your own use, not customer-facing.

## Prerequisites
- **Codex CLI installed + logged in.** Run `scripts/restore-codex.ps1` (installs `@openai/codex`, runs `codex login`). Verify with `node .claude/skills/codex-image/generate.mjs --prompt "a husky in snow" --out .tmp/test.png`.
- Does **not** run in the locked web sandbox (no Codex there). Local machine only.

## Required inputs
- **Angles JSON** — array of `{ id?, headline, scene?, badge? }`. Starter: [`assets/creative-angles/grifon-zam.starter.json`](../assets/creative-angles/grifon-zam.starter.json) (~12 angles). Expand toward 100 (Step 1).
- **Zam's headshot** at `assets/brand/zam-ref.jpg` — commit it so it survives the defreezer.

## Tools
- `tools/batch-creative-codex.mjs` — orchestrator (composes prompts, runs a concurrency pool, writes a manifest). Shells out to `.claude/skills/codex-image/generate.mjs` per angle.
- `tools/batch-creative-codex.master.txt` — the **brand master prompt** (slots: `{{HEADLINE}}`, `{{SCENE}}`, `{{BADGE}}`). Edit this to tune the look. ⚠️ Brand-sensitive — eyeball changes.

## Procedure
1. **Write/expand the angles JSON.** Invoke the `grifon-cmo` skill to generate angles (risk-reversal, "selecting a few," "kick-off in 5 days," Free→Business ladder hooks) in Grifon's Taglish/direct-response voice. Keep each `headline` **short (3–7 words)** — baked text garbles if long. Save as e.g. `assets/creative-angles/grifon-zam.json`.
2. **Drop Zam's photo** at `assets/brand/zam-ref.jpg` and commit it.
3. **Dry run** (composes every prompt, spawns nothing — sanity-check the wording):
   ```
   npm run creative:batch -- --angles assets/creative-angles/grifon-zam.json --ref assets/brand/zam-ref.jpg --dry-run
   ```
4. **Smoke run — 2 images** (eyeball fidelity before spending the batch):
   ```
   npm run creative:batch -- --angles assets/creative-angles/grifon-zam.json --ref assets/brand/zam-ref.jpg --limit 2
   ```
   Open the 2 PNGs in `.tmp/batch-creative/<timestamp>/`. Check: Zam's face is faithful, gold-glow brand reads right, headline is spelled correctly and doesn't cover his face.
5. **Full batch:**
   ```
   npm run creative:batch -- --angles assets/creative-angles/grifon-zam.json --ref assets/brand/zam-ref.jpg --concurrency 4
   ```
6. **Collect winners.** Review `.tmp/batch-creative/<timestamp>/` + `manifest.json`. Copy the keepers somewhere durable (`.tmp/` is gitignored and disposable). Re-run any failed/garbled angles individually.

## Output(s)
- `.tmp/batch-creative/<timestamp>/NN-slug.png` — one creative per angle.
- `.tmp/batch-creative/<timestamp>/manifest.json` — each creative's headline/scene/badge, the composed prompt, and ok/fail.

## Flags
- `--concurrency <n>` (default 3) — the "4 minutes" lever. Raise for speed; lower if Codex throttles.
- `--limit <n>` — cap (cheap smoke runs).
- `--size <WxH>` (default `1024x1536`, 4:5 feed). Also `1024x1024`, `1536x1024`.
- `--master <file>` — swap the brand prompt template.
- `--dry-run` — compose + print, generate nothing.

## Edge cases / learnings
- **Baked-text fidelity:** `gpt-image-2` bakes the headline into the image — short headlines render cleanly, long ones garble. Expect ~1-in-10 rerolls; the manifest records each prompt so you can re-run a single angle.
- **Rate limits:** the ChatGPT sub throttles under heavy parallelism. If failures cluster, drop `--concurrency`. "$0" means no per-image charge, not infinite — Pro tier has the headroom for 100.
- **Pose variety (single-ref limitation):** one reference photo via Codex `--edit` keeps Zam's **face** consistent but constrains **pose** — vary it through the `scene` text. For very different poses later, add multiple reference photos or a face-lock pass.
- **Scope:** this is a personal/dev marketing tool. It rides *your* ChatGPT sub, so it can't power a customer-facing feature — that's what the Gemini-billed in-app module is for.
