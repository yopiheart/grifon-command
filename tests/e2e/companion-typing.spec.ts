import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const QA = path.resolve(process.env.COMPANION_QA_DIR || 'assets/3d-lab/grifon-companion-chat/qa/typing');
const phase = process.env.COMPANION_TYPING_PHASE || 'final';
const input = (page: Page) => page.getByRole('textbox', { name: 'Message Grifon' });
const typing = (page: Page) => page.getByRole('status', { name: 'Grifon is typing', exact: true });

async function openFixture(page: Page, fakeClock = true) {
  if (fakeClock) await page.clock.install({ time: new Date('2026-10-07T12:00:00Z') });
  await page.route('**/*', route => {
    const req = route.request(); const url = new URL(req.url());
    if (req.method() === 'GET' && ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
    if (!['http://127.0.0.1:5173', 'http://localhost:5173'].includes(url.origin) || url.pathname.startsWith('/api/')) return route.abort();
    return route.continue();
  });
  await page.goto('/companion-chat-preview.html');
  await expect(input(page)).toBeVisible();
  await expect(page.locator('iframe:visible')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
  if (fakeClock) {
    // Let loading timers run, then pause beyond the unchanged 60s test cap.
    await page.clock.pauseAt(new Date('2026-10-07T14:00:00Z'));
  }
}

test('intake reply waits through 499ms and arrives at 600ms with accessible typing status', async ({ page }) => {
  await openFixture(page);
  await input(page).fill('Cold brew for busy parents.');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByTestId('conversation-scroll').getByText('Cold brew for busy parents.', { exact: true })).toBeVisible();
  const immediate = { typing: await typing(page).count(), assistantMessages: await page.locator('article .companion-message-assistant').count() };
  fs.mkdirSync(QA, { recursive: true });
  fs.writeFileSync(path.join(QA, `${phase}-timing-baseline.json`), JSON.stringify(immediate, null, 2));
  await page.screenshot({ path: path.join(QA, `${phase}-timing-initial.png`) });
  expect.soft(immediate.typing, 'show an accessible typing status immediately after accepting the answer').toBe(1);
  expect.soft(immediate.assistantMessages, 'next intake question must not arrive immediately').toBe(1);
  // Check exact timer boundaries without stepping every unrelated render frame.
  await page.clock.fastForward(499);
  expect.soft(await typing(page).count(), 'typing remains visible for at least 500ms').toBe(1);
  expect.soft(await page.locator('article .companion-message-assistant').count()).toBe(1);
  await page.clock.fastForward(101);
  await expect(typing(page)).toHaveCount(0);
  await expect(page.locator('article .companion-message-assistant')).toHaveCount(2);
  await expect(page.locator('article .companion-message-assistant').last()).toContainText('brand name');
});

test('all five intake steps are paced; double Enter cannot consume a second answer and typing keeps focus', async ({ page }) => {
  await openFixture(page);
  const answers = ['Cold brew for busy parents.', 'North Coffee', 'Morning brew', 'Two bottles for 199', '199'];
  for (const [index, answer] of answers.entries()) {
    await input(page).fill(answer);
    await input(page).press('Enter');
    await input(page).press('Enter');
    await expect(page.locator('.companion-message-user')).toHaveCount(index + 1);
    await expect(typing(page)).toBeVisible();
    await expect(input(page)).toBeFocused();
    await expect(input(page)).toBeEnabled();
    await input(page).fill('Draft for the next answer');
    await input(page).press('Enter');
    await expect(input(page)).toHaveValue('Draft for the next answer');
    await expect(page.getByRole('button', { name: 'Send', exact: true })).toBeDisabled();
    await page.clock.fastForward(499);
    expect(await page.locator('article .companion-message-assistant').count()).toBe(index + 1);
    expect(await page.locator('.companion-message-user').count()).toBe(index + 1);
    expect(await page.locator('[aria-label="Review your brief"]').count()).toBe(0);
    await page.clock.fastForward(101);
    await expect(typing(page)).toHaveCount(0);
    await expect(page.locator('article .companion-message-assistant')).toHaveCount(index + 2);
    await expect(input(page)).toHaveValue('Draft for the next answer');
    await expect(input(page)).toBeFocused();
  }
  await expect(page.getByRole('heading', { name: 'Your product ad', exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).companionFixture.snapshot().calls)).toEqual([]);
});

test('reset cancels the pending reply without reviving the old brief', async ({ page }) => {
  await openFixture(page);
  await input(page).fill('Old brief'); await input(page).press('Enter');
  await expect(typing(page)).toBeVisible();
  await page.getByRole('button', { name: 'New chat', exact: true }).click();
  await page.clock.runFor(1000);
  await expect(typing(page)).toHaveCount(0);
  await expect(page.locator('.companion-message-user')).toHaveCount(0);
  await expect(page.locator('article .companion-message-assistant')).toHaveCount(1);
  await expect(page.locator('article .companion-message-assistant')).toContainText('What product');
});

test('account remount isolates the pending reply and restores the accepted answer', async ({ page }) => {
  await openFixture(page);
  await input(page).fill('Account A accepted answer'); await input(page).press('Enter');
  await expect(typing(page)).toBeVisible();
  await page.evaluate(() => (window as any).companionFixture.account('fixture-user-b'));
  await page.clock.runFor(1000);
  await expect(page.locator('.companion-message-user')).toHaveCount(0);
  await expect(page.locator('article .companion-message-assistant')).toHaveCount(1);
  await expect(typing(page)).toHaveCount(0);
  await page.evaluate(() => (window as any).companionFixture.account('fixture-user-a'));
  await expect(page.getByTestId('conversation-scroll').getByText('Account A accepted answer', { exact: true })).toBeVisible();
  await expect(page.locator('article .companion-message-assistant')).toHaveCount(2);
  await expect(page.locator('article .companion-message-assistant').last()).toContainText('brand name');
});

for (const lifecycle of ['reload', 'leave-and-return']) {
  test(`${lifecycle} during typing retains the accepted answer and its next question`, async ({ page }) => {
    await openFixture(page);
    await input(page).fill('Persist this accepted answer'); await input(page).press('Enter');
    await expect(typing(page)).toBeVisible();
    await expect(page.locator('#companion-save-status')).toContainText('Draft saved on this device.');
    if (lifecycle === 'reload') await page.reload();
    else { await page.goto('about:blank'); await page.goto('/companion-chat-preview.html'); }
    await expect(page.getByTestId('conversation-scroll').getByText('Persist this accepted answer', { exact: true })).toBeVisible();
    await page.clock.runFor(1000);
    await expect(typing(page)).toHaveCount(0);
    await expect(page.locator('.companion-message-user')).toHaveCount(1);
    await expect(page.locator('article .companion-message-assistant')).toHaveCount(2);
    await expect(page.locator('article .companion-message-assistant').last()).toContainText('brand name');
  });
}

test('reduced motion keeps the typing indicator static while preserving the delay', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openFixture(page);
  await input(page).fill('A reduced motion brief'); await input(page).press('Enter');
  await expect(typing(page)).toBeVisible();
  expect(await typing(page).evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
  await page.clock.fastForward(499);
  await expect(typing(page)).toBeVisible();
  await page.clock.fastForward(101);
  await expect(typing(page)).toHaveCount(0);
  await expect(page.locator('article .companion-message-assistant')).toHaveCount(2);
});

for (const [width, height] of [[375, 667], [390, 844], [1280, 900]]) {
  test(`typing and delivered typography plus golden user bubble at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openFixture(page);
    await input(page).fill('Cold brew for busy parents.'); await input(page).press('Enter');
    await expect(typing(page)).toBeVisible();
    // Advance only enough for scrolling/layout, while the 600ms reply stays pending.
    await page.clock.runFor(200);
    await expect(typing(page)).toBeInViewport();
    fs.mkdirSync(QA, { recursive: true });
    await page.screenshot({ path: path.join(QA, `${phase}-typing-${width}.png`) });
    await page.clock.runFor(400);
    await expect(typing(page)).toHaveCount(0);
    await page.clock.runFor(500);
    await expect(page.locator('article .companion-message-assistant').last()).toBeInViewport();
    const metrics = await page.evaluate(() => {
      const css = (selector: string) => { const style = getComputedStyle(document.querySelector(selector)!); return { font: style.fontFamily, size: style.fontSize, weight: style.fontWeight, color: style.color, background: style.backgroundColor, image: style.backgroundImage, border: style.borderColor }; };
      return { user: css('.companion-message-user'), assistant: css('article .companion-message-assistant'), input: css('.companion-message-input'), button: css('.companion-shell button'), timestamp: css('[data-testid="conversation-time-divider"] time'), overflow: document.documentElement.scrollWidth - innerWidth };
    });
    fs.writeFileSync(path.join(QA, `${phase}-typography-${width}.json`), JSON.stringify(metrics, null, 2));
    for (const metric of [metrics.user, metrics.assistant, metrics.input]) {
      expect(metric.font.split(',')[0].replaceAll('"', '').trim()).toBe('Inter');
      expect(metric.size).toBe('14px');
    }
    expect(metrics.user.weight).toBe('400'); expect(metrics.input.weight).toBe('400');
    expect(metrics.button.font.split(',')[0].replaceAll('"', '').trim()).toBe('Inter');
    expect(metrics.button.size).toBe('14px');
    expect(metrics.button.weight).toBe('600');
    expect(metrics.timestamp.font).toContain('JetBrains Mono');
    expect(metrics.overflow).toBeLessThanOrEqual(0);
    expect(`${metrics.user.background} ${metrics.user.image} ${metrics.user.border}`).toContain('255, 204, 0');
    expect(metrics.user.background + metrics.user.image).not.toBe(metrics.assistant.background + metrics.assistant.image);
    await page.screenshot({ path: path.join(QA, `${phase}-delivered-${width}.png`) });
    await page.emulateMedia({ contrast: 'more' });
    const goldEdge = await page.locator('.companion-message-user').evaluate(element => getComputedStyle(element).borderColor);
    expect(goldEdge).toContain('255, 204, 0');
  });
}

test('real timer delivers the next question without provider activity', async ({ page }) => {
  await openFixture(page, false);
  await page.evaluate(() => {
    const start = performance.now();
    const marks: Record<string, number> = {};
    const observer = new MutationObserver(() => {
      if (document.querySelector('.companion-message-user') && marks.accepted === undefined) marks.accepted = performance.now() - start;
      if (document.querySelector('[role="status"][aria-label="Grifon is typing"]') && marks.typing === undefined) marks.typing = performance.now() - start;
      if (document.querySelectorAll('article .companion-message-assistant').length === 2 && marks.delivered === undefined) { marks.delivered = performance.now() - start; observer.disconnect(); }
    });
    observer.observe(document.querySelector('[data-testid="conversation-scroll"]')!, { childList: true, subtree: true });
    (window as any).typingTimingMarks = marks;
  });
  await input(page).fill('Real timer observation'); await input(page).press('Enter');
  await expect(page.locator('article .companion-message-assistant')).toHaveCount(2);
  const observation = await page.evaluate(() => ({ marks: (window as any).typingTimingMarks, calls: (window as any).companionFixture.snapshot().calls }));
  fs.mkdirSync(QA, { recursive: true });
  fs.writeFileSync(path.join(QA, `${phase}-real-timing.json`), JSON.stringify(observation, null, 2));
  expect(observation.calls).toEqual([]);
  // Deterministic timing bounds are asserted with page.clock above; this records
  // the production browser timer without imposing a load-sensitive wall-time gate.
  expect(observation.marks.typing).toBeDefined();
  expect(observation.marks.delivered).toBeGreaterThan(observation.marks.accepted);
});

test('result revision controls respond immediately without an intake typing delay', async ({ page }) => {
  await openFixture(page);
  await page.evaluate(() => (window as any).companionFixture.emit('result'));
  await input(page).fill('style clean'); await input(page).press('Enter');
  expect(await typing(page).count()).toBe(0);
  await expect(page.locator('article .companion-message-assistant').last()).toContainText('Clean is selected.');
  await page.getByRole('button', { name: 'Open first cut', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Apply style', exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).companionFixture.snapshot().calls.some((call: any) => call.name === 'choosePreset'))).toBe(false);
});
