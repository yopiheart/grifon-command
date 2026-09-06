#!/usr/bin/env bash
# Noninteractive bootstrap for a checked-out Codex Cloud task. Use the same
# runtime + npm-ci sequence for initial Setup and cache-resume Maintenance.
# Secret values are supplied by the cloud environment; this script never reads
# or prints .env files.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

target_node_version=v24.15.0
required_node_major=24
required_npm_major=11
target_npm_version=11.4.2

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "ERROR: $NVM_DIR/nvm.sh is missing; this script requires the universal image's nvm installation." >&2
  exit 1
fi

# shellcheck source=/dev/null
. "$NVM_DIR/nvm.sh"
if [ "$(nvm version "$target_node_version")" = "N/A" ]; then
  nvm install "$target_node_version"
fi
nvm alias default "$target_node_version"
nvm use "$target_node_version"

# A cached setup can start later agent commands with the UI-selected Node 20
# already in PATH. The nvm default alone does not replace an inherited PATH, so
# make login shells explicitly select the pinned default after ~/.profile loads.
profile="$HOME/.profile"
marker="# GRIFON_CODEX_NODE_BEGIN"
if ! grep -Fq "$marker" "$profile" 2>/dev/null; then
  cat >> "$profile" <<'EOF'

# GRIFON_CODEX_NODE_BEGIN
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
  nvm use --silent v24.15.0 >/dev/null
fi
# GRIFON_CODEX_NODE_END
EOF
fi

node_version="$(node --version)"
npm_version="$(npm --version)"
node_major="${node_version#v}"; node_major="${node_major%%.*}"
npm_major="${npm_version%%.*}"

printf 'Node.js %s\n' "$node_version"
printf 'npm %s\n' "$npm_version"

if [ "$node_major" -ne "$required_node_major" ]; then
  echo "ERROR: Node 24 is required; active version is $node_version after nvm setup." >&2
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
