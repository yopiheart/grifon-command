import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';

// Migration smoke: no account, token, provider request, or paid generation.
// The API rejects these requests before auth lookup, quota, or model calls.
test('local API middleware reaches method and missing-token guards', async ({ request }) => {
  const method = await request.get('/api/gemini/text');
  expect(method.status()).toBe(405);
  expect(method.headers()['content-type']).toContain('application/json');
  expect(await method.json()).toEqual({ error: 'method_not_allowed' });
  const auth = await request.post('/api/gemini/text', { data: {} });
  expect(auth.status()).toBe(401);
  expect(await auth.json()).toEqual({ error: 'missing_bearer_token' });
});

test('all committed upload examples are actual PNGs, not SPA fallback pages', async ({ request }) => {
  const files = execFileSync('git', ['ls-tree', '-rz', '--name-only', 'HEAD', '--', 'public/examples'], { encoding: 'utf8' })
    .split('\0').filter(path => path.endsWith('.png'));
  expect(files.length).toBeGreaterThan(0);
  for (const file of files) {
    const response = await request.get('/' + file.replace(/^public\//, ''));
    expect(response.status(), file).toBe(200);
    expect(response.headers()['content-type'], file).toContain('image/png');
    expect((await response.body()).subarray(0, 8).toString('hex'), file).toBe('89504e470d0a1a0a');
  }
});

test('shipped sample previews serve media', async ({ request }) => {
  for (const sample of ['real_talk', 'unboxing']) {
    const response = await request.get(`/samples/${sample}.mp4`, { headers: { Range: 'bytes=0-1023' } });
    expect([200, 206]).toContain(response.status());
    expect(response.headers()['content-type']).toContain('video/mp4');
    expect((await response.body()).subarray(4, 8).toString()).toBe('ftyp');
  }
});

test('mobile landing mounts after desktop migration', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#what-you-get')).toBeAttached();
  await expect(page.getByText('A module has crashed.')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/codex-desktop-mobile.png', fullPage: true });
});
