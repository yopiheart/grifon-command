#!/usr/bin/env bash
# GB-001-AD assembly — ang unang ad ni Gabriel, at ang una na tumuturo sa website.
# Patakbuhin mula sa repo root, kailangan ng ffmpeg sa PATH:
#   export PATH="$PWD/.tools/ffmpeg/ffmpeg-8.1.2-essentials_build/bin:$PATH"
#   bash clients/oceanides/kuya-gabriel/ads/gb-001/build-cut.sh
#
# Sources (naka-commit): plates/, plates-9x16/, clips/
# Ang edit/ ay gitignored — ang script na to ang recipe, hindi ang output.
#
# ANG PAGKAKAIBA SA KM-003
#  - 4 na beat, hindi 6. Ang 36.8s ay may 8.0% lang na umaabot sa dulo.
#  - s3 ay SCREEN RECORDING ng totoong page, hindi Veo. Sa halip na sabihin ni
#    Gabriel na nakasulat ang presyo, nakikita mo. Libre rin sya.
#  - Ang VO ng s3 ay hinihila sa sariling Veo roll (s3-vo-source.mp4) para
#    IISANG BOSES ang buong ad. Ang TTS mula sa ibang voice ay agad na
#    naririnig bilang ibang tao.
#  - SPEECH-CUT, hindi hand-timed. Ang Veo ay nag-uunat ng dialogue para punuin
#    ang 8s, at ang patlang sa loob ang drag. Ang .tmp/speechcut.mjs ang
#    naghahanap ng totoong salita; ang mga segment sa ibaba ay galing doon.
set -euo pipefail

AD="clients/oceanides/kuya-gabriel/ads/gb-001"
C="$AD/clips"; E="$AD/edit"
FONT="api/_lib/assets/fonts/Anton-Regular.ttf"
MUSIC="api/_lib/assets/music/testimonial.mp3"
OUT="$AD/GB-001-AD-v1.mp4"
mkdir -p "$E"

[ -f "$FONT" ] || { echo "ERROR: patakbuhin mula sa repo root (walang Anton-Regular.ttf)" >&2; exit 1; }

V="-c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -r 30"
AAC="-c:a aac -b:a 192k -ar 48000 -ac 2"
SPD=1.12   # 22.2s raw -> ~19.8s. Pasok sa 15-20s na target.

# Ang drawtext ay pumuputol sa apostrophe at sa colon; wala tayo nun (typography
# rule sa taglish-voice.md). Ang kuwit ay kailangang i-escape.
esc() { printf '%s' "$1" | sed "s/,/\\\\,/g"; }

# --- 1. SPEECH CUTS -------------------------------------------------------
# Kada segment: keep-windows na galing sa speechcut.mjs, pinagdikit.
cut_speech() {
  local src="$1" name="$2"; shift 2
  local n=0 inputs=() filters=""
  for seg in "$@"; do
    local a="${seg%%:*}" b="${seg##*:}"
    ffmpeg -y -v error -ss "$a" -to "$b" -i "$src" -vf "fps=30,scale=1080:1920" $V $AAC "$E/${name}_$n.mp4"
    inputs+=(-i "$E/${name}_$n.mp4"); filters+="[$n:v][$n:a]"; n=$((n+1))
  done
  ffmpeg -y -v error "${inputs[@]}" -filter_complex "${filters}concat=n=$n:v=1:a=1[v][a]" \
    -map "[v]" -map "[a]" $V $AAC "$E/$name.mp4"
}

echo "== s1 HOOK =="
cut_speech "$C/s1.mp4" s1cut 0:2.02 2.18:3.32 3.83:5.12 5.83:6.62
echo "== s2 ANG TAKOT =="
# s2b, hindi s2. Sa unang roll ay NGUMITI si Gabriel nang may ngipin at taas ng
# pisngi. Hard rule yun na sarili nyang desisyon (IDENTITY.md, 2026-07-30) at
# hindi sya nahuhuli ng EXPRESSION LOCK ng veo-produce, kaya may hiwalay na
# no-smile na linya ang --setting ng roll na to. Ang ngipin sa gitna ng salita
# ay articulation, hindi ngiti — walang taas ng pisngi, walang kunot sa mata.
cut_speech "$C/s2b.mp4" s2cut 0:1.92 2.13:3.12 3.53:5.52 5.78:7.37
echo "== s4 CTA =="
cut_speech "$C/s4.mp4" s4cut 0.03:1.17 2.08:4.07
echo "== s3 VO (audio lang) =="
cut_speech "$C/s3-vo-source.mp4" s3vocut 0:6.12 6.28:7.52
ffmpeg -y -v error -i "$E/s3vocut.mp4" -vn -c:a aac -b:a 192k -ar 48000 -ac 2 "$E/s3-vo.m4a"

# --- 2. s3 SCREEN SCROLL --------------------------------------------------
# Ang totoong page, hindi generation. Ang taas ng VO ang nagtatakda ng haba.
S3DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$E/s3-vo.m4a")
echo "== s3 SCROLL (${S3DUR}s) =="
# HUMIHINTO MUNA SA TICKET. Ang unang bersyon ay nag-scroll mula 0 hanggang 7200
# at ang huling dalawang segundo ay purong puting espasyo — dumaan sya sa ₱5,000
# ticket nang napakabilis at nagtapos sa wala. Ngayon: 1.4s na hinto sa ticket
# mismo (y=200, doon nakalimbag ang presyo at ang add-ons), tapos dahan-dahang
# scroll hanggang y=4600 na dulo pa rin ng value stack. Walang blangko.
SCROLL_A=200; SCROLL_B=4600; HOLD=1.4
ffmpeg -y -v error -loop 1 -framerate 30 -t "$S3DUR" -i .tmp/page-full.png \
  -vf "scale=1080:-1,crop=1080:1920:0:'${SCROLL_A}+min(max(0\,(t-${HOLD}))/(${S3DUR}-${HOLD})\,1)*(${SCROLL_B}-${SCROLL_A})',fps=30" \
  -an $V "$E/s3-scroll.mp4"
ffmpeg -y -v error -i "$E/s3-scroll.mp4" -i "$E/s3-vo.m4a" -map 0:v -map 1:a -shortest $V $AAC "$E/s3.mp4"

# --- 3. OVERLAYS ----------------------------------------------------------
# 🔴 Ang hook ay nasa FRAME 0 at WALANG fade. Frame 0 ang kinukuha ni Meta
# bilang thumbnail; ang KM-003 ay nag-fade in kaya blangkong mukha ang napili.
# Face-safe: nasa ibabang bahagi lahat ng teksto, hindi sa mukha.
band() { # $1 in, $2 out, $3 text, $4 y, $5 size
  ffmpeg -y -v error -i "$1" -vf "drawtext=fontfile=$FONT:text='$(esc "$3")':fontcolor=white:fontsize=${5:-62}:line_spacing=12:box=1:boxcolor=0x0A1F45@0.86:boxborderw=28:x=(w-text_w)/2:y=$4" $V $AAC "$2"
}
echo "== overlay: hook =="
# 88px, hindi 62. Sa 62 ay nababasa sya pero hindi sya humihinto ng scroll, at
# ang overlay na to ang buong trabaho ng frame 0. Nananatiling nasa itaas ng
# buhok nya ang kahon — FACE-SAFE ang batas, kahit gaano kalaki.
band "$E/s1cut.mp4" "$E/s1ovl.mp4" "HINDI BARADO.
PUNO NA." 150 88
echo "== overlay: s3 =="
band "$E/s3.mp4" "$E/s3ovl.mp4" "NASA PAGE ANG BUONG PRESYO" 1400
echo "== overlay: CTA =="
band "$E/s4cut.mp4" "$E/s4ovl.mp4" "BASAHIN MO MUNA
OCEANIDESPH.COM" 1330

# --- 4. SPEED + CONCAT ----------------------------------------------------
# Nauuna ang overlay bago ang speed-up para magkasabay silang mag-scale.
for s in s1ovl s2cut s3ovl s4ovl; do
  ffmpeg -y -v error -i "$E/$s.mp4" -filter_complex \
    "[0:v]setpts=PTS/$SPD[v];[0:a]atempo=$SPD[a]" -map "[v]" -map "[a]" $V $AAC "$E/${s}_spd.mp4"
done
echo "== concat =="
ffmpeg -y -v error -i "$E/s1ovl_spd.mp4" -i "$E/s2cut_spd.mp4" -i "$E/s3ovl_spd.mp4" -i "$E/s4ovl_spd.mp4" \
  -filter_complex "[0:v][0:a][1:v][1:a][2:v][2:a][3:v][3:a]concat=n=4:v=1:a=1[v][a]" \
  -map "[v]" -map "[a]" $V $AAC "$E/cut-nomusic.mp4"

# --- 5. MUSIC BED ---------------------------------------------------------
# Mababa, at umaalis sa dulo. Kalmadong eksperto, hindi masiglang salesman.
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$E/cut-nomusic.mp4")
FADE=$(awk -v d="$DUR" 'BEGIN{printf "%.2f", (d-1.5 > 0 ? d-1.5 : 0)}')
ffmpeg -y -v error -i "$E/cut-nomusic.mp4" -i "$MUSIC" -filter_complex \
  "[1:a]atrim=0:$DUR,volume=0.10,afade=t=in:st=0:d=1,afade=t=out:st=$FADE:d=1.5[m];[0:a][m]amix=inputs=2:duration=first:dropout_transition=0[a]" \
  -map 0:v -map "[a]" $V $AAC "$OUT"

echo
echo "✓ $OUT"
ffprobe -v error -show_entries format=duration:stream=width,height -of default=nw=1 "$OUT"
