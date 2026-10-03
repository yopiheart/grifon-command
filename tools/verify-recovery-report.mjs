import { readFileSync } from 'node:fs';

export const manifest = JSON.parse(readFileSync(new URL('./recovery-flows.json', import.meta.url), 'utf8'));

export function parseArgs(args) {
  if (args.length === 1 && args[0] === '--list') return { list: true, selectedIds: [] };
  const selectedIds = [];
  for (let index = 0; index < args.length; index += 2) {
    if (args[index] !== '--flow') throw new Error('Usage: verify:recovery [--list | --flow <id> ...]');
    const id = args[index + 1];
    if (!manifest.flows.some(flow => flow.id === id)) throw new Error('Unknown or missing recovery flow ID. Use --list.');
    if (selectedIds.includes(id)) throw new Error(`Duplicate flow: ${id}`);
    selectedIds.push(id);
  }
  return { list: false, selectedIds: selectedIds.length ? selectedIds : manifest.flows.map(flow => flow.id) };
}

export function assertSafeEnvironment(env) {
  // Some existing switches treat any nonempty string (including "0") as active.
  const active = Object.keys(env).filter(key => /^RUN_/i.test(key) && env[key]);
  if (active.length) throw new Error(`Unset paid/live RUN switches before verification: ${active.join(', ')}`);
}

export function expectedCases(selectedIds) {
  for (const id of selectedIds) if (!manifest.flows.some(flow => flow.id === id)) throw new Error('Unknown recovery flow ID.');
  return manifest.flows.filter(flow => selectedIds.includes(flow.id)).flatMap(flow => manifest.viewports.map(width => ({
    flowId: flow.id, width, file: flow.file, suite: flow.suite.replace('{width}', String(width)), title: flow.test,
  })));
}

export function selectionGrep(selectedIds) {
  const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return expectedCases(selectedIds).map(item => `${escape(item.file)} ${escape(item.suite)} ${escape(item.title)}$`).join('|');
}

export function evaluateReport(report, selectedIds, run) {
  const expected = expectedCases(selectedIds);
  const infrastructureErrors = [...(run.infrastructureErrors ?? [])];
  const coverageErrors = [];
  const cases = [];
  try {
    if (!report || !Array.isArray(report.suites) || !Array.isArray(report.errors) || !report.stats) throw new Error('Invalid or missing Playwright JSON report.');
    if (report.config?.metadata?.recoveryRunId !== run.runId) throw new Error('Report does not belong to this run.');
    const time = Date.parse(report.stats.startTime);
    if (!Number.isFinite(time) || time < Date.parse(run.startedAt) || time > Date.parse(run.finishedAt)) throw new Error('Stale or invalid report start time.');
    if (report.errors.length) infrastructureErrors.push('Playwright reported runner errors; inspect playwright.json and runner.log.');
    function walk(suites, parents = []) {
      for (const suite of suites) {
        if (!Array.isArray(suite.specs)) throw new Error('Malformed report suite.');
        for (const spec of suite.specs) {
          if (!Array.isArray(spec.tests)) throw new Error('Malformed report test list.');
          for (const test of spec.tests) {
            if (!Array.isArray(test.results)) throw new Error('Malformed report results.');
            const matched = expected.find(item => spec.file === item.file && spec.title === item.title && suite.title === item.suite && parents.length === 1 && test.projectName === 'chromium');
            if (!matched) { coverageErrors.push(`Unexpected test: ${spec.file} / ${suite.title} / ${spec.title}`); continue; }
            const result = test.results[0];
            const attachments = test.results.flatMap(entry => entry.attachments ?? []).filter(item => item.path).map(item => ({ name: item.name, path: item.path }));
            const passed = spec.ok === true && test.status === 'expected' && test.expectedStatus === 'passed' && test.results.length === 1 && result?.status === 'passed' && result.retry === 0 && !result.error && Array.isArray(result.errors) && result.errors.length === 0;
            cases.push({ ...matched, status: passed ? 'PASS' : 'FAIL', outcome: test.status, resultStatus: result?.status ?? 'not-run', durationMs: result?.duration ?? 0, attachments });
            if (!attachments.some(item => item.name === 'trace')) infrastructureErrors.push(`Missing trace: ${matched.flowId} at ${matched.width}px.`);
          }
        }
        if (suite.suites) walk(suite.suites, [...parents, suite.title]);
      }
    }
    walk(report.suites);
    for (const key of ['expected', 'unexpected', 'flaky', 'skipped']) {
      if (!Number.isInteger(report.stats[key]) || report.stats[key] < 0) throw new Error('Invalid report statistics.');
      if (report.stats[key] !== cases.filter(item => item.outcome === key).length) coverageErrors.push(`Report ${key} total disagrees with individual results.`);
    }
    if (report.stats.expected + report.stats.unexpected + report.stats.flaky + report.stats.skipped !== expected.length) coverageErrors.push('Report totals do not contain exactly the selected tests.');
  } catch (error) {
    infrastructureErrors.push(error.message);
  }
  for (const item of expected) {
    const count = cases.filter(test => test.flowId === item.flowId && test.width === item.width).length;
    if (count !== 1) coverageErrors.push(`Expected exactly one ${item.flowId} case at ${item.width}px; found ${count}.`);
  }
  const failedCases = cases.filter(item => item.status === 'FAIL');
  if (run.childExitCode !== 0 && (failedCases.length === 0 || run.childExitCode !== 1)) infrastructureErrors.push(`Playwright exited with code ${run.childExitCode}.`);
  const globalFailure = infrastructureErrors.length > 0 || coverageErrors.length > 0;
  const flows = manifest.flows.map(flow => ({
    ...flow,
    status: !selectedIds.includes(flow.id) ? 'NOT RUN' : globalFailure || cases.some(item => item.flowId === flow.id && item.status === 'FAIL') ? 'FAIL' : 'PASS',
    cases: cases.filter(item => item.flowId === flow.id),
  }));
  return { status: globalFailure || failedCases.length || run.childExitCode !== 0 ? 'FAIL' : 'PASS', infrastructureErrors, coverageErrors, failedCases, flows, limitations: manifest.limitations };
}

export function markdownSummary(summary) {
  const lines = [
    '# Recovery verification', '',
    `Result: **${summary.status}**. Commit: \`${summary.git.sha}\`. Dirty: ${summary.git.dirty}.`,
    `Started: ${summary.startedAt}. Finished: ${summary.finishedAt}. Duration: ${summary.durationMs} ms.`,
    `Playwright exit code: ${summary.childExitCode ?? 'not started / no exit code'}. Runner exit code: ${summary.exitCode}.`, '',
    '[Playwright JSON](playwright.json) | [Runner log](runner.log) | [JSON summary](summary.json)', '',
    'A flow PASS covers only its two viewport cases. Any failed selected flow or invalid run evidence makes the overall run FAIL.', '',
    '| Flow | Status | Evidence |', '| --- | --- | --- |',
  ];
  for (const flow of summary.flows) {
    const links = flow.cases.flatMap(test => test.attachments.map(item => `[${test.width}px ${item.name}](${item.path.split('/').map(encodeURIComponent).join('/')})`));
    lines.push(`| ${flow.id} | ${flow.status} | ${links.join(' / ') || 'No evidence'} |`);
  }
  for (const [label, errors] of [['Infrastructure errors', summary.infrastructureErrors], ['Coverage errors', summary.coverageErrors]]) {
    if (errors.length) lines.push('', `## ${label}`, '', ...errors.map(error => `- ${error}`));
  }
  if (summary.failedCases.length) lines.push('', '## Failed browser checks', '', 'Inspect the linked traces and report before attributing these failures to a product defect.', '', ...summary.failedCases.map(item => `- ${item.flowId}, ${item.width}px: ${item.resultStatus} (${item.outcome}).`));
  lines.push('', '## Scope and mock limitations', '', ...summary.limitations.map(value => `- ${value}`));
  for (const flow of summary.flows) lines.push('', `### ${flow.id}: ${flow.status}`, '', `Seeded: ${flow.seeded}`, '', `Exercised by this case${flow.status === 'NOT RUN' ? ' (not run here)' : ''}: ${flow.exercised}`);
  return lines.join('\n') + '\n';
}
