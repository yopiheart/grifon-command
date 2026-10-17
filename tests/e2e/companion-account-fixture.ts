import { expect, test, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { transpileModule, ModuleKind, ScriptTarget } from 'typescript';

export const ACCOUNT_ID = 'account-fixture-user';
export const ACCOUNT_EMAIL = 'account-smoke@example.test';

/** Runs the real App, auth helpers, settings and IndexedDB against a mock SDK. */
export async function installAccountApp(page: Page, signedIn = true, holdCheckoutAuth = false) {
  const localURL = new URL(test.info().project.use.baseURL ?? 'http://127.0.0.1:5173');
  if (!['127.0.0.1', 'localhost'].includes(localURL.hostname)) throw new Error('Account fixture requires a local test baseURL.');
  const evidence = { unexpected: [] as string[], pageErrors: [] as string[], consentWrites: [] as string[] };
  (page as any).accountEvidence = evidence;
  page.on('pageerror', error => evidence.pageErrors.push(error.message));
  await page.addInitScript(({ signedIn, userId, email, holdCheckoutAuth }) => {
    if (!sessionStorage.getItem('account_fixture_initialized')) {
      sessionStorage.setItem('account_fixture_initialized', '1');
      if (signedIn) sessionStorage.setItem('account_fixture_signed_in', '1');
    }
    delete (window as any).SpeechRecognition; delete (window as any).webkitSpeechRecognition;
    const state = (window as any).accountFixture = {
      calls: [] as any[], signOutFails: false, consentReadFails: false,
      consentWriteFails: false, consentGranted: false, otpFails: false,
      holdConsent: false, releaseConsent: null as (() => void) | null,
      holdConsentWrite: false, releaseConsentWrite: null as (() => void) | null,
      holdStorage: false, storageWaiters: [] as (() => void)[],
      planReadFails: false, holdPlanUsers: {} as Record<string, boolean>,
      planWaiters: [] as { userId: string; resolve: () => void }[],
      plans: { [userId]: 'pro', 'account-fixture-second': 'starter' } as Record<string, string>,
      activeUserId: userId,
      checkoutAuthArmed: false, checkoutAuthHeld: false,
      releaseCheckoutAuth: null as (() => void) | null,
      rejectCheckoutAuth: null as (() => void) | null,
    };
    if (holdCheckoutAuth) {
      const originalRemove = Storage.prototype.removeItem;
      Storage.prototype.removeItem = function (key: string) {
        const planRemoved = this === sessionStorage && key === 'grifon_intended_plan' && this.getItem(key) !== null;
        originalRemove.call(this, key);
        if (planRemoved) state.checkoutAuthArmed = true;
      };
    }
    const user = { id: userId, email, created_at: '2025-01-01T00:00:00Z', last_sign_in_at: '2026-10-07T00:00:00Z', user_metadata: { full_name: 'Account Smoke', marketing_opt_in: false } };
    const session = () => sessionStorage.getItem('account_fixture_signed_in') ? { access_token: 'test-only-account-token', user: { ...user, id: state.activeUserId } } : null;
    const listeners = new Set<(event: string, session: unknown) => void>();
    state.signInAs = (nextUserId: string) => {
      state.activeUserId = nextUserId; sessionStorage.setItem('account_fixture_signed_in', '1');
      listeners.forEach(fn => fn('SIGNED_IN', session()));
    };
    state.refreshToken = () => listeners.forEach(fn => fn('TOKEN_REFRESHED', session()));
    const readBook = async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('grifon_companion', 1);
        request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
      });
      try {
        return await new Promise<any>((resolve, reject) => {
          if (!db.objectStoreNames.contains('conversations')) { resolve(null); return; }
          const request = db.transaction('conversations', 'readonly').objectStore('conversations').get(userId);
          request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
        });
      } finally { db.close(); }
    };
    const originalDelete = IDBObjectStore.prototype.delete;
    IDBObjectStore.prototype.delete = function (...args: Parameters<IDBObjectStore['delete']>) {
      if (this.name === 'sessions') state.calls.push({ name: 'wizard-delete' });
      return originalDelete.apply(this, args);
    };
    const query = (table: string) => {
      const q: any = {
        select: () => q, eq: (column: string, value: string) => { if (column === 'user_id') q.userId = value; return q; }, order: () => q, limit: () => q,
        insert: () => q, upsert: () => q, update: () => q, delete: () => q,
        single: async () => ({ data: null, error: null }),
        maybeSingle: async () => {
          if (table === 'subscriptions') {
            const queryUserId = q.userId || state.activeUserId;
            const plan = state.plans[queryUserId] || 'free';
            state.calls.push({ name: 'plan-read', userId: queryUserId });
            if (state.holdPlanUsers[queryUserId]) await new Promise<void>(resolve => state.planWaiters.push({ userId: queryUserId, resolve }));
            if (state.planReadFails) return { data: null, error: { message: 'Account fixture plan unavailable' } };
            return { data: { plan_id: plan, status: 'active' }, error: null };
          }
          if (table === 'marketing_consent') {
            state.calls.push({ name: 'consent-read' });
            if (state.holdConsent) await new Promise<void>(resolve => { state.releaseConsent = resolve; });
            if (state.consentReadFails) return { data: null, error: { message: 'Account fixture consent unavailable' } };
            return { data: state.consentGranted ? { consent_at: '2026-10-07T00:00:00Z', withdrawn_at: null, policy_version: '2026-06-25' } : null, error: null };
          }
          return { data: null, error: null };
        },
        then: (resolve: (value: unknown) => void) => resolve({ data: [], error: null }),
      };
      return q;
    };
    const channel: any = { on: () => channel, subscribe: () => channel };
    (window as any).accountMockClient = {
      auth: {
        getSession: async () => {
          if (state.checkoutAuthArmed) {
            state.checkoutAuthArmed = false; state.checkoutAuthHeld = true;
            await new Promise<void>((resolve, reject) => {
              state.releaseCheckoutAuth = resolve;
              state.rejectCheckoutAuth = () => reject(new Error('Account fixture checkout auth unavailable'));
            });
          }
          return { data: { session: session() }, error: null };
        },
        onAuthStateChange: (fn: (event: string, session: unknown) => void) => {
          listeners.add(fn); return { data: { subscription: { unsubscribe: () => listeners.delete(fn) } } };
        },
        signInWithOtp: async ({ email }: { email: string }) => {
          state.calls.push({ name: 'otp-send', email }); return { error: null };
        },
        verifyOtp: async ({ email, token }: { email: string; token: string }) => {
          state.calls.push({ name: 'otp-verify', email, token });
          if (state.otpFails) return { data: { user: null }, error: { message: 'Account fixture code invalid' } };
          sessionStorage.setItem('account_fixture_signed_in', '1');
          listeners.forEach(fn => fn('SIGNED_IN', session()));
          return { data: { user, session: session() }, error: null };
        },
        signOut: async () => {
          const book = await readBook();
          state.calls.push({ name: 'signOut', composerAtSignOut: book?.chats.find((chat: any) => chat.id === book.selectedId)?.composer });
          if (state.signOutFails) return { error: { message: 'Account fixture sign out unavailable' } };
          sessionStorage.removeItem('account_fixture_signed_in');
          listeners.forEach(fn => fn('SIGNED_OUT', null));
          return { error: null };
        },
        updateUser: async () => ({ data: { user }, error: null }),
      },
      from: query, channel: () => channel, removeChannel() {},
    };
  }, { signedIn, userId: ACCOUNT_ID, email: ACCOUNT_EMAIL, holdCheckoutAuth });
  // Only the SDK's createClient factory is mocked; production OTP wrappers run.
  await page.route(/\/node_modules\/\.vite\/deps\/@supabase_supabase-js\.js(?:\?.*)?$/, route => route.fulfill({
    contentType: 'application/javascript', body: 'const createClient = () => window.accountMockClient; export { createClient }; export default { createClient };',
  }));
  // Explicit dummy public configuration avoids depending on the owner's .env.
  // The production helpers are otherwise unchanged; only createClient is mocked.
  const authSource = readFileSync('services/supabaseClient.ts', 'utf8').replace(
    'const env = (import.meta as any).env || {};',
    'const env = { VITE_SUPABASE_URL: "https://account.example.test", VITE_SUPABASE_ANON_KEY: "test-only-anon-key" };',
  );
  const authModule = transpileModule(authSource, { compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 } }).outputText
    .replace(/from ['"]@supabase\/supabase-js['"]/g, 'from "/node_modules/.vite/deps/@supabase_supabase-js.js"')
    .replace(/from ['"]\.\/consentConstants['"]/g, 'from "/services/consentConstants.ts"');
  await page.route(/\/services\/supabaseClient\.ts(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: authModule }));
  if (process.env.COMPANION_ACCOUNT_ORIGINAL_SUBSCRIPTION === '1' || process.env.COMPANION_ACCOUNT_ORIGINAL_REFRESH === '1') {
    const original = process.env.COMPANION_ACCOUNT_ORIGINAL_SUBSCRIPTION === '1'
      ? execFileSync('git', ['show', '55ef2b21:hooks/useSubscription.ts'], { encoding: 'utf8' })
      : readFileSync('assets/design/companion-account/qa/builder/pre-review-useSubscription.ts', 'utf8');
    const compiled = transpileModule(original, { compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 } }).outputText
      .replace(/import\s*\{([^}]*)\}\s*from ['"]react['"];?/g, 'import React from "/node_modules/.vite/deps/react.js"; const {$1}=React;')
      .replace(/from ['"]\.\.\/services\/supabaseClient['"]/g, 'from "/services/supabaseClient.ts"');
    await page.route(/\/hooks\/useSubscription\.ts(?:\?.*)?$/, async route => {
      const liveHook = await (await route.fetch()).text();
      const reactUrl = liveHook.match(/from\s*["'](\/node_modules\/\.vite\/deps\/react\.js[^"']*)["']/)?.[1];
      if (!reactUrl) throw new Error('Live hook React dependency seam could not be identified');
      // Match Vite's versioned React URL so the original hook shares App's dispatcher.
      return route.fulfill({ contentType: 'application/javascript', body: compiled.replace('/node_modules/.vite/deps/react.js', reactUrl) });
    });
  }
  // Delay only the public save seam; successful writes still use real IndexedDB.
  await page.route(/\/services\/companionConversations\.ts(?:\?.*)?$/, route => {
    if (route.request().url().includes('account-storage-original')) return route.fallback();
    return route.fulfill({ contentType: 'application/javascript', body: `
      export * from '/services/companionConversations.ts?account-storage-original';
      import {saveConversations as actualSave} from '/services/companionConversations.ts?account-storage-original';
      export const saveConversations=async book=>{
        const state=window.accountFixture;
        if(state.holdStorage) await new Promise(resolve=>state.storageWaiters.push(resolve));
        return actualSave(book);
      };
    ` });
  });
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() === 'GET' && ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
    if (url.origin !== localURL.origin) {
      if (['fetch', 'xhr'].includes(request.resourceType())) evidence.unexpected.push(`Blocked external ${request.method()} ${url.pathname}`);
      return route.abort('blockedbyclient');
    }
    if (!url.pathname.startsWith('/api/') || url.pathname.startsWith('/api/_lib/')) return route.fallback();
    if (url.pathname === '/api/billing' && url.searchParams.get('action') === 'usage') {
      const meter = { used: 0, limit: 20, remaining: 20 };
      return route.fulfill({ json: { plan: 'pro', workflows: meter, reports: meter, captions: meter, images: meter, video_ads: meter, omni_ads: meter } });
    }
    if (url.pathname === '/api/consent' && request.method() === 'POST') {
      const action = request.postDataJSON().action;
      evidence.consentWrites.push(action);
      const holdWrite = await page.evaluate(() => (window as any).accountFixture.holdConsentWrite);
      if (holdWrite) await page.evaluate(() => new Promise<void>(resolve => { (window as any).accountFixture.releaseConsentWrite = resolve; }));
      const fails = await page.evaluate(() => (window as any).accountFixture.consentWriteFails);
      if (fails) return route.fulfill({ status: 503, json: { error: 'Account fixture consent update unavailable' } });
      const granted = action === 'grant';
      await page.evaluate(granted => { (window as any).accountFixture.consentGranted = granted; }, granted);
      return route.fulfill({ json: { granted, consentAt: granted ? '2026-10-07T00:00:00Z' : null, withdrawnAt: granted ? null : '2026-10-07T00:00:01Z', policyVersion: '2026-06-25' } });
    }
    if (url.pathname === '/api/events') return route.fulfill({ json: { ok: true } });
    if (url.pathname === '/api/elevenlabs/voices') return route.fulfill({ json: { voices: [] } });
    if (url.pathname === '/api/render/final/list' && request.method() === 'GET') return route.fulfill({ json: { jobs: [] } });
    if (url.pathname === '/api/producer/run' && request.method() === 'GET') return route.fulfill({ status: 404, json: { error: 'run_not_found' } });
    evidence.unexpected.push(`${request.method()} ${url.pathname}`);
    return route.fulfill({ status: 503, json: { error: 'Unconfigured account fixture request' } });
  });
  return evidence;
}

export async function showAccountSettings(page: Page) {
  let trigger = page.getByRole('button', { name: 'Account settings', exact: true });
  if (!await trigger.isVisible()) await page.getByRole('button', { name: 'Open conversations', exact: true }).click();
  trigger = page.getByRole('button', { name: 'Account settings', exact: true });
  await trigger.click();
  await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toBeVisible();
  return page.getByRole('dialog', { name: 'Settings', exact: true });
}

export async function readAccountBook(page: Page) {
  return page.evaluate(async userId => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('grifon_companion', 1);
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<any>((resolve, reject) => {
        const request = db.transaction('conversations', 'readonly').objectStore('conversations').get(userId);
        request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
      });
    } finally { db.close(); }
  }, ACCOUNT_ID);
}
