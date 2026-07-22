# 3D Lab — Griffin Emblem (img2threejs-lab proof run #1)

> **SUPERSEDED 2026-07-22 — see [`hunyuan/`](hunyuan/) for the current lane.** After the
> eyeball-gate FAIL below, the real-mesh route won: Neil generated a textured GLB from
> `public/griffin-emblem.png` via the FREE `tencent/Hunyuan3D-2.1` HF Space (free HF
> account, "Gen Textured Shape", max face count, glb + Include Texture, then Transform →
> Download). Staged in our own Three.js viewer ([`hunyuan/viewer/`](hunyuan/viewer/) —
> 360° orbit, gold-rim rig at reduced intensities, auto-turntable) and published to
> <https://claude.ai/code/artifact/6a41cee3-7144-44a3-8e20-cc4251326136> (PROTO 03).
> Route notes: Meshy free tier = generate yes / export PRO-walled; anonymous HF ZeroGPU
> = quota-blocked (needs free login); fake-3D PNG parallax (PROTO 02) = Neil FAIL
> ("parang sticker"). Rebuild: `npm i three@0.179.0 esbuild`, bundle
> `hunyuan/viewer/main.ts`, inline into `shell.html` with the GLB as base64.

**Artifact (eyeball gate):** <https://claude.ai/code/artifact/0368f361-92fb-4e4b-9a9a-552bdec4f18f>
Session: 2026-07-21 · Skill: [`.claude/skills/img2threejs-lab/`](../../../.claude/skills/img2threejs-lab/SKILL.md) · Upstream pipeline: img2threejs v1.2.0

Procedural Three.js rebuild of `public/griffin-emblem.png` — **code-only, stylized
contract** (declared up front: single front reference, ornate micro-feather detail
not 1:1 reproducible; identity carried by silhouette, gold beak hook, amber eyes,
feather-row rhythm, chest filigree). All 8 upstream passes completed with reviews
recorded in [`spec.json`](spec.json) `reviewHistory` (blockout failed first
render — box scaffold — and went through 4 screenshot-driven refine-code rounds).

## Files

- `spec.json` — the full sculpt spec + quality contract + all pass reviews (the ledger)
- `src/createGriffinModel.ts` — the hand-sculpted factory (lathe bust, 2-draw-call
  instanced feather coat with gold-rim-behind-leaf trick, beak extrude+pinch,
  filigree tubes, sockets/collider in `userData.sculptRuntime`)
- `src/main.ts` — demo harness: spec lighting rig (key/fill/twin gold rims, ACES 1.1,
  contact shadow, zinc-950 stage), orbit/zoom, entry rise, eye-glow pulse,
  reduced-motion honored, `?view=front|three-quarter|profile|low-hero&spin=0&silhouette=1`
- `artifact.html` — the self-contained published page (bundle inlined)
- `review-sheet.jpg` — final reference-vs-render comparison sheet
- `shoot.js` — headless screenshot tool (playwright-core + pre-installed Chromium)

## Rebuild

```bash
npm i three@0.179.0 esbuild playwright-core   # in a scratch dir with these sources
npx esbuild src/main.ts --bundle --minify --outfile=dist/bundle.js
python3 -m http.server 8471 &
node shoot.js "front=http://localhost:8471/index.html?spin=0&view=front"
```

## Status

**Eyeball gate: FAIL for brand-mark use (Neil, 2026-07-22).** Verdict: for a *brand
mark*, "almost the same" reads as a bootleg of your own logo — viewers who know the
emblem feel the mismatch. The stylized-contract output is therefore unusable as the
Grifon emblem; no landing-hero integration plan proceeds from this asset.

Implications (recorded in `workflows/post_beta_roadmap.md` item #23):

- The procedural `img2threejs-lab` lane stays adopted, but **re-scoped to assets
  where stylized is acceptable** (generic props, client-flex product mockups where
  the client approves the stylized look, turntable b-roll experiments). It is the
  wrong tool for pixel-faithful brand marks — by design it never reads the image's
  pixels (no textures, no scan), only rebuilds procedurally.
- If a match-the-pixels 3D emblem is still wanted, the lane is a **hosted
  image-to-3D service** (Meshy/Tripo class, real mesh + PBR textures from the
  actual image) — evaluate on the free tier first before any spend.
- Files here are kept as the pipeline proof/ledger, not as a shippable asset.

**three.js is NOT in the app bundle; nothing in the product imports this.**
