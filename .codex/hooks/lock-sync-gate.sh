#!/usr/bin/env bash
# lock-sync-gate — humaharang sa `git commit` kapag sira ang package-lock.json.
#
# BAKIT SYA UMIIRAL
# Tatlong beses nang nangyari (b95fddb/8d2d524 flip-flop 2026-07-27; a21c31b
# 2026-08-02): ang lokal na npm (node 24 / npm 11) ay tahimik na nagtatanggal ng
# nested @types/react optional-peer entry sa tuwing tumatakbo ang `npm install`,
# tapos nakikisakay ang lock diff sa commit na walang kinalaman. Ang CI (node 20
# / npm 10) ay namamatay sa `npm ci` sa BAWAT push pagkatapos — CI, Nightly
# Regression, at Oceanides daily posts sabay-sabay, isang araw ng pulang email
# bago napansin (Neil, 2026-08-03: "Lagi nalang to nangyayari").
#
# Ang aral sa agent_lessons.md ay prosa, at hindi nakabantay ang prosa. Ito, oo.
#
# Mabilis ang gate kapag walang lock change (isang git status sa isang file).
# Ang mabagal na `npm ci --dry-run` ay tumatakbo LANG kapag galaw ang lock —
# bihira yun, at yun mismo ang sandaling kailangan ng tseke.
set -uo pipefail

payload=$(cat)

# git commit lang ang sakop. Lahat ng iba, dumadaan agad.
case "$payload" in
  *"git commit"*) ;;
  *) exit 0 ;;
esac

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo" || exit 0

# Walang galaw ang lock (working tree man o staged) = dumadaan agad.
if [ -z "$(git status --porcelain -- package-lock.json 2>/dev/null)" ]; then
  exit 0
fi

if npm ci --dry-run >/tmp/lock-sync-gate.out 2>&1; then
  echo "lock-sync-gate: may galaw ang package-lock.json pero in sync sya (npm ci --dry-run exit 0) — dumadaan." >&2
  exit 0
fi

cat >&2 <<'MSG'
DENY lock-sync-gate: may galaw ang package-lock.json at BAGSAK ang `npm ci --dry-run`.

Kapag na-commit to, mamamatay ang BAWAT push sa CI (verify + e2e), ang Nightly
Regression, at ang Oceanides daily posts — isang araw ng pulang email ang
katumbas noong 2026-08-02. Pangatlong beses na ito.

Dalawang lehitimong daan:
  1. Hindi mo sinadya ang lock change (walang dependency work sa task na to):
       git restore package-lock.json
  2. Sinadya mo (nagbago ang dependencies): ayusin hanggang exit 0 —
       npm install && npm ci --dry-run
     at tingnan ang /tmp/lock-sync-gate.out para sa eksaktong reklamo.

Ang kilalang recurring break: tinatanggal ng lokal na npm 11 ang nested
@types/react entry sa ilalim ng node_modules/@google/design.md/. Ibalik:
  git restore --source=<huling-green> -- package-lock.json
MSG
exit 2
