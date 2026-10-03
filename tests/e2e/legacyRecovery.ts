import { expect, type BrowserContext, type Page } from '@playwright/test';
import type { WizardSessionV1 } from '../../services/wizardSessionStore.js';

export const LEGACY_USER = 'legacy-recovery-user';
export const PRODUCT_PHOTO = 'public/examples/ex-product-handheld.png';
export const SCRIPT = {
  hook1: ['A useful little upgrade for your everyday routine.'],
  hook2: ['Meet your new daily favorite.'],
  body: ['Try Recovery Goods today for 199.'],
};

// Only auth/account data is substituted as a module, matching route-consistency.
// The real App, generation adapters and IndexedDB stores run unchanged.
export async function legacyBackend(context: BrowserContext) {
  const calls: string[] = [];
  const unexpected: string[] = [];
  let heldImage: (() => Promise<void>) | undefined;
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://localhost:5173') return route.abort();
    if (url.pathname === '/services/supabaseClient.ts' && !url.searchParams.has('legacy-original')) {
      return route.fulfill({ contentType: 'application/javascript', body: `
        export * from '/services/supabaseClient.ts?legacy-original';
        const session={access_token:'test-only-token',user:{id:'${LEGACY_USER}',email:'buyer@example.test',user_metadata:{}}};
        const query={select:()=>query,eq:()=>query,order:()=>query,limit:()=>query,
          maybeSingle:async()=>({data:null}),single:async()=>({data:null}),then:resolve=>resolve({data:[]})};
        const channel={on:()=>channel,subscribe:()=>channel};
        const client={auth:{getSession:async()=>({data:{session}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe:()=>{}}}})},
          from:()=>query,channel:()=>channel,removeChannel:()=>{}};
        export const getSupabase=()=>client;
      ` });
    }
    if (!url.pathname.startsWith('/api/') || url.pathname.startsWith('/api/_lib/')) return route.continue();
    const key = url.pathname + url.search;
    if (key === '/api/events') return route.fulfill({ json: { ok: true } });
    if (key === '/api/billing?action=usage') {
      const unit = { used: 0, remaining: 10, limit: 10 };
      return route.fulfill({ json: { plan: 'free', workflows: unit, reports: unit, captions: unit,
        images: unit, video_ads: unit, omni_ads: unit,
        credits: { video_ad_credits: 0, cinematic_credits: 0, omni_style_credits: 0 } } });
    }
    if (key === '/api/render/final/list') return route.fulfill({ json: { jobs: [] } });
    if (key === '/api/elevenlabs/voices') return route.fulfill({ json: { stockVoices: [], myVoices: [], libraryVoices: [] } });
    if (key === '/api/gemini/text') {
      const body = route.request().postDataJSON();
      if (body.flow === 'marketmind') {
        calls.push('marketmind');
        return route.fulfill({ json: { winningAvatar: 'Everyday shoppers', emotionalPayoff: 'An easier routine' } });
      }
      if (body.flow === 'adscript') {
        calls.push('adscript');
        return route.fulfill({ json: SCRIPT });
      }
      if (body.contents?.parts?.some((part: { inlineData?: unknown }) => part.inlineData)) {
        calls.push('describe-upload');
        return route.fulfill({ json: { text: 'A handheld product in its original packaging.' } });
      }
    }
    if (key === '/api/gemini/image') {
      calls.push('image');
      // Hold the real chain after the script stage. The test closes its page
      // before releasing this route; no generated image is ever delivered.
      await new Promise<void>(resolve => {
        heldImage = async () => {
          try { await route.abort(); } catch { /* closing the page may cancel it first */ }
          resolve();
        };
      });
      return;
    }
    unexpected.push(key);
    return route.abort();
  });
  return { calls, unexpected, interrupt: async () => heldImage?.() };
}

export async function readStored<T>(page: Page, database: string, store: string, key: string): Promise<T | null> {
  return page.evaluate(({ database, store, key }) => new Promise(resolve => {
    const request = indexedDB.open(database, 1);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(store)) { db.close(); resolve(null); return; }
      const tx = db.transaction(store, 'readonly');
      const get = tx.objectStore(store).get(key);
      get.onsuccess = () => resolve(get.result ?? null);
      tx.oncomplete = () => db.close();
    };
    request.onerror = () => resolve(null);
  }), { database, store, key }) as Promise<T | null>;
}

export async function enterOneShot(page: Page) {
  await expect(page.getByText('What are we selling today?')).toBeVisible();
  await page.getByRole('button', { name: 'Make a video ad', exact: true }).click();
}

export async function fillBrief(page: Page) {
  await page.getByPlaceholder('Describe your offer', { exact: false }).fill('A daily upgrade for 199, available this week.');
  await page.getByPlaceholder('Brand name', { exact: true }).fill('Recovery Goods');
  await page.getByPlaceholder('Price', { exact: false }).fill('199');
  await page.getByRole('button', { name: 'Product Tap to add', exact: true }).click();
  await page.locator('input[type="file"]').first().setInputFiles(PRODUCT_PHOTO);
  await expect(page.getByRole('img', { name: 'Upload', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Make My Ad', exact: true })).toBeEnabled();
}

export function completedSession(): WizardSessionV1 {
  return {
    version: 1, savedAt: Date.now(), currentStep: 8,
    clientDetails: { brandName: 'Recovery Goods', offer: 'A daily upgrade for 199' },
    businessInfo: { product: 'Daily upgrade', audience: 'Everyday shoppers', benefit: 'An easier routine', painPoint: '', separator: '', features: '', scriptType: 'Testimonial' },
    script: SCRIPT, language: 'English', finalScript: [...SCRIPT.hook1, ...SCRIPT.body],
    avatar: { prompt: '', url: '/examples/services-practitioner.png', description: 'Saved presenter', ethnicity: '' },
    storyboard: [{ scriptLine: SCRIPT.hook1[0], sceneDescription: 'Saved product shot', imageUrl: '/examples/ex-product-handheld.png' }],
    videoPrompts: [{ scriptLine: SCRIPT.hook1[0], type: 'talking', prompt: 'Saved video direction' }],
    aspectRatio: '9:16', thumbnailUrl: '/examples/ex-product-packaging.png',
  };
}

export async function seedCompletedSession(page: Page) {
  await page.evaluate(async ({ userId, session }) => {
    const store = await import('/services/wizardSessionStore.ts');
    await store.setSession(userId, session);
  }, { userId: LEGACY_USER, session: completedSession() });
}
