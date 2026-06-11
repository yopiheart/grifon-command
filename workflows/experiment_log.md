# Experiment Log

Append-only, one line per experiment. The goal: "what have we already tried on X?"
should be a grep, not archaeology across handoff docs. Pattern borrowed from
karpathy/autoresearch's `results.tsv` (2026-06-11 evaluation — see the autoresearch
annotations in [post_beta_roadmap.md](post_beta_roadmap.md) items #1 and #8).

**Rules:**

- **Log every paid render experiment** (Kling/Veo/Gemini spend with a hypothesis and
  a verdict) and any cheap experiment whose outcome gates a decision (e.g. Gate 1
  text-diffs). Routine smoke tests and production renders don't belong here —
  experiments do: a hypothesis existed and the result settled it.
- **Never delete or rewrite rows.** Corrections get a new row. The log's value is
  that a FAIL stays visible so it isn't re-run.
- **One row per experiment, not per session.** A session that probes 3 levers gets
  3 rows.
- Keep the detail in the handoff doc; the row is the index entry. `keep` = shipped
  or adopted, `discard` = rejected/reverted, `documented` = knowledge outcome, no
  change shipped.

| Date | Subject | Hypothesis | Cost | Result | Verdict | Source |
|---|---|---|---|---|---|---|
| 2026-05-19 | Option A-Hook meta-prompt (Gate 1 text-diff, 3 variants × 3 effects) | Flash varies hook prose per `transitionEffect` if the signal reaches it; camera motion can stay optional | ~$0.001 | Plumbing alone produced per-effect prose; optional camera motion regressed to static — made MANDATORY | keep (`31d65f4`, `4a82d99`) | [handoff_2026-05-19-session-e-shipped-session-f-pending.md](handoff_2026-05-19-session-e-shipped-session-f-pending.md) |
| 2026-05-19 | Omni hook live render, Bukidnon Brew (Gate 2, Render A vs B) | Post-audit Flash output beats pre-audit on anchor-bridging at t=2.5s | $1.00 | PASS — Render B substantively better; below hand-crafted quality but automatic for every user | keep | [handoff_2026-05-19-session-e-shipped-session-f-pending.md](handoff_2026-05-19-session-e-shipped-session-f-pending.md) |
| 2026-05-22 | Invisible Effect prose (Gate 1 text-diff, 5 effects) | All 5 untested VFX MENU effects produce coherent Omni-renderable prose | ~$0.001 | Invisible Effect degraded to morph prose (no clause, no 2-frame interpretation) — excluded from render set | discard (not rendered) | [handoff_2026-05-22-session-f-omni-effect-sweep.md](handoff_2026-05-22-session-f-omni-effect-sweep.md) |
| 2026-05-22 | Omni effect sweep, beans→latte substrate (4 effects, std/5s/9:16) | Each VFX MENU effect renders distinctly on Omni's two-frame surface | $1.00 | Object Materialization PASS, Explosion Reveal PASS, Chaos Burst WEAK (plain morph), Snap Cut FAIL (no instant cut). Omni delivers exactly ONE motion: gradual anchor-bridged transformation | documented (validated set: Morph, ObjMat, Explosion) | [handoff_2026-05-22-session-f-omni-effect-sweep.md](handoff_2026-05-22-session-f-omni-effect-sweep.md) |
| 2026-05-22 | Frame-sampling grid (t=0/2.5/4.9 inherited from Morph) | Session E's grid is valid for grading the new effects | $0 | INVALID — fast transitions complete by ~t1.2–3s; grid sampled start/end/end. Re-extracted dense 0–2.5s grid (0/0.4/0.8/1.2/1.7/2.5) | discard grid; dense-grid method adopted ([agent_lessons.md](../agent_lessons.md) 2026-05-22) | [handoff_2026-05-22-session-f-omni-effect-sweep.md](handoff_2026-05-22-session-f-omni-effect-sweep.md) |
| 2026-05-22 | Down-convert clause re-render (Snap Cut + Chaos Burst) | Consolidated down-convert clause (Snap/Invisible→morph, Chaos→Explosion) renders without regression | $0.50 | No regression; Snap Cut prompt contradiction resolved | keep (`84d542d` TUNED, Neil-approved) | [handoff_2026-05-22-session-f-omni-effect-sweep.md](handoff_2026-05-22-session-f-omni-effect-sweep.md) |
| 2026-05-22 | Omni dead-first-second — prompt lever (n=2, maximal front-loaded prompt) | Aggressive FRAME-0 motion-onset language pulls the morph into t≤0.6s | $0.50 | FAIL — both renders static through t=1.0s, morph onset ~t1.7s, identical to baseline. n=2 agree | discard | [handoff_2026-05-22-session-g-dead-first-second.md](handoff_2026-05-22-session-g-dead-first-second.md) |
| 2026-05-22 | Omni dead-first-second — duration lever (3s clip) | Shorter duration compresses the dead head | $0.25 | FAIL, WORSE — dead head grew to ~2s (67% of clip); Omni back-loads regardless | discard | [handoff_2026-05-22-session-g-dead-first-second.md](handoff_2026-05-22-session-g-dead-first-second.md) |
| 2026-05-22 | Omni dead-first-second — `negative_prompt`/`cfg_scale` params spike | Params channel might carry pacing guidance text cannot | $0 (declined) | Neil declined at Step 4 checkpoint — same text channel, decisive contrary evidence from Step 1 | discard (not run); limit documented as structural → trim fix is [post_beta_roadmap.md](post_beta_roadmap.md) #9 | [handoff_2026-05-22-session-g-dead-first-second.md](handoff_2026-05-22-session-g-dead-first-second.md) |
