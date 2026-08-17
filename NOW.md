# NOW — the resume doc
**Stamped: 2026-08-17** (session 27)

## ▶ NEXT ACTION — two env flips, then ONE render

### 1. Flip two Vercel env vars (2 min). Both ear-gates PASSED 2026-08-17.
```
SFX_V2_ENABLED = true              # PRODUCTION only (preview already true)
GRIFON_MUSIC_GEN_ENABLED = true    # PRODUCTION
```
Runtime-read, **no rebuild**, no `VITE_` twin (checked — only `IMAGE_GATE_ENABLED`
has a build-time twin). Neil auditioned both banks and passed them: SFX rotation
incl. every machine-contested variant, chaching family whole (**no prune**), and
the generated music beds beat the statics. Recorded in `sfx_upgrade_plan.md`,
`this_week_plan.md`, P13 in `viral_swipe_file.md`.

### 2. Then one `before_after` run — `https://grifon.ai/app?osaEngine=producer`
⚠️ `/app?...` NOT `/?...` — the post-auth redirect on `/` eats the param.
Inputs: [`sample_run_before_after_2026-08-16.md`](workflows/sample_run_before_after_2026-08-16.md).
Fixtures were MISSING again (lite clone excludes `tests/fixtures`, and `git status`
stays clean so nothing warns you). Restored with:
`git sparse-checkout add "/tests/fixtures/sample-batch/*.png"` — **this will recur
on every fresh cafe PC.**

**Two traps.** ⛔ Don't pick RAW (`stitchedOnly` bypasses every editorial layer).
⛔ `ROTATION.ugcpro = ['hype']` — AUTO always gives hype, so pick a preset by hand
on the **FirstCutScreen** (which only appears AFTER filming; runs 1+2 died at the
storyboard gate and never reached it). Music gen needs Pro/Business or it 403s.

**Storyboard gate:** same woman in EVERY scene · 4 scenes · does the hook SHOW the
flaw · `cinematic_grade` chip flags but does NOT auto-fix.

## 🚀 ON MAIN (merged, deployed)
**Per-preset hook identity.** "Lahat pare-parehas" had THREE stacked causes:
punch/bars/spotlight were `{...IMPACT, caption}` so they inherited IMPACT's hook
AND sfx; the hook palette came from `pickHookPalette(variantSeed)` so the AD chose
the colour; and `buildWordFilters` hardcoded ONE entrance so `hook.reveal` was dead.
Plus the two hands-only `referenceImage="none"` hatches closed (SERVICE skeletons).
⚠️ The session-26 brief was WRONG twice — on the hook root cause and on "every
skeleton still offers none". Don't trust its remaining pointers unread.

## 🌿 BRANCH `feat/hook-layout-system` (`1245d14`, pushed, NOT merged)
Four real hook LAYOUTS. Root cause of the sameness was ONE line: `hookTitleLayout`
accented `isPowerWord(w)` and fell back to `out[0]`, so every preset painted word 0
of one line. Now accent-by-LINE. Three NEW fonts added (the old round only
reshuffled Neil's existing five, which was the complaint): **Poppins Black**,
**Bebas Neue**, **Instrument Serif Italic**.
BOXED (impact, bars) · NEON (hype, spotlight) · STACK (punch) · EDITORIAL (clean).
`caps` is per-preset, not a house rule. **CLASSIC byte-identical to HEAD.**
Build pass, 1256 tests, 0 failed. Preview via `npx vite-node tools/hook_preview.mjs`
(real planScene → PNGs, zero video credit).

🔴 **ONE DECISION AWAITING NEIL:** the metallic gradient he approved 2026-06-10 is
now OFF on every preset — none of his swipe references carries one. Machinery is
NOT deleted (a synthetic `METALLIC` preset drives it in `premiumHook.test.ts`);
re-enabling is one line. **Overrule this if he disagrees.**

## 🎤 VEO PRONUNCIATION — decision: OBSERVE, do NOT apply a phonetic map yet
`consolidate.ts:108-111` — talking scenes send **audio only** to STS; `scriptLine`
is never sent. So the "Hirayaglao / ipahed" text in Neil's ElevenLabs history is a
**transcript of what Veo said**, not our input. STS changes timbre, never phonemes,
so it can NEVER fix this.
**Why it happens:** the script is Tagalog, so Veo applies Tagalog phonology to the
English brand. Tagalog has no `/oʊ/` diphthong → "glow" splits to "gla-o"; Tagalog
merges e/i → "ipahid" → "ipahed". Consistent, not random.
**Confirmed technique** (Replicate's guide + 2 more): phonetic spelling in the VEO
prompt. Counterintuitive fix: spell it for a TAGALOG reader ("Hiraya Glo").
⛔ **Not applying it.** Neil: it is intermittent, and a blanket map could make it
systematic. `agent_lessons.md:60` bans exactly that (the deleted
`phoneticNormalizer` made things WORSE). n=1. Repo bar is 3 corroborations.
**Free instrument:** every talking scene's STS history entry IS a pronunciation
log. Read it each run. **Zero-risk change available now:** stop having Veo say the
brand at all — let on-screen text and the label carry it.

## ⏭ NEXT SESSION — Neil's open question, answered but unfinished
"Hanggang ganyan lang ba?" No. ~80% of his references are reachable in FFmpeg.
**The real ceiling:** no true blur (the glow is stacked borders), no rounded box
corners, no gradient BEHIND text, no letter-spacing control, no text-behind-subject
(needs body segmentation; we only have face detection), no arc/rotated type.
Those three are the ONLY case for Hyperframes **Move 3** (transparent assets baked
to file, consumed by FFmpeg like `sweep.png` — never a runtime; Vercel lambda +
untrusted-HTML walls stand).
**Neil to pick:** (a) identify the ACTUAL Kallaway fonts — I never did, I picked
free lookalikes, and the real ones may be paid licences; or (b) build the layouts
already reachable (per-line size hierarchy, 3-line stacks, box on ONE word).

## ⚠ OPEN — owed, not blocking
- **`hookFallbackText`** (`drawPlan.ts` ~520) builds the title from the SPOKEN line,
  which the `text-hook-machine` skill bans outright. Skill committed at
  `public/text-hook-machine.skill`; its rulebook is worth having, its Sandcastles
  machinery is not, and its no-punctuation rule is WRONG for Taglish.
- **Music E2E still owed** — flip the flag, then a Pro/Business render.
- **AI gate is FLAG-ONLY**, `imageGate.ts`'s header still lies. **Premise-check
  `cleanJson` drops ~1 in 6.** **`MODEL_RESEARCH` is dead.** Repo +400 MB/month.
- `npm run design:lint` fails: the `design.md` CLI is defreezer-wiped. Not a regression.

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90.
Repo artifacts are ENGLISH; ads stay Taglish. Cafe-PC warnings: `cafe_session.md` §A6.
