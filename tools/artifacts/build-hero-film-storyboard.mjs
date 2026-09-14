import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { finalize } from './_gates.mjs';
const root = new URL('../../', import.meta.url);
const data = JSON.parse(readFileSync(new URL('./data/hero-film-storyboard.json', import.meta.url), 'utf8'));
const esc = s => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bottle = (x,y,k=1) => `<g transform="translate(${x} ${y}) scale(${k})"><path d="M-12 0h24v18l12 16v66q0 8-8 8h-32q-8 0-8-8V34l12-16z" fill="#262326" stroke="#d4d4d8" stroke-width="2"/><path d="M-24 50h48v35h-48z" fill="#d4d4d8"/><path d="M-13 0h26v10h-26z" fill="#ffcc00"/></g>`;
const person = (x,y) => `<g transform="translate(${x} ${y})" fill="none" stroke="#d4d4d8" stroke-width="3"><circle cy="-30" r="18"/><path d="M-40 65V20q0-26 40-26t40 26v45M-25 25l30 28 40-12"/></g>`;
const screen = '<rect x="140" y="42" width="300" height="162" rx="10" fill="#18181b" stroke="#9a9aa3" stroke-width="2"/>';
function sketch(kind) {
  let shapes = '';
  if (kind === 'owner') shapes = person(205,105)+bottle(335,88,.95)+'<path d="M70 219h430" stroke="#9a9aa3" stroke-width="3"/><rect x="370" y="90" width="35" height="56" rx="5" fill="#18181b" stroke="#ffcc00"/>';
  if (kind === 'input') shapes = screen+bottle(215,67,.95)+'<path d="M282 85h126m-126 25h103m-103 25h118" stroke="#9a9aa3" stroke-width="7"/><rect x="280" y="158" width="105" height="24" rx="12" fill="#ffcc00"/>';
  if (kind === 'plan') shapes = bottle(98,75,1)+'<path d="M140 130h35m150 0h35" stroke="#ffcc00" stroke-width="3"/><rect x="180" y="65" width="135" height="130" rx="8" fill="#18181b" stroke="#d4d4d8"/><path d="M197 90h100m-100 26h85m-85 26h90m-90 26h65" stroke="#9a9aa3" stroke-width="6"/><rect x="365" y="60" width="120" height="66" rx="6" fill="#18181b" stroke="#ffcc00"/><rect x="365" y="144" width="120" height="66" rx="6" fill="#18181b" stroke="#ffcc00"/>';
  if (kind === 'ugc') shapes = '<rect x="210" y="20" width="150" height="225" rx="8" fill="#18181b" stroke="#9a9aa3"/>'+person(278,102)+bottle(323,117,.55)+'<path d="M234 218h100" stroke="#ffcc00" stroke-width="5"/>';
  if (kind === 'cinematic') shapes = '<ellipse cx="285" cy="220" rx="115" ry="13" fill="#262326"/><path d="M220 45l-35 140m162-140 35 140" stroke="#ffcc00" stroke-width="2"/>'+bottle(285,40,1.6);
  if (kind === 'return') shapes = person(137,123)+'<rect x="230" y="58" width="245" height="140" rx="8" fill="#18181b" stroke="#9a9aa3"/><rect x="248" y="75" width="85" height="90" fill="#262326" stroke="#d4d4d8"/>'+bottle(388,82,.7)+'<path d="M65 222h440" stroke="#9a9aa3" stroke-width="3"/>';
  return `<svg viewBox="0 0 560 265" role="img" aria-label="${esc(kind)} composition diagram; placeholder only">${shapes}</svg>`;
}
let lastAct = '';
const panels = data.panels.map((p,i) => {
  const act = p.act !== lastAct ? `<h2 class="act">${esc(p.act)}</h2>` : ''; lastAct=p.act;
  return `${act}<article id="panel-${i+1}" class="panel"><div class="visual">${sketch(p.sketch)}<p class="caption">${esc(p.caption)}</p></div><div class="notes"><h3>${esc(p.title)}</h3><p>${esc(p.action)}</p><details><summary>Camera, sound, proof &amp; transition</summary>${['camera','sound','proof','transition'].map(k=>`<p><strong>${k[0].toUpperCase()+k.slice(1)}</strong> ${esc(p[k])}</p>`).join('')}</details></div></article>`;
}).join('\n');
const template = readFileSync(new URL('./hero-film-storyboard.tpl.html', import.meta.url),'utf8');
const html = finalize(template.replace('{{TITLE}}',esc(data.title)).replace('{{PANELS}}',panels),{label:'hero-film-storyboard',required:['<title>','class="ground"','id="panel-6"'],leftover:[/\{\{[A-Z_]+\}\}/g]});
mkdirSync(new URL('artifacts/',root),{recursive:true});
const out = new URL('artifacts/grifon-hero-film-storyboard.html',root);
writeFileSync(out,html); console.log(fileURLToPath(out));
