#!/usr/bin/env bash
# PreToolUse hook — keep the live secrets out of the agent's context window.
#
# WHY THIS EXISTS
# The warden principle: an agent should never hold credentials, it should ask a
# process that holds them to act on its behalf. Grifon already implements this
# PERFECTLY for the product — the whole api/* proxy layer exists so GEMINI_API_KEY
# and ELEVEN_LABS_API_KEY never reach the browser, and check-bundle-leak.mjs fails
# CI if a prompt leaks into dist/. It was never applied to the AGENT.
#
# Until now, `.env` (live GEMINI_API_KEY, ELEVEN_LABS_API_KEY, PayMongo, and
# SUPABASE_SERVICE_ROLE_KEY — the one that bypasses RLS) was readable by any Read
# call, by every subagent, and by the codex-executor lane, which hands the brief to
# a THIRD-PARTY model on a different vendor's plan. settings.json has no deny list.
# Nothing had gone wrong; that is the point of doing it before something does.
#
# DENY, not ask — deliberately.
# There is no task that needs the secret VALUES. .env.example carries every key
# NAME, which is all that is ever needed to write code against them, and the values
# are used by processes (vite dev middleware, vercel, node) that read the file
# themselves without the agent ever seeing it. A secret that enters the context
# window is in the transcript, in any summary of it, and in whatever the subagent
# reports back — none of which can be un-read.
#
# CONSEQUENCE, stated up front: the agent can no longer edit .env either, because
# Edit/Write require a prior Read. That is correct. Neil pastes keys by hand; an
# agent-authored .env was never a good idea on a machine whose disk gets wiped.
#
# WHAT IT CANNOT DO — read this before trusting it too far.
# It gates TOOL CALLS. It cannot see inside a process those calls spawn: `npm run
# dev`, `vercel`, `node tools/*.mjs` and the codex CLI all load .env themselves,
# by design, and that is invisible here. This closes the direct-read path (the one
# that puts secrets in the transcript), not every path. Rotating a key remains the
# answer if one is ever actually exposed.
#
# No jq — grep over raw stdin, same as ad-spend-gate.sh and taglish-guard.sh.
# Fails OPEN on anything it can't parse: this must never wedge an ordinary command.

set -uo pipefail

input="$(cat 2>/dev/null || true)"
[ -z "$input" ] && exit 0

tool="$(printf '%s' "$input" \
  | grep -oE '"tool_name"[[:space:]]*:[[:space:]]*"[^"]*"' \
  | head -1 | sed 's/.*"\([^"]*\)"$/\1/')"
[ -z "$tool" ] && exit 0

deny() {
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":%s}}\n' "$1"
  exit 0
}

DENY_MSG='"ENV WARDEN: blocked. .env holds live credentials — GEMINI_API_KEY, ELEVEN_LABS_API_KEY, PayMongo, and SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS. Reading it would put those values in this transcript permanently, including in any summary or subagent report. Do not retry, and do not route around it (no cat via a subshell, no node -e reading the file, no copying it elsewhere first). Use .env.example instead: it carries every key NAME, which is all you need to write code. If a value is genuinely missing at runtime, do not go looking for it — say which key is unset and let Neil check. If you need to KNOW whether a key is set without seeing it, ask Neil, or have the code you are debugging log a boolean, never the value."'

# The .env token: matches .env, .env.local, .env.production — and deliberately
# NOT .env.example (the trailing char class excludes a following dot).
ENV_TOKEN='\.env(\.(local|production|development|test))?([^a-zA-Z0-9._-]|$)'

# --- Tool paths: Read / Edit / Write / Grep / Glob ---------------------------
case "$tool" in
  Read|Edit|Write|NotebookEdit|Grep|Glob)
    target="$(printf '%s' "$input" \
      | grep -oE '"(file_path|path|pattern|notebook_path)"[[:space:]]*:[[:space:]]*"[^"]*"' \
      | sed 's/.*"\([^"]*\)"$/\1/')"
    if printf '%s' "$target" | grep -qE "$ENV_TOKEN"; then
      deny "$DENY_MSG"
    fi
    exit 0
    ;;
esac

# --- Shell paths: Bash / PowerShell ------------------------------------------
case "$tool" in
  Bash|PowerShell) ;;
  *) exit 0 ;;
esac

# No .env reference at all — the overwhelming majority of commands. Out fast.
printf '%s' "$input" | grep -qE "$ENV_TOKEN" || exit 0

# Metadata-only inspection stays legal: existence and size tell you nothing
# secret, and `ls -la .env*` is a normal thing to want during infra work.
# So we deny only when a CONTENT-reading, copying, or exfiltrating verb is
# present alongside the .env reference.
# NOTE: `env` is deliberately NOT in this verb list. It collides with the
# filename itself — the `.` in `.env` satisfies the leading boundary, so every
# `.env` reference matched the verb `env` and even `ls -la .env*` and
# `Test-Path .env` were denied. Caught by the harness, not in production.
if printf '%s' "$input" | grep -qE '(^|[^a-zA-Z0-9_-])(cat|head|tail|more|less|type|strings|xxd|od|base64|nl|sed|awk|grep|egrep|fgrep|rg|cp|copy|mv|move|scp|rsync|tee|source|export|printenv|Get-Content|gc|Select-String|sls|Copy-Item|Move-Item|Get-Item|Import-Csv|curl|wget|Invoke-WebRequest|Invoke-RestMethod)([^a-zA-Z0-9_-]|$)'; then
  deny "$DENY_MSG"
fi

# `node -e "...readFileSync('.env')..."` and friends — an interpreter plus a
# .env reference is a read by another name.
if printf '%s' "$input" | grep -qE '(^|[^a-zA-Z0-9_-])(node|python|python3|py|perl|ruby|deno|bun)([^a-zA-Z0-9_-]|$)' \
   && printf '%s' "$input" | grep -qE 'readFile|open\(|read\(|-e |-c |--eval'; then
  deny "$DENY_MSG"
fi

exit 0
