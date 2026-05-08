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

### 2026-05-04 — Shared ElevenLabs workspace: visibility filters must fail-closed (allowlist), not fail-open (denylist)
**Context:** Building the `// FILIPINO_LIBRARY` section of the voice picker. The original filter at `api/elevenlabs/voices.ts` was `category !== 'premade' && !myIdSet.has(v.voice_id)` — i.e., "show all non-stock voices the current user doesn't own."
**What went wrong:** That filter is fail-open on a shared ElevenLabs workspace (Starter plan = one account = one voice pool for all Grifon users). Three concrete leaks resulted: (1) admin's personal clones (`Zam Grifon voice`, `NEIL MAGLAYA NEW VOICE`) appeared in every user's picker; (2) voices the admin saved from ElevenLabs Voice Library for personal reference (`James` — American English; `Ellen` — German English) appeared under a `FILIPINO_LIBRARY` header that didn't match their actual language; (3) future user clones would leak to other users — when User A clones a voice it goes into `user_voices(user_id=A)`, but `!myIdSet.has(voice_id)` is true for User B since their `myIdSet` is built from User B's rows, so A's clone falls through into B's `libraryVoices`. The label was also a lie: `// FILIPINO_LIBRARY` was a UI promise the filter didn't enforce.
**Lesson:** Anywhere the app fans out a shared account-level resource (ElevenLabs voices, Gemini Files, Vercel Blob, Supabase Storage buckets without RLS) to multi-tenant user UI, visibility must default to fail-closed. Use an explicit allowlist (`is in FILIPINO_LIBRARY`), not a denylist (`is not mine`). New entries default to invisible until admin explicitly blesses them. Patch landed 2026-05-04: `api/_lib/filipinoLibrary.ts` is the single source of truth, edited + redeployed when admin curates a new voice. Same rule applies to future features that surface account-level resources — when in doubt, default to hidden.

### 2026-05-04 — One localStorage key, two unrelated gates: don't dedupe by name
**Context:** While replacing the `localStorage.grifon_admin` gate at `components/SignalModulator/index.tsx` with a `useSubscription` plan-tier check, the prior session's handoff also recommended running `localStorage.removeItem('grifon_admin')` in the prod browser to "clean up the stale key." I relayed that advice to the user.
**What went wrong:** The `grifon_admin` key has **two consumers** with **different intents**. SignalModulator was using it as a feature gate for IVC (now plan-tier-gated). But `Dashboard.tsx:440,463` uses the same key as an **admin-only preview switch** for the entire MORE MODULES section (Signal Modulator, Influencer Forge, Generate Video, Image Ads, Organic Calendar, Edit Video, Cinematic Studio) — these are intentionally unfinished modules hidden from end users until ready. Removing the key on prod hid all 7 modules from the user's own dashboard and replaced them with a "Coming Soon" placeholder. Recovery: paste `localStorage.setItem('grifon_admin', 'true')` in DevTools and refresh.
**Lesson:** Before recommending the deletion of any flag, key, or env var, grep for **all** consumers — not just the one in front of you. `grep -rn 'grifon_admin'` would have surfaced the Dashboard usage in seconds. The cost of a 5-second search is much lower than the cost of regressing prod UI on someone's account. Same rule applies to refactoring shared keys: if a name is used in two places, *assume the intents differ* until you've read both consumers.

### 2026-05-08 — Subscription-model copy must match backend reality, not founder intent

**Context:** Building the on-domain `/checkout` page. Founder initially settled on no-auto-renew positioning, then pivoted mid-session to "I want monthly auto-charge like Claude/OpenAI." I almost reached for an `Edit` to flip the trust-badge copy to "Auto-renews monthly · Cancel anytime."
**What went wrong (caught before shipping):** The current backend creates a one-time PayMongo Payment Intent. There is no card-on-file storage, no billing cron, no recurring charge handler. Flipping copy to promise auto-renewal would have meant: customer pays, expects to be charged again in 30 days, isn't charged, either keeps free access or loses access without warning. Either outcome is a worse trust break than the original "no auto-renew" positioning. Caught it before writing the Edit, but only because I paused to think about technical scope before keystrokes.
**Lesson:** When the founder makes a strategic call about subscription/billing/recurring/trial behavior, the next question is **always** "does the backend support this?" — *before* drafting copy that asserts the new behavior. Subscription-model copy is a load-bearing claim, not just marketing language. If backend support is missing, surface it as a separate engineering workstream (see [workflows/auto_renew.md](workflows/auto_renew.md)) and ship neutral copy that doesn't promise either direction in the meantime. Same rule applies to: trial-period claims, refund-window claims, "cancel anytime" claims, "pause subscription" claims — every one of these is a backend feature gate masquerading as a copy choice.
