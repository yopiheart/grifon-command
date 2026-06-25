# One-Shot Flow Fixes — minimize re-entry + stop dumping users into the dev 8-step wizard

**Owner:** Neil. **Status:** Spec'd, not started. **Created:** 2026-06-25.
**Build branch:** fresh off `main` (e.g. `feat/oneshot-flow-fixes`) — NOT the expert-mode/Bucket B branch.

## Problem (found live, 2026-06-25)

Driving a One-Shot RealEstate render, three flow defects stranded the user:

1. **"Minimize" abandons the run with no way back.** Minimizing during generation exits to the
   dashboard and the user cannot return to the in-flight generation — accidental back/minimize/close
   loses the screen permanently.
2. **No resume affordance after a mid-run minimize.** The resume pill never appears in this case.
3. **One-Shot completion dumps the user into the 8-step wizard (Step 8).** That 8-step chrome is the
   DEV/admin advanced surface — normal One-Shot users should never see it.

## Root causes (file:line)

1. **Minimize == exit.** [components/OneShotAd/RunningScreen.tsx:66](../components/OneShotAd/RunningScreen.tsx#L66)
   "Minimize" calls `onMinimize`, which App wires to `onBack` → `setActiveModule(null)`
   ([App.tsx:1439](../App.tsx#L1439)). So Minimize unmounts the One-Shot screen entirely. The generation
   keeps running because `useOneShotGeneration.run()` writes through App-level `sinks`, but there is no
   minimized-job chip and no re-entry path. ("Minimize" is a misnomer — it's "Exit & abandon view".)
2. **Resume pill conditions don't cover mid-run.** Two separate resume mechanisms, neither fires here:
   - One-Shot draft resume ([components/OneShotAd/index.tsx:63-72](../components/OneShotAd/index.tsx#L63))
     only triggers on a COLD start (browser closed) with a saved draft.
   - Wizard resume pill (`showResumePill`, [App.tsx:1398](../App.tsx#L1398)) needs a completed Step-8
     session AND a pristine Step-1 wizard. A mid-run minimize satisfies neither.
3. **onReview routes into the dev wizard.** [App.tsx:1446](../App.tsx#L1446)
   `onReview={() => { setDirectorMode('steps'); setCurrentStep(8); }}` lands the finished One-Shot ad on
   the 8-step wizard's Step 8 — the dev/admin surface — instead of a consumer One-Shot result screen.

## Existing infra to reuse (don't rebuild)

- **Active-job tracking:** `services/activeJobStore.ts` + `services/activeJobsService.ts` +
  `ui/ActiveJobsPanel.tsx` already model async render-jobs with a return-to-job panel. The minimize fix
  should register the running One-Shot generation as an active job and surface the panel chip as the
  re-entry — rather than inventing new state.
- **Wizard session persistence:** `services/wizardSessionStore.ts` (IndexedDB, keyed by uid) already
  persists the full storyboard at Step 8 — reuse for resume, don't add a parallel store.

## Fix plan (slice it; presentational + routing — NO tuned prompts)

1. **Real minimize, not exit.** Make the generation lifecycle survive an unmount: lift/keep the
   `useOneShotGeneration` run at App level (or register it in `activeJobStore`) so Minimize collapses to
   a persistent "▸ generating your ad — tap to return" chip (via `ActiveJobsPanel`) that re-opens the
   running screen. Accidental back/close should always be recoverable.
2. **Guarantee a re-entry even without the chip.** Ensure a resume affordance covers the mid-run case
   (in-flight or just-completed) so a user who navigates away can always get back — close the gap
   between the two existing resume mechanisms.
3. **One-Shot lands on a One-Shot result screen, not the 8-step wizard.** Replace the
   `setCurrentStep(8)` hand-off with a consumer-facing One-Shot review surface (scenes + thumbnail +
   the video hand-off), OR gate the 8-step chrome so non-dev users get a simplified review. **Design
   decision — needs Neil (see Open Questions).**

## Open questions (lock via /grill-me before building)

- **Q1.** Where should a finished One-Shot ad land? A purpose-built One-Shot review view, or a
  dev-gated simplification of the existing Step-8 review? (Drives the size of fix #3.)
- **Q2.** Should the 8-step wizard be fully hidden from non-dev users everywhere, or just not be the
  One-Shot landing? (Confirms whether `directorMode==='steps'` needs a dev gate at the route level.)
- **Q3.** Minimize semantics: one active generation at a time (resume the single in-flight run), or
  support multiple queued One-Shot jobs in the `ActiveJobsPanel`?
- **Q4.** On generation error after minimize — where does the error surface (chip badge? toast?).

## Constraints

- **Presentational + routing/state only.** Do NOT touch tuned prompts (`geminiService.ts`,
  `api/_lib/prompts.ts`) or the render engine. Follow `.claude/skills/surgical-edit/`.
- Reuse `activeJobStore`/`ActiveJobsPanel` + `wizardSessionStore` — no new state containers, no
  Context/Redux (per `components/CLAUDE.md`).
- `brand-check` each touched screen; `verify-changes` (build + smoke) before done.
- Fresh branch off `main`; after the plan is approved, propose a `/goal` per CLAUDE.md (cite the
  build-gate Stop hook + `brand-check`).

## Kickoff message (paste next session)

> Build the One-Shot flow fixes per `workflows/oneshot_flow_fixes.md`. Fresh branch off `main`. Run
> `/grill-me` to lock Q1–Q4 (esp. where a finished One-Shot ad should land) BEFORE coding, then propose
> a `/goal`. Reuse `activeJobStore`/`ActiveJobsPanel` + `wizardSessionStore` — don't rebuild. Slice:
> (1) real minimize via active-job + return chip, (2) guaranteed re-entry/resume, (3) One-Shot-native
> result screen instead of the dev 8-step wizard. Presentational/routing only — no tuned prompts.
> `brand-check` + `verify-changes` per slice.
