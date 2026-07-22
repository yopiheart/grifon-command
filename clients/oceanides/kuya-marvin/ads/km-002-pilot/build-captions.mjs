#!/usr/bin/env node
// Emit product-grammar drawtext filter chains for the KM-002 cut, cloned from
// api/_lib/renderFfmpeg.ts + drawPlan.ts + renderPresets.ts (IMPACT preset).
// Read-only reuse of the TUNED grammar — walang ine-edit sa product files.
//
//   node build-captions.mjs seg1|seg2|seg3|seg4|seg5   -> prints the -vf chain
//
// IMPACT caption: Anton 81px white, outline 6, shadow 4/4 black@0.6, y=1267,
//   chunk POP: alpha snap 0.06s + scale 85%->100% easeOutBack over 0.15s
//   (drawPlan.ts buildTextFilter anim==='pop', FLIP_C1/C3 = 1.70158/2.70158)
// IMPACT hook: title-stack, Montserrat-ExtraBold, word cadence 0.32s, SLAM
//   reveal (y drop 120px pow(1-p,4) over 0.30s, alpha snap 0.15s), gold power word.
// RULE (Neil 2026-07-23): hook scene = overlay text LANG, walang karaoke captions.

const FONTS = '../../../../../api/_lib/assets/fonts';
const ANTON = `${FONTS}/Anton-Regular.ttf`;
const MONT = `${FONTS}/Montserrat-ExtraBold.ttf`;
const C1 = 1.70158, C3 = 2.70158;
const CAP_FS = 81, CAP_Y = 1267, CAP_BORDER = 6;
const GOLD = '0xFFCC00', HOOK_GOLD = '0xFFD400';
const CROP = 'crop=908:1614:86:153,scale=1080:1920,fps=30';

const pop = (s, e, text, color = 'white') => {
  const p = `min(1,max(0,(t-${s})/0.15))`;
  const ease = `(1-${C3}*pow(1-${p},3)+${C1}*pow(1-${p},2))`;
  return `drawtext=fontfile=${ANTON}:text='${text}':` +
    `fontsize='max(8,${CAP_FS}*(0.85+0.15*${ease}))':fontcolor=${color}:` +
    `shadowcolor=black@0.6:shadowx=4:shadowy=4:borderw=${CAP_BORDER}:bordercolor=black:` +
    `x=(w-text_w)/2:y=${CAP_Y}:alpha='min(1,max(0,(t-${s})/0.06))':` +
    `enable='between(t,${s},${e})'`;
};

// title-stack slam word: per-word x (advRatio 0.64 estimate), staggered start,
// y drops 120px with pow(1-p,4), alpha snaps in 0.15s, holds to segEnd.
const slamWord = (start, end, text, x, y, fs, color) => {
  const p = `min(1,max(0,(t-${start})/0.30))`;
  return `drawtext=fontfile=${MONT}:text='${text}':fontsize=${fs}:fontcolor=${color}:` +
    `shadowcolor=black@0.6:shadowx=4:shadowy=4:borderw=${Math.round(fs * 0.06)}:bordercolor=black:` +
    `x=${x}:y='${y}+120*pow(1-${p},4)':alpha='min(1,max(0,(t-${start})/0.15))':` +
    `enable='between(t,${start},${end})'`;
};

// Per-LINE slam (centered by ffmpeg — walang width estimation, walang drift):
// 3-line title stack, staggered 0.45s, gold ang power line. Same slam formula.
const hookStack = (segEnd) => {
  const fs = 96;
  return [
    slamWord('0.20', segEnd, 'TAKOT KA', '(w-text_w)/2', 200, fs, 'white'),
    slamWord('0.65', segEnd, 'TUMAWAG', '(w-text_w)/2', 322, fs, 'white'),
    slamWord('1.10', segEnd, 'NG PASIPSIP?', '(w-text_w)/2', 444, fs, HOOK_GOLD),
  ].join(',');
};

const SEGS = {
  // seg1: HOOK — overlay text LANG (Neil rule), walang karaoke.
  seg1: () => `${CROP},${hookStack(6.0)}`,
  seg2: () => [
    pop(0.30, 0.85, 'Una,'),
    pop(0.85, 1.75, 'chine-check muna'),
    pop(1.75, 2.65, 'namin ang tangke nyo.'),
    pop(2.65, 3.55, 'Libre yun.', GOLD),
  ].join(','), // seg2 ay stills-based; CROP hindi kailangan (native 1080x1920 na ang zoompan chain)
  seg3: () => [CROP,
    pop(0.05, 0.90, 'Pangalawa,'),
    pop(1.35, 2.40, 'sasabihin namin'),
    pop(2.40, 3.45, 'ang presyo'),
    pop(3.79, 4.45, 'bago kami'),
    pop(4.45, 5.13, 'magsimula.'),
    pop(5.48, 6.70, 'Walang dagdag.', GOLD),
  ].join(','),
  seg4: () => [CROP,
    pop(0.05, 0.90, 'Pangatlo,'),
    pop(1.92, 2.90, 'kapag hindi kayo'),
    pop(2.90, 3.80, 'payag sa presyo,'),
    pop(4.54, 5.40, 'aalis kami'),
    pop(5.40, 6.25, 'nang maayos.'),
  ].join(','),
  seg5: () => [CROP,
    pop(0.64, 1.91, 'Ganun kasimple.'),
    pop(2.31, 3.80, 'Libreng inspection,', GOLD),
    pop(3.80, 5.20, 'i-message nyo'),
    pop(5.20, 6.40, 'lang kami.'),
  ].join(','),
};

const which = process.argv[2];
if (!SEGS[which]) { console.error('usage: build-captions.mjs seg1|seg2|seg3|seg4|seg5'); process.exit(2); }
process.stdout.write(SEGS[which]());
