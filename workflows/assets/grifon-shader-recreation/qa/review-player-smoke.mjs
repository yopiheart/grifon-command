import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import sharp from 'sharp';

const qa=path.dirname(fileURLToPath(import.meta.url));
const here=path.dirname(qa),origin='http://127.0.0.1:63407';
const fps=30000/1001,tolerance=0.000001;
const html=await fs.readFile(path.join(here,'review.html'),'utf8');
const report={status:'PENDING',scope:'Private localhost player technical smoke; no reference-fidelity or listening approval',generatedAt:new Date().toISOString(),checks:[],seeks:[],console:[],network:[],externalRequests:[],requestFailures:[],sourceHashes:{},screenshots:[],helperServersStarted:0};
for(const file of ['review.html','grifon-opening-pilot-silent.mp4','reference/source-x.mp4']){
  const bytes=await fs.readFile(path.join(here,file));report.sourceHashes[file]=crypto.createHash('sha256').update(bytes).digest('hex');
}
function check(name,pass,actual){report.checks.push({name,status:pass?'PASS':'FAIL',actual});}
const browser=await chromium.launch({headless:true});
async function contextFor(original=false){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
  await context.route('**/*',async route=>{
    const url=route.request().url();
    if(!url.startsWith(origin+'/')){report.externalRequests.push(url);await route.abort();return;}
    if(original&&url===origin+'/'){
      const guard='videos.forEach(v=>{if(Math.abs(v.currentTime-t)>0.000001)v.currentTime=t;});';
      if(!html.includes(guard))throw new Error('Original-control reconstruction guard no longer matches');
      await route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html.replace(guard,'videos.forEach(v=>v.currentTime=t);')});return;
    }
    await route.continue();
  });
  return context;
}
async function ready(page){await page.waitForFunction(()=>[...document.querySelectorAll('video')].length===2&&[...document.querySelectorAll('video')].every(v=>v.readyState>=2&&!v.seeking));}
async function state(page){await ready(page);return page.evaluate(()=>({frame:Number(document.querySelector('#seek').value),readout:document.querySelector('#readout').textContent,playLabel:document.querySelector('#play').textContent,videos:[...document.querySelectorAll('video')].map(v=>({id:v.id,currentTime:v.currentTime,paused:v.paused,seeking:v.seeking,ended:v.ended,readyState:v.readyState,muted:v.muted,rate:v.playbackRate,width:v.videoWidth,height:v.videoHeight,duration:v.duration}))}));}
function aligned(actual,frame){return actual.frame===frame&&actual.videos.every(v=>v.paused&&!v.seeking&&Math.abs(v.currentTime-frame/fps)<=tolerance);}
try{
  const context=await contextFor(),page=await context.newPage();
  page.on('pageerror',e=>report.console.push({type:'pageerror',message:e.message}));
  page.on('console',m=>{if(['error','warning'].includes(m.type()))report.console.push({type:m.type(),message:m.text()});});
  page.on('response',r=>report.network.push({url:r.url(),status:r.status(),resourceType:r.request().resourceType(),range:r.request().headers().range??null,contentRange:r.headers()['content-range']??null}));
  page.on('requestfailed',r=>report.requestFailures.push({url:r.url(),failure:r.failure()?.errorText,resourceType:r.resourceType(),range:r.headers().range??null}));
  await page.goto(origin+'/',{waitUntil:'load'});await ready(page);
  const initial=await state(page);check('Both inputs load with reference muted and silent pilot muted',initial.videos.every(v=>v.width===1920&&v.height===1080&&v.muted&&v.paused),initial);
  for(const [frame,label] of [[0,'Start'],[26,'Lens'],[57,'Warm lens'],[82,'Chrome'],[91,'Glass'],[97,'Gold'],[104,'Cream'],[111,'Carbon'],[119,'Chrome'],[126,'Voxel'],[132,'Glass field'],[138,'Flare'],[145,'Raised type'],[209,'Gray relief']]){
    await page.getByRole('button',{name:`${frame} / ${label}`,exact:true}).click();const actual=await state(page);report.seeks.push(actual);check(`Cut seek ${frame} pairs exact after native seeking=false`,aligned(actual,frame),actual);
  }
  await page.locator('#seek').press('End');let actual=await state(page);check('Shared slider terminal seek',aligned(actual,221),actual);
  await page.getByRole('button',{name:'Next frame',exact:true}).click();actual=await state(page);report.upperClamp=actual;check('Upper clamp preserves exact terminal pair',aligned(actual,221),actual);
  await page.getByRole('button',{name:'Previous frame',exact:true}).click();actual=await state(page);check('Previous frame from terminal',aligned(actual,220),actual);
  await page.getByRole('button',{name:'Next frame',exact:true}).click();actual=await state(page);check('Next frame to terminal',aligned(actual,221),actual);
  await page.locator('#seek').press('Home');await ready(page);await page.getByRole('button',{name:'Previous frame',exact:true}).click();actual=await state(page);check('Lower clamp preserves frame zero',aligned(actual,0),actual);
  await page.getByRole('button',{name:'Play both',exact:true}).click();await page.waitForFunction(()=>[...document.querySelectorAll('video')].every(v=>!v.paused));report.playStarted=await state(page);
  await page.waitForFunction(()=>document.querySelector('#seek').value==='221'&&[...document.querySelectorAll('video')].every(v=>v.paused),null,{timeout:20000});actual=await state(page);report.playEnded=actual;check('Natural full timeline playback stops paired at frame 221',aligned(actual,221)&&actual.playLabel==='Play both',actual);
  for(const rate of ['0.5','0.25','1']){await page.locator('#speed').selectOption(rate);actual=await state(page);check(`Speed ${rate} applies to both`,actual.videos.every(v=>v.rate===Number(rate)),actual.videos.map(v=>v.rate));}
  await page.locator('#audio').click();actual=await state(page);check('Reference audio toggle leaves pilot muted',actual.videos[0].muted===false&&actual.videos[1].muted===true,actual.videos.map(v=>({id:v.id,muted:v.muted})));
  await page.locator('#audio').click();actual=await state(page);check('Audio restored off',actual.videos.every(v=>v.muted),actual.videos.map(v=>({id:v.id,muted:v.muted})));
  await page.getByRole('button',{name:'145 / Raised type',exact:true}).click();await ready(page);
  for(const width of [390,1280]){
    await page.setViewportSize({width,height:844});await page.evaluate(()=>window.scrollTo(0,0));
    const layout=await page.evaluate(()=>({viewport:{width:innerWidth,height:innerHeight},body:{scrollWidth:document.body.scrollWidth,clientWidth:document.documentElement.clientWidth},controls:[...document.querySelectorAll('button,select,input')].map(e=>({label:e.textContent,id:e.id,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})),videos:[...document.querySelectorAll('video')].map(v=>({id:v.id,x:v.getBoundingClientRect().x,y:v.getBoundingClientRect().y,width:v.getBoundingClientRect().width,height:v.getBoundingClientRect().height}))}));
    const file=`review-player-native-${width}x844.png`,bytes=await page.screenshot({path:path.join(qa,file)}),metadata=await sharp(bytes).metadata();report.screenshots.push({file,width:metadata.width,height:metadata.height});
    check(`${width}px viewport and exact screenshot`,layout.viewport.width===width&&layout.viewport.height===844&&metadata.width===width&&metadata.height===844,{layout,screenshot:{width:metadata.width,height:metadata.height}});
    check(`${width}px no horizontal body overflow and controls at least 44px`,layout.body.scrollWidth<=layout.body.clientWidth&&layout.controls.every(c=>c.width>=44&&c.height>=44),layout);
    check(`${width}px paired layout`,width===390?layout.videos[1].y>layout.videos[0].y:layout.videos[1].x>layout.videos[0].x&&layout.videos[1].y===layout.videos[0].y,layout.videos);
  }
  // Chromium cancels superseded media range fetches when seeking. Preserve those
  // observations while still failing other request errors and any nonlocal fetch.
  report.expectedMediaRangeCancellations=report.requestFailures.filter(r=>r.failure==='net::ERR_ABORTED'&&r.resourceType==='media'&&[origin+'/reference.mp4',origin+'/pilot.mp4'].includes(r.url)&&report.network.some(n=>n.url===r.url&&[200,206].includes(n.status)));
  const unexpectedRequestFailures=report.requestFailures.filter(r=>!report.expectedMediaRangeCancellations.includes(r));
  check('No console errors, unexpected failed requests, or nonlocal requests',report.console.length===0&&unexpectedRequestFailures.length===0&&report.externalRequests.length===0,{console:report.console,unexpectedRequestFailures,expectedMediaRangeCancellations:report.expectedMediaRangeCancellations,externalRequests:report.externalRequests});
  const originalContext=await contextFor(true),originalPage=await originalContext.newPage();await originalPage.goto(origin+'/',{waitUntil:'load'});await ready(originalPage);await originalPage.locator('#seek').press('End');await ready(originalPage);await originalPage.getByRole('button',{name:'Next frame',exact:true}).click();const originalState=await state(originalPage);
  report.negativeControl={construction:'Current local HTML with only the one-microsecond redundant-assignment guard removed; no file/server changes',status:aligned(originalState,221)?'NOT_REPRODUCED_IN_HEADLESS_CHROMIUM':'FAIL_REPRODUCED',actual:originalState,originalIabFailureEvidence:'review-player-evidence-original-fail.json'};
  await originalContext.close();await context.close();
  const finalHtml=await fs.readFile(path.join(here,'review.html'));check('Review source unchanged during run',crypto.createHash('sha256').update(finalHtml).digest('hex')===report.sourceHashes['review.html'],report.sourceHashes['review.html']);
  report.status=report.checks.every(c=>c.status==='PASS')?'PASS':'FAIL';
}catch(error){report.status='FAIL';report.error=error.stack;}
finally{await browser.close();await fs.writeFile(path.join(qa,'review-player-native-report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({status:report.status,checks:report.checks.length,failed:report.checks.filter(c=>c.status==='FAIL').map(c=>c.name),negativeControl:report.negativeControl?.status,error:report.error??null,report:'qa/review-player-native-report.json'}));
process.exitCode=report.status==='PASS'?0:1;
