# Handoff — 2026-06-05 — Hasan Efendi cold-brew smoke: 6 fixes shipped, render blocked on real Pro cap

> **TL;DR:** Resumed the 2026-06-04 handoff on branch **`claude/effort-estimation-AhHqn` (PR #9)**.
> Applied the 2 pre-approved wizard fixes (A: mouth-obstruction→b-roll, B: hook 5s), verified, pushed
> (`1167b33`). Re-drove a fresh **Hasan Efendi cold-brew** Taglish-Testimonial smoke — **hook=5s confirmed
> live three ways** (UI chip, pipeline header, network proxy log `kling-video-o1, duration: 5`). The
> render reached **5/7** then **scenes 6 & 7 (Veo) failed on a Gemini 402 + the real Pro 15/15 monthly
> video cap**. Neil flagged 4 more real bugs; all diagnosed + fixed locally (zero API) and pushed
> (`f833f2b`). **Not yet done:** the 7/7 → final-MP4 #10 smoke (blocked on Neil's monthly video cap; a
> dev bypass now exists). Build/tests/leak-check all green.

## Branch / state
- Branch **`claude/effort-estimation-AhHqn`** (PR #9). Two commits added this session:
  - `1167b33` — Fix A (mouth-obstruction→b-roll classifier, geminiService.ts) + Fix B (hook 5s cap, GenerateVideo).
  - `f833f2b` — the 4 new fixes + dev meter bypass (below).
- Gates green on `f833f2b`: `npm run build` exit 0; **31/31** tests (quota.monthly + quota.parity +
  renderFfmpeg + sceneVoiceRoute); crown-jewel + CTA + secret **leak check = 0**.
- Working tree clean. `.env` got `GRIFON_DEV_UNMETERED_VIDEO=true` appended (local only, NOT committed).

## What verified LIVE this session
- **Fix B (hook = 5s) — confirmed three ways:** UI duration chip `9:16 · 5s · 720p`; pipeline header
  `KLING O1 (OMNI) · … · 5S`; and the network proxy log `[grifon:gv:kling-omni:proxy] {model:
  kling-video-o1, duration: 5}`. Pre-fix this was 10. Other b-roll Kling scenes correctly stayed at
  `duration: 10` at the time (now also capped by Fix #3 below).
- **Fix A** committed but **not exercised** — this storyboard had no drinking/sip scene (Neil: "let it
  be"). The classifier still produced clean b-roll/talking splits (S1/3/5 b-roll, S2/4/6/7 talking).
- 5/7 scenes rendered cleanly (product fidelity excellent — the Hasan Efendi label reproduced faithfully).

## The 6 fixes (all on `f833f2b` unless noted)
| # | Bug | Root cause | Fix (file) |
|---|-----|-----------|------------|
| A | drinking scene lip-synced (Scene-6 morph) | classifier had no mouth-obstruction rule | `1167b33` geminiService.ts :2112 MOUTH-OBSTRUCTION OVERRIDE |
| B | hook rendered 10s | 11-word Taglish hook snapped UP to Kling 10s | `1167b33` GenerateVideo/index.tsx — cap sceneIdx 0 to 5s |
| 1 | Pro acct shows "FREE 15/15 → Creator" | wall read client `useSubscription` plan while used/limit came from server 402 | App.tsx — wall now reads `quotaWall.plan` (server-authoritative); `nextPlan = nextTier(quotaWall.plan)` |
| 2 | CTA always invents a free "recipe ebook" | prompt CTA rule listed "ebooks" + ✅ example literally said "recipe ebook" → Gemini parrots it | api/_lib/prompts.ts (Testimonial + MrBeast) — use ONLY value-adds literally in `${offer}`, invent nothing, neutral fallback. **TUNED, Neil-approved.** |
| 3 | b-roll renders 10s | ~12-word line → 5.6s → snap-UP to Kling's only other option (10); **no MrBeast rule ever existed** | GenerateVideo/index.tsx — `i===0 \|\| p.type==='b-roll'` → shortDuration (5s). Talking/cinematic keep heuristic. |
| 4 | duplicate hand in pour shot | ANATOMICAL_LOCK forced "exactly TWO hands" → phantom 2nd hand in 1-hand actions | geminiService.ts :1889 + :1910 — render only the hands the action needs; never extra/phantom/duplicate. **TUNED, Neil-approved.** |

### Dev video-meter bypass (Neil-approved)
- `api/_lib/quota.ts` `consumeMonthly`: when `process.env.GRIFON_DEV_UNMETERED_VIDEO === 'true'` and
  `unit === 'video_ads'`, returns allowed without consuming. Scoped to video only. **Absent under vitest
  and on Vercel**, so CI/prod stay fully metered (quota.monthly test still asserts the real cap).
- Documented in `.env.example`; set to `true` in local `.env` (defreeze wipes `.env` → re-add the flag,
  or copy from `.env.example`).

## Still OPEN (next session)
1. **The #10 final-MP4 smoke is NOT done.** Blocked at 5/7 by (a) a Gemini/Veo **402 Payment Required**
   and (b) Neil's **real Pro video_ads cap = 15/month, fully used in June**. The dev bypass clears (b)
   locally; **(a) still needs Gemini billing topped up** before Veo will render. Once both clear:
   re-drive (or just re-render scenes 6 & 7 if the session persists), reach 7/7 → SEND TO AI EDITOR →
   Consolidate Voice → Render Final → watch the MP4. That closes #10. (Path gated on `allDone` —
   `components/SignalModulator/ScenePipelineTile.tsx:73,338`; editor `editorBatch` null until
   `onSendToAiEditor` — `App.tsx:1168`.)
   - **VOICE STAGE DE-RISKED 2026-06-05 (was the big unknown, now GREEN):** the audio pipeline
     (sceneVoiceRoute → TTS for hook/b-roll, STS voice-changer for talking avatars → ffmpeg mux) is
     fully implemented + the routing/trim logic is unit-tested. An isolated pre-check
     (`node scripts/check-elevenlabs-voice.mjs`) first caught an **unpaid ElevenLabs invoice** (TTS 401
     `payment_issue`) that would have failed all scenes mid-smoke; Neil paid it, and TTS **and** STS now
     return 200 — **STS is confirmed available on the plan.** Remaining voice items are eyeball-only:
     lip-sync drift on talking scenes, do Consolidate+Render in one sitting (24h signed-URL window),
     re-run any scene whose MP4 download hiccups. **Run the pre-check before each smoke.**
   - **Net:** the ONLY remaining external blocker for #10 is **Gemini/Veo billing** (item a above).
2. **Pro video_ads = 15/month may be too low** for a real Pro user (separate from the dev bypass).
   Raising it needs `MONTHLY_LIMITS` (api/_lib/quota.ts:108) + `PLAN_LIMITS` (utils/planGate.ts) parity
   (deep-equal'd by `tests/unit/quota.parity.test.ts`) + the marketing copy in `config/planFeatures.ts`.
   Deferred — product decision.
3. **Metering muddle worth a look:** the wall conflates "AI video ads" with "video ad workflows", and
   `PLAN_FEATURES` advertises Creator with video workflows while `MONTHLY_LIMITS.creator.video_ads = 0`.
   Also a latent divergence the investigation flagged: `useSubscription` shows `plan_id` ignoring
   `status`, while server `getUserPlan` (api/_lib/userPlan.ts) gates on `status ∈ {active,trialing}` —
   a Pro sub in `past_due` would show "Pro" in the header but meter as free. Not the bug that bit here
   (that was the App.tsx wiring, now fixed), but worth reconciling.
4. **Fix A still needs a live drinking-scene to confirm** end-to-end. Re-roll a storyboard that lands a
   sip/drink scene (or pick a product that naturally drinks) and confirm Step 7 classifies it b-roll.

## Smoke inputs used (reproducible)
- Hero: CC0 Pexels handheld cold-brew bottle, label **"Hasan Efendi — Cold Brew Coffee"** (re-source per
  `director-smoke`; the temp copy was wiped). Brand derived from label per the skill.
- Market Research → Send to Director (Step 1/2 auto-prefill verified) → Testimonial + Taglish → 7 scenes.
- Account: Neil's **Pro** (signed in manually; Playwright-driven Chromium at localhost:5173).

## Durable
- All code on PR #9 (`f833f2b`). This handoff. `.env.example` documents the dev flag.
