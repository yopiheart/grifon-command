# NOW — the resume doc
**Stamped: 2026-08-31** (session 43)

## ▶ NEXT ACTION — VERIFY before patching. Four fixes landed and the run still got worse.

Branch `fix/asmr-tactile-scenes` (4 commits, **pushed, NOT merged**) is ahead of `main` at
`da15e0f`. Everything below is on it. Setup after a reboot: `restore-ffmpeg.ps1` (use the
`curl -C -` note under CARRIED), `enable-dev-unmetered-video.ps1`, `npm run dev`.

**Do NOT open with a fifth prompt patch.** Four landed in one night and Neil's last run was the
worst of the five. Open by answering the two questions below from stored data — both are free.

1. **Did `wantsReferenceSheet` actually fire?** The ASMR end frame is supposed to get the hero
   ALONE at full resolution now. Neil's last END inset still looks like it holds a box AND a jar.
   If the box is there, the change did not take and the whole `acefcb7` theory is unproven.
   Check the newest run's scene-2 `endFramePrompt` in `producer_runs.artifacts->'storyboard'`.
2. **Was the CINEMATIC PRESET chip on scene 4 the gate firing?** `judgeImageGate` has a
   produced-light watcher scoped to identity scenes, and scene 4 is the only identity scene left.
   If it fired, the gate works and is flag-only by design — that is a product decision, not a bug.

## 🔴 THE FIND OF THE NIGHT — `PRODUCT_IDENTITY_LOCK` was aimed at the avatar's face
`generateSceneImage` pushes avatar → product → continuity and gates the avatar push on
`references.avatarUrl` alone, **never on `referenceImageMode`**. Every producer call site passes
the avatar unconditionally, so in `'product'` mode the portrait IS parts[0] and the product sat
unnamed at parts[1] — while seven of the lock's eight rules said "Reference Image 1". One root
cause for the blank wordmark, the box rendered as a CYLINDER reading "300g", and both frames
moving into the AVATAR PHOTO'S KITCHEN against their own "wooden shelf" prompt. Fixed in
`12de6b9`; ordinal now computed like `continuityIdx`. **This one is real and worth keeping even
if everything else gets reverted.**

## ⚠ STILL BROKEN — Neil's own eyeball on the last run, all four unexplained
1. **Wordmark back on scene 1, gone again on scene 2.** Intermittent across five runs. A 🎲, and
   the gate cannot catch it — see the blank-label hole below.
2. **Scene 2 END hero still does not match the reference.** Product reads TALLER than the real
   jar. This is what `acefcb7` was meant to fix, hence check #1 above.
3. **Scene 3 product FLOATS with a finger pointing at it.** Almost certainly self-inflicted: the
   `EXACTLY ONE HAND` rule (`25f532a`) pushed the model toward a single pointing index finger in
   three scenes. The hand should BEAR the object (hold it, or rest on it), never point at it.
4. **Scene 4 came back with a high-saturation cinematic LUT**, and its product does not match the
   hero either.

## 🕳 TWO GATE HOLES FOUND (neither fixed — deliberate, out of scope last night)
- **A blank label passes.** `judgeImageGate` only judges garble when the model READ label text;
  `productLabelText: null` is treated as "product simply wasn't framed" and **never flags**. So a
  product in frame with its branding erased is indistinguishable from no product. This is why the
  wordmark defect always reaches Neil instead of the automated reroll.
- **The END frame is not gated AT ALL.** Both gates run on the MAIN still only
  ("thumbnail/end-frames are not gated this phase") and `renderEndFrame` is called after that
  block. Every end-frame defect has zero automated defence.

## ✅ WHAT LANDED (branch `fix/asmr-tactile-scenes`)
- `0e1d5ba` `clampAsmrSceneRefs` — ASMR tactile beats route off the presenter BEFORE the
  storyboard is stored, so REGENERATE (which re-reads it, never re-plans) inherits the route.
  Plus the script's invented "tape rip" on a lift-off lid box.
- `25f532a` one hand not two, locked-off never overhead, S2 pair pinned to one camera distance.
- `12de6b9` the ordinal fix above.
- `acefcb7` ASMR end frame takes the hero alone (no composed sheet); STAY CLOSE camera rule.

**Scope was held all night and is provable:** 64 of 68 prompts byte-identical to the pre-session
baseline, the 4 changed all `unboxing` + `asmr-true`. `asmrPromptScope.test.ts` keeps it that way.
1379 tests pass, tsc + build clean. **No render has been eyeballed as good.**

## ⚠ THE HONEST READ, for whoever resumes
Five paid runs, four fixes, and the output got worse. Every fix traded one defect for another:
the clamp caused the identity split AND disarmed the identity gate check; the ASMR rewrite caused
the blank overhead box; the one-hand rule likely caused the pointing finger. The pattern is
**adding words to fight a model on scenes whose constraining reference was removed.** Before
patch five, consider whether `clampAsmrSceneRefs` should be reverted and ASMR shipped as a
talking-head format — `bbbed45`'s 🎲 doctrine applies: a distribution does not owe us a good frame.

## ⚠ CARRIED
- **`restore-ffmpeg.ps1` uses `Invoke-WebRequest`, which has NO resume.** It died at 68 MB of 106
  on cafe wifi. gyan.dev DOES support range requests (`Accept-Ranges: bytes`), so
  `curl -C - -L --retry 20 -o .tools/ffmpeg.zip <url>` resumes. Worth patching into the script.
- **The render pipeline does NOT need PATH ffmpeg** — it uses `ffmpeg-static` from `node_modules`.
  The 106 MB download is only for CUTTING `public/samples/*.mp4` afterwards. Do not block on it.
- `git sparse-checkout add /tests/...` **fails silently in Git Bash** — MSYS rewrites the leading
  slash to `C:/Program Files/Git/...`, exit 0, nothing checked out. Edit `.git/info/sparse-checkout`
  directly, then `git sparse-checkout reapply`.
- **The agent cannot read `.env`** (ENV WARDEN). Supabase MCP works fine and is how every finding
  above was verified. `scripts/pull-run-*.mjs` needs Neil's own terminal.
- **NEVER pipe `npm run dev` into `head`** — EPIPE kills vite and it reads as a clean exit.

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90.
Repo artifacts are ENGLISH; ads stay Taglish. Cafe-PC warnings: `cafe_session.md` §A6.
