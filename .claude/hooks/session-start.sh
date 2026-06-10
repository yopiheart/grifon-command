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
