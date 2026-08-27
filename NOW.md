# NOW — the resume doc
**Stamped: 2026-08-27** (session 37)

## ▶ NEXT ACTION — three person assets, then the nine runs

Owed: `buhok-before` / `buhok-after` (same woman, damaged hair then smooth) and
`arawwear-onbody` (a woman wearing the Araw Wear dress). Person shots, so they CANNOT be
independent rolls — chain them with `codex-image --edit` off one base so the face holds.
The old Hiraya set is the cautionary tale: `onbody.png` is a DIFFERENT WOMAN from
`before.png`/`after.png`, which the spec claims are one person.

Both of those runs also upload the presenter BY HAND (see the presenter rule below).

## ✅ SHIPPED THIS SESSION (main, four commits)

- `c9fe2b4` — **TUNED prompt fix.** The hook morph turned a FLAT problem area into a 3D
  OBJECT: peanuts stuck to a cheek, then a glossy blister, two rolls, one scene. The
  HOOK ANCHOR RULE never said the problem must stay flat, so the model closed the gap
  between "textured patch" and "woman holding bottle" by inflating the patch. One
  paragraph added beside the two bans it belongs with, pinned by a new test case.
  **Untested against a live run — the next storyboard generation is its first real test.**
- `5833b2b` — **first real format card + the phone fix.** `real_talk` cut from the
  approved run (13.97s–22.03s, silent, 540×960, 391 KB). `RecipeSample.video` is now
  optional so a card can ship as a still. Playback moved from hover to viewport entry
  (`usePlayInView`) — hover meant phone users saw a poster and a Play chip nobody taps.
- `329d012` — **`before_after` card for free**, cut from the raw render already committed
  at `tests/fixtures/sample-batch/`. Scene 1 skipped: its morph resolved into a
  HALLUCINATED bottle (rose-gold, glitter, garbled label "RYA CWYA").
- `c2fa9d6` — **13 assets, nine invented brands**, via `codex-image` (zero Claude quota,
  zero video credits). JPG not PNG: 30 MB → 2.9 MB.

## 🎬 THE SAMPLE BATCH — Neil's call: a different product per card

One brand across twelve tiles would make the PRODUCT the thing the eye reads; the gallery
exists to show what separates the FORMATS. `sample_batch_test_spec.md` §1 says the
opposite ("one locked brand") and its reason does not survive checking — Higgsfield's
tiles are all different subjects. **That section is superseded; this is the live plan.**

**Nine runs left. Seven credits. Two resets, and Neil holds each one** (delete the
`video_ads:monthly:<YYYY-MM>:<uid>` row in `rate_limits`).

| Format | Brand | Assets | Presenter |
|---|---|---|---|
| Before & After | Buhok Lab | hero ✅ · before ❌ · after ❌ | **UPLOAD** |
| Try-On Reveal | Araw Wear | hero ✅ · onbody ❌ | **UPLOAD** |
| Unboxing | Bukid Coffee | hero ✅ · packaging ✅ | Auto |
| Unboxing ASMR | Silid Home | hero ✅ · packaging ✅ | Auto |
| Watch It Work | Kislap | hero ✅ · inuse ✅ | Auto |
| Steps 1-2-3 | Timpla | hero ✅ · inuse ✅ | Auto |
| Hype Drop | Tunog Audio | hero ✅ | Auto |
| Rapid Fire | Lola Bising | hero ✅ | Auto |
| Pure Hype | Hangin | hero ✅ | Auto |

**The presenter column is not a preference.** The storyboard puts `referenceImage="avatar"`
AND the before/after slot on the SAME scene, so an auto-cast face that differs from the
uploaded one renders two different people in one ad. Face in the uploads → upload the
presenter. Hands and product only → Auto.

`real_talk` is done, `Let AI Pick` borrows a clip (no run of its own), `commercial` is
Business-locked and needs none. Slots come from `components/guidedPhotoSlots.tsx`, which
is authoritative over the spec's older table.

Asset register: light held CONSTANT (flat window daylight, open shade, phone camera, no
studio — the register the working Hiraya hero proved). Room and colour VARIED on purpose.

## ⚠ OPEN — ranked

1. **The `before_after` card has no burned captions.** Its source is a RAW render, from
   before the caption pass, and captions cannot be added after the fact. Neil wants a
   captioned replacement, which is why that run is in the nine. The current cut stays as a
   placeholder meanwhile — still better than "Sample soon".
2. **Nothing is smoke-tested in a browser.** The scroll-into-view playback is verified by
   build and unit tests only. No one has watched a card play on a phone.
3. **A refused scene still dies and the user must regenerate by hand.** No auto-reroll, no
   user-facing explanation. Top pre-launch risk.
4. **Landing page has one false claim.** `ProofGallery` says real businesses ran these ads;
   `/exit/proof-ad.mp4` does not exist. Copy fix, no render.
5. **Quota race in `consumeFinishedAd`** — the meter can exceed its own limit. Cap founder
   invites at 5–10.

## ⚠ CARRIED
- Sparse-checkout now includes `/tests/fixtures/sample-batch/`. A fresh lite clone must
  re-add it — and note `git sparse-checkout add` mangles a leading `/` under Git Bash.
- 12 junk PNGs at the repo root (`scene*.png`, `storyboard-gate.png`) left uncommitted on
  purpose, plus `.playwright-mcp/`.
- 31 branches still ahead of `main`.

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90.
Repo artifacts are ENGLISH; ads stay Taglish. Cafe-PC warnings: `cafe_session.md` §A6.
