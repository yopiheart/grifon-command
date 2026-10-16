import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

describe('fixture input verification native Node ESM', () => {
  it('boots the exact handler/parser/helper graph without credentials or network and actually decodes the tracked sample', () => {
    const root = resolve(import.meta.dirname, '../..'), temporaryRoot = resolve(root, '.tmp'); mkdirSync(temporaryRoot, { recursive: true });
    const outputRoot = mkdtempSync(resolve(temporaryRoot, 'fixture-input-esm-')), emitted = new Set<string>();
    const compile = (file: string) => {
      if (emitted.has(file)) return; emitted.add(file);
      const javascript = ts.transpileModule(readFileSync(resolve(root, file), 'utf8'), { fileName: file, compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
      const output = resolve(outputRoot, file.replace(/\.ts$/, '.js')); mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, javascript);
      const ast = ts.createSourceFile(output, javascript, ts.ScriptTarget.ES2020, true, ts.ScriptKind.JS);
      for (const statement of ast.statements) {
        if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || !statement.moduleSpecifier.text.startsWith('.')) continue;
        const specifier = statement.moduleSpecifier.text, dependency = extname(specifier) === '.js' ? specifier.slice(0, -3) + '.ts' : specifier + '.ts';
        compile(relative(root, resolve(root, dirname(file), dependency)).replaceAll('\\', '/'));
      }
    };
    try {
      compile('api/fixtures/verify-inputs.ts'); writeFileSync(resolve(outputRoot, 'package.json'), '{"type":"module"}\n');
      const base = pathToFileURL(outputRoot + sep).href, sample = resolve(root, 'api/_lib/assets/fixtures/companion-video-v1.mp4');
      const child = spawnSync(process.execPath, ['--input-type=module', '--eval', `
        import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs'; import { createHash } from 'node:crypto';
        let networkCalls = 0; globalThis.fetch = async () => { networkCalls++; throw new Error('Network disabled'); };
        const { default: handler } = await import(${JSON.stringify(base + 'api/fixtures/verify-inputs.js')});
        const { parseCloudReferenceManifest } = await import(${JSON.stringify(base + 'services/companionCloudReferences.js')});
        const { decodeFixtureInput } = await import(${JSON.stringify(base + 'api/_lib/companionInputVerifier.js')});
        assert.equal(typeof parseCloudReferenceManifest,'function');
        const responses=[];
        for(const [req,status] of [
          [{method:'GET',body:{requestId:'a'.repeat(64)},headers:{}},405],
          [{method:'POST',body:{requestId:'a'.repeat(64),url:'https://outside.example/video'},headers:{}},400],
          [{method:'POST',body:{requestId:'a'.repeat(64)},headers:{}},401]]) {
          const res={statusCode:0,body:null,headers:{},setHeader(k,v){this.headers[k]=v;return this;},status(v){this.statusCode=v;return this;},json(v){this.body=v;return this;}};
          await handler(req,res); assert.equal(res.statusCode,status); assert.equal(res.headers['Cache-Control'],'private, no-store'); responses.push(status);
        }
        const bytes=readFileSync(${JSON.stringify(sample)}), sha256=createHash('sha256').update(bytes).digest('hex');
        const decoded=await decodeFixtureInput(bytes,{slot:'reference',id:'fixture',name:'fixture.mp4',width:360,height:640,duration:8,type:'video/mp4',size:bytes.length,sha256});
        assert.equal(decoded.decoded,true);assert.equal(decoded.frames,192);assert.equal(networkCalls,0);
        console.log(JSON.stringify({responses,parserExport:true,networkCalls,decoded}));
      `], { cwd: outputRoot, env: {}, encoding: 'utf8', timeout: 15_000, windowsHide: true });
      expect(child.error).toBeUndefined(); expect(child.status, child.stderr).toBe(0);
      const result = JSON.parse(child.stdout.trim()); expect(result).toMatchObject({ responses: [405, 400, 401], parserExport: true, networkCalls: 0, decoded: { width: 360, height: 640, frames: 192, decoded: true } });
      expect(result.decoded.durationSeconds).toBeCloseTo(8, 5);
    } finally {
      if (!outputRoot.startsWith(temporaryRoot + sep)) throw new Error('Unexpected fixture input test output path.');
      rmSync(outputRoot, { recursive: true, force: true });
    }
  });
});
