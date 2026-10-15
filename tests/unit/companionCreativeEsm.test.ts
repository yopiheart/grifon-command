import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

describe('fixture creative planner native ESM graph', () => {
  it('imports and compiles a plan without environment, browser globals, credentials or network calls', () => {
    const root = resolve(import.meta.dirname, '../..');
    const temporaryRoot = resolve(root, '.tmp');
    mkdirSync(temporaryRoot, { recursive: true });
    const outputRoot = mkdtempSync(resolve(temporaryRoot, 'creative-planner-esm-'));
    const emitted = new Set<string>();
    const compile = (file: string) => {
      if (emitted.has(file)) return;
      emitted.add(file);
      const source = readFileSync(resolve(root, file), 'utf8');
      const javascript = ts.transpileModule(source, { fileName: file, compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
      const output = resolve(outputRoot, file.replace(/\.ts$/, '.js'));
      mkdirSync(dirname(output), { recursive: true });
      writeFileSync(output, javascript);
      const ast = ts.createSourceFile(output, javascript, ts.ScriptTarget.ES2020, true, ts.ScriptKind.JS);
      for (const statement of ast.statements) {
        if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
        const specifier = statement.moduleSpecifier.text;
        if (!specifier.startsWith('.')) continue;
        const dependency = extname(specifier) === '.js' ? specifier.slice(0, -3) + '.ts' : specifier + '.ts';
        compile(relative(root, resolve(root, dirname(file), dependency)).replaceAll('\\', '/'));
      }
    };
    try {
      compile('services/companionCreativePlanner.ts');
      writeFileSync(resolve(outputRoot, 'package.json'), '{"type":"module"}\n');
      const base = pathToFileURL(outputRoot + sep).href;
      const child = spawnSync(process.execPath, ['--input-type=module', '--eval', `
        import assert from 'node:assert/strict';
        let networkCalls = 0;
        globalThis.fetch = async () => { networkCalls++; throw new Error('Network disabled'); };
        const { createReferenceDraft } = await import(${JSON.stringify(base + 'services/companionReferenceDraft.js')});
        const { createCreativeSampleReview } = await import(${JSON.stringify(base + 'services/companionCreativePlanner.js')});
        const { isCreativePlan, revisionImpact } = await import(${JSON.stringify(base + 'services/companionCreativePlan.js')});
        const draft = { ...createReferenceDraft(), creativeSource: { version: 1, mode: 'fixture-auto', category: 'motion-launch' }, photos: [{ id:'product',name:'sample.png',blob:new Blob(['sample'],{type:'image/png'}),width:1,height:1,role:'product' }] };
        const review = createCreativeSampleReview(draft, 'a'.repeat(64), 2);
        assert.ok(isCreativePlan(review.creativePlan));
        assert.deepEqual(revisionImpact(review.creativePlan, ['music']).invalidated, ['music','assembly','qa']);
        assert.equal(networkCalls, 0);
        console.log(JSON.stringify({ valid:true,networkCalls,category:review.creativePlan.source.category }));
      `], { cwd: outputRoot, env: {}, encoding: 'utf8', timeout: 10_000 });
      expect(child.error).toBeUndefined();
      expect(child.status, child.stderr).toBe(0);
      expect(JSON.parse(child.stdout.trim())).toEqual({ valid: true, networkCalls: 0, category: 'motion-launch' });
    } finally {
      if (!outputRoot.startsWith(temporaryRoot + sep)) throw new Error('Unexpected creative test output path.');
      rmSync(outputRoot, { recursive: true, force: true });
    }
  });
});
