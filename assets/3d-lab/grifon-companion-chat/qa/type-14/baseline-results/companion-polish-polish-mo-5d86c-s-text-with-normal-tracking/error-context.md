# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: companion-polish.spec.ts >> polish: mobile composer uses readable 14px sans text with normal tracking
- Location: tests\e2e\companion-polish.spec.ts:40:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 14
Received: 16
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - group [ref=e4]:
    - generic "Local test fixture · mocked generation · no provider calls" [ref=e5] [cursor=pointer]
  - generic [ref=e6]:
    - banner [ref=e7]:
      - button "Back to dashboard" [ref=e9] [cursor=pointer]:
        - img [ref=e10]
      - button "New ad" [disabled] [ref=e13]
      - generic [ref=e14]:
        - iframe [ref=e16]:

        - heading "Grifon" [level=1] [ref=e17]
    - region "Conversation with Grifon" [ref=e19]:
      - article [ref=e23]:
        - paragraph [ref=e24]: What product are we making an ad for? Tell me about your audience and what you want the ad to achieve.
        - paragraph [ref=e25]:
          - time [ref=e26]: 9:57 AM
      - generic [ref=e28]:
        - generic [ref=e29]:
          - button "Attach product photo" [ref=e30] [cursor=pointer]:
            - img [ref=e31]
          - textbox "Message Grifon" [ref=e33]:
            - /placeholder: Tell Grifon…
          - button "Send" [disabled] [ref=e34]:
            - img [ref=e35]
        - paragraph [ref=e37]: Draft saved on this device. No generation starts until you confirm.
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import fs from 'node:fs';
  3  | import path from 'node:path';
  4  |
  5  | test.use({ serviceWorkers: 'block' });
  6  | test.beforeEach(async ({ page }) => {
  7  |   await page.route('**/*', route => {
  8  |     const u = new URL(route.request().url());
  9  |     if (route.request().method() === 'GET' && ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(u.hostname)) return route.continue();
  10 |     if (!['http://localhost:5173', 'http://127.0.0.1:5173'].includes(u.origin) || u.pathname.startsWith('/api/')) return route.abort();
  11 |     return route.continue();
  12 |   });
  13 |   if (process.env.POLISH_OLD_FOLLOW === '1') await page.route(/\/components\/CompanionChat\/CompanionChatSurface\.tsx(?:\?.*)?$/, async route => {
  14 |     const response = await route.fetch();
  15 |     // Route-only reconstruction of the two missing pending-follow intent assignments
  16 |     // proven by scroll-trace.json; never edits the production component.
  17 |     await route.fulfill({ response, body: (await response.text()).replaceAll('followingScroll.current = true;', '') });
  18 |   });
  19 |   await page.goto('/companion-chat-preview.html');
  20 |   await expect(page.locator('iframe:visible')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
  21 | });
  22 |
  23 | test('polish: pointer burst coalesces avatar bounds reads to one per animation frame', async ({ page }) => {
  24 |   const measurement = await page.locator('iframe:visible').evaluate(async iframe => {
  25 |     const host = iframe.parentElement!;
  26 |     const original = host.getBoundingClientRect.bind(host); let reads = 0;
  27 |     host.getBoundingClientRect = () => { reads++; return original(); };
  28 |     return new Promise<{ duringBurst: number; afterFrame: number }>(resolve => requestAnimationFrame(() => {
  29 |       for (let i = 0; i < 120; i++) window.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse', clientX: 100 + i, clientY: 200 }));
  30 |       const duringBurst = reads;
  31 |       requestAnimationFrame(() => requestAnimationFrame(() => resolve({ duringBurst, afterFrame: reads })));
  32 |     }));
  33 |   });
  34 |   const dir = path.resolve('assets/3d-lab/grifon-companion-chat/qa/polish'); fs.mkdirSync(dir, { recursive: true });
  35 |   fs.writeFileSync(path.join(dir, `${process.env.POLISH_PHASE || 'current'}-pointer.json`), JSON.stringify({ events: 120, ...measurement }, null, 2));
  36 |   expect(measurement.duringBurst).toBe(0);
  37 |   expect(measurement.afterFrame).toBeLessThanOrEqual(1);
  38 | });
  39 |
  40 | test('polish: mobile composer uses readable 14px sans text with normal tracking', async ({ page }) => {
  41 |   await page.setViewportSize({ width: 375, height: 667 });
  42 |   const css = await page.getByRole('textbox', { name: 'Message Grifon' }).evaluate(element => {
  43 |     const s = getComputedStyle(element); return { size: parseFloat(s.fontSize), family: s.fontFamily, tracking: s.letterSpacing };
  44 |   });
> 45 |   expect(css.size).toBe(14);
     |                    ^ Error: expect(received).toBe(expected) // Object.is equality
  46 |   expect(css.family.toLowerCase()).not.toMatch(/mono/);
  47 |   expect(['normal', '0px']).toContain(css.tracking);
  48 | });
  49 |
  50 | test('polish: capped120 transcript explicitly follows a sent message from far history', async ({ page }) => {
  51 |   await page.setViewportSize({ width: 390, height: 844 });
  52 |   await page.evaluate(() => {
  53 |     const key = 'grifon_companion_draft:fixture-user-a';
  54 |     const envelope = JSON.parse(localStorage.getItem(key)!);
  55 |     envelope.draft.messages = Array.from({ length: 120 }, (_, i) => ({ id: `capped-${i}`, role: i % 2 ? 'user' : 'assistant', text: `Existing message ${i}. ` + 'More context for this ad. '.repeat(4), at: 1 + i }));
  56 |     localStorage.setItem(key, JSON.stringify(envelope));
  57 |   });
  58 |   await page.reload();
  59 |   await page.getByRole('textbox', { name: 'Message Grifon' }).waitFor();
  60 |   await page.evaluate(() => (window as any).companionFixture.emit('result'));
  61 |   const scroller = page.getByTestId('conversation-scroll');
  62 |   await scroller.evaluate(element => { element.scrollTop = element.scrollHeight * .4; element.dispatchEvent(new Event('scroll')); });
  63 |   await page.getByRole('textbox', { name: 'Message Grifon' }).fill('style clean');
  64 |   await page.getByRole('button', { name: 'Send', exact: true }).click();
  65 |   await expect.poll(() => scroller.evaluate(element => element.scrollHeight - element.clientHeight - element.scrollTop), { timeout: 500 }).toBeLessThanOrEqual(24);
  66 |   expect(await page.evaluate(() => JSON.parse(localStorage.getItem('grifon_companion_draft:fixture-user-a')!).draft.messages.length)).toBe(120);
  67 | });
  68 |
```