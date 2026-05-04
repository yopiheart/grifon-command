# Agent Lessons

A living log of behavioral guidance that emerges from actual mistakes made in this repo. Each entry is short, dated, and explains *what went wrong* and *what to do differently*.

This file is read at session start. Add to it when something goes sideways. Do not pre-write rules here for hypothetical mistakes — that's what `CLAUDE.md` and `.claude/skills/` are for. This file captures the lessons that *only* become apparent after they bite us.

## Format

```
### YYYY-MM-DD — One-line summary of the mistake
**Context:** What was being attempted
**What went wrong:** The specific failure
**Lesson:** What to do differently next time
```

## Entries

### 2026-05-04 — Vite dev plugin silently 404s prod-style dynamic API routes
**Context:** Voice-cloning DELETE endpoint at `api/elevenlabs/voices/[id].ts` worked on Vercel but always returned 404 in `npm run dev`.
**What went wrong:** The custom `vercelApiDevPlugin` in `vite.config.ts` only matched literal file paths — it didn't understand Vercel's `[param].ts` dynamic-segment convention. Any dynamic API route is invisible to local dev unless the resolver explicitly handles it. Production via Vercel's filesystem router worked fine, masking the problem until someone tested locally.
**Lesson:** Whenever a new `[param].ts` API route is added under `api/`, smoke-test it in `npm run dev`, not just on a Vercel preview. The dev plugin's resolver should stay feature-equivalent with Vercel's so dev/prod parity isn't a foot-gun. Patch landed 2026-05-04 to support single-level dynamic segments.

### 2026-05-04 — vite.config.ts env loader guard makes .env edits silently stale
**Context:** Iterating on the `ELEVEN_LABS_API_KEY` value in `.env` during voice-cloning debugging. Vite logged `.env changed, restarting server...` but the new key wasn't being used.
**What went wrong:** `vite.config.ts:81-84` uses `if (process.env[k] === undefined) process.env[k] = v` when promoting `.env` values into `process.env`. After the first config evaluation in a Node process, subsequent in-process restarts skip the assignment because `process.env[k]` is no longer undefined. Net effect: the *first* `.env` value sticks for the lifetime of the Node process.
**Lesson:** When the running dev server isn't picking up a `.env` change, don't trust Vite's "server restarted" message — TaskStop the npm process, kill any orphan node listening on the port, and `npm run dev` fresh. Patch landed 2026-05-04 dropping the undefined-guard at `vite.config.ts:97` so every config reload overwrites `process.env` with current `.env` values.
