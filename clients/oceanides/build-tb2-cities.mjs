// Oceanides — daily city batch renderer for Test Batch 2 templates.
// For each city, fills {{CITY}}/{{SHORT}} into 2 rotating styles, renders each
// via render.mjs, verifies the PNGs, and emits a dark review gallery.
// Idempotent: safe to re-run; overwrites existing PNGs and cleans up gen files.
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, rmSync, readdirSync, unlinkSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATE = '2026-07-14';
const OUT_DIR = path.join('out', `daily-${DATE}`);
const TEMPLATES = 'templates';

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

// Each city gets exactly 2 styles, rotated by index % 3.
function stylesFor(i) {
  const mod = i % 3;
  if (mod === 0) return ['newsgraphic', 'nichecallout'];
  if (mod === 1) return ['formatenemy', 'premium'];
  return ['minimal', 'ugc'];
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
  mkdirSync(path.join(__dirname, OUT_DIR), { recursive: true });

  // Build the full job list.
  const jobs = [];
  CITIES.forEach((city, i) => {
    for (const style of stylesFor(i)) {
      jobs.push({ city, style });
    }
  });

  console.log(`Building ${jobs.length} renders (${CITIES.length} cities x 2 styles)...`);

  const genFiles = [];

  // 1) Generate the filled HTML files.
  for (const { city, style } of jobs) {
    const tplPath = path.join(__dirname, TEMPLATES, `tb2-${style}.html`);
    let html = readFileSync(tplPath, 'utf8');
    html = replaceAll(html, '{{CITY}}', city.name);
    html = replaceAll(html, '{{SHORT}}', city.short);

    if (city.name.length > 12 && LONG_OVERRIDES[style]) {
      html = html.replace('</head>', `${LONG_OVERRIDES[style]}</head>`);
    }

    const genRel = path.join(TEMPLATES, `_gen-tb2-${city.slug}-${style}.html`);
    writeFileSync(path.join(__dirname, genRel), html, 'utf8');
    genFiles.push(genRel);
  }

  // 2) Render each (up to 3 concurrent).
  const CONCURRENCY = 3;
  let done = 0;
  const queue = jobs.map(({ city, style }) => ({
    genRel: path.join(TEMPLATES, `_gen-tb2-${city.slug}-${style}.html`),
    outRel: path.join(OUT_DIR, `${city.slug}--${style}.png`),
    label: `${city.name} / ${style}`,
  }));

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

  // 3) Verify all PNGs exist and are > 100 KB.
  console.log('\nVerifying renders...');
  const rows = [];
  let failed = false;
  CITIES.forEach((city, i) => {
    for (const style of stylesFor(i)) {
      const outRel = path.join(OUT_DIR, `${city.slug}--${style}.png`);
      const abs = path.join(__dirname, outRel);
      let sizeKB = 0, ok = false;
      if (existsSync(abs)) {
        sizeKB = statSync(abs).size / 1024;
        ok = sizeKB > 100;
      }
      if (!ok) failed = true;
      rows.push({ city: city.name, style, sizeKB, ok });
    }
  });

  // Summary table.
  console.log('\n=== Summary ===');
  console.log('CITY'.padEnd(20) + 'STYLE'.padEnd(14) + 'SIZE'.padStart(10) + '  OK');
  for (const r of rows) {
    console.log(
      r.city.padEnd(20) +
      r.style.padEnd(14) +
      `${r.sizeKB.toFixed(0)} KB`.padStart(10) +
      `  ${r.ok ? 'ok' : 'FAIL'}`
    );
  }

  // 4) Build the gallery page.
  writeGallery();

  // 5) Clean up gen files only on success.
  if (!failed) {
    for (const f of readdirSync(path.join(__dirname, TEMPLATES))) {
      if (/^_gen-tb2-.*\.html$/.test(f)) {
        unlinkSync(path.join(__dirname, TEMPLATES, f));
      }
    }
    console.log('\nCleaned up _gen-tb2-*.html files.');
  } else {
    console.error('\nSome renders missing/small — keeping _gen files for debug.');
    process.exit(1);
  }

  console.log(`\nDone. ${rows.length} PNGs in ${OUT_DIR}, gallery-daily-${DATE}.html written.`);
}

function writeGallery() {
  const sections = CITIES.map((city, i) => {
    const cards = stylesFor(i).map((style) => {
      const src = `${OUT_DIR.replace(/\\/g, '/')}/${city.slug}--${style}.png`;
      return `    <div class="card"><img src="${src}"/><div class="meta"><div class="s">${style}</div></div></div>`;
    }).join('\n');
    return `  <h2>${city.name}</h2>\n  <div class="grid">\n${cards}\n  </div>`;
  }).join('\n');

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Oceanides — Daily Posts ${DATE}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#101418;color:#e8eaed;font-family:'Segoe UI',Arial,sans-serif;padding:36px}
h1{font-size:26px;margin-bottom:24px}
h2{font-size:19px;margin:28px 0 14px;color:#F5B301}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px}
.card{background:#171c22;border:1px solid #2a3138;border-radius:14px;overflow:hidden}
.card img{width:100%;display:block}
.meta{padding:10px 14px 14px}
.meta .s{color:#9aa0a6;font-size:13px;text-transform:capitalize}
</style></head><body>
<h1>Oceanides &mdash; Daily Posts ${DATE} (15 cities &times; 2)</h1>
${sections}
</body></html>
`;
  writeFileSync(path.join(__dirname, `gallery-daily-${DATE}.html`), html, 'utf8');
}

main().catch((e) => { console.error(e); process.exit(1); });
