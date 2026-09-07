#!/usr/bin/env bash
# Build-gate Stop hook (the real one — see CLAUDE.md "Goal-driven execution").
#
# Fires at turn-end ONLY when this turn edited api/, services/, components/, or
# App.tsx — the PostToolUse Write|Edit hook drops the .tmp/.edits-this-turn marker
# for exactly those paths. When the marker is present we run the production build
# and BLOCK the turn from ending until tsc + vite pass. A clean build clears the
# marker so the gate doesn't re-run on an already-verified turn.
#
# Build-only by deliberate choice: tsc/vite exit codes are deterministic and can't
# false-fail on an unrelated or in-progress test. Tests + smoke stay in the
# verify-changes skill and /goal conditions, where a red test mid-TDD is expected.
#
# Claude Code overrides a Stop hook after 8 consecutive blocks, so a genuinely
# stuck build can't trap the session forever.

set -uo pipefail

[ -f .tmp/.edits-this-turn ] || exit 0

if npm run build >.tmp/build-gate.log 2>&1; then
  rm -f .tmp/.edits-this-turn
  # Emit a visible PASS so /goal conditions (and Neil) can confirm the gate ran clean.
  printf '{"systemMessage":"Build-gate PASSED: `npm run build` clean after edits to api/services/components/App.tsx."}\n'
  exit 0
fi

printf '{"decision":"block","reason":"Build-gate FAILED: `npm run build` (tsc + vite) did not pass after edits to api/services/components/App.tsx. Read .tmp/build-gate.log for the exact errors and fix the root cause — do NOT suppress with // @ts-ignore or skip without explicit approval (per the surgical-edit / verify-changes rules). The gate re-runs automatically on the next stop."}\n'
exit 0
