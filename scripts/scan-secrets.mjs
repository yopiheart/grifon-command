#!/usr/bin/env node
// scan-secrets.mjs — secret / leak scanner for Grifon Command.
//
// Catches a leaked or mis-scoped secret at edit time, before it reaches a
// commit or the client bundle. Rule set lives in .claude/security-patterns.json.
//
// Modes:
//   --hook                 Read Claude Code hook JSON from stdin, scan tool_input.file_path.
//   <path> [<path> ...]    Scan each file or directory (dirs walked recursively).
//
// Exit codes: 2 if any CRITICAL hit (so a PostToolUse hook feeds the warning
// back to Claude), 0 otherwise. warn-severity hits print but do not fail.
//
// No external dependencies on purpose — survives the cafe-PC defreezer as a
// committed script (see scripts/ siblings).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_PATH);
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const PATTERNS_PATH = path.join(REPO_ROOT, '.claude', 'security-patterns.json');

// Files the scanner must never flag on themselves (they legitimately contain
// the literal pattern strings / secret names).
const SELF_SKIP = new Set([
  path.resolve(SCRIPT_PATH),
  path.resolve(PATTERNS_PATH),
]);

function loadConfig() {
  let raw;
  try {
    raw = fs.readFileSync(PATTERNS_PATH, 'utf8');
  } catch (err) {
    console.error(`scan-secrets: cannot read ${PATTERNS_PATH}: ${err.message}`);
    process.exit(0); // fail-open: never block edits because config is missing
  }
  const cfg = JSON.parse(raw);
  const rules = (cfg.rules || []).map((r) => ({
    ...r,
    regex: new RegExp(r.pattern),
    pathExcludes: (r.pathExcludes || []).map((p) => p.replace(/\\/g, '/')),
  }));
  return {
    rules,
    extensions: new Set(cfg.scanExtensions || []),
    scanEnvFiles: cfg.scanEnvFiles !== false,
    walkSkipDirs: new Set(cfg.walkSkipDirs || []),
  };
}

function relPosix(file) {
  return path.relative(REPO_ROOT, path.resolve(file)).replace(/\\/g, '/');
}

function isScannable(file, cfg) {
  const base = path.basename(file);
  if (cfg.scanEnvFiles && base.startsWith('.env')) return true;
  return cfg.extensions.has(path.extname(file));
}

// Scan one file. Returns array of { file, line, ruleId, severity, description, text }.
function scanFile(file, cfg) {
  const abs = path.resolve(file);
  if (SELF_SKIP.has(abs)) return [];
  let content;
  try {
    content = fs.readFileSync(abs, 'utf8');
  } catch {
    return []; // deleted / unreadable / binary — nothing to scan
  }
  const rel = relPosix(abs);
  const lines = content.split(/\r?\n/);
  const hits = [];
  for (const rule of cfg.rules) {
    if (rule.pathExcludes.some((ex) => rel.startsWith(ex))) continue;
    for (let i = 0; i < lines.length; i++) {
      if (rule.regex.test(lines[i])) {
        hits.push({
          file: rel,
          line: i + 1,
          ruleId: rule.id,
          severity: rule.severity,
          description: rule.description,
          text: lines[i].trim().slice(0, 120),
        });
      }
    }
  }
  return hits;
}

function* walk(dir, cfg) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (cfg.walkSkipDirs.has(entry.name)) continue;
      yield* walk(full, cfg);
    } else if (entry.isFile() && isScannable(full, cfg)) {
      yield full;
    }
  }
}

function collectTargets(inputs, cfg) {
  const files = [];
  for (const input of inputs) {
    let stat;
    try {
      stat = fs.statSync(input);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      for (const f of walk(input, cfg)) files.push(f);
    } else if (isScannable(input, cfg)) {
      files.push(input);
    }
  }
  return files;
}

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function hookFilePath() {
  const raw = readStdin();
  if (!raw.trim()) return null;
  try {
    const payload = JSON.parse(raw);
    return payload?.tool_input?.file_path || null;
  } catch {
    return null;
  }
}

function main() {
  const cfg = loadConfig();
  const args = process.argv.slice(2);
  const isHook = args.includes('--hook');

  let targets;
  if (isHook) {
    const fp = hookFilePath();
    if (!fp) process.exit(0); // no file_path (e.g. MultiEdit/dir op) — nothing to do
    targets = collectTargets([fp], cfg);
  } else {
    const paths = args.filter((a) => !a.startsWith('--'));
    if (paths.length === 0) {
      console.error('usage: node scripts/scan-secrets.mjs <file|dir> [...]  |  --hook (stdin JSON)');
      process.exit(0);
    }
    targets = collectTargets(paths, cfg);
  }

  const hits = targets.flatMap((f) => scanFile(f, cfg));
  if (hits.length === 0) process.exit(0);

  const critical = hits.filter((h) => h.severity === 'critical');
  const warnings = hits.filter((h) => h.severity !== 'critical');

  // Print to stderr so a PostToolUse exit-2 surfaces it to Claude.
  console.error('\n⚠  scan-secrets found potential leaks:');
  for (const h of [...critical, ...warnings]) {
    const tag = h.severity === 'critical' ? 'CRITICAL' : 'warn';
    console.error(`  [${tag}] ${h.file}:${h.line}  (${h.ruleId})`);
    console.error(`         ${h.description}`);
    console.error(`         > ${h.text}`);
  }
  console.error('');

  process.exit(critical.length > 0 ? 2 : 0);
}

main();
