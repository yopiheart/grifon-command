// Oceanides — daily city batch renderer for Test Batch 2 templates.
// For each city, fills variant copy + {{PLATE}} + {{CITY}}/{{SHORT}} into 2
// daily-rotating styles (a morning + an afternoon post), renders each via
// render.mjs into a per-branch folder, verifies the PNGs, and emits a dark
// review gallery.
//
// Daily rotation (deterministic per calendar day, phase-anchored):
//   d          = day number = floor(Date.parse(date+'T00:00:00Z') / 86400000)
//   pairOffset = ((d - ANCHOR) % 4 + 4) % 4
//   style pair = STYLE_PAIRS[(i + pairOffset) % 4]   for city index i (0..14)
//                  first style  = MORNING post, second style = AFTERNOON post
//   variantIdx = ((floor((d - ANCHOR) / 4) % 3) + 3) % 3
//   plate      = plates[((d - ANCHOR) % plates.length + plates.length) % plates.length]
//                  (only for styles listed in tb2-variants._plates)
//
// Output structure (posting-ready for VAs):
//   out/daily-<date>/OCEANIDES-<CITYSLUG-UPPERCASE>-BRANCH/
//       1-MORNING--<style>.png
//       2-AFTERNOON--<style>.png
//
// Usage: node build-tb2-cities.mjs [--date YYYY-MM-DD]   (default = today, Asia/Manila)
// Idempotent: safe to re-run; overwrites existing PNGs and cleans up gen files.
import {
  readFileSync, writeFileSync, mkdirSync, existsSync, statSync,
  readdirSync, unlinkSync, openSync, readSync, closeSync,
} from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES = 'templates';

// --- Date resolution ---------------------------------------------------------
function todayManila() {
  // en-CA formats as YYYY-MM-DD; Asia/Manila is UTC+8 with no DST.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
}

function parseArgs(argv) {
  let date = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--date') {
      date = argv[i + 1];
      i++;
    } else if (argv[i].startsWith('--date=')) {
      date = argv[i].slice('--date='.length);
    }
  }
  return { date };
}

const { date: dateArg } = parseArgs(process.argv.slice(2));
const DATE = dateArg || todayManila();
if (!/^\d{4}-\d{2}-\d{2}$/.test(DATE)) {
  console.error(`Invalid --date "${DATE}". Expected YYYY-MM-DD.`);
  process.exit(1);
}

const DAY_NUMBER = Math.floor(Date.parse(`${DATE}T00:00:00Z`) / 86400000);
if (!Number.isFinite(DAY_NUMBER)) {
  console.error(`Could not compute day number for date "${DATE}".`);
  process.exit(1);
}
// Phase-anchored to 2026-07-14 (day 20648, the launch batch = offset 0), so every
// day's styles differ from the previous day's on every page.
const EPOCH_ANCHOR = 20648;
const DELTA = DAY_NUMBER - EPOCH_ANCHOR;
const PAIR_OFFSET = ((DELTA % 4) + 4) % 4;
const VARIANT_IDX = ((Math.floor(DELTA / 4) % 3) + 3) % 3;

const OUT_DIR = path.join('out', `daily-${DATE}`);

// 15 cities, in this exact order (index i = 0..14).
const CITIES = [
  { name: 'Quezon City',       slug: 'quezon-city',        short: 'QC' },
  { name: 'Manila',            slug: 'manila',             short: 'Manila' },
  { name: 'Caloocan',          slug: 'caloocan',           short: 'Caloocan' },
  { name: 'Makati',            slug: 'makati',             short: 'Makati' },
  { name: 'Pasig',             slug: 'pasig',              short: 'Pasig' },
  { name: 'Taguig',            slug: 'taguig',             short: 'Taguig' },
  { name: 'Parañaque',         slug: 'paranaque',          short: 'Parañaque' },
  { name: 'Valenzuela',        slug: 'valenzuela',         short: 'Valenzuela' },
  { name: 'Antipolo',          slug: 'antipolo',           short: 'Antipolo' },
  { name: 'Bacoor',            slug: 'bacoor',             short: 'Bacoor' },
  { name: 'Dasmariñas',        slug: 'dasmarinas',         short: 'Dasmariñas' },
  { name: 'Calamba',           slug: 'calamba',            short: 'Calamba' },
  { name: 'Malolos',           slug: 'malolos',            short: 'Malolos' },
  { name: 'San Jose del Monte',slug: 'san-jose-del-monte', short: 'SJDM' },
  { name: 'Angeles',           slug: 'angeles',            short: 'Angeles' },
];

// Daily-rotating style pairs (4 pairs). City index i gets
// STYLE_PAIRS[(i + PAIR_OFFSET) % 4]. First = morning, second = afternoon.
const STYLE_PAIRS = [
  ['newsgraphic', 'nichecallout'],
  ['formatenemy', 'premium'],
  ['minimal', 'ugc'],
  ['checklist', 'crew'],
];

function stylesFor(i) {
  return STYLE_PAIRS[(i + PAIR_OFFSET) % 4];
}

// Variant copy pools per style (arrays of 3) + _plates map. Keys are token names.
const VARIANTS = JSON.parse(
  readFileSync(path.join(__dirname, 'tb2-variants.json'), 'utf8')
);

// Daily-rotating background plate for styles that carry a {{PLATE}} token.
// Returns the chosen filename, or null for styles without plate rotation.
function plateFor(style) {
  const plates = VARIANTS._plates && VARIANTS._plates[style];
  if (!Array.isArray(plates) || plates.length === 0) return null;
  const idx = ((DELTA % plates.length) + plates.length) % plates.length;
  return plates[idx];
}

// Before/after photo pair for styles that carry {{PHOTO_*}} tokens. Indexed BY
// VARIANT (not by day) — this pairing is a trust-line requirement: v0 = real job
// photos, v1/v2 = AI-recreated pairs. Returns the token→filename object, or null.
function photoSetFor(style) {
  const sets = VARIANTS._photoSets && VARIANTS._photoSets[style];
  if (!Array.isArray(sets) || !sets[VARIANT_IDX]) return null;
  return sets[VARIANT_IDX];
}

// Long-city font overrides (only when city name > 12 chars).
const LONG_OVERRIDES = {
  minimal:      '<style>h1{font-size:64px!important}</style>',
  nichecallout: '<style>.eyebrow{font-size:19px!important}</style>',
  premium:      '<style>h1{font-size:56px!important}</style>',
};

function replaceAll(str, find, repl) {
  return str.split(find).join(repl);
}

// --- Build the deterministic job list (shared by gen/render/verify/gallery) ---
function buildJobs() {
  const jobs = [];
  CITIES.forEach((city, i) => {
    stylesFor(i).forEach((style, slotIdx) => {
      const isMorning = slotIdx === 0;
      const prefix = isMorning ? '1-MORNING' : '2-AFTERNOON';
      const slot = isMorning ? 'MORNING' : 'AFTERNOON';
      const folder = `OCEANIDES-${city.slug.toUpperCase()}-BRANCH`;
      jobs.push({
        city, i, style, slot, prefix, folder,
        plate: plateFor(style),
        photoSet: photoSetFor(style),
        genRel: path.join(TEMPLATES, `_gen-tb2-${city.slug}-${style}.html`),
        outRel: path.join(OUT_DIR, folder, `${prefix}--${style}.png`),
        label: `${city.name} / ${slot} / ${style}`,
      });
    });
  });
  return jobs;
}

// --- PNG header dimensions (IHDR: width @ byte 16, height @ byte 20, BE u32) --
function pngDimensions(abs) {
  const fd = openSync(abs, 'r');
  try {
    const buf = Buffer.alloc(24);
    readSync(fd, buf, 0, 24, 0);
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) {
      return { width: 0, height: 0 };
    }
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  } finally {
    closeSync(fd);
  }
}

// Recursively collect all .png paths under a directory.
function walkPngs(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkPngs(p));
    else if (e.name.toLowerCase().endsWith('.png')) out.push(p);
  }
  return out;
}

function runRender(htmlPath, outPath) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['render.mjs', htmlPath, outPath], {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let err = '';
    child.stderr.on('data', (d) => { err += d.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`render.mjs exited ${code} for ${outPath}\n${err}`));
    });
  });
}

async function main() {
  const outAbs = path.join(__dirname, OUT_DIR);
  mkdirSync(outAbs, { recursive: true });

  console.log(`Oceanides daily batch — ${DATE}`);
  console.log(`  day number d = ${DAY_NUMBER}  (d - ANCHOR = ${DELTA})`);
  console.log(`  pair offset (d-ANCHOR)%4 = ${PAIR_OFFSET} · variant = v${VARIANT_IDX}`);
  for (const style of Object.keys(VARIANTS._plates || {})) {
    console.log(`  plate[${style}] = ${plateFor(style)}`);
  }
  for (const style of Object.keys(VARIANTS._photoSets || {})) {
    const ps = photoSetFor(style);
    console.log(`  photoSet[${style}] v${VARIANT_IDX} = ${ps ? JSON.stringify(ps) : 'none'}`);
  }

  // Idempotency / migration: drop any legacy flat-structure PNGs sitting directly
  // in OUT_DIR (previous runs wrote city--style.png at the top level) and the old
  // gallery, so the new per-branch structure is the only thing that survives.
  for (const f of readdirSync(outAbs)) {
    const p = path.join(outAbs, f);
    if (f.toLowerCase().endsWith('.png') && statSync(p).isFile()) {
      unlinkSync(p);
      console.log(`  removed legacy flat PNG: ${path.join(OUT_DIR, f)}`);
    }
  }
  const galleryAbs = path.join(__dirname, `gallery-daily-${DATE}.html`);
  if (existsSync(galleryAbs)) {
    unlinkSync(galleryAbs);
    console.log(`  removed stale gallery-daily-${DATE}.html`);
  }

  const jobs = buildJobs();
  console.log(`\nBuilding ${jobs.length} renders (${CITIES.length} cities x 2 styles)...`);

  // 1) Generate the filled HTML files.
  //    Substitution order per render:
  //      variant tokens -> {{PHOTO_*}} -> {{PLATE}} -> {{CITY}}/{{SHORT}}.
  //    (variant values may embed {{CITY}}/{{SHORT}}, so those resolve last.)
  for (const job of jobs) {
    const { city, style } = job;
    const tplPath = path.join(__dirname, TEMPLATES, `tb2-${style}.html`);
    let html = readFileSync(tplPath, 'utf8');

    const pool = VARIANTS[style];
    if (!Array.isArray(pool) || !pool[VARIANT_IDX]) {
      throw new Error(`No variant[${VARIANT_IDX}] for style "${style}" in tb2-variants.json`);
    }
    const variant = pool[VARIANT_IDX];
    for (const [token, value] of Object.entries(variant)) {
      html = replaceAll(html, `{{${token}}}`, value);
    }

    if (job.photoSet) {
      for (const [token, value] of Object.entries(job.photoSet)) {
        html = replaceAll(html, `{{${token}}}`, value);
      }
    }

    if (job.plate) {
      html = replaceAll(html, '{{PLATE}}', job.plate);
    }

    html = replaceAll(html, '{{CITY}}', city.name);
    html = replaceAll(html, '{{SHORT}}', city.short);

    if (city.name.length > 12 && LONG_OVERRIDES[style]) {
      html = html.replace('</head>', `${LONG_OVERRIDES[style]}</head>`);
    }

    // Residual-token guard: no {{ may survive substitution (catches {{PLATE}},
    // {{ITEMS}}, {{FOOT}}, etc.).
    const residual = html.match(/\{\{[^}]*\}\}/);
    if (residual) {
      throw new Error(
        `Residual token ${residual[0]} in ${city.slug}--${style} (style "${style}", variant v${VARIANT_IDX}). Aborting before render.`
      );
    }

    writeFileSync(path.join(__dirname, job.genRel), html, 'utf8');
  }

  // 2) Render each (up to 3 concurrent). Ensure each branch folder exists first.
  for (const job of jobs) {
    mkdirSync(path.join(__dirname, path.dirname(job.outRel)), { recursive: true });
  }

  const CONCURRENCY = 3;
  let done = 0;
  const queue = jobs.slice();

  async function worker() {
    while (queue.length) {
      const job = queue.shift();
      if (!job) break;
      await runRender(job.genRel, job.outRel);
      done += 1;
      console.log(`  [${String(done).padStart(2)}/${jobs.length}] ${job.label} -> ${job.outRel}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // 3) Verify all PNGs: exist, 2160x2700, > 100 KB. Scan recursively so strays
  //    (e.g. leftover flat PNGs) are caught.
  console.log('\nVerifying renders...');
  const rows = [];
  let failed = false;

  for (const job of jobs) {
    const abs = path.join(__dirname, job.outRel);
    let sizeKB = 0, width = 0, height = 0, ok = false;
    if (existsSync(abs)) {
      sizeKB = statSync(abs).size / 1024;
      const dim = pngDimensions(abs);
      width = dim.width; height = dim.height;
      ok = sizeKB > 100 && width === 2160 && height === 2700;
    }
    if (!ok) failed = true;
    rows.push({
      city: job.city.name, slot: job.slot, style: job.style,
      plate: job.plate || '—', sizeKB, dims: `${width}x${height}`, ok,
    });
  }

  const foundPngs = walkPngs(outAbs);
  if (foundPngs.length !== jobs.length) {
    failed = true;
    console.error(`Expected ${jobs.length} PNGs recursively under ${OUT_DIR}, found ${foundPngs.length}.`);
  }
  // No flat top-level PNGs may remain.
  const strayFlat = readdirSync(outAbs).filter(
    (f) => f.toLowerCase().endsWith('.png') && statSync(path.join(outAbs, f)).isFile()
  );
  if (strayFlat.length) {
    failed = true;
    console.error(`Flat top-level PNGs still present: ${strayFlat.join(', ')}`);
  }

  // Summary table.
  console.log('\n=== Summary ===');
  console.log(
    'CITY'.padEnd(20) + 'SLOT'.padEnd(11) + 'STYLE'.padEnd(14) +
    'PLATE'.padEnd(22) + 'DIMS'.padEnd(12) + 'SIZE'.padStart(9) + '  OK'
  );
  for (const r of rows) {
    console.log(
      r.city.padEnd(20) +
      r.slot.padEnd(11) +
      r.style.padEnd(14) +
      r.plate.padEnd(22) +
      r.dims.padEnd(12) +
      `${r.sizeKB.toFixed(0)} KB`.padStart(9) +
      `  ${r.ok ? 'ok' : 'FAIL'}`
    );
  }
  console.log(`\nPNGs found recursively under ${OUT_DIR}: ${foundPngs.length} (expected ${jobs.length})`);

  // 4) Build the gallery page.
  writeGallery(jobs);

  // 5) Clean up gen files only on success.
  if (!failed) {
    for (const f of readdirSync(path.join(__dirname, TEMPLATES))) {
      if (/^_gen-tb2-.*\.html$/.test(f)) {
        unlinkSync(path.join(__dirname, TEMPLATES, f));
      }
    }
    console.log('\nCleaned up _gen-tb2-*.html files.');
  } else {
    console.error('\nSome renders missing/wrong-size — keeping _gen files for debug.');
    process.exit(1);
  }

  console.log(`\nDone. ${rows.length} PNGs in ${OUT_DIR}, gallery-daily-${DATE}.html written.`);
}

function writeGallery(jobs) {
  // Group jobs by city (in CITIES order), each with its morning + afternoon posts.
  const byCity = CITIES.map((city, i) => ({
    city,
    jobs: jobs.filter((j) => j.i === i).sort((a, b) => a.prefix.localeCompare(b.prefix)),
  }));

  const sections = byCity.map(({ city, jobs: cityJobs }) => {
    const cards = cityJobs.map((job) => {
      const src = job.outRel.replace(/\\/g, '/');
      const caption = `${job.prefix.replace('-', ' · ')} · ${job.style}`;
      return `    <div class="card"><img src="${src}"/><div class="meta"><div class="s">${caption}</div></div></div>`;
    }).join('\n');
    return `  <h2>OCEANIDES ${city.name} BRANCH</h2>\n  <div class="grid">\n${cards}\n  </div>`;
  }).join('\n');

  const platesNote = Object.keys(VARIANTS._plates || {})
    .map((s) => `${s} → ${plateFor(s)}`)
    .join(' &middot; ');

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Oceanides — Daily Posts ${DATE}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#101418;color:#e8eaed;font-family:'Segoe UI',Arial,sans-serif;padding:36px}
h1{font-size:26px;margin-bottom:6px}
.subtitle{font-size:14px;color:#9aa0a6;margin-bottom:24px}
h2{font-size:19px;margin:28px 0 14px;color:#F5B301;text-transform:uppercase;letter-spacing:1px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px}
.card{background:#171c22;border:1px solid #2a3138;border-radius:14px;overflow:hidden}
.card img{width:100%;display:block}
.meta{padding:10px 14px 14px}
.meta .s{color:#9aa0a6;font-size:13px;text-transform:capitalize}
</style></head><body>
<h1>Oceanides &mdash; Daily Posts ${DATE} (15 branches &times; 2)</h1>
<div class="subtitle">pair offset (d&minus;ANCHOR)%4 = ${PAIR_OFFSET} &middot; variant = v${VARIANT_IDX} &middot; plates: ${platesNote}</div>
${sections}
</body></html>
`;
  writeFileSync(path.join(__dirname, `gallery-daily-${DATE}.html`), html, 'utf8');
}

main().catch((e) => { console.error(e); process.exit(1); });
