import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const QA = path.resolve(process.env.COMPANION_QA_DIR || 'assets/design/companion-glass/qa');
const phase = process.env.COMPANION_GLASS_PHASE || 'current';
const input = (page: Page) => page.getByRole('textbox', { name: 'Message Grifon', exact: true });
const startVoice = (page: Page) => page.getByRole('button', { name: 'Start voice input', exact: true });
const stopVoice = (page: Page) => page.getByRole('button', { name: 'Stop voice input', exact: true });
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9X8AAAAASUVORK5CYII=', 'base64');

// Browser public API mock: no browser permission, microphone, or provider is used.
async function installSpeech(page: Page, supported = true, prefixed = false) {
  await page.addInitScript(({ supported, prefixed }) => {
    const scope = window as any;
    delete scope.SpeechRecognition; delete scope.webkitSpeechRecognition;
    const sessions: any[] = [];
    class Recognition extends EventTarget {
      continuous = false; interimResults = false; lang = ''; maxAlternatives = 1;
      onstart: any = null; onresult: any = null; onerror: any = null; onend: any = null;
      starts = 0; stops = 0; aborts = 0; savedResult: any = null;
      constructor() { super(); sessions.push(this); }
      fire(type: string, data: Record<string, unknown> = {}) {
        const event = new Event(type); Object.assign(event, data);
        const callback = (this as any)[`on${type}`];
        if (type === 'result' && callback) this.savedResult = callback;
        callback?.(event); this.dispatchEvent(event);
      }
      start() { this.starts++; if (scope.speechFixture.startError) throw new DOMException('Fixture speech start rejected', 'InvalidStateError'); this.fire('start'); }
      stop() { this.stops++; }
      abort() { this.aborts++; this.fire('end'); }
      result(parts: { text: string; final: boolean }[], index = 0, late = false) {
        const results = parts.map(part => Object.assign([{ transcript: part.text, confidence: .9 }], { isFinal: part.final }));
        if (late && this.savedResult) {
          const event = new Event('result'); Object.assign(event, { results, resultIndex: index }); this.savedResult(event);
        } else this.fire('result', { results, resultIndex: index });
      }
    }
    if (supported) scope[prefixed ? 'webkitSpeechRecognition' : 'SpeechRecognition'] = Recognition;
    scope.speechFixture = {
      sessions, startError: false,
      snapshot: () => sessions.map(s => ({ starts: s.starts, stops: s.stops, aborts: s.aborts, interimResults: s.interimResults })),
      result: (parts: { text: string; final: boolean }[], index = 0, session = sessions.length - 1, late = false) => sessions[session].result(parts, index, late),
      end: () => sessions.at(-1).fire('end'),
      error: (error: string) => sessions.at(-1).fire('error', { error }),
    };
  }, { supported, prefixed });
}

async function openFixture(page: Page, width = 375, height = 667, supported = true, prefixed = false) {
  await page.setViewportSize({ width, height });
  await installSpeech(page, supported, prefixed);
  const rejected: string[] = [];
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() === 'GET' && ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
    if (url.pathname === '/tests/fixtures/sample-batch/before_after-run1-complete-raw.mp4') return route.fulfill({ contentType: 'video/webm', path: 'tests/e2e/fixtures/recovery.webm' });
    if (!['http://127.0.0.1:5173', 'http://localhost:5173'].includes(url.origin) || url.pathname.startsWith('/api/')) {
      rejected.push(`${request.method()} ${url.origin}${url.pathname}`); return route.abort();
    }
    return route.continue();
  });
  await page.goto('/companion-chat-preview.html');
  await expect(input(page)).toBeVisible();
  await expect(page.locator('iframe[title="Grifon animated companion"]')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
  await expect.poll(() => page.getByText('Saving on this device…', { exact: true }).count()).toBe(0);
  fs.mkdirSync(QA, { recursive: true });
  return rejected;
}

async function evidence(page: Page, name: string, data: unknown) {
  fs.writeFileSync(path.join(QA, `${phase}-${name}.json`), JSON.stringify(data, null, 2));
  await page.screenshot({ path: path.join(QA, `${phase}-${name}.png`), fullPage: true });
}
async function speechResult(page: Page, parts: { text: string; final: boolean }[], index = 0, session?: number, late = false) {
  await page.evaluate(args => (window as any).speechFixture.result(args.parts, args.index, args.session, args.late), { parts, index, session, late });
}
async function speechCounts(page: Page) { return page.evaluate(() => (window as any).speechFixture.snapshot()); }
async function send(page: Page, text: string) {
  await input(page).fill(text); await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Grifon is typing', exact: true })).toHaveCount(0);
}

async function seedHistory(page: Page) {
  // Same persisted public fixture seam used by existing capped-transcript regression.
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('grifon_companion', 1); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('conversations', 'readwrite'), store = tx.objectStore('conversations'), request = store.get('fixture-user-a');
      request.onsuccess = () => {
        const book = request.result, chat = book.chats.find((item: any) => item.id === book.selectedId);
        chat.draft.messages = Array.from({ length: 60 }, (_, i) => ({ id: `glass-history-${i}`, role: i % 2 ? 'user' : 'assistant', text: `History message ${i}. ` + 'Readable conversation continues beneath the floating companion. '.repeat(3), at: 1 + i }));
        store.put(book, 'fixture-user-a');
      };
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    }); db.close();
  });
  await page.reload(); await expect(input(page)).toBeVisible();
  await expect(page.locator('iframe[title="Grifon animated companion"]')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
}

for (const [width, height] of [[375, 667], [390, 844], [1280, 900], [320, 667]]) {
  test(`glass overlay${width === 375 ? ' baseline contract' : ''} at ${width}px`, async ({ page }) => {
    const rejected = await openFixture(page, width, height);
    const initial = await page.evaluate(() => {
      const header = document.querySelector('.companion-header')!, scroll = document.querySelector('[data-testid="conversation-scroll"]')!;
      const avatar = document.querySelector('iframe[title="Grifon animated companion"]')!, message = document.querySelector('.companion-message')!;
      return { header: header.getBoundingClientRect().toJSON(), transcript: scroll.getBoundingClientRect().toJSON(), avatar: avatar.getBoundingClientRect().toJSON(), first: message.getBoundingClientRect().toJSON(), background: getComputedStyle(header).backgroundColor, overflow: document.documentElement.scrollWidth - innerWidth };
    });
    await evidence(page, `initial-${width}`, initial);
    expect.soft(initial.background, 'ordinary floating header has no opaque fill').toMatch(/rgba\([^)]*,\s*0\)|transparent/);
    expect.soft(initial.transcript.y, 'conversation scroll area extends beneath the mascot').toBeLessThan(initial.avatar.y + initial.avatar.height);
    expect.soft(initial.first.y, 'initial message clears the floating header').toBeGreaterThanOrEqual(initial.header.y + initial.header.height - 1);
    expect(initial.overflow).toBeLessThanOrEqual(0);
    await seedHistory(page);
    const scroller = page.getByTestId('conversation-scroll');
    await scroller.evaluate(node => { node.scrollTop = node.scrollHeight * .45; node.dispatchEvent(new Event('scroll')); });
    const overlap = await page.evaluate(() => {
      const header = document.querySelector('.companion-header')!.getBoundingClientRect();
      const messages = Array.from(document.querySelectorAll('.companion-message')).map(node => ({ text: node.textContent, rect: node.getBoundingClientRect().toJSON() }));
      const crossing = messages.filter(m => m.rect.y < header.bottom && m.rect.bottom > header.top);
      const sampleY = header.bottom - 8;
      const sample = crossing.find(m => m.rect.y + 8 < sampleY && m.rect.bottom - 8 > sampleY);
      return { header: header.toJSON(), crossing, pixelPoint: sample ? { x: Math.ceil(sample.rect.x + 8), y: Math.floor(sampleY) } : null, top: (document.querySelector('[data-testid="conversation-scroll"]') as HTMLElement).scrollTop };
    });
    await evidence(page, `history-overlap-${width}`, overlap);
    expect.soft(overlap.crossing.length, 'real persisted older messages pass beneath the floating header').toBeGreaterThan(0);
    if (overlap.pixelPoint) {
      const clip = await page.screenshot({ clip: { ...overlap.pixelPoint, width: 2, height: 2 } });
      const { data, info } = await sharp(clip).raw().toBuffer({ resolveWithObject: true });
      const color = Array.from(data.subarray(0, Math.min(3, info.channels)));
      fs.writeFileSync(path.join(QA, `${phase}-overlap-pixel-${width}.json`), JSON.stringify({ point: overlap.pixelPoint, rgb: color }, null, 2));
      expect.soft(color, 'older bubble pixels are visible through the header outside its controls').not.toEqual([9, 9, 11]);
    } else expect.soft(overlap.pixelPoint, 'a bubble crosses the sampled header strip').not.toBeNull();
    const remembered = await scroller.evaluate(node => node.scrollTop);
    await input(page).fill('Draft while reading history');
    expect(await scroller.evaluate(node => node.scrollTop)).toBe(remembered);
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page.getByRole('status', { name: 'Grifon is typing', exact: true })).toHaveCount(0);
    await expect(page.locator('.companion-message-assistant').last()).toBeInViewport({ ratio: 1 });
    const latest = (await page.locator('.companion-message-assistant').last().boundingBox())!;
    const footer = (await page.locator('.companion-footer').boundingBox())!;
    expect.soft(latest.y + latest.height, 'latest answer clears the floating composer').toBeLessThanOrEqual(footer.y + 1);
    const targets = await page.locator('.companion-composer button').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().toJSON()));
    for (const rect of targets) {
      expect.soft(rect.width).toBeGreaterThanOrEqual(43.5); expect.soft(rect.height).toBeGreaterThanOrEqual(43.5);
      expect.soft(rect.x).toBeGreaterThanOrEqual(0); expect.soft(rect.right).toBeLessThanOrEqual(width);
    }
    expect(rejected).toEqual([]);
  });
}

test('mascot selection baseline contract preserves ordinary text selection', async ({ page }) => {
  await openFixture(page);
  const avatar = page.locator('iframe[title="Grifon animated companion"]').locator('..');
  const box = (await page.locator('iframe[title="Grifon animated companion"]').boundingBox())!;
  await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
  const selection = await page.evaluate(() => {
    const frame = document.querySelector('iframe[title="Grifon animated companion"]')!, image = frame.parentElement!.querySelector('img');
    return { selected: getSelection()?.toString(), userSelect: getComputedStyle(frame.parentElement!).userSelect, draggable: image?.draggable ?? false };
  });
  await evidence(page, 'mascot-selection', selection);
  expect.soft(selection.userSelect, 'mascot cannot acquire a blue browser selection highlight').toBe('none');
  expect.soft(selection.draggable, 'mascot fallback cannot start native image dragging').toBe(false);
  expect(selection.selected).toBe('');
  await page.locator('.companion-message').first().dblclick();
  expect(await page.evaluate(() => getSelection()?.toString().trim().length || 0), 'conversation words remain selectable').toBeGreaterThan(0);
  await expect(avatar).toBeVisible();
});

test('compact composer baseline contract grows and retains keyboard and Plus upload actions', async ({ page }) => {
  const rejected = await openFixture(page);
  const field = input(page), initial = (await field.boundingBox())!;
  const controls = await page.locator('.companion-composer button').evaluateAll(nodes => nodes.map(node => ({ label: node.getAttribute('aria-label'), rect: node.getBoundingClientRect().toJSON() })));
  await evidence(page, 'composer-empty', { input: initial, controls });
  expect.soft(initial.height, 'composer begins as one44px line').toBeGreaterThanOrEqual(43.5);
  expect.soft(initial.height, 'composer begins as one44px line').toBeLessThanOrEqual(45);
  for (const { rect } of controls) {
    expect.soft(rect.width).toBeGreaterThanOrEqual(43.5); expect.soft(rect.height).toBeGreaterThanOrEqual(43.5);
    expect.soft(Math.abs(rect.y + rect.height / 2 - initial.y - initial.height / 2), 'one-line control centers align').toBeLessThanOrEqual(2);
  }
  expect.soft(await page.getByRole('button', { name: 'Attach product photo', exact: true }).locator('svg').getAttribute('class'), 'attachment icon is Plus').toContain('lucide-plus');
  await field.fill('First line\nSecond line\nThird line');
  expect.soft((await field.boundingBox())!.height, 'multiline draft grows the composer').toBeGreaterThan(initial.height + 15);
  await field.fill(Array.from({ length: 20 }, (_, i) => `Draft line ${i}`).join('\n'));
  expect.soft((await field.boundingBox())!.height, 'large drafts stay within the128px composer limit').toBeLessThanOrEqual(128);
  expect(await field.evaluate(node => node.scrollHeight > node.clientHeight), 'large draft remains scrollable').toBe(true);
  await field.fill('A typed draft'); await field.press('Shift+Enter');
  await expect(field).toHaveValue('A typed draft\n');
  await field.dispatchEvent('compositionstart'); await field.press('Enter');
  expect(await page.locator('.companion-message-user').count()).toBe(0);
  await field.dispatchEvent('compositionend'); await field.fill('A complete typed draft'); await field.press('Enter');
  await expect(page.locator('.companion-message-user')).toHaveText('A complete typed draft');
  await expect(field).toHaveValue(''); await expect(field).toBeFocused();
  await expect(page.getByRole('status', { name: 'Grifon is typing', exact: true })).toHaveCount(0);
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Attach product photo', exact: true }).click();
  await (await chooser).setFiles({ name: 'glass-product.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByRole('img', { name: 'Attached product', exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).companionFixture.snapshot().calls)).toEqual([]);
  await evidence(page, 'composer-attachment', { input: await field.boundingBox(), rejected });
  expect(rejected).toEqual([]);
});

test('voice baseline contract updates only the draft with indexed interim and final results', async ({ page }) => {
  await openFixture(page);
  expect((await speechCounts(page)).reduce((sum: number, s: any) => sum + s.starts, 0)).toBe(0);
  await input(page).fill('Keep existing text.');
  await expect(startVoice(page)).toBeVisible(); await startVoice(page).click();
  await expect(stopVoice(page)).toBeVisible();
  await speechResult(page, [{ text: 'Fresh co', final: false }]);
  await expect(input(page)).toHaveValue('Keep existing text. Fresh co');
  await speechResult(page, [{ text: 'Fresh coffee', final: false }]);
  await expect(input(page)).toHaveValue('Keep existing text. Fresh coffee');
  await speechResult(page, [{ text: 'Fresh coffee', final: true }, { text: 'for busy', final: false }], 0);
  await expect(input(page)).toHaveValue('Keep existing text. Fresh coffee for busy');
  await speechResult(page, [{ text: 'Fresh coffee', final: true }, { text: 'for busy parents.', final: true }], 1);
  await expect(input(page)).toHaveValue('Keep existing text. Fresh coffee for busy parents.');
  expect(await page.locator('.companion-message-user').count(), 'voice never auto-sends').toBe(0);
  await stopVoice(page).click();
  expect((await speechCounts(page))[0].stops).toBe(1);
  await page.evaluate(() => (window as any).speechFixture.end());
  await expect(startVoice(page)).toBeVisible();
  await speechResult(page, [{ text: 'Stale duplicate', final: true }], 0, 0, true);
  await expect(input(page)).toHaveValue('Keep existing text. Fresh coffee for busy parents.');
  await input(page).press('Enter');
  await expect(page.locator('.companion-message-user')).toHaveText('Keep existing text. Fresh coffee for busy parents.');
  await evidence(page, 'voice-draft', { speech: await speechCounts(page) });
});

test('voice stop allows a final result; typing cancels the session without losing edits', async ({ page }) => {
  await openFixture(page, 390, 844, true, true);
  await input(page).fill('Typed'); await startVoice(page).click();
  await speechResult(page, [{ text: 'interim', final: false }]);
  await stopVoice(page).click();
  await speechResult(page, [{ text: 'final words', final: true }]);
  await page.evaluate(() => (window as any).speechFixture.end());
  await expect(input(page)).toHaveValue('Typed final words');
  await startVoice(page).click(); await speechResult(page, [{ text: 'temporary', final: false }]);
  await input(page).fill('Manually corrected text');
  await expect.poll(async () => (await speechCounts(page))[1].aborts).toBe(1);
  await speechResult(page, [{ text: 'must not append', final: true }], 0, 1, true);
  await expect(input(page)).toHaveValue('Manually corrected text');
  expect(await page.locator('.companion-message-user').count()).toBe(0);
});

for (const error of ['not-allowed', 'audio-capture', 'network', 'no-speech']) {
  test(`voice ${error} provides a usable fallback and preserves existing text`, async ({ page }) => {
    await openFixture(page); await input(page).fill('Preserve this draft'); await startVoice(page).click();
    await page.evaluate(error => (window as any).speechFixture.error(error), error);
    await expect(startVoice(page)).toBeVisible(); await expect(input(page)).toHaveValue('Preserve this draft');
    const notice = page.locator('[role="alert"], [role="status"]').filter({ hasText: /microphone|permission|voice|speech|dictat|connection|hear/i });
    await expect(notice.first()).toBeVisible();
    await input(page).fill('Typing is still available'); await expect(input(page)).toHaveValue('Typing is still available');
    expect(await page.locator('.companion-message-user').count()).toBe(0);
    await evidence(page, `voice-error-${error}`, { notice: await notice.allTextContents(), speech: await speechCounts(page) });
  });
}

test('unsupported voice remains honest and keyboard drafting works', async ({ page }) => {
  await openFixture(page, 320, 667, false);
  await startVoice(page).click();
  const notice = page.locator('[role="alert"], [role="status"]').filter({ hasText: /voice|dictat|speech/i }).first();
  await expect(notice).toBeVisible(); await expect(notice).toContainText(/browser|support|available/i);
  await input(page).fill('Keyboard fallback'); await input(page).press('Enter');
  await expect(page.locator('.companion-message-user')).toHaveText('Keyboard fallback');
  expect(await speechCounts(page)).toEqual([]);
});

test('voice start rejection returns to typing without discarding the draft', async ({ page }) => {
  await openFixture(page); await input(page).fill('Keep the typed draft');
  await page.evaluate(() => { (window as any).speechFixture.startError = true; });
  await startVoice(page).click(); await expect(startVoice(page)).toBeVisible();
  await expect(input(page)).toHaveValue('Keep the typed draft');
  await expect(page.locator('[role="alert"], [role="status"]').filter({ hasText: /voice|speech|dictat|microphone/i }).first()).toBeVisible();
  await input(page).fill('Typing after the failure'); await expect(input(page)).toHaveValue('Typing after the failure');
});

test('chat, account, disabled and viewer transitions abort voice and reject late transcripts', async ({ page }) => {
  await openFixture(page, 1280, 900); await input(page).fill('Original draft');
  await startVoice(page).click(); await speechResult(page, [{ text: 'saved spoken words', final: true }]);
  const oldId = await page.getByTestId('companion-chat').getAttribute('data-chat-id');
  await page.getByRole('button', { name: 'New chat', exact: true }).click();
  await expect(page.getByTestId('companion-chat')).not.toHaveAttribute('data-chat-id', oldId!);
  expect((await speechCounts(page))[0].aborts).toBe(1);
  await speechResult(page, [{ text: 'late old chat', final: true }], 0, 0, true); await expect(input(page)).toHaveValue('');
  await page.getByRole('navigation', { name: 'Conversations', exact: true }).locator(`[data-chat-id="${oldId}"]`).click();
  await expect(input(page)).toHaveValue('Original draft saved spoken words');
  await startVoice(page).click(); await speechResult(page, [{ text: 'account words', final: false }]);
  await page.evaluate(() => (window as any).companionFixture.account('fixture-user-b'));
  await expect(input(page)).toHaveValue(''); expect((await speechCounts(page))[1].aborts).toBe(1);
  await speechResult(page, [{ text: 'late account', final: true }], 0, 1, true); await expect(input(page)).toHaveValue('');
  await input(page).fill('Disabled draft'); await startVoice(page).click();
  await speechResult(page, [{ text: 'before disable', final: false }]);
  await page.evaluate(() => (window as any).companionFixture.emit('researching'));
  await expect(input(page)).toBeDisabled(); expect((await speechCounts(page))[2].aborts).toBe(1);
  const disabledValue = await input(page).inputValue();
  await speechResult(page, [{ text: 'late disabled', final: true }], 0, 2, true); await expect(input(page)).toHaveValue(disabledValue);
  await page.evaluate(() => (window as any).companionFixture.emit('storyboard'));
  await startVoice(page).click(); await speechResult(page, [{ text: 'viewer words', final: false }]);
  await page.getByRole('button', { name: 'Open storyboard', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Close viewer', exact: true })).toBeVisible();
  expect((await speechCounts(page))[3].aborts).toBe(1);
  const viewerValue = await input(page).inputValue();
  await speechResult(page, [{ text: 'late viewer', final: true }], 0, 3, true); await expect(input(page)).toHaveValue(viewerValue);
  await page.getByRole('button', { name: 'Close viewer', exact: true }).click(); await expect(startVoice(page)).toBeVisible();
  await evidence(page, 'voice-lifecycle', { speech: await speechCounts(page) });
});

test('mobile drawer inert and pending navigation reject speech before chat unmount', async ({ page }) => {
  await openFixture(page, 375, 667); await input(page).fill('Before navigation'); await startVoice(page).click();
  await speechResult(page, [{ text: 'accepted', final: true }]);
  await page.getByRole('button', { name: 'Open conversations', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Chat navigation', exact: true })).toBeVisible();
  await expect.poll(async () => (await speechCounts(page))[0].aborts).toBe(1);
  await speechResult(page, [{ text: 'late drawer', final: true }], 0, 0, true);
  await expect(input(page)).toHaveValue('Before navigation accepted');
  await page.getByRole('button', { name: 'Close conversations', exact: true }).click();
  await startVoice(page).click(); await speechResult(page, [{ text: 'second session', final: true }]);
  // Hold the next conversation write at the browser storage API, observing the
  // existing async save window rather than adding a production-only test hook.
  await page.evaluate(() => {
    const scope = window as any, original = IDBObjectStore.prototype.put;
    scope.releaseConversationWrite = null;
    IDBObjectStore.prototype.put = function (...args: any[]) {
      if (this.name === 'conversations' && !scope.releaseConversationWrite) {
        const tx = this.transaction; const keep = () => { if (!scope.releaseConversationWrite) return; const request = this.get('__voice_navigation_hold__'); request.onsuccess = keep; };
        scope.releaseConversationWrite = () => { scope.releaseConversationWrite = null; IDBObjectStore.prototype.put = original; };
        keep();
      }
      return original.apply(this, args as any);
    };
  });
  const oldId = await page.getByTestId('companion-chat').getAttribute('data-chat-id');
  await page.getByRole('button', { name: 'New chat', exact: true }).click();
  await expect.poll(() => input(page).evaluate(node => !!node.closest('[inert]'))).toBe(true);
  await speechResult(page, [{ text: 'late pending save', final: true }], 0, 1, true);
  await expect(input(page)).toHaveValue('Before navigation accepted second session');
  await expect.poll(async () => (await speechCounts(page))[1].aborts).toBe(1);
  await page.evaluate(() => (window as any).releaseConversationWrite?.());
  await expect(page.getByTestId('companion-chat')).not.toHaveAttribute('data-chat-id', oldId!);
  await expect(input(page)).toHaveValue('');
});

test('reduced motion and material accessibility fallbacks keep composer and header usable', async ({ page }) => {
  await openFixture(page, 390, 844);
  await page.emulateMedia({ reducedMotion: 'reduce', contrast: 'more' });
  const css = await page.locator('.companion-composer').evaluate(node => ({ background: getComputedStyle(node).backgroundColor, transition: getComputedStyle(node).transitionDuration }));
  expect(css.background).toBe('rgb(24, 24, 27)');
  await input(page).fill('Accessible draft'); await expect(input(page)).toBeFocused();
  const contrast = await page.evaluate(() => matchMedia('(prefers-contrast: more)').matches);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
  const transparencySupported = await page.evaluate(() => matchMedia('(prefers-reduced-transparency: reduce)').matches);
  if (transparencySupported) expect(await page.locator('.companion-composer').evaluate(node => getComputedStyle(node).backgroundColor)).toBe('rgb(24, 24, 27)');
  await evidence(page, 'accessibility-fallback', { css, reducedMotion: await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), contrast, transparencySupported });
  await cdp.detach();
});
