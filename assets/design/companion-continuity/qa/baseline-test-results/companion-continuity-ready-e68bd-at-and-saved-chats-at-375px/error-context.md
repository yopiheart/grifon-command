# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: companion-continuity.spec.ts >> ready renderer continuity across New chat and saved chats at 375px
- Location: tests\e2e\companion-continuity.spec.ts:104:3

# Error details

```
Error: New chat: preserve iframe DOM identity

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

```
Error: New chat: preserve live window identity

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

```
Error: New chat: preserve live canvas identity

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

```
Error: Open Coffee saved chat: preserve iframe DOM identity

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

```
Error: Open Coffee saved chat: preserve live window identity

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

```
Error: Open Coffee saved chat: preserve live canvas identity

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

```
Error: Open Tea saved chat: preserve iframe DOM identity

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

```
Error: Open Tea saved chat: preserve live window identity

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

```
Error: Open Tea saved chat: preserve live canvas identity

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

```
Error: Open Coffee saved chat: preserve iframe DOM identity

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

```
Error: Open Coffee saved chat: preserve live window identity

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

```
Error: Open Coffee saved chat: preserve live canvas identity

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

```
Error: Open Tea saved chat: preserve iframe DOM identity

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

```
Error: Open Tea saved chat: preserve live window identity

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

```
Error: Open Tea saved chat: preserve live canvas identity

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

```
Error: Tea storyboard review: preserve iframe DOM identity

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

```
Error: Tea storyboard review: preserve live window identity

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

```
Error: Tea storyboard review: preserve live canvas identity

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

```
Error: Return Coffee without Tea production: preserve iframe DOM identity

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

```
Error: Return Coffee without Tea production: preserve live window identity

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

```
Error: Return Coffee without Tea production: preserve live canvas identity

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

```
Error: chat switches must not reload renderer resources

expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 74

- Array []
+ Array [
+   "/companion/frame.html",
+   "/companion/neutral.png",
+   "/companion/bridge.js",
+   "/companion/main.js",
+   "/companion/reactions.js",
+   "/companion/vendor/three.module.js",
+   "/companion/vendor/three.core.js",
+   "/companion/scene.json",
+   "/companion/scene.bin",
+   "/companion/baked-skin.png",
+   "/companion/baked-hero.png",
+   "/companion/baked-body-clean.png",
+   "/companion/frame.html",
+   "/companion/neutral.png",
+   "/companion/bridge.js",
+   "/companion/main.js",
+   "/companion/reactions.js",
+   "/companion/vendor/three.module.js",
+   "/companion/vendor/three.core.js",
+   "/companion/scene.json",
+   "/companion/scene.bin",
+   "/companion/baked-skin.png",
+   "/companion/baked-hero.png",
+   "/companion/baked-body-clean.png",
+   "/companion/frame.html",
+   "/companion/neutral.png",
+   "/companion/bridge.js",
+   "/companion/main.js",
+   "/companion/reactions.js",
+   "/companion/vendor/three.module.js",
+   "/companion/vendor/three.core.js",
+   "/companion/scene.json",
+   "/companion/scene.bin",
+   "/companion/baked-skin.png",
+   "/companion/baked-hero.png",
+   "/companion/baked-body-clean.png",
+   "/companion/frame.html",
+   "/companion/neutral.png",
+   "/companion/bridge.js",
+   "/companion/main.js",
+   "/companion/reactions.js",
+   "/companion/vendor/three.module.js",
+   "/companion/vendor/three.core.js",
+   "/companion/scene.json",
+   "/companion/scene.bin",
+   "/companion/baked-skin.png",
+   "/companion/baked-hero.png",
+   "/companion/baked-body-clean.png",
+   "/companion/frame.html",
+   "/companion/neutral.png",
+   "/companion/bridge.js",
+   "/companion/main.js",
+   "/companion/reactions.js",
+   "/companion/vendor/three.module.js",
+   "/companion/vendor/three.core.js",
+   "/companion/scene.json",
+   "/companion/scene.bin",
+   "/companion/baked-skin.png",
+   "/companion/baked-hero.png",
+   "/companion/baked-body-clean.png",
+   "/companion/frame.html",
+   "/companion/neutral.png",
+   "/companion/bridge.js",
+   "/companion/main.js",
+   "/companion/reactions.js",
+   "/companion/vendor/three.module.js",
+   "/companion/vendor/three.core.js",
+   "/companion/scene.json",
+   "/companion/scene.bin",
+   "/companion/baked-skin.png",
+   "/companion/baked-hero.png",
+   "/companion/baked-body-clean.png",
+ ]
```

```
Error: no remount or neutral fallback insertion after initial ready

expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 92

- Array []
+ Array [
+   Object {
+     "at": 2920.300000011921,
+     "ready": "true",
+     "type": "iframe-removed",
+   },
+   Object {
+     "at": 2920.300000011921,
+     "ready": null,
+     "type": "iframe-added",
+   },
+   Object {
+     "at": 2920.300000011921,
+     "ready": null,
+     "type": "fallback-added",
+   },
+   Object {
+     "at": 4460.70000000298,
+     "ready": "true",
+     "type": "iframe-removed",
+   },
+   Object {
+     "at": 4460.70000000298,
+     "ready": null,
+     "type": "iframe-added",
+   },
+   Object {
+     "at": 4460.70000000298,
+     "ready": null,
+     "type": "fallback-added",
+   },
+   Object {
+     "at": 5502.5,
+     "ready": "true",
+     "type": "iframe-removed",
+   },
+   Object {
+     "at": 5502.5,
+     "ready": null,
+     "type": "iframe-added",
+   },
+   Object {
+     "at": 5502.5,
+     "ready": null,
+     "type": "fallback-added",
+   },
+   Object {
+     "at": 6608.800000011921,
+     "ready": "true",
+     "type": "iframe-removed",
+   },
+   Object {
+     "at": 6608.800000011921,
+     "ready": null,
+     "type": "iframe-added",
+   },
+   Object {
+     "at": 6608.800000011921,
+     "ready": null,
+     "type": "fallback-added",
+   },
+   Object {
+     "at": 7264.4000000059605,
+     "ready": "true",
+     "type": "iframe-removed",
+   },
+   Object {
+     "at": 7264.4000000059605,
+     "ready": null,
+     "type": "iframe-added",
+   },
+   Object {
+     "at": 7264.4000000059605,
+     "ready": null,
+     "type": "fallback-added",
+   },
+   Object {
+     "at": 8048.9000000059605,
+     "ready": "true",
+     "type": "iframe-removed",
+   },
+   Object {
+     "at": 8048.9000000059605,
+     "ready": null,
+     "type": "iframe-added",
+   },
+   Object {
+     "at": 8048.9000000059605,
+     "ready": null,
+     "type": "fallback-added",
+   },
+ ]
```

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 92
Received:   45
```

# Page snapshot

```yaml
- generic [ref=e5]:
  - group [ref=e6]:
    - generic "Local test fixture · mocked generation · no provider calls" [ref=e7] [cursor=pointer]
  - region "Conversation with Grifon" [ref=e10]:
    - generic:
      - button "Open conversations" [ref=e12] [cursor=pointer]:
        - img [ref=e13]
      - button "New chat" [ref=e16] [cursor=pointer]:
        - img [ref=e17]
      - generic:
        - iframe [ref=e18]:

        - generic:
          - heading "Grifon" [level=1]
    - generic [ref=e21]:
      - paragraph [ref=e22]:
        - time [ref=e23]: Oct 7 · 12:21 PM
      - article [ref=e24]:
        - paragraph [ref=e25]: What product are we making an ad for? Tell me about your audience and what you want the ad to achieve.
      - article [ref=e26]:
        - paragraph [ref=e27]: Coffee continuity project
        - paragraph [ref=e28]:
          - time [ref=e29]: 12:21 PM
          - text: · Received
      - article [ref=e30]:
        - paragraph [ref=e31]: What is the brand name? I will keep its exact spelling.
    - generic [ref=e32]:
      - generic [ref=e33]:
        - button "Attach product photo" [ref=e34] [cursor=pointer]:
          - img [ref=e35]
        - textbox "Message Grifon" [active] [ref=e36]:
          - /placeholder: Tell Grifon…
          - text: Coffee unsent draft
        - button "Start voice input" [ref=e37] [cursor=pointer]:
          - img [ref=e38]
        - button "Send" [ref=e41] [cursor=pointer]:
          - img [ref=e42]
      - paragraph [ref=e44]: Voice input uses your browser and may be processed online. Review before sending.
      - paragraph [ref=e45]: Draft saved on this device. No generation starts until you confirm.
```

# Test source

```ts
  50  |   });
  51  |   fs.mkdirSync(QA, { recursive: true });
  52  |   return { requests, rejected };
  53  | }
  54  |
  55  | async function load(page: Page) {
  56  |   await page.goto('/companion-chat-preview.html'); await expect(input(page)).toBeVisible();
  57  | }
  58  | async function ready(page: Page) { await expect(page.locator(FRAME)).toHaveAttribute('data-ready', 'true', { timeout: 30_000 }); }
  59  | async function capture(page: Page, name: string, data: unknown) {
  60  |   fs.writeFileSync(path.join(QA, `${phase}-${name}.json`), JSON.stringify(data, null, 2));
  61  |   await page.screenshot({ path: path.join(QA, `${phase}-${name}.png`), fullPage: true });
  62  | }
  63  | async function markReadyRenderer(page: Page) {
  64  |   await page.evaluate(() => {
  65  |     const evidence = (window as any).continuityEvidence;
  66  |     const iframe = document.querySelector('iframe[title="Grifon animated companion"]') as HTMLIFrameElement;
  67  |     evidence.reference = { iframe, window: iframe.contentWindow, canvas: iframe.contentDocument!.querySelector('canvas') };
  68  |     evidence.events.length = 0;
  69  |   });
  70  | }
  71  | async function observation(page: Page) {
  72  |   return page.evaluate(() => {
  73  |     const ledger = (window as any).continuityEvidence;
  74  |     const iframe = document.querySelector('iframe[title="Grifon animated companion"]') as HTMLIFrameElement | null;
  75  |     const canvas = iframe?.contentDocument?.querySelector('canvas');
  76  |     const debug = (iframe?.contentWindow as any)?.grifonDebug?.snapshot();
  77  |     return {
  78  |       sameIframe: !!iframe && iframe === ledger.reference?.iframe,
  79  |       sameWindow: !!iframe && iframe.contentWindow === ledger.reference?.window,
  80  |       sameCanvas: !!canvas && canvas === ledger.reference?.canvas,
  81  |       originalIframeConnected: ledger.reference?.iframe.isConnected ?? null,
  82  |       originalCanvasConnected: ledger.reference?.canvas?.isConnected ?? null,
  83  |       iframeCount: document.querySelectorAll('iframe[title="Grifon animated companion"]').length,
  84  |       fallbackCount: document.querySelectorAll('img[src$="/companion/neutral.png"]').length,
  85  |       ready: iframe?.getAttribute('data-ready'),
  86  |       reaction: debug?.reaction.state, frameCount: debug?.frameCount,
  87  |       hostReaction: iframe?.parentElement?.getAttribute('data-companion-state'),
  88  |       events: [...ledger.events],
  89  |     };
  90  |   });
  91  | }
  92  | async function send(page: Page, text: string) {
  93  |   await input(page).fill(text); await input(page).press('Enter');
  94  |   await expect(page.getByRole('status', { name: 'Grifon is typing', exact: true })).toHaveCount(0);
  95  | }
  96  | async function openChat(page: Page, id: string) {
  97  |   const navigation = page.getByRole('navigation', { name: 'Conversations', exact: true });
  98  |   if (!await navigation.isVisible()) await page.getByRole('button', { name: 'Open conversations', exact: true }).click();
  99  |   await navigation.locator(`[data-chat-id="${id}"]`).click();
  100 |   await expect(page.getByTestId('companion-chat')).toHaveAttribute('data-chat-id', id);
  101 | }
  102 |
  103 | for (const width of [375, 390, 1280]) {
  104 |   test(`ready renderer continuity across New chat and saved chats at ${width}px`, async ({ page }) => {
  105 |     const network = await configure(page, width); await load(page); await ready(page);
  106 |     await send(page, 'Coffee continuity project'); const firstId = (await currentId(page))!;
  107 |     await input(page).fill('Coffee unsent draft');
  108 |     await expect.poll(() => page.evaluate(() => ((document.querySelector('iframe[title="Grifon animated companion"]') as HTMLIFrameElement)?.contentWindow as any)?.grifonDebug.snapshot().reaction.state)).toBe('reading');
  109 |     await markReadyRenderer(page); const requestStart = network.requests.length;
  110 |     const snapshots: any[] = [{ action: 'initial ready', ...(await observation(page)) }];
  111 |     await page.getByRole('button', { name: 'New chat', exact: true }).click();
  112 |     await expect(page.getByTestId('companion-chat')).not.toHaveAttribute('data-chat-id', firstId);
  113 |     const secondId = (await currentId(page))!;
  114 |     await ready(page); await expect(input(page)).toHaveValue('');
  115 |     await expect(page.locator('.companion-message-user')).toHaveCount(0);
  116 |     snapshots.push({ action: 'New chat', ...(await observation(page)) });
  117 |     await send(page, 'Tea continuity project'); await input(page).fill('Tea unsent draft');
  118 |     for (const [id, draft, userMessage] of [[firstId, 'Coffee unsent draft', 'Coffee continuity project'], [secondId, 'Tea unsent draft', 'Tea continuity project'], [firstId, 'Coffee unsent draft', 'Coffee continuity project'], [secondId, 'Tea unsent draft', 'Tea continuity project']]) {
  119 |       await openChat(page, id); await ready(page);
  120 |       await expect(input(page)).toHaveValue(draft); await expect(page.locator('.companion-message-user')).toHaveText(userMessage);
  121 |       await expect.poll(async () => (await observation(page)).reaction).toBe('reading');
  122 |       snapshots.push({ action: `Open ${id === firstId ? 'Coffee' : 'Tea'} saved chat`, ...(await observation(page)) });
  123 |     }
  124 |     // Mocked production affects only the active leaf. It never starts a provider.
  125 |     await page.evaluate(() => (window as any).companionFixture.emit('storyboard'));
  126 |     await expect.poll(async () => (await observation(page)).reaction).toBe('ready');
  127 |     snapshots.push({ action: 'Tea storyboard review', ...(await observation(page)) });
  128 |     await openChat(page, firstId); await ready(page);
  129 |     await expect(input(page)).toHaveValue('Coffee unsent draft');
  130 |     await expect(page.getByRole('button', { name: 'Open storyboard', exact: true })).toHaveCount(0);
  131 |     await expect.poll(async () => (await observation(page)).reaction).toBe('reading');
  132 |     snapshots.push({ action: 'Return Coffee without Tea production', ...(await observation(page)) });
  133 |     const frame = (await (await page.locator(FRAME).elementHandle())!.contentFrame())!;
  134 |     await page.mouse.move(5, 350); await expect.poll(() => frame.evaluate(() => (window as any).grifonDebug.snapshot().controls.gazeX)).toBeLessThan(0);
  135 |     const left = await frame.evaluate(() => (window as any).grifonDebug.snapshot().controls.gazeX);
  136 |     await page.mouse.move(width - 5, 350);
  137 |     await expect.poll(() => frame.evaluate(previous => (window as any).grifonDebug.snapshot().controls.gazeX - previous, left)).toBeGreaterThan(.1);
  138 |     const final = await observation(page), warmRequests = network.requests.slice(requestStart);
  139 |     const calls = await page.evaluate(() => (window as any).companionFixture.snapshot().calls);
  140 |     await capture(page, `switches-${width}`, { snapshots, final, warmRequests, rejected: network.rejected, calls });
  141 |     for (const snapshot of snapshots) {
  142 |       expect.soft(snapshot.sameIframe, `${snapshot.action}: preserve iframe DOM identity`).toBe(true);
  143 |       expect.soft(snapshot.sameWindow, `${snapshot.action}: preserve live window identity`).toBe(true);
  144 |       expect.soft(snapshot.sameCanvas, `${snapshot.action}: preserve live canvas identity`).toBe(true);
  145 |       expect.soft(snapshot.iframeCount).toBe(1); expect.soft(snapshot.fallbackCount).toBe(0);
  146 |     }
  147 |     expect.soft(warmRequests, 'chat switches must not reload renderer resources').toEqual([]);
  148 |     expect.soft(final.events.filter(event => ['iframe-added', 'iframe-removed', 'fallback-added'].includes(event.type)), 'no remount or neutral fallback insertion after initial ready').toEqual([]);
  149 |     expect.soft(final.events.filter(event => event.type === 'ready-change' && event.ready !== 'true'), 'ready must never reset for ordinary chat switches').toEqual([]);
> 150 |     expect(final.frameCount).toBeGreaterThan(snapshots[0].frameCount);
      |                              ^ Error: expect(received).toBeGreaterThan(expected)
  151 |     expect(calls).toEqual([]); expect(network.rejected).toEqual([]);
  152 |   });
  153 | }
  154 |
  155 | test('honest cold-load fallback remains until ready while chat works', async ({ page }) => {
  156 |   const network = await configure(page, 375); let release!: () => void;
  157 |   const held = new Promise<void>(resolve => { release = resolve; });
  158 |   await page.route('**/companion/scene.bin', async route => { await held; await route.continue(); });
  159 |   try {
  160 |     await load(page); await expect(page.locator(FALLBACK)).toBeVisible();
  161 |     await expect(page.locator(FRAME)).not.toHaveAttribute('data-ready', 'true');
  162 |     await send(page, 'Typing while the companion loads');
  163 |     await expect(page.locator('.companion-message-user')).toHaveText('Typing while the companion loads');
  164 |     await capture(page, 'cold-loading', { fallbackCount: await page.locator(FALLBACK).count(), requests: network.requests });
  165 |   } finally { release(); }
  166 |   await ready(page); await expect(page.locator(FALLBACK)).toHaveCount(0);
  167 |   await capture(page, 'cold-ready', { requests: network.requests, rejected: network.rejected });
  168 |   expect(await page.evaluate(() => (window as any).companionFixture.snapshot().calls)).toEqual([]);
  169 |   expect(network.rejected).toEqual([]);
  170 | });
  171 |
  172 | test('real asset failure keeps an honest still fallback and explicit retry restores motion', async ({ page }) => {
  173 |   const network = await configure(page, 390); let fail = true;
  174 |   await page.route('**/companion/scene.bin', route => fail ? route.fulfill({ status: 503, body: 'Fixture asset failure' }) : route.continue());
  175 |   await load(page); const retry = page.getByRole('button', { name: 'Retry companion motion', exact: true });
  176 |   await expect(retry).toBeVisible(); await expect(page.locator(FALLBACK)).toBeVisible();
  177 |   await expect(page.getByRole('status').filter({ hasText: 'Companion shown as a still image. Chat is available.' })).toBeVisible();
  178 |   await send(page, 'Chat remains available after an asset failure');
  179 |   await capture(page, 'failed-fallback', { requests: network.requests, fallbackCount: await page.locator(FALLBACK).count() });
  180 |   fail = false; await retry.click(); await ready(page);
  181 |   await expect(page.locator(FALLBACK)).toHaveCount(0); await expect(retry).toHaveCount(0);
  182 |   await expect(page.locator('.companion-message-user')).toHaveText('Chat remains available after an asset failure');
  183 |   await capture(page, 'retry-ready', { requests: network.requests, rejected: network.rejected });
  184 |   expect(network.requests.filter(value => value === '/companion/scene.bin').length).toBe(2);
  185 |   expect(network.rejected).toEqual([]);
  186 | });
  187 |
```