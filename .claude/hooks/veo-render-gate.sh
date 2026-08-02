#!/usr/bin/env bash
# veo-render-gate — humaharang sa PAID na Veo render hangga't hindi pumapasa
# ang script sa `tools/ad_preflight.mjs`.
#
# BAKIT SYA UMIIRAL
# Noong 2026-08-03 ay nag-render ako ng apat na Veo clip (~$4) para sa isang
# script na lumalabag sa APAT na tuned rule na nakasulat na sa repo bago pa
# magsimula: 15-salitang hook (max 8), 20 at 21 salitang body line (max 12),
# 3% English ratio (accent lock ay 70/30), at tatlong magkaibang lugar sa mga
# plate. Sabi ni Neil: "parang dalawang body ang ginamit... parang di ka
# nag-iimprove." Tama sya. Nasa skill lahat ng aral; hindi ko binuksan.
#
# Ang prosa ay hindi nakabantay sa pera. Ito, oo.
#
# Ang gate ay sa SCRIPT, hindi sa taste. Isang JSON spec katabi ng render at
# isang pasadong preflight. Kapag walang spec, walang render — sinasadya yun:
# ang pagsusulat ng spec ANG mismong hakbang na nilaktawan ko.
#
# Fail-open lang sa mga bagay na WALANG kinalaman sa Veo. Kapag Veo ang tawag
# at may problema sa gate, HUMIHINTO — hindi dumadaan.
set -uo pipefail

payload=$(cat)

# Veo render lang ang sakop nito. Lahat ng iba, dumadaan.
case "$payload" in
  *veo-produce*|*veo-motion-test*) ;;
  *) exit 0 ;;
esac

# --dry-run at --help ay walang gastos.
case "$payload" in
  *--dry-run*|*--help*) exit 0 ;;
esac

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo" || exit 0

# Hinahanap ang spec sa tabi ng --out. `--out clients/.../gb-001/clips/s1.mp4`
# -> `clients/.../gb-001/script.spec.json`
out=$(printf '%s' "$payload" | grep -oE '\-\-out[^A-Za-z0-9]+[^"[:space:]]+' | head -1 | sed 's/.*--out[^A-Za-z0-9]*//')
spec=""
if [ -n "$out" ]; then
  d=$(dirname "$out")
  for cand in "$d/script.spec.json" "$(dirname "$d")/script.spec.json"; do
    [ -f "$cand" ] && { spec="$cand"; break; }
  done
fi

if [ -z "$spec" ]; then
  cat >&2 <<'MSG'
DENY veo-render-gate: walang script.spec.json katabi ng --out.

Bawal ang bayad na Veo render nang walang spec na pumasa sa preflight. Gumawa
ng script.spec.json sa ad folder (hook, lines, plates, preset), tapos:

  node tools/ad_preflight.mjs --script <path>/script.spec.json

Ang pagsusulat ng spec na yan ang mismong hakbang na nilaktawan noong 2026-08-03,
at $4 ang nagastos sa script na lumalabag sa apat na tuned rule.
MSG
  exit 2
fi

if ! node tools/ad_preflight.mjs --script "$spec" >/tmp/veo-gate.out 2>&1; then
  {
    echo "DENY veo-render-gate: bumagsak ang $spec sa preflight."
    echo
    cat /tmp/veo-gate.out
    echo
    echo "Ayusin ang SCRIPT, hindi ang gate. Walang exception list dito."
  } >&2
  exit 2
fi

exit 0
