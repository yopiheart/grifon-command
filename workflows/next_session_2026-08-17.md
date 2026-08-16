# Next session — carry the format lessons across, then two new preset bugs

**Written 2026-08-16 at speed, minutes before the cafe PC died.** Everything below is
either verified this session or an explicitly-labelled starting pointer. Do not treat the
pointers as diagnoses.

---

## 1. Carry the `before_after` lessons to the other 11 formats

Neil's ask: *"gusto ko lang sana ma-make sure na lahat ng learning from this format ay
mai-apply sa ibang format lalo na kung perfect fit ito sa kanila."*

**Good news first — 4 of the 7 fixes are ALREADY format-agnostic**, because they landed on
shared rules rather than inside the TRANSFORMATION skeleton. Verify, do not redo:

| Fix | Where it landed | Covers |
|---|---|---|
| EXPRESSION CEILING | `APPEARANCE_LOCK_RULE` (all avatar scenes) | **every format** |
| EXPRESSION CONTINUITY | video prompt, ABOVE the type branches | **every format + every type** |
| Camera positive target | `OPTION A-REGULAR` + `OPTION B` (type branches) | **every format** |
| Hook-morph gate | `OPTION A-HOOK` condition | **every format** |
| Thumbnail UGC register | `generateThumbnail` | **every format** |
| Gate `cinematic_grade` | `judgeImageGate`, scoped to identity modes | **every format** |

### 🔴 THE ONE THAT IS NOT DONE — the `referenceImage="none"` audit

This is the highest-value carry-over and it is the same defect that cost two runs.

`"none"` on a scene means NO identity anchor, so the model renders a stranger AND the
camera mandate does not fire. We closed it for TRANSFORMATION only
([`prompts.ts`](../api/_lib/prompts.ts) S1/S3). **Every other skeleton still offers it.**
Confirmed present at least at `prompts.ts` ~1483, ~1489 (services), and the RealEstate and
UGC Pro sub-format blocks around ~1450-1576.

**Do this:** grep `referenceImage="none"` across `api/_lib/prompts.ts`, and for EACH hit ask
the one question that matters: *does a human whose identity we locked appear in this beat?*
- **Yes** → `"none"` is forbidden, exactly as done for TRANSFORMATION.
- **No** (pure product, surface, place, hands-only) → `"none"` is correct, leave it.

⛔ TUNED. Neil already approved the pattern for TRANSFORMATION; get his GO for the sweep,
and show him the per-format list before editing.

### Also not done, needs per-format judgement

- **"SHOW THE FLAW" hook** — landed in TRANSFORMATION S1 only, and it is right that it did:
  a `before_after` hook has a flaw to point at. `unboxing` has a sealed box, `tryon` has a
  garment, `demo` has a job to do. The PRINCIPLE transfers (*the first 3 seconds are decided
  by the eye — give it a thing to look at, and a camera move toward it*); the SUBJECT does
  not. Write the per-format version, do not copy-paste.
- **`avatar_state` slot coverage** — person-state slots are `before`/`after`/`onbody`, so
  `transformation` and `tryon` are covered. `unboxing`/`demo`/`tutorial` use
  `packaging`/`inuse`, which route to `venue` mode on performer-free scenes. Probably right;
  confirm rather than assume.

---

## 2. 🐛 NEW — SFX and background music look identical across presets

Neil, 2026-08-16: *"ung sound effects and background music parang iisa lang hindi nagbago...
alam ko dapat nakaconnect un sa elevenlabs generate."*

**Not investigated. Three starting pointers, in order of likelihood:**

1. **`SFX_V2_ENABLED`.** Per `CLAUDE.md`: `'true'` enables seeded per-ad SFX variant
   rotation in [`renderFfmpeg.ts`](../api/_lib/renderFfmpeg.ts); **anything else = legacy
   static bank**, i.e. the same SFX every render. **Check this env var on Vercel FIRST** —
   if it is unset, the behaviour Neil saw is the documented default, not a bug.
   Note also: **CLASSIC never rotates regardless of the flag.**
2. **The music bed may be aliased.** `sample_batch_test_spec.md` finding #26 records a
   `ugcpro → testimonial.mp3` alias bed. If several presets alias to one file, identical
   music is expected and the defect is the alias, not the picker.
3. ⚠️ **Correct a premise before debugging.** SFX in this codebase come from a **static
   bank in the renderer**, not from ElevenLabs. ElevenLabs is TTS / STS / voices only
   (`api/elevenlabs/*`). If Neil expects generated SFX, that is a **feature request**, not
   a regression — resolve which one it is before writing any code.

---

## 3. 🐛 NEW — hook overlay text ignores the preset

Neil, 2026-08-16: *"ung overlay text sa hook, hindi nag babago kahit anong preset piliin ko,
bars/punch/spotlight parehas. ung auto caption lang ung nag babago."*

**Not investigated. Strong starting pointer:** the hook has its OWN text branch. Recorded in
`sample_batch_test_spec.md` finding #25 — [`drawPlan.ts`](../api/_lib/drawPlan.ts) ~511-513,
for `isHook` scenes the ONLY text source is `overlayText[0].text`, and it `return []`s when
that is absent. So the hook title is built by a special-case path.

**The question to answer first:** does that hook branch read the preset's caption styling at
all, or does it hardcode one look? If it hardcodes, that is exactly the reported symptom and
the fix is to thread the preset through. Confirm on the CODE before touching the renderer —
gate 7 is the standing reminder that a filed root cause here has been wrong before.

---

## 4. State at close of session 2026-08-16

Three merges on `main`, all deployed, each with a one-command rollback:
`c932dc0` · `e4d2864` · `77426d1`. Working tree clean apart from `package-lock.json`, which
was **already dirty before this session started and was deliberately never committed**.

Resume from [`NOW.md`](../NOW.md) — it carries the run instructions and the corrected
four-point storyboard gate.
