# Locked Wins — what Neil approved, and whether it can silently disappear

**Created 2026-08-20**, after a session where Neil correctly remembered a hook he had approved
on 2026-08-13 and the agent spent three failed searches insisting it did not exist. It existed.
It was in a Postgres row, and in no repo doc.

This file is the missing link between **a decision** (which lived in `workflows/`) and **the
artifact that decision was about** (which lived only in Supabase). Neither half could find the
other, so an approved look could vanish between runs with nobody able to prove it had ever been
there.

---

## The rule this file enforces

> **Approved is not the same as locked.**

A generative pipeline returns a distribution, not a value. A good frame proves the pipeline
*can* produce it, never that it *will* again. So every entry below carries a **Locked?** column,
and that column is the only thing that predicts whether the win survives the next run:

| Locked? | Meaning |
|---|---|
| 🔒 **CODE** | Pinned in code or a tuned prompt. Cite the commit. It will recur. |
| 🎲 **LUCK** | Approved, never pinned. It was a dice roll and it will not reliably recur. |
| 🔴 **REJECTED** | Neil looked and said no. Recorded so it is never re-proposed blind. |

**A 🎲 entry is a bug report, not a trophy.** It means we liked something and did not keep it.
When Neil says "this used to work and now it does not," check this column first: a 🎲 row was
never working, it was winning a coin flip.

---

## The register

### W-001 · Hook end frame: the performer holding the product 🎲 LUCK

| | |
|---|---|
| **Approved** | 2026-08-13, run `apr_2f930418-0766-43ad-9bd2-f23abea8382e`, scene 0 |
| **Format** | `real_talk` (Real Talk Review), Hiraya Glow, 10 scenes |
| **Image** | `baselines/locked-wins/2f930418-s00-endframe.jpg` |
| **Origin** | Nikolai Savic anchor-bridge audit, `archive/2026-05-19-session-e-hook-audit.md`. Neil's go: *"Okay B! Go"* → `4a82d99` |

The stored `endFramePrompt` asks for **the bottle alone**:

> *"The Hiraya Glow Vitamin C Brightening Serum bottle, centered, front of bottle/label facing
> camera, sharp focus, warm amber lighting, identical silhouette position as the cheek in the
> start frame."*

The rendered frame is **a woman holding that bottle**. The prompt did not put her there.
[`services/producerOrchestrator.ts:1281`](../services/producerOrchestrator.ts#L1281) did:
`renderEndFrame` passes `avatarUrl` **unconditionally** (line 1295), and forces the reference
mode to `'both'` whenever the end-frame prompt names the product (line 1287 + 1302). The
Hiraya Glow prompt names it, so the image model received the avatar photo plus an instruction
to use it, while the text asked for a bottle. **Code and tuned prompt disagree, and the model
resolves the disagreement differently each run.** That is the whole variance.

⚠️ The same run's FIRST take went to *"a white blob and a brown smear across the face"*
([`pilot_run_2026-08-13.md`](pilot_run_2026-08-13.md)); one re-roll produced the approved frame.
Any move to make the performer deterministic in the hook end frame RAISES morph-goo risk and
must ship with the silhouette half of the HOOK ANCHOR RULE, not without it.

**Lock written 2026-08-20, PENDING one verification run.** Neil chose to keep the morph and make
the performer required, which resolves the disagreement in the prompt's favour rather than the
code's — so `renderEndFrame` needed **no change at all**: `'both'` is now the correct mode because
the end frame genuinely wants both. The tuned block was rewritten (see W-005). Flip this row to
🔒 CODE only after a storyboard run shows the performer in the hook end frame.

This also corrects **P5** in [`loop_arch_handoff.md`](loop_arch_handoff.md) L366 — its diagnosis
(*"the generator is ignoring its own explicit negative constraint"*) was **incomplete**: the
generator was obeying a reference mode the code handed it.

### W-005 · Hook frames anchored on the performer's body 🎲 → pending verification

| | |
|---|---|
| **Decided** | 2026-08-20 by Neil, across four messages, after the CMO recommended the opposite |
| **Written by** | `api/_lib/prompts.ts` storyboard hook block; pinned by `tests/unit/hookStartFrameSubject.test.ts` (10 cases) |
| **Scope** | `real_talk`, `hype_drop`, `rapid_fire`, `pure_hype` ONLY. Services, UGC Pro and Real Estate keep their existing branches verbatim |

Three rules replaced the old product-colour anchor:

1. **Frames are built from the script line.** Start = the problem that line names, end = the
   resolution it points to. A muted viewer must be able to read the hook line off the two stills.
2. **The anchor is the performer's own body**, shared by construction. Start is a cropped detail of
   that performer; end is the same performer pulled back holding the product at the same position.
   A colour-matched stand-in (the 2026-08-19 orange fruit) is banned by name.
3. **The product no longer carries the anchor**, so any product colour works — the portability the
   old rule never had, since it required packaging that sits near skin tones.

⚠️ **The CMO's recommendation was the opposite and Neil overrode it, knowingly.** `P3` in
[`viral_swipe_file.md`](viral_swipe_file.md) — *"Nobody morphs, ever"* — carries **12
corroborations**, and `before_after` (hard cut) is the clean baseline while the morph formats carry
every open hook defect. Neil's call stands; record it here so the trade is visible if the morph
underperforms later, and so nobody re-argues it from scratch.

⚠️ **Deliberately NOT changed: the motion layer.** The Savic anchor-bridge clause lives at
[`services/geminiService.ts:2725`](../services/geminiService.ts#L2725) and still describes
`Object Materialization` as *"anchor element resolves from amorphous into the target subject"* — an
object-swap framing, while the new stills describe a pull-back on one continuous subject. One layer
per test, or the next run cannot say which change did what. Re-read this after the verification run.

### W-002 · Ordinary ambient room light, same in every scene 🔒 CODE

| | |
|---|---|
| **Approved** | 2026-08-20, Neil: *"Wala na rin ung cinematic warm lighting ang galing"* |
| **Locked by** | `b1632b0` (per-beat lighting instruction removed) + `35cd3ed` (light ban scoped to the light) |
| **Proof in output** | Stored scene prompts end with the literal phrase `ordinary indoor daylight` |

The longest-running defect on this pipeline, 4+ corroborations since May. Full autopsy:
[`lighting_fix_2026-08-19.md`](lighting_fix_2026-08-19.md).

### W-003 · One performer, one place 🔒 CODE

| | |
|---|---|
| **Approved** | 2026-08-20, storyboard-gate run confirmed all performer scenes in one open-plan unit |
| **Locked by** | `35cd3ed` — `ONE PERFORMER, ONE PLACE` added to the plain-UGC strategy block |

Before this, the plain-UGC branch was the only strategy in `prompts.ts` with no place rule, so a
Real Talk performer walked hallway → sala → bedroom → kitchen.

### W-004 · Per-scene colour grade 🔴 REJECTED

Neil watched a real render: *"ang dilim at mukang patay na ad."* Flag deleted on Vercel, code
ships dark. **The luma term is the cause** — it pulls every scene to the ad's median, so no scene
may be brighter than the middle. Do not re-propose without dropping luma entirely; grey-world was
separately measured and thrown away. Detail: [`lighting_fix_2026-08-19.md`](lighting_fix_2026-08-19.md).

---

## How to add an entry

**Trigger:** Neil approves any visual outcome, in any format, at any gate. Not "it looks fine" —
an actual approval.

1. Get the `run_id` (`localStorage['osa_producer_active_run']`, or the newest row in
   `producer_runs`) and the scene index.
2. Pull the still out of Postgres and into the repo. Supabase holds the **only** copy and the
   project is on the FREE tier past its grace period:
   ```
   node --env-file=.env scripts/pull-run-frames.mjs <run_id> baselines/locked-wins <scene_idx>
   ```
   Images live in `baselines/locked-wins/` — sparse-excluded, so cafe lite-clones stay small.
   Fetch them with `git sparse-checkout add baselines/locked-wins`.
3. Read the prompt that produced it and paste it into the entry verbatim:
   ```sql
   select s->>'imagePrompt', s->>'startFramePrompt', s->>'endFramePrompt', s->>'referenceImage'
   from producer_runs r,
        jsonb_array_elements(r.artifacts->'storyboard') with ordinality as t(s, idx)
   where r.run_id = '<run_id>' and idx = <scene_idx> + 1;
   ```
4. **Set the Locked? column honestly.** If no commit pins the behaviour, it is 🎲, no matter how
   good the frame is. Quote Neil's own words for the approval.
5. Commit the doc and the image in the same commit.

⚠️ A stored still is only recoverable while it is a `data:` URL on the `producer_scenes` row.
Rows carrying a presigned R2 URL are already dead after 25 hours. Pull on the day of approval.
