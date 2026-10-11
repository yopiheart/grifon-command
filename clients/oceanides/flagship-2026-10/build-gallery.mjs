import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { posts } from './posts.mjs';
import { finalize } from '../../../tools/artifacts/_gates.mjs';

const dir = dirname(fileURLToPath(import.meta.url));
const repo = resolve(dir, '../../..');
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const data = (file, type = 'image/webp') => `data:${type};base64,${readFileSync(file).toString('base64')}`;
const logo = data(resolve(repo, 'funnels/oceanides-price-page/public/img/logo.webp'));
writeFileSync(resolve(dir, 'templates/logo.webp'), readFileSync(resolve(repo, 'funnels/oceanides-price-page/public/img/logo.webp')));
const before = data(resolve(repo, 'funnels/oceanides-price-page/public/img/ba-2-before.webp'));
const after = data(resolve(repo, 'funnels/oceanides-price-page/public/img/ba-2-after.webp'));
const previews = posts.map(p => ({ ...p, preview: data(resolve(dir, `out/${p.slug}.webp`)), png: `out/${p.slug}.png` }));
const dialogData = previews.map(({ preview, ...post }) => post);
const cardOrder = [...previews.filter(p => Number(p.id) > 6), ...previews.filter(p => Number(p.id) <= 6)];
const cards = cardOrder.map(p => `<article class="post-card" data-family="${esc(p.family)}">
  <button class="post-open" data-open="${esc(p.id)}" aria-label="Review post ${esc(p.id)}: ${esc(p.title)}"><img src="${p.preview}" width="1080" height="1350" loading="lazy" alt="${esc(p.title)}"/><span class="image-action">Open creative <span aria-hidden="true">↗</span></span></button>
  <div class="card-meta"><span class="post-id">${esc(p.id)}</span><div><p class="family-label">${esc(p.family)}${Number(p.id) > 6 ? ' / NEW' : ''}</p><h3>${esc(p.title)}</h3></div><button class="icon-button" data-open="${esc(p.id)}" aria-label="Details for post ${esc(p.id)}">↗</button></div>
</article>`).join('');
const filters = [['all', 'All designs'], ['problem', 'The problem'], ['proof', 'The proof'], ['decision', 'The decision']].map(([family, label]) => {
  const count = family === 'all' ? posts.length : posts.filter(p => p.family === family).length;
  return `<button class="filter${family === 'all' ? ' active' : ''}" data-filter="${family}" aria-pressed="${family === 'all'}">${label} <span>${String(count).padStart(2, '0')}</span></button>`;
}).join('');
const inquiryPath = resolve(dir, 'inquiry.html');
const inquirySource = readFileSync(inquiryPath, 'utf8');
const postIdsPattern = /<script id="inquiry-post-ids" type="application\/json">[^<]*<\/script>/;
if (!postIdsPattern.test(inquirySource)) throw new Error('Inquiry is missing its creative-ID allowlist');
writeFileSync(inquiryPath, inquirySource.replace(postIdsPattern, `<script id="inquiry-post-ids" type="application/json">${JSON.stringify(posts.map(p => p.id))}</script>`), 'utf8');
const css = readFileSync(resolve(dir, 'gallery.css'), 'utf8');
const js = readFileSync(resolve(dir, 'preview.js'), 'utf8');
let fonts = '';
for (const [name, family, weight] of [['Anton-Regular.ttf', 'Anton', '400'], ['InterVariable.ttf', 'Inter', '100 900']]) {
  const font = resolve(dir, 'templates/fonts', name);
  fonts += `@font-face{font-family:'${family}';src:url('${data(font, 'font/ttf')}') format('truetype');font-style:normal;font-weight:${weight};font-display:swap}`;
}
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Oceanides | Field Notes 01</title><style>${fonts}\n${css}</style></head><body>
<a class="skip-link" href="#collection">Skip to collection</a>
<header class="masthead"><a class="wordmark" href="#top"><img src="${logo}" width="44" height="44" alt="Oceanides logo"><span>OCEANIDES<small>FIELD NOTES / 01</small></span></a><nav aria-label="Main"><a href="#collection">The collection</a><a href="#journey">The next step</a><a class="review-pill" href="#review-note">PRIVATE REVIEW</a></nav></header>
<main id="top"><section class="hero" aria-labelledby="hero-title"><div class="hero-copy"><p class="eyebrow"><span class="line"></span> A NEW STANDARD OF TRUST</p><h1 id="hero-title">BUILT<br>ON <span>PROOF.</span></h1><p class="hero-description">Recognizable problems. Visible results.<br>A clear way to start the conversation.</p><a class="primary-link" href="#collection">Explore all ${posts.length} <span aria-hidden="true">↓</span></a><div class="edition"><span>OCTOBER 2026</span><span>${posts.length - 6} NEW DESIGNS / CREATIVE REVIEW</span></div></div>
<div class="hero-evidence"><div class="photo-top"><span>THE SAME TANK.</span><span>BEFORE / AFTER</span></div><div class="compare" style="--split:50%"><img class="compare-after" src="${after}" alt="Rectangular tank after service, with red pipe visible"><div class="compare-before"><img src="${before}" alt="The same rectangular tank before service, with the same red pipe"></div><div class="compare-divider" aria-hidden="true"><span>↔</span></div><span class="compare-label before-label">BAGO</span><span class="compare-label after-label">PAGKATAPOS</span><input id="proof-slider" type="range" min="0" max="100" value="50" aria-label="Reveal before and after of the same tank"></div><p class="photo-note"><span class="dot"></span> Historical matched pair. Drag to compare.</p></div></section>
<div class="principles"><div><b>01</b><span>RECOGNIZE THE PROBLEM</span></div><div><b>02</b><span>SEE THE WORK</span></div><div><b>03</b><span>KNOW THE NEXT STEP</span></div></div>
<section class="collection section" id="collection" aria-labelledby="collection-title"><div class="section-heading"><div><p class="eyebrow">${posts.length} POSTS. THREE JOBS.</p><h2 id="collection-title">More ways to stop.<br><span>The same clear standard.</span></h2></div><p class="section-aside">The ${posts.length - 6} new designs appear first.<br>Open a post for its caption, source<br>and full-resolution export.</p></div><div class="filters" role="group" aria-label="Filter creatives">${filters}</div><div class="creative-grid">${cards}</div><p class="filter-status sr-only" role="status" aria-live="polite">${posts.length} creatives shown</p></section>
<section class="journey section" id="journey" aria-labelledby="journey-title"><div class="journey-copy"><p class="eyebrow">AFTER THE SCROLL</p><h2 id="journey-title">LESS GUESSWORK.<br><span>BETTER QUESTIONS.</span></h2><p>A short inquiry journey that helps someone explain the problem before the conversation starts.</p><ol class="journey-points"><li><b>01</b><div><strong>Start with their situation.</strong><span>Problem, property role and what they already know.</span></div></li><li><b>02</b><div><strong>Set honest expectations.</strong><span>No instant diagnosis or arrival promise.</span></div></li><li><b>03</b><div><strong>Leave with a useful summary.</strong><span>Copyable details. No fake booking confirmation.</span></div></li></ol><a class="text-link" href="inquiry.html">Open the full inquiry preview <span aria-hidden="true">↗</span></a></div><div class="phone-preview"><div class="phone-top"><span>INTERACTIVE PREVIEW</span><span>390 × 780</span></div><iframe title="Oceanides private inquiry preview" src="inquiry.html" loading="lazy"></iframe></div></section>
<aside class="review-note section" id="review-note"><p class="eyebrow">BEFORE PUBLIC USE</p><h2>DESIGN READY.<br><span>RELEASE STILL NEEDS A DECISION.</span></h2><p>This is a private creative and interaction preview. Draft wording, current service terms and launch clearance need approval before publishing. No posts are scheduled and no inquiries are sent.</p><details><summary>Asset provenance and review boundaries</summary><p>The two matched tank pairs use the later August 1 confirmation recorded in the funnel asset builder. The earlier daily-post documentation labels them differently; original-file provenance has not been independently established here. No job date or location is claimed. The August 8 project findings record an operating-clearance hold. This preview does not assert that hold has been resolved.</p><p>Visual references inform hierarchy, contrast and restraint. Their performance is not evidence that these new posts will convert. Measure qualified inquiries and completed jobs after an authorized launch.</p></details></aside>
</main><footer><span>OCEANIDES / FIELD NOTES 01</span><span>PRIVATE CREATIVE REVIEW · OCTOBER 2026</span><a href="#top">Back to top ↑</a></footer>
<dialog id="creative-dialog" aria-labelledby="dialog-title"><div class="dialog-header"><span id="dialog-number"></span><button id="close-dialog" class="icon-button" aria-label="Close creative review">✕</button></div><div class="dialog-layout"><img id="dialog-image" alt=""><div class="dialog-copy"><p class="eyebrow" id="dialog-family"></p><h2 id="dialog-title"></h2><p class="caption-label">DRAFT CAPTION</p><textarea id="dialog-caption" readonly aria-label="Draft caption" rows="8"></textarea><button id="copy-caption" class="primary-link" type="button">Copy caption <span aria-hidden="true">↗</span></button><p id="copy-status" class="copy-status" role="status"></p><div class="dialog-actions"><a id="download-post" class="text-link" download>Download 2160 × 2700 PNG ↓</a><a id="open-inquiry" class="text-link">Try its inquiry journey ↗</a></div><details><summary>Design source & proof context</summary><p id="dialog-inspiration"></p><p id="dialog-proof"></p></details><p class="draft-note">Private review. Wording and public release are pending approval.</p></div></div></dialog>
<script id="post-data" type="application/json">${JSON.stringify(dialogData).replace(/</g, '\\u003c')}</script><script>${js}</script></body></html>`;
const output = finalize(html, { label: 'oceanides-flagship-preview', ascii: false, required: ['id="collection"', 'id="journey"', 'id="creative-dialog"', 'PRIVATE REVIEW'], banned: [['glass', /backdrop-filter\s*:/i]] });
writeFileSync(resolve(dir, 'index.html'), output, 'utf8');
console.log(`Built private review gallery: ${posts.length} creatives, embedded images and available local fonts.`);
