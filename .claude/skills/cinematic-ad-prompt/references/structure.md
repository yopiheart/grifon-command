# Prompt Structure — Universal Section Vocabulary

This is the assembly kit. Every style and both modes are built from these sections. Use the ones the scene needs, in this canonical order. Skip what doesn't apply — a simple oner may use six of them; a full commercial may use them all.

## Canonical order

1. **STYLE** — the look. Render type (8K/4K photoreal / Pixar-quality 3D / UE5 in-engine / anamorphic film), grade, grain, mood. For game looks, explicitly state NOT live-action / NOT film. For photoreal, state NOT 3D render / NOT game engine. This is the single most important line; lead with it.
2. **SCENE CONTEXT** — one or two sentences: what the film is, total length, number of sections/shots, aspect ratio.
3. **ACTIVE REFERENCES / INPUT LOCK** — list each reference and what it pins. Use `@image_1 — description. 100% matches the reference.` For video composites use `<<<video_1>>>` and an INPUT LOCK clause naming everything preserved unchanged (see "Reference locking" below).
4. **FORMAT MODE** — `Timed multishot, HARD CUTs on action` OR `ONE CONTINUOUS TAKE, no cuts`. State that the camera does not cut on its own; cuts happen only at named points.
5. **LIGHTING** — sources, key/rim/accent, color temperature (WB in Kelvin), volumetrics, practical motivations. Per-character or per-section "light worlds" when the scene shifts environments.
6. **COLOR** — the 60:30:10 dominant/secondary/accent split, named explicitly. Black crush / saturation / grade. (For 4K: see `seedance-4k.md` on 10-bit / no banding.)
7. **CAMERA** — the lens and movement language: crash-zoom, macro probe, aerial drone, snap-rack focus, dolly, steadicam, FPV, chase-cam, bullet-time orbit, speed-ramp. Always in motion.
8. **OPTICS** (optional, advanced) — per-cut focal lengths and angles, e.g. `CUT 2 — ECU 14° HARD FAST ZOOM`.
9. **MATERIAL / SURFACES** — material-level realism: wet hide, barnacles, PBR clay, subsurface skin/fur, enamel, refracting water, beading droplets, micro-texture (skin pores, fabric weave). 4K rewards micro-texture — it breaks the synthetic glaze.
10. **CHARACTER DESIGN** — original designs described concretely. State "original, not based on any franchise" for creatures. Lock identity across cuts.
11. **SUBJECTS** — the named entities and what they do, using @handles where the model supports them.
12. **PHYSICS** — mass, gravity, inertia, contact shadows, fluid dynamics, surface tension. Explicitly "no floating props". For convincing weight/momentum, drive from an image (image-to-video).
13. **ACTING / PERFORMANCE** — micro-pauses, eye-line, breath, body weight, expression. For animation: cartoon expressiveness. For dialogue: the spoken lines and delivery.
14. **COMPOSITION** — rule of thirds / golden ratio, staging, three-layer depth, "motion from frame one". For 9:16 ads: keep the subject and any text-safe zone center-frame, action in the top two-thirds (UI/captions live at the bottom).
15. **LOCATION / LOCATION MAP** — the world, plus a foreground/midground/background breakdown and the camera's path through it.
16. **FIRST FRAME / BLOCKING** — what the literal opening frame shows (and that something is already moving).
17. **CONTINUITY** — what stays identical across every cut (character, props, environment, HUD, the specific eye, product label/color). "No identity drift."
18. **HUD LAYER** (game styles only) — every UI element, screen-pinned, with exact text/colors. See `styles.md` → Game.
19. **ACTION / SHOT BREAKDOWN** — the heart. Per-shot or per-beat description with timecodes. See below.
20. **TECHNICAL** — fps, resolution, "no jitter/aliasing", motion-blur shutter, bitrate/color depth (see `seedance-4k.md`).
21. **AUDIO** — diegetic SFX, music policy. Default NO MUSIC, SFX only. DR mode may carry one spoken line / VO.
22. **CONSTRAINTS** — aspect ratio, hard rules, scale locks, what must not happen.
23. **POSITIVE LOCKS** — final restatement of the must-not-break rules (reference fidelity, logos, product colors, single-occurrence effects).

## Two ad-specific sections (DIRECT-RESPONSE AD mode)

Insert these when the shot must sell. Detail and copy rules live in `direct-response.md`.

- **HOOK FRAME** (place right after FIRST FRAME / BLOCKING). The first-3-second pattern interrupt: the visual disruptor that stops the scroll plus any on-screen text or first spoken word. The hook is a *frame*, not a fade-in — something arresting is already happening at 0:00. Never open on "Hi" or the brand name.
- **CTA / END CARD** (place just before AUDIO). The closing beat: the offer made visible (product hero, result, or a clean end card) and the spoken/on-screen call to action. Keep it one clear action; never show price in the shot.

## The ACTION / SHOT BREAKDOWN — how to write shots

This is where most of the value lives. Two modes:

### Multishot
Each shot is a labeled block with a timecode and a hard cut:
```
SHOT 1 (0:00–0:05) — [camera framing + movement]: [action, verb first]. [scale/detail beat]. Hard cut.
SHOT 2 (0:05–0:10) — ...
```
or the bracketed section style:
```
[Section 1 — 0.0–2.0s] CHARACTER A, [framing matching @image_1]. [Action]. [Detail beat]. [Camera move that ends the section].
HARD CUT —
```
Rules: name the framing and the camera move in every shot. Lead each shot with the action, not the setting. State exactly where each cut falls. If an effect (film burn, strobe, speed-ramp) happens, say it occurs ONLY at the named moment and is hard in/out.

### Oner (single continuous take)
One flowing paragraph, beats marked by timestamp ranges, NO cuts ever:
```
Single continuous shot 15s: [opening, already in motion]... at the three-second mark [beat]... [speed-ramp moment] time ramps into slow motion... [recovery] snaps back to full speed... before [closing motion] without ever pulling up or back.
```
Rules: the only permitted speed change is an explicitly named speed-ramp/bullet-time beat that returns to normal. State "one take no cuts" up front and "never pulling up or back" / "no edits" at the end. Use the camera as a flying/chasing presence.

## Reference locking — exact phrasing

- **Image reference (extend, don't freeze):**
  `@image_1 is the master STYLE REFERENCE, not a fixed keyframe. Match its look 100%. DO NOT use it as a frozen keyframe — set the scene in motion and let the world extend forward. Introduce no new characters, props or palette.`
- **Image reference (identity lock):**
  `@image_1 — [character]: [description]. 100% matches the reference.`
- **Video composite (input lock):**
  `INPUT LOCK — <<<video_1>>> matches input 100%. The entire source clip is preserved UNCHANGED: [list every element]. Do NOT re-grade, re-time, smooth, or re-frame anything. The ONLY additions are [the new element and its physical effects].`
- **Product / named link:** treat as a product reference whose logos, colors and arrangement match exactly; restate the locked text (e.g. logo reads exactly BEGIM; serum stays green).

## Speed and effects vocabulary

- **Speed-ramp:** real-time → slow-mo → real-time, triggered by a named event (a jolt, a strike, a near-collision). Always returns to normal.
- **Bullet-time:** frozen moment with the camera orbiting the suspended action.
- **Film burn:** a one-time chemical-burn transition; state it happens once, at one timecode, hard in and out, never bleeding into other cuts.
- **Strobe flash / hard match-cut:** instant cuts on action, no crossfade.
Default everywhere else: **NO slow-motion** unless a beat explicitly calls for it.

## Discipline checklist (run before delivering)

- [ ] STYLE line leads and names the render type (and what it is NOT, for game/photoreal).
- [ ] Camera is moving in the first second; action starts immediately.
- [ ] Three depth layers present; a figure gives scale to anything large.
- [ ] Every reference has a 100%-match / input-lock clause.
- [ ] Physics line present (mass, contact shadows, no floating).
- [ ] Cuts (or "no cuts") stated explicitly with timecodes.
- [ ] AUDIO section present; music policy stated.
- [ ] Aspect ratio + total length stated.
- [ ] Content-policy safe by construction (see `content-policy.md`).
- [ ] **DR mode only:** HOOK FRAME stops the scroll at 0:00; CTA/END CARD beat present; one clear action; no price shown; language register consistent (see `direct-response.md`).
- [ ] Formatting matches the output standard: dense, directive, canonical section order.
