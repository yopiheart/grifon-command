import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';

const script = resolve('.codex/hooks/guard.mjs');
const fixture = mkdtempSync(join(tmpdir(), 'grifon-hooks-'));
process.on('exit', () => rmSync(fixture, { recursive: true, force: true }));
spawnSync('git', ['init', '-q', fixture]);
mkdirSync(join(fixture, '.tmp'), { recursive: true });
const invoke = (event, extra = {}, raw) => {
  const run = spawnSync(process.execPath, [script], {
    cwd: fixture, encoding: 'utf8',
    input: raw ?? JSON.stringify({ cwd: fixture, session_id: 'test-session', hook_event_name: event, ...extra }),
  });
  assert.equal(run.status, 0, run.stderr);
  return JSON.parse(run.stdout || '{}');
};
const pre = (tool_name, tool_input) => invoke('PreToolUse', { tool_name, tool_input });
const denied = (result) => assert.equal(result.hookSpecificOutput?.permissionDecision, 'deny');
const allowed = (result) => assert.notEqual(result.hookSpecificOutput?.permissionDecision, 'deny');

test('registration includes all native lifecycle gates', () => {
  const config = JSON.parse(readFileSync('.codex/hooks.json', 'utf8'));
  for (const event of ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'Stop']) {
    assert.ok(config.hooks[event]?.some(group => group.hooks.some(hook => hook.command.includes('guard.mjs'))), event);
  }
  const sweep = config.hooks.SessionStart.flatMap(group => group.hooks).find(hook => hook.command.includes('ad_asset_sweep'));
  assert.match(sweep.command, /--report\b/);
  assert.match(sweep.commandWindows, /--report\b/);
});
test('malformed input fails closed', () => denied(invoke('PreToolUse', {}, '{broken')));
test('Windows registration resolves from a repository subdirectory', { skip: process.platform !== 'win32' }, () => {
  const config = JSON.parse(readFileSync('.codex/hooks.json', 'utf8'));
  const command = config.hooks.PreToolUse[0].hooks[0].commandWindows;
  const result = spawnSync(command, { shell: true, cwd: resolve('tools'), input: '{broken', encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  denied(JSON.parse(result.stdout));
});
test('environment content and edits denied; template and metadata allowed', () => {
  for (const command of ['Get-Content .env', 'cat .env.staging', 'Set-Content .env.local hi', 'cp .env somewhere', 'node -e "readFileSync(\'.env\')"']) denied(pre('Bash', { command }));
  denied(pre('apply_patch', { command: '*** Begin Patch\n*** Add File: .env\n+bad\n*** End Patch' }));
  denied(pre('mcp__filesystem__read_file', { path: 'C:\\project\\.env.local' }));
  allowed(pre('Bash', { command: 'Get-Content .env.example' }));
  allowed(pre('Bash', { command: 'Test-Path .env' }));
  allowed(pre('exec_command', { cmd: 'npm.cmd run build' }));
  allowed(pre('Bash', { command: 'node -e "console.log(Boolean(process.env.EXAMPLE_KEY))"' }));
  allowed(pre('apply_patch', { command: '*** Begin Patch\n*** Add File: tools/example.mjs\n+// Use .env.example; .env stays private.\n*** End Patch' }));
});
test('exact tuned approval is single-use and does not authorize another input', () => {
  const input = { command: '*** Begin Patch\n*** Update File: services/geminiService.ts\n@@\n-old\n+new\n*** End Patch' };
  const result = pre('apply_patch', input);
  denied(result);
  const token = result.hookSpecificOutput.permissionDecisionReason.match(/APPROVE CODEX HOOK ([a-f0-9]{64})/)[1];
  invoke('UserPromptSubmit', { prompt: `APPROVE CODEX HOOK ${token}` });
  allowed(pre('apply_patch', input));
  denied(pre('apply_patch', input));
  denied(pre('apply_patch', { command: input.command.replace('+new', '+different') }));
  allowed(pre('Bash', { command: 'Get-Content services/geminiService.ts' }));
  denied(pre('Bash', { command: 'Set-Content services/geminiService.ts hello; meta-ads campaigns activate' }));
});
test('ad reads pass; writes and spend switches deny', () => {
  allowed(pre('mcp__meta_ads__ads_get_campaigns', { account_id: 'fixture' }));
  denied(pre('mcp__meta_ads__ads_create_campaign', { status: 'PAUSED' }));
  denied(pre('mcp__meta_ads__ads_activate_entity', { id: 'fixture' }));
  denied(pre('Bash', { command: 'meta-ads campaigns create --status ACTIVE' }));
  allowed(pre('Bash', { command: 'meta-ads campaigns list' }));
});
test('edit targets resolve cwd, dot segments and move destinations before protection', () => {
  mkdirSync(join(fixture, 'services'), { recursive: true });
  mkdirSync(join(fixture, 'api', '_lib'), { recursive: true });
  const patch = path => ({ command: `*** Begin Patch\n*** Update File: ${path}\n@@\n-old\n+new\n*** End Patch` });
  const at = (cwd, tool_name, tool_input) => invoke('PreToolUse', { cwd, tool_name, tool_input });
  denied(at(join(fixture, 'services'), 'apply_patch', patch('geminiService.ts')));
  denied(pre('apply_patch', patch('tools/../services/geminiService.ts')));
  denied(at(join(fixture, 'api', '_lib'), 'Edit', { file_path: './prompts.ts', old_string: 'old', new_string: 'new' }));
  denied(at(join(fixture, 'services'), 'Write', { file_path: '../api/_lib/../_lib/prompts.ts', content: 'new' }));
  denied(at(join(fixture, 'services'), 'apply_patch', patch('../.env')));
  denied(at(join(fixture, 'services'), 'apply_patch', { command: '*** Begin Patch\n*** Update File: other.ts\n*** Move to: geminiService.ts\n@@\n-old\n+new\n*** End Patch' }));
  denied(at(join(fixture, 'services'), 'Write', { path: '../.tmp/codex-hook-state/state.json', content: '{}' }));
  allowed(at(join(fixture, 'services'), 'apply_patch', patch('./ordinary.ts')));
});
test('unknown or malformed patch envelopes fail closed', () => {
  for (const command of ['garbage', '*** Update File: ordinary.ts', '*** Begin Patch\n*** Rename File: ordinary.ts\n*** End Patch', '*** Begin Patch\n*** Update File: ordinary.ts\n*** Unknown: services/geminiService.ts\n*** End Patch']) denied(pre('apply_patch', { command }));
});
test('paid Veo missing approved spec is denied and standalone dry-run passes', () => {
  denied(pre('Bash', { command: 'node tools/veo-produce.mjs --out clips/a.mp4' }));
  allowed(pre('Bash', { command: 'node tools/veo-produce.mjs --dry-run' }));
  denied(pre('Bash', { command: 'node tools/veo-produce.mjs --dry-run; node tools/veo-produce.mjs --out clips/a.mp4' }));
});
test('Veo checks preflight, binds approval to spec, and counts an attempt before allowing', () => {
  mkdirSync(join(fixture, 'ad', 'clips'), { recursive: true });
  mkdirSync(join(fixture, 'tools'), { recursive: true });
  const spec = join(fixture, 'ad', 'script.spec.json');
  const checker = join(fixture, 'tools', 'ad_preflight.mjs');
  writeFileSync(spec, JSON.stringify({ maxPaidRolls: 1 }));
  writeFileSync(checker, 'process.exit(1);');
  const input = { command: 'node tools/veo-produce.mjs --out ad/clips/a.mp4' };
  const approve = () => {
    const result = pre('Bash', input);
    const token = result.hookSpecificOutput.permissionDecisionReason.match(/APPROVE CODEX HOOK ([a-f0-9]{64})/)[1];
    invoke('UserPromptSubmit', { prompt: `APPROVE CODEX HOOK ${token}` });
  };
  approve();
  denied(pre('Bash', input));
  assert.equal(readFileSync(spec, 'utf8'), '{"maxPaidRolls":1}');
  writeFileSync(checker, 'process.exit(0);');
  approve();
  writeFileSync(spec, JSON.stringify({ maxPaidRolls: 1, changed: true }));
  denied(pre('Bash', input));
  approve();
  allowed(pre('Bash', input));
  assert.equal(readFileSync(join(fixture, 'ad', '.paid-rolls'), 'utf8'), '1');
  denied(pre('Bash', input));
});
test('commit rejects an invalid changed lockfile without running install scripts', () => {
  writeFileSync(join(fixture, 'package-lock.json'), '{invalid');
  denied(pre('Bash', { command: 'git commit -m test' }));
});
test('prompt and session context point at continuity and language rules', () => {
  assert.match(JSON.stringify(invoke('UserPromptSubmit', { prompt: 'gusto natin caption' })), /taglish-voice/);
  const startup = JSON.stringify(invoke('SessionStart'));
  assert.match(startup, /NOW.md/);
  assert.match(startup, /persistent personal Windows desktop/);
  assert.match(startup, /Mobile disconnects do not require cleanup, sign-out, or forced commits/);
  assert.doesNotMatch(startup, /after a cafe reboot/);
});
test('Stop detects source changes and blocks failed build; tests stay explicit', () => {
  mkdirSync(join(fixture, 'components'), { recursive: true });
  writeFileSync(join(fixture, 'components', 'Example.tsx'), 'export const example = 1;');
  writeFileSync(join(fixture, 'package.json'), JSON.stringify({ scripts: { build: 'node -e "process.exit(1)"', test: 'node -e "process.exit(0)"' } }));
  const failed = invoke('Stop');
  assert.equal(failed.decision, 'block');
  writeFileSync(join(fixture, 'package.json'), JSON.stringify({ scripts: { build: 'node -e "process.exit(0)"', test: 'node -e "process.exit(77)"' } }));
  assert.match(JSON.stringify(invoke('Stop')), /PASSED/);
  assert.deepEqual(invoke('Stop'), {});
});
