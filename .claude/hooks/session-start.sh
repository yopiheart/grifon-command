#!/usr/bin/env bash
# SessionStart re-arm hook (see workflows/loops.md, Tier 2).
#
# The cafe-PC defreezer wipes Claude session state — /loop jobs, active /goal,
# all of ~/.claude/ — on every reboot; only the repo survives. CLAUDE.md asks
# the agent to "offer to re-arm at session start", but a memory-dependent
# instruction is exactly what a fresh session forgets. This hook makes the
# re-arm prompt deterministic: it fires on every session start (including
# /clear, which also kills loops and goals) and its stdout lands in context.

set -uo pipefail

echo "SESSION RE-ARM CHECKLIST (session state does not survive reboots or /clear — see workflows/session_reminders.md):"

# Surface every /loop re-arm command documented in session_reminders.md, so
# that doc stays the single source of truth for what needs re-arming.
grep -h '^/loop' workflows/session_reminders.md 2>/dev/null | sed 's/^/  - Offer to re-arm: /'

echo "  - An active /goal from a previous session did NOT survive — check workflows/launch_readiness.md for where work stopped before starting fresh."
echo "  - Loop registry (every loop, its arm command, verifier, kill switch): workflows/loops.md"

# --- BRANCH AWARENESS (added 2026-06-27, Neil-approved) ------------------------
# The defreezer wipes LOCAL branches; only the repo + origin/* refs survive. A
# fresh session that inspects only `main` + a planning doc will wrongly conclude a
# feature is "not built" when it is actually DONE on an unmerged remote branch.
# This bit us 3x on Expert Mode / Director's Cut (see agent_lessons 2026-06-27).
# Surface every origin/* branch ahead of main so work-in-flight is visible BEFORE
# anyone concludes "not started". Cached refs only (no fetch) — fast + offline-safe;
# a branch pushed from this clone already has its origin/* ref locally.
echo ""
echo "UNMERGED WORK IN FLIGHT (remote branches ahead of main, newest first — a feature can be fully BUILT on one of these even when main + its planning doc say 'not started'; CHECK HERE before concluding any feature is unbuilt):"
flight=0; shown=0
while IFS='|' read -r ref cdate; do
  [ -z "$ref" ] && continue
  case "$ref" in origin/HEAD|origin/main) continue ;; esac
  ahead=$(git rev-list --count "origin/main..$ref" 2>/dev/null || echo 0)
  [ "${ahead:-0}" -gt 0 ] || continue
  flight=1
  if [ "$shown" -lt 12 ]; then
    subj=$(git log -1 --format='%s' "$ref" 2>/dev/null)
    echo "  - ${ref}  (+${ahead}, ${cdate}) — ${subj}"
    shown=$((shown + 1))
  fi
done < <(git for-each-ref --sort=-committerdate --format='%(refname:short)|%(committerdate:short)' refs/remotes/origin 2>/dev/null)
if [ "$flight" -eq 0 ]; then echo "  - (none — every remote branch is merged into main)"; fi

exit 0
