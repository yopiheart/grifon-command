# Grifon Motion Director: exact skill proposal

Status: exact patch approved by Neil and installed on 2026-09-17. Fresh-session
automatic-trigger behavior has not been tested.

The user approved the skill/demo implementation plan, then explicitly approved
`install.patch` with SHA-256
`2b542b8b135997e33a322856de8bd00d45c5bacf75fa3b37dfdbc046ce462074`.
That exact patch was checked and applied unchanged, adding only
`.agents/skills/grifon-motion-director/`. The candidate is retained as the approved
source snapshot; the demo uses the approved visual sequence.

Review [candidate/SKILL.md](candidate/SKILL.md), [starting treatments](candidate/references/treatments.md), and [install.patch](install.patch). Candidate-relative links deliberately resolve from the intended installed directory. Existing skill files and tuned application prompts are unchanged.

Independent review caught conflicting historical logo guidance. The revised candidate explicitly separates DESIGN.md system tokens from brand-spec.md identity assets, and requires the canonical GrifonMark lockup for Grifon ad creatives. It keeps the approved website address separate from the wordmark.

The candidate includes three dry-run evaluation tasks and ten trigger queries. Written behavioral outputs and their limits are recorded in [evaluation/eval-status.md](evaluation/eval-status.md), including the brand correction; test inputs alone do not establish behavior. Fresh-context automatic-trigger testing remains pending until the approved skill is installed. A test that explicitly loads this candidate cannot establish automatic triggering.

Installed links/frontmatter pass `check:codex` (32 entrypoints, zero errors).
The patch is retained for provenance, not for reapplication to this checkout.
Any future instruction-content revision needs its own applicable approval.

Demo/source/verification evidence belongs in `workflows/assets/grifon-motion-director-demo/README.md`. Skill acceptance requires the Grifon and client cases to preserve their own brands and exact copy, the two wrong-skill requests to route correctly, and all no-paid constraints to hold. Demo playback and user creative approval are separate from skill-format validation.
