// Oceanides — publish a day's batch to the PUBLIC repo (yopiheart/oceanides-posts)
// so the posting VA can access images + captions with a plain link (GitHub Pages).
//
// Usage: node publish-public.mjs --date YYYY-MM-DD   (default = today, Asia/Manila)
// - Clones/pulls the public repo to ../../../oceanides-posts-mirror (recreated after
//   defreezer wipes — safe).
// - Copies out/daily-<date>/ into <mirror>/<date>/, generates <date>/index.html
//   (per-branch: morning/afternoon image + copyable caption + download link) and
//   regenerates the root index.html (date list, newest first).
// - Commits + pushes. Pages URL: https://yopiheart.github.io/oceanides-posts/<date>/
//
// PUBLIC EXPOSURE NOTE (Neil-approved 2026-07-14): images + captions only — never
// copy anything else (no scripts, no research, no templates) into the mirror.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, cpSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_URL = 'https://github.com/yopiheart/oceanides-posts.git';
const MIRROR = path.resolve(__dirname, '..', '..', '..', 'oceanides-posts-mirror');

function todayManila() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
}
const dateArgIdx = process.argv.indexOf('--date');
const DATE = dateArgIdx >= 0 ? process.argv[dateArgIdx + 1] : todayManila();
if (!/^\d{4}-\d{2}-\d{2}$/.test(DATE)) { console.error(`Invalid --date "${DATE}"`); process.exit(1); }

const SRC = path.join(__dirname, 'out', `daily-${DATE}`);
if (!existsSync(SRC)) { console.error(`Source not found: ${SRC} — render it first (build-tb2-cities.mjs).`); process.exit(1); }

const sh = (cmd, cwd) => execSync(cmd, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();

// 1) Clone or update the mirror.
if (!existsSync(path.join(MIRROR, '.git'))) {
  rmSync(MIRROR, { recursive: true, force: true });
  sh(`git clone ${REPO_URL} "${MIRROR}"`);
} else {
  sh('git pull --ff-only', MIRROR);
}

// 2) Copy the day's folder (images + captions only).
const destDay = path.join(MIRROR, DATE);
rmSync(destDay, { recursive: true, force: true });
cpSync(SRC, destDay, { recursive: true });

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// 3) Per-day index.html.
const branches = readdirSync(destDay, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
const sections = branches.map((b) => {
  const files = readdirSync(path.join(destDay, b)).filter((f) => f.endsWith('.png')).sort();
  const cards = files.map((png) => {
    const txt = png.replace(/\.png$/, '.txt');
    const capPath = path.join(destDay, b, txt);
    const cap = existsSync(capPath) ? readFileSync(capPath, 'utf8') : '';
    const slot = png.startsWith('1-') ? '🌅 UMAGA' : '🌇 HAPON';
    return `      <div class="card">
        <div class="slot">${slot} · ${esc(png.replace(/^\d-(MORNING|AFTERNOON)--/, '').replace('.png', ''))}</div>
        <a href="${b}/${png}"><img loading="lazy" src="${b}/${png}"/></a>
        <a class="dl" href="${b}/${png}" download>⬇ I-download ang image</a>
        <div class="caplbl">CAPTION — i-long-press para makopya:</div>
        <textarea readonly rows="8">${esc(cap)}</textarea>
      </div>`;
  }).join('\n');
  return `  <h2>${esc(b.replace(/-/g, ' '))}</h2>\n  <div class="grid">\n${cards}\n  </div>`;
}).join('\n');

const dayHtml = `<!doctype html>
<html lang="tl"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Oceanides Posts — ${DATE}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0E1522;color:#e8eaed;font-family:system-ui,'Segoe UI',Arial,sans-serif;padding:20px;max-width:1100px;margin:0 auto}
h1{font-size:22px;margin-bottom:4px}
.note{color:#9aa0a6;font-size:14px;margin-bottom:20px;line-height:1.5}
h2{font-size:16px;margin:26px 0 12px;color:#F5B301;letter-spacing:1px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
.card{background:#161d2b;border:1px solid #2a3448;border-radius:14px;padding:12px}
.card img{width:100%;border-radius:10px;display:block}
.slot{font-size:13px;font-weight:700;color:#BFD5F2;margin-bottom:8px;letter-spacing:.5px}
.dl{display:block;text-align:center;background:#F5B301;color:#0E1522;font-weight:800;font-size:14px;border-radius:9px;padding:10px;margin:10px 0;text-decoration:none}
.caplbl{font-size:11px;color:#9aa0a6;letter-spacing:1px;margin-bottom:6px}
textarea{width:100%;background:#0E1522;color:#cdd4dd;border:1px solid #2a3448;border-radius:9px;padding:10px;font-size:13px;line-height:1.5;font-family:inherit}
</style></head><body>
<h1>Oceanides — Posts para sa ${DATE}</h1>
<div class="note">Bawat branch page: i-post ang 🌅 UMAGA image sa umaga at 🌇 HAPON image sa hapon. I-download ang image, tapos kopyahin ang buong caption sa text box.</div>
${sections}
</body></html>
`;
writeFileSync(path.join(destDay, 'index.html'), dayHtml, 'utf8');

// 4) Root index.html — date list, newest first.
const dates = readdirSync(MIRROR, { withFileTypes: true })
  .filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(e.name))
  .map((e) => e.name).sort().reverse();
const rootHtml = `<!doctype html>
<html lang="tl"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Oceanides Daily Posts</title>
<style>
body{background:#0E1522;color:#e8eaed;font-family:system-ui,'Segoe UI',Arial,sans-serif;padding:28px;max-width:640px;margin:0 auto}
h1{font-size:22px;margin-bottom:6px}.note{color:#9aa0a6;font-size:14px;margin-bottom:22px}
a{display:block;background:#161d2b;border:1px solid #2a3448;border-radius:12px;padding:16px 18px;margin-bottom:10px;color:#F5B301;font-weight:800;font-size:17px;text-decoration:none}
</style></head><body>
<h1>Oceanides — Daily Posts</h1>
<div class="note">Piliin ang petsa. Bawat araw: 15 branches × umaga + hapon na post, may kasamang caption.</div>
${dates.map((d) => `<a href="${d}/">${d}</a>`).join('\n')}
</body></html>
`;
writeFileSync(path.join(MIRROR, 'index.html'), rootHtml, 'utf8');
writeFileSync(path.join(MIRROR, '.nojekyll'), '', 'utf8');

// 5) Commit + push.
sh('git add -A', MIRROR);
try {
  sh(`git -c user.name="Neil Maglaya" -c user.email="neilmaglaya.business22@gmail.com" commit -m "posts: ${DATE}"`, MIRROR);
  sh('git push', MIRROR);
  console.log(`Published. https://yopiheart.github.io/oceanides-posts/${DATE}/`);
} catch (e) {
  const msg = e.stdout ? e.stdout.toString() : String(e);
  if (/nothing to commit/.test(msg)) console.log('No changes to publish.');
  else throw e;
}
