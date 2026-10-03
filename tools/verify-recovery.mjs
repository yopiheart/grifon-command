import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { manifest, parseArgs, assertSafeEnvironment, selectionGrep, evaluateReport, markdownSummary } from './verify-recovery-report.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.list) {
    for (const flow of manifest.flows) console.log(`${flow.id}: ${flow.label} (375px + 1280px)`);
    return 0;
  }
  const startedAt = new Date().toISOString();
  const parent = path.join(root, '.tmp', 'recovery-verification');
  mkdirSync(parent, { recursive: true });
  const evidenceDir = mkdtempSync(path.join(parent, startedAt.replace(/[:.]/g, '-') + '-'));
  const runId = path.basename(evidenceDir);
  const log = path.join(evidenceDir, 'runner.log');
  writeFileSync(log, '');
  const infrastructureErrors = [];
  const gitRead = args => {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', shell: false, windowsHide: true });
    if (result.status !== 0) throw new Error('Could not record Git revision/state.');
    return result.stdout.trim();
  };
  let git = { sha: null, dirty: null };
  let childExitCode = null;
  let childSignal = null;
  try {
    assertSafeEnvironment(process.env);
    git = { sha: gitRead(['rev-parse', 'HEAD']), dirty: gitRead(['status', '--porcelain']).length > 0 };
    // Inherit only runtime necessities. Credentials, NODE_OPTIONS, proxy settings,
    // VITE_* and Playwright overrides must not leak into a fixture run.
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|TMPDIR|HOME|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|PLAYWRIGHT_BROWSERS_PATH)$/i.test(key)));
    Object.assign(env, { RECOVERY_EVIDENCE_DIR: evidenceDir, RECOVERY_RUN_ID: runId, VITE_SUPABASE_URL: 'http://localhost:54321', VITE_SUPABASE_ANON_KEY: 'dummy-recovery-anon-key' });
    const args = [require.resolve('@playwright/test/cli'), 'test', '--config', 'playwright.recovery.config.ts', '--grep', selectionGrep(options.selectedIds)];
    await new Promise(resolve => {
      const child = spawn(process.execPath, args, { cwd: root, env, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { appendFileSync(log, chunk); process.stdout.write(chunk); });
      child.on('error', () => { infrastructureErrors.push('Unable to start Playwright.'); });
      child.on('close', (code, signal) => { childExitCode = code; childSignal = signal; resolve(); });
    });
  } catch (error) {
    infrastructureErrors.push(error.message);
  }
  let report = null;
  try { report = JSON.parse(readFileSync(path.join(evidenceDir, 'playwright.json'), 'utf8')); }
  catch { infrastructureErrors.push('Playwright JSON report is missing or invalid.'); }
  const finishedAt = new Date().toISOString();
  const run = { runId, startedAt, finishedAt, durationMs: Date.parse(finishedAt) - Date.parse(startedAt), childExitCode, childSignal, infrastructureErrors, git, selectedIds: options.selectedIds };
  let verdict = evaluateReport(report, options.selectedIds, run);
  // Attachment existence and containment are checked on disk, not trusted from JSON.
  for (const flow of verdict.flows) for (const test of flow.cases) for (const item of test.attachments) {
    const absolute = path.resolve(root, item.path);
    const relative = path.relative(evidenceDir, absolute);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || !existsSync(absolute)) infrastructureErrors.push(`Missing or out-of-run attachment: ${flow.id} at ${test.width}px.`);
  }
  verdict = evaluateReport(report, options.selectedIds, run);
  for (const flow of verdict.flows) for (const test of flow.cases) for (const item of test.attachments) item.path = path.relative(evidenceDir, path.resolve(root, item.path)).replaceAll('\\', '/');
  // Preserve an actual child failure code; validation failure after exit 0 is 1.
  const exitCode = childExitCode !== null && childExitCode !== 0 ? childExitCode : verdict.status === 'PASS' ? 0 : 1;
  const summary = { ...run, ...verdict, exitCode };
  writeFileSync(path.join(evidenceDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  writeFileSync(path.join(evidenceDir, 'summary.md'), markdownSummary(summary));
  console.log(`\nRecovery verification: ${summary.status}\nEvidence: ${path.join(evidenceDir, 'summary.md')}`);
  for (const error of summary.infrastructureErrors) console.error(`Infrastructure: ${error}`);
  return exitCode;
}

try { process.exitCode = await main(); }
catch (error) { console.error(error.message); process.exitCode = 1; }
