# Lighting consistency — root cause, two fixes, and what to expect per format

**Session 2026-08-19.** Four storyboard-gate runs, one film run, zero wasted film spend
after the first. Read this before testing ANY new format — the per-format table at the
bottom is the point of the file.

---

## 1. THE VERDICTS

| Thing | Verdict | Where |
|---|---|---|
| `SCENE_GRADE_ENABLED` (deterministic colour grade) | 🔴 **REJECTED by Neil.** Flag deleted on Vercel. Code stays, ships dark. | `22ca43b` |
| Per-beat lighting instruction (the real cause) | ✅ **FIXED** | `b1632b0` |
| No room lock on plain-UGC formats (the second cause) | ✅ **FIXED** | `35cd3ed` |

### Why the grade was rejected, mechanically

Neil: *"ang dilim at mukang patay na ad."* He was right, and the reason is in the design,
not the implementation. `planSceneGrade` carries a luma term:

```
brightness = clamp((-dy / 255) * LUMA_PULL, -MAX_BRIGHTNESS, MAX_BRIGHTNESS)
```

It pulls every scene toward the MEDIAN of the ad. So a scene brighter than the middle gets
DARKENED, and **no scene is ever allowed to be brighter than the middle**. With 4 scenes,
they converge inward and the whole ad loses its top end. One drifted beat drags all four.

**Do not re-propose this without solving that.** The chroma half was sound (measured, and
the harness proves it closes the gap); the luma half is what killed it. A future attempt
should probably pull chroma only and leave luma alone entirely.

Also found while testing: at the observed ~1.7-unit drift the correction is set by
`MAX_SHIFT`, **not** `PULL`. The clamp starts at 1.64 units. The module header reads as if
`PULL` governs. Unchanged, but do not tune `PULL` expecting an effect.

---

## 2. THE ROOT CAUSE — it was never model randomness

`Lighting/mood for that spot` sat in the **REQUIRED** list of every avatar-scene prompt, and
the worked example the model copies ended *"warm afternoon sunlight from the window."* Every
beat was **instructed** to invent its own light, so which beat came back warm was a dice
throw. That is why three regenerate rolls on 2026-08-17 all failed: **a re-roll cannot repair
an instruction.**

`git log -S"Lighting/mood for that spot"` returned exactly one commit, `9e0877e` from
2026-05-09. The line had never been edited in three months.

**The Aug-16 work (`29b7a70`) did NOT fix this.** It added the gate's `lightingLooksProduced`
OBSERVATION — a detector, and a flag-only one that does not reroll. Detection is not a cure.

### Fix 1 (`b1632b0`)
The bullet now asks for ORDINARY ambient room light, the SAME in every scene, and names the
vocabulary that breaks sibling agreement. The old `CORRECT:` example became a `WRONG:` example
— it was the template for the drift.

**Confirmed live in output.** The scenes the model wrote afterward end with the exact phrase
`ordinary indoor daylight`. That is not inference; it is in the stored `imagePrompt`.

### Fix 2 (`35cd3ed`) — three edits
1. **ONE PERFORMER, ONE PLACE** added to the `NARRATIVE RETENTION RHYTHOR` strategy (the
   `else` branch every plain-UGC recipe falls through — Real Talk, Hype Drop, etc.). It was
   the **only** strategy block in the file with no place rule; realestate, services, tryon,
   unboxing, demo, tutorial and transformation all had one. Product-only B-roll is exempt.
2. **The light ban is now scoped to the LIGHT, not the words.** v1 banned `warm` and `amber`
   outright, which would have made "a warm closed-lip smile" and "the amber Hiraya Glow
   bottle" violations — both appeared and both are correct. Worse: HOOK ANCHOR RULE derives
   the hook's anchor colour FROM the product, so a strict reading could have recoloured the
   user's own bottle.
3. **`studio` added** to the banned light words. Scene 6 emitted *"Macro studio close-up …
   ordinary indoor daylight"* — two lighting instructions fighting in one sentence.

### What was RULED OUT, and why it stays untouched
The auto-cast avatar prompt carries `**Lighting Protocol:** ALWAYS use 'Commercial Beauty
Lighting'`. It was the other suspect for the residual warmth. **It cannot be the cause:** the
avatar plate is ONE image shared by all 8 scenes, and 7 came back clean. A constant cannot
explain a variable. Neil likes that lighting — it stays.

---

## 3. WHAT TO EXPECT AND WATCH, PER FORMAT

The two fixes do not cover every format equally. Before testing a new one, check this table.

| Format / recipe | Place rule? | Hook path | What to watch |
|---|---|---|---|
| `before_after` (ugc_pro) | ✅ had one | HARD CUT, single `imagePrompt` | Clean twice on 2026-08-19. The baseline. |
| `real_talk`, `hype_drop` (ugc) | ✅ **new in `35cd3ed`** | **MORPH** (start+end frames) | Re-verify the room lock. Scene 1 warmth is EXPECTED (see below). |
| `rapid_fire`, `pure_hype` (product_ugc) | ✅ same new rule | MORPH | Untested. Same expectations as Real Talk. |
| `try_on`, `demo`, `tutorial` (ugc_pro) | ✅ had one | HARD CUT | ⚠️ These use `onbody.png` / `inuse.png`, still the **2026-07-11** files. Measured: `onbody` VAVG **141.3** vs the rebuilt pair's **134.9**, and 15 units darker. If warmth returns here, suspect the ASSET, not the prompt. |
| Services / RealEstate | ✅ had one | own branches | Untested this session. |

### 🔶 Scene 1 warmth on a MORPH format is CORRECT, not a bug
HOOK ANCHOR RULE: *"The two stills MUST share ONE named concrete anchor: the SAME dominant
colour… **The anchor colour comes FROM THE PRODUCT.**"* Hiraya Glow is an amber bottle, so an
amber/orange hook still is the rule working. The 2026-08-19 Real Talk run opened on an orange
fruit for exactly this reason. **Do not "fix" it.**

### 🔴 But that same run VIOLATED two halves of the hook rule
- **No shared silhouette.** Round fruit → tall bottle in a hand. The rule demands colour AND
  silhouette AND position. Its own warning: a morph without both *"forces the video model to
  interpolate through formless flesh-toned mush."*
- **A person in the hook end frame.** The rule says *"NO people, faces, hands, or bodies in
  the hook end frame."* The end frame was her holding the bottle.

Predicted consequence: **goo in the middle of scene 1 when filmed** — issue #92, not new, and
not caused by any lighting change. Verify on the next film run before treating it as new.

---

## 4. OPEN, NOT FIXED

- **Auto-cast "slop" (Neil's standing request, never implemented).** No anti-slop rule exists.
  Three things in `generateAvatarImage` actively PRODUCE the sameness: `ALWAYS Commercial
  Beauty Lighting`, a `Professional Retouch Layer`, and a negative list banning wrinkles,
  sagging, grey hair and "leathery" textures — i.e. every marker of a real face. It also
  contradicts its own `REALISM_INSTRUCTION` ("imperfect", "soft window light") inside one
  prompt. **Scope carefully: Neil likes the LIGHTING and dislikes the sameness of the FACE.**
  Attack the retouch layer and the texture bans; leave the lighting protocol alone.
- **Floating product — no guard exists.** The image gate makes exactly six observations:
  `personPresent`, `personMatchesReference`, `productLabelText`, `labelLegible`,
  `lightingLooksProduced`, `compositionNotes`. None covers hand contact. `compositionNotes` is
  a description, not a check — nothing reads it. Fix pattern already in the repo:
  `BAG_ORIENTATION_RULE` (`prompts.ts`), plus a 7th gate observation.
- **Half-face crops.** Scene 3 of the auto-presenter `before_after` run was a half-face. The
  only crop rule in the file is scoped to the MORPH hook start frame (where a cropped detail
  is REQUIRED to avoid flesh-mush) and does not reach UGC Pro. Neil's worry — the video model
  inventing the rest of the face — is real and is a VIDEO-stage question. Our own zoompan
  cannot reveal anything outside the still. **Needs one film run to settle. Do not fix blind.**
- **Quota race in `consumeFinishedAd`.** `peekQuota` (read) → `consumeMonthly` (write) →
  `rateLimitCheck` (mark) is not atomic, and scenes fan out in parallel. On 2026-08-19 a
  4-scene fan-out produced 3 submissions and one 402 while the counter jumped to 8/8. An
  owner will never notice; the first customer with 8 scenes will. Fix: make the jobKey claim
  the FIRST atomic step, so only the winner consumes a monthly credit.
- **Supabase is on the FREE tier and past its grace period** ("projects will not be able to
  serve requests when you use up your quota"). It holds auth, runs, quota and billing. Not an
  emergency; cannot be allowed to meet a paying customer.

---

## 5. METHOD LESSONS FROM THIS SESSION

- **`grep` over the working tree is not a search of the repo.** Asked whether an Aug transition
  change existed, the first grep covered only checked-out files at HEAD and reported "none".
  There are 30 remote branches. `CLAUDE.md` warns about exactly this and it happened anyway.
  Search branches: `for b in $(git branch -r ...); do git grep -il "<term>" "$b"; done`.
- **Search by the CONCEPT, not the proper noun.** The Nikolai Savic work was real and shipped
  as the HOOK ANCHOR RULE (2026-05-19), and the August test of it is logged in
  `workflows/pilot_run_2026-08-13.md`. Searching "Nikolai" found the theory doc; searching
  "morph" would have found the run.
- **A folder named `-v2` was OLDER than the one without.** `sample-batch-v2` (2026-07-16) vs
  `sample-batch` (2026-08-16). Cost a wrong upload path mid-session. v2 is now deleted
  (`af0be7a`). `tests/fixtures/sample-batch` is the only set.
- **Confirm the deploy carries the CODE, not just the flag.** A runtime-read flag still needs
  the code that reads it to be deployed. Setting `SCENE_GRADE_ENABLED=true` did nothing until
  the wiring commit reached production.
- **A regex over prompts finds words, not meanings.** The "warm|amber" sweep returned two
  false positives (a warm smile, an amber bottle) and correctly returned nothing for the scene
  that actually looked warm. Read the hits before believing them.

---

## 6. RUN IDS (recoverable — the app has no run list)

The ONLY pointer to a run is `localStorage['osa_producer_active_run']`, which the defreezer
eats. To reopen one, paste in the browser console at `grifon.ai/app?osaEngine=producer`:

```js
localStorage.setItem('osa_producer_active_run', '<run_id>'); location.reload();
```

Safe: the server checks ownership and a bad id 404s back to the launch screen. "Start Over" is
client-only (`handleMakeAnother`) — it removes the key and leaves the row intact.

| run_id | What it is |
|---|---|
| `apr_b1fbdfc1-67d5-47b1-9431-944a74f2665f` | The parked `before_after` run, filmed 2026-08-19. The one that hit 8/8 credits. |
| `apr_8bfea5ab-c437-4056-a195-b52e93668e70` | `before_after`, MANUAL presenter (`after.png`). Storyboard PASS — *"ABSOLUTE CINEMA"*. |
| `apr_1c8d24ca-0bd4-495a-8575-5bcb1e7c385a` | `real_talk`, AUTO presenter, hero only, 8 scenes. The vanity-table run. |

Reading a stored storyboard prompt (Supabase **SQL Editor**, not Table Editor — the prompts
live inside `producer_runs.artifacts`, a jsonb column):

```sql
select idx as scene_no, s->>'imagePrompt' as image_prompt
from producer_runs r,
     jsonb_array_elements(r.artifacts->'storyboard') with ordinality as t(s, idx)
where r.run_id = '<run_id>'
order by idx;
```
