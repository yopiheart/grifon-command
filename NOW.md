# NOW — the resume doc
**Stamped: 2026-08-17** (session 27)

## ▶ NEXT ACTION — listen. Two flags have been waiting six months on your ear.

⚠️ **`.tmp/` does not survive the reboot. The music beds cost API calls to remake.**
Copy `.tmp/music-gate/` somewhere safe, or listen before you shut down.

**1. Music (~5 min).** `.tmp/music-gate/` — four styles, each with a `--GENERATED`
and a `--STATIC` beside it. Bar: **invisible > impressive.** The bed must vanish
under a voiceover and must **not** open on singing (the known 2026-06-16 leak).
Note `ugcpro--STATIC-ALIASED-TO-testimonial.mp3` — that filename IS the defect you
reported. Generated ≥ static → set `GRIFON_MUSIC_GEN_ENABLED=true`.
Regenerate: `npx vite-node tools/smoke_music_bed.mjs`

**2. SFX (~5 min).** `.tmp/ear-gate/` — start with **`_CONTESTED.mp3`** (the 6
machine-flagged variants) and **`_CHACHING.mp3`** (v1-v6; keep the family that
reads "cha-ching" first listen, prune the rest). Order is in `ORDER.txt`.
Free to regenerate, no API: `node tools/ear_gate_audition.mjs`
Approve → flip `SFX_V2_ENABLED=true` in prod, mark P13 `applied` in the swipe file.
Cue **timing** cannot be judged here — that needs a real ad, target (c) of the gate.

**3. Still owed from session 26: the watched `before_after` run.** Nothing has run
against `c932dc0`/`e4d2864` yet, and now nothing has run against today's work either.
`https://grifon.ai/app?osaEngine=producer` · inputs in
[`sample_run_before_after_2026-08-16.md`](workflows/sample_run_before_after_2026-08-16.md).
Gate: same woman in EVERY scene · scene count = 4 · does the hook SHOW the flaw ·
any `cinematic_grade` chip (it flags, it does NOT auto-fix — hit REGENERATE).

## 🚀 BRANCH `fix/preset-hook-identity` — 2 commits, pushed, NOT merged
**`8b19747`** — every preset now has its own hook. Your report ("lahat ata pare-parehas")
had **three** stacked causes, not one:
1. `punch`/`bars`/`spotlight` were `{...IMPACT, caption}` — they overrode ONLY captions,
   so they inherited IMPACT's `hook` AND `sfx` verbatim. That is why captions changed
   and nothing else did.
2. `planScene` used `pickHookPalette(variantSeed)` — the **ad** picked the colour, so it
   was random per render and identical in distribution across every title-stack preset.
   `HookStyle.gradient` owns it now.
3. `buildWordFilters` hardcoded ONE entrance, so `hook.reveal` was dead for all six
   title-stack presets. Preset-keyed now: slam / bounce / flip.

Result: 7 presets, 7 distinct hooks — 5 fonts, 6 accents, 3 entrances.
**CLASSIC is untouched, proven not asserted:** its golden snapshot is byte-identical
against HEAD while the other six moved. Two new tests fail if any two presets ever
share a hook signature or SFX palette again — and one of them caught a real collision
while being written (punch had been handed CLASSIC's exact palette).

**`7e72c8c`** — closed the two hands-only `referenceImage="none"` hatches (SERVICE
Tutorial S2-S4, SERVICE Before&After S2). TUNED, you approved it. S1/S3 keep `"none"`
on purpose — no operator in frame at all. Plus the two ear-gate tools above.
⚠️ **The audit found FEWER holes than the session-26 brief claimed.** `tryon`,
`unboxing`, `demo`, `tutorial`, `realestate` never offered `"none"`. That brief was
wrong on this and on the hook root cause; do not trust its remaining pointers unread.

## ⚠ NOT VERIFIED — say it plainly
**No real ffmpeg render exists for any of today's work.** Burn-in integration tests are
gated behind `RUN_BURNIN`. Evidence stops at the emitted filtergraph (7 of 7 distinct,
3 motion signatures). **Your eyeball on a real render is the remaining gate**, and the
SFX cue-class picks for punch/bars/spotlight are a design proposal, not an ear result.

## ⚠ OPEN — owed, not blocking
- **`hookFallbackText` ([`drawPlan.ts`](api/_lib/drawPlan.ts) ~520) breaks the #1 rule of
  the hook skill you dropped**: it derives the on-screen title from the first 7 words of
  the SPOKEN line. The skill's ban, verbatim: *"a text hook that just repeats the spoken
  hook word-for-word (that's a caption's job)."* TUNED-adjacent, needs a decision.
- **The `text-hook-machine` skill is worth its rulebook, not its machinery.** BUILD and
  REFRESH need Sandcastles MCP, which we do not have. The fundamentals + WRITE mode are
  the asset, and they belong in the EDL prompt + a 4th swipe file, not a live skill. Its
  no-punctuation rule is WRONG for us — a Tagalog question hook is a workhorse. Committed
  at `public/text-hook-machine.skill`.
- **The AI gate is FLAG-ONLY, it does not reroll.** `imageGate.ts`'s header still lies.
- **Premise-check parse bug is LIVE.** `cleanJson` drops a valid grounded answer ~1 in 6.
- **`MODEL_RESEARCH`** (`gemini-3.5-flash`) is referenced by no flow. Dead constant.
- **Repo grows ~400 MB/month.** `git filter-repo` is irreversible — never without you.

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90.
Repo artifacts are ENGLISH; ads stay Taglish. Cafe-PC warnings: `cafe_session.md` §A6.
