import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import sharp from 'sharp';

const input = (page: Page) => page.getByRole('textbox', { name: 'Message Grifon', exact: true });
const identity = (page: Page) => page.locator('.companion-identity');
const status = (page: Page) => page.locator('.companion-identity-status');
const scroll = (page: Page) => page.getByTestId('conversation-scroll');

async function openChat(page: Page, width = 1280, height = 900, theme = 'dark') {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(theme => localStorage.setItem('grifon-companion-appearance', theme), theme);
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() === 'GET' && ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
    if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname.startsWith('/api/')) return route.abort();
    return route.continue();
  });
  if (process.env.COMPANION_MESSAGES_UNSCOPED_CAPS === '1') {
    await page.route(/\/components\/CompanionChat\/companionChat\.css(?:\?.*)?$/, async route => {
      const response = await route.fetch();
      let body = await response.text();
      for (const selector of ['companion-assistant-row', 'companion-user-row']) {
        const scoped = `.companion-shell .${selector}`;
        if (body.split(scoped).length !== 2) throw new Error(`Original cap negative control no longer matches ${selector}`);
        body = body.replace(scoped, `.${selector}`);
      }
      await route.fulfill({ response, body });
    });
  }
  if (process.env.COMPANION_MESSAGES_OLD_LIGHT_INK === '1') {
    await page.route(/\/components\/CompanionChat\/companionChat\.css(?:\?.*)?$/, async route => {
      const response = await route.fetch();
      let body = await response.text();
      const edits = [
        ['--companion-user-text: #211d16;', '--companion-user-text: #39300f;'],
        [".companion-shell[data-companion-theme='light'] .companion-display { color: #6b4e00; }", ".companion-shell[data-companion-theme='light'] .companion-display { color: var(--companion-gold-ink); }"],
      ];
      for (const [current, original] of edits) {
        if (body.split(current).length !== 2) throw new Error(`Original light-ink negative control no longer matches ${current}`);
        body = body.replace(current, original);
      }
      await route.fulfill({ response, body });
    });
  }
  if (process.env.COMPANION_MESSAGES_BASELINE_MODULES) {
    const modules: Record<string, string> = JSON.parse(fs.readFileSync(process.env.COMPANION_MESSAGES_BASELINE_MODULES, 'utf8'));
    await page.route(/\/components\/CompanionChat\/(?:CompanionChatShell|CompanionChatSurface|CompanionReferenceBrief)\.tsx(?:\?.*)?$|\/components\/CompanionChat\/companionChat\.css(?:\?.*)?$/, route => {
      const pathname = new URL(route.request().url()).pathname;
      if (!modules[pathname]) throw new Error(`Missing original module: ${pathname}`);
      return route.fulfill({ contentType: 'application/javascript', body: modules[pathname] });
    });
  }
  await page.goto('/companion-chat-preview.html');
  await expect(input(page)).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

async function send(page: Page, text: string) {
  await input(page).fill(text);
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Grifon is typing', exact: true })).toHaveCount(0);
}

async function centered(page: Page) {
  const main = (await page.locator('.companion-main').boundingBox())!;
  const badge = (await identity(page).boundingBox())!;
  expect(Math.abs(badge.x + badge.width / 2 - main.x - main.width / 2), 'identity is centered in the conversation pane').toBeLessThanOrEqual(2);
  const header = (await page.locator('.companion-header').boundingBox())!;
  const pane = (await scroll(page).boundingBox())!;
  expect(pane.y, 'conversation starts below the stationary identity header').toBeGreaterThanOrEqual(header.y + header.height - .5);
}

for (const [width, height] of [[1280, 900], [375, 667]]) {
  for (const theme of ['dark', 'light']) {
    test(`${theme} ${width}px identity is centered, bare, underlined and pinned outside scrolling content`, async ({ page }) => {
      await openChat(page, width, height, theme);
      await centered(page);
      await expect(status(page)).toBeVisible();
      await expect(status(page)).toHaveText('Ready');
      await expect(identity(page).locator('[data-companion-glass]')).toHaveCount(0);
      const name = page.locator('.companion-display');
      const slot = page.locator('[data-companion-avatar-slot]');
      const avatarBox = (await slot.boundingBox())!;
      const nameBox = (await name.boundingBox())!;
      const statusBox = (await status(page).boundingBox())!;
      expect(nameBox.y, 'name sits below the bare mascot on desktop and mobile').toBeGreaterThanOrEqual(avatarBox.y + avatarBox.height);
      expect(statusBox.y, 'real status sits below the name').toBeGreaterThanOrEqual(nameBox.y + nameBox.height);
      for (const bounds of [nameBox, statusBox]) expect(Math.abs(bounds.x + bounds.width / 2 - avatarBox.x - avatarBox.width / 2)).toBeLessThanOrEqual(2);
      const spotlight = await slot.evaluate(node => {
        const decoration = getComputedStyle(node, '::before');
        return { content: decoration.content, pointerEvents: decoration.pointerEvents, border: decoration.borderWidth,
          background: decoration.backgroundImage, width: parseFloat(decoration.width), height: parseFloat(decoration.height) };
      });
      expect(spotlight.content).not.toBe('none');
      expect(spotlight.pointerEvents).toBe('none');
      expect(spotlight.border).toBe('0px');
      expect(spotlight.background).toContain('radial-gradient');
      expect(spotlight.width, 'soft light stays bounded around the mascot').toBeLessThanOrEqual(160);
      expect(spotlight.height).toBeLessThanOrEqual(160);
      const material = await name.evaluate(node => {
        const style = getComputedStyle(node);
        const range = document.createRange(); range.selectNodeContents(node.querySelector('span:not([aria-hidden])') ?? node);
        return { font: style.fontFamily, background: style.backgroundColor, backdrop: style.backdropFilter,
          filter: style.filter, color: style.color, underline: { style: style.borderBottomStyle, height: parseFloat(style.borderBottomWidth) },
          width: node.getBoundingClientRect().width, textWidth: range.getBoundingClientRect().width };
      });
      expect(material.font).toContain('Oxanium');
      expect(material.background).toBe('rgba(0, 0, 0, 0)');
      expect(material.backdrop).toBe('none');
      expect(material.filter).toBe('none');
      expect(material.underline.style).not.toBe('none');
      expect(material.underline.height).toBeGreaterThan(0);
      expect(material.underline.height).toBeLessThanOrEqual(2);
      expect(material.width).toBeLessThanOrEqual(material.textWidth + 2);
      const glow = name.locator('.companion-name-glow');
      await expect(glow).toHaveAttribute('aria-hidden', 'true');
      expect(await glow.evaluate(node => getComputedStyle(node).pointerEvents)).toBe('none');
      const rgb = material.color.match(/\d+(?:\.\d+)?/g)!.slice(0, 3).map(Number);
      expect(rgb[0]).toBeGreaterThan(rgb[1]); expect(rgb[1]).toBeGreaterThan(rgb[2]);
      const box = (await name.boundingBox())!;
      const capture = await page.screenshot({ animations: 'disabled' });
      const { data, info } = await sharp(capture).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      const luminance = (channels: number[]) => channels.map(value => { const c = value / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
      const ink = luminance(rgb);
      for (const x of [Math.floor(box.x - 3), Math.ceil(box.x + box.width + 3)]) {
        const offset = (Math.floor(box.y + box.height / 2) * info.width + x) * info.channels;
        const background = luminance([...data.subarray(offset, offset + 3)]);
        expect((Math.max(ink, background) + .05) / (Math.min(ink, background) + .05), 'gold name contrasts against its rendered local backdrop').toBeGreaterThanOrEqual(4.5);
      }
      const before = (await identity(page).boundingBox())!;
      for (const answer of ['Cold brew for busy parents.', 'North Coffee', 'Morning brew', 'Two bottles for 199', '199']) await send(page, answer);
      await scroll(page).evaluate(node => { node.scrollTop = 0; });
      await centered(page);
      const after = (await identity(page).boundingBox())!;
      expect(after.x).toBeCloseTo(before.x, 0);
      expect(after.y).toBeCloseTo(before.y, 0);
      expect(after.height).toBeCloseTo(before.height, 0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
      expect(await name.evaluate(node => node.getAnimations({ subtree: true }).length), 'reduced motion keeps identity decoration static').toBe(0);
      await page.emulateMedia({ contrast: 'more' });
      expect(await glow.evaluate(node => getComputedStyle(node).display)).toBe('none');
      expect(await slot.evaluate(node => getComputedStyle(node, '::before').display)).toBe('none');
      expect(await name.evaluate(node => getComputedStyle(node).filter)).toBe('none');
    });
  }
}

for (const width of [375, 390, 640, 767, 1280]) {
  test(`assistant replies share the composer left edge at ${width}px`, async ({ page }) => {
    await openChat(page, width, width < 768 ? 667 : 900);
    const composer = (await page.locator('.companion-composer').boundingBox())!;
    const reply = (await page.locator('.companion-message-assistant').first().boundingBox())!;
    expect(Math.abs(reply.x - composer.x), 'left edge follows the input rather than a separate centered narrow column').toBeLessThanOrEqual(1);
  });
}

for (const width of [375, 1280]) {
  test(`light name and user ink exceed the stronger rendered contrast floors at ${width}px`, async ({ page }, testInfo) => {
    await openChat(page, width, width < 768 ? 667 : 900, 'light');
    await send(page, 'Coffee for busy parents.');
    await expect(page.getByText('Saving on this device…', { exact: true })).toHaveCount(0);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const targets = await page.evaluate(() => {
      const measure = (selector: string) => {
        const node = document.querySelector(selector)!;
        const box = node.getBoundingClientRect();
        return { ink: getComputedStyle(node).color, box: { x: box.x, y: box.y, width: box.width, height: box.height } };
      };
      return { name: measure('.companion-display'), user: measure('.companion-message-user') };
    });
    const capture = await page.screenshot({ animations: 'disabled' });
    const { data, info } = await sharp(capture).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const luminance = (rgb: number[]) => rgb.map(value => {
      const channel = value / 255;
      return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
    }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    const sample = (inkColor: string, points: { x: number; y: number }[]) => {
      const ink = inkColor.match(/\d+(?:\.\d+)?/g)!.slice(0, 3).map(Number);
      const foreground = luminance(ink);
      return { ink, samples: points.map(point => {
        const x = Math.floor(point.x), y = Math.floor(point.y);
        const offset = (y * info.width + x) * info.channels;
        const background = [...data.subarray(offset, offset + 3)];
        const backdrop = luminance(background);
        return { x, y, background, contrast: (Math.max(foreground, backdrop) + .05) / (Math.min(foreground, backdrop) + .05) };
      }) };
    };
    const name = targets.name.box, user = targets.user.box;
    const measurement = {
      width,
      name: sample(targets.name.ink, [
        { x: name.x - 3, y: name.y + name.height / 2 },
        { x: name.x + name.width + 3, y: name.y + name.height / 2 },
      ]),
      user: sample(targets.user.ink, [
        { x: user.x + user.width / 2, y: user.y + 8 },
        { x: user.x + 8, y: user.y + user.height / 2 },
        { x: user.x + user.width - 8, y: user.y + user.height / 2 },
      ]),
    };
    fs.writeFileSync(testInfo.outputPath('light-rendered-contrast.json'), JSON.stringify(measurement, null, 2));
    await testInfo.attach('light-rendered-contrast', { body: JSON.stringify(measurement), contentType: 'application/json' });
    expect(Math.min(...measurement.name.samples.map(point => point.contrast)), 'light gold name exceeds 6:1 against the actual local background').toBeGreaterThanOrEqual(6);
    expect(Math.min(...measurement.user.samples.map(point => point.contrast)), 'user ink exceeds 13:1 against its actual translucent bubble').toBeGreaterThanOrEqual(13);
  });
}

for (const width of [1280, 1920]) {
  for (const theme of ['dark', 'light']) {
    test(`${theme} long desktop messages retain a readable 672px cap at ${width}px`, async ({ page }) => {
      await openChat(page, width, 900, theme);
      await send(page, 'A coffee launch with a clear offer and an audience of busy parents. '.repeat(10));
      await page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open('grifon_companion', 1); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
        await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction('conversations', 'readwrite');
          const store = transaction.objectStore('conversations');
          const request = store.get('fixture-user-a');
          request.onsuccess = () => {
            const book = request.result;
            const chat = book.chats.find((item: { id: string }) => item.id === book.selectedId);
            chat.draft.messages.find((message: { role: string }) => message.role === 'assistant').text = 'Here is a detailed response with clear readable lines for your product launch and audience. '.repeat(12);
            store.put(book, 'fixture-user-a');
          };
          transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error);
        });
        db.close();
      });
      await page.reload();
      await expect(input(page)).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const composer = (await page.locator('.companion-composer').boundingBox())!;
      const assistant = (await page.locator('.companion-message-assistant').first().boundingBox())!;
      const user = (await page.locator('.companion-message-user').first().boundingBox())!;
      expect(assistant.width, 'a long assistant message remains readable at large desktop widths').toBeLessThanOrEqual(672);
      expect(user.width, 'a long user message retains the same reading cap').toBeLessThanOrEqual(672);
      expect(Math.abs(assistant.x - composer.x)).toBeLessThanOrEqual(1);
      expect(user.x + user.width).toBeCloseTo(composer.x + composer.width, 0);
    });
  }
}

test('status follows actual controller state and never reports idle or invented percent during work', async ({ page }) => {
  await openChat(page, 375, 667);
  await expect(status(page)).toBeVisible();
  await expect(status(page)).toHaveText('Ready');
  await input(page).fill('An unsent draft');
  await expect(status(page)).toHaveText('Ready');
  await page.clock.install();
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(status(page)).toHaveText('Replying…');
  await page.clock.runFor(650);
  await expect(status(page)).toHaveText('Ready');
  await page.evaluate(() => (window as unknown as { companionFixture: { emit(event: string): void } }).companionFixture.emit('researching'));
  await expect(status(page)).toHaveText('Researching your product…');
  await page.evaluate(() => (window as unknown as { companionFixture: { emit(event: string): void } }).companionFixture.emit('script'));
  await expect(status(page)).toHaveText('Writing your script');
  await page.evaluate(() => (window as unknown as { companionFixture: { emit(event: string): void } }).companionFixture.emit('storyboard'));
  await expect(status(page)).toHaveText('Waiting for storyboard review');
  await page.evaluate(() => (window as unknown as { companionFixture: { emit(event: string): void } }).companionFixture.emit('error'));
  await expect(status(page)).toHaveText('Needs attention');
  await expect(status(page)).not.toContainText('%');
});

test('conversation times use saved last activity rather than the first message time', async ({ page }) => {
  await openChat(page);
  await send(page, 'Timestamp fixture');
  const now = Date.now();
  await page.evaluate(async now => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open('grifon_companion', 1); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const book = await new Promise<any>((resolve, reject) => { const request = db.transaction('conversations', 'readonly').objectStore('conversations').get('fixture-user-a'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    if (!book?.chats?.length) throw new Error('Saved fixture conversation missing');
    const original = book.chats[0];
    book.chats = [5 * 60_000, 60 * 60_000, 24 * 60 * 60_000].map((age, index) => ({ ...structuredClone(original), id: `time-fixture-${index}`, updatedAt: now - age,
      draft: { ...structuredClone(original.draft), productName: `Activity fixture ${index}`, messages: original.draft.messages.map((message: object) => ({ ...message, at: now - 7 * 24 * 60 * 60_000 })) } }));
    book.selectedId = book.chats[0].id;
    await new Promise<void>((resolve, reject) => { const transaction = db.transaction('conversations', 'readwrite'); transaction.objectStore('conversations').put(book, 'fixture-user-a'); transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); });
    db.close();
  }, now);
  await page.reload();
  await expect(input(page)).toBeVisible();
  for (const [index, expected] of ['5m', '1h', '1d'].entries()) {
    const row = page.locator(`.companion-conversation[data-chat-id="time-fixture-${index}"]`);
    await expect(row.locator('time')).toHaveText(expected);
    await expect(row.locator('time')).toHaveAttribute('datetime', new Date(now - [5 * 60_000, 60 * 60_000, 24 * 60 * 60_000][index]).toISOString());
    await expect(row.locator('time')).toHaveAttribute('title', /\d/);
  }
});

for (const theme of ['dark', 'light']) {
  test(`${theme} Oxanium messages have fully rounded corners and clear glyph bounds`, async ({ page }) => {
    await openChat(page, 375, 667, theme);
    const text = 'A bright morning coffee launch with a longer line that wraps safely inside the message bubble.';
    await send(page, text);
    for (const selector of ['.companion-message-user', '.companion-message-assistant', '.companion-composer textarea']) {
      const geometry = await page.locator(selector).first().evaluate(node => {
        const style = getComputedStyle(node), box = node.getBoundingClientRect();
        const range = document.createRange(); range.selectNodeContents(node);
        const glyphs = [...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0);
        return { font: style.fontFamily, corners: [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomLeftRadius, style.borderBottomRightRadius].map(parseFloat),
          paddingLeft: parseFloat(style.paddingLeft), paddingRight: parseFloat(style.paddingRight),
          glyphs: glyphs.map(rect => ({ x: rect.x, right: rect.right, y: rect.y, bottom: rect.bottom })),
          box: { x: box.x, right: box.right, y: box.y, bottom: box.bottom } };
      });
      expect(geometry.font).toContain('Oxanium');
      if (selector.includes('textarea')) continue;
      if (selector.includes('message-user')) expect(geometry.corners.every(radius => radius >= 16)).toBe(true);
      expect(geometry.paddingLeft).toBeGreaterThanOrEqual(14);
      expect(geometry.paddingRight).toBeGreaterThanOrEqual(14);
      for (const glyph of geometry.glyphs) {
        expect(glyph.x).toBeGreaterThanOrEqual(geometry.box.x + 10);
        expect(glyph.right).toBeLessThanOrEqual(geometry.box.right - 10);
        expect(glyph.y).toBeGreaterThanOrEqual(geometry.box.y);
        expect(glyph.bottom).toBeLessThanOrEqual(geometry.box.bottom);
      }
    }
  });
}

test('progressive edge follows overflow while stationary header stays outside the clipped scrollport', async ({ page }) => {
  await openChat(page, 375, 667);
  const edge = page.locator('.companion-scroll-edge');
  await expect(edge).toHaveAttribute('aria-hidden', 'true');
  await expect(edge).toHaveAttribute('data-active', 'false');
  for (const answer of ['Cold brew for busy parents.', 'North Coffee', 'Morning brew', 'Two bottles for 199', '199']) await send(page, answer);
  await expect.poll(() => scroll(page).evaluate(node => node.scrollHeight > node.clientHeight)).toBe(true);
  await scroll(page).evaluate(node => { node.scrollTop = 100; });
  await expect.poll(() => scroll(page).evaluate(node => node.scrollTop)).toBeGreaterThan(1);
  await expect(edge).toHaveAttribute('data-active', 'true');
  expect(await edge.evaluate(node => getComputedStyle(node).pointerEvents)).toBe('none');
  const header = (await page.locator('.companion-header').boundingBox())!;
  const pane = (await scroll(page).boundingBox())!;
  const effect = (await edge.boundingBox())!;
  expect(pane.y).toBeGreaterThanOrEqual(header.y + header.height - .5);
  expect(effect.y).toBeGreaterThanOrEqual(header.y + header.height - .5);
  expect(effect.height).toBeLessThanOrEqual(40);
  await scroll(page).evaluate(node => { node.scrollTop = 0; });
  await expect(edge).toHaveAttribute('data-active', 'false');
  await input(page).fill('The edge never blocks typing');
  await expect(input(page)).toBeFocused();
});

test('compact settings retain 44px targets and use the approved brand font', async ({ page }) => {
  await openChat(page, 375, 667, 'light');
  await page.getByRole('button', { name: 'Open conversations', exact: true }).click();
  await page.getByRole('button', { name: 'Account settings', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings', exact: true });
  const appearance = dialog.getByRole('group', { name: 'Chat appearance', exact: true });
  await expect(appearance).toBeVisible();
  for (const name of ['Light', 'Dark']) {
    const button = appearance.getByRole('button', { name, exact: true });
    const bounds = (await button.boundingBox())!;
    expect(bounds.width).toBeGreaterThanOrEqual(44);
    expect(bounds.height).toBeGreaterThanOrEqual(44);
    expect(bounds.height).toBeLessThanOrEqual(48);
    expect(await button.evaluate(node => getComputedStyle(node).fontFamily)).toContain('Oxanium');
  }
  await appearance.getByRole('button', { name: 'Dark', exact: true }).click();
  await expect(page.locator('.companion-shell')).toHaveAttribute('data-companion-theme', 'dark');
  await page.keyboard.press('Escape');
  await expect(input(page)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
});
