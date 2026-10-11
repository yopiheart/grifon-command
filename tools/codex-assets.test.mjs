import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectPaths, sparsePattern } from './codex-assets.mjs';

test('instruction inventory includes hidden rules and scripts without bulk media', () => {
  assert.deepEqual(selectPaths([
    'clients/oceanides/DESIGN.md', 'clients/oceanides/ads/build-cut.sh',
    'clients/oceanides/templates/card.html', 'clients/oceanides/out/gallery.html',
    'clients/oceanides/ads/clips/raw.mp4', 'assets/wallpapers/render.png',
    'workflows/believability-samples/generate-zam-images/SKILL.md',
  ], 'instructions'), [
    'clients/oceanides/DESIGN.md', 'clients/oceanides/ads/build-cut.sh',
    'clients/oceanides/templates/card.html', 'workflows/believability-samples/generate-zam-images/SKILL.md',
  ]);
});
test('wizard restores complete documented fixtures and not unrelated media', () => {
  assert.deepEqual(selectPaths(['public/examples/hero.png', 'public/samples/demo.mp4',
    'tests/fixtures/sample-batch/raw.mp4', 'tests/unit/a.test.ts'], 'wizard'),
  ['public/examples/hero.png', 'tests/fixtures/sample-batch/raw.mp4']);
});
test('Zam includes the approved master outside the bundled skill', () => {
  const master = 'workflows/believability-samples/zam-master/opt-C-presenter.png';
  assert.deepEqual(selectPaths([master, 'workflows/believability-samples/zam-master/old.png'], 'zam'), [master]);
});

test('retired identity and project assets cannot be restored by any profile', () => {
  const retired = [
    'clients/oceanides/kuya-gabriel/IDENTITY.md',
    'clients/oceanides/kuya-gabriel/identity-lock/gabriel-website-v4.png',
    'funnels/oceanides-price-page/public/img/gabriel.webp',
    'artifacts/gabriel-review.html', 'artifacts/gb-001-brief.html',
  ];
  for (const profile of ['instructions', 'wizard', 'zam', 'marvin', 'artifact-sources']) {
    assert.deepEqual(selectPaths(retired, profile), [], profile);
  }
});
test('unrecognized profile fails before any git mutation; sparse metacharacters are literal', () => {
  assert.throws(() => selectPaths([], 'everything'), /Unknown profile/);
  assert.equal(sparsePattern('clients/a [approved]/photo?.png'), '/clients/a \\[approved\\]/photo\\?.png');
});
