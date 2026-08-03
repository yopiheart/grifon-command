#!/usr/bin/env bash
# PreToolUse hook — turn "never spend Neil's money autonomously" from prose into a gate.
#
# Why this exists: .claude/skills/grifon-ad-strategist/SKILL.md:14 calls that rule "the
# single hard rule", but until 2026-08-02 it was enforced ONLY by prose in a skill file,
# while .claude/settings.json auto-approved ads_create_campaign / ads_create_ad_set /
# ads_create_ad / ads_create_creative with no prompt. Those four calls are the complete
# chain to a live, spending campaign: create it ACTIVE with a daily budget on the ad set
# and money moves with zero human input. agent_lessons.md says prefer a verifier over
# prose; this is the verifier. (Found by evaluating block/buzz's approval-gate primitive
# against our setup — the platform was the wrong fit, the idea wasn't.)
#
# Covers BOTH spend paths, because the MCP tools are not the only one: the strategist
# skill also drives the `meta-ads` CLI over Bash, which an MCP-only hook would not see.
#
# Three tiers:
#   PASS  reads (insights, previews, library search, get_*) — free, never gated.
#   ASK   staging writes (create paused entities, uploads, audiences, catalog, pixel) —
#         real mutations of a real ad account, so Neil sees them, but they don't spend.
#   DENY  spend switches (activate / update entity / boost) and ANY staging write whose
#         payload carries a live signal (status ACTIVE, daily_budget, lifetime_budget,
#         bid_amount). These are the money moves — the skill's answer is always "draft
#         the command, Neil fires it", so the hook says the same thing.
#
# No jq dependency (Git Bash on the cafe PCs may not have it) — grep over the raw stdin
# payload, same approach as taglish-guard.sh. Fails CLOSED for spend switches: if the
# payload can't be parsed, an unrecognised Meta Ads write is treated as ASK, never as a
# silent allow.

set -uo pipefail

# --- MANUAL SUSPENSION SWITCH (idinagdag 2026-08-03) --------------------------------
# Isang beses hiningi ni Neil na alisin ang gate para sa isang gabi ("Edi tanggalin mo
# ung rules na un tonight. Binibigyan kita ng basbas"). Ang pagbura sa hook ay ang
# maling paraan: nawawala ang record, at walang nagsasabi kung kailan sya babalik.
#
# Kaya ito ang paraan: isang sentinel file. Habang nandyan sya, tulog ang gate.
#
#   Suspindihin :  touch .claude/.ad-spend-gate-suspended
#   Ibalik      :  rm    .claude/.ad-spend-gate-suspended
#
# 🟢 KUSANG BUMABALIK ANG GATE. Hindi naka-commit ang sentinel at nasa loob sya ng
# C:\Users\Administrator\, kaya kinakain sya ng defreezer sa unang reboot. Ang
# pinakamasamang mangyayari ay tulog ang gate hanggang mag-reboot — hindi habambuhay.
# Sinadya to: ang suspensyon na kailangang tandaan mong bawiin ay suspensyong
# nakakalimutan.
GATE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$GATE_DIR/.ad-spend-gate-suspended" ]; then
  exit 0
fi

input="$(cat 2>/dev/null || true)"
[ -z "$input" ] && exit 0

tool="$(printf '%s' "$input" \
  | grep -oE '"tool_name"[[:space:]]*:[[:space:]]*"[^"]*"' \
  | head -1 | sed 's/.*"\([^"]*\)"$/\1/')"
[ -z "$tool" ] && exit 0

# --- emit helpers -----------------------------------------------------------------
deny() {
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":%s}}\n' "$1"
  exit 0
}
ask() {
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":%s}}\n' "$1"
  exit 0
}

DENY_MSG='"AD-SPEND GATE: blocked. This call turns real money on (or stages an entity already set to spend). The grifon-ad-strategist hard rule is absolute: you never spend Neil'"'"'s money autonomously — you DRAFT the command and Neil fires it. Do that instead: print the exact tool call or meta-ads CLI command, with every parameter filled in (objective, budget, audience, placements, creative IDs) plus the expected daily spend, and hand it to Neil. Do not retry this call, and do not route around it by creating the entity paused and activating it in a second step — the gate covers that path too."'

ASK_MSG='"AD-SPEND GATE: this mutates Neil'"'"'s real ad account (staging-only — no live budget detected). Allowed to proceed with Neil'"'"'s explicit approval. Before he decides, state plainly in your message: what entity gets created or changed, in which ad account, and whether anything downstream would start spending."'

# --- Bash path: the `meta-ads` CLI ------------------------------------------------
# Only fires on a real meta-ads invocation, so ordinary Bash is untouched.
if [ "$tool" = "Bash" ]; then
  printf '%s' "$input" | grep -qE '(^|[^a-zA-Z0-9_-])meta-ads([^a-zA-Z0-9_-]|$)' || exit 0

  # Spend switches on the CLI surface.
  if printf '%s' "$input" | grep -qiE '(^|[^a-z])(activate|resume|unpause|launch|scale|boost)([^a-z]|$)|--status[= ]+["'"'"']?ACTIVE|set-status[= ]+["'"'"']?ACTIVE'; then
    deny "$DENY_MSG"
  fi
  # Any other meta-ads write verb.
  if printf '%s' "$input" | grep -qiE '(^|[^a-z])(create|update|edit|delete|remove|pause|archive|upload|duplicate|copy|set)([^a-z]|$)'; then
    ask "$ASK_MSG"
  fi
  exit 0
fi

# --- MCP path: claude.ai Meta Ads connector ---------------------------------------
case "$tool" in
  mcp__claude_ai_Meta_Ads__*) ;;
  *) exit 0 ;;
esac

# Reads pass silently. Anything not matched here is treated as a write.
if printf '%s' "$tool" | grep -qE '__ads_get_|_get_report$|__ads_insights_|__ads_library_search$|__ads_account_get_activity_logs$|__ads_catalog_get_|__ads_catalog_search_product$|__ads_catalog_event_source_get|_read$|_list_tests$|__ads_experiment_check_eligibility$|__ads_experiment_.*_get_test$|__ads_get_field_context$|__ads_get_help_article$'; then
  exit 0
fi

# Tier DENY — the switches that start (or redirect) spend.
if printf '%s' "$tool" | grep -qE '__ads_activate_entity$|__ads_update_entity$|__ads_boost_ig_post$'; then
  deny "$DENY_MSG"
fi

# Tier DENY — a staging write carrying a live signal in its payload.
if printf '%s' "$input" | grep -qiE '"(daily_budget|lifetime_budget|bid_amount)"|"(effective_)?status"[[:space:]]*:[[:space:]]*"ACTIVE"'; then
  deny "$DENY_MSG"
fi

# Tier ASK — every remaining Meta Ads write.
ask "$ASK_MSG"
