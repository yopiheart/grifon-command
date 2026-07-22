# 3D Lab — Griffin Emblem (img2threejs-lab proof run #1)

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

Awaiting Neil's eyeball gate on the Artifact. Decision: go/no-go on a landing-hero
integration plan (lazy-loaded, landing-route-only, CSS fallback, `check:bundle-leak`,
`brand-check`) — see roadmap discussion in the 2026-07-21 session. **three.js is NOT
in the app bundle; nothing in the product imports this.**
