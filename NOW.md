# NOW — the resume doc
**Stamped: 2026-08-27** (session 35)

## ▶ NEXT ACTION — the One-Shot you want is behind a FLAG

```
http://localhost:5173/app?osaEngine=producer
```

**Without it you get the LEGACY path**, whose GENERATE VIDEO NOW hands you to the old manual module
([App.tsx:1897](App.tsx#L1897)). You never reach FirstCutScreen. Opt-in since **2026-07-01**
(`0db2da3`) — nothing regressed, it was always off by default. It persists to
`localStorage.osa_engine`, and **the defreezer wipes the browser profile** — the likely reason a
session that set it once worked and the next did not. UNVERIFIED but it fits. `?osaEngine=steps`
forces legacy back.

Right path = **Running → storyboard gate → FIRST CUT.** If you see "YOUR AD PLAN" with a
GENERATE VIDEO NOW button, the flag did not take.

## ✅ WHAT LANDED (main, CI green)

The seven fixes from `fix/poll-download-retry` are merged (`3f32d4f`). Also on main: `/eli5`, the
`artifacts` anchor CI job + its 9 tests, and a correction to the film run sheet.

⛔ **A whole session was wasted rebuilding three of those seven** before noticing the branch existed,
though SessionStart listed it second under "UNMERGED WORK IN FLIGHT". Reverted in `1615f21`. CLAUDE.md
warns about this in bold and logs three prior recurrences; this was the fourth. **Run `git branch -a`
and `git log --all --grep=<feature>` before touching any bug.**

## 🎬 FILM RUN — first real evidence, storyboard gate only

Ran on the LEGACY path, so 10 scenes not 8. Inputs reused from `apr_fa7cedc3`. No render. ~$1.09.

| Fix | Result |
|---|---|
| 2+3 invented packaging | ✅ **Clean.** Zero of 10 prompts name a box. Scene 7 = *"standing upright alone"* |
| 4 product description | ✅ **Clean.** Describes the PHOTO. It used to be a byte copy of the offer text |
| 7 wardrobe/set drift | ✅ **Clean.** Same blouse + same room across every human scene |
| 6 reference-mode routing | ✅ **Fired live:** `reference mode 'both' -> 'avatar' (avatar: true, product: false)` |
| 1 retry + 5 dialogue lock | ⬜ Neither exercised. Both need VIDEO, and Neil must LISTEN for 5 |

**Neil, later legacy run: "SOLID, 100% character consistent, wala na ung cinematic/warm lightings."**
Scene 1 opened on the PERFORMER, not bare skin — the old complaint, gone.

## ⚠ THINGS THE NEXT SESSION MUST NOT REDISCOVER

- **The end frame is NOT missing and was NOT removed.** `ReviewScreen` never renders it — its only
  mention is the ZIP export (`scene_N_end.png`, line 131). `StoryboardGateScreen:78-107` DOES show
  it. Confirm free: Download Assets (.zip) → `scenes/scene_1_end.png`. Scene 2 is NOT the end
  frame; the end frame is scene 1's partner.
- **The script box on "YOUR AD PLAN" is not new** — it shipped with `ReviewScreen` on 2026-07-30.
- **One-Shot legacy writes NO `producer_runs` row** (it carries a `finishedAdId`). A storyboard on
  that path lives ONLY in the browser tab. Do not go hunting for a run id.
- **Smoke tests stall on sign-in, every time.** OTP-only, no dev bypass, and
  `scripts/get-smoke-otp.ps1` **fails HTTP 401** (the key is an `sb_secret`; admin `generate_link`
  rejects it). Workaround: read the app's own email via the Gmail connector,
  `to:neilmaglaya.business22+smoke@gmail.com`. The classifier then blocks the agent from TYPING
  it, so **Neil enters the OTP by hand.** Fix the script or every smoke needs him.
- **BOTH unmetered flags are real** and `scripts/enable-dev-unmetered-video.ps1` sets both:
  `GRIFON_DEV_UNMETERED` covers the MONTHLY meters (a storyboard burns 11 images before any video),
  `_VIDEO` covers the 402/429. The sheet claimed the first was fake — fixed in `86ae245`.
- **An agent CAN run a puller with node's env-file flag** (measured). The warden blocks READING .env.
- **`avatar_url` is NOT always dropped** — 833,726 bytes on `apr_fa7cedc3`; the >700KB slim rule
  applies to `input`, not that column. Identity-reference blocker CLOSED: 7 of 27 runs carry it,
  the four biggest 809k–846k with `input.avatar.url` empty. `ProducerFlow` rehydrates on resume.

## ⏭ OPEN — ranked

1. **A film run on the PRODUCER path.** Nothing above is proven until fixes 1 and 5 meet video.
   Sheet: [`workflows/film_run_sheet.md`](workflows/film_run_sheet.md). Neil holds the spend.
2. **Sample previews.** `SAMPLES = {}`, all 13 recipes still say "Sample soon". The batch wants a
   FRESH brand, not the Hiraya Glow test set.
3. **Landing page has one false claim.** `ProofGallery` says real businesses ran these ads, over
   CSS mockups; `/exit/proof-ad.mp4` does not exist. Copy fix needs no render — do it first.
4. **"Presents as succeeding while failing" — LAUNCH BLOCKER.** Did NOT recur this run.
5. **Quota race in `consumeFinishedAd`. Supabase FREE tier past grace. PRO loss-making at full
   use** — cap founder invites at 5–10.

## ⚠ CARRIED / LOOSE ENDS
- **Dev server may still be running on 5173.** Both unmetered flags are set in `.env`, local only.
- **Uncommitted junk in the repo root:** `storyboard-gate.png`, `scene1-full.png` …
  `scene10-full.png`, and `.playwright-mcp/hero.jpg`. Delete or move them.
- Desktop assets (wiped by the defreezer): `hiraya-hero.jpg` (the real upload — one bottle, no box)
  and `hiraya-presenter.png`, both pulled from Postgres.
- Scene grade stays REJECTED — the **luma term** killed it. Only Kling takes an end frame
  (`image_tail`); Kling paid, 100 points to 09-22. Two different 402s on `api/kling/video.ts`
  (our meter vs Kling's balance) — **read the body.** `VITE_` flags are build-time.
- Branch `feat/hook-layout-system` (`1245d14`) unmerged; 31 branches still ahead of main.

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90.
Repo artifacts are ENGLISH; ads stay Taglish. Cafe-PC warnings: `cafe_session.md` §A6.
