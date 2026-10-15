import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

describe('fixture video handler native ESM boot', () => {
  it('imports the real runtime graph without credentials and rejects invalid or unauthenticated requests', () => {
    const root = resolve(import.meta.dirname, '../..');
    const temporaryRoot = resolve(root, '.tmp');
    mkdirSync(temporaryRoot, { recursive: true });
    const outputRoot = mkdtempSync(resolve(temporaryRoot, 'fixture-video-esm-'));
    const emitted = new Set<string>();
    const entry = 'api/fixtures/video.ts';
    const compile = (file: string) => {
      if (emitted.has(file)) return;
      emitted.add(file);
      const source = readFileSync(resolve(root, file), 'utf8');
      // Preserve emitted specifiers: a bundler or extension rewrite would hide
      // the serverless cold-start failure this test is meant to detect.
      const javascript = ts.transpileModule(source, {
        fileName: file,
        compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
      }).outputText;
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
      compile(entry);
      writeFileSync(resolve(outputRoot, 'package.json'), '{"type":"module"}\n');
      const url = pathToFileURL(resolve(outputRoot, entry.replace(/\.ts$/, '.js'))).href;
      const child = spawnSync(process.execPath, ['--input-type=module', '--eval', `
        import assert from 'node:assert/strict';
        let networkCalls = 0;
        globalThis.fetch = async () => { networkCalls++; throw new Error('Network disabled in fixture boot test'); };
        const { default: handler } = await import(${JSON.stringify(url)});
        const cases = [
          [{ method: 'GET', query: { requestId: '../file' }, headers: {} }, 400, 'invalid_fixture_request'],
          [{ method: 'GET', query: { requestId: 'a'.repeat(64) }, headers: {} }, 401, 'missing_bearer_token'],
          [{ method: 'POST', query: { requestId: 'a'.repeat(64) }, headers: {} }, 405, 'method_not_allowed'],
        ];
        const responses = [];
        for (const [req, status, error] of cases) {
          const res = {
            statusCode: 0, body: null, headers: {},
            setHeader(name, value) { this.headers[name] = value; return this; },
            status(code) { this.statusCode = code; return this; },
            json(body) { this.body = body; return this; },
          };
          await handler(req, res);
          assert.equal(res.statusCode, status);
          assert.deepEqual(res.body, { error });
          assert.equal(res.headers['Cache-Control'], 'private, no-store');
          assert.equal(res.headers['X-Content-Type-Options'], 'nosniff');
          if (status === 405) assert.equal(res.headers.Allow, 'GET');
          responses.push({ status: res.statusCode, error: res.body.error });
        }
        assert.equal(networkCalls, 0);
        console.log(JSON.stringify({ responses, networkCalls }));
      `], { cwd: outputRoot, env: {}, encoding: 'utf8', timeout: 10_000 });
      expect(child.error).toBeUndefined();
      expect(child.status, child.stderr).toBe(0);
      expect(JSON.parse(child.stdout.trim())).toEqual({
        responses: [
          { status: 400, error: 'invalid_fixture_request' },
          { status: 401, error: 'missing_bearer_token' },
          { status: 405, error: 'method_not_allowed' },
        ],
        networkCalls: 0,
      });
    } finally {
      if (!outputRoot.startsWith(temporaryRoot + sep)) throw new Error('Unexpected fixture test output path.');
      rmSync(outputRoot, { recursive: true, force: true });
    }
  });
});
