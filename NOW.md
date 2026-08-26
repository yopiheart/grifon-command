# NOW — the resume doc
**Stamped: 2026-08-26** (session 33)

## ▶ NEXT ACTION — verify the LAST claim before you write its diff

**Two of the three ❌ rows below were WRONG.** Both were found by reading the stored run instead of
this doc. So before touching the Veo layer, pull scene 7s stored VIDEO prompt from `apr_fa7cedc3`
and see whether the dialogue was improvised or ASKED FOR. Guessing cost a whole planned fix pass.

| Layer | Guard today |
|---|---|
| Script: price / scarcity / bonus | ✅ hard, `prompts.ts:512,940,941` |
| Image: packaging + props | ✅ FIXED 2026-08-27, `PRODUCT_TRUTH_RULE`. Diagnosis was wrong: the STORYBOARD wrote *"next to its outer package box"*; the image model obeyed. Upload = one bottle, looked at. 11 tests |
| Image: hair + wardrobe | ✅ already guarded — wardrobe by IDENTITY_LOCK rule 1 ([geminiService.ts:2492](services/geminiService.ts#L2492), variation deliberately REMOVED), hair by `APPEARANCE_LOCK_RULE` |
| Video: spoken dialogue | ❓ UNVERIFIED — Veo improvised *"Ito nang kanina ka."* into scene 7. No guard FOUND, but I did not search exhaustively |

✅ Fifth bug DONE (2026-08-27): `poll.ts` retried nothing, so two `503`s flagged two scenes on an
already-billed clip. Now 3 attempts, 5xx/429 only; a 404 still fails fast. 10 tests. CI green.

⛔ Still TUNED. Neils explicit go, one diff, and **one layer per test**.

## ✅ LANDED — `/eli5` + the anchor CI gate (PR #118, merged `170229a`)

`/eli5`, its page (<https://claude.ai/code/artifact/c2a8db6e-3dc2-4d88-a3aa-a40f67ad7c06>, twin
`artifacts/eli5-image-gate.html`), the `artifacts` CI job. Docs/tooling only. 5 review rounds.
**Follow-up merged `bcb4a1a` (2026-08-27):** citing line numbers made the twin track line
*positions*, and `artifacts` is in `main-status`'s `needs` — so a comment reflow in
`producerOrchestrator.ts` would open `ci-red` and **push a false CRITICAL to your phone**. Fixed:
the page prints the **anchor string, no line number** (verified both tails). Tier 0d debt 2 CLOSED.
✅ 2026-08-27: **9 tests** ([tests/unit/checkAnchors.test.ts](tests/unit/checkAnchors.test.ts)) drive the REAL script
against a REAL temp git repo — mocking git would re-encode the belief behind all three false-greens. Mutation-checked.

## ✅ CLOSED 2026-08-27 — identity-reference blocker was ALREADY FIXED (was OPEN #2)
`producerOrchestrator.ts:722` (*"never reached the database intact"*) was quoted as a live verdict; it notes
what was UNMEASURED when `a1d8b7e` landed 07-26. Live DB: of 27 runs **7 carry `avatar_url`**, the four
biggest **809k-846k chars, `input.avatar.url` empty** — slimmer stripped, column caught, rehydrated at
[ProducerFlow.tsx:55](components/OneShotAd/ProducerFlow.tsx#L55). ⚠ NOT smoke-tested end-to-end.

## ⚠ FIVE THINGS THE NEXT SESSION MUST NOT REDISCOVER

- **`GRIFON_DEV_UNMETERED` works** — bypasses the meter without touching the counter, so the 8/8
  PRO wall is irrelevant locally and **no credits are spent.** Arm: `scripts/enable-dev-unmetered-video.ps1` (sets BOTH flags).
- **Two different 402s exist on `api/kling/video.ts`** — `quota_exceeded` (line 90, our meter)
  and `kling_balance_exhausted` (line 171, Kling's own balance). The browser shows both as a
  bare 402. **Read the body before diagnosing.** An expired Kling pack killed a whole run and
  was misread as the quota race for an hour. Kling is paid now: 100 points, valid to 09-22.
- **Only Kling takes an end frame** (`image_tail`, kling/video.ts:14). Veo has no equivalent.
  So the morph hook REQUIRES Kling — routing everything to Veo cannot test it.
- **Talking scenes go through STS, not TTS** (`api/voice/consolidate.ts:18`). STS re-voices
  Veo's OWN audio and never reads the script, so anything Veo improvises survives into the
  final mix and the trimmer correctly keeps it — it is real speech.
- **Start dev with `--port 5173 --strictPort`.** Else Vite moves to 5174 while the dying process
  still answers on 5173 (a port probe is not a process check); localStorage is per-origin, so a run key does not follow the port.

## ⏭ OPEN — ranked, with the trap in each

1. **The four-symptom diff above.** The whole next job. Blocked on Neil (all four are TUNED).
2. **"Presents as succeeding while failing" — LAUNCH BLOCKER.** 7 of 8 scenes died and the app
   still showed a 4-second one-scene video titled **YOUR FIRST CUT** with *"7 scenes ready."*
   No error, no warning. Inverted twin of [#90](https://github.com/yopiheart/grifon-command/issues/90).
3. **The hook opens on the wrong body part.** Two regenerations, two arm/shoulder close-ups on
   a script whose problem is on the FACE (beat 3 says concealer). Scroll-past, not scroll-stop —
   `S8` fails on an arm — plus a Meta risk: a macro skin-lesion still is a visual medical claim
   our guardrail bans in words only. Cause: the rule says *"whichever part the script's problem
   lives on"* and the hook line never says face. **Not a regenerate fix.**
4. **Landing page has zero video and one false claim.** `ProofGallery` says *"THESE ADS WERE MADE
   WITH GRIFON. Real businesses RAN THEM."* over CSS mockups; `ExitIntentModal` points at
   `/exit/proof-ad.mp4`, which does not exist. `SAMPLES = {}`, all 13 recipes show "Sample soon".
   Fix the copy now; the videos come from the sample batch.
5. **Quota race in `consumeFinishedAd`.** peek → consume → mark is not atomic. Still unfired,
   still there for the first real 8-scene customer.
6. **Supabase FREE tier is past its grace period.** Holds auth, runs, quota, billing.
7. **PRO is loss-making at full use.** 8 × ₱273 = ₱2,184 COGS vs ~₱2,140 net. The margin bets
   on breakage (~2 ads/mo). Cap the founder invites at 5–10 so the bet is cheap if wrong.

## ⚠ CARRIED
- Run `apr_fa7cedc3` (real_talk, 8 storyboarded / 6 filmed, COGS US$6.50 and UNDERCOUNTED — Kling
  bills in points, `estUsd` misses it) proved the room lock, `ordinary indoor daylight` and the
  W-005 hook anchor on real output. **Its R2 signed URL EXPIRED 2026-08-24** — re-sign to view.
- **Scene grade stays REJECTED** — the **luma term** killed it. Do not re-propose with luma.
- `real_talk` is an 8-beat TUNED skeleton → 9 scenes, always; **no scene-count dial exists**.
  Only `before_after` / `unboxing` / `try_on` are 4-beat, and `cost:estimate` assumes 4 for all
  12. `before_after` is UGC Pro = **hard cut, no start/end frames** — it cannot test the morph.
- A scene that LOOKS differently lit is usually composition (wide shot, wooden vanity) — read the stored prompt before calling it a lighting regression, W-002.
- `MID_GAP_TRIM_ENABLED` ON in prod. Both image-gate flags ON, but **`VITE_` is build-time —
  Vercel needs a REDEPLOY** (the artifact above explains the four states and the one trap).
- Sparse-excluded: `baselines/locked-wins`. Branch `feat/hook-layout-system` (`1245d14`) unmerged.

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90.
Repo artifacts are ENGLISH; ads stay Taglish. Cafe-PC warnings: `cafe_session.md` §A6.
