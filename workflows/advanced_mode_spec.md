# Advanced Mode ("Director's Cut") — Spec

> **Status:** PROPOSED (not built). Captures the 2026-06-17 strategy session with Neil.
> **Prereq landed:** per-scene clay reshoot in the wizard storyboard (Phase 1 —
> [components/SceneClayStudio.tsx](../components/SceneClayStudio.tsx) +
> [Step5Storyboard.tsx](../components/Step5Storyboard.tsx), branch
> `claude/scene-clay-storyboard`). This spec is the natural Phase 2+ evolution.
> **Not yet in main:** One-Shot / Autopilot (`feat/headless-autopilot-v1`).

---

## 1. The angle: Opinionated by default, editable within rails

Grifon was built for **Burned-Out Business Owner Bryan** (Filipino SMB beginner).
But not all subscribers are beginners — some are marketers/experts with their own
creative direction. The resolution is **not** binary (full lockdown vs blank canvas):

- **NOT caged** — forbidding edits insults the expert ("you know my business better
  than me?"), caps the TAM to beginners, and signals weakness (*"it only works if you
  don't touch it"*). The confidence in our system should make us MORE willing to let
  them edit — *"galawin mo, kakayanin ng rails."*
- **NOT blank canvas** — full freedom turns us into Canva/CapCut-with-AI, kills the
  differentiation, and lets beginners break the formula → garbage output (Bryan's #1
  fear). The formula is the moat.

**Principle:** users change the **content** (script words, frame look, model, take);
they cannot delete the **structure** that makes ads convert.

---

## 2. The guardrail framework (every knob gets one class)

| Class | Meaning | Example |
|---|---|---|
| **OPTIMIZE** | System repairs/tunes the input | Raw prompt → `optimizeImagePrompt` |
| **WARN** | Allowed, but advised | Script > 12 words = "pacing/conversion risk" |
| **CLAMP** | Hard limit, prevents error | Duration → model's max allowed |
| **LOCK** | Not user-editable | Conversion skeleton, TUNED prompts |

---

## 3. How deep editing works (grounded in existing code)

**Prompt-level frame control — "paano kung mali ang prompt?"**
Safety net exists: `optimizeImagePrompt` ([geminiService.ts:2226](../services/geminiService.ts)).
Flow: user types **intent** in plain language → system **OPTIMIZE**s into a tuned
`finalPrompt` → shown in a review panel → then generate. Users never type raw to the
model. Bad/rough prompts get repaired; the user still sees+approves the optimized
version. True experts can opt into a "raw mode" (bypass optimize); **default = optimize.**

**Script overflow — "8–12 words / 4–6s, paano kung sumobra?"**
Duration is computed by `suggestDurationForScript(scriptLine, model, resolution)` —
**words/2.5 + 0.3s** ([RenderAllRunner.ts:17](../components/GenerateVideo/RenderAllRunner.ts)),
model-aware. Exceeding the formula doesn't break tech; it degrades pacing → **WARN**
+ auto-suggest trim.

**Duration > model max — "baka mag-error?"**
Already **CLAMP**ed ([GenerateVideo/index.tsx:1014-1019](../components/GenerateVideo/index.tsx)):
`clamped = allowed[allowed.length - 1]` + toast `"X locks {res} to {clamped}s"`. Each
model has a fixed set of allowed durations (`specs.durations`) — duration is picked
from allowed values, not free-form. No error.

**Whole ad 1 min+?**
Video is per-scene **clips**, then **stitched**. Total length never causes a single
render error — more scenes = more clips = more cost/time, not an error. Per-clip
duration is the only error risk, and that's clamped.

---

## 4. Advanced Mode — the spec

**Toggle:** default OFF (simple/formula). "Director's Cut" toggle, **Pro+ tier only.**
Progressive disclosure — beginners never see it.

### Knobs that open (+ guardrail class)
| Knob | Class | Behavior |
|---|---|---|
| Script text per scene | WARN | Editable; warn if > 8–12 words (pacing). Auto-suggest trim. |
| Custom frame prompt | OPTIMIZE | Type intent → optimize → review → generate. (Raw-mode opt-in.) |
| Reshoot/clay per scene | (shipped) | EXPLORE 3× → SELECT → REFINE (Phase 1). |
| Scene description / direction | OPTIMIZE | Feeds prompt builder, still tuned. |
| Per-scene model | CLAMP | Compatible models only (aspect + image-to-video). |
| Per-scene duration | CLAMP | Allowed durations of the chosen model only. |
| Aspect ratio | CLAMP | Locked at start (9:16 / 16:9); model choices adjust. |

### Stays LOCKED (rails = conversion IP)
- **Hook formula (Scene 0)** — always b-roll / Kling O1; can't delete or reorder out of first.
- **Scene roles / sequence logic** — Metaphor → Anchor → Action → Hero skeleton.
- **CCC / MrBeast structure** — the conversion scaffold.
- **Identity Lock** — avatar/product refs (always injected, regardless of prompt).
- **TUNED prompts/schemas** — server-side, never user-editable.

### Ladder placement
- **Free / Creator (beginners):** defaults-first; never see complexity. Light edits (script text, reshoot).
- **Pro / Business (mix + experts):** deep editing unlocked — monetize "control."
- **Autopilot:** done-for-you; we do the editing.

One product, two depths — Bryan protected from paralysis, expert set free, no product split.

---

## 5. Usability — "madali ba nila maiintindihan?"

Yes, if **invisible by default**:
1. **The 80% (Bryan) see nothing** — toggle OFF, app works exactly as today. Zero added load.
2. **The expert who flips it already knows the concepts** — we're not teaching, we're unlocking.
3. **Three rules keep it easy even for the curious middle:**
   - **Edit-in-place**, not a settings panel (knobs appear on the thing you edit).
   - **Plain-language intent**, not jargon (system optimizes; no "technical prompts").
   - **Defaults pre-filled in every knob** — adjusting a good default is easy; authoring
     from blank is hard. Always-visible **"Reset to Grifon default"** escape hatch.
4. **Real risk = the curious middle** (beginner who flips it). Mitigation: toggle label
   sets expectation ("Director's Cut — advanced control"), sensible defaults, one-tap reset.

---

## 6. Tagalog / Taglish input (a Filipino-SMB advantage)

Gemini is multilingual — users can type edit instructions in **Tagalog/Taglish**; no
English needed. The OPTIMIZE step is the bridge: any-language intent → clean, tuned
(usually English, for fidelity) generation prompt → render.

Example: *"palitan mo ang background, gusto ko nasa Filipino restaurant sila, kumakain,
natatawa siya"* → OPTIMIZE (keeps identity lock) → *"Same subject, identity & wardrobe
locked — now seated in a warm Filipino restaurant interior, eating, genuine laughter,
natural warm lighting…"* → render with face/wardrobe/product locked.

- *"natatawa / kumakain"* = expression + action = **scene-driven (VARIES)**; mukha/damit = LOCKED.
- **Full setting change** (e.g., restaurant) → route to the **REFINE / mold path**
  (`executeStudioCommand`, pixel-lock keeps the person, swaps background). The
  EXPLORE/divergence path has a continuity rail that keeps the avatar in a consistent
  setting across scenes → if the instruction fights continuity, **WARN**:
  *"Heads up — ibang setting 'to sa ibang scenes mo."*
- **UI copy:** Taglish placeholders/hints, with a Tagalog example shown in the input so
  users know they can: `I-type kung ano gusto mong baguhin (hal. "palitan ang background,
  gawing Filipino restaurant, natatawa siya")`.

---

## 7. The structural advantage behind all of this

Grifon's pipeline is **text → storyboard → approved frames → per-scene video clips**
(image-to-video, per scene — [RenderAllRunner.ts](../components/GenerateVideo/RenderAllRunner.ts)).
The **frame is the input to the video.** This is why the clay/edit layer belongs on
the **frame**, not the video:

| | Kling / Veo / Seedance / Higgsfield | Grifon |
|---|---|---|
| Flow | text → **video** (one gamble) | text → frames → per-scene video |
| See if it's bad | at the end (after full render) | at the **frame** (before render) |
| Fix it | re-gamble the whole video | fix the **frame** (cheap/fast), then render one clip |

**Fix at the frame layer, not the video layer.** Frames are ~₱2 + seconds; video is
expensive + minutes. Never make the user gamble a full render.

**Two modes reconcile this:**
- **Director AI (wizard / control):** explicit storyboard checkpoint — approve/clay
  frames before video. (Clay shipped in Phase 1.)
- **One-Shot / Autopilot (speed):** 1 click → auto-frames → auto-render → stitch → done
  in 15–30 min. Skips the manual checkpoint (the whole point). But output lands editable:
  bad clip → fix its frame (clay) → re-render **that one clip** (per-scene render already
  supports single-scene). "Fix one scene, don't redo the ad" — extended to video.

**CMO wedge (sellable):** *"Sa Kling at Veo, sugal ka — sa huli mo lang malalaman kung
panget. Sa Grifon, makikita mo ang bawat frame BAGO mag-render. Walang surprise."*

---

## 8. Additional scenarios (beyond the obvious)

1. **Identity drift on wild prompts** — handled: refs are injected separately from the
   prompt in `generateSceneImage`, so even a crazy prompt keeps face/product. Built-in rail.
2. **Hook (Scene 0) deletion/reorder** — collapses conversion → LOCK scene-0 role / warn on reorder.
3. **Script ↔ frame ↔ voiceover desync** — editing script after frames/voice generated →
   flag "frame/voice stale — re-sync needed."
4. **Model ↔ aspect mismatch** — filter model choices to compatible ones (CLAMP).
5. **Content refusal on custom prompt** — surface gracefully + suggest rewrite.
6. **Quota blast from heavy advanced use** — existing `images`/video meter governs; advanced
   usage draws the same meter.

---

## Resume triggers

- Build Advanced Mode when Pro+ retention/expert-churn signals justify it, OR when a power
  user explicitly asks for prompt/model/duration control.
- The "drop into clay from a bad One-Shot clip" flow is gated on `feat/headless-autopilot-v1`
  merging to main first.
