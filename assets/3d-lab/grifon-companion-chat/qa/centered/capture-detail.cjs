const { chromium } = require('@playwright/test');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (route.request().method() === 'GET' && ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
    if (url.origin !== 'http://127.0.0.1:5173' || url.pathname.startsWith('/api/')) return route.abort();
    return route.continue();
  });
  await page.goto('http://127.0.0.1:5173/companion-chat-preview.html');
  await page.locator('iframe[data-ready="true"]').waitFor();
  await page.screenshot({ path: path.join(__dirname, 'final-header-2x.png'), clip: { x: 0, y: 44, width: 1280, height: 141 } });
  await page.getByRole('button', { name: 'Back to dashboard', exact: true }).screenshot({ path: path.join(__dirname, 'final-dashboard-button-2x.png') });
  await browser.close();
})().catch(error => { console.error(error); process.exitCode = 1; });
