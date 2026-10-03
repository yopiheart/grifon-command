<!-- Keep this proportional to the change. Replace prompts with evidence; remove
     irrelevant bullets. A small docs fix can be three short paragraphs.
     Guidance: ../workflows/pr_review_loop.md#pr-handoff -->

## Change

<!-- What problem does this solve? Describe the observable before -> after.
     Add a small diagram only when it makes the change easier to understand. -->

## Proof

<!-- Name the tested revision (and uncommitted changes, if any).
     List relevant commands/results and link CI, screenshots or traces.
     Separate PASS, FAIL and NOT RUN. Label fixture-backed vs live evidence.
     For a defect-specific regression, include its failure on the original bug.
     Record independent review: reviewed revision, result, unresolved findings.
     State material limits. Local-only evidence is not a shared artifact. -->

## Risk and decision

<!-- What could break, and who or what is affected?
     How can it be rolled back? Name effects a revert cannot undo (charges,
     messages, data loss/migration). Small diff does not mean small risk.
     State blockers and the next decision. Green CI does not authorize merge.
     If a recurring finding produced a prevention change, link it and its proof;
     otherwise omit a learning section. -->
