import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const OUT = path.resolve('assets/design/companion-startup/qa/independent');
fs.mkdirSync(OUT, { recursive: true });
const ROOT = path.resolve('.');
const results = { startedAt: new Date().toISOString(), base: 'http://127.0.0.1:5173/companion-chat-preview.html', browser: 'headless msedge; fresh context per scenario; serviceWorkers blocked', sourceHashes: {}, scenarios: [], assertions: [], failures: [] };
for (const file of ['components/CompanionChat/CompanionAvatar.tsx','components/CompanionChat/companionChat.css','tests/e2e/companion-startup.spec.ts','tests/e2e/companion-startup.config.ts','tests/e2e/companion-continuity.spec.ts']) results.sourceHashes[file] = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,file))).digest('hex');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const FRAME = 'iframe[title="Grifon animated companion"]';
const STILL = 'img[src$="/companion/neutral.png"]';
const input = p => p.getByRole('textbox', {name:'Message Grifon',exact:true});
function assert(condition, description) { results.assertions.push({ description, pass: !!condition }); if (!condition) throw new Error(description); }
async function setup(width,height,reduce=false) {
  const context = await browser.newContext({ viewport:{width,height}, serviceWorkers:'block', reducedMotion:reduce?'reduce':'no-preference' });
  const page = await context.newPage();
  const blocked=[], errors=[], requests=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(() => {
    delete window.SpeechRecognition; delete window.webkitSpeechRecognition;
    window.independentPixels = { firstPaint:null };
    if (typeof WebGL2RenderingContext !== 'undefined') {
      for (const method of ['drawElements','drawArrays']) {
        const original=WebGL2RenderingContext.prototype[method];
        WebGL2RenderingContext.prototype[method]=function(...args) {
          const result=original.apply(this,args);
          if (window.independentPixels.firstPaint || this.canvas.parentElement?.id!=='canvas-host' || this.isContextLost()) return result;
          const width=this.drawingBufferWidth,height=this.drawingBufferHeight,pixels=new Uint8Array(width*height*4);
          this.readPixels(0,0,width,height,this.RGBA,this.UNSIGNED_BYTE,pixels);
          let count=0;
          for(let i=0;i<pixels.length;i+=4) if(pixels[i+3]>0 && pixels[i]+pixels[i+1]+pixels[i+2]>0) count++;
          if(count>1) window.independentPixels.firstPaint={at:Date.now(),count,width,height};
          return result;
        };
      }
    }
    if(window!==window.top) return;
    window.independentLedger={samples:[],messages:[]};
    window.addEventListener('message',event=>{
      const frame=document.querySelector('iframe[title="Grifon animated companion"]');
      if(event.source===frame?.contentWindow && event.origin===location.origin && event.data?.channel==='grifon-companion') window.independentLedger.messages.push({event:event.data.event,at:Date.now(),paint:frame?.contentWindow?.independentPixels?.firstPaint});
    });
    const tick=()=>{
      const frame=document.querySelector('iframe[title="Grifon animated companion"]');
      if(frame) {
        const box=frame.parentElement.getBoundingClientRect(),css=getComputedStyle(frame),loader=frame.parentElement.querySelector('[role="status"][aria-label="Loading companion"]'),still=document.querySelector('img[src$="/companion/neutral.png"]');
        const sample={opacity:Number(css.opacity),ready:frame.dataset.ready||null,still:!!still,slot:[box.x,box.y,box.width,box.height],cue:loader?Number(getComputedStyle(loader).opacity):null};
        const previous=window.independentLedger.samples.at(-1);
        if(!previous || JSON.stringify(previous.sample)!==JSON.stringify(sample)) window.independentLedger.samples.push({at:Date.now(),sample});
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.route('**/*',route=>{
    const req=route.request(),url=new URL(req.url());
    if(url.pathname.startsWith('/companion/')) requests.push(url.pathname);
    if(req.method()==='GET' && ['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname)) return route.continue();
    if(!['http://127.0.0.1:5173','http://localhost:5173'].includes(url.origin) || url.pathname.startsWith('/api/')) {
      blocked.push(req.method()+' '+url.origin+url.pathname); return route.abort();
    }
    return route.continue();
  });
  return {context,page,blocked,errors,requests};
}
async function observe(page) {
  return page.evaluate(()=>{
    const frame=document.querySelector('iframe[title="Grifon animated companion"]'),host=frame.parentElement,box=host.getBoundingClientRect(),cue=host.querySelector('[aria-label="Loading companion"]'),retry=host.querySelector('button'),img=host.querySelector('img'),css=getComputedStyle(frame);
    const dot=cue?.querySelector('.companion-typing-dot'),dcss=dot?getComputedStyle(dot):null,rbox=retry?.getBoundingClientRect(),is=img?getComputedStyle(img):null;
    const innerFallback=frame.contentDocument?.querySelector('#fallback');
    return { slot:{x:box.x,y:box.y,width:box.width,height:box.height}, opacity:Number(css.opacity),ready:frame.dataset.ready||null,transition:{duration:css.transitionDuration,property:css.transitionProperty,ease:css.transitionTimingFunction},
      loader:cue?{opacity:getComputedStyle(cue).opacity,animation:getComputedStyle(cue).animationName,dotAnimation:dcss.animationName,dotOpacity:dcss.opacity,dotDuration:dcss.animationDuration}:null,
      retry:retry?{width:rbox.width,height:rbox.height,radius:getComputedStyle(retry).borderRadius,color:getComputedStyle(retry).color,background:getComputedStyle(retry).backgroundColor,fontSize:getComputedStyle(retry).fontSize,outline:getComputedStyle(retry).outline,icon:{width:retry.querySelector('svg')?.getBoundingClientRect().width,height:retry.querySelector('svg')?.getBoundingClientRect().height,shrink:retry.querySelector('svg')?getComputedStyle(retry.querySelector('svg')).flexShrink:null}}:null,
      image:img?{width:img.getBoundingClientRect().width,height:img.getBoundingClientRect().height,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,objectFit:is.objectFit}:null,
      innerFallbackHidden:innerFallback?.hidden,paint:frame.contentWindow?.independentPixels?.firstPaint,
      debug:frame.contentWindow?.grifonDebug?.snapshot(),ledger:window.independentLedger,
      overflow:document.documentElement.scrollWidth-innerWidth, chatCalls:window.companionFixture?.snapshot().calls,
      typography:{font:getComputedStyle(document.querySelector('[data-testid="companion-chat"]')).fontFamily,inputSize:getComputedStyle(document.querySelector('textarea')).fontSize},
      counts:{iframe:document.querySelectorAll('iframe[title="Grifon animated companion"]').length,still:document.querySelectorAll('img[src$="/companion/neutral.png"]').length}
    };
  });
}
async function capture(page,name) {
  const data=await observe(page);
  await page.screenshot({path:path.join(OUT,name+'.png'),fullPage:true});
  const host=page.locator('.companion-avatar-layer');
  const box=await host.boundingBox();
  const viewport=page.viewportSize();
  const clip={x:Math.max(0,box.x-12),y:Math.max(0,box.y-12),width:Math.min(box.width+68,viewport.width-Math.max(0,box.x-12)),height:box.height+40};
  const bytes=await page.screenshot({clip});
  await sharp(bytes).resize({width:Math.round(clip.width*2),height:Math.round(clip.height*2),kernel:'nearest'}).png().toFile(path.join(OUT,name+'-element-2x.png'));
  fs.writeFileSync(path.join(OUT,name+'.json'),JSON.stringify(data,null,2));
  return data;
}
async function load(page) { await page.goto(results.base,{waitUntil:'domcontentloaded'}); await expect(input(page)).toBeVisible(); }
async function ready(page) { await expect(page.locator(FRAME)).toHaveAttribute('data-ready','true',{timeout:30000}); await expect.poll(()=>page.locator(FRAME).evaluate(f=>Number(getComputedStyle(f).opacity))).toBe(1); }
async function run(name,operation) {
  const start=Date.now();
  try { const detail=await operation();results.scenarios.push({name,pass:true,elapsedMs:Date.now()-start,...detail}); console.log('PASS '+name); }
  catch(error){results.failures.push({name,error:error.stack});results.scenarios.push({name,pass:false,elapsedMs:Date.now()-start});console.log('FAIL '+name+': '+error.message);}
  fs.writeFileSync(path.join(OUT,'observations.json'),JSON.stringify(results,null,2));
}
for(const [width,height] of [[375,667],[1280,900]]) {
 await run('cold slow refresh '+width,async()=>{
   const t=await setup(width,height),{page}=t;let release,requestCount=0,held;
   const hold=()=>held=new Promise(resolve=>release=resolve);hold();
   await page.route('**/companion/scene.bin',async route=>{requestCount++;await held;await route.continue();});
   try{
     await load(page);await expect.poll(()=>requestCount).toBe(1);
     const initial=await capture(page,'initial-'+width);assert(initial.opacity===0 && initial.counts.still===0,'initial '+width+' has no still and invisible frame');
     assert(initial.slot.width===(width<768?56:64) && initial.slot.height===initial.slot.width,'initial '+width+' stable square slot');
     await page.waitForTimeout(1200);const slow=await capture(page,'slow-'+width);
     assert(slow.loader?.opacity==='1','slow '+width+' visible loading cue');
     assert(JSON.stringify(initial.slot)===JSON.stringify(slow.slot),'slow '+width+' slot unchanged');
     await input(page).fill('Chat remains available during startup');await input(page).press('Enter');
     await expect(page.locator('.companion-message-user')).toHaveText('Chat remains available during startup');
     release();await ready(page);const complete=await capture(page,'ready-'+width);
     assert(complete.paint?.count>1 && complete.innerFallbackHidden===true,'ready '+width+' has real colored pixels and hidden iframe still');
     assert(JSON.stringify(initial.slot)===JSON.stringify(complete.slot),'ready '+width+' slot unchanged');
     const positives=complete.ledger.samples.filter(s=>s.sample.opacity>0);assert(positives.some(s=>s.sample.opacity<1),'ready '+width+' restrained fade observed');
     assert(complete.ledger.messages.find(m=>m.event==='ready')?.paint?.count>1,'ready '+width+' bridge follows real rendered pixels');
     assert(complete.ledger.samples.every(s=>s.sample.still===false),'cold '+width+' never inserts static image');
     hold();await page.reload({waitUntil:'domcontentloaded'});await expect(input(page)).toBeVisible();await expect.poll(()=>requestCount).toBe(2);
     const refresh=await capture(page,'refresh-initial-'+width);assert(refresh.opacity===0 && refresh.counts.still===0,'refresh '+width+' no static flash');
     release();await ready(page);const refreshReady=await capture(page,'refresh-ready-'+width);assert(JSON.stringify(refresh.slot)===JSON.stringify(refreshReady.slot),'refresh '+width+' slot unchanged');
     assert(complete.overflow<=0 && refreshReady.overflow<=0,'cold '+width+' no horizontal overflow');
     assert(t.blocked.length===0 && t.errors.length===0,'cold '+width+' no provider requests or page errors');
     assert(refreshReady.chatCalls.length===0,'cold '+width+' no production calls');
     return {network:{requests:t.requests,blocked:t.blocked,errors:t.errors},size:[width,height]};
   }finally{release();await t.context.close();}
 });
 await run('genuine failure retry '+width,async()=>{
   const t=await setup(width,height),{page}=t;let fail=true,release;const held=new Promise(resolve=>release=resolve);
   await page.route('**/companion/scene.bin',async route=>{if(fail)return route.fulfill({status:503,body:'independent fixture model failure'});await held;await route.continue();});
   try{
     await load(page);const retry=page.getByRole('button',{name:'Retry companion motion',exact:true});await expect(retry).toBeVisible();await expect(page.locator(STILL)).toBeVisible();
     const failed=await capture(page,'error-'+width);assert(failed.retry.width>=44 && failed.retry.height>=44,'failure '+width+' retry target >=44px');
     assert(failed.retry.radius==='12px' && failed.retry.icon.width===16 && failed.retry.icon.height===16 && failed.retry.icon.shrink==='0','failure '+width+' correct control radius and lucide sizing');
     assert(failed.image.width===failed.image.height && failed.image.objectFit==='contain','failure '+width+' still not stretched');
     await retry.focus();const focused=await capture(page,'error-focused-'+width);assert(focused.retry.outline.includes('rgb(255, 204, 0)'),'failure '+width+' gold focus ring');
     await input(page).fill('Failure does not block chat');await input(page).press('Enter');await expect(page.locator('.companion-message-user')).toHaveText('Failure does not block chat');
     fail=false;await retry.click();await expect(page.locator(STILL)).toHaveCount(0);const loading=await capture(page,'retry-loading-'+width);assert(loading.opacity===0 && loading.counts.still===0,'retry '+width+' hides failure still');
     release();await ready(page);const recovered=await capture(page,'retry-ready-'+width);assert(JSON.stringify(failed.slot)===JSON.stringify(recovered.slot),'retry '+width+' no slot shift');
     assert(recovered.paint?.count>1 && recovered.counts.still===0,'retry '+width+' true live recovery');
     assert(recovered.overflow<=0 && t.blocked.length===0 && t.errors.length===0,'retry '+width+' fits and no external calls or page errors');
     return {network:{requests:t.requests,blocked:t.blocked,errors:t.errors},size:[width,height]};
   }finally{release();await t.context.close();}
 });
 await run('reduced motion '+width,async()=>{
   const t=await setup(width,height,true),{page}=t;let release;const held=new Promise(resolve=>release=resolve);
   await page.route('**/companion/scene.bin',async route=>{await held;await route.continue();});
   try{
     await load(page);await page.waitForTimeout(900);const loading=await capture(page,'reduced-loading-'+width);
     assert(loading.loader.dotAnimation==='none','reduced '+width+' dots do not move');assert(loading.loader.dotOpacity==='1','reduced '+width+' cue legible');
     release();await ready(page);const done=await capture(page,'reduced-ready-'+width);
     assert(done.transition.duration==='0s','reduced '+width+' no reveal fade');
     assert(done.ledger.samples.filter(s=>s.sample.opacity>0).every(s=>s.sample.opacity===1),'reduced '+width+' instant reveal observed');
     assert(done.paint?.count>1 && t.blocked.length===0 && t.errors.length===0,'reduced '+width+' actual pixels and clean network');
     return {size:[width,height],network:{blocked:t.blocked,errors:t.errors}};
   }finally{release();await t.context.close();}
 });
}
await run('30 second timeout and valid late ready',async()=>{
 const t=await setup(375,667),{page}=t;let release;const held=new Promise(resolve=>release=resolve);
 await page.route('**/companion/scene.bin',async route=>{await held;await route.continue();});
 try{
   await page.clock.install();await load(page);await page.clock.fastForward(30010);
   await expect(page.locator(STILL)).toBeVisible();await expect(page.getByRole('button',{name:'Retry companion motion',exact:true})).toBeVisible();
   const timedOut=await capture(page,'timeout-375');assert(timedOut.opacity===0 && timedOut.counts.still===1,'timeout gives truthful still');
   await input(page).fill('Chat still works after renderer timeout');await input(page).press('Enter');
   await expect(page.locator('.companion-message-user')).toHaveText('Chat still works after renderer timeout');
   release();await page.clock.resume();await ready(page);const late=await capture(page,'timeout-late-ready-375');assert(late.paint?.count>1 && late.counts.still===0,'valid late ready recovers automatically after timeout');
   await page.clock.fastForward(31000);const after=await observe(page);assert(after.ready==='true' && after.counts.still===0,'recovered renderer not failed by lingering timer');
   assert(t.blocked.length===0 && t.errors.length===0,'timeout path no external calls/page errors');
   return {timerSeam:'Playwright page.clock.install then fastForward(30010); real scene.bin request held; release with natural resumed clock for actual WebGL readiness; fastForward(31000) post-recovery',network:{requests:t.requests,blocked:t.blocked,errors:t.errors}};
 }finally{release();await t.context.close();}
});
await run('warm renderer identity and reactions 375',async()=>{
 const t=await setup(375,667),{page}=t;
 try{
  await load(page);await ready(page);await input(page).fill('Coffee independent identity');await input(page).press('Enter');await expect(page.getByRole('status',{name:'Grifon is typing',exact:true})).toHaveCount(0);await input(page).fill('Coffee draft');
  const first=await page.getByTestId('companion-chat').getAttribute('data-chat-id');
  await page.evaluate(()=>{const f=document.querySelector('iframe[title="Grifon animated companion"]');window.independentReference={frame:f,window:f.contentWindow,canvas:f.contentDocument.querySelector('canvas')};});
  const resourceStart=t.requests.length;
  await page.getByRole('button',{name:'New chat',exact:true}).click();await expect(input(page)).toHaveValue('');const second=await page.getByTestId('companion-chat').getAttribute('data-chat-id');assert(first!==second,'New chat gets isolated identity');
  await input(page).fill('Tea independent identity');await input(page).press('Enter');await expect(page.getByRole('status',{name:'Grifon is typing',exact:true})).toHaveCount(0);await input(page).fill('Tea draft');
  const warm=[];
  for(const [id,draft,message] of [[first,'Coffee draft','Coffee independent identity'],[second,'Tea draft','Tea independent identity'],[first,'Coffee draft','Coffee independent identity']]){
    const nav=page.getByRole('navigation',{name:'Conversations',exact:true});if(!await nav.isVisible())await page.getByRole('button',{name:'Open conversations',exact:true}).click();await nav.locator('[data-chat-id="'+id+'"]').click();
    await expect(input(page)).toHaveValue(draft);await expect(page.locator('.companion-message-user')).toHaveText(message);
    const value=await page.evaluate(()=>{const f=document.querySelector('iframe[title="Grifon animated companion"]'),r=window.independentReference;return {sameIframe:f===r.frame,sameWindow:f.contentWindow===r.window,sameCanvas:f.contentDocument.querySelector('canvas')===r.canvas,ready:f.dataset.ready,debug:f.contentWindow.grifonDebug.snapshot()};});
    warm.push(value);assert(value.sameIframe && value.sameWindow && value.sameCanvas && value.ready==='true','saved chat preserves warm renderer identity');
    await expect.poll(()=>page.evaluate(()=>document.querySelector('iframe[title="Grifon animated companion"]').contentWindow.grifonDebug.snapshot().reaction.state)).toBe('reading');
  }
  await page.evaluate(()=>window.companionFixture.emit('researching'));await expect(input(page)).toBeDisabled();await page.getByRole('button',{name:'New chat',exact:true}).click();await expect(input(page)).toBeEnabled();await expect(input(page)).toHaveValue('');await expect.poll(()=>page.evaluate(()=>document.querySelector('iframe[title="Grifon animated companion"]').contentWindow.grifonDebug.snapshot().reaction.state)).toBe('idle');
  const final=await capture(page,'warm-new-chat-375');assert(t.requests.length===resourceStart,'warm switches do not reload renderer resources');assert(final.counts.still===0 && final.counts.iframe===1,'warm switches keep one live renderer and no still');assert(t.blocked.length===0 && t.errors.length===0,'warm no external calls/page errors');
  return {warm,network:{requests:t.requests.slice(resourceStart),blocked:t.blocked,errors:t.errors}};
 }finally{await t.context.close();}
});
await browser.close();
results.endedAt=new Date().toISOString();results.exitCode=results.failures.length?1:0;
fs.writeFileSync(path.join(OUT,'observations.json'),JSON.stringify(results,null,2));
console.log('Independent scenarios '+results.scenarios.filter(s=>s.pass).length+'/'+results.scenarios.length+'; assertions '+results.assertions.length+'; exit '+results.exitCode);
process.exitCode=results.exitCode;
