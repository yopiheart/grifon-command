const { chromium } = require('@playwright/test');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (route.request().method() === 'GET' && ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
    if (url.origin !== 'http://127.0.0.1:5173' || url.pathname.startsWith('/api/')) return route.abort();
    return route.continue();
  });
  await page.goto('http://127.0.0.1:5173/companion-chat-preview.html');
  await page.locator('iframe[data-ready="true"]').waitFor();
  await page.getByRole('textbox', { name: 'Message Grifon' }).fill('Cold brew for busy parents.');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await page.getByRole('status', { name: 'Grifon is typing', exact: true }).waitFor({ state: 'hidden' });
  await page.locator('.companion-message-user').screenshot({ path: path.join(__dirname, 'final-user-bubble-2x.png') });
  await page.locator('.companion-composer').screenshot({ path: path.join(__dirname, 'final-composer-2x.png') });
  await page.getByRole('button', { name: 'New ad', exact: true }).screenshot({ path: path.join(__dirname, 'final-new-ad-button-2x.png') });
  await browser.close();
})().catch(error => { console.error(error); process.exitCode = 1; });
