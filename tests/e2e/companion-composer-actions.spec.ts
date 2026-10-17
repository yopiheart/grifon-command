import { test, expect, type Page } from '@playwright/test';

async function openComposer(page: Page, theme: string, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(theme => {
    localStorage.setItem('grifon-companion-appearance', theme);
    class RecognitionMock {
      onstart: (() => void) | null = null; onend: (() => void) | null = null;
      onresult: ((event: unknown) => void) | null = null;
      constructor() { Object.assign(window, { dictationFixture: this }); }
      start() { this.onstart?.(); } stop() { this.onend?.(); } abort() {}
    }
    Object.assign(window, { SpeechRecognition: RecognitionMock });
  }, theme);
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname.startsWith('/api/')) return route.abort();
    return route.continue();
  });
  await page.goto('/companion-chat-preview.html');
  await expect(page.getByRole('textbox', { name: 'Message Grifon' })).toBeVisible();
}

for (const theme of ['dark', 'light']) for (const [width, height] of [[375, 667], [1280, 900]]) {
  test(`${theme} composer keeps empty actions compact and preserves typed and dictated drafts at ${width}px`, async ({ page }) => {
    await openComposer(page, theme, width, height);
    const input = page.getByRole('textbox', { name: 'Message Grifon' });
    const send = page.getByRole('button', { name: 'Send', exact: true });
    await expect(page.getByRole('button', { name: 'Start live voice chat', exact: true })).toHaveCount(0);
    await expect(send).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Start voice input', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Attach product photo', exact: true })).toBeVisible();
    await input.fill('   ');
    await expect(send).toHaveCount(0);
    await expect(page.locator('#companion-save-status')).toContainText('Draft saved on this device.');
    await page.reload(); await expect(input).toHaveValue('   '); await expect(send).toHaveCount(0);
    await input.fill('Typed draft'); await expect(send).toBeVisible();
    const action = (await send.boundingBox())!;
    expect(action.width).toBe(44); expect(action.height).toBe(44);
    await expect(page.locator('#companion-save-status')).toContainText('Draft saved on this device.');
    await page.reload(); await expect(input).toHaveValue('Typed draft'); await expect(send).toBeVisible();
    await input.fill(''); await expect(send).toHaveCount(0);
    const messages = await page.locator('.companion-message').allTextContents();
    await page.getByRole('button', { name: 'Start voice input', exact: true }).click();
    await page.evaluate(() => (window as unknown as { dictationFixture: { onresult: (event: unknown) => void } }).dictationFixture.onresult({ results: [{ isFinal: true, 0: { transcript: 'Dictated draft' } }] }));
    await expect(input).toHaveValue('Dictated draft'); await expect(send).toBeVisible();
    expect(await page.locator('.companion-message').allTextContents()).toEqual(messages);
    await page.getByRole('button', { name: 'Stop voice input', exact: true }).click();
    await expect(input).toHaveValue('Dictated draft');
    await input.fill(''); await expect(send).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  });
}

for (const theme of ['dark', 'light']) {
  test(`${theme} composer tooltips explain mouse and keyboard actions and dismiss cleanly`, async ({ page }) => {
    await openComposer(page, theme, 1280, 900);
    for (const name of ['Attach product photo', 'Start voice input']) {
      await page.getByRole('button', { name, exact: true }).hover();
      await expect(page.getByRole('tooltip')).toHaveText(name);
      await page.keyboard.press('Escape'); await expect(page.getByRole('tooltip')).toHaveCount(0);
    }
    const input = page.getByRole('textbox', { name: 'Message Grifon' }); await input.fill('A draft');
    const send = page.getByRole('button', { name: 'Send', exact: true });
    await send.hover(); await expect(page.getByRole('tooltip')).toHaveText('Send');
    await page.mouse.move(0, 0); await expect(page.getByRole('tooltip')).toHaveCount(0);
    await input.focus(); await page.keyboard.press('Tab'); await expect(page.getByRole('tooltip')).toHaveText('Start voice input');
    await page.getByRole('button', { name: 'Start voice input', exact: true }).click();
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    const stop = page.getByRole('button', { name: 'Stop voice input', exact: true });
    await stop.hover(); await expect(page.getByRole('tooltip')).toHaveText('Stop voice input');
    await page.setViewportSize({ width: 375, height: 400 }); await expect(page.getByRole('tooltip')).toHaveCount(0);
    await stop.click();
  });
}

test.describe('touch composer', () => {
  test.use({ hasTouch: true, isMobile: true });
  for (const theme of ['dark', 'light']) {
    test(`${theme} controls do not leave a sticky tooltip after a tap`, async ({ page }) => {
      await openComposer(page, theme, 375, 667);
      await page.getByRole('button', { name: 'Start voice input', exact: true }).tap();
      await expect(page.getByRole('tooltip')).toHaveCount(0);
      await page.getByRole('button', { name: 'Stop voice input', exact: true }).tap();
      await expect(page.getByRole('tooltip')).toHaveCount(0);
      await page.getByRole('textbox', { name: 'Message Grifon' }).fill('A draft');
      await page.getByRole('button', { name: 'Send', exact: true }).tap();
      await expect(page.getByRole('tooltip')).toHaveCount(0);
      await expect(page.locator('.companion-message-user')).toHaveText('A draft');
    });
  }
});
