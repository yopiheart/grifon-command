#!/usr/bin/env node
// Emit product-grammar drawtext filter chains for the KM-003 cut, cloned from
// api/_lib/renderFfmpeg.ts + drawPlan.ts + renderPresets.ts (IMPACT preset).
// Read-only reuse of the TUNED grammar — walang ine-edit sa product files.
//
//   node build-captions.mjs seg3|seg4|seg5   -> prints the -vf chain
//
// IMPACT caption: Anton 81px white, outline 6, shadow 4/4 black@0.6, y=1267,
//   chunk POP: alpha snap 0.06s + scale 85%->100% easeOutBack over 0.15s
//   (drawPlan.ts buildTextFilter anim==='pop', FLIP_C1/C3 = 1.70158/2.70158)
//
// KM-003 deltas vs KM-002:
//  - WALANG CROP prefix: ang mga plate ay pre-cropped na sa 864x1536 (9:16)
//    bago mag-Veo, kaya native full-bleed 1080x1920 na ang clips (lesson #2
//    solved at source). fps=30 lang ang natitira sa normalization.
//  - seg1 (hook) at seg2 (agitate) ay WALANG karaoke captions. seg1 = Neil
//    rule #4 (hook = overlay text lang). seg2 = ang 3 word-cards ang text
//    system doon; ang VO ay literal na binibigkas ang TIMBA/PLUNGER/BUKAS,
//    kaya ang karaoke ay verbatim duplication (Coherence QA rule 2).
//  - Chunk windows ay galing sa silencedetect -26dB d=0.09 speech blocks ng
//    bawat STS clip, hindi estimate.

// REPO-ROOT-RELATIVE on purpose: drawtext resolves fontfile against ffmpeg's
// CWD, and build-cut.sh runs ffmpeg from the repo root. A path relative to this
// script instead silently falls back to a default serif and throws away the
// whole IMPACT treatment (caught in KM-003 VERIFIER gate 4).
const FONTS = 'api/_lib/assets/fonts';
const ANTON = `${FONTS}/Anton-Regular.ttf`;
const C1 = 1.70158, C3 = 2.70158;
const CAP_FS = 81, CAP_Y = 1267, CAP_BORDER = 6;
const GOLD = '0xFFCC00';
const FPS = 'fps=30';

const pop = (s, e, text, color = 'white') => {
  const p = `min(1,max(0,(t-${s})/0.15))`;
  const ease = `(1-${C3}*pow(1-${p},3)+${C1}*pow(1-${p},2))`;
  return `drawtext=fontfile=${ANTON}:text='${text}':` +
    `fontsize='max(8,${CAP_FS}*(0.85+0.15*${ease}))':fontcolor=${color}:` +
    `shadowcolor=black@0.6:shadowx=4:shadowy=4:borderw=${CAP_BORDER}:bordercolor=black:` +
    `x=(w-text_w)/2:y=${CAP_Y}:alpha='min(1,max(0,(t-${s})/0.06))':` +
    `enable='between(t,${s},${e})'`;
};

// Windows below are in TRIMMED segment time (after the head trim of each seg).
const SEGS = {
  // s3 EPIPHANY — trim 0.00 -> 7.76. Speech blocks: 0-1.37 | 1.54-1.95 |
  // 2.08-2.61 | 2.79-3.48 | 3.57-5.09 | 5.49-7.56
  seg3: () => [FPS,
    pop(0.05, 0.70, 'Kapag puno na'),
    pop(0.70, 1.37, 'ang tangke,'),
    pop(1.54, 1.95, 'TIMBA', GOLD),
    pop(2.08, 2.61, 'at plunger,', GOLD),
    pop(2.79, 3.48, 'parang nagmo-mop'),
    pop(3.57, 4.30, 'habang umaapaw'),
    pop(4.30, 5.09, 'ang lababo.'),
    pop(5.49, 6.40, 'Delikado ring'),
    pop(6.40, 7.00, 'ipahawak sa'),
    pop(7.00, 7.56, 'kung sino-sino.'),
  ].join(','),

  // s4 SOLUTION — trim 0.11 -> 7.71. Speech blocks (shifted -0.11):
  // 0.00-2.09 | 2.46-4.95 | 5.40-5.85 | 6.40-7.34
  seg4: () => [FPS,
    pop(0.02, 0.55, 'Titingnan'),
    pop(0.55, 1.10, 'ang lagay'),
    pop(1.10, 1.55, 'ng tangke'),
    pop(1.55, 2.09, 'nang LIBRE.', GOLD),
    pop(2.46, 3.00, 'Ipapakita'),
    pop(3.00, 3.55, 'ang buong'),
    pop(3.55, 4.10, 'singil'),
    pop(4.10, 4.52, 'bago'),
    pop(4.52, 4.95, 'simulan.', GOLD),
    pop(5.40, 5.85, 'Walang dagdag,', GOLD),
    pop(6.40, 6.90, 'puwede kayong'),
    pop(6.90, 7.34, 'humindi.'),
  ].join(','),

  // s5 OBJECTION + CTA — trim 0.00 -> 7.81. Speech blocks: 0-1.00 |
  // 1.09-1.33 | 1.66-3.26 | 3.57-4.28 | 4.88-5.79 | 6.00-7.56
  seg5: () => [FPS,
    pop(0.03, 0.52, 'Alam ko'),
    pop(0.52, 1.00, 'ang iniisip'),
    pop(1.09, 1.33, 'nyo.'),
    pop(1.66, 2.20, 'Baka iba'),
    pop(2.20, 2.72, 'ang singil'),
    pop(2.72, 3.26, 'pagdating.'),
    pop(3.57, 4.28, 'Hindi dito.', GOLD),   // punchline — deliberately held
    pop(4.88, 5.35, 'Message nyo'),
    pop(5.35, 5.79, 'kami'),
    pop(6.00, 6.50, 'para sa'),
    pop(6.50, 7.05, 'libreng', GOLD),
    pop(7.05, 7.56, 'inspection.', GOLD),
  ].join(','),
};

const which = process.argv[2];
if (!SEGS[which]) { console.error('usage: build-captions.mjs seg3|seg4|seg5'); process.exit(2); }
process.stdout.write(SEGS[which]());
