const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const out = __dirname;
const base = 'http://127.0.0.1:8765/';
const report = { started: new Date().toISOString(), limitations: ['Mobile sizes are desktop Edge emulation, not phone performance.', 'Fixed camera and baked lighting; no PBR/GLB/splat validation.', 'Pose metrics do not establish visual appeal or likeness.'], views: [], checks: {}, errors: [] };
const hash = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(out, '..', f))).digest('hex');
report.sourceHashes = Object.fromEntries(['main.js','style.css','index.html'].map(f => [f, hash(f)]));
const snap = page => page.evaluate(() => window.grifonDebug.snapshot());
const delay = ms => new Promise(r => setTimeout(r, ms));
function attach(page) {
  const logs = { console: [], pageerrors: [] };
  page.on('console', m => { if (['error','warning'].includes(m.type())) logs.console.push({type:m.type(), text:m.text(), location:m.location()}); });
  page.on('pageerror', e => logs.pageerrors.push(e.message));
  return logs;
}
async function ready(page) { await page.goto(base); await page.waitForFunction(() => window.grifonDebug?.snapshot().ready || window.grifonDebug?.snapshot().failed); if (!(await snap(page)).ready) throw Error('Renderer failed initial load'); }
async function sample(page, duration) {
  return page.evaluate(duration => new Promise(resolve => { const data = []; const start = performance.now(); function take(){data.push(window.grifonDebug.snapshot()); if(performance.now()-start < duration)requestAnimationFrame(take); else resolve(data);} requestAnimationFrame(take); }), duration);
}
async function capture(page, name) { const file = path.join(out, name+'.png'); await page.screenshot({path:file, fullPage:true}); return file; }
function timings(values) { const sorted = [...values].sort((a,b)=>a-b); return { samples: values.length, meanMs: values.reduce((a,b)=>a+b,0)/values.length, medianMs: sorted[Math.floor(sorted.length/2)], p95Ms: sorted[Math.floor(sorted.length*.95)], maxMs: sorted.at(-1) }; }
async function main() {
  const browser = await chromium.launch({channel:'msedge', headless:true});
  report.browser = browser.version();
  try {
    for (const [name,width,height,mobile] of [['desktop',1024,900,false],['mobile390',390,844,true],['mobile320',320,740,true]]) {
      const context = await browser.newContext({viewport:{width,height}, isMobile:mobile, hasTouch:mobile, deviceScaleFactor:mobile?2:1, recordVideo:name==='mobile390'?{dir:out,size:{width:390,height:844}}:undefined});
      const page = await context.newPage(); const logs = attach(page); await ready(page); await delay(1300);
      const initial = await capture(page,name+'-initial'); console.log('CAPTURE '+initial);
      const view = {name, viewport:{width,height}, mobileEmulation:mobile, screenshots:[initial], logs}; report.views.push(view);
      view.layout = await page.evaluate(() => ({overflow:document.documentElement.scrollWidth>innerWidth, targets:[...document.querySelectorAll('button,a,summary')].filter(e=>e.getClientRects().length).map(e=>({text:e.textContent.trim(),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))}));
      view.gpu = await page.evaluate(() => {const gl=document.querySelector('canvas').getContext('webgl2');const ext=gl.getExtension('WEBGL_debug_renderer_info');return {renderer:gl.getParameter(gl.RENDERER),vendor:gl.getParameter(gl.VENDOR),unmaskedRenderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null};});
      await delay(3200); view.warmFrameTiming = timings((await snap(page)).rollingFrameTimes);
      await page.locator('#reset').dispatchEvent('click'); await delay(900);
      await page.locator('[data-look="1,0"]').dispatchEvent('click');
      const lead = await sample(page,650);
      view.eyeLead = lead.map(s=>({t:s.activeTime,gaze:s.controls.gazeX,head:s.controls.headYaw}));
      view.checks = {ready:true,noHorizontalOverflow:!view.layout.overflow,targets44px:view.layout.targets.every(t=>t.width>=44&&t.height>=44),eyesLeadHead:lead.some(s=>s.controls.gazeX>.2 && Math.abs(s.controls.headYaw/.13)<s.controls.gazeX*.5)};
      view.screenshots.push(await capture(page,name+'-look-right'));
      await page.locator('#blink').dispatchEvent('click'); const blink = await sample(page,400); view.blink = blink.map(s=>s.controls.blink);
      view.checks.blinkClosesAndOpens = Math.max(...view.blink)>=.995 && view.blink.at(-1)===0;
      await page.evaluate(() => new Promise(resolve => {document.querySelector('#blink').click();const start=performance.now();function freeze(){if(window.grifonDebug.snapshot().controls.blink>=.995 || performance.now()-start>1000){document.querySelector('#pause').click();resolve();}else requestAnimationFrame(freeze);}requestAnimationFrame(freeze);}));
      view.closedBlink = await snap(page); view.checks.fullyClosedFrameCaptured=view.closedBlink.controls.blink>=.995;view.screenshots.push(await capture(page,name+'-blink-closed')); await page.locator('#pause').dispatchEvent('click'); await delay(300);
      await page.locator('#pause').dispatchEvent('click'); const pausedA=await snap(page); await delay(450); const pausedB=await snap(page);
      view.checks.pauseFreezesPoseAndFrames = pausedA.pause && pausedA.frameCount===pausedB.frameCount && JSON.stringify(pausedA.controls)===JSON.stringify(pausedB.controls);
      view.pauseEvidence = {before:pausedA,after:pausedB};
      view.checks.breathChanges = Math.abs(pausedA.controls.breath-view.closedBlink.controls.breath)>.001;
      await page.locator('#pause').dispatchEvent('click'); await delay(350); view.checks.resume = (await snap(page)).frameCount>pausedB.frameCount;
      const box=await page.locator('#stage').boundingBox();
      if (mobile) {
        const cdp=await context.newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width*.2,y:box.y+box.height*.4}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width*.85,y:box.y+box.height*.25}]});
        await delay(500); view.touch=await snap(page); await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        view.checks.touchDrag = view.touch.target.x>.6 && view.touch.target.y>.4;
      } else { await page.mouse.move(box.x+box.width*.15,box.y+box.height*.3); await delay(450); view.pointer=await snap(page); view.checks.pointer=view.pointer.target.x<-.6 && view.pointer.target.y>.3; }
      view.screenshots.push(await capture(page,name+'-interacting'));
      for (const direction of ['-1,0','0,1','0,-1','1,0']) {await page.locator(`[data-look="${direction}"]`).click();await delay(200);const s=await snap(page);view.checks['button_'+direction]=[s.target.x,s.target.y].join(',')===direction;if(direction==='-1,0')view.screenshots.push(await capture(page,name+'-look-left'));}
      await page.locator('#reset').dispatchEvent('click'); await delay(350); view.checks.center=Object.values((await snap(page)).target).every(v=>v===0);
      view.checks.noPageErrors=logs.pageerrors.length===0; view.checks.noUnexpectedConsoleErrors=logs.console.filter(l=>l.type==='error').length===0;
      const video=page.video(); await context.close(); if(video){view.video=path.join(out,'mobile390-interactions.webm');await video.saveAs(view.video);}
      fs.writeFileSync(path.join(out,'smoke-report.json'),JSON.stringify(report,null,2));
    }
    report.additionalCaptures=[];
    for(const [width,height] of [[375,667],[1280,900]]) {const context=await browser.newContext({viewport:{width,height},hasTouch:width<600,isMobile:width<600});const page=await context.newPage();const logs=attach(page);await ready(page);await delay(600);report.additionalCaptures.push({viewport:{width,height},logs,screenshot:await capture(page,`viewport-${width}x${height}`)});await context.close();}
    const reducedContext=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const reduced=await reducedContext.newPage();const reducedLogs=attach(reduced);await ready(reduced);await delay(300);
    const quiet=await sample(reduced,4500);report.reducedMotion={logs:reducedLogs,samples:quiet.map(s=>s.controls),screenshot:await capture(reduced,'reduced-motion')};
    report.checks.reducedMotionNoIdle=quiet.every(s=>s.reducedMotion&&s.controls.breath===0&&s.controls.blink===0&&s.controls.headYaw===0&&s.controls.headPitch===0);
    await reduced.locator('[data-look="-1,0"]').dispatchEvent('click');await delay(100);report.checks.reducedMotionControls=(await snap(reduced)).controls.gazeX===-1;
    await reducedContext.close();
    const lossContext=await browser.newContext({viewport:{width:390,height:844}});const loss=await lossContext.newPage();const lossLogs=attach(loss);await ready(loss);
    const extension=await loss.evaluate(()=>{const gl=document.querySelector('canvas').getContext('webgl2');const e=gl.getExtension('WEBGL_lose_context');if(e)e.loseContext();return !!e;});await delay(300);
    report.contextLoss={extension,snapshot:await snap(loss),logs:lossLogs,screenshot:await capture(loss,'context-loss')};report.checks.contextLossFallback=extension&&report.contextLoss.snapshot.failed&&await loss.locator('#fallback').isVisible()&&await loss.locator('#retry').isVisible();await lossContext.close();
    const renderContext=await browser.newContext({viewport:{width:390,height:844}});const renderFail=await renderContext.newPage();const renderLogs=attach(renderFail);await ready(renderFail);
    await renderFail.evaluate(()=>{const gl=document.querySelector('canvas').getContext('webgl2');gl.drawElements=()=>{throw new Error('Intentional smoke draw failure');};});await renderFail.waitForFunction(()=>window.grifonDebug.snapshot().failed);
    report.renderFailure={snapshot:await snap(renderFail),logs:renderLogs,screenshot:await capture(renderFail,'render-failure')};report.checks.renderExceptionFallback=report.renderFailure.snapshot.failed&&await renderFail.locator('#fallback').isVisible()&&renderLogs.pageerrors.length===0;await renderContext.close();
    const oldContext=await browser.newContext({viewport:{width:390,height:844}});
    await oldContext.route('**/main.js',async route=>{const response=await route.fetch();const source=await response.text();const replaced=source.replace(/function renderFrame\(\) \{[\s\S]*?\n\}\n\nfunction animate/, 'function renderFrame() { renderer.render(scene, camera); return true; }\n\nfunction animate');if(replaced===source)throw Error('Render regression mutation failed');await route.fulfill({response,body:replaced});});
    const old=await oldContext.newPage();const oldLogs=attach(old);await ready(old);await old.evaluate(()=>{document.querySelector('canvas').getContext('webgl2').drawElements=()=>{throw new Error('Intentional smoke draw failure');};});await delay(250);
    report.renderRegression={method:'Route-only reconstruction of prior unguarded render call; source files unchanged',snapshot:await snap(old),pageerrors:oldLogs.pageerrors,fallbackVisible:await old.locator('#fallback').isVisible()};report.checks.unguardedRenderRegressionRejected=!report.renderRegression.snapshot.failed&&!report.renderRegression.fallbackVisible&&oldLogs.pageerrors.length>0;await oldContext.close();
    const failContext=await browser.newContext({viewport:{width:320,height:740}});await failContext.route('**/scene.bin',route=>route.fulfill({status:503,body:'Intentional smoke fault'}));const fail=await failContext.newPage();const failLogs=attach(fail);await fail.goto(base);await fail.waitForFunction(()=>window.grifonDebug?.snapshot().failed);
    report.loadFailure={snapshot:await snap(fail),logs:failLogs,screenshot:await capture(fail,'load-failure')};report.checks.loadFailureFallback=await fail.locator('#fallback').isVisible()&&await fail.locator('#retry').isVisible();await failContext.unroute('**/scene.bin');await fail.locator('#retry').click();await fail.waitForFunction(()=>window.grifonDebug?.snapshot().ready);report.checks.retryRecovery=(await snap(fail)).ready;await failContext.close();
    report.sourceUnchanged=Object.entries(report.sourceHashes).every(([f,h])=>hash(f)===h);
    report.pass=report.views.every(v=>Object.values(v.checks).every(Boolean))&&Object.values(report.checks).every(Boolean)&&report.sourceUnchanged;
  } finally {await browser.close();report.finished=new Date().toISOString();fs.writeFileSync(path.join(out,'smoke-report.json'),JSON.stringify(report,null,2));}
  console.log(JSON.stringify({pass:report.pass,checks:report.checks,views:report.views.map(v=>({name:v.name,checks:v.checks,timing:v.warmFrameTiming,gpu:v.gpu,video:v.video})),report:path.join(out,'smoke-report.json')}));
  if(!report.pass)process.exitCode=1;
}
main().catch(e=>{report.errors.push(e.stack);fs.writeFileSync(path.join(out,'smoke-report.json'),JSON.stringify(report,null,2));console.error(e);process.exitCode=1;});
