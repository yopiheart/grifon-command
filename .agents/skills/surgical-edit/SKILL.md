---
name: surgical-edit
description: Touch only what the task requires. Use before any edit operation — especially in services/geminiService.ts, api/_lib/, or anything tagged "tuned" in AGENTS.md.
---

For Codex tool execution, read [the desktop adapter](../_shared/codex-runtime.md) before following the workflow below.

Match the scope of your edit to the scope of the request. Three lines fixed is better than thirty lines refactored when the user asked for a bug fix.

## Hard rules for this repo

1. **Never edit prompt content, system instructions, response schemas, or model IDs in `services/geminiService.ts`** without explicit user approval. Transport, types, error wrapping, and structural refactors are fine. Prompts are tuned.

2. **Never widen the blast radius of a bug fix.** If the user asked you to fix one broken button, do not also "clean up" the surrounding component, rename variables, or extract helpers. Open a follow-up if you spot something — don't bundle it.

3. **Never delete pre-existing code that wasn't yours.** If it looks dead, ask. There may be a reason it's there (in-progress work, intentional escape hatch, etc.).

4. **Never add backwards-compatibility shims, feature flags, or "just in case" abstractions** unless the user asked for them. Three repeated lines is fine; a premature abstraction is not.

5. **Never bypass safety gates** (`--no-verify`, `// @ts-ignore`, skipped tests) unless the user explicitly approves it. If a hook fails, investigate the root cause.

## Before any edit

- Read enough of the file to understand the surrounding context
- Confirm the edit is the minimum required to complete the task
- If a fix grows, re-check it against the requested outcome. Continue with changes necessary to complete the authorized scope; ask only when the proposed change expands that scope or crosses an approval boundary in AGENTS.md. Line count alone is not an approval trigger.
