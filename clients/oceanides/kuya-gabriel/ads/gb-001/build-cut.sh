#!/usr/bin/env bash
# GB-001-AD v2 — buong assembly. Recipe ito, hindi output; gitignored ang edit/.
#
#   export PATH="$PWD/.tools/ffmpeg/ffmpeg-8.1.2-essentials_build/bin:$PATH"
#   bash clients/oceanides/kuya-gabriel/ads/gb-001/build-cut.sh
#
# ANG PAGKAKAIBA SA v1 (na BAGSAK — anim na bagay, 2026-08-03)
#  1. MAY CAPTION na. Ang v1 ay wala. P1, 11 corroborations: ang pace ay caption
#     churn, hindi cut rate. Ito ang pinakamalakas na lever at libre sya.
#  2. HTML/Hyperframes ang hook overlay at ang end card, hindi drawtext band.
#     "Ang nagpaganda pa sa KM003 meron tong html/hyperframes" (Neil).
#  3. Nasa y=300 ang hook, loob ng feed-safe 285-1635. Ang v1 ay nasa y=150 at
#     naputol nang malinis ng 4:5 feed crop.
#  4. May flash + whoosh sa bawat pangalawang cut, max 3 (aral #7).
#  5. Music sa 0.20, hindi 0.10. Sa 0.10 ay wala kang naririnig.
#  6. MAY GALAW ANG BAWAT BEAT. Sinukat 2026-08-03: ang push-in ni Veo ay ~15%
#     sa buong 8s at ~7% na lang matapos ang speech-cut — nasa ilalim ng makikita.
#     Kaya ang zoom ay dito na ginagawa, kung saan tayo ang may hawak ng lakas.
#
# ANG PAGKAKAIBA SA v2 (tatlong bagay, Neil 2026-08-03, lahat $0)
#  a. Beat 6: hindi na 5.6s na scroll na walang makakabasa sa 375px — 1.5s na
#     totoong page bilang patunay, tapos putol sa price-addons-ticket na
#     NABABASA (see section 3). Caption sa proof lang, hindi sa ticket.
#  b. Caption chunking: ang kuwit ay hangganan na — walang chunk na tumatawid
#     sa kuwit (captions.mjs).
#  c. May Oceanides logo na ang end card (overlays/endcard.html).
#
# ANG NGITI, AT KUNG PAANO SYA IWINASAN NANG WALANG GASTOS
# Ngumiti si Gabriel sa r2 at r3 — hard rule yun na sarili nyang desisyon, at
# tatlong beses syang ngumiti kahit hinigpitan ang prompt. Dense sampling ang
# nagturo kung saan eksakto (aral #14, hindi sparse):
#   r2  malinis ang 0-3.7s. Nasa 4-7s ang ngiti — at natatakpan yun ng b2.
#   r3  malinis ang 0-1.1s at ang 3.6-6.8s. Ngiti ang 1.1-3.5s.
# Kaya ang beat 5 ay HINDI na mukha nya kundi HTML quote card na may totoong
# sinabi ng customer. Tumutugma sya sa linyang "Yan ang sabi nila", social proof
# sya, at zero ang gastos.
#
# ⛔ WALA PANG KLING. Ang dalawang b-roll ay still + FFmpeg zoom muna. Ang Kling
#    ang deklaradong lane sa script.spec.json (`broll[].motion`) at BAYAD sya —
#    desisyon ni Neil pagkatapos nyang panoorin ang cut na to.
set -euo pipefail

AD="clients/oceanides/kuya-gabriel/ads/gb-001"
C="$AD/clips"; E="$AD/edit"; O="$AD/overlays"; B="$AD/broll"
FONT="api/_lib/assets/fonts/Anton-Regular.ttf"
MUSIC="api/_lib/assets/music/testimonial.mp3"
WHOOSH="api/_lib/assets/sfx/whoosh-v2.mp3"
POP="api/_lib/assets/sfx/pop-v3.mp3"
OUT="$AD/GB-001-AD-v3.mp4"
mkdir -p "$E"

[ -f "$FONT" ] || { echo "ERROR: patakbuhin mula sa repo root" >&2; exit 1; }
for f in "$O/hook-overlay.mov" "$O/quote-card.mp4" "$O/endcard.mp4"; do
  [ -f "$f" ] || { echo "ERROR: walang $f — patakbuhin muna ang overlays/render-overlay.mjs" >&2; exit 1; }
done

V="-c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -r 30"
AAC="-c:a aac -b:a 192k -ar 48000 -ac 2"
SPD=1.12   # PACING Fix 5. Inuunat ni Veo ang dialogue para punuin ang 8s;
           # ang TRIM ang unang lunas, ito ang pangalawa. 1.05-1.12 ang hanay.

CAP() { node "$AD/captions.mjs" --text "$1" --dur "$2"; }

# --- 1. SPEECH CUTS ---------------------------------------------------------
# Ang mga window ay galing sa silencedetect=noise=-30dB:d=0.25, hindi sa kamay.
cut_av() {  # $1 src, $2 name, $3.. "a:b" na keep-window
  local src="$1" name="$2"; shift 2
  local n=0 inputs=() filters=""
  for seg in "$@"; do
    ffmpeg -y -v error -ss "${seg%%:*}" -to "${seg##*:}" -i "$src" \
      -vf "fps=30,scale=1080:1920" $V $AAC "$E/${name}_$n.mp4"
    inputs+=(-i "$E/${name}_$n.mp4"); filters+="[$n:v][$n:a]"; n=$((n+1))
  done
  ffmpeg -y -v error "${inputs[@]}" -filter_complex "${filters}concat=n=$n:v=1:a=1[v][a]" \
    -map "[v]" -map "[a]" $V $AAC "$E/$name.mp4"
}
cut_audio() { # $1 src, $2 name, $3.. window — boses lang, para sa b-roll beat
  local src="$1" name="$2"; shift 2
  local n=0 inputs=() filters=""
  for seg in "$@"; do
    ffmpeg -y -v error -ss "${seg%%:*}" -to "${seg##*:}" -i "$src" -vn $AAC "$E/${name}_$n.m4a"
    inputs+=(-i "$E/${name}_$n.m4a"); filters+="[$n:a]"; n=$((n+1))
  done
  ffmpeg -y -v error "${inputs[@]}" -filter_complex "${filters}concat=n=$n:v=0:a=1[a]" \
    -map "[a]" $AAC "$E/$name.m4a"
}

echo "== speech cuts =="
cut_av    "$C/r1.mp4"    b1v 0:2.74                      # hook
cut_audio "$C/r1.mp4"    b2a 3.36:6.50                   # L1
cut_av    "$C/r2.mp4"    b3v 0:1.245 1.87:3.666          # L2
cut_audio "$C/r2.mp4"    b4a 4.376:5.620 6.117:7.140     # L3 (approved verbatim)
cut_audio "$C/r3.mp4"    b5a 0:1.976 2.340:3.366         # L4
cut_audio "$C/r4-vo.mp4" b6a 0:3.283 3.628:5.948         # L5 + L6
cut_av    "$C/r3.mp4"    b7v 3.666:6.728                 # L7 CTA

dur() { ffprobe -v error -show_entries format=duration -of csv=p=0 "$1"; }
D2=$(dur "$E/b2a.m4a"); D4=$(dur "$E/b4a.m4a"); D5=$(dur "$E/b5a.m4a"); D6=$(dur "$E/b6a.m4a")

# --- 2. GALAW SA MGA STILL --------------------------------------------------
# Slow push-in. Ito ang MrBeast lever na hiningi ni Neil: kung walang galaw ang
# eksena, patay sya. Nasa edit sya at hindi sa generation kaya kontrolado ang
# lakas at hindi sya nasisira ng pagputol (MOTION DOCTRINE, 2026-07-27).
still_push() { # $1 png, $2 out, $3 dur, $4 zoom-end
  local frames; frames=$(awk -v d="$3" 'BEGIN{printf "%d", d*30}')
  ffmpeg -y -v error -loop 1 -framerate 30 -t "$3" -i "$1" \
    -vf "scale=1280:-1,crop=1080:1920,zoompan=z='1+($4-1)*on/${frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30,setsar=1" \
    -an $V "$2"
}
echo "== b-roll push-in =="
still_push "$B/b1.png" "$E/b2v.mp4" "$D2" 1.14
still_push "$B/b2.png" "$E/b4v.mp4" "$D4" 1.14

# --- 3. BEAT 6: PAGE PROOF + TICKET ------------------------------------------
# Ang v2 ay 5.6s na tuloy-tuloy na scroll — 5.6 segundo ng tekstong walang
# makakabasa sa 375px (Neil, 2026-08-03). Ang ayos: 1.5s ng totoong page bilang
# PATUNAY (hindi babasahin, titingnan lang na totoo), tapos putol sa approved na
# price-addons-ticket — HTML ang pinagmulan nya (templates/price-addons-ticket
# .html) kaya letter-perfect. Sa 1080x1350 na naka-center sa y=285 ay eksakto
# syang pumupuno sa feed-safe band: buo sya sa 4:5 feed AT sa 9:16. Banayad na
# push-in para may galaw ang beat (pagkakaiba #6 ng v2).
echo "== beat 6: page proof + ticket =="
PROOF=1.5
TICKET="clients/oceanides/out/price-addons-ticket.png"
[ -f "$TICKET" ] || { echo "ERROR: walang $TICKET" >&2; exit 1; }
[ -f .tmp/page-full.png ] || { echo "ERROR: walang .tmp/page-full.png — kunan ulit ang oceanidesph.com (1080 wide, full page)" >&2; exit 1; }
D6T=$(awk -v d="$D6" -v p="$PROOF" 'BEGIN{printf "%.3f", d-p}')
# (a) mabilis na scroll ng totoong page — patunay na nakasulat, hindi pagbabasa
ffmpeg -y -v error -loop 1 -framerate 30 -t "$PROOF" -i .tmp/page-full.png \
  -vf "scale=1080:-1,crop=1080:1920:0:'200+min(t/${PROOF}\,1)*2000',fps=30,setsar=1" \
  -an $V "$E/b6p.mp4"
# (b) ang ticket, nababasa, may banayad na push-in
TFRAMES=$(awk -v d="$D6T" 'BEGIN{printf "%d", d*30}')
ffmpeg -y -v error -loop 1 -framerate 30 -t "$D6T" -i "$TICKET" \
  -vf "scale=1080:1350,pad=1080:1920:0:285:color=0xF4F6FA,zoompan=z='1+0.05*on/${TFRAMES}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30,setsar=1" \
  -an $V "$E/b6t.mp4"
ffmpeg -y -v error -i "$E/b6p.mp4" -i "$E/b6t.mp4" \
  -filter_complex "[0:v][1:v]concat=n=2:v=1:a=0[v]" -map "[v]" -an $V "$E/b6v.mp4"

# --- 4. PAGDIKIT NG BOSES SA LARAWAN ----------------------------------------
mux() { ffmpeg -y -v error -i "$1" -i "$2" -map 0:v -map 1:a -shortest $V $AAC "$3"; }
mux "$E/b2v.mp4" "$E/b2a.m4a" "$E/b2.mp4"
mux "$E/b4v.mp4" "$E/b4a.m4a" "$E/b4.mp4"
mux "$E/b6v.mp4" "$E/b6a.m4a" "$E/b6.mp4"
# Beat 5 — quote card. Pinuputol sa haba ng boses.
ffmpeg -y -v error -t "$D5" -i "$O/quote-card.mp4" -i "$E/b5a.m4a" \
  -map 0:v -map 1:a -shortest $V $AAC "$E/b5.mp4"

# --- 5. HOOK OVERLAY (HTML, transparent MOV) --------------------------------
# 🔴 FRAME 0, WALANG FADE. Frame 0 ang kinukuha ni Meta bilang thumbnail.
echo "== hook overlay =="
ffmpeg -y -v error -i "$E/b1v.mp4" -i "$O/hook-overlay.mov" \
  -filter_complex "[0:v][1:v]overlay=0:0:shortest=1[v]" -map "[v]" -map 0:a $V $AAC "$E/b1.mp4"

# --- 6. CAPTIONS ------------------------------------------------------------
# Hook = overlay LANG, walang caption (aral #4 — attention war). Beat 2 pataas.
echo "== captions =="
capbeat() { # $1 in, $2 out, $3 text
  local d; d=$(dur "$1")
  ffmpeg -y -v error -i "$1" -vf "$(CAP "$3" "$d")" $V $AAC "$2"
}
cp "$E/b1.mp4" "$E/b1c.mp4"
capbeat "$E/b2.mp4" "$E/b2c.mp4" "Kahit anong plunger, balik nang balik ang problema."
capbeat "$E/b3v.mp4" "$E/b3c.mp4" "Pero ang mas nakakatakot, yung singil pagdating ng truck."
capbeat "$E/b4.mp4" "$E/b4c.mp4" "Isa ang presyo sa phone, iba na sa receipt."
cp "$E/b5.mp4" "$E/b5c.mp4"   # quote card — ang card mismo ang teksto
# Beat 6: caption LANG sa 1.5s na page proof; kapag nasa ticket na, ang ticket
# mismo ang teksto (same na rason ng beat 5) at ang karaoke sa ibabaw nya ay
# tatakip sa mismong binabasa.
ffmpeg -y -v error -i "$E/b6.mp4" -vf "$(CAP 'Kaya nasa page na' "$PROOF")" $V $AAC "$E/b6c.mp4"
capbeat "$E/b7v.mp4" "$E/b7c.mp4" "Basahin mo muna bago ka mag-book ng schedule."

# --- 7. CONCAT --------------------------------------------------------------
# Concat FILTER na may isang re-encode. Ang demuxer -c copy ay nagpuputol ng DTS
# at gumagawa ng black frame (aral #3).
echo "== concat =="
ffmpeg -y -v error -i "$E/b1c.mp4" -i "$E/b2c.mp4" -i "$E/b3c.mp4" -i "$E/b4c.mp4" \
  -i "$E/b5c.mp4" -i "$E/b6c.mp4" -i "$E/b7c.mp4" \
  -filter_complex "[0:v][0:a][1:v][1:a][2:v][2:a][3:v][3:a][4:v][4:a][5:v][5:a][6:v][6:a]concat=n=7:v=1:a=1[v][a]" \
  -map "[v]" -map "[a]" $V $AAC "$E/joined.mp4"

# --- 8. FLASH SA CUT --------------------------------------------------------
# 0.07s, pagkatapos ng hook at kada pangalawang cut, MAX 3 (aral #7).
F1=$(dur "$E/b1c.mp4")
F2=$(awk -v a="$F1" -v b="$(dur "$E/b2c.mp4")" -v c="$(dur "$E/b3c.mp4")" 'BEGIN{printf "%.3f", a+b+c}')
F3=$(awk -v a="$F2" -v b="$(dur "$E/b4c.mp4")" -v c="$(dur "$E/b5c.mp4")" 'BEGIN{printf "%.3f", a+b+c}')
echo "== flash @ $F1 $F2 $F3 =="
ffmpeg -y -v error -i "$E/joined.mp4" -vf "\
drawbox=x=0:y=0:w=iw:h=ih:color=white@0.72:t=fill:enable='between(t,${F1},${F1}+0.07)',\
drawbox=x=0:y=0:w=iw:h=ih:color=white@0.72:t=fill:enable='between(t,${F2},${F2}+0.07)',\
drawbox=x=0:y=0:w=iw:h=ih:color=white@0.72:t=fill:enable='between(t,${F3},${F3}+0.07)'" \
  $V $AAC "$E/flashed.mp4"

# --- 9. SFX -----------------------------------------------------------------
# Sa transition LANG, hindi random. Walang SFX na tumatakip sa unang salita.
echo "== sfx =="
ffmpeg -y -v error -i "$E/flashed.mp4" -i "$WHOOSH" -i "$WHOOSH" -i "$WHOOSH" -i "$POP" \
  -filter_complex "\
[1:a]adelay=$(awk -v t="$F1" 'BEGIN{printf "%d", t*1000}')|$(awk -v t="$F1" 'BEGIN{printf "%d", t*1000}'),volume=0.45[s1];\
[2:a]adelay=$(awk -v t="$F2" 'BEGIN{printf "%d", t*1000}')|$(awk -v t="$F2" 'BEGIN{printf "%d", t*1000}'),volume=0.45[s2];\
[3:a]adelay=$(awk -v t="$F3" 'BEGIN{printf "%d", t*1000}')|$(awk -v t="$F3" 'BEGIN{printf "%d", t*1000}'),volume=0.45[s3];\
[4:a]adelay=200|200,volume=0.35[s4];\
[0:a][s1][s2][s3][s4]amix=inputs=5:duration=first:dropout_transition=0,volume=1.6[a]" \
  -map 0:v -map "[a]" $V $AAC "$E/sfxed.mp4"

# --- 10. SPEEDUP ------------------------------------------------------------
echo "== speedup ${SPD}x =="
ffmpeg -y -v error -i "$E/sfxed.mp4" \
  -filter_complex "[0:v]setpts=PTS/$SPD[v];[0:a]atempo=$SPD[a]" -map "[v]" -map "[a]" $V $AAC "$E/sped.mp4"

# --- 11. END CARD -----------------------------------------------------------
# Hard cut, hindi pinapabilis — card sya, hindi salita.
echo "== end card =="
ffmpeg -y -v error -t 1.4 -i "$O/endcard.mp4" -f lavfi -t 1.4 -i anullsrc=r=48000:cl=stereo \
  -map 0:v -map 1:a -shortest $V $AAC "$E/ec.mp4"
ffmpeg -y -v error -i "$E/sped.mp4" -i "$E/ec.mp4" \
  -filter_complex "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]" -map "[v]" -map "[a]" $V $AAC "$E/full.mp4"

# --- 12. MUSIC + LOUDNORM ---------------------------------------------------
# volume=0.20, hindi 0.10. Sa 0.10 ay wala kang naririnig (v1).
echo "== music + loudnorm =="
DUR=$(dur "$E/full.mp4")
FADE=$(awk -v d="$DUR" 'BEGIN{printf "%.2f", (d-1.6 > 0 ? d-1.6 : 0)}')
ffmpeg -y -v error -i "$E/full.mp4" -i "$MUSIC" -filter_complex \
  "[1:a]atrim=0:$DUR,volume=0.20,afade=t=in:st=0:d=1,afade=t=out:st=$FADE:d=1.6[m];\
   [0:a][m]amix=inputs=2:duration=first:dropout_transition=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
  -map 0:v -map "[a]" $V $AAC "$OUT"

echo
echo "✓ $OUT"
ffprobe -v error -show_entries format=duration:stream=width,height -of default=nw=1 "$OUT"
