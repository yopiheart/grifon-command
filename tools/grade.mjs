#!/usr/bin/env node
/**
 * grade.mjs — named colour grades for the house-model library (and any still).
 *
 * WHY THIS EXISTS
 * The grade was the one thing that never copied over from Neil's reference set.
 * Describing it in the generation prompt ("warm lifted", "muted filmic") gives a
 * different result every run — it is a description, not a preset. So the grade
 * moves OUT of the prompt and INTO post, where it is deterministic and one image
 * can become five looks with no regeneration.
 *
 * This is a Surface-A lever per workflows/believability_dna.md: post-production,
 * the AI never sees it, so it carries ZERO slop risk.
 *
 * ⛔ Deliberately NOT shipped: a teal-orange "cinematic" grade. believability_dna.md
 * is explicit that it pushes UGC toward reading as an ad, which is the exact thing
 * the raw/polished lanes exist to avoid. If a premium brand ever needs it, add it
 * to the photoshoot lane only and say so out loud.
 *
 *   node tools/grade.mjs --preset ugc-flat --in a.jpg --out b.jpg
 *   node tools/grade.mjs --preset warm-lifted --in dir/ --out outdir/
 *   node tools/grade.mjs --export-cube warm-lifted --out luts/warm-lifted.cube
 *   node tools/grade.mjs --list
 *   node tools/grade.mjs --contact a.jpg --out strip.jpg    # every preset, side by side
 */
import { spawnSync } from 'node:child_process';
import { readdirSync, statSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join, basename, dirname, extname } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const FFMPEG = require('ffmpeg-static');

/**
 * Each grade is an ffmpeg filter chain. Read top to bottom:
 *   curves      — where the blacks sit and how the highlights roll off
 *   eq          — global contrast / saturation
 *   colorbalance— the cast, split across shadows (s) / midtones (m) / highlights (h)
 *   noise       — grain, which ADDS imperfection (a realism lever, not a defect)
 */
const PRESETS = {
  // raw-ugc. The believability_dna "UGC LUT": flat, slightly desaturated, faint
  // warm phone cast, sensor noise. It ADDS imperfection on purpose (~+5% realism).
  'ugc-flat': {
    lane: 'raw-ugc',
    note: 'Patag, bahagyang kupas, may bahid ng init ng phone, may noise. Nagdadagdag ng imperfection.',
    chain: "curves=all='0/0.045 0.5/0.5 1/0.965',eq=contrast=0.92:saturation=0.88,colorbalance=rs=0.02:gs=0.01:bs=-0.02:rm=0.01:bm=-0.01,noise=alls=7:allf=u",
  },
  'warm-lifted': {
    lane: 'polished',
    note: 'Nakataas na itim, mainit na highlight, may bahagyang ulap. Golden hour.',
    // Tuned 2026-08-02: the first pass read golden-and-contrasty rather than lifted —
    // the blue pulldown was fighting the black lift. More lift, softer contrast, and
    // the warmth carried by colorbalance alone.
    chain: "curves=all='0/0.10 0.5/0.55 1/0.97',eq=contrast=0.86:saturation=0.96,colorbalance=rh=0.07:gh=0.02:bh=-0.06:rm=0.04:bm=-0.02:rs=0.03",
  },
  'airy-clean': {
    lane: 'polished',
    note: 'Maliwanag, mababa ang kontrast, malamig at neutral ang puti. Cafe at umaga.',
    chain: "curves=all='0/0.05 0.5/0.56 1/1',eq=contrast=0.9:saturation=0.95:brightness=0.03,colorbalance=rh=-0.02:bh=0.03",
  },
  punchy: {
    lane: 'polished',
    note: 'Matingkad, malalim ang asul, mas mataas ang kontrast. Beach at tanghali.',
    chain: "eq=contrast=1.12:saturation=1.18,curves=b='0/0.02 0.5/0.5 1/1',colorbalance=bs=0.04:bm=0.02",
  },
  'soft-pastel': {
    lane: 'polished',
    note: 'Nakataas na itim, mababang kontrast, rosas at lila. Dapithapon.',
    chain: "curves=all='0/0.09 0.5/0.53 1/0.97',eq=contrast=0.86:saturation=0.9,colorbalance=rs=0.05:bs=0.06:rm=0.02:bm=0.03:rh=0.03:bh=0.02,noise=alls=4:allf=u",
  },
  'muted-film': {
    lane: 'polished',
    note: 'Kupas, gatas ang itim, malamig, may butil. Documentary at editorial.',
    chain: "curves=all='0/0.075 0.5/0.5 1/0.955',eq=contrast=0.9:saturation=0.78,colorbalance=rs=-0.02:gs=0.01:bs=0.04:rm=-0.01,noise=alls=8:allf=u",
  },
  'warm-editorial': {
    lane: 'polished / photoshoot',
    note: 'Malinis ang puti, bahagyang nakataas ang itim, mainit ang gitna. Fashion.',
    chain: "curves=all='0/0.03 0.5/0.5 1/1',eq=contrast=1.02,colorbalance=rm=0.04:gm=0.01:bm=-0.03:rh=0.02:bh=-0.02",
  },
};

// ── args ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const has = (k) => argv.includes(k);

function ff(args) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg failed:\n${r.stderr}`);
}

function list() {
  const w = Math.max(...Object.keys(PRESETS).map((k) => k.length));
  for (const [k, v] of Object.entries(PRESETS)) {
    console.log(`${k.padEnd(w)}  [${v.lane}]  ${v.note}`);
  }
}

function applyOne(preset, inPath, outPath) {
  mkdirSync(dirname(outPath), { recursive: true });
  ff(['-y', '-i', inPath, '-vf', PRESETS[preset].chain, '-q:v', '2', outPath]);
}

/**
 * Export a grade as a portable .cube LUT so it can be used outside this repo
 * (DaVinci, Premiere, CapCut, mobile apps). Method: render an identity HALD CLUT,
 * push it through the same filter chain, then read the pixels back out.
 *
 * ⚠️ A .cube is a COLOUR transform only. Any spatial step in the chain — `noise`
 * above all — cannot be baked into it. So `ugc-flat`, `soft-pastel` and
 * `muted-film` exported as .cube carry their colour but NOT their grain, and
 * grain is a realism lever, not decoration (believability_dna.md: preserve
 * imperfection). Applying the .cube in another tool therefore gets you ~80% of
 * the look. For the full thing, run the preset through this script.
 */
async function exportCube(preset, outPath, level = 6) {
  const sharp = require('sharp');
  const tmp = `.tmp/grade-hald-${preset}.png`;
  mkdirSync('.tmp', { recursive: true });
  // haldclutsrc=L renders an (L^3 x L^3) image encoding an (L^2)^3 lattice.
  // L=6 -> 36^3 = 46656 entries, ~1.2 MB of .cube. Plenty for a smooth grade;
  // L=8 -> 64^3 is 7 MB each and buys nothing visible here.
  ff(['-y', '-f', 'lavfi', '-i', `haldclutsrc=${level}`, '-vf', PRESETS[preset].chain, '-frames:v', '1', tmp]);

  const { data, info } = await sharp(tmp).raw().toBuffer({ resolveWithObject: true });
  const N = level * level; // levels per channel
  const side = level ** 3;
  if (info.width !== side || info.height !== side) throw new Error(`unexpected HALD size ${info.width}x${info.height}`);

  const lines = [
    `# ${preset} — Grifon house-model grade`,
    `# ${PRESETS[preset].note}`,
    `# source chain: ${PRESETS[preset].chain}`,
    `# generated by tools/grade.mjs — edit the chain, not this file`,
    `TITLE "grifon-${preset}"`,
    `LUT_3D_SIZE ${N}`,
    'DOMAIN_MIN 0.0 0.0 0.0',
    'DOMAIN_MAX 1.0 1.0 1.0',
    '',
  ];
  // HALD and .cube share the same ordering: red varies fastest, then green, then blue.
  for (let i = 0; i < N * N * N; i++) {
    const px = i * info.channels;
    lines.push(
      `${(data[px] / 255).toFixed(6)} ${(data[px + 1] / 255).toFixed(6)} ${(data[px + 2] / 255).toFixed(6)}`
    );
  }
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, lines.join('\n') + '\n');
  rmSync(tmp, { force: true });
  console.log(`✓ ${outPath}  (${N}^3 lattice)`);
}

/** One source image rendered through every preset, laid out side by side. */
async function contact(inPath, outPath) {
  const sharp = require('sharp');
  const names = ['(ungraded)', ...Object.keys(PRESETS)];
  const W = 300;
  const tiles = [];
  for (const n of names) {
    let buf;
    if (n === '(ungraded)') buf = await sharp(inPath).resize(W).toBuffer();
    else {
      const t = `.tmp/grade-c-${n}.jpg`;
      applyOne(n, inPath, t);
      buf = await sharp(t).resize(W).toBuffer();
      rmSync(t, { force: true });
    }
    tiles.push(buf);
  }
  const h = (await sharp(tiles[0]).metadata()).height;
  const COLS = 4, rows = Math.ceil(tiles.length / COLS);
  const comp = await Promise.all(
    tiles.map(async (input, i) => ({ input, left: (i % COLS) * W, top: Math.floor(i / COLS) * h }))
  );
  mkdirSync(dirname(outPath), { recursive: true });
  await sharp({ create: { width: COLS * W, height: rows * h, channels: 3, background: '#09090b' } })
    .composite(comp).jpeg({ quality: 92 }).toFile(outPath);
  console.log(`✓ ${outPath}`);
  console.log(`   order: ${names.join(' · ')}`);
}

// ── main ─────────────────────────────────────────────────────────────────────
if (has('--list') || argv.length === 0) { list(); process.exit(0); }

const outArg = arg('--out');
const cube = arg('--export-cube');
const contactSrc = arg('--contact');

if (cube) {
  if (!PRESETS[cube]) { console.error(`unknown preset: ${cube}`); process.exit(1); }
  await exportCube(cube, outArg || `luts/${cube}.cube`);
} else if (contactSrc) {
  await contact(contactSrc, outArg || '.tmp/grade-contact.jpg');
} else {
  const preset = arg('--preset');
  const inArg = arg('--in');
  if (!preset || !PRESETS[preset]) { console.error('need --preset <name>; --list to see them'); process.exit(1); }
  if (!inArg || !outArg) { console.error('need --in and --out'); process.exit(1); }

  if (existsSync(inArg) && statSync(inArg).isDirectory()) {
    const files = readdirSync(inArg).filter((f) => /\.(jpg|jpeg|png)$/i.test(f));
    for (const f of files) {
      applyOne(preset, join(inArg, f), join(outArg, basename(f, extname(f)) + '.jpg'));
    }
    console.log(`✓ ${files.length} file(s) -> ${outArg}  [${preset}]`);
  } else {
    applyOne(preset, inArg, outArg);
    console.log(`✓ ${outArg}  [${preset}]`);
  }
}
