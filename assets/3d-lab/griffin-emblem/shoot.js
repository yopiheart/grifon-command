// headless render-screenshot tool: node shoot.js <name>=<url> [<name>=<url> ...]
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 1024, height: 1280 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  for (const arg of process.argv.slice(2)) {
    const i = arg.indexOf('=');
    const name = arg.slice(0, i), url = arg.slice(i + 1);
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction('window.sceneReady === true', null, { timeout: 15000 }).catch(() => errors.push(name + ': sceneReady timeout'));
    await page.waitForTimeout(600);
    await page.screenshot({ path: `shots/${name}.png` });
    console.log(`saved shots/${name}.png`);
  }
  if (errors.length) console.log('CONSOLE ERRORS:\n' + errors.slice(0, 10).join('\n'));
  else console.log('no console errors');
  await browser.close();
})();
