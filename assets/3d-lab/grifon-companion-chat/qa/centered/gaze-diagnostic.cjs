const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  const blocked = [];
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (route.request().method() === 'GET' && ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
    if (url.origin !== 'http://127.0.0.1:5173' || url.pathname.startsWith('/api/')) { blocked.push(url.origin + url.pathname); return route.abort(); }
    return route.continue();
  });
  await page.goto('http://127.0.0.1:5173/companion-chat-preview.html');
  await page.locator('iframe[data-ready="true"]').waitFor();
  const frame = await (await page.locator('iframe').elementHandle()).contentFrame();
  const measurements = [];
  for (const state of ['idle', 'reading', 'working']) {
    if (state === 'reading') await page.getByRole('textbox', { name: 'Message Grifon' }).fill('Cold brew');
    if (state === 'working') await page.evaluate(() => window.companionFixture.emit('script'));
    await page.waitForTimeout(900);
    for (const [label, x, y] of [['left', 5, 100], ['right', 1275, 100], ['bottom', 640, 895]]) {
      await page.mouse.move(x, y);
      await page.waitForTimeout(650);
      measurements.push({ state, label, pointer: { x, y }, snapshot: await frame.evaluate(() => window.grifonDebug.snapshot()) });
      await page.screenshot({ path: path.join(__dirname, `gaze-${state}-${label}.png`) });
    }
  }
  fs.writeFileSync(path.join(__dirname, 'gaze-diagnostic.json'), JSON.stringify({ viewport: { width: 1280, height: 900 }, blocked, measurements }, null, 2));
  console.log(JSON.stringify(measurements.map(value => ({ state: value.state, pointer: value.label, controls: value.snapshot.controls, reaction: value.snapshot.reaction })), null, 2));
  await browser.close();
})().catch(error => { console.error(error); process.exitCode = 1; });
