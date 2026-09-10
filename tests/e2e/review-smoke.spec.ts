// UI-only fixtures: no real auth, payment, generation, or wizard entry.
import { test, expect, type Page } from '@playwright/test';
async function checkoutFixture(page: Page, failIntent = false, delayAnnual = false) {
  await page.route('**/api/**', route => route.abort());
  await page.route('https://**', route => route.abort());
  await page.route(/\/services\/checkoutService\.ts(?:\?.*)?$/, route => route.fulfill({
    contentType: 'application/javascript',
    body: `
      export const formatPHP = n => '₱' + (n / 100).toLocaleString('en-PH', {minimumFractionDigits: 2});
      export const loadCheckoutDraft = () => JSON.parse(sessionStorage.getItem('test_checkout_draft') || 'null');
      export const saveCheckoutDraft = d => sessionStorage.setItem('test_checkout_draft', JSON.stringify(d));
      export const clearCheckoutDraft = () => sessionStorage.removeItem('test_checkout_draft');
      export async function fetchIntent(plan, cycle, addOns) {
        ${failIntent ? "throw new Error('Test checkout unavailable');" : ''}
        ${delayAnnual ? "if (cycle === 'annual') await new Promise(resolve => { (window.__annualResolvers ||= []).push(resolve); });" : ''}
        const total = cycle === 'annual' ? 2497200 : 249700;
        return { intent_id: 'fixture-' + cycle, client_key: 'fixture', status: 'awaiting_payment_method',
          plan: {id: plan, name: plan[0].toUpperCase() + plan.slice(1), billing_cycle: cycle, description: 'Fixture'},
          breakdown: {subtotal_centavos: total, vat_centavos: 0, total_centavos: total,
            add_on_centavos: 0, monthly_equivalent_centavos: total / 12, annual_savings_centavos: 499200}};
      }
      export async function processCardPayment() { throw new Error('Fixture payment declined'); }
      export async function processEwalletPayment(intent) { window.__submittedIntent = intent.intent_id; throw new Error('Fixture wallet unavailable'); }
    `,
  }));
  await page.route(/\/App\.tsx(?:\?.*)?$/, route => route.fulfill({
    contentType: 'application/javascript',
    body: `import React from '/node_modules/.vite/deps/react.js';
      import CheckoutPage from '/components/CheckoutPage.tsx';
      export default function App() { return React.createElement(CheckoutPage, {
        email: 'buyer@example.test', onBack: () => { window.location.href = '/pricing'; },
        onViewLegal: route => { window.__checkoutLegal = route; }
      }); }`,
  }));
  await page.goto('/checkout?plan=pro&cycle=monthly');
}

for (const width of [375,1280]) {
  test(`independent card failure can retry at ${width}`,async({page})=>{
    await page.setViewportSize({width,height:width===375?667:900});
    await checkoutFixture(page);
    await page.getByRole('radio',{name:/^Annual/}).click();
    await page.getByRole('radio',{name:/^Monthly/}).click();
    await page.getByLabel('Contact number').fill('09123456789');
    await page.getByPlaceholder('1234 1234 1234 1234').fill('4242424242424242');
    await page.getByPlaceholder('MM / YY').fill('1230');
    await page.getByPlaceholder('CVC').fill('123');
    await page.getByPlaceholder('Full name on card').fill('Fixture Buyer');
    const pay=page.getByRole('button',{name:/^Pay /});
    await expect(pay).toBeDisabled();
    await page.locator('.terms-consent input').check();
    await pay.click();
    await expect(page.getByText('Fixture payment declined')).toBeVisible();
    await expect(pay).toBeEnabled();
    await pay.click();
    await expect(page.getByText('Fixture payment declined')).toBeVisible();
    await expect(page.getByPlaceholder('Full name on card')).toHaveValue('Fixture Buyer');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.locator('form').screenshot({path:`test-results/review-card-${width}.png`});
    await page.reload();
    await expect(page.getByPlaceholder('1234 1234 1234 1234')).toHaveValue('');
  });
}
test('independent reported progress handles zero, partial, and unknown honestly',async({page})=>{
  await page.route('**/api/**',r=>r.abort());
  await page.route('https://**',r=>r.abort());
  await page.route(/\/App\.tsx(?:\?.*)?$/,r=>r.fulfill({contentType:'application/javascript',body:`
    import React from '/node_modules/.vite/deps/react.js';
    import {ActiveJobsPanel} from '/components/ui/ActiveJobsPanel.tsx';
    export default function App(){return React.createElement(ActiveJobsPanel,{jobs:[
      {id:'zero',kind:'video',label:'Starting render',progress:0,startedAt:Date.now()},
      {id:'partial',kind:'video',label:'Rendering scenes',progress:0.42,startedAt:Date.now()},
      {id:'unknown',kind:'video',label:'Awaiting report',startedAt:Date.now()}
    ]});}` }));
  await page.setViewportSize({width:375,height:667});
  await page.goto('/app');
  await expect(page.getByRole('progressbar',{name:'Starting render'})).toHaveAttribute('aria-valuenow','0');
  await expect(page.getByRole('progressbar',{name:'Rendering scenes'})).toHaveAttribute('aria-valuenow','42');
  await expect(page.getByRole('progressbar',{name:'Awaiting report'})).not.toHaveAttribute('aria-valuenow');
  await expect(page.getByText('42% reported progress')).toBeVisible();
  await page.screenshot({path:'test-results/review-progress.png'});
});

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


test('independent pricing FAQ operates by keyboard',async({page})=>{
  await page.goto('/pricing');
  const faq=page.locator('details').first();
  await faq.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(faq).toHaveAttribute('open','');
  await expect(faq.locator('p')).toBeVisible();
  await page.keyboard.press('Space');
  await expect(faq).not.toHaveAttribute('open','');
});
test('independent real saved-store failure retains a check-again path',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.addInitScript(()=>{
    Object.defineProperty(indexedDB,'open',{value:()=>{throw new DOMException('Fixture storage denied','SecurityError');}});
  });
  await dashboardFixture(page);
  await page.unroute(/\/services\/wizardSessionStore\.ts(?:\?.*)?$/);
  await page.reload();
  const work=page.getByRole('region',{name:'Your work'});
  await expect(work.getByText('No saved Director ad plan found on this device')).toBeVisible();
  await expect(work.getByRole('button',{name:'Check again',exact:true})).toBeVisible();
  await work.getByRole('button',{name:'Check again',exact:true}).click();
  await expect(work.getByRole('button',{name:'Check again',exact:true})).toBeVisible();
  await expect(work.getByText(/finished video|finished.ad|saved successfully/i)).toHaveCount(0);
  await work.screenshot({path:'test-results/review-storage-375.png'});
});

test('changing to a pending billing cycle cannot submit the previous intent',async({page})=>{
  await checkoutFixture(page,false,true);
  await page.getByRole('button',{name:'GCash',exact:true}).click();
  await page.getByLabel('Contact number').fill('09123456789');
  await page.locator('.terms-consent input').check();
  const pay=page.getByRole('button',{name:'Continue with GCash',exact:true});
  await expect(pay).toBeEnabled();
  await page.getByRole('radio',{name:/^Annual/}).click();
  await expect(pay).toBeDisabled();
  await page.evaluate(() => (window as any).__annualResolvers.forEach((resolve: () => void) => resolve()));
  await expect(pay).toBeEnabled();
  await pay.click();
  expect(await page.evaluate(() => (window as any).__submittedIntent)).toBe('fixture-annual');
});


test('pending billing total preserves entered card data',async({page})=>{
  await checkoutFixture(page,false,true);
  const card=page.getByPlaceholder('1234 1234 1234 1234');
  await card.fill('4242424242424242');
  await page.getByRole('radio',{name:/^Annual/}).click();
  await expect(card).toHaveValue('4242 4242 4242 4242');
  await expect(page.getByRole('button',{name:/Updating total/})).toBeDisabled();
  await page.evaluate(() => (window as any).__annualResolvers.forEach((resolve: () => void) => resolve()));
  await expect(page.getByRole('button',{name:/^Pay /})).toBeVisible();
  await expect(card).toHaveValue('4242 4242 4242 4242');
});

test('saved Step 8 ad plan invokes the resume callback without entering the wizard',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await dashboardFixture(page,'draft');
  await page.getByRole('region',{name:'Your work'}).getByRole('button',{name:'Open ad plan',exact:true}).click();
  expect(await page.evaluate(() => (window as any).__resumed)).toBe(true);
  await expect(page.getByText('What are we selling today?')).toBeVisible();
});
