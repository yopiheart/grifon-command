// Additive Playwright telemetry: select fields only, never errors or attachments.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

export default class CiE2ETimingReporter {
  constructor({ outputFile = '.tmp/ci-e2e-timing/report.json' } = {}) {
    this.outputFile = resolve(outputFile);
    this.root = process.cwd();
    this.tests = [];
    this.shard = null;
    this.errors = 0;
  }

  printsToStdio() { return false; }

  onBegin(config, suite) {
    this.root = config.configFile ? dirname(config.configFile) : process.cwd();
    this.shard = config.shard ? { current: config.shard.current, total: config.shard.total } : null;
    this.tests = suite.allTests();
  }

  onError() { this.errors++; }

  onEnd(result) {
    const tests = this.tests.map(test => {
      const titlePath = [test.title];
      for (let suite = test.parent; suite; suite = suite.parent) {
        if (suite.type === 'describe' && suite.title) titlePath.unshift(suite.title);
      }
      return {
        project: test.parent.project()?.name ?? '',
        file: relative(this.root, test.location.file).replaceAll('\\', '/'),
        titlePath,
        expectedStatus: test.expectedStatus,
        outcome: test.outcome(),
        attempts: test.results.map(attempt => ({ duration: attempt.duration, retry: attempt.retry, status: attempt.status })),
      };
    });
    const report = {
      schemaVersion: 1,
      status: result.status,
      duration: result.duration,
      shard: this.shard,
      discovery: { listOnly: process.argv.includes('--list'), tests: tests.length, files: new Set(tests.map(test => test.file)).size },
      errors: this.errors,
      tests,
    };
    try {
      mkdirSync(dirname(this.outputFile), { recursive: true });
      writeFileSync(this.outputFile, `${JSON.stringify(report)}\n`);
    } catch {
      console.error('E2E timing report could not be written.');
    }
    // Returning a status here would override Playwright's own pass/fail result.
  }
}
