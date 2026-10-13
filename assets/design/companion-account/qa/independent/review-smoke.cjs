const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { transpileModule, ModuleKind, ScriptTarget } = require('typescript');
const OUT = __dirname;
const BASE = 'http://127.0.0.1:5173';
const observations = [];
const checks = [];
const check = (name, condition, details = {}) => { checks.push({ name, pass: !!condition, ...details }); if (!condition) console.log(`FAIL ${name}`); };
const sourceFiles = ['App.tsx', 'components/CompanionChat/CompanionChatShell.tsx', 'components/CompanionChat/index.tsx', 'components/CompanionChat/CompanionChatSurface.tsx', 'components/CompanionChat/companionChat.css', 'components/dashboard/SettingsModal.tsx', 'hooks/useSubscription.ts', 'services/consentService.ts', 'dev/companionChatPreview.tsx'];
fs.writeFileSync(path.join(OUT, 'reviewed-source-hashes.json'), JSON.stringify(sourceFiles.map(file => ({ file, sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') })), null, 2));

async function setup(page, { signedIn = true, preview = false } = {}) {
  const network = { blocked: [], unexpected: [], errors: [], consent: [] };
  page.on('pageerror', e => network.errors.push(e.message));
  if (!preview) await page.addInitScript(({ signedIn }) => {
    if (!sessionStorage.getItem('independent-initialized')) {
      sessionStorage.setItem('independent-initialized', '1');
      sessionStorage.setItem('independent-signed-in', signedIn ? 'yes' : '');
    }
    delete window.SpeechRecognition; delete window.webkitSpeechRecognition;
    const listeners = new Set();
    const state = window.independentMock = { id: 'review-account-a', plan: 'pro', granted: true, failConsent: false, holdConsent: false, consentWaiters: [], holdPlans: false, planWaiters: [], failSignOut: false, calls: [], channels: new Set(), listeners };
    const user = () => ({ id: state.id, email: `${state.id}@example.invalid`, created_at: '2025-01-01T00:00:00Z', user_metadata: { full_name: 'Independent Account', marketing_opt_in: false } });
    const session = () => sessionStorage.getItem('independent-signed-in') ? { access_token: 'independent-offline-token', user: user() } : null;
    state.event = (name = 'TOKEN_REFRESHED') => listeners.forEach(fn => fn(name, session()));
    const query = table => {
      const q = { uid: null, select() { return q; }, eq(k,v) { if(k==='user_id') q.uid=v; return q; }, order() { return q; }, limit() { return q; }, insert() { return q; }, update() { return q; }, upsert() { return q; }, delete() { return q; }, async single() { return { data:null, error:null }; },
        async maybeSingle() {
          if (table === 'subscriptions') {
            const requested = q.uid, capturedPlan = state.plan;
            state.calls.push({ name: 'subscription-read', requested });
            if (state.holdPlans) await new Promise(resolve => state.planWaiters.push(resolve));
            return { data: { plan_id: capturedPlan, status: 'active' }, error: null };
          }
          if (table === 'marketing_consent') {
            state.calls.push({ name: 'consent-read', requested:q.uid });
            if (state.holdConsent) await new Promise(resolve => state.consentWaiters.push(resolve));
            return state.failConsent ? { data:null, error:{ message:'Offline consent failure' } } : { data: state.granted ? { consent_at:'2026-10-07T00:00:00Z', withdrawn_at:null, policy_version:'2026-06-25' } : null, error:null };
          }
          return { data:null, error:null };
        }, then(resolve) { return resolve({ data:[], error:null }); } };
      return q;
    };
    state.client = {
      auth: { async getSession() { return { data:{ session:session() }, error:null }; },
        onAuthStateChange(fn) { listeners.add(fn); const timer=setTimeout(() => listeners.has(fn) && fn('INITIAL_SESSION',session()),0); return { data:{ subscription:{ unsubscribe() { clearTimeout(timer); listeners.delete(fn); state.calls.push({name:'listener-unsubscribed'}); } } } }; },
        async signOut() { state.calls.push({name:'sign-out'}); if(state.failSignOut) return {error:{message:'Offline sign out failure'}}; sessionStorage.removeItem('independent-signed-in'); listeners.forEach(fn=>fn('SIGNED_OUT',null)); return {error:null}; },
        async signInWithOtp() { return { error:null }; }, async verifyOtp() { sessionStorage.setItem('independent-signed-in','yes'); state.event('SIGNED_IN'); return { data:{ user:user(), session:session() },error:null }; }, async updateUser() { return {data:{user:user()},error:null}; } },
      from:query,
      channel(name) { const channel={name,on(...args){channel.handler=args[2];return channel;},subscribe(){state.channels.add(channel);return channel;}};return channel; },
      async removeChannel(channel) { state.channels.delete(channel); state.calls.push({name:'channel-removed'}); }
    };
  }, { signedIn });
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (request.method()==='GET' && ['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname)) return route.continue();
    if (url.origin !== BASE) { network.blocked.push(`${request.method()} ${url.origin}${url.pathname}`); return route.abort(); }
    if (!['GET','HEAD'].includes(request.method()) && !url.pathname.startsWith('/api/')) { network.unexpected.push(`${request.method()} ${url.pathname}`); return route.abort(); }
    if (!preview && /\/node_modules\/\.vite\/deps\/@supabase_supabase-js\.js$/.test(url.pathname)) return route.fulfill({ contentType:'application/javascript', body:'export const createClient = () => window.independentMock.client;' });
    if (!preview && url.pathname==='/services/supabaseClient.ts') {
      const original=await route.fetch();let code=await original.text();
      code=code.replace('const url = env.VITE_SUPABASE_URL;', 'const url = "https://independent-offline.invalid";').replace('const anonKey = env.VITE_SUPABASE_ANON_KEY;', 'const anonKey = "independent-dummy-public-key";');
      return route.fulfill({response:original,contentType:'application/javascript',body:code});
    }
    if (!preview && process.argv[3] && url.pathname==='/hooks/useSubscription.ts') {
      const original=await route.fetch(),live=await original.text();
      const reactUrl=live.match(/from\s+["']([^"']*\/react\.js[^"']*)["']/)?.[1];
      if(!reactUrl) throw new Error('Could not preserve Vite React module identity');
      const compiled=transpileModule(fs.readFileSync(process.argv[3],'utf8'),{compilerOptions:{module:ModuleKind.ESNext,target:ScriptTarget.ES2022}}).outputText.replace(/import\s+\{([^}]+)\}\s+from ['"]react['"];?/g,(_,names)=>`import __independentReact from ${JSON.stringify(reactUrl)}; const {${names}} = __independentReact;`).replace(/from ['"]\.\.\/services\/supabaseClient['"]/g,'from "/services/supabaseClient.ts"');
      return route.fulfill({response:original,contentType:'application/javascript',body:compiled});
    }
    if (!url.pathname.startsWith('/api/') || (url.pathname.startsWith('/api/_lib/') && request.method()==='GET')) return route.continue();
    if (preview) { network.unexpected.push(`${request.method()} ${url.pathname}`); return route.abort(); }
    if (url.pathname === '/api/events') return route.fulfill({json:{ok:true}});
    if (url.pathname === '/api/billing' && url.searchParams.get('action') === 'usage') {
      const meter={used:0,limit:20,remaining:20};return route.fulfill({json:{plan:'pro',workflows:meter,reports:meter,captions:meter,images:meter,video_ads:meter,omni_ads:meter}});
    }
    if (url.pathname === '/api/elevenlabs/voices') return route.fulfill({json:{voices:[]}});
    if (url.pathname === '/api/render/final/list' && request.method()==='GET') return route.fulfill({json:{jobs:[]}});
    if (url.pathname === '/api/producer/run' && request.method()==='GET') return route.fulfill({status:404,json:{error:'Offline_no_history'}});
    if (url.pathname === '/api/consent' && request.method()==='POST') {
      const {action}=request.postDataJSON();network.consent.push(action);
      const granted=action==='grant';await page.evaluate(granted=>window.independentMock.granted=granted,granted);
      return route.fulfill({json:{granted,consentAt:granted?'2026-10-07T00:00:00Z':null,withdrawnAt:granted?null:'2026-10-07T00:00:01Z',policyVersion:'2026-06-25'}});
    }
    network.unexpected.push(`${request.method()} ${url.pathname}`);return route.fulfill({status:503,json:{error:'Independent_unconfigured_request'}});
  });
  return network;
}

async function openSettings(page) {
  let button=page.getByRole('button',{name:'Account settings',exact:true});
  if (!await button.isVisible()) await page.getByRole('button',{name:'Open conversations',exact:true}).click();
  await button.click();
  const modal=page.getByRole('dialog',{name:'Settings',exact:true});await expect(modal).toBeVisible();return modal;
}
async function shot(page,name) { await page.screenshot({path:path.join(OUT,`${name}.png`),fullPage:true}); }
async function book(page) { return page.evaluate(async()=>{ const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('grifon_companion',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});try{return await new Promise((resolve,reject)=>{const r=db.transaction('conversations','readonly').objectStore('conversations').get('review-account-a');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}finally{db.close();} }); }

async function defect(browser) {
  const context=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:2,serviceWorkers:'block',reducedMotion:'reduce'});
  const page=await context.newPage(); const net=await setup(page);
  await page.goto(`${BASE}/app?experience=studio`);
  observations.push({scenario:'initial-studio-network',network:net});
  await shot(page,'studio-entry');
  observations.push({scenario:'initial-studio-text',text:await page.locator('body').innerText()});
  await expect(page.getByText('What are we selling today?',{exact:true})).toBeVisible();
  const buttons=await page.getByRole('button').allTextContents();observations.push({scenario:'studio-buttons',buttons});
  await page.getByRole('button',{name:/Edit Bay/}).first().click();
  const field=page.getByPlaceholder('Paste your script or outline here...');await expect(field).toBeVisible();
  await field.fill('This unsent Studio script must survive a token refresh.');
  await shot(page,'token-refresh-before');
  await page.evaluate(()=>{window.independentMock.holdPlans=true;window.independentMock.event('TOKEN_REFRESHED');});
  await expect.poll(()=>page.evaluate(()=>window.independentMock.planWaiters.length)).toBeGreaterThan(0);
  const vanished=await field.isVisible();await shot(page,'token-refresh-pending');
  await page.evaluate(()=>{window.independentMock.holdPlans=false;window.independentMock.planWaiters.splice(0).forEach(fn=>fn());});
  await expect(field).toBeVisible();const value=await field.inputValue();
  observations.push({scenario:'same-account-token-refresh',fieldDuringRefresh:vanished,valueAfterRefresh:value,network:net});
  check('same-account token refresh preserves mounted paid tool and its unsent script',vanished && value==='This unsent Studio script must survive a token refresh.',{fieldDuringRefresh:vanished,valueAfterRefresh:value});
  await shot(page,'token-refresh-after');await context.close();
}

async function account(browser,width,height) {
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,serviceWorkers:'block',reducedMotion:'reduce'});
  const page=await context.newPage();const net=await setup(page);
  await page.goto(`${BASE}/app`);const input=page.getByRole('textbox',{name:'Message Grifon',exact:true});await expect(input).toBeVisible();
  await expect(page.locator('iframe[title="Grifon animated companion"]')).toHaveAttribute('data-ready','true',{timeout:30000});
  const player=await page.locator('iframe[title="Grifon animated companion"]').elementHandle();
  await input.fill(`Independent latest draft ${width}px`);await shot(page,`chat-${width}`);
  const modal=await openSettings(page);await expect(modal).toContainText('review-account-a@example.invalid');await expect(modal).toContainText('Pro Edition');
  await expect(modal.getByRole('switch')).toBeChecked();
  check(`${width}px modal initial focus`,await modal.getByRole('button',{name:'Close settings'}).evaluate(el=>el===document.activeElement));
  await page.keyboard.press('Shift+Tab');check(`${width}px modal reverse wrap`,await modal.getByRole('button',{name:'Sign out',exact:true}).evaluate(el=>el===document.activeElement));
  await page.keyboard.press('Tab');check(`${width}px modal forward wrap`,await modal.getByRole('button',{name:'Close settings'}).evaluate(el=>el===document.activeElement));
  check(`${width}px background inert`,await input.evaluate(el=>!!el.closest('[inert]')));
  check(`${width}px player stays mounted with settings`,await player.evaluate(el=>el.isConnected));
  const geometry=await modal.locator('button').evaluateAll(nodes=>nodes.map(el=>{const b=el.getBoundingClientRect();return {label:el.getAttribute('aria-label')||el.textContent,width:b.width,height:b.height,font:getComputedStyle(el).fontSize};}));
  observations.push({scenario:`settings-${width}`,geometry,scroll:await modal.locator('.companion-settings-scroll').evaluate(el=>({height:el.clientHeight,scrollHeight:el.scrollHeight,width:el.clientWidth,scrollbar:getComputedStyle(el).scrollbarColor}))});
  check(`${width}px minimum targets`,geometry.every(b=>b.width>=44 && b.height>=44));
  check(`${width}px no horizontal overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await shot(page,`settings-${width}`);
  if(width===375) {
    const pairs=modal.locator('h3, button');
    for(let i=0;i<await pairs.count();i++) await pairs.nth(i).screenshot({path:path.join(OUT,`pair-mobile-2x-${i}.png`)});
    await modal.locator('.companion-settings-scroll').evaluate(el=>el.scrollTop=0);
  }
  if(width===375) {
    await page.emulateMedia({contrast:'more'});await shot(page,'settings-mobile-high-contrast');
    check('higher contrast uses readable neutral scrollbar',await modal.locator('.companion-settings-scroll').evaluate(el=>getComputedStyle(el).scrollbarColor.includes('161, 161, 170')));
    await page.emulateMedia({contrast:'no-preference'});
  }
  await modal.locator('.companion-settings-scroll').evaluate(el=>el.scrollTop=el.scrollHeight);await shot(page,`settings-bottom-${width}`);
  await page.keyboard.press('Escape');await expect(modal).toHaveCount(0);
  check(`${width}px settings focus restored`,await page.evaluate(()=>['Account settings','Open conversations'].includes(document.activeElement?.getAttribute('aria-label'))));
  check(`${width}px background operable after close`,await input.evaluate(el=>!el.closest('[inert]')));
  await expect(input).toHaveValue(`Independent latest draft ${width}px`);
  if(width===1280) {
    await page.getByRole('button',{name:'Collapse conversations',exact:true}).click();await openSettings(page);await shot(page,'collapsed-settings-1280');await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'Open conversations',exact:true}).click();
    await page.evaluate(()=>{window.independentMock.holdConsent=true;});const pending=await openSettings(page);await expect(pending.getByRole('status')).toContainText('Loading your ad preference');
    observations.push({scenario:'unconfirmed-granted-consent',switchCount:await pending.getByRole('switch').count(),text:await pending.innerText()});check('unconfirmed consent is not represented as an off switch',await pending.getByRole('switch').count()===0);await shot(page,'consent-pending-1280');
    await page.evaluate(()=>{window.independentMock.failConsent=true;window.independentMock.holdConsent=false;window.independentMock.consentWaiters.splice(0).forEach(fn=>fn());});await expect(pending.getByRole('alert')).toBeVisible();await shot(page,'consent-error-1280');
    observations.push({scenario:'failed-consent-read',switchCount:await pending.getByRole('switch').count()});check('failed consent read is not represented as an off switch',await pending.getByRole('switch').count()===0);
    await page.evaluate(()=>window.independentMock.failConsent=false);await pending.getByRole('button',{name:'Retry ad preference',exact:true}).click();await expect(pending.getByRole('switch')).toBeChecked();
    await pending.getByRole('switch').click();await expect(pending.getByRole('switch')).not.toBeChecked();
    await page.keyboard.press('Escape');
    const saveBefore=await book(page);check('latest draft is stored before account navigation',saveBefore.chats.find(c=>c.id===saveBefore.selectedId).composer==='Independent latest draft 1280px');
    await page.evaluate(()=>{const actual=IDBObjectStore.prototype.put;window.independentFailStorage=true;IDBObjectStore.prototype.put=function(...args){if(this.name==='conversations'&&window.independentFailStorage)throw new DOMException('Independent save failure','QuotaExceededError');return actual.apply(this,args);};});
    await input.fill('Keep latest draft across failed account exit');const failed=await openSettings(page);await failed.getByRole('button',{name:'Sign out',exact:true}).click();await expect(failed.getByRole('alert')).toContainText('Draft');
    check('failed actual IndexedDB save retains auth',await page.evaluate(()=>!!sessionStorage.getItem('independent-signed-in')));
    check('failed actual IndexedDB save never calls signOut',await page.evaluate(()=>!window.independentMock.calls.some(c=>c.name==='sign-out')));
    await page.evaluate(()=>{window.independentFailStorage=false;window.independentMock.failSignOut=true;});await failed.getByRole('button',{name:'Sign out',exact:true}).click();await expect(failed.getByRole('alert')).toContainText('Sign out failed');check('signOut error retains auth',await page.evaluate(()=>!!sessionStorage.getItem('independent-signed-in')));
    await page.evaluate(()=>window.independentMock.failSignOut=false);await failed.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page).toHaveURL(`${BASE}/login?from=logout`);await expect(page.locator('.auth-gateway')).toBeVisible();
    const saved=await book(page);check('successful signOut keeps account-scoped latest chat draft',saved.chats.find(c=>c.id===saved.selectedId).composer==='Keep latest draft across failed account exit');
  }
  check(`${width}px no page errors`,net.errors.length===0,{errors:net.errors});check(`${width}px no unexpected network requests`,net.unexpected.length===0,{requests:net.unexpected});observations.push({scenario:`network-${width}`,network:net});await context.close();
}

async function preview(browser) {
  const context=await browser.newContext({viewport:{width:375,height:667},deviceScaleFactor:2,serviceWorkers:'block',reducedMotion:'reduce'});const page=await context.newPage();const net=await setup(page,{preview:true});
  await page.goto(`${BASE}/companion-chat-preview.html`);await expect(page.getByRole('textbox',{name:'Message Grifon',exact:true})).toBeVisible();await shot(page,'default-preview-mobile');
  check('default preview hides fixture controls',await page.locator('summary').count()===0);
  check('mobile preview exposes an always-visible simulation disclosure',await page.locator('#companion-save-status').evaluate(el=>{const r=el.getBoundingClientRect();return el.textContent.includes('Preview · simulated output')&&r.top>=0&&r.bottom<=innerHeight;}));
  const modal=await openSettings(page);await expect(modal).toContainText('Preview account');check('preview never exposes consent switch',await modal.getByRole('switch').count()===0);await shot(page,'preview-settings-mobile');
  const typography=await modal.locator('h3, button').evaluateAll(nodes=>nodes.map(el=>{const style=getComputedStyle(el);return {text:el.textContent,tag:el.tagName,font:style.fontFamily,weight:style.fontWeight,transform:style.textTransform,spacing:style.letterSpacing,size:style.fontSize};}));
  observations.push({scenario:'preview-settings-typography',typography});
  check('preview settings section headings use normal-case sans semibold',typography.filter(x=>x.tag==='H3').every(x=>x.transform==='none'&&x.weight==='600'&&x.font.includes('Inter')));
  check('preview settings action controls use normal-case sans semibold',typography.filter(x=>x.tag==='BUTTON').every(x=>x.transform==='none'&&x.weight==='600'&&x.font.includes('Inter')&&x.spacing==='normal'));
  await modal.getByRole('button',{name:/Simulate sign out/}).click();await expect(page.getByRole('heading',{name:'Preview signed out',exact:true})).toBeVisible();check('preview signed-out screen has real login link',await page.getByRole('link',{name:'Sign in to Grifon',exact:true}).getAttribute('href')==='/login');
  await page.getByRole('button',{name:'Simulate sign in',exact:true}).click();await page.setViewportSize({width:1280,height:900});await expect(page.getByRole('textbox',{name:'Message Grifon',exact:true})).toBeVisible();await page.getByRole('button',{name:'Collapse conversations',exact:true}).click();await shot(page,'default-preview-collapsed');
  check('collapsed desktop preview exposes an always-visible simulation disclosure',await page.locator('#companion-save-status').evaluate(el=>{const r=el.getBoundingClientRect();return el.textContent.includes('Preview · simulated output')&&r.top>=0&&r.bottom<=innerHeight;}));
  check('preview has no external account writes',net.unexpected.length===0,{requests:net.unexpected});observations.push({scenario:'preview-network',network:net});await context.close();
}

async function pendingLogout(browser) {
  const context=await browser.newContext({viewport:{width:375,height:667},serviceWorkers:'block',reducedMotion:'reduce'});const page=await context.newPage();const net=await setup(page);
  await page.goto(`${BASE}/app`);const input=page.getByRole('textbox',{name:'Message Grifon',exact:true});await expect(input).toBeVisible();await input.fill('Save this draft while consent GET is pending');
  await page.evaluate(()=>window.independentMock.holdConsent=true);const modal=await openSettings(page);await expect(modal.getByRole('status')).toContainText('Loading your ad preference');const button=modal.getByRole('button',{name:'Sign out',exact:true});
  check('unknown consent GET does not disable sign out',await button.isEnabled());await button.click();await expect(page).toHaveURL(`${BASE}/login?from=logout`);
  await page.evaluate(()=>{window.independentMock.holdConsent=false;window.independentMock.consentWaiters.splice(0).forEach(fn=>fn());});await expect(page.locator('.auth-gateway')).toBeVisible();
  const saved=await book(page);check('held-consent signout preserves latest draft',saved.chats.find(c=>c.id===saved.selectedId).composer==='Save this draft while consent GET is pending');check('late consent reply does not cause page errors',net.errors.length===0,{errors:net.errors});observations.push({scenario:'held-consent-logout',network:net});await context.close();
}

async function lifecycle(browser) {
  const context=await browser.newContext({viewport:{width:1280,height:900},serviceWorkers:'block',reducedMotion:'reduce'});const page=await context.newPage();const net=await setup(page);
  await page.goto(`${BASE}/app`);await expect(page.getByRole('textbox',{name:'Message Grifon',exact:true})).toBeVisible();let modal=await openSettings(page);await expect(modal).toContainText('Pro Edition');await page.keyboard.press('Escape');
  await page.evaluate(()=>{window.independentMock.holdPlans=true;window.independentMock.event('TOKEN_REFRESHED');});await expect.poll(()=>page.evaluate(()=>window.independentMock.planWaiters.length)).toBeGreaterThan(0);
  await page.evaluate(()=>{window.independentMock.id='review-account-b';window.independentMock.plan='starter';window.independentMock.event('SIGNED_IN');});await expect.poll(()=>page.evaluate(()=>window.independentMock.planWaiters.length)).toBeGreaterThan(1);
  await page.evaluate(()=>{window.independentMock.holdPlans=false;window.independentMock.planWaiters.splice(0).forEach(fn=>fn());});modal=await openSettings(page);await expect(modal).toContainText('Starter Edition');
  check('stale subscription read cannot replace new account plan',await modal.getByText('Pro Edition',{exact:true}).count()===0);check('settings identity follows account switch',await modal.getByText('review-account-b@example.invalid',{exact:true}).isVisible());await page.keyboard.press('Escape');
  await expect.poll(()=>page.evaluate(()=>window.independentMock.channels.size)).toBe(1);check('account change removes old subscription channel',await page.evaluate(()=>window.independentMock.calls.some(c=>c.name==='channel-removed')));
  await page.getByRole('button',{name:'Studio',exact:true}).click();await expect(page.getByText('What are we selling today?',{exact:true})).toBeVisible();await expect.poll(()=>page.evaluate(()=>window.independentMock.channels.size)).toBe(2);await page.goBack();await expect(page.getByRole('textbox',{name:'Message Grifon',exact:true})).toBeVisible();await expect.poll(()=>page.evaluate(()=>window.independentMock.channels.size)).toBe(1);
  check('unmounted Studio subscription channel is cleaned up',await page.evaluate(()=>window.independentMock.channels.size===1));check('unmounted Studio auth listener is cleaned up',await page.evaluate(()=>window.independentMock.listeners.size===2));check('subscription lifecycle has no page errors',net.errors.length===0,{errors:net.errors});observations.push({scenario:'subscription-lifecycle',network:net});await context.close();
}

async function history(browser) {
  let context=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:2,serviceWorkers:'block',reducedMotion:'reduce'});let page=await context.newPage();const net=await setup(page);
  await page.goto(`${BASE}/`);await expect(page.locator('.landing-page')).toBeVisible();
  await page.getByRole('button',{name:'Research my market',exact:true}).click();await expect(page).toHaveURL(`${BASE}/app`);await expect(page.getByRole('heading',{name:'Recon',exact:true})).toBeVisible();await shot(page,'intent-history-before');
  await page.goBack();await expect(page.locator('.landing-page')).toBeVisible();
  await page.goForward();await expect(page).toHaveURL(`${BASE}/app`);
  const restored=await page.getByRole('heading',{name:'Recon',exact:true}).isVisible();await shot(page,'intent-history-forward');
  check('browser Forward restores the explicit intended tool',restored);observations.push({scenario:'real-landing-intent-history',restored,url:page.url(),network:net});
  await context.close();
  context=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:2,serviceWorkers:'block',reducedMotion:'reduce'});page=await context.newPage();await setup(page);
  await page.goto(`${BASE}/app`);const input=page.getByRole('textbox',{name:'Message Grifon',exact:true});await expect(input).toBeVisible();await input.fill('Return to original chat from selected Studio tool');
  await page.getByRole('button',{name:'Studio',exact:true}).click();await expect(page).toHaveURL(`${BASE}/app?experience=studio`);await page.getByRole('button',{name:/Edit Bay/}).first().click();await expect(page.getByPlaceholder('Paste your script or outline here...')).toBeVisible();
  await page.goBack();await expect(input).toBeVisible();check('Back from selected Studio tool restores original chat',await input.inputValue()==='Return to original chat from selected Studio tool');await shot(page,'studio-tool-history-back');
  await page.goForward();await expect(page.getByPlaceholder('Paste your script or outline here...')).toBeVisible();check('Forward restores the selected Studio tool',true);await shot(page,'studio-tool-history-forward');await context.close();
}

async function typography(browser) {
  for(const localPreview of [false,true]) for(const [width,height] of [[375,667],[1280,900]]) {
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,serviceWorkers:'block',reducedMotion:'reduce'});const page=await context.newPage();const net=await setup(page,{preview:localPreview});
    await page.goto(`${BASE}/${localPreview?'companion-chat-preview.html':'app'}`);await expect(page.getByRole('textbox',{name:'Message Grifon',exact:true})).toBeVisible();const modal=await openSettings(page);
    const rows=await modal.locator('h3').evaluateAll(nodes=>nodes.map(el=>{const icon=el.querySelector('svg'),wrapper=icon.parentElement,style=getComputedStyle(el),box=icon.getBoundingClientRect();return {text:el.textContent,font:style.fontFamily,weight:style.fontWeight,transform:style.textTransform,gap:style.columnGap,iconWidth:box.width,iconHeight:box.height,shrink:getComputedStyle(wrapper).flexShrink};}));
    const prefix=`final-${localPreview?'preview':'app'}-${width}`;
    observations.push({scenario:`${prefix}-heading-rhythm`,rows});
    check(`${prefix} section typography`,rows.every(x=>x.font.includes('Inter')&&x.weight==='600'&&x.transform==='none'));
    check(`${prefix} section icon rhythm`,rows.every(x=>x.iconWidth===20&&x.iconHeight===20&&x.gap==='12px'&&x.shrink==='0'));
    check(`${prefix} fit`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    for(let i=0;i<rows.length;i++)await modal.locator('h3').nth(i).screenshot({path:path.join(OUT,`${prefix}-heading-2x-${i}.png`)});
    await modal.locator('.companion-settings-scroll').evaluate(el=>el.scrollTop=0);await shot(page,`${prefix}-settings-top`);
    check(`${prefix} no page errors or unexpected requests`,net.errors.length===0&&net.unexpected.length===0,{errors:net.errors,requests:net.unexpected});await context.close();
  }
}

(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try { const mode=process.argv[2]||'all';if(mode==='defect'||mode==='all') await defect(browser);if(mode==='history'||mode==='all') await history(browser);if(mode==='lifecycle'||mode==='all')await lifecycle(browser);if(mode==='account'||mode==='all'){await account(browser,1280,900);await account(browser,375,667);await pendingLogout(browser);await preview(browser);}if(mode==='preview')await preview(browser);if(mode==='typography')await typography(browser); }
  catch(error){observations.push({scenario:'execution-error',message:error.message,stack:error.stack});console.error(error.message);process.exitCode=1;}
  finally {await browser.close();fs.writeFileSync(path.join(OUT,`${process.argv[2]||'all'}-observations.json`),JSON.stringify({checks,observations},null,2));console.log(`${checks.filter(c=>c.pass).length}/${checks.length} independent assertions passed`);if(checks.some(c=>!c.pass))process.exitCode=1;}
})();
