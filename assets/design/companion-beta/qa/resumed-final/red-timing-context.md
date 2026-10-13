# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: companion-chat.spec.ts >> brief, explicit start, truthful callbacks, storyboard approval, video and supported revisions
- Location: tests\e2e\companion-chat.spec.ts:45:1

# Error details

```
Error: expect(received).toContainEqual(expected) // deep equality

Expected value: {"name": "reshoot", "value": 0}
Received array: [{"name": "start", "value": {"aspectRatio": "9:16", "avatar": {"description": "", "ethnicity": "", "gender": "Any", "prompt": "", "url": ""}, "brandName": "North Coffee", "businessType": "product", "castHints": {"ageRange": "", "ethnicity": "", "gender": "Female"}, "heroImageBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/ALLAB//Z", "language": "English", "offer": "Two bottles for 199", "price": "199", "productDescription": "Cold brew for busy parents. Promote our new bottle.", "productName": "Morning brew", "scriptType": "Testimonial", "voiceId": "EXAVITQu4vr4xnSDxMaL"}}, {"name": "fixture-event", "value": "script"}, {"name": "fixture-event", "value": "storyboard"}, {"name": "approve"}, {"name": "fixture-event", "value": "video"}, {"name": "fixture-event", "value": "result"}]
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]: Chats
      - button "Collapse conversations" [ref=e7] [cursor=pointer]:
        - img [ref=e8]
    - button "New chat" [ref=e11] [cursor=pointer]:
      - img [ref=e12]
      - text: New chat
    - generic [ref=e13]:
      - img [ref=e14]
      - textbox "Search chats" [ref=e17]:
        - /placeholder: Search
    - navigation "Conversations" [ref=e18]:
      - 'button "Open chat: Morning brew" [ref=e19] [cursor=pointer]': Morning brew
    - generic [ref=e20]:
      - button "Studio" [ref=e21] [cursor=pointer]:
        - img [ref=e22]
        - text: Studio
      - button "Account settings" [ref=e27] [cursor=pointer]:
        - img [ref=e28]
        - generic [ref=e31]: Preview account
      - paragraph [ref=e32]: Preview · simulated output
  - generic [ref=e33]:
    - generic [ref=e35]:
      - region "Conversation with Grifon" [ref=e37]:
        - generic:
          - generic:
            - generic:
              - heading "Grifon" [level=1]
              - paragraph: Updating your ad
        - generic [ref=e40]:
          - generic "Beta limits" [ref=e41]:
            - paragraph [ref=e42]: Beta · guided ad brief. Each answer fills the field Grifon asks for. Use Edit brief at review to make corrections.
            - paragraph [ref=e43]: Chats stay in this browser on this device. Keep this tab open during production; work may not resume after closing it.
          - paragraph [ref=e44]:
            - time [ref=e45]: Oct 10 · 10:49 AM
          - article [ref=e46]:
            - paragraph [ref=e47]: What product are we making an ad for? Tell me about your audience and what you want the ad to achieve.
          - article [ref=e48]:
            - paragraph [ref=e49]: Cold brew for busy parents. Promote our new bottle.
          - article [ref=e50]:
            - paragraph [ref=e51]: What is the brand name? I will keep its exact spelling.
          - article [ref=e52]:
            - paragraph [ref=e53]: North Coffee
          - article [ref=e54]:
            - paragraph [ref=e55]: What is the product called?
          - article [ref=e56]:
            - paragraph [ref=e57]: Morning brew
          - article [ref=e58]:
            - paragraph [ref=e59]: What offer or benefit should the ad focus on?
          - article [ref=e60]:
            - paragraph [ref=e61]: Two bottles for 199
          - article [ref=e62]:
            - paragraph [ref=e63]: What is the price or promotion? If there is no public price, say “No public price.”
          - article [ref=e64]:
            - paragraph [ref=e65]: "199"
          - article [ref=e66]:
            - paragraph [ref=e67]: Your brief is ready to review. Add a clear product photo, check the preferences, then choose Generate storyboard.
          - article [ref=e68]:
            - paragraph [ref=e69]: Reshoot scene 1
            - paragraph [ref=e70]:
              - time [ref=e71]: 10:49 AM
              - text: · Received
          - article [ref=e72]:
            - paragraph [ref=e73]: Scene 1 is selected. Review its take allowance below, then confirm the reshoot.
          - generic "Production progress" [ref=e74]:
            - status [ref=e75]:
              - img [ref=e76]
              - text: Updating your ad
            - group [ref=e78]:
              - generic "View steps" [ref=e79] [cursor=pointer]
            - paragraph [ref=e80]: Stop waiting ends this tab’s waiting. Submitted work may still finish and use your allowance.
            - button "Stop waiting" [ref=e81] [cursor=pointer]
          - generic [ref=e82]:
            - paragraph [ref=e83]: Your first cut is ready
            - paragraph [ref=e84]: 1 scene · Watch and review your ad
            - button "Open first cut" [ref=e85] [cursor=pointer]
        - generic [ref=e86]:
          - generic [ref=e87]:
            - textbox "Message Grifon" [disabled] [ref=e88]:
              - /placeholder: Try “reshoot scene 2” or “style clean”…
            - button "Start voice input" [disabled] [ref=e89]:
              - img [ref=e90]
            - button "Send" [disabled] [ref=e93]:
              - img [ref=e94]
          - paragraph [ref=e96]: Voice input uses your browser and may be processed online. Review before sending.
          - paragraph [ref=e97]: Saving on this device… Preview · simulated output.
      - dialog "First cut" [ref=e98]:
        - generic [ref=e99]:
          - paragraph [ref=e100]: First cut
          - button "Close viewer" [ref=e101] [cursor=pointer]:
            - img [ref=e102]
        - generic "Your first cut" [ref=e105]:
          - heading "Your first cut." [level=2] [ref=e106]
          - generic "Generated ad video" [ref=e107]
          - link "Download video" [ref=e108] [cursor=pointer]:
            - /url: /tests/fixtures/sample-batch/before_after-run1-complete-raw.mp4
          - paragraph [ref=e109]: Keep the cut, reshoot a scene, or apply an edit style. Custom free-form edits are not supported here yet.
          - button "Reshoot scene 1" [disabled] [ref=e111]
          - generic [ref=e112]:
            - text: Edit style
            - combobox "Edit style" [disabled] [ref=e113]:
              - option "Raw"
              - option "Auto" [selected]
              - option "Impact"
              - option "Clean"
              - option "Punch"
              - option "Bars"
              - option "Spotlight"
    - iframe [ref=e114]:

```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | import path from 'node:path';
  3   | import { installRecoveryBackend, seededRun, RUN_ID } from './fixtures/oneshotRecovery.js';
  4   |
  5   | const QA = path.resolve(process.env.COMPANION_QA_DIR || 'assets/3d-lab/grifon-companion-chat/qa');
  6   | test.use({ serviceWorkers: 'block' });
  7   | const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9X8AAAAASUVORK5CYII=', 'base64');
  8   | const answers = ['Cold brew for busy parents. Promote our new bottle.', 'North Coffee', 'Morning brew', 'Two bottles for 199', '199'];
  9   | const composer = (page: Page) => page.getByRole('textbox', { name: 'Message Grifon' });
  10  | const snapshot = (page: Page) => page.evaluate(() => (window as any).companionFixture.snapshot());
  11  | const emit = (page: Page, event: string) => page.evaluate(value => (window as any).companionFixture.emit(value), event);
  12  |
  13  | async function openFixture(page: Page) {
  14  |   const unexpected: string[] = [];
  15  |   const errors: string[] = [];
  16  |   page.on('pageerror', error => errors.push(error.message));
  17  |   page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  18  |   await page.route('**/*', route => {
  19  |     const req = route.request(); const url = new URL(req.url());
  20  |     if (req.method() === 'GET' && ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
  21  |     if (url.pathname === '/__companion_fixture/video.webm') return route.fulfill({ contentType: 'video/webm', path: 'tests/e2e/fixtures/recovery.webm' });
  22  |     if (!['http://127.0.0.1:5173', 'http://localhost:5173'].includes(url.origin) || (url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/_lib/'))) {
  23  |       unexpected.push(`${req.method()} ${url.origin}${url.pathname}`);
  24  |       return route.abort('blockedbyclient');
  25  |     }
  26  |     return route.fallback();
  27  |   });
  28  |   await page.goto('/companion-chat-preview.html');
  29  |   await expect(composer(page)).toBeVisible();
  30  |   await expect(page.locator('#companion-save-status')).toBeVisible();
  31  |   await expect(page.locator('#companion-save-status')).toContainText('Preview · simulated output');
  32  |   return { unexpected, errors };
  33  | }
  34  |
  35  | async function brief(page: Page, expectGenerate = true) {
  36  |   for (const answer of answers) {
  37  |     await composer(page).fill(answer);
  38  |     await page.getByRole('button', { name: 'Send', exact: true }).click();
  39  |     await expect(page.getByRole('status', { name: 'Grifon is typing', exact: true })).toHaveCount(0);
  40  |   }
  41  |   await page.getByLabel('Product photo', { exact: true }).setInputFiles({ name: 'coffee.png', mimeType: 'image/png', buffer: PNG });
  42  |   if (expectGenerate) await expect(page.getByRole('button', { name: 'Generate storyboard', exact: true })).toBeEnabled();
  43  | }
  44  |
  45  | test('brief, explicit start, truthful callbacks, storyboard approval, video and supported revisions', async ({ page }) => {
  46  |   const evidence = await openFixture(page);
  47  |   await brief(page);
  48  |   expect((await snapshot(page)).calls.filter((c: any) => c.name === 'start')).toHaveLength(0);
  49  |   await page.getByRole('button', { name: 'Generate storyboard', exact: true }).dblclick();
  50  |   expect((await snapshot(page)).calls.filter((c: any) => c.name === 'start')).toHaveLength(1);
  51  |   await expect(page.getByTestId('companion-chat')).toHaveAttribute('data-companion-state', 'working');
  52  |   await emit(page, 'script');
  53  |   await expect(page.getByText(/writing your script/i).first()).toBeVisible();
  54  |   await expect(page.locator('video')).toHaveCount(0);
  55  |   await emit(page, 'storyboard');
  56  |   await page.getByRole('button', { name: 'Open storyboard', exact: true }).click();
  57  |   await expect(page.getByRole('button', { name: /approve storyboard/i })).toBeVisible();
  58  |   expect((await snapshot(page)).calls.filter((c: any) => c.name === 'approve')).toHaveLength(0);
  59  |   await page.getByRole('button', { name: /approve storyboard/i }).click();
  60  |   expect((await snapshot(page)).calls.filter((c: any) => c.name === 'approve')).toHaveLength(1);
  61  |   await emit(page, 'result');
  62  |   await expect(page.locator('video')).toBeVisible();
  63  |   await expect(page.getByTestId('companion-chat')).toHaveAttribute('data-companion-state', 'ready');
  64  |   await composer(page).fill('Reshoot scene 1'); await page.getByRole('button', { name: 'Send', exact: true }).click();
  65  |   expect((await snapshot(page)).calls.filter((c: any) => c.name === 'reshoot')).toHaveLength(0);
  66  |   await page.getByRole('button', { name: 'Confirm reshoot', exact: true }).click();
> 67  |   expect((await snapshot(page)).calls).toContainEqual({ name: 'reshoot', value: 0 });
      |                                        ^ Error: expect(received).toContainEqual(expected) // deep equality
  68  |   await composer(page).fill('style clean'); await page.getByRole('button', { name: 'Send', exact: true }).click();
  69  |   expect((await snapshot(page)).calls.filter((c: any) => c.name === 'choosePreset')).toHaveLength(0);
  70  |   await page.getByRole('button', { name: 'Apply style', exact: true }).click();
  71  |   expect((await snapshot(page)).calls).toContainEqual({ name: 'choosePreset', value: 'clean' });
  72  |   const before = (await snapshot(page)).calls.length;
  73  |   await composer(page).fill('Make it magically viral'); await page.getByRole('button', { name: 'Send', exact: true }).click();
  74  |   expect((await snapshot(page)).calls.length).toBe(before);
  75  |   expect(evidence.unexpected).toEqual([]); expect(evidence.errors).toEqual([]);
  76  | });
  77  |
  78  | test('IME Enter does not submit; invalid files and missing image cannot generate', async ({ page }) => {
  79  |   await openFixture(page);
  80  |   await composer(page).fill('Unfinished composition');
  81  |   await composer(page).dispatchEvent('compositionstart');
  82  |   await composer(page).dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true });
  83  |   expect(await composer(page).inputValue()).toBe('Unfinished composition');
  84  |   await composer(page).dispatchEvent('compositionend');
  85  |   await expect(composer(page)).toBeFocused();
  86  |   await page.getByLabel('Product photo', { exact: true }).setInputFiles({ name: 'script.html', mimeType: 'text/html', buffer: Buffer.from('<h1>invalid</h1>') });
  87  |   await expect(page.getByText(/png|jpeg|webp|image file/i).last()).toBeVisible();
  88  |   expect((await snapshot(page)).calls.filter((c: any) => c.name === 'start')).toHaveLength(0);
  89  | });
  90  |
  91  | test('draft reload/account isolation, error retry and fixture checkpoint restore', async ({ page }) => {
  92  |   await openFixture(page); await brief(page);
  93  |   await page.reload(); await expect(page.getByRole('button', { name: 'Generate storyboard', exact: true })).toBeEnabled();
  94  |   await page.evaluate(() => (window as any).companionFixture.account('fixture-user-b'));
  95  |   await expect(page.getByText('North Coffee', { exact: true })).toHaveCount(0);
  96  |   await page.evaluate(() => (window as any).companionFixture.account('fixture-user-a'));
  97  |   await expect(page.getByRole('button', { name: 'Generate storyboard', exact: true })).toBeEnabled();
  98  |   await page.getByRole('button', { name: 'Generate storyboard', exact: true }).click();
  99  |   await emit(page, 'error');
  100 |   await page.getByRole('button', { name: 'Resume saved progress', exact: true }).click();
  101 |   expect((await snapshot(page)).calls).toContainEqual({ name: 'retry' });
  102 |   await emit(page, 'storyboard'); await page.reload();
  103 |   await page.getByRole('button', { name: 'Open storyboard', exact: true }).click();
  104 |   await expect(page.getByRole('button', { name: /approve storyboard/i })).toBeVisible();
  105 |   expect((await snapshot(page)).calls.filter((c: any) => c.name === 'start')).toHaveLength(0);
  106 | });
  107 |
  108 | for (const width of [320, 375, 390, 1280]) {
  109 |   test(`${width}px layout and real avatar bridge`, async ({ page }) => {
  110 |     await page.setViewportSize({ width, height: width === 1280 ? 900 : width === 375 ? 667 : 844 });
  111 |     const evidence = await openFixture(page);
  112 |     await expect(page.locator('iframe[title="Grifon animated companion"]:visible')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
  113 |     await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  114 |     const small = await page.locator('button:visible').evaluateAll(buttons => buttons.filter(button => {
  115 |       const b = button.getBoundingClientRect(); return b.width < 43.5 || b.height < 43.5;
  116 |     }).map(button => ({ text: button.getAttribute('aria-label') || button.textContent, width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })));
  117 |     expect(small).toEqual([]);
  118 |     await page.screenshot({ path: `${QA}/initial-${width}.png`, fullPage: true });
  119 |     await brief(page);
  120 |     await page.getByRole('button', { name: 'Generate storyboard', exact: true }).click();
  121 |     const frame = await (await page.locator('iframe:visible').elementHandle())!.contentFrame();
  122 |     await expect.poll(() => frame!.evaluate(() => (window as any).grifonDebug.snapshot().reaction.state)).toBe('working');
  123 |     await expect(page.getByRole('button', { name: /^(Pause|Resume) companion motion$/ })).toHaveCount(0);
  124 |     const animated = await frame!.evaluate(() => (window as any).grifonDebug.snapshot());
  125 |     await expect.poll(() => frame!.evaluate(() => (window as any).grifonDebug.snapshot().frameCount)).toBeGreaterThan(animated.frameCount);
  126 |     const avatarElement = await page.locator('iframe:visible').elementHandle();
  127 |     await page.setViewportSize({ width: width === 1280 ? 390 : 1280, height: 900 });
  128 |     expect(await avatarElement!.evaluate(element => element.isConnected)).toBe(true);
  129 |     await expect.poll(() => frame!.evaluate(() => (window as any).grifonDebug.snapshot().reaction.state)).toBe('working');
  130 |     expect(evidence.unexpected).toEqual([]); expect(evidence.errors).toEqual([]);
  131 |   });
  132 | }
  133 |
  134 | test('reduced motion stays static and companion failure leaves usable chat', async ({ page }) => {
  135 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  136 |   await openFixture(page);
  137 |   await expect(page.locator('iframe:visible')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
  138 |   const frame = (await (await page.locator('iframe:visible').elementHandle())!.contentFrame())!;
  139 |   const pose = await frame.evaluate(() => (window as any).grifonDebug.snapshot().controls);
  140 |   await page.waitForTimeout(350);
  141 |   expect(await frame.evaluate(() => (window as any).grifonDebug.snapshot().controls)).toEqual(pose);
  142 |   await frame.evaluate(() => { const gl = document.querySelector('canvas')!.getContext('webgl2')!; gl.getExtension('WEBGL_lose_context')!.loseContext(); });
  143 |   await expect(page.getByRole('button', { name: 'Retry companion motion' })).toBeVisible();
  144 |   await composer(page).fill('Chat still works'); await page.getByRole('button', { name: 'Send', exact: true }).click();
  145 |   await expect(page.getByTestId('conversation-scroll').getByText('Chat still works', { exact: true })).toBeVisible();
  146 | });
  147 |
  148 | test('actual App and ProducerFlow restore the same account run without generation', async ({ page }) => {
  149 |   const backend = await installRecoveryBackend(page, seededRun('storyboard'));
  150 |   await page.addInitScript(id => localStorage.setItem('osa_producer_companion:recovery-user', id), RUN_ID);
  151 |   await page.goto('http://localhost:5173/app?experience=companion');
  152 |   await page.getByRole('button', { name: 'Open storyboard', exact: true }).click();
  153 |   await expect(page.getByRole('button', { name: /approve storyboard/i })).toBeVisible({ timeout: 30_000 });
  154 |   await expect(page.getByRole('button', { name: /approve storyboard/i })).toBeDisabled();
  155 |   await page.reload();
  156 |   await page.getByRole('button', { name: 'Open storyboard', exact: true }).click();
  157 |   await expect(page.getByRole('button', { name: /approve storyboard/i })).toBeVisible();
  158 |   expect(new Set(backend.reads)).toEqual(new Set([RUN_ID]));
  159 |   expect(backend.submissions).toHaveLength(0); expect(backend.finalStarts).toHaveLength(0);
  160 |   expect(backend.unexpected).toEqual([]);
  161 | });
  162 |
  163 | test('actual ProducerFlow prevents duplicate starts and ignores research completing after cancellation', async ({ page }) => {
  164 |   const backend = await installRecoveryBackend(page);
  165 |   await page.route(/\/services\/geminiService\.ts(?:\?.*)?$/, route => {
  166 |     if (route.request().url().includes('companion-original')) return route.fallback();
  167 |     return route.fulfill({ contentType: 'application/javascript', body: `
```
