#!/usr/bin/env node
// ad_asset_sweep — naglilinis ng basura sa mga ad folder, at nagsusumbong sa
// mga kahina-hinala.
//
//   node tools/ad_asset_sweep.mjs            # burahin ang LIGTAS, isumbong ang duda
//   node tools/ad_asset_sweep.mjs --report   # walang burahin, tingin lang
//   node tools/ad_asset_sweep.mjs --apply    # burahin PATI ang duda (may listahan muna)
//
// BAKIT SYA UMIIRAL (Neil, 2026-08-03): "paki delete ung mga files na walang
// kwenta... pa note din nyan na autofire ang pagdelete at paglinis para in the
// future walang natatambak." Ang isang session ng KM-004 ay nag-iwan ng 87 MB
// na patay na piraso: build intermediates, litratong pinagmulan na naging mp4
// na, caption na hindi ginamit, at supersedeng render.
//
// 🔴 ANG HATI, AT KUNG BAKIT HINDI LAHAT AY AWTOMATIKO
// Ang bulag na pagbura ng asset ay mas mahal kaysa sa tambak. Ang isang Veo
// clip ay BAYAD at hindi na maibabalik kapag naubos ang budget — nangyari yun
// noong 2026-08-03. Kaya dalawang antas:
//
//   AWTOMATIKO — ang `edit/` na mga folder LANG. Gitignored sila, deklarado sa
//     .gitignore mismo bilang "intermediates, rebuildable via build-cut.sh",
//     at isang utos lang ang pagbabalik. Zero na panganib, at sila rin ang
//     pinakamalaki (70 MB sa isang ad).
//   ISINUSUMBONG LANG — lahat ng iba. Kailangan ng mata bago mabura, at
//     `--apply` ang sasabihin mo kapag sang-ayon ka.

import { readdirSync, statSync, rmSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const REPORT_ONLY = argv.includes('--report');
const APPLY = argv.includes('--apply');
const QUIET = argv.includes('--quiet');

const ROOTS = ['clients'];
const kb = (n) => (n / 1024 / 1024 >= 1 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { out.push({ p, dir: true }); walk(p, out); }
    else out.push({ p, dir: false, size: statSync(p).size });
  }
  return out;
}

const dirSize = (d) => walk(d).filter((x) => !x.dir).reduce((a, b) => a + b.size, 0);

const all = ROOTS.flatMap((r) => walk(r));
const auto = [];   // buburahin agad
const flag = [];   // isusumbong

// --- 1. AWTOMATIKO: ang mga `edit/` na folder ------------------------------
for (const e of all) {
  if (e.dir && path.basename(e.p) === 'edit' && /[\\/]ads[\\/]/.test(e.p)) {
    const s = dirSize(e.p);
    if (s > 0) auto.push({ p: e.p, size: s, why: 'build intermediates, gitignored, rebuildable ng build-cut.sh' });
  }
}

// --- 2. SUMBONG: supersedeng render (may mas mataas na -vN katabi) ---------
const renders = all.filter((e) => !e.dir && /-v(\d+)\.mp4$/.test(e.p));
const byStem = new Map();
for (const r of renders) {
  const stem = r.p.replace(/-v\d+\.mp4$/, '');
  const v = +r.p.match(/-v(\d+)\.mp4$/)[1];
  if (!byStem.has(stem)) byStem.set(stem, []);
  byStem.get(stem).push({ ...r, v });
}
for (const [, list] of byStem) {
  if (list.length < 2) continue;
  const top = Math.max(...list.map((x) => x.v));
  for (const r of list) if (r.v < top) flag.push({ p: r.p, size: r.size, why: `supersedeng render, may v${top} na` });
}

// --- 3. SUMBONG: litratong pinagmulan na may mp4 nang katabi ----------------
// Ang `b1.png` na may `b1.mp4` sa tabi ay pinagmulan na naging video na, at
// may recipe (`make-*.mjs`) na kayang gumawa ulit nang libre.
for (const e of all) {
  if (e.dir || !/\.png$/.test(e.p)) continue;
  const mp4 = e.p.replace(/\.png$/, '.mp4');
  if (!existsSync(mp4)) continue;
  const adDir = path.dirname(path.dirname(e.p));
  const hasRecipe = readdirSync(adDir).some((f) => /^make-.*\.mjs$/.test(f));
  if (hasRecipe) flag.push({ p: e.p, size: e.size, why: 'pinagmulan ng katabing mp4, may make-*.mjs na recipe' });
}

// --- 4. SUMBONG: overlay/caption na hindi tinutukoy ng build-cut.sh --------
for (const e of all) {
  if (!e.dir || !/[\\/](overlays|captions)$/.test(e.p)) continue;
  const build = path.join(path.dirname(e.p), 'build-cut.sh');
  if (!existsSync(build)) continue;
  const sh = readFileSync(build, 'utf8');
  for (const f of readdirSync(e.p)) {
    if (!/\.(mov|mp4)$/.test(f)) continue;
    if (!sh.includes(f)) {
      const p = path.join(e.p, f);
      flag.push({ p, size: statSync(p).size, why: 'hindi tinutukoy ng build-cut.sh' });
    }
  }
}

// --- labas ------------------------------------------------------------------
const total = (a) => a.reduce((x, y) => x + y.size, 0);

if (!auto.length && !flag.length) {
  if (!QUIET) console.log('ad_asset_sweep: malinis, walang natambak.');
  process.exit(0);
}

if (auto.length) {
  if (REPORT_ONLY) {
    console.log(`\nLILINISIN NANG AWTOMATIKO (${kb(total(auto))}):`);
    for (const a of auto) console.log(`  ${a.p}  ${kb(a.size)}  — ${a.why}`);
  } else {
    for (const a of auto) rmSync(a.p, { recursive: true, force: true });
    console.log(`ad_asset_sweep: nalinis ang ${auto.length} na edit/ folder, ${kb(total(auto))}.`);
  }
}

if (flag.length) {
  console.log(`\n⚠️  ${flag.length} na kahina-hinala (${kb(total(flag))}) — mata muna bago burahin:`);
  for (const f of flag) console.log(`  ${f.p}  ${kb(f.size)}  — ${f.why}`);
  if (APPLY) {
    for (const f of flag) rmSync(f.p, { force: true });
    console.log(`\nBinura lahat (--apply).`);
  } else {
    console.log(`\n  Burahin lahat:  node tools/ad_asset_sweep.mjs --apply`);
  }
}
