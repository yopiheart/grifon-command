const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const label=process.argv[2]||'baseline';
const stats=a=>{const b=[...a].sort((x,y)=>x-y);return {n:b.length,median:b[Math.floor(b.length*.5)]??0,p95:b[Math.floor(b.length*.95)]??0,max:b.at(-1)??0}};
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
let activeBrowser;
(async()=>{
 const browser=activeBrowser=await chromium.launch({channel:'msedge',headless:true});
 const sourceFiles=['components/CompanionChat/CompanionChatSurface.tsx','components/CompanionChat/CompanionAvatar.tsx',...(label==='baseline'?[]:['components/CompanionChat/CompanionComposer.tsx','components/CompanionChat/companionChat.css'])];
 const result={label,method:'Desktop Edge with actual WebGL avatar. Input-event to next animation-frame opportunity, not hardware key latency or a physical display measurement. Mobile viewport emulation; no iOS keyboard. Vite HMR socket disabled in measurement contexts.',targets:{inputNextFrameP95Ms:50,inputMaxMs:100,warmAvatarFrameP95Ms:33.4},cases:[],sourceHashes:Object.fromEntries(sourceFiles.map(f=>[f,label==='baseline'?crypto.createHash('sha256').update(execFileSync('git',['show','79c3a0de:'+f])).digest('hex'):sha(f)])),...(label==='baseline'?{baseCommit:'79c3a0de419e91c3de6570c4ce7ef87a7a033009',servedTransformedModuleHashes:Object.fromEntries(['CompanionChatSurface','CompanionAvatar'].map(n=>[n,sha(path.join(__dirname,'.baseline-'+n+'.js'))]))}:{})};
 for(const width of process.argv[3]?[Number(process.argv[3])]:[375,390,1280]){
  const context=await browser.newContext({viewport:{width,height:width===375?667:width===390?844:900},serviceWorkers:'block'});
  const page=await context.newPage(); page.setDefaultTimeout(6000); const errors=[];
  await page.routeWebSocket('**',socket=>socket.close());
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>{const u=new URL(r.request().url());if(r.request().method()==='GET'&&['fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname))return r.continue();return u.origin!=='http://127.0.0.1:5173'||u.pathname.startsWith('/api/')?r.abort():r.continue()});
  if(label==='baseline') for(const name of ['CompanionChatSurface','CompanionAvatar']) await page.route(new RegExp('/components/CompanionChat/'+name+'\\.tsx(?:\\?.*)?$'),r=>r.fulfill({contentType:'application/javascript',path:path.join(__dirname,'.baseline-'+name+'.js')}));
  await page.goto('http://127.0.0.1:5173/companion-chat-preview.html');
  await page.locator('iframe:visible[data-ready="true"]').waitFor({timeout:30000});
  await page.screenshot({path:path.join(__dirname,`${label}-${width}.png`)});
  // Use a valid draft produced by the application, then extend the transcript and attach a local sample.
  const image='data:image/jpeg;base64,'+fs.readFileSync('tests/fixtures/sample-batch/timpla-hero.jpg').toString('base64');
  await page.evaluate(({image})=>{
   const key='grifon_companion_draft:fixture-user-a'; const envelope=JSON.parse(localStorage.getItem(key));
   Object.assign(envelope.draft,{brief:'Cold brew coffee for busy parents. '.repeat(50),brandName:'Timpla',productName:'Cold brew',offer:'Two bottles for199',price:'199',heroImageBase64:image,imageName:'timpla-hero.jpg'});
   envelope.draft.messages=Array.from({length:100},(_,i)=>({id:`perf-${i}`,role:i%2?'user':'assistant',text:`Message${i+1}. `+'A product brief detail for the coffee campaign. '.repeat(20),at:Date.now()+i}));
   localStorage.setItem(key,JSON.stringify(envelope));
  },{image});
  await page.reload(); await page.locator('iframe:visible[data-ready="true"]').waitFor({timeout:30000});
  const frame=await(await page.locator('iframe:visible').elementHandle()).contentFrame();
  await page.evaluate(()=>{
   window.polishMeasure={input:[],frames:[],storage:[],longTasks:[],last:0,enabled:true}; const m=window.polishMeasure;
   const original=Storage.prototype.setItem;
   Storage.prototype.setItem=function(k,v){const start=performance.now();try{return original.call(this,k,v)}finally{m.storage.push({ms:performance.now()-start,bytes:v.length})}};
   document.addEventListener('input',event=>{if(event.target instanceof HTMLTextAreaElement){const start=performance.now();requestAnimationFrame(()=>m.input.push(performance.now()-start))}},true);
   const sample=t=>{if(m.enabled){if(m.last)m.frames.push(t-m.last);m.last=t;requestAnimationFrame(sample)}};requestAnimationFrame(sample);
   try{new PerformanceObserver(list=>m.longTasks.push(...list.getEntries().map(e=>e.duration))).observe({type:'longtask',buffered:false})}catch{}
  });
  const input=page.getByRole('textbox',{name:'Message Grifon'});
  const scroller=page.locator('[data-testid="companion-chat"] [class*="overflow-y-auto"]').first();
  await scroller.evaluate(e=>{e.scrollTop=Math.round((e.scrollHeight-e.clientHeight)*.5);e.dispatchEvent(new Event('scroll'))});
  const scrollBefore=await scroller.evaluate(e=>e.scrollTop);
  const typography=await input.evaluate(e=>{const s=getComputedStyle(e);return{fontSize:s.fontSize,fontFamily:s.fontFamily,letterSpacing:s.letterSpacing}});
  const text='Keep the coffee bottle and brand clear in a calm morning scene.';
  await input.pressSequentially(text,{delay:12,timeout:15000});
  await page.waitForTimeout(300);
  const typed=(await input.inputValue())===text,focused=await input.evaluate(e=>e===document.activeElement),scrollAfter=await scroller.evaluate(e=>e.scrollTop);
  const compositionBefore=await input.inputValue(); await input.dispatchEvent('compositionstart');await input.dispatchEvent('keydown',{key:'Enter',code:'Enter',isComposing:true});await input.dispatchEvent('compositionend');
  const imeKept=(await input.inputValue())===compositionBefore;
  const typing=await page.evaluate(()=>({input:[...window.polishMeasure.input],storage:[...window.polishMeasure.storage]}));
  await page.getByRole('button',{name:'Edit brief',exact:true}).click();
  const edit=page.locator('textarea').first();await edit.press('End');
  await page.evaluate(()=>{window.polishMeasure.input=[];window.polishMeasure.storage=[]});
  await edit.pressSequentially(' More context for a readable ad.',{delay:12,timeout:15000});
  await page.waitForTimeout(600);
  const editing=await page.evaluate(()=>({input:window.polishMeasure.input,storage:window.polishMeasure.storage}));
  await scroller.hover();await page.mouse.wheel(0,-900);await page.waitForTimeout(350);await page.mouse.wheel(0,650);await page.waitForTimeout(350);
  const measurement=await page.evaluate(()=>{window.polishMeasure.enabled=false;return window.polishMeasure});
  const avatar=await frame.evaluate(()=>{const s=window.grifonDebug.snapshot();const gl=document.querySelector('canvas').getContext('webgl2');const ext=gl.getExtension('WEBGL_debug_renderer_info');return {frames:s.rollingFrameTimes,frameCount:s.frameCount,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)}});
  result.cases.push({width,typography,typed,focused,imeKept,scrollBefore,scrollAfter,scrollPreserved:Math.abs(scrollAfter-scrollBefore)<=1,transcriptMessages:100,typing:{inputNextFrameMs:stats(typing.input),inputSamplesMs:typing.input,storageWrites:typing.storage.length},editing:{inputNextFrameMs:stats(editing.input),inputSamplesMs:editing.input,storageWrites:editing.storage.length,storageMs:stats(editing.storage.map(x=>x.ms)),storedBytes:editing.storage.at(-1)?.bytes??0},parentFrameMs:stats(measurement.frames),longTaskMs:stats(measurement.longTasks),longTaskSamplesMs:measurement.longTasks,avatarFrameMs:stats(avatar.frames),avatarFrameSamplesMs:avatar.frames.slice(-90),renderer:avatar.renderer,errors});
  fs.writeFileSync(path.join(__dirname,`${label}-metrics.json`),JSON.stringify(result,null,2));
  await context.close();
 }
 await browser.close();
 fs.writeFileSync(path.join(__dirname,`${label}-metrics.json`),JSON.stringify(result,null,2));
 console.log(JSON.stringify(result.cases.map(c=>({width:c.width,font:c.typography,typingP95:c.typing.inputNextFrameMs.p95,editingP95:c.editing.inputNextFrameMs.p95,scrollPreserved:c.scrollPreserved,avatarP95:c.avatarFrameMs.p95,errors:c.errors}))));
})().catch(async e=>{console.error(e);if(activeBrowser)await activeBrowser.close();process.exitCode=1});
