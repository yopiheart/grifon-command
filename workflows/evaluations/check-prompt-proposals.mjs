// Offline review aid for pq-*.proposed.patch. Never writes runtime files or calls a provider.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import assert from 'node:assert/strict';

const require = createRequire(new URL('../../package.json', import.meta.url));
const root = new URL('../../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8').replace(/\r\n/g, '\n');
const original = read('api/_lib/prompts.ts');
const ids = ['a-language', 'b-proof', 'c-price', 'd-fixtures', 'e-claims', 'f-beat-count'];
const proposals = ids.map(id => {
  const file = `workflows/evaluations/pq-${id}.proposed.patch`;
  execFileSync('git', ['apply', '--check', '--', file], { cwd: root, stdio: 'pipe' });
  const patch = read(file);
  const edits = patch.split(/^@@[^\n]*\n/m).slice(1).map(hunk => {
    const lines = hunk.split('\n');
    return [
      lines.filter(line => line.startsWith('-')).map(line => line.slice(1)).join('\n'),
      lines.filter(line => line.startsWith('+')).map(line => line.slice(1)).join('\n'),
    ];
  });
  return { id, target: patch.match(/^--- a\/(.+)$/m)[1], edits };
});
function compile(source) {
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    reportDiagnostics: true,
  });
  assert.equal(compiled.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  const exports = {};
  new Function('exports', 'require', compiled.outputText)(exports, require);
  return exports;
}
function apply(source, entries) {
  for (const item of entries) for (const [before, after] of item.edits) {
    assert.equal(source.split(before).length, 2, `unique anchor ${item.id}`);
    source = source.replace(before, after);
  }
  return source;
}
const base = compile(original);
const price = compile(apply(original, proposals.filter(p => p.id === 'c-price')));
const all = compile(apply(original, proposals.filter(p => p.target === 'api/_lib/prompts.ts')));
const input = (scriptType, businessType, listingPrice = '') => ({
  businessInfo: { scriptType, businessType, listingPrice, product: 'Synthetic listing', audience: 'test audience', features: 'clean title', separator: 'direct seller', benefit: 'confidence', painPoint: 'uncertain terms' },
  brandName: 'Example', language: 'Taglish', offer: 'P999', chosenAngleBrief: '',
});
let originalBlanketRule = 0;
let proposedPriceCases = 0;
for (const type of ['RealEstate', 'UGCPro']) for (const value of ['', '25k/month', 'P4.2M']) {
  const valueInput = input(type, 'realestate', value);
  const before = base.buildAdScriptPrompt(valueInput, undefined, 'tutorial');
  const after = price.buildAdScriptPrompt(valueInput, undefined, 'tutorial');
  if (before.includes('Under no circumstances mention price or offer pricing.')) originalBlanketRule++;
  assert(!after.includes('Under no circumstances mention price or offer pricing.'));
  assert(after.includes('**PRICE PRECEDENCE:**'));
  assert(after.includes(value ? 'once EXACTLY as given' : 'INQUIRY-ONLY'));
  if (type === 'UGCPro') {
    assert(after.includes('NO peso amount in the CTA'));
    assert(!after.includes('NO peso amount ever'));
  }
  proposedPriceCases++;
}
const controls = [
  ['MrBeast', 'product'], ['Testimonial', 'product'], ['Services', 'service'],
  ...['ASMR', 'Reaction', 'Utility'].map(sub => ['Temu', 'product', sub]),
  ...['tryon', 'unboxing', 'demo', 'transformation', 'tutorial'].map(sub => ['UGCPro', 'product', undefined, sub]),
  ...['transformation', 'tutorial'].map(sub => ['UGCPro', 'service', undefined, sub]),
];
for (const [type, bt, temu, ugc] of controls) {
  const value = input(type, bt, '25k/month');
  assert(price.buildAdScriptPrompt(value, temu, ugc) === base.buildAdScriptPrompt(value, temu, ugc), `price proposal changed ${type}/${bt}/${temu ?? ugc ?? '-'}`);
  assert.equal(all.MODEL_TEXT, base.MODEL_TEXT);
  assert.equal(typeof all.buildAdScriptPrompt(value, temu, ugc), 'string');
}
console.log(JSON.stringify({ patchesApply: proposals.length, originalBlanketRule, proposedPriceCases, unaffectedPriceControlsByteEqual: controls.length, combinedCandidateTranspilesAndBuilds: true, scope: 'in-memory prompt assembly only; not full type-checking or generated-output quality' }, null, 2));
