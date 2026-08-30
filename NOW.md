# NOW — the resume doc
**Stamped: 2026-08-30** (session 40)

## ▶ NEXT ACTION — two new defects, ONE cause: still-rules used on video seeds

The pipeline ran end to end today (brief → 13.6s 1080x1920 MP4, 4 scenes). Four issues
found, and the top two are the same bug class: **every rule in `prompts.ts` was written to
judge a STILL, but every still here is the seed of a video.** Decide these together.

1. **Scene 2 never finishes the reveal.** At 6s he is still reaching INTO the box; cut.
   An Unboxing ad that hides the thing coming out. Cause is structural: **scene duration
   comes from SPOKEN length, not from how long the ACTION takes.** 7 words bought ~3s;
   open-box-and-pull-out needs more. No rule says a motion has its own minimum.
2. **Scene 4 renders a FAKE second wordmark.** Verified by cropping the frame at 10.5s: a
   plain sans-serif "BUKID / COFFEE", stacked and left-aligned, where the real mark is
   centered and bold. It appears exactly where the HAND sat in the seed still. When the
   hand moved, the video model invented the hidden pixels. `BAG_ORIENTATION_RULE` says the
   hand **"MAY occlude part of the bag's front (naturalistic and acceptable)"** — true for a
   still, false for a video seed. This is a fake logo, which our own rules call the worst
   brand-trust failure.

Lower: **hook is not a scroll-stopper** (soft instruction, invents an occupation again, and
scene 1 is 3s of a man smiling at camera — zero motion); **TTS says "teyan" for "tiyan"**
(cosmetic — and `phoneticNormalizer.ts` was deleted in `2e70c5a` on purpose, do NOT revive).

## ✅ VERIFIED TODAY — both fixes work, proved on a real run

- **Wordmarks are back** (`bbbed45`). Kraft box AND pouch both carry BUKID COFFEE in the S2
  end frame. The refuted resolution/JPEG theory cost nothing because it was never run.
- **`avatar_url` persists** (`45f2127`). `true`, 915,426 chars — the **first UGCPro run ever**
  to save it. Both 08-29 runs are still `false`, so the comparison is clean.
- **The "swabe sa tiyan" drop was an INPUT problem, not the model.** The run was fed 113 of
  the 158 approved chars; the first sentence was never typed. With the full brief pasted,
  scene 3 now reads *"Barako galing bukid, pero sobrang swabe sa tiyan."* The model was
  obeying its no-invented-claims guard correctly the whole time.

## 🔴 THE ROOT-CAUSE FINDING — why script output keeps missing the mark

```
offer textarea → productDescription → businessInfo.features → "pick ONLY the top 1-2 … omit everything else"
```

`features` is the RAW offer text ([oneShotIntake.ts:145](services/oneShotIntake.ts#L145)), and
`ADSCRIPT_COMMON_RULES` orders the model to keep 1-2 and drop the rest. **Users type a DEAL
there, not benefits** (Neil, and the Bukid run proves it), so the filter picks "features" out
of a promo. Nothing is disobeying — the design has no concept of a claim that must survive.

Worse: Market Research already produces **`objectionToUs`, `bigIdea`, `deepFear`,
`statusUpgrade`, `graveyard`** and **none of them reach the script.** They live only at
`prompts.ts:146-226` (the research prompt); the ad-script prompt is 489-1050. For Bukid,
`objectionToUs` IS "barako is too harsh" — the exact line we hand-wrote into the brief.
**The system already knew. It just never told the script.**

**Asking users for more fields is the wrong fix.** brand + offer + price is correct.

## ⚠ TUNED LIST — needs Neil's explicit go, all four

1. **Pinned claim** for FEATURE FILTER. "unang 50 lang" has now dropped **3 runs straight**
   while sitting in the brief; the tuned CTA block calls scarcity OPTIONAL, so it is legal.
2. **Posture clause** in `BAG_ORIENTATION_RULE`. It governs which SIDE faces camera, not
   whether the bag stands up. "resting on the wooden table" + "front facing camera" cannot
   both be true, so the model tilts it.
3. **Route `objectionToUs`** (and siblings) into the script stage.
4. **Ban hand-occlusion of the label** when the still seeds a video (defect 2 above).

## ⚠ OPEN — ranked
1. The two defects at the top. They block the Unboxing sample, which blocks 2 of the 9.
2. **No script gate exists.** `api/_lib/imageGate.ts` guards stills, `omniGate.ts` guards
   video, and NOTHING checks the script. Build it AFTER item 3 above — a gate hunting for a
   claim the script was never given is pointless.
3. **A refused scene still dies** and the user regenerates by hand. Top pre-launch risk.
4. **Landing page has one false claim** — `ProofGallery` says real businesses ran these ads.
5. **Quota race in `consumeFinishedAd`** — the meter can exceed its own limit.
6. **Fan-out scene: paid but uncollected** if the tab closes mid-run. Parked, roadmap #29.

## ⚠ CARRIED
- **Work is on `claude/eval-managed-agents-vr01gs`, 8 commits, NOT merged.** Test first,
  merge after. 0 commits on main are missing from it, so no conflict.
- **Vite does not serve a file dropped into `public/` after the dev server started.** Verify
  with the CONTENT TYPE, never the status code — the SPA fallback also answers 200.
- **Killing `npm run dev` leaves the vite child holding the port.** It keeps answering 200
  with the OLD code while the restart lands on 5174. Kill the listener by PID.
- Sparse-checkout: `/tests/fixtures/sample-batch` + `/public/examples` need re-adding on a
  fresh clone. From Git Bash prefix `MSYS_NO_PATHCONV=1` or the add silently does nothing.

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90.
Repo artifacts are ENGLISH; ads stay Taglish. Cafe-PC warnings: `cafe_session.md` §A6.
