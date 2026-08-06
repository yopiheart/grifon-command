// Paolo trust cards (B2B compliance) — Gauntlet build loop, TRUST axis.
// Usage: node clients/oceanides/kuya-marvin/organic/cards/build-trust-cards.mjs
//
// Hiwalay ito sa build-cards.mjs para hindi ma-re-render ang naipadalang Week 01
// na hook cards. Parehong contract: #canvas @2x, 1080x1350.
//
// Ang dalawang variant ay MAGKAPAREHO maliban sa HOOK. Sinadya yun — isang
// variable lang ang pinapalitan para masabi kung ang hook mismo ang gumagalaw sa
// score, hindi ang buong layout. Kapareho ito ng disiplina ng axis experiment sa
// workflows/gauntlet_loop_decision.md ("only the question changed").
//
// Lahat ng copy dito ay hango sa naaprubahang clients/oceanides/paolo-page-copy.md.
// ⛔ Walang bagong claim, walang gawa-gawang numero, walang selyo.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));

// Pareho sa dalawa. Ang gap na sinasagot: "walang machi-check" (Stripe E71, 82).
const SHARED = {
  // Round 2. Nagsimula sa vw1-s6-clipboard at kumuha ng 82 — pero pare-pareho ang
  // anim na run sa iisang gap: "casual portrait rather than showing official
  // equipment, team uniforms, or real field operations". Ito ang sagot doon:
  // truck, work clothes, boots, kagamitan sa loob, nakatingin sa camera, nasa site.
  bg: '../stills-week01/vw1-s5-van-rear.png',
  eyebrow: 'DENR at LLDA na papel · Metro Manila',
  // paolo-page-copy.md §2 socialProofBar, pinaikli. "Mahigit 1,000" ay may
  // pinagmulan (Boss Jay kay Neil, 2026-08-01) — wag palitan ng eksaktong numero.
  authority:
    'Mahigit 1,000 na tangke na ang na-service namin sa Metro Manila. SEC Registered, may LLDA permit, at may MOA sa treatment facility na tinatanggap ng DENR.',
  // paolo-page-copy.md §11. Ito ang Wise E75 (81) na move: inaamin ang limitasyon
  // sa mismong creative.
  foot:
    '15 days ang normal na hintay sa Certificate of Treatment. Hindi namin sya kayang bilisan, at hindi rin namin sya bibilisan para lang may maisagot sayo.',
};

const CARDS = [
  {
    // A · urgency — ang 15 days laban sa petsa ng renewal (paolo-page-copy.md, ang
    // tanging totoong scarcity sa buong page).
    out: 'paolo-trust-a-urgency.png',
    hook: 'Paparating na ang renewal nyo. <em>15 days</em> ang certificate.',
  },
  {
    // B · admit-against-interest — tinatanggihan ang pinakamadaling benta.
    out: 'paolo-trust-b-admit.png',
    hook: '<em>Hindi namin kayang bilisan</em> ang certificate nyo. Yan ang totoo.',
  },
];

const template = readFileSync(path.join(DIR, 'trust-card-template.html'), 'utf8');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1080, height: 1350 },
    deviceScaleFactor: 2,
  });

  for (const card of CARDS) {
    const html = template
      .replace('%%BG%%', SHARED.bg)
      .replace('%%EYEBROW%%', SHARED.eyebrow)
      .replace('%%HOOK%%', card.hook)
      .replace('%%AUTHORITY%%', SHARED.authority)
      .replace('%%FOOT%%', SHARED.foot);
    const tmp = path.join(DIR, '.tmp-' + card.out.replace('.png', '.html'));
    writeFileSync(tmp, html);
    try {
      await page.goto(pathToFileURL(tmp).href, { waitUntil: 'networkidle', timeout: 60000 });
      await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
      await page.waitForTimeout(1200);
      const el = await page.$('#canvas');
      if (!el) throw new Error('#canvas not found: ' + tmp);
      await el.screenshot({ path: path.join(DIR, card.out) });
      console.log('rendered ' + card.out);
    } finally {
      rmSync(tmp, { force: true });
    }
  }
} finally {
  await browser.close();
}
