#!/usr/bin/env node
// Read-only guard for E2E sparse checkouts. Git, not the sparse working tree,
// supplies the inventory so an omitted tracked input cannot disappear silently.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const manifestPath = 'public/companion/asset-manifest.json';
const avatarPath = 'components/CompanionChat/CompanionAvatar.tsx';
const media = new Set(['.png', '.jpg', '.jpeg', '.mp4', '.webm']);

export function checkInputs(paths, read) {
  const tracked = new Set(paths);
  const errors = [];
  const checked = new Map();
  const load = path => {
    if (checked.has(path)) return checked.get(path);
    let bytes = null;
    try {
      bytes = Buffer.from(read(path));
      if (!bytes.length) { errors.push(`${path}: empty input`); bytes = null; }
    } catch { errors.push(`${path}: missing or unreadable input`); }
    checked.set(path, bytes);
    return bytes;
  };
  const checkMedia = path => {
    if (checked.has(path)) return;
    const bytes = load(path);
    if (!bytes) return;
    const extension = extname(path).toLowerCase();
    const valid = extension === '.png' ? bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a'
      : extension === '.jpg' || extension === '.jpeg' ? bytes.subarray(0, 3).toString('hex') === 'ffd8ff'
      : extension === '.mp4' ? bytes.subarray(4, 8).toString() === 'ftyp'
      : extension === '.webm' ? bytes.subarray(0, 4).toString('hex') === '1a45dfa3'
      : true;
    if (!valid) errors.push(`${path}: invalid ${extension} media signature`);
  };

  const examples = paths.filter(path => path.startsWith('public/examples/') && path.endsWith('.png'));
  if (!examples.length) errors.push('public/examples: no committed PNG examples');
  const required = new Set([...examples, 'public/samples/real_talk.mp4', 'public/samples/unboxing.mp4']);
  for (const path of paths) {
    if (/^tests\/(?:fixtures\/sample-batch|e2e\/fixtures)\//.test(path) && media.has(extname(path).toLowerCase())) required.add(path);
  }

  let companion = tracked.has(manifestPath) || tracked.has(avatarPath);
  if (tracked.has(avatarPath)) load(avatarPath);
  for (const path of paths.filter(path => /^(?:tests\/e2e|dev)\//.test(path) && /\.[cm]?[jt]sx?$/.test(path))) {
    const bytes = load(path);
    if (!bytes) continue;
    const source = bytes.toString('utf8');
    if (/(?:public\/|\/)companion\//.test(source)) companion = true;
    // Literal fixture URLs/paths can name an input missing from the Git tree.
    for (const match of source.matchAll(/['"`](\/?tests\/(?:fixtures|e2e\/fixtures)\/[^'"`\s]+\.(?:png|jpe?g|mp4|webm))['"`]/g)) required.add(match[1].replace(/^\//, ''));
  }
  // The preview consumes these even when its fixture controls are not clicked.
  if (tracked.has('dev/companionChatPreview.tsx')) {
    companion = true;
    required.add('tests/fixtures/sample-batch/timpla-hero.jpg');
    required.add('tests/fixtures/sample-batch/before_after-run1-complete-raw.mp4');
  }
  for (const path of required) checkMedia(path);

  if (companion) {
    for (const path of paths.filter(path => path.startsWith('public/companion/') && !path.endsWith('/.gitattributes'))) {
      if (media.has(extname(path).toLowerCase())) checkMedia(path); else load(path);
    }
    const bytes = load(manifestPath);
    if (bytes) {
      try {
        const { hashes } = JSON.parse(bytes.toString('utf8'));
        if (!hashes || typeof hashes !== 'object' || Array.isArray(hashes) || !Object.keys(hashes).length) throw new Error('nonempty hashes object required');
        for (const [file, hash] of Object.entries(hashes)) {
          if (!file || file.startsWith('/') || /[\\:]/.test(file) || file.split('/').some(part => !part || part === '.' || part === '..') || typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash)) throw new Error('invalid asset path or SHA-256');
          const path = `public/companion/${file}`;
          if (media.has(extname(path).toLowerCase())) checkMedia(path);
          const asset = load(path);
          if (asset && createHash('sha256').update(asset).digest('hex') !== hash) errors.push(`${path}: manifest SHA-256 mismatch`);
        }
      } catch (error) { errors.push(`${manifestPath}: invalid manifest (${error.message})`); }
    }
  }
  return { files: checked.size, examples: examples.length, companion, errors };
}

export function main(args = process.argv.slice(2), cwd = process.cwd()) {
  if (args.length) throw new Error('Usage: node tools/check-ci-e2e-inputs.mjs');
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  const root = git('rev-parse', '--show-toplevel').trim();
  const paths = git('ls-tree', '-rz', '--name-only', 'HEAD').split('\0').filter(Boolean);
  const result = checkInputs(paths, path => readFileSync(resolve(root, path)));
  for (const error of result.errors) console.error(`FAIL ${error}`);
  console.log(`E2E inputs: ${result.files} checked, ${result.examples} committed PNG examples, companion ${result.companion ? 'required' : 'absent from this source'}, ${result.errors.length} errors`);
  return result.errors.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
