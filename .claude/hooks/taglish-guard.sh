#!/usr/bin/env bash
# UserPromptSubmit hook — kapag Taglish/Tagalog ang sinulat ni Neil, ipaalala ang register.
#
# Bakit ito umiiral: paulit-ulit na nadudulas ang agent papunta sa malalim, isinaling
# Tagalog ("pananagutan", "kalibrasyon", "humaharang") kapag Taglish ang usapan. Sabi ni
# Neil sa KM-003 dashboard: "sakit sa mata basahin." Nasa repo na ang buong spec
# (.claude/skills/_shared/taglish-voice.md) pero hindi sya awtomatikong nababasa — ito ang
# nagti-trigger nito.
#
# Detection: bilangin ang natatanging Tagalog function words sa prompt. >=2 ang trigger.
# Sinadyang piliin ang mga salitang malabong lumabas sa English na teksto o sa file path.
# Fail-open: kahit anong problema, exit 0 nang tahimik — hindi kailanman hinaharangan ang
# prompt ni Neil.

set -uo pipefail

input="$(cat 2>/dev/null || true)"
[ -z "$input" ] && exit 0

markers='ang|ng|mga|yung|yun|kasi|tapos|natin|namin|nyo|sya|siya|wala|meron|naman|pero|kaya|dahil|gusto|alam|gawin|bakit|paano|ayos|sige|hindi|ako|ikaw|tayo|kami|kayo|nila|dito|doon|ganito|ganyan|ilan|magkano|salamat'

hits="$(printf '%s' "$input" \
  | tr '[:upper:]' '[:lower:]' \
  | grep -oE "\\b(${markers})\\b" 2>/dev/null \
  | sort -u | wc -l | tr -d '[:space:]')"

case "$hits" in ''|*[!0-9]*) exit 0 ;; esac
[ "$hits" -lt 2 ] && exit 0

cat <<'EOF'
<taglish-register>
Taglish/Tagalog ang sinulat ni Neil. Sumagot sa PAREHONG register. Ang buong spec ay nasa
.claude/skills/_shared/taglish-voice.md — basahin ito kapag magsusulat ka ng copy (ad,
post, caption, page). Para sa ordinaryong sagot sa chat, ito ang apat na rule:

1. 50/50 split, hindi mabigat na Tagalog. ENGLISH para sa bagay at technical (price,
   septic tank, budget, data, message, funnel, ads, video, report, guarantee, booking).
   TAGALOG para sa tao (ang problema, ang takot, ang desisyon, ang close).
2. Grade 4 na salita. Kung hindi sinasabi nang malakas ng tao, palitan.
   BAWAL: datos, badyet, usapan, kalibrasyon, pananagutan, panganib, humaharang,
   naitala, kabuuan, samakatuwid, gayunpaman.
   GAMITIN: data, budget, message, testing, risk, blocker, nakasulat, lahat, kaya, pero.
3. Walang em dash. Walang apostrophe sa contractions: nyo, yun, yan, to, wag, di.
4. Kalmadong eksperto, hindi masiglang salesman. Walang emoji-stack.

Ang test: sasabihin mo ba ito nang malakas sa isang kaibigan? Kung "iminumungkahi" ang
tunog, mali.
</taglish-register>
EOF

exit 0
