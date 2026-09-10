import { test, expect, type Page } from '@playwright/test';

// Exercise real dashboard UI with deterministic local data. No account,
// server-render polling, provider generation, or persistent project is touched.
async function dashboardFixture(page: Page, state: 'empty' | 'draft' | 'loading' = 'empty') {
  await page.route('**/api/**', route => route.abort());
  await page.route('https://**', route => route.abort());
  await page.route(/\/hooks\/useSubscription\.ts(?:\?.*)?$/, route => route.fulfill({
    contentType: 'application/javascript', body: `export const useSubscription = () => ({plan_id:'free', status:'active', loading:false});`,
  }));
  await page.route(/\/hooks\/useQuota\.ts(?:\?.*)?$/, route => route.fulfill({
    contentType: 'application/javascript', body: `const unit={used:0,limit:1,remaining:1};
      export const useQuota=()=>({plan:'free',loading:${state === 'loading'},loaded:${state !== 'loading'},
      workflows:unit,reports:unit,captions:unit,images:unit,video_ads:{used:0,limit:0,remaining:0},omni_ads:unit,
      credits:{video_ad_credits:0,cinematic_credits:0,omni_style_credits:0},refetch:()=>{}});`,
  }));
  await page.route(/\/hooks\/useServerRenderJobs\.ts(?:\?.*)?$/, route => route.fulfill({
    contentType: 'application/javascript', body: 'export const useServerRenderJobs = () => {};',
  }));
  await page.route(/\/services\/wizardSessionStore\.ts(?:\?.*)?$/, route => route.fulfill({
    contentType: 'application/javascript', body: `export const getSession=async()=>${state === 'draft'
      ? "({version:1,currentStep:8,savedAt:Date.now(),clientDetails:{brandName:'Cebu bakery'},storyboard:[],videoPrompts:[]})"
      : state === 'loading' ? 'new Promise(()=>{})' : 'null'};
      export const clearSession=async()=>{window.__discarded=true;};`,
  }));
  await page.route(/\/App\.tsx(?:\?.*)?$/, route => route.fulfill({
    contentType: 'application/javascript', body: `import React from '/node_modules/.vite/deps/react.js';
      import Dashboard from '/components/Dashboard.tsx';
      import { startJob } from '/services/activeJobsService.ts';
      ${state === 'draft' ? "startJob({id:'fixture',kind:'video',label:'Bakery launch ad',detail:'Preparing your scenes'});" : ''}
      export default function App(){return React.createElement(Dashboard,{
        userEmail:'owner@example.test',userId:'fixture-user',
        onSelectModule:id=>{window.__selectedModule=id;},onUpgrade:()=>{window.__upgrade=true;},
        onResumeFinishedAd:()=>{window.__resumed=true;}
      });}`,
  }));
  await page.goto('/app');
  await expect(page.getByText('What are we selling today?')).toBeVisible();
}

test('mobile dashboard menu traps focus, closes with Escape and preserves locked routing', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await dashboardFixture(page);
  const open = page.getByRole('button', { name: 'Menu', exact: true });
  await open.click();
  const drawer = page.getByRole('dialog');
  await expect(drawer).toBeVisible();
  const controls = drawer.locator('button:visible, a:visible, input:visible');
  await controls.last().focus();
  await page.keyboard.press('Tab');
  await expect(controls.first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(drawer).not.toBeVisible();
  await expect(open).toBeFocused();
  await open.click();
  await drawer.getByRole('button', { name: /Recon/ }).click();
  expect(await page.evaluate(() => (window as any).__selectedModule)).toBe('market_research');
  await expect(drawer).not.toBeVisible();
  await open.click();
  await drawer.getByRole('button', { name: /Render Bay/ }).click();
  expect(await page.evaluate(() => (window as any).__upgrade)).toBe(true);
  expect(await page.evaluate(() => (window as any).__selectedModule)).toBe('market_research');
});

for (const width of [375, 1280]) {
  test(`dashboard saved plan and indeterminate job are truthful at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 375 ? 667 : 900 });
    await dashboardFixture(page, 'draft');
    await expect(page.getByText('Cebu bakery', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Bakery launch ad')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Your work' }).getByText(/finished.ad|finished video/i)).toHaveCount(0);
    const progress = page.getByRole('progressbar', { name: /Bakery launch ad/ });
    await expect(progress).toBeVisible();
    await expect(progress).not.toHaveAttribute('aria-valuenow');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/dashboard-draft-${width}.png`, fullPage: true });
  });
}

test('dashboard loading does not claim an empty saved project list or exhausted quota', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await dashboardFixture(page, 'loading');
  await expect(page.getByText(/loading.*(?:saved|project|draft)|checking.*(?:saved|project|draft)/i).first()).toBeVisible();
  await expect(page.getByText(/0 left|no saved/i)).toHaveCount(0);
  await page.screenshot({ path: 'test-results/dashboard-loading-375.png', fullPage: true });
});
