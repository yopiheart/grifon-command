import { test, expect } from '@playwright/test';

test('desktop wheel scroll reveals the film and module CTA preserves its route', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.locator('.landing-hero-copy')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: 'test-results/landing-desktop-intro.png' });
  await page.mouse.wheel(0, 850);
  await expect(page.locator('.landing-hero-copy')).toHaveCSS('opacity', '0');
  await page.screenshot({ path: 'test-results/landing-desktop-reveal.png' });
  await page.getByRole('button', { name: 'Research my market' }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('grifon_intended_module'))).toBe('market_research');
});

test('mobile hero reveals the blank film through native scroll and restores its CTA', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const hero = page.locator('.landing-hero');
  const copy = page.locator('.landing-hero-copy');
  const film = page.locator('#hero-film');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your next ad.');
  await expect(hero.locator('video, source')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/landing-mobile-intro.png' });
  await page.getByRole('link', { name: 'Explore the story' }).click();
  await expect(copy).toHaveAttribute('aria-hidden', 'true');
  await expect(copy).toHaveCSS('opacity', '0');
  await expect.poll(() => film.evaluate(el => {
    const rect = el.getBoundingClientRect();
    return rect.top > 64 && rect.bottom < window.innerHeight;
  })).toBe(true);
  await expect.poll(() => copy.evaluate(el => el.inert)).toBe(true);
  await page.screenshot({ path: 'test-results/landing-mobile-reveal.png' });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(() => copy.evaluate(el => el.inert)).toBe(false);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await hero.getByRole('button', { name: 'Start my first ad' }).click();
  await expect(page.getByRole('dialog', { name: 'Anong business mo?' })).toBeVisible();
  await page.getByRole('button', { name: 'Skip muna' }).click();
  await expect(page).toHaveURL(/\/login/);
});

test('reduced-motion landing keeps the hero readable and FAQ works with a keyboard', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const hero = page.locator('.landing-hero');
  await expect(hero).toHaveClass(/landing-hero-static/);
  const question = page.getByRole('button', { name: 'What can I try for free?' });
  await question.focus();
  await page.keyboard.press('Enter');
  await expect(question).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('region', { name: 'What can I try for free?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Do I need design or editing experience?' })).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Space');
  await expect(question).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('button', { name: 'Explore the plans' }).click();
  await expect(page).toHaveURL(/\/pricing/);
  await expect(page.getByText('Starter', { exact: true }).first()).toBeVisible();
});
