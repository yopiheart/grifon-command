import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

// Execute the actual github-script body. Only filesystem/Actions/GitHub boundaries
// are faked: these tests cannot open issues, upload artifacts, or call Gemini.
const workflow = readFileSync(new URL('../../.github/workflows/nightly-regression.yml', import.meta.url), 'utf8');
const script = workflow.split('          script: |')[1]?.replace(/^            /gm, '');
if (!script) throw new Error('Nightly reporter script not found');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

type Step = { outcome: string; outputs?: Record<string, string> };
const passedResults = {
  success: true,
  testResults: [{ assertionResults: [{ fullName: 'script shape', status: 'passed' }] }],
};

async function report(overrides: Record<string, Step> = {}, results: unknown = passedResults) {
  const steps = {
    checkout: { outcome: 'success' },
    setup_node: { outcome: 'success' },
    install: { outcome: 'success' },
    stage: { outcome: 'success' },
    regression: { outcome: 'success' },
    upload: { outcome: 'success', outputs: {} },
    ...overrides,
  };
  const create = vi.fn().mockResolvedValue({});
  const summary = { addRaw: vi.fn().mockReturnThis(), write: vi.fn().mockResolvedValue(undefined) };
  const read = vi.fn(() => {
    if (results instanceof Error) throw results;
    return typeof results === 'string' ? results : JSON.stringify(results);
  });
  const require = (name: string) => {
    if (name !== 'fs') throw new Error(`Unexpected module: ${name}`);
    return { readFileSync: read };
  };
  await new AsyncFunction('require', 'context', 'core', 'github', 'process', script)(
    require,
    { serverUrl: 'https://github.com', repo: { owner: 'owner', repo: 'repo' }, runId: 123 },
    { summary, warning: vi.fn(), info: vi.fn() },
    { rest: { issues: { create } } },
    { env: { NIGHTLY_STEPS: JSON.stringify(steps) } },
  );
  return { create, summary, read, issue: create.mock.calls[0]?.[0] };
}

describe('nightly report evidence', () => {
  it('identifies dependency installation failure without blaming unrun Gemini tests', async () => {
    const { issue } = await report({
      install: { outcome: 'failure' },
      stage: { outcome: 'skipped' },
      regression: { outcome: 'skipped' },
    });
    expect(issue.title).toContain('setup FAILED');
    expect(issue.body).toContain('Install dependencies');
    expect(issue.body).toContain('tests did not run');
    expect(issue.body).not.toContain('Nightly live-Gemini regression failed');
  });

  it('does not claim an artifact when upload produced no artifact id', async () => {
    const { issue } = await report({ regression: { outcome: 'failure' } }, '{broken JSON');
    expect(issue.body).toContain('No regression artifact was uploaded');
    expect(issue.body).not.toContain('attached to the run');
  });

  it('reports passing execution without opening a failure issue', async () => {
    const { create, summary } = await report();
    expect(create).not.toHaveBeenCalled();
    expect(summary.addRaw).toHaveBeenCalledWith(expect.stringContaining('passed'));
  });

  it.each([
    ['checkout', 'Checkout repository'],
    ['setup_node', 'Set up Node'],
    ['stage', 'Stage output dir'],
  ])('names failed setup stage %s even with no checkout/results', async (id, label) => {
    const { issue, read } = await report({
      [id]: { outcome: 'failure' }, regression: { outcome: 'skipped' },
    }, new Error('ENOENT'));
    expect(issue.body).toContain(label);
    expect(issue.body).toContain('tests did not run');
    expect(read).not.toHaveBeenCalled();
  });

  it('lists real failed assertions and links only a confirmed artifact', async () => {
    const { issue } = await report({
      regression: { outcome: 'failure' },
      upload: { outcome: 'success', outputs: { 'artifact-id': '456' } },
    }, {
      success: false,
      testResults: [{ assertionResults: [
        { fullName: 'TRANSFORMATION body shape', status: 'failed' },
        { fullName: 'healthy script', status: 'passed' },
      ] }],
    });
    expect(issue.title).toContain('assertions FAILED');
    expect(issue.body).toContain('- TRANSFORMATION body shape');
    expect(issue.body).not.toContain('healthy script');
    expect(issue.body).toContain('https://github.com/owner/repo/actions/runs/123/artifacts/456');
  });

  it.each([
    new Error('ENOENT'), '{broken JSON', {},
    { success: true, testResults: [] },
    { success: false, testResults: [{ assertionResults: [] }] },
  ])('reports incomplete execution evidence without a prompt diagnosis (%j)', async results => {
    const { issue } = await report({ regression: { outcome: 'failure' } }, results);
    expect(issue.title).toContain('execution FAILED');
    expect(issue.body).toContain('Evidence is incomplete');
    expect(issue.body).toContain('No prompt-defect diagnosis');
  });

  it('does not count a zero exit with missing results as a verified pass', async () => {
    const { issue } = await report({}, new Error('ENOENT'));
    expect(issue.title).toContain('execution FAILED');
  });

  it('explicitly reports the missing-key skip without an issue or reading results', async () => {
    const { create, summary, read } = await report({
      regression: { outcome: 'success', outputs: { skipped_reason: 'missing_key' } },
    });
    expect(create).not.toHaveBeenCalled();
    expect(read).not.toHaveBeenCalled();
    expect(summary.addRaw).toHaveBeenCalledWith(expect.stringContaining('GEMINI_API_KEY was not set'));
  });

  it('keeps a cancelled execution distinct from a product failure', async () => {
    const { create, summary } = await report({ regression: { outcome: 'cancelled' } });
    expect(create).not.toHaveBeenCalled();
    expect(summary.addRaw).toHaveBeenCalledWith(expect.stringContaining('skipped or cancelled'));
  });

  it('reports artifact upload failure separately from passed tests', async () => {
    const { issue } = await report({ upload: { outcome: 'failure', outputs: { 'artifact-id': '456' } } });
    expect(issue.title).toContain('artifact upload FAILED');
    expect(issue.body).toContain('regression step passed');
    expect(issue.body).not.toContain('/artifacts/456');
  });

  it('does not infer a production incident or prescribe a tuned change from the EDL test name', async () => {
    const { issue } = await report({ regression: { outcome: 'failure' } }, {
      success: false,
      testResults: [{ assertionResults: [{ fullName: 'EDL live video attach', status: 'failed' }] }],
    });
    expect(issue.body).toContain('EDL canary has a failed assertion');
    expect(issue.body).not.toContain('editor is going blind');
    expect(issue.body).not.toContain('EDL_MAX_ATTACHED_VIDEOS = 0');
  });

  it('wires real step outcomes and the explicit skip into an always-running reporter', () => {
    for (const id of ['checkout', 'setup_node', 'install', 'stage', 'regression', 'upload']) {
      expect(workflow).toContain(`id: ${id}`);
    }
    expect(workflow).toContain('NIGHTLY_STEPS: ${{ toJSON(steps) }}');
    expect(workflow).toMatch(/name: Report nightly regression outcome\r?\n\s+if: always\(\)/);
    expect(workflow).toContain('echo "skipped_reason=missing_key" >> "$GITHUB_OUTPUT"');
    expect(workflow).toContain("cron: '0 18 * * *'");
    expect(workflow).toContain("RUN_REGRESSION: '1'");
    expect(workflow).not.toMatch(/^\s+RUN_EDL_FULL_CAP:/m);
  });
});
