#!/usr/bin/env bash
# UserPromptSubmit hook — dalawang trigger, dalawang payload.
#
# BAKIT ITO UMIIRAL
# Paulit-ulit na nadudulas ang agent papunta sa malalim, isinaling Tagalog kapag
# Taglish ang usapan. Sabi ni Neil sa KM-003 dashboard: "sakit sa mata basahin."
# Nasa repo na ang buong spec pero hindi sya awtomatikong nababasa.
#
# BAKIT DALAWA ANG TRIGGER (2026-08-02)
# Ang lumang bersyon ay pumuputok LANG kapag Tagalog ang tinipa ni Neil. Kaso ang
# copy ay madalas hinihingi sa English ("write the landing page copy"), at doon
# tahimik ang hook — kaya ang mismong sandali na pinakakailangan ang spec ay siya
# ring sandali na hindi sya dumarating. Sabi ni Neil: "sa website, creatives,
# captions, script etc - related to sales and marketing - applicable din to at
# sana auto fire din kapag nadetect at fit ung taglish."
#
#   A. Tagalog markers sa prompt   -> sumagot sa parehong register
#   B. Copy/marketing task (kahit anong wika) -> STEP 0 muna, tapos LANGUAGE LOCK
#
# Pwedeng pumutok pareho. Fail-open: kahit anong problema, exit 0 nang tahimik —
# hindi kailanman hinaharangan ang prompt ni Neil.

set -uo pipefail

input="$(cat 2>/dev/null || true)"
[ -z "$input" ] && exit 0

lower="$(printf '%s' "$input" | tr '[:upper:]' '[:lower:]')"

# --- Trigger A: Tagalog function words. Sinadyang piliin ang mga salitang
# malabong lumabas sa English na teksto o sa file path. >=2 na natatangi. ---
markers='ang|ng|mga|yung|yun|kasi|tapos|natin|namin|nyo|sya|siya|wala|meron|naman|pero|kaya|dahil|gusto|alam|gawin|bakit|paano|ayos|sige|hindi|ako|ikaw|tayo|kami|kayo|nila|dito|doon|ganito|ganyan|ilan|magkano|salamat'
hits="$(printf '%s' "$lower" | grep -oE "\\b(${markers})\\b" 2>/dev/null | sort -u | wc -l | tr -d '[:space:]')"
case "$hits" in ''|*[!0-9]*) hits=0 ;; esac

taglish=0
[ "$hits" -ge 2 ] && taglish=1

# --- Trigger B: copy / sales / marketing na trabaho, kahit anong wika. ---
# Kailangan ng NOUN. Ang verb ay hindi hinihingi: ang "landing page copy" o
# "caption" mag-isa ay sapat nang senyales, at ang paghingi ng verb ay
# nagpapalampas ng "yung caption sa ad, mali yung tono."
copy_nouns='copy|caption|script|headline|hook|tagline|slogan|landing page|sales page|price page|funnel|ad copy|creative|post|cta|subject line|voiceover|vo script|bio|email sequence|broadcast|sales pitch|dm|messenger reply'
copy=0
printf '%s' "$lower" | grep -qE "\\b(${copy_nouns})\\b" 2>/dev/null && copy=1

[ "$taglish" -eq 0 ] && [ "$copy" -eq 0 ] && exit 0

if [ "$taglish" -eq 1 ]; then
  cat <<'EOF'
<taglish-register>
Taglish/Tagalog ang sinulat ni Neil. Sumagot sa PAREHONG register.
</taglish-register>
EOF
fi

if [ "$copy" -eq 1 ]; then
  cat <<'EOF'
<copy-task-detected>
May hinihinging COPY (sales/marketing). STEP 0 MUNA bago sumulat: Taglish ba
talaga ang tama para sa surface at market na to, o English? Hindi lahat ay
Taglish — ang Grifon app UI, grifon.ai, B2B deck at proposal ay ENGLISH, at
kapag English ang sagot ay BUONG English. PURONG TAGALOG AY HINDI KAILANMAN.
</copy-task-detected>
EOF
fi

cat <<'EOF'
<language-lock>
Buong spec: .claude/skills/_shared/taglish-voice.md (§LANGUAGE LOCK). Port ng
TUNED formula sa api/_lib/prompts.ts. Kapag Taglish ang sagot ng STEP 0:

1. TAGALOG ANG FRAME — verb, connector, pronoun.
2. English LANG sa apat: (a) brand/institution (Oceanides, SEC, BIR, DENR),
   (b) presyo at numero, (c) hiram na verb sa Tagalog frame (i-confirm, i-check,
   mag-book), (d) noun na totoong sinasabi ng Pinoy sa English (septic tank,
   truck, schedule, receipt, warranty, form, page).
3. BAWAL ang English sa spec/marketing term. Natural na Taglish o TANGGALIN.
4. 🔴 ANG KAAWAY AY MANUAL-TAGALOG, HINDI TAGALOG. Tama sa diksyunaryo pero
   hindi sinasabi ng tao: detalye, rehistrado, awtomatiko, kumpirmahin,
   napagkakasunduan, naitatala, pahintulot, naka-imbak, naserbisyuhan, opisyal.
   Minsan English ang lunas, minsan mas simpleng Tagalog. HUWAG piliin ang wika.
   Piliin ang salitang bibigkasin ng tao.
5. Walang halong register sa loob ng isang linya.
6. Ang purong-Tagalog na pangungusap ay HINDI awtomatikong mali. "Kapag
   nagbubuhos ka na ng timba para lang bumaba, hindi na yan barado." = 98.5%
   retention. Pasado kasi zero manual, walang technical noun. Ang sira ay ang
   bokabularyo, hindi ang ratio. Huwag habulin ang numero.
7. Walang em dash. Walang apostrophe sa contraction: nyo, yun, yan, to, wag, di.
8. Kalmadong eksperto, hindi masiglang salesman. Walang emoji-stack.

TEST: "Sound like a real Filipino vlog, not a manual."
EOF
printf '</language-lock>\n'

exit 0
