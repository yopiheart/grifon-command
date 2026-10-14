import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkInputs } from './check-ci-e2e-inputs.mjs';

const png = Buffer.from('89504e470d0a1a0a00000000', 'hex');
const jpeg = Buffer.from('ffd8ffe000104a464946', 'hex');
const mp4 = Buffer.from('000000186674797069736f6d00000000', 'hex');
const webm = Buffer.from('1a45dfa39f42868101', 'hex');
const example = 'public/examples/ex-product.png';
const samples = ['public/samples/real_talk.mp4', 'public/samples/unboxing.mp4'];
const manifest = 'public/companion/asset-manifest.json';
const hero = 'tests/fixtures/sample-batch/timpla-hero.jpg';
const video = 'tests/fixtures/sample-batch/before_after-run1-complete-raw.mp4';
const recovery = 'tests/e2e/fixtures/recovery.webm';
function fixture(extra = {}) {
  return { [example]: png, [samples[0]]: mp4, [samples[1]]: mp4, ...extra };
}
function run(files, paths = Object.keys(files)) {
  return checkInputs(paths, path => {
    if (!Object.hasOwn(files, path)) throw new Error('not present in checkout');
    return files[path];
  });
}

test('complete older checkout passes without inventing absent companion consumers', () => {
  const result = run(fixture({ 'tests/e2e/codex-desktop.spec.ts': '// existing smoke' }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.examples, 1);
  assert.equal(result.companion, false);
});

test('original sparse defect: a tracked example omitted from disk fails', () => {
  const files = fixture();
  delete files[example];
  assert.deepEqual(run(files, [example, ...samples]).errors, [`${example}: missing or unreadable input`]);
  assert.deepEqual(run(files).errors, ['public/examples: no committed PNG examples']);
});

test('missing and empty shipped previews fail', () => {
  const files = fixture({ [samples[1]]: Buffer.alloc(0) });
  delete files[samples[0]];
  assert.deepEqual(run(files).errors, [`${samples[0]}: missing or unreadable input`, `${samples[1]}: empty input`]);
});

test('HTML fallback bytes fail PNG, JPEG, MP4 and WebM signatures', () => {
  const files = fixture({ [example]: '<html>SPA fallback</html>', [samples[0]]: '<html>SPA fallback</html>',
    [hero]: '<html>SPA fallback</html>', [recovery]: '<html>SPA fallback</html>' });
  assert.deepEqual(run(files).errors, [
    `${example}: invalid .png media signature`, `${samples[0]}: invalid .mp4 media signature`,
    `${hero}: invalid .jpg media signature`, `${recovery}: invalid .webm media signature`,
  ]);
});

test('consumer source requires fixtures even when missing from the tracked inventory', () => {
  const files = fixture({ 'dev/companionChatPreview.tsx': `const IMAGE = '/${hero}'; const VIDEO = '/${video}';`,
    'tests/e2e/fixtures/oneshotRecovery.ts': `const fixture = '${recovery}';` });
  const errors = run(files).errors;
  assert.deepEqual(errors, [
    `${hero}: missing or unreadable input`, `${video}: missing or unreadable input`,
    `${recovery}: missing or unreadable input`, `${manifest}: missing or unreadable input`,
  ]);
});

test('missing current source cannot silently deactivate consumer checks', () => {
  const files = fixture();
  assert.deepEqual(run(files, [...Object.keys(files), 'tests/e2e/companion.spec.ts']).errors,
    ['tests/e2e/companion.spec.ts: missing or unreadable input']);
});

test('companion runtime source requires the manifest without a preview consumer', () => {
  const files = fixture({ 'components/CompanionChat/CompanionAvatar.tsx': '// real companion runtime' });
  assert.deepEqual(run(files).errors, [`${manifest}: missing or unreadable input`]);
});

test('complete companion fixtures and independently known manifest digest pass', () => {
  const files = fixture({ 'dev/companionChatPreview.tsx': '// preview', [hero]: jpeg, [video]: mp4, [recovery]: webm,
    [manifest]: JSON.stringify({ hashes: { 'main.js': 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' } }),
    'public/companion/main.js': 'abc' });
  assert.deepEqual(run(files).errors, []);
  assert.equal(run(files).companion, true);
});

test('manifest-listed asset omitted by sparse checkout fails', () => {
  const files = fixture({ [manifest]: JSON.stringify({ hashes: { 'scene.bin': 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' } }) });
  assert.deepEqual(run(files).errors, ['public/companion/scene.bin: missing or unreadable input']);
});

test('manifest-listed images require media signatures even with matching digests', () => {
  const files = fixture({ [manifest]: JSON.stringify({ hashes: { 'neutral.png': 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' } }),
    'public/companion/neutral.png': 'abc' });
  assert.deepEqual(run(files, Object.keys(files).filter(path => !path.endsWith('neutral.png'))).errors,
    ['public/companion/neutral.png: invalid .png media signature']);
});

test('manifest digest mismatch and invalid or unsafe manifests fail', () => {
  const hash = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
  assert.deepEqual(run(fixture({ [manifest]: JSON.stringify({ hashes: { 'main.js': hash } }), 'public/companion/main.js': 'def' })).errors,
    ['public/companion/main.js: manifest SHA-256 mismatch']);
  for (const value of ['{}', '{bad', JSON.stringify({ hashes: {} }), JSON.stringify({ hashes: { '../escape': hash } }),
    JSON.stringify({ hashes: { 'C:/escape': hash } }), JSON.stringify({ hashes: { 'C:\\escape': hash } }),
    JSON.stringify({ hashes: { 'main.js': 'bad hash' } })]) {
    const errors = run(fixture({ [manifest]: value })).errors;
    assert.equal(errors.length, 1);
    assert.match(errors[0], /invalid manifest/);
  }
});
