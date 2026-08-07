# Archive — dated session handoffs

Finished session handoffs live here. They are **history, not resume paths**. Nothing in
this folder is the next thing to do; that is always [`NOW.md`](../../NOW.md).

## Why the folder exists

Context budget. `workflows/` is read by every session, and 36 dated `handoff_*.md` files
sitting beside the live SOPs made the directory listing itself expensive to scan and easy
to misread — a session hunting for the current state could land on a two-month-old handoff
and treat it as live. The rule the repo already applies to `agent_lessons.md` (durable rule
stays live, full story moves to `agent_lessons_archive.md`) applies here too.

## The rule

**A dated handoff is archived once its session's work has landed or been superseded.** In
practice that means: it is not cited by `NOW.md`, and it is not the resume pointer for any
open workflow.

When archiving:

1. `git mv workflows/handoff_<date>-<slug>.md workflows/archive/<date>-<slug>.md` —
   the `handoff_` prefix is dropped; the folder already says what these are.
2. Bump every relative link inside the moved file by one level (`../foo` → `../../foo`),
   except references to another archived handoff, which are now siblings.
3. Repoint inbound references elsewhere in the repo (`workflows/handoff_X.md` →
   `workflows/archive/X.md`).
4. Link-check before committing. The 2026-08-07 sweep moved 36 files and verified
   262 relative links; the only survivors point at genuinely deleted code
   (`services/phoneticNormalizer.ts`, removed in `2e70c5a`), which is correct history.

## What does NOT belong here

- Live SOPs, specs, decision records, swipe files, ledgers — those stay in `workflows/`
  however old they are, because they are still consulted.
- `handoff_oneshot_concierge_unified_flow.md` — undated and still live for the Concierge
  work; left in `workflows/` deliberately.

## Contents

- `2026-05-04` → `2026-06-26` — the May/June build sessions: Director AI sprint, Karit /
  ChillCool / MrBeast / Glossier / Truly smokes, the Kling + Omni discovery arc, the
  bug-catalog halt, the tuned-edit sessions, One-Shot Ad v1, funnel redesign, ad-recon v1.
