/**
 * check-anchors.mjs — the gate that guards the anchored artifacts.
 *
 * WHY THESE TESTS RUN THE REAL SCRIPT AGAINST A REAL GIT REPO
 * -----------------------------------------------------------
 * Three false-greens have been found in this script, all by human review, and every
 * one of them was a wrong belief about what git does:
 *
 *   - bare `git diff` compares the INDEX to the worktree, so a STAGED twin goes green
 *   - `git diff HEAD` cannot see a path absent from HEAD, so an UNTRACKED twin goes green
 *   - `git ls-files -v` tags sparse-excluded files with an UPPERCASE `S`, so a
 *     lowercase-only regex missed the very case it was written for
 *
 * A test with a mocked git would have encoded the same wrong belief and passed. So these
 * build a throwaway repo in a temp dir, copy the REAL script + builder + template into it
 * unmodified, and let it shell out to the REAL git. The only fakes are the three cited
 * source files, reduced to the anchor strings themselves — the builder locates an anchor
 * by searching a file's text, so a short stand-in exercises it exactly as the 1,915-line
 * original does, without dragging the app into a tools test.
 *
 * The three headline cases assert a CONTROL as well as a verdict: they run the naive git
 * command first and prove it reports success, then assert the script reports failure.
 * Without that control the assertions would merely restate the implementation.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, cpSync, writeFileSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const TWIN = 'artifacts/eli5-image-gate.html';
const ORCH = 'services/producerOrchestrator.ts';
const TPL = 'tools/artifacts/eli5-image-gate.tpl.html';

/** The four files the script and its builder actually read, copied verbatim. */
const COPIED = [
  'tools/artifacts/check-anchors.mjs',
  'tools/artifacts/_gates.mjs',
  'tools/artifacts/build-eli5-image-gate.mjs',
  TPL,
];

/**
 * Stand-ins for the cited sources. Each holds its anchor strings and nothing else.
 * The padding line exists so a test can insert a line ABOVE an anchor and shift it.
 */
const FAKE_SOURCES: Record<string, string> = {
  'api/gemini/image.ts': [
    '// stand-in for the real handler',
    "const disabled = { error: 'image_gate_disabled' };",
    '',
  ].join('\n'),
  'services/producerDeps.ts': [
    '// stand-in',
    'export function gateDepsFor() { return {}; }',
    '',
  ].join('\n'),
  [ORCH]: [
    '// stand-in for the orchestrator',
    '// padding',
    'if (deps.checkSceneImage) {',
    '}',
    'await deps.run.flagScene(run.runId, i,',
    'if (deps.imageGateCheck) {',
    '}',
    '',
  ].join('\n'),
};

function git(sb: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd: sb, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** Runs a git command purely to observe its exit code — the CONTROL in three tests below. */
function gitExitCode(sb: string, ...args: string[]): number {
  try {
    execFileSync('git', args, { cwd: sb, stdio: 'ignore' });
    return 0;
  } catch (err: any) {
    return err?.status ?? -1;
  }
}

function build(sb: string): void {
  execFileSync(process.execPath, [join(sb, 'tools', 'artifacts', 'build-eli5-image-gate.mjs')], {
    cwd: sb,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function runCheck(sb: string, env?: NodeJS.ProcessEnv): { code: number; out: string } {
  const args = [join(sb, 'tools', 'artifacts', 'check-anchors.mjs')];
  try {
    const out = execFileSync(process.execPath, args, {
      cwd: sb,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      ...(env ? { env } : {}),
    });
    return { code: 0, out };
  } catch (err: any) {
    return { code: err?.status ?? -1, out: `${err?.stdout ?? ''}${err?.stderr ?? ''}` };
  }
}

/**
 * A committed repo in which the check passes. Every test starts from this state and
 * breaks exactly one thing, so a failure names the thing it broke.
 */
function sandbox(): string {
  const sb = mkdtempSync(join(tmpdir(), 'anchors-'));
  for (const rel of COPIED) {
    mkdirSync(join(sb, dirname(rel)), { recursive: true });
    cpSync(join(REPO, rel), join(sb, rel));
  }
  for (const [rel, body] of Object.entries(FAKE_SOURCES)) {
    mkdirSync(join(sb, dirname(rel)), { recursive: true });
    writeFileSync(join(sb, rel), body, 'utf8');
  }

  git(sb, 'init', '-q', '.');
  git(sb, 'config', 'user.email', 'test@example.com');
  git(sb, 'config', 'user.name', 'anchors test');
  // The builder writes LF. With autocrlf on (the Windows default on some installs) git
  // hands back CRLF at checkout, the rebuild writes LF, and the twin differs forever —
  // a red that says nothing about anchors. Pin the bytes so the twin means what it says.
  git(sb, 'config', 'core.autocrlf', 'false');
  git(sb, 'config', 'core.safecrlf', 'false');
  writeFileSync(join(sb, '.gitattributes'), '* -text\n', 'utf8');

  build(sb);
  git(sb, 'add', '-A');
  git(sb, 'commit', '-qm', 'baseline');
  return sb;
}

const read = (sb: string, rel: string) => readFileSync(join(sb, rel), 'utf8');
const write = (sb: string, rel: string, body: string) => writeFileSync(join(sb, rel), body, 'utf8');

describe('check-anchors.mjs', () => {
  let base: string;
  beforeAll(() => {
    base = sandbox();
  });

  it('passes on a clean, committed repo', () => {
    const { code, out } = runCheck(base);
    expect(code).toBe(0);
    expect(out).toContain(`${TWIN} unchanged`);
    expect(out).toContain('check:artifact-anchors ok');
  });

  it('stays green when a cited call site only SHIFTS LINES', () => {
    // The whole point of citing the anchor STRING instead of the resolved line number.
    // A blank line above the first anchor moves all three orchestrator citations; the
    // page's claims are unchanged, so the twin must be too — and `artifacts` is in
    // main-status's `needs`, so a twin that tracked line positions would page Neil.
    const sb = sandbox();
    const before = read(sb, TWIN);
    write(sb, ORCH, read(sb, ORCH).replace('// padding', '// padding\n'));

    const { code, out } = runCheck(sb);
    expect(code).toBe(0);
    expect(out).toContain(`${TWIN} unchanged`);
    expect(read(sb, TWIN)).toBe(before);
    rmSync(sb, { recursive: true, force: true });
  });

  it('fails on a drifted twin even when it has been STAGED', () => {
    // False-green #1. `git diff` alone compares the index to the worktree, so once the
    // rebuilt twin is staged it reproduces the staged bytes and reports success. A dev
    // running `git add -A` then re-running this as a pre-commit pass would be waved
    // through on a citation that moved.
    const sb = sandbox();
    write(sb, TPL, `${read(sb, TPL)}\n<!-- deliberate drift -->\n`);
    build(sb);
    git(sb, 'add', TWIN);

    // control: the naive check reports SUCCESS on exactly this state
    expect(gitExitCode(sb, 'diff', '--exit-code', '--', TWIN)).toBe(0);

    const { code, out } = runCheck(sb);
    expect(code).toBe(1);
    expect(out).toContain(`${TWIN} DIFFERS from HEAD after rebuild`);
    rmSync(sb, { recursive: true, force: true });
  });

  it('refuses to report on an UNTRACKED twin instead of calling it unchanged', () => {
    // False-green #2. With the path absent from HEAD there is nothing to diff against,
    // so `git diff HEAD` succeeds and the artifact looks verified while nothing was read.
    const sb = sandbox();
    git(sb, 'rm', '-q', '--cached', TWIN);
    git(sb, 'commit', '-qm', 'drop the twin from HEAD');

    // control: `git diff HEAD` reports SUCCESS on a path it cannot see
    expect(gitExitCode(sb, 'diff', 'HEAD', '--exit-code', '--', TWIN)).toBe(0);

    const { code, out } = runCheck(sb);
    expect(code).toBe(1);
    expect(out).toContain(`${TWIN} is NOT TRACKED by git`);
    expect(out).not.toContain('unchanged');
    rmSync(sb, { recursive: true, force: true });
  });

  it('refuses to report on a SPARSE-EXCLUDED twin, whose git flag is an uppercase S', () => {
    // False-green #3, and the reason this asserts the letter itself: sparse-checkout sets
    // skip-worktree, which `ls-files -v` tags `S`. A regex matching only lowercase flags
    // (assume-unchanged) did not fire on the cafe-PC lite clone it was written for.
    const sb = sandbox();
    git(sb, 'update-index', '--skip-worktree', TWIN);

    // control: the flag really is uppercase, which is the belief the old regex got wrong
    expect(git(sb, 'ls-files', '-v', '--', TWIN).trim()[0]).toBe('S');

    const { code, out } = runCheck(sb);
    expect(code).toBe(1);
    expect(out).toContain('is SPARSE-EXCLUDED from this checkout (git flag "S")');
    expect(out).toContain(`git sparse-checkout add '${TWIN}'`);
    rmSync(sb, { recursive: true, force: true });
  });

  it('treats a NEW staged twin as new, not as a moved call site', () => {
    // The prescribed workflow for adding an artifact: register it, stage the twin, run
    // this as a sanity pass. `git diff HEAD` reports the whole file as an addition, which
    // an earlier draft announced as drift. Nothing moved — there is no HEAD copy yet.
    const sb = sandbox();
    git(sb, 'rm', '-q', '--cached', TWIN);
    git(sb, 'commit', '-qm', 'drop the twin from HEAD');
    git(sb, 'add', TWIN);

    const { code, out } = runCheck(sb);
    expect(code).toBe(0);
    expect(out).toContain(`${TWIN} is NEW (staged, not yet in HEAD)`);
    expect(out).not.toContain('DIFFERS');
    rmSync(sb, { recursive: true, force: true });
  });

  it('reports a LOST anchor as a builder failure, not as a moved twin', () => {
    const sb = sandbox();
    write(sb, ORCH, read(sb, ORCH).replace('if (deps.imageGateCheck) {', 'if (deps.renamedGateCheck) {'));

    const { code, out } = runCheck(sb);
    expect(code).toBe(1);
    expect(out).toContain('ANCHOR LOST');
    expect(out).toContain(`The builder for ${TWIN} FAILED`);
    // Misattributing this sends the reader to audit a twin that was never rewritten.
    expect(out).not.toContain('DIFFERS from HEAD');
    rmSync(sb, { recursive: true, force: true });
  });

  it('rejects an anchor that stops being unique', () => {
    // A twice-matching anchor is a coin flip, not a citation: it silently starts naming
    // whichever call site happens to come first.
    const sb = sandbox();
    write(sb, ORCH, `${read(sb, ORCH)}if (deps.imageGateCheck) {\n}\n`);

    const { code, out } = runCheck(sb);
    expect(code).toBe(1);
    expect(out).toContain('ANCHOR AMBIGUOUS');
    rmSync(sb, { recursive: true, force: true });
  });

  it('says git is missing rather than blaming the artifact when git is off PATH', () => {
    // Every branch here shells out to git, so a spawn failure must not be read as a
    // verdict. An early draft printed "NOT TRACKED — run git add" for a repo git could
    // not reach, which is advice that cannot work.
    const sb = sandbox();
    const { code, out } = runCheck(sb, { PATH: '', SystemRoot: process.env.SystemRoot ?? '' });
    expect(code).toBe(1);
    expect(out).toContain('git is not on PATH');
    expect(out).toContain(`Nothing has been determined about ${TWIN}`);
    expect(out).not.toContain('NOT TRACKED');
    rmSync(sb, { recursive: true, force: true });
  });
});
