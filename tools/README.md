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
- `analyze_ad_image.mjs` — Static Ad Autopsy: Gemini vision decodes a still image ad (layout, verbatim copy, visual DNA, persuasion levers) into specificity-gated JSON + ingests a compressed copy to `assets/ad-swipe/` (driven by `.claude/skills/static-autopsy/`). `node tools/analyze_ad_image.mjs <image-or-folder> --brand "Name" [--entry E18 | --start-entry 18] [--ingest-only]`.
- `render_qa.mjs` — FINAL_RENDER QA: Gemini watches one of OUR rendered ads, returns a defect report (accent, caption lag, slop, overlay placement, dead air). `node tools/render_qa.mjs <path-or-url> [--focus "..."]`.
- `librarian_sweep.mjs` — post-merge stale-doc sweep (the "librarian"): derives terms from a merge's changed files + subject, flags living-doc lines that mention them AND carry a staleness marker ("not started", "parked", "pending"...). Agent judges hits, updates/tombstones doc lines. `node tools/librarian_sweep.mjs [--merge <sha> | --range A..B] [--terms extra,terms]`. Advisory, always exits 0. Excludes `handoff_*`/archive docs (historical by design).
- `resume_doc_check.mjs` — the **retrieval** verifier (companion to the librarian above; librarian asks "did a merge make a doc lie?", this asks "can a fresh session find its next action in one hop?"). Checks `NOW.md` exists, is one screen, keeps its `## ▶ NEXT ACTION` heading (the SessionStart hook greps that exact string), is not stamped behind the newest commit, has not regrown CURRENT/PREVIOUS append-blocks, and is the **sole** doc claiming resume-doc primacy — the 3-competing-claimants failure of 2026-08-01. `node tools/resume_doc_check.mjs [--strict] [--quiet]`. Advisory (exit 0) by default; `--strict` exits 1 for hooks/CI. Run `--quiet` by the SessionStart hook, so it is silent when healthy and loud when rotted. Owns all freshness thresholds — do not duplicate them in the hook.
- `check-bundle-leak.mjs` — Crown-jewel bundle-leak guard: greps the built `dist/` for the 5 server-side prompts (patterns mirror `services/CLAUDE.md`) and exits non-zero if any leaked into the client bundle. Run after `npm run build`; wired into CI (`npm run check:bundle-leak`).
