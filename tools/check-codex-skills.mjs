#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.name !== '__pycache__' && !entry.name.endsWith('.pyc')).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

export function checkCodexSkills(root) {
  const errors = [];
  const excluded = [];
  const files = [...walk(path.join(root, '.agents')), ...walk(path.join(root, '.codex/agents'))];
  const inventory = spawnSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' });
  const tracked = new Set(inventory.status === 0 ? inventory.stdout.split('\0') : []);
  const skills = files.filter((file) => path.basename(file) === 'SKILL.md');
  const seen = new Set();
  const issue = (file, message) => errors.push(`${path.relative(root, file).replaceAll('\\', '/')}: ${message}`);
  const checkPath = (file, target, resolved) => {
    if (existsSync(resolved)) return;
    const relative = path.relative(root, resolved).replaceAll('\\', '/');
    if (tracked.has(relative) || [...tracked].some((name) => name.startsWith(relative.replace(/\/$/, '') + '/'))) {
      excluded.push(`${path.relative(root, file).replaceAll('\\', '/')}: ${target} (tracked, sparse-excluded)`);
    } else issue(file, `missing local reference ${target}`);
  };
  if (!skills.length) errors.push('No Codex SKILL.md entrypoints found');
  for (const file of files.filter((file) => /\.(md|toml|py|mjs)$/.test(file))) {
    const source = readFileSync(file, 'utf8');
    for (const [pattern, message] of [
      [/\.Codex\//, 'invalid .Codex path'],
      [/(?:code|support)\.Codex\.com|Codex\.ai|Codex-fable-5|anthropics\/Codex-plugins/, 'invented Codex URL or platform identity'],
      [/subagent_type:\s*general-purpose/, 'Claude-only subagent invocation'],
    ]) if (pattern.test(source)) issue(file, message);
    if (file.endsWith('.toml') && /\\r/.test(source)) issue(file, 'literal CR escape in agent instructions');
    if (file.endsWith('.toml') && /^model\s*=/m.test(source)) issue(file, 'agent pins a model instead of inheriting selection');
    if (file.endsWith('.py') && /["']claude["']/.test(source) && !source.includes('raise SystemExit("CODEX_LEGACY_EVAL_DISABLED:')) {
      issue(file, 'unguarded Claude subprocess harness');
    }
    if (path.basename(file) === 'SKILL.md') {
      const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
      const name = frontmatter?.match(/^name:\s*([a-z0-9-]+)\s*$/m)?.[1];
      if (!name || !/^description:\s*\S/m.test(frontmatter || '')) issue(file, 'missing valid name/description frontmatter');
      if (name && name !== path.basename(path.dirname(file))) issue(file, 'skill name differs from directory');
      if (name && seen.has(name)) issue(file, `duplicate skill name ${name}`);
      if (name) seen.add(name);
      for (const match of source.matchAll(/\]\(([^)\s]+)\)/g)) {
        const target = decodeURIComponent(match[1].split('#')[0]);
        if (!target || /^(?:https?:|app:|mailto:)/.test(target) || /[<>*]/.test(target)) continue;
        checkPath(file, target, path.resolve(path.dirname(file), target));
      }
      for (const match of source.matchAll(/(?:node|python(?:3)?)\s+((?:\.agents|tools|scripts)\/[^\s`\\]+\.(?:mjs|py|ps1))/g)) {
        checkPath(file, match[1], path.resolve(root, match[1]));
      }
    }
  }
  return { skills: skills.length, files: files.length, errors: [...new Set(errors)], excluded: [...new Set(excluded)] };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkCodexSkills(path.resolve(process.argv[2] || '.'));
  for (const error of result.errors) console.error(`FAIL ${error}`);
  for (const item of result.excluded) console.log(`OPTIONAL INPUT ${item}`);
  console.log(`Codex skills: ${result.skills} entrypoints, ${result.files} files, ${result.errors.length} errors, ${result.excluded.length} sparse references`);
  process.exitCode = result.errors.length ? 1 : 0;
}
