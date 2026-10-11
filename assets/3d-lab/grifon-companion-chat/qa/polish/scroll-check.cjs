const{chromium}=require('playwright');const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');let browser;
(async()=>{
 browser=await chromium.launch({channel:'msedge',headless:true});const results=[];
 for(const phase of ['baseline','final']){
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});const page=await context.newPage();page.setDefaultTimeout(10000);
  await page.routeWebSocket('**',w=>w.close());await page.route('**/*',r=>{const u=new URL(r.request().url());if(r.request().method()==='GET'&&['fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname))return r.continue();return u.origin!=='http://127.0.0.1:5173'||u.pathname.startsWith('/api/')?r.abort():r.continue()});
  if(phase==='baseline')for(const n of ['CompanionChatSurface','CompanionAvatar'])await page.route(new RegExp('/components/CompanionChat/'+n+'\\.tsx(?:\\?.*)?$'),r=>r.fulfill({contentType:'application/javascript',path:path.join(__dirname,'.baseline-'+n+'.js')}));
  if(phase==='final'&&process.env.POLISH_TRACE)await page.route(/\/components\/CompanionChat\/CompanionChatSurface\.tsx(?:\?.*)?$/,async route=>{
   const response=await route.fetch();let body=await response.text();
   const log=event=>`(window.__followTrace ||= []).push({event:'${event}',at:performance.now(),near:nearBottom.current,following:followingScroll.current,top:scroller.current?.scrollTop,distance:scroller.current?scroller.current.scrollHeight-scroller.current.scrollTop-scroller.current.clientHeight:null});`;
   body=body.replaceAll('nearBottom.current = true;','nearBottom.current = true;'+log('INTENT_TRUE'));
   body=body.replace('scrollFrame.current = window.requestAnimationFrame(() => {',log('SCHEDULE')+'scrollFrame.current = window.requestAnimationFrame(() => {'+log('RAF'));
   body=body.replace('onScroll: (event) => {','onScroll: (event) => {'+log('SCROLL'));
   await route.fulfill({response,body});
  });
  await page.goto('http://127.0.0.1:5173/companion-chat-preview.html');await page.getByRole('textbox',{name:'Message Grifon'}).waitFor();
  await page.evaluate(()=>{const k='grifon_companion_draft:fixture-user-a',e=JSON.parse(localStorage.getItem(k));e.draft.messages=Array.from({length:120},(_,i)=>({id:'scroll-'+i,role:i%2?'user':'assistant',text:'Existing conversation message '+i+'. '+('More context for this ad. '.repeat(4)),at:Date.now()+i}));localStorage.setItem(k,JSON.stringify(e))});
  await page.reload();await page.getByRole('textbox',{name:'Message Grifon'}).waitFor();await page.evaluate(()=>window.companionFixture.emit('result'));await page.waitForTimeout(350);
  const scroller=page.locator('[data-testid="companion-chat"] [class*="overflow-y-auto"]').first(),input=page.getByRole('textbox',{name:'Message Grifon'});
  await scroller.evaluate(e=>{e.scrollTop=e.scrollHeight*.4;e.dispatchEvent(new Event('scroll'))});const before=await scroller.evaluate(e=>e.scrollTop);
  await input.fill('style clean');await page.waitForTimeout(100);const afterTyping=await scroller.evaluate(e=>e.scrollTop);
  await page.evaluate(()=>window.__followTrace=[]);await page.getByRole('button',{name:'Send',exact:true}).click();await page.waitForTimeout(100);const at100ms=await scroller.evaluate(e=>({top:e.scrollTop,distance:e.scrollHeight-e.clientHeight-e.scrollTop}));
  const afterSend=await scroller.evaluate(e=>({top:e.scrollTop,distance:e.scrollHeight-e.clientHeight-e.scrollTop}));
  await page.waitForTimeout(400);const at500ms=await scroller.evaluate(e=>({top:e.scrollTop,distance:e.scrollHeight-e.clientHeight-e.scrollTop}));
  const count=await page.evaluate(()=>JSON.parse(localStorage.getItem('grifon_companion_draft:fixture-user-a')).draft.messages.length);
  const item={phase,messageCount:count,typingPreservesPosition:Math.abs(afterTyping-before)<=1,before,afterTyping,at100ms,at500ms,afterSend,followSampleMs:100,explicitSendFollowsLatest:afterSend.distance<=24};
  if(phase==='final'){item.surfaceSHA256=crypto.createHash('sha256').update(fs.readFileSync('components/CompanionChat/CompanionChatSurface.tsx')).digest('hex');if(process.env.POLISH_TRACE)item.trace=await page.evaluate(()=>window.__followTrace)}
  if(phase==='final'){
   await scroller.evaluate(e=>{e.scrollTop=e.scrollHeight-e.clientHeight-4;e.dispatchEvent(new Event('scroll'))});await input.fill('style impact');await page.getByRole('button',{name:'Send',exact:true}).click();await scroller.hover();await page.mouse.wheel(0,-500);await page.waitForTimeout(100);const interrupted=await scroller.evaluate(e=>e.scrollTop);await page.waitForTimeout(650);const settled=await scroller.evaluate(e=>({top:e.scrollTop,distance:e.scrollHeight-e.clientHeight-e.scrollTop}));item.nativeWheelInterruptedFollow=settled.top<=interrupted+1&&settled.distance>100;item.interrupted={sampledTop:interrupted,settled};
   const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'},{name:'prefers-reduced-transparency',value:'reduce'}]});item.reduced=await page.locator('.companion-composer').evaluate(e=>({motion:matchMedia('(prefers-reduced-motion:reduce)').matches,transparency:matchMedia('(prefers-reduced-transparency:reduce)').matches,background:getComputedStyle(e).backgroundColor,shadow:getComputedStyle(e).boxShadow}));
  }
  results.push(item);await context.close();
 }
 await browser.close();browser=null;fs.writeFileSync(path.join(__dirname,process.env.POLISH_TRACE?'scroll-trace.json':'scroll-report.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
 const fixed=results[1];if(!fixed.typingPreservesPosition||!fixed.explicitSendFollowsLatest||!fixed.nativeWheelInterruptedFollow)process.exitCode=1;
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1});
