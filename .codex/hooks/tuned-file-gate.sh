#!/usr/bin/env bash
# PreToolUse hook — turn the TUNED-file rule from prose into a gate.
#
# WHY THIS EXISTS
# CLAUDE.md has said since the beginning: "Prompts, system instructions, response
# schemas, and model IDs are tuned — do not edit their content without explicit
# approval." agent_lessons.md 2026-05-09 logged what happens when that is ignored.
# Until now it was enforced ONLY by prose in CLAUDE.md and by the surgical-edit
# skill, i.e. by asking the agent nicely not to. Six hooks guarded money, builds,
# lockfiles and language; ZERO guarded the two files the whole product's output
# quality actually rests on.
#
# The Tier 4 meta-rule in workflows/loops.md says a lesson that lands twice gets
# promoted from prose to a verifier. This is that promotion.
#
# WHAT IT GUARDS
#   services/geminiService.ts   (3.1k lines, 15 systemInstruction/responseSchema sites)
#   api/_lib/prompts.ts         (1.8k lines, the crown-jewel prompt bank)
#
# ASK, NOT DENY — deliberately.
# The rule is "not without explicit approval", not "never". CLAUDE.md explicitly
# carves out transport, types, error wrapping and structural refactors as fair
# game, and both files are MIXED: prompts.ts holds zod schemas, parsers and
# cleanJson() right beside MARKETMIND_SYSTEM_INSTRUCTION. A blanket deny would
# block legitimate refactors and could not be overridden even when Neil says yes.
# `ask` IS the approval step the rule asks for, so the gate stops exactly at the
# door and hands the decision to Neil. Money gates deny (ad-spend, veo); a prompt
# edit is reversible with git, so it prompts.
#
# Side effect worth knowing: an unattended /goal that drifts into a tuned prompt
# will stall here instead of quietly rewriting it. That is the point — CLAUDE.md
# forbids /goal conditions from targeting tuned content, and this is what makes
# that enforceable rather than aspirational.
#
# TIERING — every edit to these two files asks. The TIER SETS THE MESSAGE, not
# the decision, and that is a correction from the first draft.
#   HOT   the payload carries a tuned signal: a template literal, systemInstruction,
#         responseSchema / responseMimeType, a model ID, SAFETY_SETTINGS, or a
#         generation-config knob (temperature / topP / topK / thinkingBudget).
#         Also every Write — a full overwrite of a 3k-line tuned file is never
#         "structural".
#   WARM  any other edit to these files. Still asks, quieter message.
#
# The first draft PASSED the warm tier on the theory that the build-gate and CI
# already cover pure refactors. The test harness killed it: a surgical edit to a
# SENTENCE INSIDE a prompt — `old_string: "You are a director."` — carries no
# backtick, no identifier, no model ID, and sailed straight through. That is not
# an edge case, it is the single most likely shape of a real prompt edit, because
# surgical-edit tells the agent to target the smallest span. Signal detection
# cannot separate a sentence in a prompt from a sentence in a comment without
# reading the file, so the decision stops being signal-dependent. These two files
# are special by name; the cost is a prompt on the rare structural refactor.
#
# No jq — Git Bash on the cafe PCs may not have it. grep over raw stdin, same as
# taglish-guard.sh and ad-spend-gate.sh.

set -uo pipefail

input="$(cat 2>/dev/null || true)"
[ -z "$input" ] && exit 0

tool="$(printf '%s' "$input" \
  | grep -oE '"tool_name"[[:space:]]*:[[:space:]]*"[^"]*"' \
  | head -1 | sed 's/.*"\([^"]*\)"$/\1/')"

case "$tool" in
  Edit|Write|NotebookEdit) ;;
  *) exit 0 ;;
esac

file_path="$(printf '%s' "$input" \
  | grep -oE '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' \
  | head -1 | sed 's/.*"\([^"]*\)"$/\1/')"
[ -z "$file_path" ] && exit 0

# Both path separators — the payload carries Windows paths on the cafe PCs and
# POSIX paths from Bash-side tooling.
case "$file_path" in
  *services/geminiService.ts|*services\\\\geminiService.ts|*services\\geminiService.ts) ;;
  *api/_lib/prompts.ts|*api\\\\_lib\\\\prompts.ts|*api\\_lib\\prompts.ts) ;;
  *) exit 0 ;;
esac

ask() {
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":%s}}\n' "$1"
  exit 0
}

HOT_MSG='"TUNED-FILE GATE (hot): this edit carries a tuned signal in services/geminiService.ts or api/_lib/prompts.ts — prompt text, a system instruction, a response schema, a model ID, or a generation-config knob. CLAUDE.md: do not edit their content without explicit approval, and agent_lessons.md 2026-05-09 is the entry that cost. Neil decides this one, not you. Before he does, state plainly in your message: (1) the exact rule or line you are changing and its current wording, (2) why the task genuinely requires a tuned change rather than a transport/type/error-wrapping change, (3) what output you expect to move, and (4) how you will verify it (gemini-eval verdict, regression suite). If you can finish the task WITHOUT touching tuned content, withdraw this edit and do that instead."'

WARM_MSG='"TUNED-FILE GATE: an edit to a tuned file (services/geminiService.ts or api/_lib/prompts.ts). No tuned signal was detected in the payload, so this looks structural — but detection cannot see a sentence edited INSIDE a prompt literal, which is why every edit here asks. Confirm in your message which it is: transport, types, error wrapping or a refactor (explicitly allowed by CLAUDE.md), or prompt/schema/model content (needs Neil, and the hot-tier questions apply). Name the function or export you are touching so Neil can place it without opening a 3k-line file."'

# A full-file Write is never a structural refactor of a 3k-line tuned file.
[ "$tool" = "Write" ] && ask "$HOT_MSG"

# Tuned signals anywhere in the payload (old_string or new_string).
#   `                    every prompt body in both files is a template literal
#   systemInstruction    the tuned steering
#   responseSchema/Mime  the tuned output contract
#   gemini-/imagen-/veo- model IDs, plus the MODEL_* consts in prompts.ts
#   SAFETY_SETTINGS      tuned safety config
#   temperature/topP/... tuned generation config
#   *_PROMPT/*_INSTRUCTION  the prompt-bank identifiers
if printf '%s' "$input" | grep -qE '\\u0060|`|systemInstruction|responseSchema|responseMimeType|gemini-[0-9]|imagen-[0-9]|veo-[0-9]|MODEL_(TEXT|FAST|RESEARCH)|SAFETY_SETTINGS|"?(temperature|topP|topK|thinkingBudget)"?[[:space:]]*:|[A-Z_]+_(PROMPT|INSTRUCTION|RULES|PROTOCOL)'; then
  ask "$HOT_MSG"
fi

ask "$WARM_MSG"
