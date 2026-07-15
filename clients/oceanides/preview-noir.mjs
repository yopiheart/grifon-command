// tb2-noir PREVIEW renderer — Kallaway noir-editorial trial (2026-07-15).
// Renders sample cities with placeholder copy so Neil can eyeball the style
// BEFORE it's gated into STYLE_PAIRS + tb2-variants.json (rotation entry is
// Neil's call). Usage: node preview-noir.mjs
import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'out', 'noir-trial');
mkdirSync(OUT, { recursive: true });

// Preview copy only — real rotation copy comes from tb2-variants.json later.
const SAMPLES = [
  {
    city: 'Quezon City',
    headline: 'Ang serbisyong <em>dumarating talaga.</em>',
    subline: 'Sipsip poso negro at declogging, 24/7 — sasabihin ang presyo <b>bago</b> umandar ang trabaho.',
  },
  {
    city: 'Dasmariñas', // long-name fit check
    headline: 'Baradong banyo? <em>Kalma lang.</em>',
    subline: 'Tawag ka lang — <b>30–60 minuto</b> ang response ng {{CITY}} crew, walang hidden charges.',
  },
];

const tpl = readFileSync(path.join(__dirname, 'templates', 'tb2-noir.html'), 'utf8');
const fill = (s, t, v) => s.split(t).join(v);

for (const s of SAMPLES) {
  let html = tpl;
  html = fill(html, '{{HEADLINE}}', s.headline);
  html = fill(html, '{{SUBLINE}}', s.subline);
  html = fill(html, '{{CITY}}', s.city);
  const residual = html.match(/\{\{[^}]*\}\}/);
  if (residual) throw new Error(`Residual token ${residual[0]} for ${s.city}`);

  const slug = s.city.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '-');
  const gen = path.join(__dirname, 'templates', `_gen-noir-${slug}.html`);
  writeFileSync(gen, html, 'utf8');
  const out = path.join(OUT, `noir--${slug}.png`);
  const r = spawnSync('node', ['render.mjs', gen, out], { cwd: __dirname, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
  unlinkSync(gen);
}
console.log(`Done. Previews in ${path.relative(process.cwd(), OUT)}`);
