import { contacts } from '../posts.mjs';

const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

const photo = (src, alt, classes = '') => `<img class="photo ${classes}" src="${src}" alt="${escape(alt)}">`;
const brand = (logo, label) => `<header class="masthead"><div class="brand"><img class="logo" src="${logo}" alt="Oceanides"><span>OCEANIDES</span></div><p class="eyebrow">${label}</p></header>`;
const footer = (label = 'SEPTIC TANK · PLUMBING') => `<footer class="signature"><div class="signature-meta"><span>OCEANIDES</span><span>${label}</span></div><div class="contact-numbers">${contacts.map(contact => `<p class="contact-line"><span>${escape(contact.label)}</span><strong>${escape(contact.number)}</strong></p>`).join('')}</div></footer>`;

export function renderCanvas(post, assets) {
  const templates = {
    '01': () => `${brand(assets.logo, 'GABAY SA BAHAY')}
      <section class="problem-title"><h1><span>PAULIT-ULIT</span><span>ANG <em>BARA?</em></span></h1></section>
      <div class="problem-photo">${photo(assets.ba2Before, 'Historical archive photo of a round tank before the documented work.')}</div>
      <div class="problem-note"><span class="note-rule"></span><p>Ipa-check muna<br>ang sanhi.</p></div>
      ${footer()}`,
    '02': () => `${brand(assets.logo, '3 TANONG MUNA')}
      <section class="questions-title"><h1>BAGO KA<br>MAGPASIPSIP.</h1><span class="title-underline"></span></section>
      <section class="question-list" aria-label="Tatlong tanong bago magpasipsip">
        <div class="question-row"><span class="question-number">01</span><p>Ano ang posibleng<br>sanhi ng problema?</p></div>
        <div class="question-row"><span class="question-number">02</span><p>Ano ang kasama<br>sa presyo?</p></div>
        <div class="question-row"><span class="question-number">03</span><p>May posibleng<br>dagdag ba?</p></div>
      </section>
      <p class="questions-note">Mas malinaw ang tanong.<br>Mas malinaw ang desisyon.</p>
      ${footer('I-SAVE BAGO MAG-INQUIRE')}`,
    '03': () => `${brand(assets.logo, 'BAGO / PAGKATAPOS')}
      <section class="pair-title"><h1>PAREHONG<br><em>TANGKE.</em></h1></section>
      <section class="pair-photos" aria-label="Matched historical before and after photos">
        <figure>${photo(assets.ba2Before, 'Round tank before, with the same concrete surround.')}<figcaption class="photo-label before-label">BAGO</figcaption><span class="watermark">OCEANIDES</span></figure>
        <figure>${photo(assets.ba2After, 'The same round tank after, with the same concrete surround.')}<figcaption class="photo-label after-label">PAGKATAPOS</figcaption><span class="watermark">OCEANIDES</span></figure>
      </section>
      <p class="pair-note">Litrato bago. Litrato pagkatapos.<br><strong>Ikumpara ang pagbabago.</strong></p>
      ${footer('MULA SA PHOTO ARCHIVE')}`,
    '04': () => `${brand(assets.logo, 'TINGNAN ANG PAGBABAGO')}
      <section class="result-title"><h1>SA RESULTA<br>MAKIKITA.</h1></section>
      <figure class="result-after">${photo(assets.ba3After, 'Historical archive: the rectangular tank after work. The red pipe identifies the fixture.')}<figcaption class="photo-label after-label">PAGKATAPOS</figcaption><span class="watermark">OCEANIDES</span></figure>
      <figure class="result-before">${photo(assets.ba3Before, 'The same rectangular tank before work, with the same red pipe.')}<figcaption class="photo-label before-label">BAGO</figcaption><span class="watermark">OCEANIDES</span></figure>
      <div class="result-note"><span class="small-rule"></span><p>Parehong tank.<br>Kitang pagbabago.</p></div>
      ${footer('MULA SA PHOTO ARCHIVE')}`,
    '05': () => `${brand(assets.logo, 'BAGO KA PUMAYAG')}
      <section class="price-title"><p class="price-intro">ALAMIN ANG</p><h1>BUONG<br>PRESYO.</h1><p class="price-subhead">BAGO MAGSIMULA.</p></section>
      <section class="quote-sheet" aria-label="Mga dapat linawin sa quote">
        <div class="sheet-heading"><p>LINAWIN SA QUOTE</p><span class="sheet-corner"></span></div>
        <div class="quote-row"><span class="check-box"></span><p>Ano ang gagawin</p></div>
        <div class="quote-row"><span class="check-box"></span><p>Ano ang kasama</p></div>
        <div class="quote-row"><span class="check-box"></span><p>Posibleng dagdag</p></div>
        <p class="sheet-note">Basahin ang kasama<br>at posibleng dagdag.</p>
      </section>
      <div class="price-close"><p>Linawin muna bago mag-book.</p><span class="line-arrow"></span></div>
      ${footer()}`,
    '06': () => `${brand(assets.logo, 'GABAY SA PAG-BOOK')}
      <section class="process-title"><h1>ALAMIN MUNA.<br><em>SAKA MAG-BOOK.</em></h1><p>Magsimula sa info, hindi sa hula.</p></section>
      <section class="process-list" aria-label="Tatlong hakbang bago mag-book">
        <div class="process-row"><span class="process-number">01</span><div><h2>Lugar at problema</h2><p>Saan at ano ang napapansin mo?</p></div></div>
        <div class="process-row"><span class="process-number">02</span><div><h2>Gagawin at presyo</h2><p>Kasama at posibleng dagdag.</p></div></div>
        <div class="process-row"><span class="process-number">03</span><div><h2>I-check ang schedule</h2><p>I-confirm muna ang availability.</p></div></div>
      </section>
      <div class="process-close"><p>Malinaw muna.<br><strong>Bago ka pumayag.</strong></p><span class="line-arrow"></span></div>
      ${footer()}`,
  };
  if (!templates[post.id]) throw new Error(`Unknown post template: ${post.id}`);
  return `<main id="canvas" class="canvas post-${post.id}" aria-label="${escape(post.title)}">${templates[post.id]()}</main>`;
}

export function renderPost(post, { css, assets, fonts }) {
  const fontCss = `@font-face{font-family:Anton;src:url(${fonts.anton}) format('truetype');font-weight:400;font-style:normal;font-display:block}@font-face{font-family:Inter;src:url(${fonts.inter}) format('truetype');font-weight:100 900;font-style:normal;font-display:block}`;
  const metadata = JSON.stringify(post).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="fil"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="oceanides-publication-status" content="private-review"><meta name="viewport" content="width=1080"><title>Oceanides private creative ${post.id}: ${escape(post.title)}</title><style>${fontCss}\n${css}</style></head><body>${renderCanvas(post, assets)}<script type="application/json" id="post-metadata">${metadata}</script></body></html>`;
}
