import { test, expect } from '@playwright/test';

test.use({ video: { mode: 'on', size: { width: 1280, height: 900 } } });

for (const viewport of [{ width: 1280, height: 900 }, { width: 375, height: 667 }]) {
  test.describe(`headline motion at ${viewport.width}px`, () => {
    test('highlight visibly travels once then settles, with a static reduced-motion equivalent', async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      const title = page.locator('.landing-gold-type');
      await expect(title).toBeVisible();
      const positions: string[] = [];
      // Observe the real animation clock; the video captures the complete pass.
      for (let frame = 0; frame < 35; frame++) {
        positions.push(await title.evaluate(el => getComputedStyle(el).backgroundPosition));
        if ([4, 12, 18].includes(frame)) {
          await title.screenshot({ path: `test-results/hero-title-${viewport.width}-${frame}.png` });
        }
        await page.waitForTimeout(100);
      }
      expect(new Set(positions).size).toBeGreaterThan(5);
      const settled = positions.at(-1);
      await page.waitForTimeout(800);
      expect(await title.evaluate(el => getComputedStyle(el).backgroundPosition)).toBe(settled);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.reload();
      await expect(title).toHaveCSS('background-image', 'none');
      await expect(title).toHaveCSS('text-shadow', 'none');
      await expect(title).toHaveCSS('color', 'rgb(255, 204, 0)');
    });
  });

  test(`gold hero trails part, clear the film and reverse at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const hero = page.locator('.landing-hero');
    const trails = hero.locator('.landing-hero-trails');
    const copy = hero.locator('.landing-hero-copy');
    const opacity = () => trails.evaluate(el => Number(getComputedStyle(el).opacity));
    const goToProgress = async (progress: number) => {
      await hero.evaluate((el, p) => window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY
          + (el.clientHeight - window.innerHeight) * p,
        behavior: 'instant',
      }), progress);
    };
    const wingCenters = () => hero.locator('[data-trail-wing]').evaluateAll(els =>
      els.map(el => { const r = el.getBoundingClientRect(); return r.x + r.width / 2; }));

    await expect(trails).toHaveAttribute('aria-hidden', 'true');
    await expect(trails).toHaveCSS('pointer-events', 'none');
    await expect.poll(opacity).toBe(0);
    await page.screenshot({ path: `test-results/hero-gold-${viewport.width}-intro.png` });
    await goToProgress(0.45);
    await expect.poll(opacity).toBeGreaterThan(0.5);
    await expect(copy).toHaveCSS('opacity', '0');
    const middle = await wingCenters();
    expect(middle).toHaveLength(2);
    expect(middle[0]).toBeLessThan(viewport.width / 2);
    expect(middle[1]).toBeGreaterThan(viewport.width / 2);
    await page.screenshot({ path: `test-results/hero-gold-${viewport.width}-opening.png` });

    await goToProgress(0.7);
    await expect.poll(async () => (await wingCenters())[0]).toBeLessThan(middle[0] - 5);
    await expect.poll(async () => (await wingCenters())[1]).toBeGreaterThan(middle[1] + 5);
    await page.screenshot({ path: `test-results/hero-gold-${viewport.width}-clearing.png` });
    await goToProgress(1);
    await expect.poll(opacity).toBe(0);
    await expect(hero.locator('video, source')).toHaveCount(0);
    await expect.poll(() => page.locator('#hero-film').evaluate(el => {
      const r = el.getBoundingClientRect();
      return r.top >= 64 && r.bottom < innerHeight;
    })).toBe(true);
    await page.screenshot({ path: `test-results/hero-gold-${viewport.width}-film.png` });

    await goToProgress(0.45);
    await expect.poll(opacity).toBeGreaterThan(0.5);
    await expect.poll(async () => Math.abs((await wingCenters())[0] - middle[0])).toBeLessThan(1);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await expect.poll(opacity).toBe(0);
    await expect(copy).toHaveCSS('opacity', '1');
    await expect.poll(() => copy.evaluate(el => el.inert)).toBe(false);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await hero.getByRole('button', { name: 'Build my free ad plan' }).click();
    await expect(page.getByRole('dialog', { name: 'What do you sell?' })).toBeVisible();
  });
}

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
  await hero.getByRole('button', { name: 'Build my free ad plan' }).click();
  await expect(page.getByRole('dialog', { name: 'What do you sell?' })).toBeVisible();
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await expect(page).toHaveURL(/\/login/);
});

test('reduced-motion landing keeps the hero readable and FAQ works with a keyboard', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const hero = page.locator('.landing-hero');
  await expect(hero).toHaveClass(/landing-hero-static/);
  await expect(hero.locator('.landing-hero-trails')).toHaveCount(0);
  await expect(hero.locator('.landing-hero-copy')).toHaveCSS('opacity', '1');
  const question = page.getByRole('button', { name: 'What can I try for free?' });
  await question.focus();
  await page.keyboard.press('Enter');
  await expect(question).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('region', { name: 'What can I try for free?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Do I need design or editing experience?' })).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Space');
  await expect(question).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('button', { name: 'Compare the plans' }).click();
  await expect(page).toHaveURL(/\/pricing/);
  await expect(page.getByText('Starter', { exact: true }).first()).toBeVisible();
});
