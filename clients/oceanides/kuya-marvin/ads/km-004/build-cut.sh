#!/usr/bin/env bash
# KM-004-AD — buong assembly. Recipe ito, hindi output; gitignored ang edit/.
#
#   export PATH="$PWD/.tools/ffmpeg/ffmpeg-8.1.2-essentials_build/bin:$PATH"
#   bash clients/oceanides/kuya-marvin/ads/km-004/build-cut.sh
#
# LABING-ISANG BEAT, 720x1280. Ang mga oras ay galing sa speechmap.json
# (speechcut.mjs) — hindi sila hinuhulaan.
#
# ANG LIMANG LEVER NA WALA PA SA GB-001 v3 (EDIT-PLAN.md):
#  1. PER-WORD INVERT na caption. Naka-park ang spotlight mula 2026-07-27 kasi
#     hindi kayang paiba-ibahin ng drawtext ang kulay ng ISANG salita sa loob ng
#     parirala. Sa HTML ay span lang sya. Dito sya unang naitayo.
#  2. HTML/Hyperframes sa SIYAM na overlay, hindi dalawa. Cards sa 720x900 na
#     naka-center sa y=190 = eksaktong feed-safe band (aral 17).
#  3. Kuwento ang galaw ng b-roll: sa beat 4 ay naglalakad ang camera mula
#     phone papuntang papel habang sinasabi ang "isa ang presyo sa phone, iba
#     na sa receipt."
#  4. STATIC sa generation, PUNCH-IN dito sa edit (MOTION DOCTRINE). Sinukat sa
#     GB-001: ~7% lang ang push-in ni Veo matapos ang speech-cut, nasa ilalim ng
#     makikita. Dito tayo ang may hawak ng lakas.
#  5. 🔴 KATAHIMIKAN BILANG INSTRUMENTO. Nawawala ang musika 0.5s bago ang
#     `UUWI KAMI.` at bumabalik sa CTA. Walang ad natin ang gumamit nito.
#
# ANG BATAS NA ISANG-TEXT-LAYER-LANG, AT KUNG PAANO SYA NILUTAS DITO
# Ang beat 2 at 4 ay may SLAM; ang beat 3, 6 at 10 ay may CAPTION. Walang beat
# na may dalawa nang sabay. Ang hati ay may dahilan: ang b-roll ay gumagalaw na
# mag-isa, kaya slam ang bagay dun; ang talking beat ay static na mukha, kaya
# doon kailangan ang churn ng caption (P1, 11 corroborations). Hindi ginagamit
# ang captions/b2.mov at b4.mov — sinadya, hindi kalimutan.
#
# WALANG CAPTION ANG HOOK — aral 4, digmaan sa atensyon ang overlay at karaoke.
set -euo pipefail

AD="clients/oceanides/kuya-marvin/ads/km-004"
C="$AD/clips"; B="$AD/broll"; O="$AD/overlays"; P="$AD/captions"; A="$AD/audio"
E="$AD/edit"; M="api/_lib/assets/music"; S="api/_lib/assets/sfx"
mkdir -p "$E"

W=720; H=1280; FPS=30
OUT="$AD/KM-004-AD-v1.mp4"

# Guard: kapag nawawala ang isang piraso, huminto AGAD. Ang tahimik na kulang na
# input ay lumalabas na itim na frame sa gitna ng ad at hindi mo mapapansin.
for f in "$C/r1.mp4" "$C/r2.mp4" "$C/r3.mp4" "$C/r4.mp4" "$C/r5.mp4" \
         "$B/b1.mp4" "$B/b2.mp4" "$B/page.mp4" \
         "$O/hook.mov" "$O/slam-toilet.mov" "$O/slam-resibo.mov" "$O/slam-nakasulat.mov" \
         "$O/slam-uuwi.mov" "$O/quote-card.mp4" "$O/ticket-card.mp4" "$O/endcard.mp4" \
         "$P/b3.mov" "$P/b10.mov" "$O/slam-itinatago.mov" \
         "$A/vo-b2.mp3" "$A/vo-b4.mp3" "$A/vo-b5.mp3" "$A/vo-b8.mp3" \
         "$M/testimonial.mp3" "$S/whoosh-v2.mp3"; do
  [ -f "$f" ] || { echo "KULANG: $f"; exit 1; }
done

# --- BEAT 1..11 -------------------------------------------------------------
# talking() — hiniwa sa speech window, PUNCH-IN sa edit, tapos overlay.
#   $1 clip  $2 in  $3 dur  $4 overlay|-  $5 out
talking() {
  local src=$1 tin=$2 dur=$3 ovl=$4 out=$5
  # 🔴 awk, HINDI bc. Walang `bc` sa cafe PC na to at TAHIMIK syang bumabagsak:
  # nagiging blangko ang bilang ng frame, kaya `on/(-1)` ang naging exponent ng
  # punch-in at NAWALA ang buong galaw sa apat na talking beat — habang mukhang
  # matagumpay pa rin ang build. Isa na naman itong bagsak na mukhang sagot.
  local nframes; nframes=$(awk "BEGIN{printf \"%d\", $dur*$FPS}")
  local zoom="fps=$FPS,scale=$((W*2)):-1,zoompan=z='min(1.0+0.06*on/($nframes-1),1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${W}x${H}:fps=$FPS,setsar=1"
  if [ "$ovl" = "-" ]; then
    ffmpeg -y -v error -ss "$tin" -t "$dur" -i "$src" \
      -vf "$zoom" -af "aresample=48000" \
      -c:v libx264 -crf 17 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -ac 2 "$out"
  else
    ffmpeg -y -v error -ss "$tin" -t "$dur" -i "$src" -i "$ovl" \
      -filter_complex "[0:v]$zoom[v];[1:v]setpts=PTS-STARTPTS[o];[v][o]overlay=0:0:shortest=0[vo]" \
      -map "[vo]" -map 0:a -t "$dur" -af "aresample=48000" \
      -c:v libx264 -crf 17 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -ac 2 "$out"
  fi
}

# still() — b-roll o card, may sariling VO. Nasa loob na ng source ang galaw.
#   $1 video  $2 dur  $3 vo|-  $4 overlay|-  $5 out
still() {
  local src=$1 dur=$2 vo=$3 ovl=$4 out=$5 zoom=${6:-}
  # 🔴 ANOD SA CARD (Neil, 2026-08-03). Nahuli ng freezedetect na may 1.9s at
  # 1.87s na GANAP na static sa quote card at ticket card. Sadya nga silang
  # card, pero ang ganap na hindi gumagalaw ay nababasa ring "naghang" —
  # kararating lang natin sa tatlong totoong hang, at ayaw nating maulit ang
  # basa. Napakabagal na push-in (1.00 -> 1.03) para hindi sya kailanman patay,
  # pero hindi rin nakakaabala sa pagbabasa ng presyo.
  local vin="[0:v]scale=$W:$H,setsar=1,fps=$FPS[v]"
  if [ -n "$zoom" ]; then
    local nf; nf=$(awk "BEGIN{printf \"%d\", $dur*$FPS}")
    vin="[0:v]fps=$FPS,scale=$((W*2)):-1,zoompan=z='min(1.0+0.03*on/($nf-1),1.03)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${W}x${H}:fps=$FPS,setsar=1[v]"
  fi
  local vmap="[v]"
  local inputs=(-i "$src")
  if [ "$ovl" != "-" ]; then
    inputs+=(-i "$ovl")
    vin="$vin;[1:v]setpts=PTS-STARTPTS[o];[v][o]overlay=0:0[vo]"
    vmap="[vo]"
  fi
  if [ "$vo" != "-" ]; then
    inputs+=(-i "$vo")
    local ai=$([ "$ovl" != "-" ] && echo 2 || echo 1)
    ffmpeg -y -v error "${inputs[@]}" \
      -filter_complex "$vin;[${ai}:a]aresample=48000,apad[a]" \
      -map "$vmap" -map "[a]" -t "$dur" \
      -c:v libx264 -crf 17 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -ac 2 "$out"
  else
    ffmpeg -y -v error "${inputs[@]}" -f lavfi -t "$dur" -i anullsrc=r=48000:cl=stereo \
      -filter_complex "$vin" \
      -map "$vmap" -map "$(( ${#inputs[@]} / 2 )):a" -t "$dur" \
      -c:v libx264 -crf 17 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -ac 2 "$out"
  fi
}

# splice() — tahiin ang mga piraso ng SALITA at tanggalin ang pahinga sa loob ng
# pangungusap, tapos overlay. Ginawa 2026-08-03 matapos hulihin ng render_audit
# ang dalawang putol na linya:
#   beat 3 — "Yung singil pagdating ng truck" LANG ang naririnig; naputol ang
#            "Pero ang mas nakakatakot" dahil may 1.04s na pahinga sa gitna at
#            ISANG span lang ang pinili ng speechcut ko.
#   beat 9 — nawala ang buong "Hindi ka namin pipilitin", ang pinaka-nakakadisarma
#            na kalahati ng linya, dahil sa 1.64s na pahinga bago sya.
# Nasa clip pala pareho. Ang hiwa ko ang pumutol sa kanila, hindi si Veo.
# ⚠️ Hindi ko naririnig ang audio. HINDI KO SANA TO NAKITA. Ang `render_audit`
# lang ang nakikinig, at ito mismo ang dahilan kung bakit sya sapilitan.
#   $1 clip  $2 out  $3 overlay|-  $4.. mga pares na "in dur"
splice() {
  local src=$1 out=$2 ovl=$3; shift 3
  local i=0 parts=() inputs=() filt=""
  while [ $# -gt 0 ]; do
    ffmpeg -y -v error -ss "$1" -t "$2" -i "$src" -af "aresample=48000" \
      -c:v libx264 -crf 17 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -ac 2 "$E/.sp$i.mp4"
    parts+=("$E/.sp$i.mp4"); i=$((i+1)); shift 2
  done
  for p in "${parts[@]}"; do inputs+=(-i "$p"); done
  for ((j=0;j<i;j++)); do filt="$filt[$j:v][$j:a]"; done
  ffmpeg -y -v error "${inputs[@]}" -filter_complex "${filt}concat=n=$i:v=1:a=1[v][a]" \
    -map "[v]" -map "[a]" -c:v libx264 -crf 17 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k "$E/.spj.mp4"
  local dur; dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$E/.spj.mp4")
  local nf; nf=$(awk "BEGIN{printf \"%d\", $dur*$FPS}")
  local zoom="fps=$FPS,scale=$((W*2)):-1,zoompan=z='min(1.0+0.06*on/($nf-1),1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${W}x${H}:fps=$FPS,setsar=1"
  ffmpeg -y -v error -i "$E/.spj.mp4" -i "$ovl" \
    -filter_complex "[0:v]$zoom[v];[1:v]setpts=PTS-STARTPTS[o];[v][o]overlay=0:0:shortest=0[vo]" \
    -map "[vo]" -map 0:a -c:v libx264 -crf 17 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -ac 2 "$out"
  rm -f "$E"/.sp*.mp4
}

# cropped() — kapareho ng talking() pero may paunang CROP.
#
# 🔴 BAKIT SYA UMIIRAL. May SARILING SUBTITLE si Veo na nakabaon sa mga pixel ng
# r3: "..ang buong presyo...." Nakasulat sa prompt ang "no captions, no text
# overlays" AT nasa negative tail ang "text, watermark, writing, letters,
# subtitles". Binalewala nya pareho. Nakikipagbangayan sya sa sarili nating
# caption at hindi sya matatanggal nang walang bagong render — at ubos na ang
# budget. Kaya crop.
#
# Kasunod nun: ibinababa ng crop ang mukha nya sa frame, kaya ang caption sa
# y=845 ay tumatama na sa BIBIG. Face-safe violation. Kaya walang caption ang
# beat 6 — slam sa itaas na lang, kung saan malinis pa rin ang frame.
#   $1 clip  $2 in  $3 dur  $4 overlay  $5 out  $6 crop
cropped() {
  local src=$1 tin=$2 dur=$3 ovl=$4 out=$5 crp=$6
  local nf; nf=$(awk "BEGIN{printf \"%d\", $dur*$FPS}")
  local zoom="$crp,fps=$FPS,scale=$((W*2)):-1,zoompan=z='min(1.0+0.06*on/($nf-1),1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${W}x${H}:fps=$FPS,setsar=1"
  ffmpeg -y -v error -ss "$tin" -t "$dur" -i "$src" -i "$ovl" \
    -filter_complex "[0:v]$zoom[v];[1:v]setpts=PTS-STARTPTS[o];[v][o]overlay=0:0:shortest=0[vo]" \
    -map "[vo]" -map 0:a -t "$dur" -af "aresample=48000" \
    -c:v libx264 -crf 17 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -ac 2 "$out"
}

echo "beat 1  hook"                 ; talking "$C/r1.mp4" 0.000 2.570 "$O/hook.mov"           "$E/s01.mp4"
echo "beat 2  plunger + SLAM"       ; still   "$B/b1.mp4"       3.100 "$A/vo-b2.mp3" "$O/slam-toilet.mov"    "$E/s02.mp4"
echo "beat 3  takot (SPLICED)"      ; splice  "$C/r2.mp4" "$E/s03.mp4" "$P/b3.mov"  0.000 1.56  2.440 0.92  3.810 0.86  5.030 0.55
echo "beat 4  phone->papel + SLAM"  ; still   "$B/b2.mp4"       2.600 "$A/vo-b4.mp3" "$O/slam-resibo.mov"    "$E/s04.mp4"
echo "beat 5  quote card"           ; still   "$O/quote-card.mp4" 2.700 "$A/vo-b5.mp3" -      "$E/s05.mp4" anod
echo "beat 6  mekanismo (CROPPED)"   ; cropped "$C/r3.mp4" 0.622 3.868 "$O/slam-itinatago.mov" "$E/s06.mp4" "crop=793:1410:143:0"
echo "beat 7  totoong page + SLAM"  ; still   "$B/page.mp4"     1.200 -            "$O/slam-nakasulat.mov"   "$E/s07.mp4"
echo "beat 8  ticket card"          ; still   "$O/ticket-card.mp4" 3.200 "$A/vo-b8.mp3" -     "$E/s08.mp4" anod
echo "beat 9  UUWI KAMI (SPLICED)"  ; splice  "$C/r4.mp4" "$E/s09.mp4" "$O/slam-uuwi.mov"  0.000 2.10  3.200 0.90  5.560 1.64
echo "beat 10 CTA + CAPTION"        ; talking "$C/r5.mp4" 2.334 3.568 "$P/b10.mov"            "$E/s10.mp4"
echo "beat 11 end card"             ; still   "$O/endcard.mp4"  1.800 -            -                          "$E/s11.mp4" anod

# --- CONCAT -----------------------------------------------------------------
# 🔴 CONCAT FILTER, HINDI demuxer -c copy. Ang demuxer ay nagpuputol ng DTS at
# nagbubunga ng itim na frame sa bawat dugtong (aral 3).
echo "concat"
ffmpeg -y -v error \
  -i "$E/s01.mp4" -i "$E/s02.mp4" -i "$E/s03.mp4" -i "$E/s04.mp4" -i "$E/s05.mp4" -i "$E/s06.mp4" \
  -i "$E/s07.mp4" -i "$E/s08.mp4" -i "$E/s09.mp4" -i "$E/s10.mp4" -i "$E/s11.mp4" \
  -filter_complex "[0:v][0:a][1:v][1:a][2:v][2:a][3:v][3:a][4:v][4:a][5:v][5:a][6:v][6:a][7:v][7:a][8:v][8:a][9:v][9:a][10:v][10:a]concat=n=11:v=1:a=1[v][a]" \
  -map "[v]" -map "[a]" -c:v libx264 -crf 17 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k "$E/cut.mp4"

# --- FLASH sa tatlong cut ---------------------------------------------------
# Aral 7: flash pagkatapos ng hook at kada pangalawang cut, MAX 3. Ang mga oras
# ay ang simula ng beat 4, 7 at 9 — kinuwenta mula sa haba sa itaas.
#   b4 = 9.560   b7 = 18.728   b9 = 23.128
echo "flash"
ffmpeg -y -v error -i "$E/cut.mp4" \
  -vf "eq=brightness='0.45*(between(t,9.560,9.630)+between(t,18.728,18.798)+between(t,23.128,23.198))'" \
  -c:v libx264 -crf 17 -preset slow -pix_fmt yuv420p -c:a copy "$E/flash.mp4"

# --- MUSIC + SFX + ANG KATAHIMIKAN ------------------------------------------
# 🔴 ANG SORPRESA. Nawawala ang musika sa 23.52 (0.5s bago ang `UUWI KAMI.`) at
# bumabalik sa 28.27 (simula ng CTA). Sa feed na puro ingay, ang biglang
# pagkawala ng tunog ay pisikal na humahatak ng atensyon pabalik — at doon
# eksaktong nakaupo ang pinakamalakas nating linya. May 0.12s na ramp sa magkabilang
# dulo para hindi sya kumalampag.
#
# Music sa volume=0.20, HINDI 0.10. Sa 0.10 ay wala kang naririnig (Neil, GB-001).
echo "musika + SFX + katahimikan"
ffmpeg -y -v error -i "$E/flash.mp4" \
  -stream_loop -1 -i "$M/testimonial.mp3" \
  -i "$S/whoosh-v2.mp3" -i "$S/whoosh-v2.mp3" -i "$S/whoosh-v2.mp3" \
  -filter_complex "\
[1:a]volume='0.20*if(between(t,22.83,23.83), 0, if(between(t,22.71,22.83), (22.83-t)/0.12, if(between(t,23.83,23.95), (t-23.83)/0.12, 1)))':eval=frame,atrim=0:34,asetpts=PTS-STARTPTS[mus];\
[2:a]adelay=9560|9560,volume=0.5[w1];\
[3:a]adelay=18728|18728,volume=0.5[w2];\
[4:a]adelay=23128|23128,volume=0.5[w3];\
[0:a][mus][w1][w2][w3]amix=inputs=5:duration=first:dropout_transition=0:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k "$E/mixed.mp4"

# --- SPEEDUP ----------------------------------------------------------------
# 33.6s ay masyadong mahaba: 36.8s ang KM-003 at 8% lang ang umabot sa dulo.
# 1.12x ang kisame ng PACING Fix 5, at doon sya lumalabas na ~30s. Ang bilis ay
# ginagawa DITO, hindi sa pagputol ng beat — ang bawat beat ay may trabaho.
echo "speedup 1.12x"
ffmpeg -y -v error -i "$E/mixed.mp4" \
  -filter_complex "[0:v]setpts=PTS/1.12[v];[0:a]atempo=1.12[a]" \
  -map "[v]" -map "[a]" -r $FPS \
  -c:v libx264 -crf 17 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart "$OUT"

echo ""
echo "TAPOS: $OUT"
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate \
  -show_entries format=duration,size -of default=noprint_wrappers=1 "$OUT"
