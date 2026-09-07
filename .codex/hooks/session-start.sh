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

# --- CLOCK (added 2026-08-01) --------------------------------------------------
# The harness injects the DATE but never the time, so a session that reads commit
# timestamps will happily infer the wrong half of the day and say "tonight" at
# lunch. One `date` call removes the guess. NOTE: this cafe PC reports CST/GMT+0800
# — the same offset as Manila but not the PH zone, so trust the number, not the label.
echo "LOCAL CLOCK: $(date '+%A, %Y-%m-%d %H:%M %Z') — say the time of day from THIS, never inferred from commit timestamps."
echo ""

echo "SESSION RE-ARM CHECKLIST (session state does not survive reboots or /clear — see workflows/session_reminders.md):"

# Surface every /loop re-arm command documented in session_reminders.md, so
# that doc stays the single source of truth for what needs re-arming.
grep -h '^/loop' workflows/session_reminders.md 2>/dev/null | sed 's/^/  - Offer to re-arm: /'

echo "  - An active /goal from a previous session did NOT survive — read NOW.md for where work stopped before starting fresh."
echo "  - Loop registry (every loop, its arm command, verifier, kill switch): workflows/loops.md"

# --- NOW.md (added 2026-08-01, Garry Tan brief fold-in #2) ---------------------
# The library was fine; retrieval was not. launch_readiness.md had become a chain
# of CURRENT/PREVIOUS blocks pointing at loop_arch_handoff.md pointing elsewhere —
# three docs deep before a session could take its first real action, with a
# "this file is two weeks stale" warning sitting above live content. NOW.md is the
# one-screen replacement. Surfaced here rather than merely referenced, because a
# pointer a fresh session must REMEMBER to follow is the same failure as the stale
# doc it replaced. Also enforces NOW.md's own freshness contract: an unmaintained
# NOW.md is more dangerous than none, so it must announce its own rot.
echo ""
# Health first: tools/resume_doc_check.mjs owns every freshness/rot/claimant rule, so the
# thresholds live in exactly ONE place. --quiet prints nothing while healthy and only speaks
# up on WARN/FAIL, so a good session start stays quiet and a rotted one is impossible to miss.
if command -v node >/dev/null 2>&1 && [ -f tools/resume_doc_check.mjs ]; then
  node tools/resume_doc_check.mjs --quiet 2>/dev/null | sed 's/^/  /'
fi
if [ -f NOW.md ]; then
  stamp=$(grep -m1 '^\*\*Stamped:' NOW.md 2>/dev/null | sed -E 's/.*Stamped:[[:space:]]*([0-9]{4}-[0-9]{2}-[0-9]{2}).*/\1/')
  echo "NOW.md — the resume doc (stamped ${stamp:-unknown}). Read it before launch_readiness.md or any handoff:"
  sed -n '/^## ▶ NEXT ACTION/,/^## /p' NOW.md 2>/dev/null | sed '$d' | sed '/^[[:space:]]*$/d' | head -14 | sed 's/^/  /'
else
  echo "NOW.md MISSING — it is the resume doc. Rebuild it from 'git log --oneline -15' + open issues before starting work."
fi

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
BRANCH_CAP=12
total=0; shown=0
while IFS='|' read -r ref cdate; do
  [ -z "$ref" ] && continue
  case "$ref" in origin/HEAD|origin/main) continue ;; esac
  ahead=$(git rev-list --count "origin/main..$ref" 2>/dev/null || echo 0)
  [ "${ahead:-0}" -gt 0 ] || continue
  total=$((total + 1))
  if [ "$shown" -lt "$BRANCH_CAP" ]; then
    subj=$(git log -1 --format='%s' "$ref" 2>/dev/null)
    echo "  - ${ref}  (+${ahead}, ${cdate}) — ${subj}"
    shown=$((shown + 1))
  fi
done < <(git for-each-ref --sort=-committerdate --format='%(refname:short)|%(committerdate:short)' refs/remotes/origin 2>/dev/null)
if [ "$total" -eq 0 ]; then echo "  - (none — every remote branch is merged into main)"; fi
# The list is capped, so it MUST say when it is hiding something. Without this the
# output reads as complete at exactly $BRANCH_CAP and a session concludes "not built"
# from a truncated list — the failure this whole block exists to prevent. Found
# 2026-08-06 by the Grifon session dashboard: 29 ahead of main, 12 printed, no signal.
if [ "$total" -gt "$shown" ]; then
  echo "  - …and $((total - shown)) MORE ahead of main, NOT listed (cap = ${BRANCH_CAP}). The list above is INCOMPLETE."
  echo "    Full list:  git branch -r --no-merged origin/main"
fi

# --- WAYFINDER FRONTIER (added 2026-07-31, grill of #79) -----------------------
# The Concierge initiative is tracked as a GitHub-Issues map (issue #87 — see
# concierge_director_plan.md "Tracking pilot"). Issues survive the defreezer
# exactly like the repo; the gh CLI does not. Same doctrine as the branch list
# above: surface the takable frontier BEFORE a session re-derives state from
# possibly-stale docs. Degrades gracefully — never blocks session start.
echo ""
echo "WAYFINDER FRONTIER (Concierge map = issue #87; open concierge:* tickets, one per session):"
GH_BIN="$(command -v gh || true)"
if [ -z "$GH_BIN" ] && [ -n "${LOCALAPPDATA:-}" ] && [ -x "$LOCALAPPDATA/Programs/GitHubCLI/bin/gh.exe" ]; then
  GH_BIN="$LOCALAPPDATA/Programs/GitHubCLI/bin/gh.exe"
fi
if [ -z "$GH_BIN" ]; then
  echo "  - gh not installed (defreezer wiped it). Re-arm with: .\\scripts\\restore-gh.ps1 — the frontier will list here once gh is back."
else
  frontier=$("$GH_BIN" issue list --state open --limit 50 --json number,title,labels \
    --jq '.[] | select(any(.labels[]; .name | startswith("concierge:"))) | "  - #\(.number) [\([.labels[].name | select(startswith("concierge:"))][0])] \(.title)"' 2>/dev/null)
  rc=$?
  if [ "$rc" -ne 0 ]; then
    echo "  - could not read Issues (gh unauthenticated or offline) — run: gh auth login, then: gh issue list --state open"
  elif [ -z "$frontier" ]; then
    echo "  - (frontier empty — no open concierge:* tickets; check map issue #87 for fog / next work)"
  else
    echo "$frontier"
  fi
fi

# --- GIT IDENTITY (added 2026-07-26) -------------------------------------------
# scripts/restore-git-identity.ps1 has existed for a while and is correct, but
# nothing ever pointed at it — so every session rediscovered the same failure the
# hard way: the first `git commit` dies with "Author identity unknown", mid-task,
# after the work is already done. The script was not the missing piece; knowing it
# exists at the right moment was. Checked here rather than reminded unconditionally,
# so it stays silent on the machines where the identity survives and only speaks up
# on the wiped ones. Detect-and-tell, not auto-fix: this writes to the machine's
# GLOBAL git config, which is the user's call, matching how every other restore-*
# script in this repo is armed.
if ! git config user.email >/dev/null 2>&1; then
  echo ""
  echo "GIT IDENTITY MISSING — the defreezer wiped it. Every commit will fail with 'Author identity unknown' until you run:"
  echo "  .\\scripts\\restore-git-identity.ps1"
fi

exit 0
