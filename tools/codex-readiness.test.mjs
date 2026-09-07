import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { inspectDependencies, inspectPaths } from './codex-readiness.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'codex-readiness-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const put = (name, content = '') => {
    mkdirSync(dirname(join(root, name)), { recursive: true });
    writeFileSync(join(root, name), content);
  };
  return { root, put };
}

test('a directory or empty node_modules cannot stand in for missing core files', (t) => {
  const { root, put } = fixture(t);
  mkdirSync(join(root, 'node_modules'));
  put('package.json', '{}');
  assert.equal(inspectDependencies(root).every((check) => !check.ok), true);
  assert.equal(inspectPaths(root).find((check) => check.id === 'source').ok, false);
  for (const name of ['package-lock.json', 'App.tsx', 'vite.config.ts']) put(name);
  assert.equal(inspectPaths(root).find((check) => check.id === 'source').ok, true);
  put('node_modules/vite/package.json', '{"main":"missing.js"}');
  assert.equal(inspectDependencies(root).find((check) => check.id === 'vite').ok, false);
  // Node caches failed filesystem lookups; a fresh checkout models the next run.
  const complete = fixture(t);
  complete.put('package.json', '{}');
  complete.put('node_modules/vite/package.json', '{"main":"index.js"}');
  complete.put('node_modules/vite/index.js');
  assert.equal(inspectDependencies(complete.root).find((check) => check.id === 'vite').ok, true);
});

test('sparse checkout missing even one tracked example or sample is reported', (t) => {
  const { root, put } = fixture(t);
  const paths = ['public/examples/first.png', 'public/examples/last.png', 'tests/fixtures/sample-batch/clip.mp4'];
  put(paths[0]);
  let checks = inspectPaths(root, paths);
  assert.equal(checks.find((check) => check.group === 'browser').ok, false);
  assert.match(checks.find((check) => check.group === 'browser').detail, /last\.png/);
  assert.equal(checks.find((check) => check.group === 'samples').ok, false);
  for (const name of paths) put(name);
  checks = inspectPaths(root, paths);
  assert.equal(checks.find((check) => check.group === 'browser').ok, true);
  assert.equal(checks.find((check) => check.group === 'samples').ok, true);
  assert.equal(inspectPaths(root).find((check) => check.group === 'samples').ok, false);
});

test('hook feature flag must be active in its own section, with registration present', (t) => {
  const { root, put } = fixture(t);
  const flag = () => inspectPaths(root).find((check) => check.id === 'hooks-config').ok;
  assert.equal(flag(), false);
  put('.codex/config.toml', '[features]\nhooks = false\n[mcp_servers.demo]\nhooks = true\n');
  assert.equal(flag(), false);
  put('.codex/config.toml', '[features]\n# hooks = true\n');
  assert.equal(flag(), false);
  put('.codex/config.toml', '[features]\nhooks = true\n');
  assert.equal(flag(), true);
  const registration = () => inspectPaths(root).find((check) => check.id === 'hooks-file').ok;
  assert.equal(registration(), false);
  put('.codex/hooks.json', '{broken');
  assert.equal(registration(), false);
  put('.codex/hooks.json', '{"hooks":{}}');
  assert.equal(registration(), false);
  put('.codex/hooks.json', JSON.stringify({ hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'node check.mjs' }] }] } }));
  assert.equal(registration(), true);
});
