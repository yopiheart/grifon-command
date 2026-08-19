# NOW — the resume doc
**Stamped: 2026-08-19** (session 29)

## ▶ NEXT ACTION — one render with `SCENE_GRADE_ENABLED` ON, then Neil's eye

The grade module is now **WIRED** (`22ca43b`). It ships dark. Everything owed at
the code layer is closed: two-pass loop, 21 unit tests, and a free ffmpeg harness
(`RUN_SCENEGRADE=1`) that proves agreeing beats render byte-identically and a warm
outlier gets pulled back. A mutation check confirms the harness measures the wiring.

What is left is taste, and only Neil can supply it: **render the parked
`before_after` / Hiraya Glow storyboard twice, flag OFF then ON, and look at
scene 4.** Set `SCENE_GRADE_ENABLED='true'` on Vercel — runtime-read, no rebuild.

⚠️ **Do NOT start the 12-run sample batch before that render.** Three things are
still open and each one would force a re-pay of all 12:
1. This grade decision (ON changes the colour of every sample).
2. `fc1baa5` audio (glitch SFX retired, +5% gains) — **confirm Vercel PRODUCTION
   has it**, and Neil has still not heard it.
3. `forced_alignment` on the ElevenLabs key ([#96]) — if it is off, every scene
   falls back to caption estimates SILENTLY, degrading the very samples.

## 🔍 FOUND WHILE TESTING — the cap governs, not the pull

At the observed ~1.7-unit drift the correction is set by `MAX_SHIFT`, **not** by
`PULL`. The clamp starts at 1.64 units, so scene 4 closes **77%**, and a
hypothetical 3.0-unit drift would close only **44%**. The module header reads as
if `PULL` governs. No code changed — raising the ceiling is a taste call, and only
after Neil has seen what 77% already looks like.

## 🎨 WHY SCENE 4 CAME BACK WARM — root cause, read off the code

[`prompts.ts:1742`](api/_lib/prompts.ts#L1742) puts *"Lighting/mood for that spot"*
in the **REQUIRED** list of every avatar-scene prompt, and its own worked example
ends *"warm afternoon sunlight from the window."* Each beat is **instructed** to
author its own light; the identity lock holds the face and nothing else. So
**regenerate cannot fix it** — 3 rolls on 2026-08-17 all came back warm. A re-roll
is a fresh dice throw, not a repair. 🔴 Neil chose the deterministic route (A); the
prompt edit (B) is the real root fix but is TUNED and needs his explicit go.
⚠️ A grade cannot fix a different ROOM. S4's bathroom differs from S3's.

## 🧪 THE MEASUREMENT THAT KILLED THE FIRST DESIGN

Grey-world (fixed 128 target) was written, then **measured and thrown away**. An
untouched fixture frame reads `uavg=122.0 vavg=134.8` — 8.5 units off "neutral"
while looking correct, because a frame full of face and warm tile is not supposed
to average to grey. Do not re-propose grey-world.

## ❓ OPEN QUESTION FOR NEIL — niche coverage in the samples gallery

The batch spec locks ONE brand (Hiraya Glow serum) across all 10 product recipes,
deliberately: the cards differ by **format**, not niche, so a second variable would
make the gallery unreadable. But runs 11–12 (Linis Pro service, Casa Verde condo)
are **eval-only, no card** and no recipe slot exists for them — so a plumbing or
real-estate SMB opens the gallery and sees 12 skincare ads. Proposal: keep the 10
format cards on Hiraya Glow, add a small "ibang negosyo, parehong makina" strip
carrying runs 11–12. **Zero extra render spend** (they are already in the 12); it is
a gallery UI change plus a decision. Awaiting Neil.

## 💰 BATCH COST — computed live, not quoted
`npm run cost:estimate`: **₱273 per 4-scene ad → ₱3,280 for all 12.** 6 scenes =
₱4,608. The old ₱6,600 figure assumed 9 scenes, which no customer can get
(`SCENE_CAP` is 4 for Starter/Pro). Fixtures are committed but sparse-excluded here:
`git sparse-checkout add tests/fixtures/sample-batch-v2`.
Hard limit on parallelism: **6 renders / 10 min** ([`api/render/final.ts:106`]).
Neil drives + uploads (OTP wall, paid spend); the agent grades and cuts the cards.

## ⏸ THE RUN — stopped at the storyboard gate, zero film spend
`before_after` / Hiraya Glow. Gates 1–3 PASSED (4 scenes · beat 0 is the BEFORE
with no product · same woman throughout). Stopped on the S4 grade only. Inputs and
the full gate list: [`sample_run_before_after_2026-08-16.md`](workflows/sample_run_before_after_2026-08-16.md).
⚠️ REGENERATE has no undo — 3 rolls burned, the coolest roll is the one to keep.

## 🌿 BRANCH `feat/hook-layout-system` (`1245d14`, pushed, NOT merged)
Four real hook LAYOUTS. **Font decision made 2026-08-17: ship the 8 on the branch,
add nothing.** The sameness was a code bug (accent-by-word, now by-LINE), not a font
shortage. Queued for AFTER launch only if the real render still reads samey:
**hype → Titan One**, **bars → Passion One Black**. 🔴 Still awaiting Neil: the
metallic gradient he approved 2026-06-10 is OFF everywhere. Machinery kept.

## ⚠ OPEN — owed, not blocking
- **Music is ElevenLabs now**, keyed `${userId}/music/${seed}-${style}.mp3`. Pro/
  Business only, else the static bed.
- **`hookFallbackText`** builds the title from the SPOKEN line, which the
  `text-hook-machine` skill bans. **AI gate is FLAG-ONLY.** **Premise-check
  `cleanJson` drops ~1 in 6.** **`MODEL_RESEARCH` dead.** Repo +400 MB/month.
- `npm run design:lint` fails: the `design.md` CLI is defreezer-wiped. Not a regression.

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90.
Repo artifacts are ENGLISH; ads stay Taglish. Cafe-PC warnings: `cafe_session.md` §A6.
