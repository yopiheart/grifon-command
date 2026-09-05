#!/usr/bin/env bash
# Noninteractive bootstrap for an existing Codex Cloud checkout. Run this as
# the environment's Setup script, not later from the agent prompt: agent-phase
# network access may be restricted even when setup-phase package installs work.
# Secret values are supplied by the cloud environment; this script never reads
# or prints .env files.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

required_node_major=24
required_npm_major=11
target_npm_version=11.4.2

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js is missing. Configure Node 24 in the Codex Cloud environment." >&2
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm is missing. Configure npm 11 in the Codex Cloud environment." >&2
  exit 1
fi

node_version="$(node --version)"
npm_version="$(npm --version)"
node_major="${node_version#v}"; node_major="${node_major%%.*}"
npm_major="${npm_version%%.*}"

printf 'Node.js %s\n' "$node_version"
printf 'npm %s\n' "$npm_version"

if [ "$node_major" -ne "$required_node_major" ]; then
  echo "ERROR: Node 24 is required; active version is $node_version." >&2
  exit 1
fi
if [ "$npm_major" -ne "$required_npm_major" ]; then
  echo "Installing npm $target_npm_version for the active Node 24 toolchain..."
  npm install --global "npm@$target_npm_version"
  npm_version="$(npm --version)"
  npm_major="${npm_version%%.*}"
  printf 'npm %s\n' "$npm_version"
fi
if [ "$npm_major" -ne "$required_npm_major" ]; then
  echo "ERROR: npm 11 is required; active version is $npm_version after setup." >&2
  exit 1
fi

echo "Installing locked root dependencies with npm ci..."
npm ci

echo "Codex Cloud setup complete. Paid/live tests were not run."
