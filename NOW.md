# NOW - the resume doc
**Stamped: 2026-11-14. Codex model routing and Producer recovery handoff**

## Codex model routing
[Draft PR235](https://github.com/yopiheart/grifon-command/pull/235) sets Sol
High at Standard speed and adds task-based Luna High and Astra Extra High
handoffs on `codex/auto-model-routing`. See the
[desktop model selection workflow](workflows/codex_desktop.md#automatic-model-selection).
The project config and a fresh ephemeral Codex chat resolved to Sol High.
The ChatGPT-signed-in catalog exposed all three selected model and effort
pairs. A read-only Luna scan and an independent Astra review completed.
An App Server probe loaded the project instructions and completed a delegated
read-only decision. The probe did not report the child's resolved model.
The 26 Codex checks and strict resume check passed locally.

## Other open work
[PR226](https://github.com/yopiheart/grifon-command/pull/226) merged the
isolated provider recovery harness at `37f54d67`.
[Draft PR227](https://github.com/yopiheart/grifon-command/pull/227) contains
the recovery fix for duplicate submissions and late writes. It had 44
successful hosted checks and two skips at `c01261ba`. Live provider lookup
and billing remain unverified. Let active renders finish and plan a refresh
for old browser tabs before any authorized release.
[Draft PR234](https://github.com/yopiheart/grifon-command/pull/234) contains
the earlier instruction cleanup. GitHub Actions was blocked by an account
billing lock. PR201 live voice remains paused.

## ▶ NEXT ACTION
Start a fresh Grifon chat on the model routing branch. Check the actual
handoff on a real task and compare usage, elapsed time and rework. Keep the
recovery and instruction drafts available for review when hosted CI resumes.
