#!/usr/bin/env node
// Compare only the explicitly listed production prompt copies. Never import the
// evaluation harnesses: importing them can read credentials and start paid work.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const production = 'services/geminiService.ts';
const sceneEval = 'tools/eval_scene_image_models.mjs';
const realismEval = 'tools/eval_realism_formula.mjs';
export const sourceFiles = [production, sceneEval, realismEval];
const avatarMarker = '**SMART CASTING DIRECTOR LOGIC:**';
const pairs = [
  [sceneEval, 'REALISM_INSTRUCTION'],
  [sceneEval, 'NO_TEXT_CONSTRAINT'],
  [sceneEval, 'REALISM_INSTRUCTION_CINEMATIC'],
  [realismEval, 'REALISM_INSTRUCTION'],
  [realismEval, 'NO_TEXT_CONSTRAINT'],
  [realismEval, 'avatar shared template tail'],
];

// Preserve words, punctuation, interpolations, internal spacing and blank lines.
const normalize = text => text.replace(/\r\n/g, '\n').split('\n')
  .map(line => line.replace(/^[\t ]+|[\t ]+$/g, '')).join('\n');

function extract(source, name) {
  const matches = [];
  const avatar = name === 'avatar shared template tail';
  function visit(node) {
    if (avatar) {
      if ((ts.isTemplateExpression(node) || ts.isNoSubstitutionTemplateLiteral(node))
          && node.getText(source).includes(avatarMarker)) matches.push(node);
    } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name) {
      matches.push(node);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (matches.length !== 1) throw new Error(`expected one ${name}, found ${matches.length}`);
  const match = matches[0];
  if (avatar) {
    const text = match.getText(source).slice(1, -1);
    if (text.split(avatarMarker).length !== 2) throw new Error(`duplicate ${avatarMarker} in template`);
    return normalize(text.slice(text.indexOf(avatarMarker)));
  }
  if (!(match.parent.flags & ts.NodeFlags.Const) || !match.initializer
      || !ts.isNoSubstitutionTemplateLiteral(match.initializer)) {
    throw new Error(`${name} must be a const initialized by a plain template literal`);
  }
  return normalize(match.initializer.getText(source).slice(1, -1));
}

/** Static source parity only; does not certify full harness parity or image quality. */
export function checkEvalPromptSync(sources) {
  const errors = [];
  const parsed = new Map();
  for (const file of sourceFiles) {
    if (typeof sources[file] !== 'string') {
      errors.push(`${file}: source missing`);
      continue;
    }
    const source = ts.createSourceFile(file, sources[file], ts.ScriptTarget.Latest, true,
      file.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS);
    if (source.parseDiagnostics.length) {
      const diagnostic = source.parseDiagnostics[0];
      const { line } = source.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
      errors.push(`${file}:${line + 1}: malformed source: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`);
    } else parsed.set(file, source);
  }
  const checkedPairs = [];
  for (const [file, name] of pairs) {
    if (!parsed.has(production) || !parsed.has(file)) continue;
    const values = [];
    for (const path of [production, file]) {
      try { values.push(extract(parsed.get(path), name)); }
      catch (error) { errors.push(`${path}: ${error.message}`); }
    }
    if (values.length !== 2) continue;
    if (values[0] !== values[1]) {
      const expected = values[0].split('\n');
      const actual = values[1].split('\n');
      const line = Array.from({ length: Math.max(expected.length, actual.length) })
        .findIndex((_, index) => expected[index] !== actual[index]) + 1;
      errors.push(`${file}: ${name} differs from ${production} at normalized block line ${line}`);
    } else checkedPairs.push(`${file}: ${name}`);
  }
  return { checkedPairs, errors };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  try {
    const sources = Object.fromEntries(sourceFiles.map(file => [file, readFileSync(resolve(root, file), 'utf8')]));
    const result = checkEvalPromptSync(sources);
    for (const pair of result.checkedPairs) console.log(`PASS ${pair}`);
    for (const error of result.errors) console.error(`FAIL ${error}`);
    if (result.errors.length) {
      console.error('Review the named copy against production. Do not auto-sync tuned prompts; specific diff approval still applies.');
      process.exitCode = 1;
    } else console.log(`Eval prompt sync: ${result.checkedPairs.length} covered pairs match. Other harness prompts, models and runtime behavior are outside this check.`);
  } catch (error) {
    console.error(`Eval prompt sync failed: ${error.message}`);
    process.exitCode = 1;
  }
}
