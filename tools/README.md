# Tools

Deterministic Python (or Node) scripts that do the actual work. Invoked by the agent per workflow instructions.

Conventions:

- One job per script. Clear name.
- Read secrets from `.env`, never hardcoded.
- Print structured output (JSON when piping to another step).
- Exit non-zero on failure with a readable error on stderr.
- Prefer Node (`.mjs`) over Python for new tools on the cafe PCs: the defreezer
  wipes the Python interpreter itself (pip self-install can't recover), while
  `node_modules` ships with the repo's `npm install`.

## Index

- `analyze_video.py` — Viral Autopsy: Gemini watches a social video, returns Edit-DNA JSON (driven by `.claude/skills/viral-autopsy/`). Needs Python restored.
- `render_qa.mjs` — FINAL_RENDER QA: Gemini watches one of OUR rendered ads, returns a defect report (accent, caption lag, slop, overlay placement, dead air). `node tools/render_qa.mjs <path-or-url> [--focus "..."]`.
- `check-bundle-leak.mjs` — Crown-jewel bundle-leak guard: greps the built `dist/` for the 5 server-side prompts (patterns mirror `services/CLAUDE.md`) and exits non-zero if any leaked into the client bundle. Run after `npm run build`; wired into CI (`npm run check:bundle-leak`).
