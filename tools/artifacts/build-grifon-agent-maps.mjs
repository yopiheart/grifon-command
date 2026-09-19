import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { finalize } from './_gates.mjs';
import { maps, snapshot } from './grifon-agent-maps.data.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const text = (x, y, value, size = 20, fill = '#D4D4D8', weight = 400, extra = '') => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}" ${extra}>${esc(value)}</text>`;
const W = 220, H = 166;

function svg(map) {
  const lines = [];
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 ${map.height}" width="1600" height="${map.height}" role="img" aria-labelledby="${map.id}-title ${map.id}-desc" font-family="Inter,Arial,sans-serif"><title id="${map.id}-title">${esc(map.title)}</title><desc id="${map.id}-desc">${esc(map.subtitle)} ${esc(map.boundary)}</desc><defs><radialGradient id="${map.id}-bg" cx="35%" cy="10%" r="90%"><stop stop-color="#1D1C17"/><stop offset="0.45" stop-color="#131316"/><stop offset="1" stop-color="#09090B"/></radialGradient><linearGradient id="${map.id}-panel" x2="0" y2="1"><stop stop-color="#232326"/><stop offset="1" stop-color="#141416"/></linearGradient><marker id="${map.id}-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 1 1 L 8 5 L 1 9" fill="none" stroke="#A1A1AA" stroke-width="1.5"/></marker></defs><rect width="1600" height="${map.height}" fill="url(#${map.id}-bg)"/>`);
  lines.push(text(40, 56, 'GRIFON AI', 20, '#F5F5F7', 900, 'letter-spacing="4"'), text(1560, 56, snapshot.date.toUpperCase(), 14, '#9A9AA3', 400, 'text-anchor="end" letter-spacing="2"'));
  lines.push(text(40, 98, map.eyebrow, 14, '#FFCC00', 600, 'letter-spacing="2"'), text(40, 157, map.title.toUpperCase(), 48, '#F5F5F7', 900), text(40, 190, map.subtitle, 21));
  for (const lane of map.lanes) lines.push(`<line x1="40" y1="${lane.y + 16}" x2="1560" y2="${lane.y + 16}" stroke="#FFFFFF" stroke-opacity="0.12"/>`, text(40, lane.y + 41, lane.label, 15, '#FFCC00', 600, 'letter-spacing="1.5"'));
  for (const [a, b] of map.edges) {
    const from = map.nodes.find(n => n.id === a), to = map.nodes.find(n => n.id === b);
    lines.push(`<path d="M${from.x + W} ${from.y + H / 2} H${to.x - 8}" stroke="#A1A1AA" stroke-width="1.5" marker-end="url(#${map.id}-arrow)" fill="none"/>`);
  }
  if (map.id === 'team') {
    lines.push(`<path d="M930 446 V490 H670 V454" stroke="#9A9AA3" stroke-width="1.5" stroke-dasharray="6 5" marker-end="url(#team-arrow)" fill="none"/>`, text(696, 520, 'FAIL / REPAIR / VERIFY AGAIN', 14, '#9A9AA3'));
    lines.push(`<path d="M410 535 V454" stroke="#9A9AA3" stroke-width="1.5" stroke-dasharray="6 5" marker-end="url(#team-arrow)" fill="none"/>`);
    lines.push(text(590, 595, 'Build tools produce evidence.', 28, '#F5F5F7', 700), text(590, 634, 'Skills guide the work. They are not separate running bots.', 21));
  }
  for (const n of map.nodes) {
    lines.push(`<g data-node="${n.id}" role="button" tabindex="0" aria-label="${esc(n.title.join(' '))}: show explanation" style="cursor:pointer"><title>${esc(n.detail)}</title><rect x="${n.x}" y="${n.y}" width="${W}" height="${H}" rx="18" fill="url(#${map.id}-panel)" stroke="${n.type === 'human' ? '#FFCC00' : '#606068'}" stroke-opacity="${n.type === 'human' ? '.65' : '.55'}"/><path d="M${n.x + 20} ${n.y + 1} H${n.x + W - 20}" stroke="#FFFFFF" stroke-opacity=".15"/>`, text(n.x + 18, n.y + 29, n.tag, 14, n.type === 'human' ? '#FFCC00' : '#A1A1AA', 600));
    n.title.forEach((v,i) => lines.push(text(n.x + 18, n.y + 63 + 27 * i, v, 21, '#F5F5F7', 700)));
    n.lines.forEach((v,i) => lines.push(text(n.x + 18, n.y + (n.title.length > 1 ? 119 : 109) + 25 * i, v, 17, '#D4D4D8')));
    lines.push('</g>');
  }
  if (map.id === 'product') map.lanes.forEach((lane, i) => lines.push(text(40, i ? 815 : 478, lane.note, 19, '#A1A1AA')));
  const base = map.height - 173;
  lines.push(`<line x1="40" y1="${base}" x2="1560" y2="${base}" stroke="#FFFFFF" stroke-opacity=".15"/>`);
  map.support.forEach((item, i) => { lines.push(text(40 + i * 390, base + 40, item, 15, '#D4D4D8', 600, 'letter-spacing=".8"')); });
  lines.push(text(40, base + 88, map.boundary, 20, '#F5F5F7', 600), text(40, base + 131, 'GOLD OUTLINE = HUMAN DECISION', 13, '#FFCC00', 600, 'letter-spacing="1.5"'), text(1560, base + 131, 'CODEBASE SNAPSHOT / NOT A LIVE STATUS VIEW', 13, '#9A9AA3', 400, 'text-anchor="end" letter-spacing="1"'), '</svg>');
  return lines.join('\n');
}

for (const path of new Set(maps.flatMap(m => m.nodes.flatMap(n => n.sources)))) await readFile(resolve(root, path), 'utf8');
await mkdir(resolve(root, 'artifacts'), { recursive: true });
const figures = maps.map(m => ({ ...m, svg: svg(m) }));
for (const m of figures) await writeFile(resolve(root, `artifacts/grifon-${m.id}-map.svg`), m.svg + '\n');
const template = await readFile(resolve(here, 'grifon-agent-maps.tpl.html'), 'utf8');
const html = finalize(template.replace('__MAP_DATA__', JSON.stringify({ maps: figures, snapshot }).replaceAll('<', '\\u003c')), {
  label: 'grifon-agent-maps', required: ['<meta charset="utf-8">', 'class="ground"', 'id="diagram"', 'CODEBASE SNAPSHOT'], leftover: [/__MAP_DATA__/g],
});
await writeFile(resolve(root, 'artifacts/grifon-agent-maps.html'), html);
console.log('Built standalone HTML and two shareable SVG diagrams. No network or generation calls.');
