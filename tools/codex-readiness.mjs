#!/usr/bin/env node
// Read-only, offline readiness. Never load dotenv or print process/config secrets.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function inspectPaths(root, trackedPaths = []) {
  const file = (path) => {
    try { return statSync(join(root, path)).isFile(); } catch { return false; }
  };
  const checks = [];
  const checkFiles = (group, id, paths, action) => {
    const missing = paths.filter((path) => !file(path));
    checks.push({ group, id, ok: !missing.length, detail: missing.length ? `Missing: ${missing.join(', ')}` : 'Files present', action });
  };
  checkFiles('core', 'source', ['package.json', 'package-lock.json', 'App.tsx', 'vite.config.ts'], 'Restore the core tracked checkout.');
  checkFiles('desktop', 'instructions', ['AGENTS.md', 'NOW.md', '.agents/skills/surgical-edit/SKILL.md'], 'Restore the tracked Codex instructions and skills.');
  let hooksEnabled = false;
  try {
    const config = readFileSync(join(root, '.codex/config.toml'), 'utf8');
    const features = config.match(/^\[features\]\s*\r?\n([\s\S]*?)(?=^\[|$(?![\s\S]))/m)?.[1] ?? '';
    hooksEnabled = /^hooks\s*=\s*true\s*(?:#.*)?$/m.test(features);
  } catch { /* Missing configuration is reported below. */ }
  checks.push({ group: 'desktop', id: 'hooks-config', ok: hooksEnabled, detail: hooksEnabled ? 'Project hooks enabled in config; runtime trust is NOT checked' : 'Missing [features] hooks = true', action: 'Restore .codex/config.toml, then review and trust the hooks in Codex.' });
  let validHooks = false;
  try {
    const data = JSON.parse(readFileSync(join(root, '.codex/hooks.json'), 'utf8'));
    validHooks = data.hooks && Object.values(data.hooks).some((entries) => Array.isArray(entries) && entries.length > 0);
  } catch { /* Do not print malformed config contents. */ }
  checks.push({ group: 'desktop', id: 'hooks-file', ok: Boolean(validHooks), detail: validHooks ? 'Hook registration present; enforcement requires the hook tests and Codex trust' : 'Missing, empty, or invalid hook registration', action: 'Restore .codex/hooks.json and run the hook contract tests.' });
  checkFiles('backend', 'local-api', ['api/gemini/text.ts', 'api/_lib/userPlan.ts', 'vite.config.ts'], 'Restore api/ and vite.config.ts. npm.cmd run dev serves /api through Vite middleware; provider/auth behavior needs separate tests.');
  for (const [group, prefix] of [['browser', 'public/examples/'], ['samples', 'tests/fixtures/sample-batch/']]) {
    const expected = trackedPaths.filter((path) => path.startsWith(prefix));
    if (expected.length) checkFiles(group, prefix, expected, `Selectively restore ${prefix} from the tracked tree; do not download all media.`);
    else checks.push({ group, id: prefix, ok: false, detail: 'Tracked inventory unavailable or empty', action: 'Check git ls-tree -r --name-only HEAD and the sparse checkout profile.' });
  }
  return checks;
}

function run(command, args, root) {
  return spawnSync(command, args, { cwd: root, encoding: 'utf8', timeout: 15000, windowsHide: true, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_NO_LAZY_FETCH: '1' } });
}

export function inspectDependencies(root) {
  const require = createRequire(join(root, 'package.json'));
  return ['vite', 'typescript', 'vitest'].map((name) => {
    let found = false;
    try { found = existsSync(require.resolve(name)); } catch { /* Report missing dependency. */ }
    return { group: 'core', id: name, ok: found, detail: found ? 'Installed entry point resolves' : 'Installed entry point missing', action: 'Run npm.cmd ci explicitly; a node_modules directory alone is insufficient.' };
  });
}

export function collectReadiness(root = repoRoot) {
  const checks = [];
  const add = (group, id, ok, detail, action) => checks.push({ group, id, ok: Boolean(ok), detail, action });
  add('core', 'node', /^v24\./.test(process.version), process.version, 'Use Node 24.');
  const npm = process.platform === 'win32' ? run('cmd.exe', ['/d', '/c', 'npm.cmd --version'], root) : run('npm', ['--version'], root);
  add('core', 'npm', npm.status === 0 && /^11\./.test(npm.stdout.trim()), npm.status === 0 ? npm.stdout.trim() : 'Not available', 'Use npm 11; on Windows invoke npm.cmd.');
  const git = (args) => run('git', args, root);
  const tree = git(['ls-tree', '-r', '--name-only', 'HEAD', '--', 'public/examples', 'tests/fixtures/sample-batch']);
  checks.push(...inspectPaths(root, tree.status === 0 ? tree.stdout.trim().split(/\r?\n/) : []));
  const branch = git(['branch', '--show-current']);
  add('core', 'branch', branch.status === 0 && branch.stdout.trim(), branch.status === 0 ? branch.stdout.trim() || 'Detached HEAD' : 'Git unavailable', 'Select the intended branch explicitly before editing.');
  const status = git(['status', '--porcelain', '--untracked-files=normal']);
  add('core', 'git-status', status.status === 0, status.status === 0 ? `${status.stdout.trim() ? status.stdout.trim().split(/\r?\n/).length : 0} changed/untracked entries; inspect git status before editing` : 'Cannot inspect checkout', 'Run git status; preserve local work. No fetch was performed.');
  const identity = ['user.name', 'user.email'].every((key) => {
    const value = git(['config', '--get', key]);
    return value.status === 0 && value.stdout.trim();
  });
  add('core', 'git-identity', identity, identity ? 'Name and email configured (values hidden)' : 'Name or email unset', 'Configure your Git identity before committing.');
  checks.push(...inspectDependencies(root));
  const require = createRequire(join(root, 'package.json'));
  let ffmpegOk = false;
  try {
    const executable = require('ffmpeg-static');
    ffmpegOk = executable && existsSync(executable) && run(executable, ['-version'], root).status === 0;
  } catch { /* Package may exist while its install-script binary is missing. */ }
  add('creative', 'ffmpeg-static', ffmpegOk, ffmpegOk ? 'Installed executable runs -version' : 'Package or runnable binary missing', 'Inspect npm install-script warnings and restore the ffmpeg-static binary explicitly. scripts/restore-ffmpeg.ps1 installs a separate CLI binary, not this package binary.');
  let browserOk = false;
  try { browserOk = existsSync(require('playwright').chromium.executablePath()); } catch { /* Optional browser package/cache missing. */ }
  add('browser', 'chromium', browserOk, browserOk ? 'Playwright Chromium executable present; launch not tested' : 'Playwright Chromium executable absent', 'For browser tests, explicitly run npx.cmd playwright install chromium. MCP Chrome is a separate browser choice.');
  const portablePython = join(root, '.tools', 'python-3.12.8', 'tools', 'python.exe');
  const pythonCommand = [portablePython, 'python', 'python3'].find((command) => {
    const result = run(command, ['--version'], root);
    return result.status === 0 && /^Python 3\./.test(`${result.stdout}${result.stderr}`.trim());
  });
  add('creative', 'python', pythonCommand, pythonCommand ? `Python 3 available via ${pythonCommand === portablePython ? '.tools/python-3.12.8/tools/python.exe' : pythonCommand}; workflow packages not checked` : 'Python 3 unavailable', 'Run scripts/restore-python.ps1 -Portable for the official local package, then the workflow dependencies.');
  let bashOk = false;
  if (process.platform === 'win32') {
    const location = run('where.exe', ['git.exe'], root);
    for (const gitPath of (location.stdout ?? '').trim().split(/\r?\n/)) {
      for (const candidate of [join(dirname(gitPath), '..', 'bin', 'bash.exe'), join(dirname(gitPath), '..', 'usr', 'bin', 'bash.exe')]) {
        if (existsSync(candidate) && run(candidate, ['--version'], root).status === 0) bashOk = true;
      }
    }
  } else bashOk = run('bash', ['--version'], root).status === 0;
  add('creative', 'git-bash', bashOk, bashOk ? 'Git Bash executable available (need not be on PATH)' : 'Git Bash not found beside Git installation', 'Install Git for Windows with Bash for existing shell workflows.');
  add('backend', 'environment-file', existsSync(join(root, '.env')), existsSync(join(root, '.env')) ? '.env exists; contents and credentials were NOT read or validated' : '.env absent; account-backed flows need user setup', 'Use your Bitwarden secure note yourself; see .env.example for variable names.');
  const liveFlags = ['RUN_REGRESSION', 'RUN_BURNIN', 'RUN_IMAGE_GATE_SMOKE', 'RUN_AB', 'RUN_EDL_FULL_CAP', 'RUN_DEMO', 'RUN_RESTITCH', 'RUN_SCENEGRADE', 'RUN_MIDGAP'].filter((name) => process.env[name]);
  add('core', 'live-test-flags', !liveFlags.length, liveFlags.length ? `Unset before ordinary checks: ${liveFlags.join(', ')}` : 'Paid/live test switches unset', 'Unset these flags in the current terminal; readiness never modifies them.');
  return checks;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--json')) {
    console.error('Usage: node tools/codex-readiness.mjs [--json]');
    process.exitCode = 2;
  } else {
    const checks = collectReadiness();
    if (args.includes('--json')) console.log(JSON.stringify(checks, null, 2));
    else {
      for (const item of checks) {
        console.log(`[${item.ok ? 'ok' : 'missing'}] ${item.group}/${item.id}: ${item.detail}`);
        if (!item.ok) console.log(`  Next: ${item.action}`);
      }
      console.log('\nStatic readiness is not workflow parity. Codex login, hook trust/enforcement, provider auth, browser interactions and paid media remain separate checks.');
      console.log('Core/desktop failures exit 1; missing optional capability inputs are reported without blocking frontend work. No fetch, install, config write or generation was performed.');
    }
    process.exitCode = checks.some((item) => ['core', 'desktop'].includes(item.group) && !item.ok) ? 1 : 0;
  }
}
