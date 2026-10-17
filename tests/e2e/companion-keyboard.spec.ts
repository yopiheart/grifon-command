import { test, expect, type Page } from '@playwright/test';

const input = (page: Page) => page.getByRole('textbox', { name: 'Message Grifon', exact: true });

async function chatGeometry(page: Page) {
  return page.evaluate(() => {
    const bounds = (selector: string, last = false) => {
      const nodes = document.querySelectorAll<HTMLElement>(selector);
      if (!nodes.length || (!last && nodes.length !== 1)) throw new Error(`Expected ${last ? 'at least one' : 'one'} ${selector}`);
      const node = nodes[last ? nodes.length - 1 : 0];
      if (!node.getClientRects().length) throw new Error(`Missing layout box for ${selector}`);
      return node.getBoundingClientRect();
    };
    const reply = bounds('.companion-message-assistant', true), composer = bounds('.companion-composer'), header = bounds('.companion-header');
    return { replyTop: reply.y, clearance: composer.y - reply.y - reply.height, composerBottom: composer.y + composer.height,
      headerTop: header.y, headerBottom: header.y + header.height, overflow: document.documentElement.scrollWidth - innerWidth };
  });
}

async function openChat(page: Page, theme: string, width = 390, height = 844, answers = ['Cold brew for busy parents.', 'North Coffee', 'Morning brew'], reducedMotion: 'reduce' | 'no-preference' = 'reduce') {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion });
  await page.addInitScript(theme => localStorage.setItem('grifon-companion-appearance', theme), theme);
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() === 'GET' && ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
    if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname.startsWith('/api/')) return route.abort();
    return route.continue();
  });
  // Reconstruct the original missing resize seams without editing source.
  if (process.env.COMPANION_KEYBOARD_OLD_RESIZE === '1') {
    await page.addInitScript(() => {
      const Original = window.ResizeObserver;
      window.ResizeObserver = class extends Original {
        observe(target: Element, options?: ResizeObserverOptions) {
          if (target.getAttribute('data-testid') !== 'conversation-scroll') super.observe(target, options);
        }
      };
      Object.defineProperty(window, 'visualViewport', { configurable: true, value: undefined });
    });
    await page.route(/\/components\/CompanionChat\/CompanionChatSurface\.tsx(?:\?.*)?$/, async route => {
      const response = await route.fetch(), body = await response.text();
      const guard = /if \(node\.clientHeight !== measuredViewportHeight\.current\) return;/;
      if (!guard.test(body)) throw new Error('Original resize negative control no longer matches the surface');
      await route.fulfill({ response, body: body.replace(guard, '') });
    });
  }
  await page.goto('/companion-chat-preview.html');
  await expect(input(page)).toBeVisible();
  for (const answer of answers) {
    await input(page).fill(answer);
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page.getByRole('status', { name: 'Grifon is typing', exact: true })).toHaveCount(0);
  }
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(async () => {
    const geometry = await chatGeometry(page);
    return geometry.clearance;
  }).toBeGreaterThanOrEqual(8);
}

async function resizeVisualViewport(page: Page, height: number) {
  await page.evaluate(height => {
    const target = window as unknown as { keyboardViewport?: { height: number; offsetTop: number; scale: number } };
    if (!target.keyboardViewport) {
      const state = { height, offsetTop: 0, scale: 1 };
      target.keyboardViewport = state;
      for (const key of ['height', 'offsetTop', 'scale'] as const) {
        Object.defineProperty(window.visualViewport, key, { configurable: true, get: () => state[key] });
      }
    }
    target.keyboardViewport.height = height;
    window.visualViewport!.dispatchEvent(new Event('resize'));
  }, height);
  await expect.poll(() => page.evaluate(() => {
    const shells = document.querySelectorAll('.companion-shell');
    if (shells.length !== 1 || !shells[0].getClientRects().length) throw new Error('Expected one laid-out companion shell');
    return shells[0].getBoundingClientRect().height;
  })).toBeCloseTo(height, 0);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function expectVisibleLatest(page: Page, bottom: number, top = 0) {
  await expect.poll(async () => {
    return (await chatGeometry(page)).composerBottom;
  }, { message: 'composer stays above the keyboard boundary' }).toBeLessThanOrEqual(bottom + .5);
  await expect.poll(async () => {
    const geometry = await chatGeometry(page);
    return geometry.clearance;
  }, { message: 'latest reply remains above composer while following the conversation' }).toBeGreaterThanOrEqual(8);
  const geometry = await chatGeometry(page);
  expect(geometry.replyTop).toBeGreaterThanOrEqual(geometry.headerBottom - .5);
  expect(geometry.headerTop).toBeGreaterThanOrEqual(top - .5);
  expect(geometry.overflow).toBe(0);
  await expect(input(page)).toBeFocused();
}

for (const theme of ['dark', 'light']) {
  test(`${theme} no-motion touchmove on fitted history preserves following when the keyboard opens`, async ({ page }) => {
    await openChat(page, theme, 393, 743, ['coffee'], 'no-preference');
    await resizeVisualViewport(page, 742.55);
    const scroller = page.getByTestId('conversation-scroll');
    expect(await scroller.evaluate(node => node.scrollHeight - node.clientHeight)).toBe(0);
    await scroller.evaluate(node => node.dispatchEvent(new (typeof TouchEvent === 'function' ? TouchEvent : Event)('touchmove', { bubbles: true, cancelable: true })));
    expect(await scroller.evaluate(node => node.scrollTop)).toBe(0);
    await input(page).click();
    await resizeVisualViewport(page, 456.73);
    await expectVisibleLatest(page, 456.73);
    await input(page).fill('Draft after a touch without scrolling');
    await expectVisibleLatest(page, 456.73);
    await expect(input(page)).toHaveValue('Draft after a touch without scrolling');
  });

  for (const closeBeforeReply of [false, true]) {
    test(`${theme} normal motion keeps following after a fitted reply and gutter tap${closeBeforeReply ? ' with the keyboard closed before delivery' : ''}`, async ({ page }) => {
      await openChat(page, theme, 393, 743, [], 'no-preference');
      await resizeVisualViewport(page, 742.55);
      const scroller = page.getByTestId('conversation-scroll');
      if (closeBeforeReply) {
        await input(page).click();
        await resizeVisualViewport(page, 456.73);
        await expectVisibleLatest(page, 456.73);
      }
      await input(page).fill('coffee');
      await page.getByRole('button', { name: 'Send', exact: true }).click();
      if (closeBeforeReply) {
        const bounds = (await scroller.boundingBox())!;
        await page.mouse.click(bounds.x + 2, bounds.y + 40);
        await resizeVisualViewport(page, 742.55);
      }
      await expect(page.getByRole('status', { name: 'Grifon is typing', exact: true })).toHaveCount(0);
      await page.waitForTimeout(700);
      expect(await scroller.evaluate(node => node.scrollHeight - node.clientHeight)).toBe(0);
      const bounds = (await scroller.boundingBox())!;
      expect(await scroller.evaluate((node, y) => document.elementFromPoint(2, y) === node, bounds.y + 40)).toBe(true);
      await page.mouse.click(bounds.x + 2, bounds.y + 40);
      await input(page).click();
      await resizeVisualViewport(page, 456.73);
      await expectVisibleLatest(page, 456.73);
      await input(page).fill('Normal motion draft');
      await expectVisibleLatest(page, 456.73);
      await expect(input(page)).toHaveValue('Normal motion draft');
    });
  }

  for (const answers of [[], ['coffee'], ['coffee', 'Test Brand']]) {
    test(`${theme} ${answers.length}-answer chat follows latest through repeated keyboard reopen after a plain gutter tap`, async ({ page }) => {
      await openChat(page, theme, 393, 743, answers);
      await resizeVisualViewport(page, 742.55);
      const messages = await page.locator('.companion-message').allTextContents();
      const scroller = page.getByTestId('conversation-scroll');
      for (const draft of ['', 'Keep this unsent draft.']) {
        await input(page).click();
        await input(page).fill(draft);
        await resizeVisualViewport(page, 456.73);
        await expectVisibleLatest(page, 456.73);
        const gutter = await scroller.evaluate(node => {
          const headers = document.querySelectorAll('.companion-header');
          if (headers.length !== 1 || !headers[0].getClientRects().length) throw new Error('Expected one laid-out companion header');
          const header = headers[0].getBoundingClientRect(), y = header.y + header.height + 40;
          return { scrollTop: node.scrollTop, y, clear: document.elementFromPoint(2, y) === node };
        });
        expect(gutter.clear).toBe(true);
        // A real pointer tap dismisses the keyboard without scrolling history.
        await page.mouse.click(2, gutter.y);
        expect(await scroller.evaluate(node => node.scrollTop)).toBeCloseTo(gutter.scrollTop, 0);
        await resizeVisualViewport(page, 742.55);
        await input(page).click();
        await resizeVisualViewport(page, 456.73);
        await expectVisibleLatest(page, 456.73);
        await expect(input(page)).toHaveValue(draft);
      }
      expect(await page.locator('.companion-message').allTextContents()).toEqual(messages);
    });
  }

  test(`${theme} keyboard reopen follows again after the full viewport fits all history`, async ({ page }) => {
    await openChat(page, theme, 393, 743, []);
    await resizeVisualViewport(page, 742.55);
    await input(page).click();
    await resizeVisualViewport(page, 456.73);
    await expectVisibleLatest(page, 456.73);
    const scroller = page.getByTestId('conversation-scroll');
    const before = await scroller.evaluate(node => node.scrollTop);
    await scroller.hover();
    await page.mouse.wheel(0, -100);
    await expect.poll(() => scroller.evaluate(node => node.scrollTop)).toBeLessThan(before - 24);
    await resizeVisualViewport(page, 742.55);
    await expect.poll(() => scroller.evaluate(node => node.scrollHeight - node.clientHeight)).toBe(0);
    await input(page).click();
    await resizeVisualViewport(page, 456.73);
    await expectVisibleLatest(page, 456.73);
  });

  test(`${theme} real history scrolling retains its position through repeated visual keyboard reopen`, async ({ page }) => {
    await openChat(page, theme, 393, 743);
    await input(page).fill('Draft while reading older replies');
    await resizeVisualViewport(page, 742.55);
    const scroller = page.getByTestId('conversation-scroll');
    await scroller.hover();
    await page.mouse.wheel(0, -10000);
    await expect.poll(() => scroller.evaluate(node => node.scrollTop)).toBe(0);
    expect(await scroller.evaluate(node => node.scrollHeight - node.clientHeight)).toBeGreaterThan(24);
    const first = (await page.locator('.companion-message').first().boundingBox())!;
    for (const height of [456.73, 742.55, 456.73, 742.55]) {
      await resizeVisualViewport(page, height);
      expect(await scroller.evaluate(node => node.scrollTop)).toBe(0);
      expect((await page.locator('.companion-message').first().boundingBox())!.y).toBeCloseTo(first.y, 0);
      await expect(input(page)).toHaveValue('Draft while reading older replies');
      await expect(input(page)).toBeFocused();
    }
  });
}

for (const [width, fullHeight, reducedHeight] of [[390, 844, 510], [375, 667, 390]]) {
  for (const theme of ['dark', 'light']) {
    test(`${theme} ${width}px keyboard resize preserves latest reply, focus and draft`, async ({ page }) => {
      await openChat(page, theme, width, fullHeight);
      const messages = await page.locator('.companion-message').allTextContents();
      const avatar = await page.locator('iframe[title="Grifon animated companion"]').elementHandle();
      await input(page).fill('Keep this unsent launch draft.');
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.setViewportSize({ width, height: reducedHeight });
      await expectVisibleLatest(page, reducedHeight);
      await expect(input(page)).toHaveValue('Keep this unsent launch draft.');
      await page.setViewportSize({ width, height: fullHeight });
      await expectVisibleLatest(page, fullHeight);
      expect(await page.locator('.companion-message').allTextContents()).toEqual(messages);
      expect(await avatar!.evaluate(node => node.isConnected)).toBe(true);
    });
  }
}

for (const theme of ['dark', 'light']) {
  test(`${theme} visual-only keyboard resize and panning fit without resizing the layout viewport`, async ({ page }) => {
    await openChat(page, theme);
    await input(page).fill('Visual viewport draft');
    await page.evaluate(() => {
      const viewport = window.visualViewport!;
      const state = { height: 510, offsetTop: 0, scale: 1 };
      for (const key of ['height', 'offsetTop', 'scale'] as const) {
        Object.defineProperty(viewport, key, { configurable: true, get: () => state[key] });
      }
      (window as unknown as { keyboardViewport: typeof state }).keyboardViewport = state;
      viewport.dispatchEvent(new Event('resize'));
    });
    await expectVisibleLatest(page, 510);
    expect(await page.evaluate(() => innerHeight)).toBe(844);
    await page.evaluate(() => {
      Object.assign((window as unknown as { keyboardViewport: object }).keyboardViewport, { height: 430, offsetTop: 80 });
      window.visualViewport!.dispatchEvent(new Event('resize'));
      window.visualViewport!.dispatchEvent(new Event('scroll'));
    });
    await expectVisibleLatest(page, 510, 80);
    // Pinch zoom must retain native page geometry rather than relaying out chat.
    await page.evaluate(() => {
      Object.assign((window as unknown as { keyboardViewport: object }).keyboardViewport, { height: 255, offsetTop: 80, scale: 2 });
      window.visualViewport!.dispatchEvent(new Event('resize'));
    });
    // WebKit can quantize 100dvh to 843.984375px at this viewport. A half-pixel
    // tolerance still rejects relayout to the simulated 255px zoom viewport.
    await expect.poll(async () => (await page.locator('.companion-shell').boundingBox())!.height).toBeCloseTo(844, 0);
    expect((await page.locator('.companion-shell').boundingBox())!.y).toBeCloseTo(0, 0);
    await page.evaluate(() => {
      Object.assign((window as unknown as { keyboardViewport: object }).keyboardViewport, { height: 510, offsetTop: 0, scale: 1 });
      window.visualViewport!.dispatchEvent(new Event('resize'));
    });
    await expectVisibleLatest(page, 510);
    await expect(input(page)).toHaveValue('Visual viewport draft');
  });
}

test('keyboard resize preserves an older reading position', async ({ page }) => {
  await openChat(page, 'dark');
  await input(page).fill('Draft while reading history');
  const scroller = page.getByTestId('conversation-scroll');
  await scroller.evaluate(node => { node.scrollTop = 0; node.dispatchEvent(new Event('scroll')); });
  const before = await page.locator('.companion-message').first().boundingBox();
  await page.setViewportSize({ width: 390, height: 510 });
  await expect.poll(() => scroller.evaluate(node => {
    const header = document.querySelector('.companion-header')!.getBoundingClientRect();
    return Math.abs(node.clientHeight + header.height - 510);
  })).toBeLessThanOrEqual(1);
  // Let any queued resize work execute before checking that reading was retained.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await scroller.evaluate(node => node.scrollTop)).toBe(0);
  const after = await page.locator('.companion-message').first().boundingBox();
  expect(after!.y).toBeCloseTo(before!.y, 0);
  await expect(input(page)).toHaveValue('Draft while reading history');
});

test('layout keyboard resize still works when VisualViewport is unavailable', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'visualViewport', { configurable: true, value: undefined }));
  await openChat(page, 'light');
  await input(page).fill('Fallback draft');
  await page.setViewportSize({ width: 390, height: 510 });
  await expectVisibleLatest(page, 510);
  await expect(input(page)).toHaveValue('Fallback draft');
});
