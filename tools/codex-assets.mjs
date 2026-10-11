#!/usr/bin/env node
// Select committed workflow inputs without downloading the entire media library.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const profiles = {
  instructions: 'Excluded workflow instructions, scripts, manifests, and source templates',
  wizard: 'Upload guide images and the documented sample-batch fixtures',
  zam: 'Zam skill package and its approved master reference',
  marvin: 'Marvin original references, approved taste frames, and company vehicle',
  'artifact-sources': 'Committed inputs for the existing retained artifact builders',
};
const textExtensions = new Set(['.md', '.mjs', '.js', '.ts', '.tsx', '.py', '.sh', '.ps1', '.json', '.yaml', '.yml', '.toml', '.txt']);
const under = (path, prefix) => path.startsWith(prefix + '/');
export function selectPaths(paths, profile) {
  if (!Object.hasOwn(profiles, profile)) throw new Error(`Unknown profile: ${profile}`);
  return paths.filter(path => {
    // Retired by Neil on 2026-10-11. Do not restore discontinued identity assets.
    if (under(path, 'clients/oceanides/kuya-gabriel') || [
      'clients/oceanides/page-assets/fb-profile-gabriel-1080.png',
      'funnels/oceanides-price-page/public/img/gabriel.webp',
      'funnels/oceanides-paolo/public/img/gabriel.webp',
      'artifacts/gabriel-review.html', 'artifacts/gb-001-brief.html',
    ].includes(path)) return false;
    if (profile === 'instructions') return /^(clients|assets|samples|workflows)\//.test(path) &&
      (textExtensions.has(extname(path)) || (/\/(templates|overlays)\//.test(path) && path.endsWith('.html')));
    if (profile === 'wizard') return under(path, 'public/examples') || under(path, 'tests/fixtures/sample-batch');
    if (profile === 'zam') return under(path, 'workflows/believability-samples/generate-zam-images') ||
      path === 'workflows/believability-samples/zam-master/opt-C-presenter.png';
    if (profile === 'marvin') return under(path, 'clients/oceanides/kuya-marvin/refs') ||
      under(path, 'clients/oceanides/kuya-marvin/Approved images from gpt 5.6') ||
      path === 'clients/oceanides/assets/Aluminum-C-VAN-6-Wheeler-Truck-14-m.jpg';
    return /^assets\/ad-swipe\/E(?:8[2-9]|9[0-3])-/.test(path) ||
      under(path, 'clients/oceanides/kuya-marvin/organic') ||
      under(path, 'artifacts');
  }).sort();
}
export function sparsePattern(path) {
  // Git sparse rules use gitignore syntax; treat tracked file names literally.
  return '/' + path.replace(/[\\*?\[\]]/g, '\\$&');
}
export function main(args = process.argv.slice(2), cwd = process.cwd()) {
  if (!args.length || args.includes('--help')) {
    console.log('node tools/codex-assets.mjs <profile> [--check | --apply] [--list]');
    for (const [name, description] of Object.entries(profiles)) console.log(`  ${name}: ${description}`);
    console.log('Default is a read-only plan. --apply adds exact tracked paths to existing sparse rules.');
    return 0;
  }
  if (args.some((a, i) => i > 0 && !['--check', '--apply', '--list'].includes(a)) || (args.includes('--check') && args.includes('--apply'))) {
    throw new Error('Use one profile and either --check or --apply.');
  }
  const git = (...gitArgs) => execFileSync('git', gitArgs, { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  const root = git('rev-parse', '--show-toplevel').trim();
  const paths = selectPaths(git('ls-tree', '-rz', '--name-only', 'HEAD').split('\0').filter(Boolean), args[0]);
  const missing = paths.filter(path => !existsSync(resolve(root, path)));
  console.log(`${args[0]}: ${paths.length} tracked inputs; ${missing.length} absent.`);
  if (args.includes('--list')) missing.forEach(path => console.log(path));
  if (args.includes('--apply') && missing.length) {
    let sparse = '';
    try { sparse = git('config', '--bool', 'core.sparseCheckout').trim(); } catch { /* full checkout */ }
    if (sparse !== 'true') throw new Error('Missing files in a full checkout: inspect git status; refusing to restore deleted work.');
    const flags = git('ls-files', '-t', '-z').split('\0');
    const skipped = new Set(flags.filter(line => line.startsWith('S ')).map(line => line.slice(2)));
    if (missing.some(path => !skipped.has(path))) throw new Error('A selected file is deleted outside sparse checkout; inspect git status before restoring it.');
    execFileSync('git', ['sparse-checkout', 'add', '--stdin'], {
      cwd: root, input: missing.map(sparsePattern).join('\n') + '\n', stdio: ['pipe', 'inherit', 'inherit'],
    });
  }
  const remaining = paths.filter(path => !existsSync(resolve(root, path)));
  if (args.includes('--check') || args.includes('--apply')) {
    console.log(remaining.length ? `INCOMPLETE: ${remaining.length} inputs absent.` : 'OK: all selected inputs are present.');
    return remaining.length ? 1 : 0;
  }
  return 0;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
