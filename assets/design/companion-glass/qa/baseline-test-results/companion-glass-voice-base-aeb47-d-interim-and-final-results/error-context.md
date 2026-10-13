# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: companion-glass.spec.ts >> voice baseline contract updates only the draft with indexed interim and final results
- Location: tests\e2e\companion-glass.spec.ts:186:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: 'Start voice input', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('button', { name: 'Start voice input', exact: true })

```

```yaml
- group: Local test fixture · mocked generation · no provider calls
- banner:
  - button "Open conversations"
  - button "New chat"
  - heading "Grifon" [level=1]
- region "Conversation with Grifon":
  - paragraph:
    - time: Oct 7 · 11:17 AM
  - article:
    - paragraph: What product are we making an ad for? Tell me about your audience and what you want the ad to achieve.
  - button "Attach product photo"
  - textbox "Message Grifon":
    - /placeholder: Tell Grifon…
    - text: Keep existing text.
  - button "Send"
  - paragraph: Draft saved on this device. No generation starts until you confirm.
```

# Test source

```ts
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
  114 |     expect.soft(initial.transcript.y, 'conversation scroll area extends beneath the mascot').toBeLessThan(initial.avatar.y + initial.avatar.height);
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
> 190 |   await expect(startVoice(page)).toBeVisible(); await startVoice(page).click();
      |                                  ^ Error: expect(locator).toBeVisible() failed
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
  215 |   await speechResult(page, [{ text: 'interim', final: false }]);
  216 |   await stopVoice(page).click();
  217 |   await speechResult(page, [{ text: 'final words', final: true }]);
  218 |   await page.evaluate(() => (window as any).speechFixture.end());
  219 |   await expect(input(page)).toHaveValue('Typed final words');
  220 |   await startVoice(page).click(); await speechResult(page, [{ text: 'temporary', final: false }]);
  221 |   await input(page).fill('Manually corrected text');
  222 |   await expect.poll(async () => (await speechCounts(page))[1].aborts).toBe(1);
  223 |   await speechResult(page, [{ text: 'must not append', final: true }], 0, 1, true);
  224 |   await expect(input(page)).toHaveValue('Manually corrected text');
  225 |   expect(await page.locator('.companion-message-user').count()).toBe(0);
  226 | });
  227 |
  228 | for (const error of ['not-allowed', 'audio-capture', 'network', 'no-speech']) {
  229 |   test(`voice ${error} provides a usable fallback and preserves existing text`, async ({ page }) => {
  230 |     await openFixture(page); await input(page).fill('Preserve this draft'); await startVoice(page).click();
  231 |     await page.evaluate(error => (window as any).speechFixture.error(error), error);
  232 |     await expect(startVoice(page)).toBeVisible(); await expect(input(page)).toHaveValue('Preserve this draft');
  233 |     const notice = page.locator('[role="alert"], [role="status"]').filter({ hasText: /microphone|permission|voice|speech|dictat|connection|hear/i });
  234 |     await expect(notice.first()).toBeVisible();
  235 |     await input(page).fill('Typing is still available'); await expect(input(page)).toHaveValue('Typing is still available');
  236 |     expect(await page.locator('.companion-message-user').count()).toBe(0);
  237 |     await evidence(page, `voice-error-${error}`, { notice: await notice.allTextContents(), speech: await speechCounts(page) });
  238 |   });
  239 | }
  240 |
  241 | test('unsupported voice remains honest and keyboard drafting works', async ({ page }) => {
  242 |   await openFixture(page, 320, 667, false);
  243 |   await expect(page.getByText(/voice input.*(unavailable|unsupported)|dictation.*(unavailable|unsupported)|browser.*(support.*voice|support.*speech)/i).first()).toBeVisible();
  244 |   if (await startVoice(page).count()) await expect(startVoice(page)).toBeDisabled();
  245 |   await input(page).fill('Keyboard fallback'); await input(page).press('Enter');
  246 |   await expect(page.locator('.companion-message-user')).toHaveText('Keyboard fallback');
  247 |   expect(await speechCounts(page)).toEqual([]);
  248 | });
  249 |
  250 | test('chat, account, disabled and viewer transitions abort voice and reject late transcripts', async ({ page }) => {
  251 |   await openFixture(page, 1280, 900); await input(page).fill('Original draft');
  252 |   await startVoice(page).click(); await speechResult(page, [{ text: 'saved spoken words', final: true }]);
  253 |   const oldId = await page.getByTestId('companion-chat').getAttribute('data-chat-id');
  254 |   await page.getByRole('button', { name: 'New chat', exact: true }).click();
  255 |   await expect(page.getByTestId('companion-chat')).not.toHaveAttribute('data-chat-id', oldId!);
  256 |   expect((await speechCounts(page))[0].aborts).toBe(1);
  257 |   await speechResult(page, [{ text: 'late old chat', final: true }], 0, 0, true); await expect(input(page)).toHaveValue('');
  258 |   await page.getByRole('navigation', { name: 'Conversations', exact: true }).locator(`[data-chat-id="${oldId}"]`).click();
  259 |   await expect(input(page)).toHaveValue('Original draft saved spoken words');
  260 |   await startVoice(page).click(); await speechResult(page, [{ text: 'account words', final: false }]);
  261 |   await page.evaluate(() => (window as any).companionFixture.account('fixture-user-b'));
  262 |   await expect(input(page)).toHaveValue(''); expect((await speechCounts(page))[1].aborts).toBe(1);
  263 |   await speechResult(page, [{ text: 'late account', final: true }], 0, 1, true); await expect(input(page)).toHaveValue('');
  264 |   await input(page).fill('Disabled draft'); await startVoice(page).click();
  265 |   await speechResult(page, [{ text: 'before disable', final: false }]);
  266 |   await page.evaluate(() => (window as any).companionFixture.emit('researching'));
  267 |   await expect(input(page)).toBeDisabled(); expect((await speechCounts(page))[2].aborts).toBe(1);
  268 |   const disabledValue = await input(page).inputValue();
  269 |   await speechResult(page, [{ text: 'late disabled', final: true }], 0, 2, true); await expect(input(page)).toHaveValue(disabledValue);
  270 |   await page.evaluate(() => (window as any).companionFixture.emit('storyboard'));
  271 |   await startVoice(page).click(); await speechResult(page, [{ text: 'viewer words', final: false }]);
  272 |   await page.getByRole('button', { name: 'Open storyboard', exact: true }).click();
  273 |   await expect(page.getByRole('button', { name: 'Close viewer', exact: true })).toBeVisible();
  274 |   expect((await speechCounts(page))[3].aborts).toBe(1);
  275 |   const viewerValue = await input(page).inputValue();
  276 |   await speechResult(page, [{ text: 'late viewer', final: true }], 0, 3, true); await expect(input(page)).toHaveValue(viewerValue);
  277 |   await page.getByRole('button', { name: 'Close viewer', exact: true }).click(); await expect(startVoice(page)).toBeVisible();
  278 |   await evidence(page, 'voice-lifecycle', { speech: await speechCounts(page) });
  279 | });
  280 |
  281 | test('mobile drawer inert and pending navigation reject speech before chat unmount', async ({ page }) => {
  282 |   await openFixture(page, 375, 667); await input(page).fill('Before navigation'); await startVoice(page).click();
  283 |   await speechResult(page, [{ text: 'accepted', final: true }]);
  284 |   await page.getByRole('button', { name: 'Open conversations', exact: true }).click();
  285 |   await expect(page.getByRole('dialog', { name: 'Chat navigation', exact: true })).toBeVisible();
  286 |   await expect.poll(async () => (await speechCounts(page))[0].aborts).toBe(1);
  287 |   await speechResult(page, [{ text: 'late drawer', final: true }], 0, 0, true);
  288 |   await expect(input(page)).toHaveValue('Before navigation accepted');
  289 |   await page.getByRole('button', { name: 'Close conversations', exact: true }).click();
  290 |   await startVoice(page).click(); await speechResult(page, [{ text: 'second session', final: true }]);
```