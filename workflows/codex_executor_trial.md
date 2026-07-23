# Codex-Executor (GPT 5.6 Sol lane) — Trial Gate

**Status: OPEN — 3 of 3–5 trial tasks logged (minimum bar reached; ADOPT/DROP decision is Neil's — see Decision section). The Sol lane is NOT the default executor until this gate closes with an ADOPT decision.**

## Why this gate exists

The Sol lane (`.claude/skills/codex-executor/`) was added 2026-07-10 off the back of a **single-source** benchmark brief (GPT 5.6 Sol vs Fable 5, n≈3 agentic builds) — below the repo's ≥3-corroboration bar (same standard as the Swipe File / Ad Performance Ledger). So it ships as a gated trial: run 3–5 real mechanical briefs through it, review each diff in the main loop as usual, log findings here, then decide.

The brief's claimed failure modes to watch for specifically: **broken/unwired UI components, dead event handlers, visually bare output, skipped styling** — the reasons the lane is restricted to mechanical, spec-tight briefs in the first place.

## Adopt / drop criteria

**ADOPT** (Sol becomes the default lane for mechanical briefs) if, across ≥3 logged tasks:
- No review finding a typical `code-executor` run would not also have produced (judged by the main-loop reviewer per task), AND
- Build + tests green on first or second attempt each time, AND
- No TUNED-file guardrail trips that indicate Codex ignoring the in-prompt rules.

**DROP** (delete the skill, revert the CLAUDE.md routing rule) if:
- ≥2 tasks ship a broken-behavior finding (dead handler, unwired UI, unmet acceptance criterion) that survives `--self-review`, OR
- The review burden on the main loop visibly exceeds what the quota separation saves.

Either way: record the decision + date below, update the CLAUDE.md model-allocation bullet, and close this gate.

## Trial log

| # | Date | Brief (path/slug) | Diff size (files/±lines) | Wall-clock | Self-review used? | Build/tests | Main-loop review findings | Verdict vs code-executor baseline |
|---|------|-------------------|--------------------------|-----------|-------------------|-------------|---------------------------|-----------------------------------|
| 1 | 2026-07-11 | `.tmp/brief-p1-close-out-batch.md` (P1 close-out 4-fix batch: start-over at storyboard gate, RAW preset, VO-tail check, presenter derive) | 14 files + 1 new test, ~+100/−17 | ~9 min | Yes — its self-review caught + fixed a real extra bug (failed preset apply left stale presetId/no error; now rolls back + surfaces inline error) | Green first attempt (build ✓, 690 tests ✓, bundle-leak ✓). Local vitest EPERM'd in Codex's sandbox; the wrapper's own verify pass covered it | (1) Fix 3 shipped as a pin-test only — Codex found `chooseTrim` already trims the VO tail and added a regression test, but finding #12's real renders showed the tail persisting → needs real-render verification, escalate to push-in if it recurs. (2) `resolvePersonStatePresenter` wired into the producer path only; the one-shot steps path doesn't call it — follow-up. (3) Went slightly beyond acceptance: RAW is now the DEFAULT first cut (`fresh.presetId='none'`) — matches Neil's recalled design (finding #11) but is a behavior change to confirm. No dead handlers, no unwired UI, DESIGN tokens respected, guarded files untouched | On par or better — honest skip-reporting, useful self-review catch, zero Claude quota |
| 2 | 2026-07-13 | `.tmp/brief-overlay-styles-engine.md` (punch/bars/spotlight caption presets — engine half, additive registry + 2 new anim branches) | 8 files, +1519/−248 (snapshot-dominated; code ~±130) | ~15 min | Yes (`--self-review`) | Green first attempt (wrapper build ✓ + tests ✓; main-loop re-run: build ✓, 696 tests ✓, 0 fail) | ZERO blocking findings. Additive discipline held exactly (PresetId/ChunkAnim unions + 3 spread-from-IMPACT consts; existing consts/ROTATION untouched — byte-invariance vs HEAD snapshots verified manually). Smart reuse: punch = styling-only on the existing word-pop branch; bars reuses `WordTiming` as per-line timing. Tests pin every specced behavior (0.18s stagger, alternation, invert pulse, VO gating). Notes, non-blocking: (1) bars branch hardcodes black/white in the filter, bypassing preset fillColor/boxAlpha — fine, spec is fixed monochrome; (2) hook titles inherit IMPACT's gold highlight — caption doctrine only, flagged for Neil's first-render eyeball; (3) review-burden note: giant mid-file snapshot insertions made git diff LOOK like existing snapshots changed — needed a manual strip-and-compare to prove invariance | On par or better — followed a TUNED-adjacent additive brief to the letter, left diff uncommitted as instructed |
| 3 | 2026-07-23 | `.tmp/brief-ssrf-media-guard.md` (SSRF guard on server-side media fetches — audit guard #1: new `assertSafeMediaUrl` helper + 3 call sites + zod https tightening) | 5 files (2 new), +144/−3 | ~15 min (backgrounded past 600s; incl. self-review + full vitest) | Yes (`--self-review`) | Green first attempt (wrapper build ✓ + full suite 805 passed/22 skipped ✓; main-loop re-verify: build ✓, moved test 15/15 ✓). Vite EPERM'd again in Codex's sandbox — wrapper's own verify pass covered it | ZERO blocking findings. Guard logic correct (https-only; blocks IPv4 private/loopback/link-local incl. metadata IP + IPv6 `::1`/`fe80::/10`/`fc00::/7` + `localhost`/`.internal`/`.local`/`metadata.google.internal`; optional `MEDIA_HOST_ALLOWLIST`). Imports use `.js` ESM ext; omni correctly left the upstream `interactions` POST alone; schemas tightened at the edge. Non-blocking: (1) test placed at `tests/` root not `tests/unit/` — MY brief's path was wrong, not Sol's error; I relocated + fixed import depth, re-ran 15/15. (2) Documented residuals: literal-hostname check doesn't stop DNS-rebinding or integer/octal IP-literal encodings — both closed once `MEDIA_HOST_ALLOWLIST` is set in prod (recommended follow-up). (3) One phantom out-of-scope file (`drawPlan` snapshot) showed as modified but was a pure LF→CRLF touch, zero content diff — reverted. No dead handlers, no unwired anything, TUNED files untouched | On par or better — correct security-sensitive diff first attempt, honest sandbox-EPERM reporting, zero Claude quota |

**Non-executor use (does not consume a trial slot):** 2026-07-16 — read-only strategy brainstorm (`codex exec --sandbox read-only`, brief `.tmp/brainstorm-landing-last-dance.md`) for the landing "last dance" upgrade, per Neil's explicit "collab Fable and GPT 5.6" ask. Sol returned a ranked ship list (~5.8k tokens, <2 min); its re-ranking + ticker cut were adopted into `workflows/landing_last_dance_2026-07-16.md`. No diff produced; build routed to `code-executor` (UI-heavy lane).

## Decision

_(pending — fill after ≥3 logged tasks)_

**When closing this gate, also action the parked `openai/codex-plugin-cc` decision** (see agent_lessons.md 2026-07-20, HOLD entry): ADOPT → open a second gated trial (plugin as transport under `execute.mjs` + `/codex:adversarial-review` as advisory-only cross-model lens on Claude-built diffs, pending Neil's doctrine-carve-out sign-off; Stop-hook gate and `/codex:transfer` stay rejected). DROP → plugin is moot, never revisit.
