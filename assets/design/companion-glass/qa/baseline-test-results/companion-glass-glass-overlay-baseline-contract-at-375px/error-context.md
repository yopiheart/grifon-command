# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: companion-glass.spec.ts >> glass overlay baseline contract at 375px
- Location: tests\e2e\companion-glass.spec.ts:105:3

# Error details

```
Error: ordinary floating header has no opaque fill

expect(received).toMatch(expected)

Expected pattern: /rgba\([^)]*,\s*0\)|transparent/
Received string:  "rgb(9, 9, 11)"
```

```
Error: conversation scroll area extends beneath the mascot

expect(received).toBeLessThan(expected)

Expected: < 105
Received:   141
```

# Page snapshot

```yaml
- generic [ref=e5]:
  - group [ref=e6]:
    - generic "Local test fixture · mocked generation · no provider calls" [ref=e7] [cursor=pointer]
  - generic [ref=e8]:
    - banner [ref=e9]:
      - button "Open conversations" [ref=e11] [cursor=pointer]:
        - img [ref=e12]
      - button "New chat" [ref=e15] [cursor=pointer]:
        - img [ref=e16]
      - generic [ref=e17]:
        - iframe [ref=e19]:

        - heading "Grifon" [level=1] [ref=e20]
    - region "Conversation with Grifon" [ref=e22]:
      - generic [ref=e25]:
        - paragraph [ref=e26]:
          - time [ref=e27]: Jan 1 · 8:00 AM
        - article [ref=e28]:
          - paragraph [ref=e29]: History message 0. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e30]:
          - paragraph [ref=e31]: History message 1. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e32]:
          - paragraph [ref=e33]: History message 2. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e34]:
          - paragraph [ref=e35]: History message 3. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e36]:
          - paragraph [ref=e37]: History message 4. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e38]:
          - paragraph [ref=e39]: History message 5. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e40]:
          - paragraph [ref=e41]: History message 6. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e42]:
          - paragraph [ref=e43]: History message 7. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e44]:
          - paragraph [ref=e45]: History message 8. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e46]:
          - paragraph [ref=e47]: History message 9. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e48]:
          - paragraph [ref=e49]: History message 10. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e50]:
          - paragraph [ref=e51]: History message 11. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e52]:
          - paragraph [ref=e53]: History message 12. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e54]:
          - paragraph [ref=e55]: History message 13. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e56]:
          - paragraph [ref=e57]: History message 14. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e58]:
          - paragraph [ref=e59]: History message 15. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e60]:
          - paragraph [ref=e61]: History message 16. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e62]:
          - paragraph [ref=e63]: History message 17. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e64]:
          - paragraph [ref=e65]: History message 18. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e66]:
          - paragraph [ref=e67]: History message 19. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e68]:
          - paragraph [ref=e69]: History message 20. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e70]:
          - paragraph [ref=e71]: History message 21. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e72]:
          - paragraph [ref=e73]: History message 22. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e74]:
          - paragraph [ref=e75]: History message 23. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e76]:
          - paragraph [ref=e77]: History message 24. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e78]:
          - paragraph [ref=e79]: History message 25. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e80]:
          - paragraph [ref=e81]: History message 26. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e82]:
          - paragraph [ref=e83]: History message 27. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e84]:
          - paragraph [ref=e85]: History message 28. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e86]:
          - paragraph [ref=e87]: History message 29. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e88]:
          - paragraph [ref=e89]: History message 30. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e90]:
          - paragraph [ref=e91]: History message 31. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e92]:
          - paragraph [ref=e93]: History message 32. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e94]:
          - paragraph [ref=e95]: History message 33. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e96]:
          - paragraph [ref=e97]: History message 34. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e98]:
          - paragraph [ref=e99]: History message 35. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e100]:
          - paragraph [ref=e101]: History message 36. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e102]:
          - paragraph [ref=e103]: History message 37. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e104]:
          - paragraph [ref=e105]: History message 38. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e106]:
          - paragraph [ref=e107]: History message 39. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e108]:
          - paragraph [ref=e109]: History message 40. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e110]:
          - paragraph [ref=e111]: History message 41. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e112]:
          - paragraph [ref=e113]: History message 42. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e114]:
          - paragraph [ref=e115]: History message 43. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e116]:
          - paragraph [ref=e117]: History message 44. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e118]:
          - paragraph [ref=e119]: History message 45. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e120]:
          - paragraph [ref=e121]: History message 46. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e122]:
          - paragraph [ref=e123]: History message 47. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e124]:
          - paragraph [ref=e125]: History message 48. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e126]:
          - paragraph [ref=e127]: History message 49. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e128]:
          - paragraph [ref=e129]: History message 50. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e130]:
          - paragraph [ref=e131]: History message 51. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e132]:
          - paragraph [ref=e133]: History message 52. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e134]:
          - paragraph [ref=e135]: History message 53. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e136]:
          - paragraph [ref=e137]: History message 54. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e138]:
          - paragraph [ref=e139]: History message 55. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e140]:
          - paragraph [ref=e141]: History message 56. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e142]:
          - paragraph [ref=e143]: History message 57. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e144]:
          - paragraph [ref=e145]: History message 58. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - article [ref=e146]:
          - paragraph [ref=e147]: History message 59. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion. Readable conversation continues beneath the floating companion.
        - paragraph [ref=e148]:
          - time [ref=e149]: Oct 7 · 11:17 AM
        - article [ref=e150]:
          - paragraph [ref=e151]: Draft while reading history
          - paragraph [ref=e152]:
            - time [ref=e153]: 11:17 AM
            - text: · Received
        - article [ref=e154]:
          - paragraph [ref=e155]: What is the brand name? I will keep its exact spelling.
      - generic [ref=e157]:
        - generic [ref=e158]:
          - button "Attach product photo" [ref=e159] [cursor=pointer]:
            - img [ref=e160]
          - textbox "Message Grifon" [active] [ref=e162]:
            - /placeholder: Tell Grifon…
          - button "Send" [disabled] [ref=e163]:
            - img [ref=e164]
        - paragraph [ref=e166]: Draft saved on this device. No generation starts until you confirm.
```

# Test source

```ts
  14  |   await page.addInitScript(({ supported, prefixed }) => {
  15  |     const scope = window as any;
  16  |     delete scope.SpeechRecognition; delete scope.webkitSpeechRecognition;
  17  |     const sessions: any[] = [];
  18  |     class Recognition extends EventTarget {
  19  |       continuous = false; interimResults = false; lang = ''; maxAlternatives = 1;
  20  |       onstart: any = null; onresult: any = null; onerror: any = null; onend: any = null;
  21  |       starts = 0; stops = 0; aborts = 0; savedResult: any = null;
  22  |       constructor() { super(); sessions.push(this); }
  23  |       fire(type: string, data: Record<string, unknown> = {}) {
  24  |         const event = new Event(type); Object.assign(event, data);
  25  |         const callback = (this as any)[`on${type}`];
  26  |         if (type === 'result' && callback) this.savedResult = callback;
  27  |         callback?.(event); this.dispatchEvent(event);
  28  |       }
  29  |       start() { this.starts++; this.fire('start'); }
  30  |       stop() { this.stops++; }
  31  |       abort() { this.aborts++; this.fire('end'); }
  32  |       result(parts: { text: string; final: boolean }[], index = 0, late = false) {
  33  |         const results = parts.map(part => Object.assign([{ transcript: part.text, confidence: .9 }], { isFinal: part.final }));
  34  |         if (late && this.savedResult) {
  35  |           const event = new Event('result'); Object.assign(event, { results, resultIndex: index }); this.savedResult(event);
  36  |         } else this.fire('result', { results, resultIndex: index });
  37  |       }
  38  |     }
  39  |     if (supported) scope[prefixed ? 'webkitSpeechRecognition' : 'SpeechRecognition'] = Recognition;
  40  |     scope.speechFixture = {
  41  |       sessions,
  42  |       snapshot: () => sessions.map(s => ({ starts: s.starts, stops: s.stops, aborts: s.aborts, interimResults: s.interimResults })),
  43  |       result: (parts: { text: string; final: boolean }[], index = 0, session = sessions.length - 1, late = false) => sessions[session].result(parts, index, late),
  44  |       end: () => sessions.at(-1).fire('end'),
  45  |       error: (error: string) => sessions.at(-1).fire('error', { error }),
  46  |     };
  47  |   }, { supported, prefixed });
  48  | }
  49  |
  50  | async function openFixture(page: Page, width = 375, height = 667, supported = true, prefixed = false) {
  51  |   await page.setViewportSize({ width, height });
  52  |   await installSpeech(page, supported, prefixed);
  53  |   const rejected: string[] = [];
  54  |   await page.route('**/*', route => {
  55  |     const request = route.request(), url = new URL(request.url());
  56  |     if (request.method() === 'GET' && ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
  57  |     if (url.pathname === '/tests/fixtures/sample-batch/before_after-run1-complete-raw.mp4') return route.fulfill({ contentType: 'video/webm', path: 'tests/e2e/fixtures/recovery.webm' });
  58  |     if (!['http://127.0.0.1:5173', 'http://localhost:5173'].includes(url.origin) || url.pathname.startsWith('/api/')) {
  59  |       rejected.push(`${request.method()} ${url.origin}${url.pathname}`); return route.abort();
  60  |     }
  61  |     return route.continue();
  62  |   });
  63  |   await page.goto('/companion-chat-preview.html');
  64  |   await expect(input(page)).toBeVisible();
  65  |   await expect(page.locator('iframe[title="Grifon animated companion"]')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
  66  |   await expect.poll(() => page.getByText('Saving on this device…', { exact: true }).count()).toBe(0);
  67  |   fs.mkdirSync(QA, { recursive: true });
  68  |   return rejected;
  69  | }
  70  |
  71  | async function evidence(page: Page, name: string, data: unknown) {
  72  |   fs.writeFileSync(path.join(QA, `${phase}-${name}.json`), JSON.stringify(data, null, 2));
  73  |   await page.screenshot({ path: path.join(QA, `${phase}-${name}.png`), fullPage: true });
  74  | }
  75  | async function speechResult(page: Page, parts: { text: string; final: boolean }[], index = 0, session?: number, late = false) {
  76  |   await page.evaluate(args => (window as any).speechFixture.result(args.parts, args.index, args.session, args.late), { parts, index, session, late });
  77  | }
  78  | async function speechCounts(page: Page) { return page.evaluate(() => (window as any).speechFixture.snapshot()); }
  79  | async function send(page: Page, text: string) {
  80  |   await input(page).fill(text); await page.getByRole('button', { name: 'Send', exact: true }).click();
  81  |   await expect(page.getByRole('status', { name: 'Grifon is typing', exact: true })).toHaveCount(0);
  82  | }
  83  |
  84  | async function seedHistory(page: Page) {
  85  |   // Same persisted public fixture seam used by existing capped-transcript regression.
  86  |   await page.evaluate(async () => {
  87  |     const db = await new Promise<IDBDatabase>((resolve, reject) => {
  88  |       const request = indexedDB.open('grifon_companion', 1); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  89  |     });
  90  |     await new Promise<void>((resolve, reject) => {
  91  |       const tx = db.transaction('conversations', 'readwrite'), store = tx.objectStore('conversations'), request = store.get('fixture-user-a');
  92  |       request.onsuccess = () => {
  93  |         const book = request.result, chat = book.chats.find((item: any) => item.id === book.selectedId);
  94  |         chat.draft.messages = Array.from({ length: 60 }, (_, i) => ({ id: `glass-history-${i}`, role: i % 2 ? 'user' : 'assistant', text: `History message ${i}. ` + 'Readable conversation continues beneath the floating companion. '.repeat(3), at: 1 + i }));
  95  |         store.put(book, 'fixture-user-a');
  96  |       };
  97  |       tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  98  |     }); db.close();
  99  |   });
  100 |   await page.reload(); await expect(input(page)).toBeVisible();
  101 |   await expect(page.locator('iframe[title="Grifon animated companion"]')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
  102 | }
  103 |
  104 | for (const [width, height] of [[375, 667], [390, 844], [1280, 900], [320, 667]]) {
  105 |   test(`glass overlay${width === 375 ? ' baseline contract' : ''} at ${width}px`, async ({ page }) => {
  106 |     const rejected = await openFixture(page, width, height);
  107 |     const initial = await page.evaluate(() => {
  108 |       const header = document.querySelector('.companion-header')!, scroll = document.querySelector('[data-testid="conversation-scroll"]')!;
  109 |       const avatar = document.querySelector('iframe[title="Grifon animated companion"]')!, message = document.querySelector('.companion-message')!;
  110 |       return { header: header.getBoundingClientRect().toJSON(), transcript: scroll.getBoundingClientRect().toJSON(), avatar: avatar.getBoundingClientRect().toJSON(), first: message.getBoundingClientRect().toJSON(), background: getComputedStyle(header).backgroundColor, overflow: document.documentElement.scrollWidth - innerWidth };
  111 |     });
  112 |     await evidence(page, `initial-${width}`, initial);
  113 |     expect.soft(initial.background, 'ordinary floating header has no opaque fill').toMatch(/rgba\([^)]*,\s*0\)|transparent/);
> 114 |     expect.soft(initial.transcript.y, 'conversation scroll area extends beneath the mascot').toBeLessThan(initial.avatar.y + initial.avatar.height);
      |                                                                                              ^ Error: conversation scroll area extends beneath the mascot
  115 |     expect.soft(initial.first.y, 'initial message clears the floating header').toBeGreaterThanOrEqual(initial.header.y + initial.header.height - 1);
  116 |     expect(initial.overflow).toBeLessThanOrEqual(0);
  117 |     await seedHistory(page);
  118 |     const scroller = page.getByTestId('conversation-scroll');
  119 |     await scroller.evaluate(node => { node.scrollTop = node.scrollHeight * .45; node.dispatchEvent(new Event('scroll')); });
  120 |     const overlap = await page.evaluate(() => {
  121 |       const header = document.querySelector('.companion-header')!.getBoundingClientRect();
  122 |       const messages = Array.from(document.querySelectorAll('.companion-message')).map(node => ({ text: node.textContent, rect: node.getBoundingClientRect().toJSON() }));
  123 |       return { header: header.toJSON(), crossing: messages.filter(m => m.rect.y < header.bottom && m.rect.bottom > header.top), top: (document.querySelector('[data-testid="conversation-scroll"]') as HTMLElement).scrollTop };
  124 |     });
  125 |     await evidence(page, `history-overlap-${width}`, overlap);
  126 |     expect.soft(overlap.crossing.length, 'real persisted older messages pass beneath the floating header').toBeGreaterThan(0);
  127 |     const remembered = await scroller.evaluate(node => node.scrollTop);
  128 |     await input(page).fill('Draft while reading history');
  129 |     expect(await scroller.evaluate(node => node.scrollTop)).toBe(remembered);
  130 |     await page.getByRole('button', { name: 'Send', exact: true }).click();
  131 |     await expect(page.getByRole('status', { name: 'Grifon is typing', exact: true })).toHaveCount(0);
  132 |     await expect(page.locator('.companion-message-assistant').last()).toBeInViewport({ ratio: 1 });
  133 |     expect(rejected).toEqual([]);
  134 |   });
  135 | }
  136 |
  137 | test('mascot selection baseline contract preserves ordinary text selection', async ({ page }) => {
  138 |   await openFixture(page);
  139 |   const avatar = page.locator('[data-companion-state]').filter({ has: page.locator('iframe[title="Grifon animated companion"]') }).last();
  140 |   const box = (await page.locator('iframe[title="Grifon animated companion"]').boundingBox())!;
  141 |   await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
  142 |   const selection = await page.evaluate(() => {
  143 |     const frame = document.querySelector('iframe[title="Grifon animated companion"]')!, image = frame.parentElement!.querySelector('img');
  144 |     return { selected: getSelection()?.toString(), userSelect: getComputedStyle(frame.parentElement!).userSelect, draggable: image?.draggable ?? false };
  145 |   });
  146 |   await evidence(page, 'mascot-selection', selection);
  147 |   expect.soft(selection.userSelect, 'mascot cannot acquire a blue browser selection highlight').toBe('none');
  148 |   expect.soft(selection.draggable, 'mascot fallback cannot start native image dragging').toBe(false);
  149 |   expect(selection.selected).toBe('');
  150 |   await page.locator('.companion-message').first().dblclick();
  151 |   expect(await page.evaluate(() => getSelection()?.toString().trim().length || 0), 'conversation words remain selectable').toBeGreaterThan(0);
  152 |   await expect(avatar).toBeVisible();
  153 | });
  154 |
  155 | test('compact composer baseline contract grows and retains keyboard and Plus upload actions', async ({ page }) => {
  156 |   const rejected = await openFixture(page);
  157 |   const field = input(page), initial = (await field.boundingBox())!;
  158 |   const controls = await page.locator('.companion-composer button').evaluateAll(nodes => nodes.map(node => ({ label: node.getAttribute('aria-label'), rect: node.getBoundingClientRect().toJSON() })));
  159 |   await evidence(page, 'composer-empty', { input: initial, controls });
  160 |   expect.soft(initial.height, 'composer begins as one44px line').toBeGreaterThanOrEqual(43.5);
  161 |   expect.soft(initial.height, 'composer begins as one44px line').toBeLessThanOrEqual(45);
  162 |   for (const { rect } of controls) {
  163 |     expect.soft(rect.width).toBeGreaterThanOrEqual(43.5); expect.soft(rect.height).toBeGreaterThanOrEqual(43.5);
  164 |     expect.soft(Math.abs(rect.y + rect.height / 2 - initial.y - initial.height / 2), 'one-line control centers align').toBeLessThanOrEqual(2);
  165 |   }
  166 |   expect.soft(await page.getByRole('button', { name: 'Attach product photo', exact: true }).locator('svg').getAttribute('class'), 'attachment icon is Plus').toContain('lucide-plus');
  167 |   await field.fill('First line\nSecond line\nThird line');
  168 |   expect.soft((await field.boundingBox())!.height, 'multiline draft grows the composer').toBeGreaterThan(initial.height + 15);
  169 |   await field.fill('A typed draft'); await field.press('Shift+Enter');
  170 |   await expect(field).toHaveValue('A typed draft\n');
  171 |   await field.dispatchEvent('compositionstart'); await field.press('Enter');
  172 |   expect(await page.locator('.companion-message-user').count()).toBe(0);
  173 |   await field.dispatchEvent('compositionend'); await field.fill('A complete typed draft'); await field.press('Enter');
  174 |   await expect(page.locator('.companion-message-user')).toHaveText('A complete typed draft');
  175 |   await expect(field).toHaveValue(''); await expect(field).toBeFocused();
  176 |   await expect(page.getByRole('status', { name: 'Grifon is typing', exact: true })).toHaveCount(0);
  177 |   const chooser = page.waitForEvent('filechooser');
  178 |   await page.getByRole('button', { name: 'Attach product photo', exact: true }).click();
  179 |   await (await chooser).setFiles({ name: 'glass-product.png', mimeType: 'image/png', buffer: png });
  180 |   await expect(page.getByRole('img', { name: 'Attached product', exact: true })).toBeVisible();
  181 |   expect(await page.evaluate(() => (window as any).companionFixture.snapshot().calls)).toEqual([]);
  182 |   await evidence(page, 'composer-attachment', { input: await field.boundingBox(), rejected });
  183 |   expect(rejected).toEqual([]);
  184 | });
  185 |
  186 | test('voice baseline contract updates only the draft with indexed interim and final results', async ({ page }) => {
  187 |   await openFixture(page);
  188 |   expect((await speechCounts(page)).reduce((sum: number, s: any) => sum + s.starts, 0)).toBe(0);
  189 |   await input(page).fill('Keep existing text.');
  190 |   await expect(startVoice(page)).toBeVisible(); await startVoice(page).click();
  191 |   await expect(stopVoice(page)).toBeVisible();
  192 |   await speechResult(page, [{ text: 'Fresh co', final: false }]);
  193 |   await expect(input(page)).toHaveValue('Keep existing text. Fresh co');
  194 |   await speechResult(page, [{ text: 'Fresh coffee', final: false }]);
  195 |   await expect(input(page)).toHaveValue('Keep existing text. Fresh coffee');
  196 |   await speechResult(page, [{ text: 'Fresh coffee', final: true }, { text: 'for busy', final: false }], 0);
  197 |   await expect(input(page)).toHaveValue('Keep existing text. Fresh coffee for busy');
  198 |   await speechResult(page, [{ text: 'Fresh coffee', final: true }, { text: 'for busy parents.', final: true }], 1);
  199 |   await expect(input(page)).toHaveValue('Keep existing text. Fresh coffee for busy parents.');
  200 |   expect(await page.locator('.companion-message-user').count(), 'voice never auto-sends').toBe(0);
  201 |   await stopVoice(page).click();
  202 |   expect((await speechCounts(page))[0].stops).toBe(1);
  203 |   await page.evaluate(() => (window as any).speechFixture.end());
  204 |   await expect(startVoice(page)).toBeVisible();
  205 |   await speechResult(page, [{ text: 'Stale duplicate', final: true }], 0, 0, true);
  206 |   await expect(input(page)).toHaveValue('Keep existing text. Fresh coffee for busy parents.');
  207 |   await input(page).press('Enter');
  208 |   await expect(page.locator('.companion-message-user')).toHaveText('Keep existing text. Fresh coffee for busy parents.');
  209 |   await evidence(page, 'voice-draft', { speech: await speechCounts(page) });
  210 | });
  211 |
  212 | test('voice stop allows a final result; typing cancels the session without losing edits', async ({ page }) => {
  213 |   await openFixture(page, 390, 844, true, true);
  214 |   await input(page).fill('Typed'); await startVoice(page).click();
```