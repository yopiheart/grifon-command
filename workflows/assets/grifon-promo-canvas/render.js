/* Frame renderer — resumable by design.
   Agent shells usually cap a single command at well under a minute, and a
   full render takes minutes. Every frame that already exists on disk is
   skipped, so you just call this repeatedly until nothing is missing.

     node render.js OUTDIR                      # everything
     node render.js OUTDIR all 120 180          # a range (run 4 in parallel)
     node render.js OUTDIR preview 2.4 6.0 9.1  # stills at given seconds
     node render.js OUTDIR missing              # list gaps
*/
const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

/*  FONTS — DESIGN.md typography, in full.
    v1 registered ONLY Inter-Black from api/_lib/assets and used it for every
    string. Two things were wrong with that: every `700` call silently rendered
    at 900 (one weight was registered, so there was nothing to fall back to but
    itself), and DESIGN.md's `label-caps` role — the `//` meta-labels, buttons
    and technical data — is JetBrains Mono, which the repo does not ship at all.
    index.html states it as a LAW: labels/buttons/tech-data are mono.
    So the real families are pulled from Google Fonts into ./fonts and
    registered per weight. Downloaded once; the folder is committed alongside
    the composition so a post-defreezer session re-renders offline. */
const FONTS = [
  ['fonts/inter-400.ttf', 'Inter', 400],
  ['fonts/inter-700.ttf', 'Inter', 700],
  ['fonts/inter-900.ttf', 'Inter', 900],
  ['fonts/jbmono-600.ttf', 'JBMono', 600],
  ['fonts/jbmono-800.ttf', 'JBMono', 800],
];
let missing = 0;
for (const [file, family] of FONTS) {
  const p = path.join(__dirname, file);
  if (fs.existsSync(p)) GlobalFonts.registerFromPath(p, family);
  else { console.warn('WARN: missing font ' + file); missing++; }
}
if (missing) console.warn('WARN: ' + missing + ' font(s) missing — output will NOT match DESIGN.md.');

const ENGINE = require('./engine.js');

// Decode brand art ONCE, then hand it to the engine, which stays synchronous.
const LOGO = 'C:/Users/Administrator/Desktop/grifon-command/public/logo.png';
let assetsReady = Promise.resolve();
if (fs.existsSync(LOGO)) {
  assetsReady = loadImage(LOGO).then((img) => ENGINE.setAssets({ logo: img }));
} else {
  console.warn('WARN: public/logo.png not found — CTA falls back to the drawn ring.');
}

assetsReady.then(() => {

const outDir = process.argv[2] || './frames';
const mode = process.argv[3] || 'all';
fs.mkdirSync(outDir, { recursive: true });

const total = Math.round(ENGINE.DUR * ENGINE.FPS);
const canvas = createCanvas(ENGINE.W, ENGINE.H);
const ctx = canvas.getContext('2d');

if (mode === 'preview') {
  process.argv.slice(4).map(Number).forEach((t, i) => {
    ENGINE.drawFrame(ctx, t);
    fs.writeFileSync(path.join(outDir, 'p_' + String(i).padStart(2, '0') + '.png'),
      canvas.toBuffer('image/png'));
  });
  console.log('preview frames:', process.argv.length - 4);

} else if (mode === 'missing') {
  const have = new Set(fs.readdirSync(outDir).filter(f => /^f_\d+\.png$/.test(f))
    .map(f => parseInt(f.slice(2, -4), 10)));
  const miss = [];
  for (let i = 0; i < total; i++) if (!have.has(i)) miss.push(i);
  console.log(JSON.stringify({ total, have: have.size, missing: miss.length, first: miss.slice(0, 10) }));

} else {
  const a = parseInt(process.argv[4] || '0', 10);
  const b = parseInt(process.argv[5] || '0', 10);
  const from = b > 0 ? a : 0, to = b > 0 ? Math.min(b, total) : total;
  const t0 = Date.now();
  let drew = 0;
  for (let i = from; i < to; i++) {
    const p = path.join(outDir, 'f_' + String(i).padStart(4, '0') + '.png');
    if (fs.existsSync(p) && fs.statSync(p).size > 2000) continue;   // resume
    ENGINE.drawFrame(ctx, i / ENGINE.FPS);
    fs.writeFileSync(p, canvas.toBuffer('image/png'));
    drew++;
  }
  console.log(`rendered ${from}->${to} (${drew} new) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

}).catch((e) => { console.error("render failed:", e.message); process.exitCode = 1; });
