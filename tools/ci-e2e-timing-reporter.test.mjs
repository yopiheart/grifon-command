import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import CiE2ETimingReporter from './ci-e2e-timing-reporter.mjs';

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reporterPath = join(root, 'tools/ci-e2e-timing-reporter.mjs');
const cli = require.resolve('@playwright/test/cli');
const reportPath = '.tmp/ci-e2e-timing/report.json';

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'ci-e2e-timing-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  writeFileSync(join(directory, 'playwright.config.cjs'), `module.exports = {
    testDir: '.', testMatch: '*.spec.cjs', workers: 1, retries: 1,
    reporter: [['github'], ['list']], projects: [{ name: 'synthetic' }],
  };`);
  writeFileSync(join(directory, 'timing.spec.cjs'), `
    const { test, expect } = require(${JSON.stringify(require.resolve('@playwright/test'))});
    test.describe('nested > suite', () => {
      test('passes', async ({}, info) => {
        console.log('private-stdout-marker');
        await info.attach('private-attachment-marker', { body: Buffer.from('private-body-marker'), contentType: 'text/plain' });
        expect(true).toBe(true);
      });
      test('retried success', ({}, info) => { expect(info.retry).toBe(1); });
      test('always fails', () => { expect(1).toBe(2); });
      test('expected failure', () => { test.fail(); expect(1).toBe(2); });
      test.skip('skipped', () => {});
    });
  `);
  return directory;
}

function run(directory, args) {
  const result = spawnSync(process.execPath, [cli, 'test', '--config=playwright.config.cjs',
    `--reporter=github,list,${reporterPath}`, ...args], {
    cwd: directory, encoding: 'utf8', timeout: 60_000,
  });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.signal, null);
  return { ...result, report: JSON.parse(readFileSync(join(directory, reportPath), 'utf8')) };
}

test('passing, retry, expected-failure and skipped results retain native outcomes', t => {
  const directory = fixture(t);
  const { status, stdout, report } = run(directory, ['--grep=passes$|retried success$|expected failure$|skipped$']);
  assert.equal(status, 0);
  assert.match(stdout, /2 passed/);
  assert.match(stdout, /1 flaky/);
  assert.match(stdout, /::error/); // GitHub reporter remains active for the failed attempt.
  assert.equal(report.status, 'passed');
  assert.deepEqual(report.discovery, { listOnly: false, tests: 4, files: 1 });
  assert.equal(report.shard, null);
  const passed = report.tests.find(test => test.titlePath.at(-1) === 'passes');
  assert.equal(passed.project, 'synthetic');
  assert.equal(passed.file, 'timing.spec.cjs');
  assert.deepEqual(passed.titlePath, ['nested > suite', 'passes']);
  assert.equal(passed.outcome, 'expected');
  assert.deepEqual(passed.attempts.map(attempt => [attempt.retry, attempt.status]), [[0, 'passed']]);
  const flaky = report.tests.find(test => test.titlePath.at(-1) === 'retried success');
  assert.equal(flaky.outcome, 'flaky');
  assert.deepEqual(flaky.attempts.map(attempt => [attempt.retry, attempt.status]), [[0, 'failed'], [1, 'passed']]);
  const expected = report.tests.find(test => test.titlePath.at(-1) === 'expected failure');
  assert.equal(expected.expectedStatus, 'failed');
  assert.equal(expected.outcome, 'expected');
  assert.equal(expected.attempts[0].status, 'failed');
  assert.equal(report.tests.find(test => test.titlePath.at(-1) === 'skipped').outcome, 'skipped');
  for (const test of report.tests) {
    for (const attempt of test.attempts) {
      assert.deepEqual(Object.keys(attempt).sort(), ['duration', 'retry', 'status']);
      assert.ok(Number.isFinite(attempt.duration) && attempt.duration >= 0);
    }
  }
  assert.doesNotMatch(JSON.stringify(report), /private-|attachments|stdout|stderr|environment/);
});

test('an exhausted retry keeps Playwright exit 1 and GitHub/list failure output', t => {
  const { status, stdout, report } = run(fixture(t), ['--grep=always fails$']);
  assert.equal(status, 1);
  assert.match(stdout, /1 failed/);
  assert.match(stdout, /::error/);
  assert.equal(report.status, 'failed');
  assert.equal(report.tests[0].outcome, 'unexpected');
  assert.deepEqual(report.tests[0].attempts.map(attempt => [attempt.retry, attempt.status]), [[0, 'failed'], [1, 'failed']]);
});

test('list discovery reports identities and shard without inventing timings', t => {
  const { status, report } = run(fixture(t), ['--list', '--shard=1/2']);
  assert.equal(status, 0);
  assert.equal(report.status, 'passed');
  assert.deepEqual(report.shard, { current: 1, total: 2 });
  assert.equal(report.discovery.listOnly, true);
  assert.equal(report.discovery.tests, report.tests.length);
  assert.ok(report.tests.length > 0);
  assert.ok(report.tests.every(test => test.attempts.length === 0));
});

test('filtered native partitions retain their actual shard and cover every identity once', t => {
  const directory = fixture(t);
  writeFileSync(join(directory, 'playwright.config.cjs'), `module.exports = {
    testDir: '.', testMatch: '*.spec.cjs', fullyParallel: true,
    projects: [{ name: 'synthetic' }],
  };`);
  writeFileSync(join(directory, 'timing.spec.cjs'), `
    const { test } = require(${JSON.stringify(require.resolve('@playwright/test'))});
    for (let i = 0; i < 5; i++) test('centered companion geometry and reachable controls at ' + i, () => {});
    for (let i = 0; i < 4; i++) test('ordinary ' + i, () => {});
  `);
  const grep = 'centered companion geometry and reachable controls at ';
  const reports = [];
  for (const current of [1, 2]) {
    for (const geometry of [false, true]) {
      const { status, report } = run(directory, ['--list',
        ...(geometry ? ['timing.spec.cjs', `--grep=${grep}`] : [`--grep-invert=${grep}`]),
        `--shard=${current}/2`]);
      assert.equal(status, 0);
      assert.deepEqual(report.shard, { current, total: 2 });
      assert.equal(report.discovery.listOnly, true);
      assert.equal(report.errors, 0);
      assert.equal(report.tests.length, geometry ? (current === 1 ? 3 : 2) : 2);
      assert.ok(report.tests.every(test => test.attempts.length === 0
        && test.titlePath.at(-1).startsWith(grep) === geometry));
      reports.push(report);
    }
  }
  const identities = reports.flatMap(report => report.tests.map(test => JSON.stringify([test.project, test.file, test.titlePath])));
  assert.equal(identities.length, 9);
  assert.equal(new Set(identities).size, 9);
});

test('discovery errors remain nonzero and do not disclose error text in telemetry', t => {
  const directory = fixture(t);
  writeFileSync(join(directory, 'timing.spec.cjs'), 'throw new Error("private-discovery-marker");');
  const { status, report } = run(directory, ['--list']);
  assert.equal(status, 1);
  assert.equal(report.status, 'failed');
  assert.ok(report.errors > 0);
  assert.equal(report.discovery.tests, 0);
  assert.doesNotMatch(JSON.stringify(report), /private-discovery-marker/);
});

test('reporter never returns a status override, including when telemetry cannot be written', t => {
  const directory = fixture(t);
  const outputFile = join(directory, reportPath);
  const reporter = new CiE2ETimingReporter({ outputFile });
  assert.equal(reporter.printsToStdio(), false);
  assert.equal(reporter.onEnd({ status: 'interrupted', duration: 42 }), undefined);
  assert.equal(JSON.parse(readFileSync(outputFile, 'utf8')).status, 'interrupted');
  mkdirSync(join(directory, 'blocked'));
  const blocked = new CiE2ETimingReporter({ outputFile: join(directory, 'blocked') });
  assert.equal(blocked.onEnd({ status: 'failed', duration: 0 }), undefined);
});

test('workflow balances native partitions and uploads only compact timing alongside screenshots', () => {
  const source = readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8');
  const jobs = source.slice(source.indexOf('\njobs:'));
  assert.deepEqual([...jobs.matchAll(/^  (\w[\w-]*):\r?$/gm)].map(match => match[1]),
    ['verify', 'e2e', 'artifacts', 'database', 'main-status']);
  const e2e = jobs.match(/^  e2e:[\s\S]*?(?=^  artifacts:)/m)[0];
  const shards = e2e.match(/shard: \[([^\]]+)\]/)[1].split(',').map(Number);
  assert.deepEqual(shards, Array.from({ length: 40 }, (_, i) => i + 1));
  assert.match(e2e, /fail-fast: false/);
  assert.match(e2e, /timeout-minutes: 15/);
  assert.equal((source.match(/sparse-checkout-cone-mode:/g) || []).length, 1);
  assert.match(e2e, /sparse-checkout-cone-mode: false\r?\n\s+sparse-checkout: \|\r?\n\s+\/\*\r?\n\s+!\/clients\/\r?\n\s+!\/workflows\/assets\/\r?\n\s+!\/artifacts\/\r?\n\s+!\/baselines\//);
  assert.doesNotMatch(e2e, /\bfilter:|continue-on-error:|--retries|--timeout|--test-list/);
  assert.ok(e2e.indexOf('run: node tools/check-ci-e2e-inputs.mjs') < e2e.indexOf('run: npm ci'));
  assert.match(e2e, /if \[ "\$\{\{ matrix\.shard \}\}" -le 38 \]; then/);
  assert.match(e2e, /echo "Runner slot \$\{\{ matrix\.shard \}\}: non-geometry native shard \$\{\{ matrix\.shard \}\}\/38"/);
  assert.match(e2e, /npm run test:e2e -- --grep-invert="centered companion geometry and reachable controls at " --shard=\$\{\{ matrix\.shard \}\}\/38 --reporter=github,list,\.\/tools\/ci-e2e-timing-reporter\.mjs/);
  assert.match(e2e, /else\r?\n\s+shard=\$\(\( \$\{\{ matrix\.shard \}\} - 38 \)\)/);
  assert.match(e2e, /echo "Runner slot \$\{\{ matrix\.shard \}\}: geometry native shard \$\{shard\}\/2"/);
  assert.match(e2e, /npm run test:e2e -- tests\/e2e\/companion-layout\.spec\.ts --grep="centered companion geometry and reachable controls at " --shard="\$\{shard\}\/2" --reporter=github,list,\.\/tools\/ci-e2e-timing-reporter\.mjs\r?\n\s+fi/);
  assert.doesNotMatch(e2e, /--shard=[^\r\n]*\/40/);
  assert.match(e2e, /name: Upload screenshots\r?\n\s+if: always\(\)\r?\n\s+uses: actions\/upload-artifact@v4\r?\n\s+with:\r?\n\s+name: boot-smoke-screenshots-\$\{\{ matrix\.shard \}\}\r?\n\s+path: test-results\/\r?\n\s+if-no-files-found: ignore\r?\n\s+retention-days: 7/);
  assert.match(e2e, /name: Upload E2E timing\r?\n\s+if: always\(\)\r?\n\s+uses: actions\/upload-artifact@v4\r?\n\s+with:\r?\n\s+name: boot-smoke-timing-\$\{\{ matrix\.shard \}\}\r?\n\s+path: \.tmp\/ci-e2e-timing\/report\.json\r?\n\s+include-hidden-files: true\r?\n\s+if-no-files-found: ignore\r?\n\s+retention-days: 7/);
  assert.match(source, /run: node --test tools\/check-ci-e2e-inputs\.test\.mjs tools\/ci-e2e-timing-reporter\.test\.mjs/);
});
