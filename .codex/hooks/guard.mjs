#!/usr/bin/env node
// Codex tool guardrails, not a sandbox. Keep the .sh copies inactive for Claude compatibility.
// Runtime contract: https://learn.chatgpt.com/docs/hooks (no unsupported "ask" decisions).
import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve, join, dirname } from 'node:path';

const hash = value => createHash('sha256').update(value).digest('hex');
const emit = value => process.stdout.write(`${JSON.stringify(value)}\n`);
const deny = reason => ({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } });
const context = (event, text) => ({ hookSpecificOutput: { hookEventName: event, additionalContext: text } });
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const cleanEnv = { ...process.env };
for (const key of ['RUN_REGRESSION', 'RUN_BURNIN', 'RUN_IMAGE_GATE_SMOKE']) delete cleanEnv[key];

function main(input) {
  const event = input.hook_event_name;
  if (!['PreToolUse', 'SessionStart', 'UserPromptSubmit', 'Stop'].includes(event) || typeof input.cwd !== 'string' || typeof input.session_id !== 'string' || !input.session_id) throw new Error('Invalid hook envelope');
  const run = (file, args, cwd = input.cwd, timeout = 30000) => spawnSync(file, args, { cwd, encoding: 'utf8', timeout, env: cleanEnv, maxBuffer: 8 * 1024 * 1024 });
  const rootResult = run('git', ['rev-parse', '--show-toplevel']);
  if (rootResult.status !== 0) throw new Error('Hook needs a Git checkout');
  const root = rootResult.stdout.trim();
  const stateDir = join(root, '.tmp', 'codex-hook-state', hash(input.session_id));
  mkdirSync(stateDir, { recursive: true });
  const statePath = join(stateDir, 'state.json');
  const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : {};
  const save = () => writeFileSync(statePath, JSON.stringify(state));
  const git = args => {
    const result = run('git', args, root);
    if (result.status !== 0) throw new Error('Git inspection failed');
    return result.stdout;
  };
  const fingerprint = () => {
    const paths = ['api', 'services', 'components', 'App.tsx', 'types.ts', 'package.json', 'package-lock.json'];
    const files = git(['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...paths]).split('\0').filter(Boolean);
    // Include actual bytes: a staged edit or a shell-generated file must invalidate verification too.
    return hash([...new Set(files)].sort().map(file => `${file}\0${existsSync(join(root, file)) ? hash(readFileSync(join(root, file))) : 'missing'}`).join('\0'));
  };
  const npm = args => process.platform === 'win32'
    ? run('cmd.exe', ['/d', '/s', '/c', `npm.cmd ${args.join(' ')}`], root, 240000)
    : run('npm', args, root, 240000);

  if (event === 'SessionStart') {
    // Retain a verified baseline across resume/compact; initialize only once per session.
    if (!state.baseline) { state.baseline = fingerprint(); save(); }
    const branches = run('git', ['branch', '-r', '--no-merged', 'origin/main'], root);
    return context(event, `LOCAL CLOCK: ${new Date().toString()}. Read NOW.md, agent_lessons.md and UBIQUITOUS_LANGUAGE.md before work. Check latest commits and remote branches before calling work missing. Cached unmerged branches (fetch when needed): ${branches.status === 0 ? branches.stdout.trim() || '(none)' : '(unavailable)'}. Review workflows/session_reminders.md and workflows/loops.md; Codex automations require explicit user scheduling, do not replay Claude /loop commands. Check Git identity and required account sign-ins after a cafe reboot.`);
  }
  if (event === 'UserPromptSubmit') {
    if (typeof input.prompt !== 'string') throw new Error('Missing user prompt');
    const approval = /^APPROVE CODEX HOOK ([a-f0-9]{64})$/.exec(input.prompt.trim());
    if (approval) {
      if (state.pending?.digest !== approval[1] || Date.now() > state.pending.expires) return context(event, 'Approval does not match a current pending action. Review the exact blocked action first.');
      state.approved = state.pending;
      save();
      return context(event, 'User approved exactly the pending hook action once, for this session, within ten minutes. Any changed input needs new approval.');
    }
    const words = new Set(input.prompt.toLowerCase().match(/\b(ang|ng|mga|yung|kasi|natin|pero|gusto|gawin|bakit|paano|sige|hindi|ako|tayo)\b/g) || []);
    if (words.size >= 2 || /\b(copy|caption|script|headline|funnel|creative|voiceover|landing page)\b/i.test(input.prompt)) return context(event, 'Match the user register. For marketing copy determine the surface language first; app UI is English. Before user-facing Taglish read .agents/skills/_shared/taglish-voice.md and show the exact wording for approval.');
    return {};
  }
  if (event === 'Stop') {
    const current = fingerprint();
    if (current === (state.verified || state.baseline)) return {};
    const results = [];
    for (const command of ['build']) {
      const result = npm(['run', command]);
      results.push(`npm run ${command}: exit ${result.status}\n${result.stdout || ''}${result.stderr || ''}`);
      writeFileSync(join(stateDir, 'checks.log'), results.join('\n'));
      if (result.status !== 0) return { decision: 'block', reason: `Codex build gate FAILED at npm run ${command}. Read ${join(stateDir, 'checks.log')}. Fix the cause or report the blocker; do not bypass checks.` };
    }
    if (current !== fingerprint()) return { decision: 'block', reason: 'Source changed during verification. Repeat checks after concurrent edits settle.' };
    state.verified = current;
    save();
    return { systemMessage: 'Codex build gate PASSED: npm run build. Run applicable tests explicitly; test, browser and paid workflow evidence remain separate.' };
  }

  if (typeof input.tool_name !== 'string' || !input.tool_input || typeof input.tool_input !== 'object' || Array.isArray(input.tool_input)) throw new Error('Invalid tool input');
  const tool = input.tool_name;
  const args = input.tool_input;
  const command = args.command ?? args.cmd;
  const shell = /^(Bash|PowerShell|exec_command|shell_command)$/.test(tool);
  const edit = /^(apply_patch|Edit|Write|NotebookEdit)$/.test(tool);
  if ((shell || tool === 'apply_patch') && typeof command !== 'string') throw new Error('Missing tool command');
  const text = JSON.stringify(args).replace(/\\\\/g, '/');
  const editPath = path => {
    if (typeof path !== 'string' || !path.trim() || path.includes('\0')) throw new Error('Invalid edit path');
    return resolve(input.cwd, path.replace(/\\/g, '/')).replace(/\\/g, '/');
  };
  if (tool === 'apply_patch') {
    const patch = command.replace(/\r\n/g, '\n');
    if (!patch.startsWith('*** Begin Patch\n') || !/\n\*\*\* End Patch\s*$/.test(patch)
      || patch.split('\n').some(line => line.startsWith('*** ') && !/^\*\*\* (?:(?:Add File|Update File|Delete File|Move to): .+|Begin Patch|End Patch|End of File)$/.test(line))) throw new Error('Unknown patch envelope');
  }
  const target = tool === 'apply_patch'
    ? [...command.replace(/\r\n/g, '\n').matchAll(/^\*\*\* (?:Add File|Update File|Delete File|Move to): (.+)$/gm)].map(match => editPath(match[1])).join('\n')
    : edit ? editPath(args.file_path ?? args.path ?? args.notebook_path) : text;
  if (edit && !target) throw new Error('Missing edit target');
  const metadataOnly = shell && /^(Test-Path|ls|Get-ChildItem)\s+[-\w\s.*\\/:'"]+$/i.test(command) && !/[;|&\r\n]/.test(command);
  if (/(?:^|[^\w])\.env(?!\.example(?:[^\w.-]|$))(?=[^\w]|$)/i.test(target) && !metadataOnly) return deny('ENV WARDEN: secret-file reads, copies and writes are blocked. Use .env.example for names; Neil manages values outside the transcript.');
  const approval = (label, extra = '') => {
    const digest = hash(JSON.stringify(canonical({ cwd: resolve(input.cwd), tool, args, extra })));
    if (state.approved?.digest === digest && state.approved.expires > Date.now()) {
      delete state.approved; delete state.pending; save(); return null;
    }
    state.pending = { digest, expires: Date.now() + 600000 }; save();
    return deny(`${label}: review the exact action and its consequences with Neil. Only Neil may send this exact new chat message to approve one retry: APPROVE CODEX HOOK ${digest}. Agent-generated approval, altered inputs, and bypasses are forbidden.`);
  };
  const mutation = edit || shell && /Set-Content|Add-Content|Out-File|writeFile|write_text|write_bytes|\b(sed|perl|python|node|cp|mv|rm|del|tee|git (?:restore|checkout|apply))\b|[>]/i.test(command) || /write|edit|delete|move|patch/i.test(tool);
  if (mutation && /codex-hook-state|\.paid-rolls/i.test(target)) return deny('HOOK INTEGRITY: agent tools must not modify approval/counter state. Prepare the exact change for user review and manual application.');
  const reviewReasons = [];
  if (mutation && /\.codex[\/]hooks(?:[\/]|\.json)/i.test(target)) reviewReasons.push('HOOK CHANGE: review the exact gate diff');
  if (mutation && /services[\/]geminiService\.ts|api[\/]_lib[\/]prompts\.ts/i.test(target)) {
    if (shell) return deny('TUNED-FILE GATE: prepare a literal apply_patch diff for exact user review. Shell edits may depend on mutable inputs and cannot be approved here.');
    reviewReasons.push('TUNED-FILE GATE');
  }

  const ads = /meta[-_ ]?ads/i.test(tool) || shell && /\bmeta-ads\b/i.test(command);
  if (ads) {
    const read = shell ? /\b(get|list|insights|preview|search|help)\b/i.test(command) && !/\b(create|update|delete|pause|activate|upload|set|boost|launch|resume)\b/i.test(command) : /__(?:ads_)?(?:get_|list_|insights_|library_search|account_get_|catalog_get_|catalog_search_|get_report)/i.test(tool);
    if (!read) {
      if (/activate|update_entity|boost|launch|resume|unpause|daily_budget|lifetime_budget|bid_amount|["'\s:=]ACTIVE\b/i.test(text + tool)) return deny('AD-SPEND GATE: draft the exact command and expected spend for Neil to run. Agent activation or budget changes remain blocked.');
      reviewReasons.push('AD-WRITE GATE: real account mutation');
    }
  }
  if (!edit && /veo-produce|veo-motion-test/i.test(text)) {
    if (shell && /--(?:dry-run|help)\b/.test(command) && !/[;&|\r\n]/.test(command) && (command.match(/veo-produce|veo-motion-test/gi) || []).length === 1 && !reviewReasons.length) return {};
    if (!shell || /[;&|\r\n]/.test(command) || reviewReasons.length || (command.match(/veo-produce|veo-motion-test/gi) || []).length !== 1) return deny('VEO GATE: submit one standalone render command, without combined operations, for exact approval.');
    const out = typeof command === 'string' && /--out(?:=|\s+)(?:"([^"]+)"|'([^']+)'|([^\s;|&]+))/.exec(command);
    if (!out) return deny('VEO GATE: provide --out and a nearby script.spec.json with a user-approved maxPaidRolls and paid test spec.');
    const outputDir = dirname(resolve(input.cwd, out[1] || out[2] || out[3]));
    const spec = [join(outputDir, 'script.spec.json'), join(dirname(outputDir), 'script.spec.json')].find(existsSync);
    if (!spec) return deny('VEO GATE: missing script.spec.json beside the output directory.');
    const specText = readFileSync(spec, 'utf8');
    const max = JSON.parse(specText).maxPaidRolls;
    if (!Number.isSafeInteger(max) || max < 1) return deny('VEO GATE: maxPaidRolls must be a positive user-approved integer.');
    const counter = join(dirname(spec), '.paid-rolls');
    const used = existsSync(counter) ? Number(readFileSync(counter, 'utf8').trim()) : 0;
    if (!Number.isSafeInteger(used) || used < 0 || used >= max) return deny('VEO GATE: paid-roll cap reached or counter invalid. Do not reset or raise it; report usage to Neil.');
    const pending = approval('VEO GATE: Neil must approve exact inputs, assets, pass/fail evidence and maximum cost', specText);
    if (pending) return pending;
    const preflight = run(process.execPath, [join(root, 'tools/ad_preflight.mjs'), '--script', spec], root);
    if (preflight.status !== 0) return deny('VEO GATE: ad_preflight failed. Run node tools/ad_preflight.mjs --script <spec> and fix the script before requesting another approval.');
    // Exclusive reservation prevents simultaneous calls from silently exceeding the cap.
    const lock = `${counter}.lock`;
    try { writeFileSync(lock, '', { flag: 'wx' }); } catch { return deny('VEO GATE: another reservation is active. Report a stale lock; never remove it autonomously.'); }
    try {
      if (readFileSync(spec, 'utf8') !== specText) return deny('VEO GATE: spec changed during preflight. Review the changed input before approving again.');
      const latest = existsSync(counter) ? Number(readFileSync(counter, 'utf8').trim()) : 0;
      if (!Number.isSafeInteger(latest) || latest < 0 || latest >= max) return deny('VEO GATE: paid-roll cap reached.');
      writeFileSync(counter, String(latest + 1));
    } finally { unlinkSync(lock); }
    return {};
  }
  if (shell && /\bgit\s+(?:-\S+\s+)*commit\b/i.test(command)) {
    if (git(['status', '--porcelain', '--', 'package.json', 'package-lock.json']).trim()) {
      const check = npm(['ci', '--dry-run', '--ignore-scripts']);
      writeFileSync(join(stateDir, 'lock-sync.log'), `${check.stdout || ''}${check.stderr || ''}`);
      if (check.status !== 0) return deny(`LOCK-SYNC GATE: npm ci --dry-run --ignore-scripts failed. Read ${join(stateDir, 'lock-sync.log')}; repair dependency consistency before committing.`);
    }
  }
  return reviewReasons.length ? approval(reviewReasons.join('; ')) || {} : {};
}

let payload;
try { payload = JSON.parse(readFileSync(0, 'utf8')); emit(main(payload)); }
catch {
  const reason = 'CODEX HOOK: malformed input or gate inspection failed. Stop and inspect hook setup; do not retry through another tool.';
  emit(payload?.hook_event_name === 'Stop' ? { decision: 'block', reason } : deny(reason));
}
