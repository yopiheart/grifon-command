import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { evaluateReport, parseArgs, assertSafeEnvironment, expectedCases, manifest } from '../../tools/verify-recovery-report.mjs';

const startedAt = '2026-09-28T00:00:00.000Z';
const metadata = { runId: 'unit-run', startedAt, finishedAt: '2026-09-28T00:01:00.000Z', childExitCode: 0 };
function report() {
  return {
    config: { metadata: { recoveryRunId: 'unit-run' } }, errors: [],
    stats: { startTime: startedAt, duration: 100, expected: 2, unexpected: 0, flaky: 0, skipped: 0 },
    suites: [{ title: 'oneshot-legacy-recovery.spec.ts', specs: [], suites: [375, 1280].map(width => ({
      title: `legacy recovery at ${width}`, specs: [{
        title: 'typed brief and uploaded asset survive closing and reopening the page',
        file: 'oneshot-legacy-recovery.spec.ts', ok: true,
        tests: [{ projectName: 'chromium', expectedStatus: 'passed', status: 'expected', results: [{
          status: 'passed', retry: 0, errors: [], duration: 50, attachments: [{ name: 'trace', path: `trace-${width}.zip` }],
        }] }],
      }],
    })) }],
  };
}
const evaluate = (value: unknown, override = {}) => evaluateReport(value, ['draft'], { ...metadata, ...override });

describe('recovery verification evidence contract', () => {
  it('maps the actual 20 Playwright cases exactly, detecting manifest/title drift without a browser', () => {
    const require = createRequire(import.meta.url);
    const child = spawnSync(process.execPath, [require.resolve('@playwright/test/cli'), 'test', '--config', 'playwright.recovery.config.ts', '--list', '--reporter=json'], {
      encoding: 'utf8', shell: false, timeout: 15_000,
      env: { ...process.env, RECOVERY_RUN_ID: 'discovery', RECOVERY_EVIDENCE_DIR: '.tmp/recovery-discovery', PLAYWRIGHT_JSON_OUTPUT_FILE: '', PLAYWRIGHT_JSON_OUTPUT_NAME: '' },
    });
    expect(child.status, child.stderr).toBe(0);
    const discovery = JSON.parse(child.stdout);
    const actual: string[] = [];
    function walk(suites: any[]) {
      for (const suite of suites) {
        for (const spec of suite.specs) for (const test of spec.tests) actual.push(`${spec.file}|${suite.title}|${spec.title}|${test.projectName}`);
        walk(suite.suites ?? []);
      }
    }
    walk(discovery.suites);
    const expected = expectedCases(manifest.flows.map((flow: { id: string }) => flow.id));
    expect(actual).toHaveLength(20);
    expect(actual.sort()).toEqual(expected.map((item: { file: string; suite: string; title: string }) => `${item.file}|${item.suite}|${item.title}|chromium`).sort());
  }, 20_000);
  it('requires both viewports and marks all unselected flows NOT RUN', () => {
    const result = evaluate(report());
    expect(result.status).toBe('PASS');
    expect(result.flows[0].status).toBe('PASS');
    expect(result.flows.slice(1).every((flow: { status: string }) => flow.status === 'NOT RUN')).toBe(true);
  });
  it('rejects zero tests and a missing viewport', () => {
    const empty = report(); empty.suites = [];
    expect(evaluate(empty).status).toBe('FAIL');
    const missing = report(); missing.suites[0].suites.pop();
    expect(evaluate(missing).flows[0].status).toBe('FAIL');
  });
  it('rejects skipped, flaky, expected-failure and repeated tests', () => {
    for (const status of ['skipped', 'flaky']) {
      const value = report(); value.suites[0].suites[0].specs[0].tests[0].status = status;
      expect(evaluate(value).status).toBe('FAIL');
    }
    const value = report(); value.suites[0].suites[0].specs[0].tests[0].expectedStatus = 'failed';
    expect(evaluate(value).status).toBe('FAIL');
    const repeated = report(); repeated.suites[0].suites.push(repeated.suites[0].suites[0]);
    expect(evaluate(repeated).status).toBe('FAIL');
  });
  it('never passes when the child fails even with green reported tests', () => {
    const result = evaluate(report(), { childExitCode: 7 });
    expect(result.status).toBe('FAIL');
    expect(result.flows[0].status).toBe('FAIL');
    expect(result.infrastructureErrors).toContain('Playwright exited with code 7.');
  });
  it('keeps an independently passing flow PASS when another flow has an assertion failure', () => {
    const value = report();
    value.suites[0].suites[0].specs[0].tests[0].status = 'unexpected';
    value.suites[0].suites[0].specs[0].tests[0].results[0].status = 'failed';
    value.suites[0].suites[0].specs[0].ok = false;
    for (const suite of value.suites[0].suites) suite.specs.push({
      title: 'seeded completed plan opens from the real Dashboard with saved script and scenes',
      file: 'oneshot-legacy-recovery.spec.ts', ok: true,
      tests: [{ projectName: 'chromium', expectedStatus: 'passed', status: 'expected', results: [{
        status: 'passed', retry: 0, errors: [], duration: 50, attachments: [{ name: 'trace', path: 'saved-plan-trace.zip' }],
      }] }],
    });
    value.stats.expected = 3;
    value.stats.unexpected = 1;
    const result = evaluateReport(value, ['draft', 'saved-plan'], { ...metadata, childExitCode: 1 });
    expect(result.status).toBe('FAIL');
    expect(result.flows.find((flow: { id: string }) => flow.id === 'draft').status).toBe('FAIL');
    expect(result.flows.find((flow: { id: string }) => flow.id === 'saved-plan').status).toBe('PASS');
    expect(result.infrastructureErrors).toEqual([]);
  });
  it('rejects invalid, stale and wrong-run reports', () => {
    expect(evaluate(null).status).toBe('FAIL');
    expect(evaluate({ suites: [] }).status).toBe('FAIL');
    const stale = report(); stale.stats.startTime = '2025-01-01T00:00:00Z';
    expect(evaluate(stale).status).toBe('FAIL');
    const wrong = report(); wrong.config.metadata.recoveryRunId = 'previous-run';
    expect(evaluate(wrong).status).toBe('FAIL');
  });
  it('rejects unexpected tests, report errors and missing traces', () => {
    const extra = report(); extra.suites[0].suites[0].specs[0].title = 'another test';
    expect(evaluate(extra).status).toBe('FAIL');
    const errored = report(); Object.assign(errored, { errors: [{ message: 'server failed' }] });
    expect(evaluate(errored).infrastructureErrors.length).toBeGreaterThan(0);
    const noTrace = report(); noTrace.suites[0].suites[0].specs[0].tests[0].results[0].attachments = [];
    expect(evaluate(noTrace).status).toBe('FAIL');
  });
  it('strictly parses a subset and rejects unknown IDs, switches and missing values', () => {
    expect(parseArgs(['--flow', 'draft'])).toEqual({ list: false, selectedIds: ['draft'] });
    expect(parseArgs(['--list']).list).toBe(true);
    for (const args of [['--flow', 'unknown'], ['--flow'], ['--foo'], ['--list', '--flow', 'draft'], ['--flow', 'draft', '--flow', 'draft']]) {
      expect(() => parseArgs(args)).toThrow();
    }
    expect(() => evaluateReport(report(), ['unknown'], metadata)).toThrow();
  });
  it('rejects nonempty RUN switches without disclosing their values', () => {
    expect(() => assertSafeEnvironment({ RUN_BURNIN: 'private-value' })).toThrow('RUN_BURNIN');
    try { assertSafeEnvironment({ RUN_BURNIN: 'private-value' }); } catch (error) { expect(String(error)).not.toContain('private-value'); }
    expect(() => assertSafeEnvironment({ RUN_BURNIN: '' })).not.toThrow();
  });
});
