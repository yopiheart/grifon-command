#!/usr/bin/env bash
# KM-003-AD assembly — rebuild the cut from committed sources.
# Run from repo root with ffmpeg on PATH (scripts/restore-hyperframes.ps1).
#
#   bash clients/oceanides/kuya-marvin/ads/km-003/build-cut.sh
#
# Sources (committed): plates/, plates-9x16/, clips/, audio-post/, overlays/
# Intermediates land in edit/ (gitignored) — this script is the rebuild recipe.
#
# Design notes
#  - NO letterbox crop anywhere: plates were pre-cropped to 864x1536 (9:16)
#    before Veo, so every clip is native full-bleed 1080x1920 (KM-002 lesson #2
#    fixed at source instead of in the edit).
#  - Overlays are composited at ORIGINAL speed, THEN the segment is sped up, so
#    Hyperframes timings and caption windows scale together automatically.
#  - concat FILTER with one re-encode (never demuxer -c copy — lesson #3).
set -euo pipefail

AD="clients/oceanides/kuya-marvin/ads/km-003"
C="$AD/clips"; A="$AD/audio-post"; O="$AD/overlays"; P="$AD/plates"; E="$AD/edit"
MUSIC="api/_lib/assets/music/testimonial.mp3"
SFX="api/_lib/assets/sfx"
mkdir -p "$E"

# Guard the caption font path: drawtext resolves fontfile against ffmpeg's CWD,
# and a miss falls back to a default serif WITHOUT failing the render.
[ -f "api/_lib/assets/fonts/Anton-Regular.ttf" ] || {
  echo "ERROR: run this from the repo root (Anton-Regular.ttf not found)" >&2; exit 1; }

V="-c:v libx264 -preset medium -crf 17 -pix_fmt yuv420p -r 30"
AAC="-c:a aac -b:a 192k -ar 48000 -ac 2"

# Pacing (skill Fix 5): Neil flagged KM-002 as mabagal. 1.10x on talking,
# 1.05x on the VO scene. End card stays 1.0x — it is the attribution beat.
SPD=1.10
SPD2=1.05

echo "== seg1: HOOK (two sub-cuts, the ~1.9s dead-pose gap removed) =="
# s1 speech: 1.19-2.99 ("Ilarawan ko ang banyo nyo ha.") then 4.94-6.72
# ("Sabihin nyo kung tama ako."). The 2s between is a held smile with no
# speech — cutting it is what makes this hook land in 4s.
ffmpeg -y -v error -ss 1.10 -to 3.05 -i "$A/s1-hook-sts.mp4" \
  -vf "fps=30,scale=1080:1920" $V $AAC "$E/s1a.mp4"
ffmpeg -y -v error -ss 4.88 -to 6.85 -i "$A/s1-hook-sts.mp4" \
  -vf "fps=30,scale=1080:1920" $V $AAC "$E/s1b.mp4"
ffmpeg -y -v error -i "$E/s1a.mp4" -i "$E/s1b.mp4" -filter_complex \
  "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]" -map "[v]" -map "[a]" $V $AAC "$E/s1-joined.mp4"
# hook overlay (transparent MOV) over the joined hook
ffmpeg -y -v error -i "$E/s1-joined.mp4" -i "$O/hook-overlay.mov" -filter_complex \
  "[0:v][1:v]overlay=0:0:shortest=1[v]" -map "[v]" -map 0:a $V $AAC "$E/seg1-raw.mp4"
ffmpeg -y -v error -i "$E/seg1-raw.mp4" -filter_complex \
  "[0:v]setpts=PTS/$SPD[v];[0:a]atempo=$SPD[a]" -map "[v]" -map "[a]" $V $AAC "$E/seg1.mp4"

echo "== seg2: AGITATE b-roll (hands-only stills + push-in + word-cards + VO) =="
# Anonymous-hands default: this is the CUSTOMER's bathroom, not Marvin's job.
# Card 1 (timba) owns 0.45-2.35, so the plate swap sits at 2.45 between cards.
ffmpeg -y -v error -loop 1 -t 2.45 -i "$P/s2a-hands-timba-toilet.png" \
  -vf "crop=864:1536:80:0,scale=2160:3840,zoompan=z='min(1.0+0.00095*on,1.10)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30,setsar=1" \
  -an $V "$E/s2a.mp4"
ffmpeg -y -v error -loop 1 -t 4.52 -i "$P/s2b-hands-plunger-toilet.png" \
  -vf "crop=864:1536:80:0,scale=2160:3840,zoompan=z='min(1.0+0.00062*on,1.10)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30,setsar=1" \
  -an $V "$E/s2b.mp4"
ffmpeg -y -v error -i "$E/s2a.mp4" -i "$E/s2b.mp4" -filter_complex \
  "[0:v][1:v]concat=n=2:v=1[v]" -map "[v]" -an $V "$E/s2-broll.mp4"
ffmpeg -y -v error -i "$E/s2-broll.mp4" -i "$O/s2-wordcards.mov" -i "$A/s2-vo.mp3" -filter_complex \
  "[0:v][1:v]overlay=0:0:shortest=1[v]" -map "[v]" -map 2:a $V $AAC "$E/seg2-raw.mp4"
ffmpeg -y -v error -i "$E/seg2-raw.mp4" -filter_complex \
  "[0:v]setpts=PTS/$SPD2[v];[0:a]atempo=$SPD2[a]" -map "[v]" -map "[a]" $V $AAC "$E/seg2.mp4"

echo "== seg3: EPIPHANY (captions) =="
CAP3=$(node "$AD/build-captions.mjs" seg3)
ffmpeg -y -v error -ss 0 -to 7.76 -i "$A/s3-epiphany-sts.mp4" -vf "$CAP3" $V $AAC "$E/seg3-raw.mp4"
ffmpeg -y -v error -i "$E/seg3-raw.mp4" -filter_complex \
  "[0:v]setpts=PTS/$SPD[v];[0:a]atempo=$SPD[a]" -map "[v]" -map "[a]" $V $AAC "$E/seg3.mp4"

echo "== segT: OCEANIDES title-card slam (hard cut, 1.2s) =="
ffmpeg -y -v error -i "$O/title-card.mp4" -f lavfi -t 1.2 -i anullsrc=r=48000:cl=stereo \
  -vf "fps=30,scale=1080:1920" -map 0:v -map 1:a -t 1.2 $V $AAC "$E/segT.mp4"

echo "== seg4: SOLUTION (captions) =="
CAP4=$(node "$AD/build-captions.mjs" seg4)
ffmpeg -y -v error -ss 0.11 -to 7.71 -i "$A/s4-solution-sts.mp4" -vf "$CAP4" $V $AAC "$E/seg4-raw.mp4"
ffmpeg -y -v error -i "$E/seg4-raw.mp4" -filter_complex \
  "[0:v]setpts=PTS/$SPD[v];[0:a]atempo=$SPD[a]" -map "[v]" -map "[a]" $V $AAC "$E/seg4.mp4"

echo "== seg5: OBJECTION + CTA (captions) =="
CAP5=$(node "$AD/build-captions.mjs" seg5)
ffmpeg -y -v error -ss 0 -to 7.81 -i "$A/s5-objection-sts.mp4" -vf "$CAP5" $V $AAC "$E/seg5-raw.mp4"
ffmpeg -y -v error -i "$E/seg5-raw.mp4" -filter_complex \
  "[0:v]setpts=PTS/$SPD[v];[0:a]atempo=$SPD[a]" -map "[v]" -map "[a]" $V $AAC "$E/seg5.mp4"

echo "== seg6: END CARD + attribution VO =="
ffmpeg -y -v error -i "$O/endcard.mp4" -i "$A/s6-endcard-vo.mp3" \
  -vf "fps=30,scale=1080:1920" -map 0:v -map 1:a -t 5.0 $V $AAC "$E/seg6.mp4"

echo "== concat (FILTER, one re-encode) =="
ffmpeg -y -v error \
  -i "$E/seg1.mp4" -i "$E/seg2.mp4" -i "$E/seg3.mp4" -i "$E/segT.mp4" \
  -i "$E/seg4.mp4" -i "$E/seg5.mp4" -i "$E/seg6.mp4" -filter_complex \
  "[0:v][0:a][1:v][1:a][2:v][2:a][3:v][3:a][4:v][4:a][5:v][5:a][6:v][6:a]concat=n=7:v=1:a=1[v][a]" \
  -map "[v]" -map "[a]" $V $AAC "$E/cut-nofx.mp4"

# Segment boundary times on the assembled timeline (for flashes + SFX).
D() { ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$1"; }
T1=$(D "$E/seg1.mp4")
T2=$(awk "BEGIN{print $T1+$(D "$E/seg2.mp4")}")
T3=$(awk "BEGIN{print $T2+$(D "$E/seg3.mp4")}")
T4=$(awk "BEGIN{print $T3+$(D "$E/segT.mp4")}")
T5=$(awk "BEGIN{print $T4+$(D "$E/seg4.mp4")}")
T6=$(awk "BEGIN{print $T5+$(D "$E/seg5.mp4")}")
echo "boundaries: hook=$T1 broll=$T2 epiph=$T3 card=$T4 sol=$T5 obj=$T6"

echo "== flash transitions (0.07s, 3 MAX per skill lesson #7) =="
# 1/3 out of the hook, 2/3 into the OCEANIDES slam, 3/3 into the CTA scene.
ffmpeg -y -v error -i "$E/cut-nofx.mp4" -filter_complex \
  "[0:v]drawbox=x=0:y=0:w=iw:h=ih:color=white@0.82:t=fill:enable='between(t,$T1,$T1+0.07)+between(t,$T3,$T3+0.07)+between(t,$T5,$T5+0.07)'[v]" \
  -map "[v]" -map 0:a $V $AAC "$E/cut-flash.mp4"

echo "== music bed + SFX + loudnorm -14 LUFS =="
# Every beat transition gets an audio event (Coherence Stage 2 rule 7): whoosh
# on the three flashes, a softer swish on the two un-flashed cuts (T2 b-roll ->
# epiphany, T4 card -> solution), boom under the brand slam, ding + pop on the
# end card.
# LEAD, don't mask (rule 8): transition SFX fire 0.12s BEFORE the cut so they
# decay into the incoming line instead of covering its first word — seg2 and
# seg5 both open on speech at t~0.
PRE=0.12
at() { awk "BEGIN{printf \"%d\", ($1-$PRE)*1000}"; }
ffmpeg -y -v error -i "$E/cut-flash.mp4" \
  -i "$MUSIC" \
  -i "$SFX/whoosh-v1.mp3" -i "$SFX/whoosh-v2.mp3" -i "$SFX/boom-v2.mp3" \
  -i "$SFX/whoosh-v3.mp3" -i "$SFX/ding-v2.mp3" -i "$SFX/pop-v3.mp3" \
  -i "$SFX/swish-v2.mp3" -i "$SFX/swish-v3.mp3" \
  -filter_complex "\
[1:a]volume=0.13,afade=t=out:st=$(awk "BEGIN{print $T6+3.6}"):d=1.4[mus];\
[2:a]volume=0.55,adelay=$(at $T1)|$(at $T1)[fx1];\
[3:a]volume=0.55,adelay=$(at $T3)|$(at $T3)[fx2];\
[4:a]volume=0.50,adelay=$(at $T3)|$(at $T3)[fx3];\
[5:a]volume=0.55,adelay=$(at $T5)|$(at $T5)[fx4];\
[6:a]volume=0.45,adelay=$(awk "BEGIN{printf \"%d\", $T6*1000}")|$(awk "BEGIN{printf \"%d\", $T6*1000}")[fx5];\
[7:a]volume=0.40,adelay=$(awk "BEGIN{printf \"%d\", ($T6+2.55)*1000}")|$(awk "BEGIN{printf \"%d\", ($T6+2.55)*1000}")[fx6];\
[8:a]volume=0.34,adelay=$(at $T2)|$(at $T2)[fx7];\
[9:a]volume=0.30,adelay=$(at $T4)|$(at $T4)[fx8];\
[0:a][mus][fx1][fx2][fx3][fx4][fx5][fx6][fx7][fx8]amix=inputs=10:duration=first:dropout_transition=0:normalize=0,\
loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
  -map 0:v -map "[a]" -c:v copy $AAC "$AD/KM-003-AD-v1.mp4"

echo "== done: $AD/KM-003-AD-v1.mp4 =="
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate \
  -show_entries format=duration -of default=nw=1 "$AD/KM-003-AD-v1.mp4"
