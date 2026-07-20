# Smoke-Test Setup — the canonical environment SOP (2026-07-02)

**Why this exists:** every browser smoke kept re-hitting the same session-setup walls
(Google OAuth has no headless bypass; the recorded test-account *password* went stale when
auth shipped passwordless-OTP; quota/rate walls mid-render; screenshot folders denied to
background agents). Neil's directive 2026-07-02: make the smoke-tester setup match the
CURRENT app so smokes run without these stalls. This file is the single source of truth —
supersedes the scattered "Reusable smoke setup" notes in `expert_manual_mode.md`.

## The test account

- **Email:** `neilmaglaya.business22+smoke@gmail.com` — a plus-alias of Neil's Gmail
  (changed 2026-07-02 with Neil's GO, was `smoketest-dc@grifon.dev`; same Supabase user,
  created 2026-06-27 via admin API, `email_confirm:true`).
- **Auth is OTP-ONLY.** The app's email sign-in is passwordless (6-digit code). The old
  recorded password (`GrifonDcSmoke!2026`) is DEAD — there is no password field. Do not
  brief agents to use it.
- **Sign-in procedure (agent-readable OTP — the whole point of the plus-alias):**
  smoke agent enters the email → app shows `// CODE_SENT` → the OTP email lands in
  **Neil's Gmail inbox**, which the MAIN loop reads via the claude.ai Gmail connector
  (`search_threads` for the newest Grifon/Supabase verification mail → extract the
  6-digit code) → relay the code to the smoke agent → it types it into
  `// VERIFICATION CODE`. Hands-free for Neil; no admin API involved.
- **Do NOT chase `generate_link`:** `scripts/get-smoke-otp.ps1` is retired-in-place —
  Supabase's hosted platform 401s `/auth/v1/admin/generate_link` with BOTH key classes
  (while `/auth/v1/admin/users` accepts `sb_secret` fine), i.e. OTP extraction via the
  admin API is platform-blocked. Verified 2026-07-02 after much pain. The Gmail path
  above is the way.
- **Plan state:** bumped to `business` + 999 video / 999 cinematic credits on 2026-07-02
  (Neil-approved) so smokes never hit upgrade walls. If a future session finds it
  downgraded, re-run (needs Neil's explicit GO — it writes prod DB):
  ```sql
  update public.subscriptions s set plan_id='business', video_ad_credits=999,
    cinematic_credits=999, updated_at=now()
  from auth.users u where u.id=s.user_id and u.email='smoketest-dc@grifon.dev';
  ```
- **If the account itself is gone:** recreate via the Supabase admin API with
  `email_confirm:true` (service-role key in `.env`), then the plan bump above.

## Per-session environment (defreezer wipes ALL of this)

0. **GEMINI_API_KEY must be on a BILLING-ENABLED project — verify BEFORE any paid smoke.**
   The whole One-Shot/Producer flow dies at step 1 (market research) if the key can't spend:
   the free tier for `gemini-2.0-flash` is **`limit: 0`** (zero requests/day), so every
   `POST /api/gemini/text` returns `429 RESOURCE_EXHAUSTED` and the flow just spins
   "Researching your market…" through the ~124s retry backoff. This is NOT usage-exhaustion
   that resets — waiting never clears a limit of 0. The defreezer-restored `.env` can carry a
   personal free key instead of the production billing-enabled one (hit 2026-07-02, SIGLA smoke).
   **Probe the key directly (not via the app) to be sure:**
   ```bash
   KEY=$(grep '^GEMINI_API_KEY=' .env | cut -d= -f2-)
   # probe against the app's CURRENT textModel (services/geminiService.ts) — gemini-2.0-flash
   # 404s since ~2026-07 (retired); a 404 here means STALE MODEL, not a dead key:
   curl -s -o /dev/null -w "%{http_code}\n" -X POST \
     "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=$KEY" \
     -H "Content-Type: application/json" -d '{"contents":[{"parts":[{"text":"hi"}]}]}'
   ```
   `200` = good to spend. `429` with `free_tier_requests, limit: 0` = billing off → escalate to
   Neil (enable billing on the project, or supply a billing-enabled key). Note: the
   dev-unmetered flag does NOT help — it gates Grifon's own credit metering, downstream of Gemini.
1. `.env` restored (all keys — see CLAUDE.md list).
2. `.\scripts\enable-dev-unmetered-video.ps1` → sets `GRIFON_DEV_UNMETERED=true` +
   `GRIFON_DEV_UNMETERED_VIDEO=true` (skips the 402 monthly quota + the 429 hourly wall,
   LOCAL ONLY). **Always BEFORE the render starts** — mid-render walls destroy the run.
3. `npm run dev` (restart it if the flags were added while it was running).
4. Dev unlock for gated UI (presets etc.): `localStorage.grifon_dev_unlock='1'`.
5. Producer-engine smokes: navigate with `?osaEngine=producer` (persists to localStorage;
   `?osaEngine=steps` forces legacy).
6. Pre-create any screenshot/output folder from the MAIN loop before spawning the agent
   (background agents auto-deny permission prompts — agent_lessons 2026-06-10).
7. **Playwright "Browser is already in use for …mcp-chrome-351a002" → orphaned MCP servers.**
   Prior sessions leave `@playwright/mcp` node processes + their Chrome tree holding the
   shared profile lock (hit 2026-07-03). Fix from the MAIN loop: list candidates with
   `Get-CimInstance Win32_Process` filtered on `playwright*mcp` / `mcp-chrome-351a002`,
   **keep the newest node pair (this session's own MCP server)**, `taskkill /T /F` the rest.
   The smoke agent can't do this itself — its permission scope blocks the kill.

## ⛔ Test Spec gate — NO paid test fires without Neil approving this first (2026-07-02)

Neil's standing rule, any module, any session: **finalize WHAT we're testing before testing.**
Fill this template, show it to Neil, get his approve/edit — THEN drive. "Approved" applies to
the spec as shown; if anything changes, re-ask. (Lesson: agent_lessons 2026-07-02.)

```
TEST SPEC — <name>                              date:
1 PURPOSE     what this run PROVES + pre-agreed pass/fail criteria
2 MODULE      module/flow + entry point (incl. flags like ?osaEngine=…)
3 INTAKE      brand / offer / price / niche-vertical / format-aspect / language / settings
4 ASSETS      exact files to upload; if an asset or character must be GENERATED,
              use the Codex CLI (codex-image skill) — never stock-hunt or improvise
5 PRESENTER   upload vs auto-cast, and why
6 EVIDENCE    what comes back: screenshots (paths), DB queries, network counts;
              what Neil eyeballs vs what the agent asserts
7 COST        rough quota/spend estimate (scenes × renders; metered or unmetered)
8 CLEANUP     what happens to test data/runs afterward
```

Cheap-first rule: if a zero-API preview exists for the surface (e.g.
`/one-shot-flow-preview.html`), dry-run the UI there BEFORE the paid run.

## Driving rules (unchanged, enforced elsewhere but repeated for one-stop reading)

- Load `.claude/skills/director-smoke` BEFORE any full-ad smoke: hero-image-FIRST
  (committed heroes live at `public/examples/ex-*.png` — `ex-product-handheld.png` is the
  handheld Sunrise Mango Juice bottle), Market Research before Director, never hand-type
  wizard Step 1/2 prefill fields. (The One-Shot/Producer LaunchScreen intake IS typed —
  that's the real consumer flow, not the wizard prefill.)
- Delegate ALL browser driving to the `smoke-tester` subagent, **foreground**, Sonnet 5.
- **Eyeball the renders yourself** — have the agent save screenshots to `.tmp/<smoke>/`
  and LOOK at them; don't trust prose verdicts (expert_manual_mode 2026-06-28 lesson).
- Verify spend invariants in the DB after producer smokes: `producer_scenes.attempts`
  (expect 1 per scene; the poll-on-resume path never re-claims), run `status`/`revision`.

## Known auth facts (so nobody re-derives them)

- Google OAuth: NO headless bypass; only used when Neil drives the login himself.
- Supabase API keys (verified 2026-07-02): the project uses NEW-format keys; the
  `sb_secret_*` in `SUPABASE_SERVICE_ROLE_KEY` works on REST **and** the GoTrue admin
  API. The LEGACY `service_role` JWT is valid-but-rejected (legacy keys disabled
  project-wide) — do NOT chase it; `SUPABASE_SERVICE_ROLE_JWT` in `.env` is only an
  optional fallback slot for the script.
- Email OTP: 6-digit input in the UI; `get-smoke-otp.ps1` prints whatever GoTrue mints —
  if the printed code isn't 6 digits, that's the otp-length mismatch from
  agent_lessons 2026-06 (fix the Supabase `otp_length` setting, don't fight the UI).
- OTPs are single-use and short-lived; re-run the script for every new sign-in.

## TODO (post-PR-#41 merge — recorded 2026-07-02 per Neil's "fix it later")

- [ ] Update `.claude/agents/smoke-tester.md` on MAIN (branch copy is stale/conflicting):
      point its prompt at THIS file so the agent knows the OTP flow + setup without a
      hand-written brief every time.
- [ ] Prune the two stale "Reusable smoke setup" blocks in `expert_manual_mode.md`
      (they still advertise the dead password) — replace with a pointer here.
