import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {chromium} from 'playwright';

const qa=path.dirname(fileURLToPath(import.meta.url)),here=path.dirname(qa),root=path.resolve(here,'../../..');
const artifact=path.join(root,'artifacts/grifon-shader-recreation.html');
const film=path.join(here,'grifon-recreation-landscape-provisional.mp4');
const artifactExpected='a8e04c2f4f6ff218414ab7c90dffd9a7248587e652165a46e6af6a77ccb75ade';
const filmExpected='045ba2b06e283f2894fd8581c49fac8ef51780244c5cf6ec7a9fdfcb78c27dab';
const digest=bytes=>({bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
async function bind(file,expected){const value=digest(await fs.readFile(file));if(value.sha256!==expected)throw new Error(`Frozen candidate changed: ${path.basename(file)}`);return{file,...value};}
const report={scope:'Actual offline standalone player UI smoke of frozen current candidate; no full-film visual acceptance and no hearing claim',generatedAt:new Date().toISOString(),artifact:await bind(artifact,artifactExpected),film:await bind(film,filmExpected),viewports:[],console:[],externalRequests:[],allowedRequests:[],networkFailures:[],helperServersStarted:0,checks:[]};
const browser=await chromium.launch({headless:true});report.browserVersion=browser.version();
const contexts=[];
function check(name,pass,evidence){report.checks.push({name,pass,evidence});if(!pass)throw new Error(name);}
async function state(page){return page.evaluate(()=>{const v=document.querySelector('#film');return{currentTime:v.currentTime,duration:v.duration,videoWidth:v.videoWidth,videoHeight:v.videoHeight,readyState:v.readyState,paused:v.paused,seeking:v.seeking,ended:v.ended,muted:v.muted,playText:document.querySelector('#play').textContent,audioText:document.querySelector('#audio').textContent,audioPressed:document.querySelector('#audio').getAttribute('aria-pressed'),scrubValue:Number(document.querySelector('#scrub').value),scrubMax:Number(document.querySelector('#scrub').max),status:document.querySelector('#status').textContent};});}
async function inspectSize(page,label){
  const geometry=await page.evaluate(()=>({innerWidth:innerWidth,innerHeight:innerHeight,bodyWidth:document.body.scrollWidth,documentWidth:document.documentElement.scrollWidth,controls:[...document.querySelectorAll('button,a,input')].map(e=>{const r=e.getBoundingClientRect();return{id:e.id,width:r.width,height:r.height,x:r.x,y:r.y,disabled:e.disabled??false};})}));
  check(`${label}: no horizontal body/document overflow`,geometry.bodyWidth<=geometry.innerWidth&&geometry.documentWidth<=geometry.innerWidth,geometry);
  check(`${label}: every control target is at least44px`,geometry.controls.every(c=>c.width>=44&&c.height>=44),geometry.controls);
  return geometry;
}
async function exercise(width,height){
  const label=`${width}x${height}`,context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,offline:true,acceptDownloads:true});contexts.push(context);
  const expectedURL=pathToFileURL(artifact).href;
  await context.route('**/*',route=>{
    const url=route.request().url();
    if(url===expectedURL||url.startsWith('data:')||url.startsWith('blob:')){report.allowedRequests.push({viewport:label,url:url.startsWith('data:')?'data: [inline]':url});return route.continue();}
    report.externalRequests.push({viewport:label,url});return route.abort();
  });
  const page=await context.newPage();
  page.on('console',m=>{if(m.type()==='error')report.console.push({viewport:label,text:m.text()});});
  page.on('pageerror',e=>report.console.push({viewport:label,text:e.message}));
  page.on('requestfailed',r=>report.networkFailures.push({viewport:label,url:r.url(),failure:r.failure()}));
  const run={label,viewport:{width,height,deviceScaleFactor:1},offline:true,states:{},screenshots:[]};report.viewports.push(run);
  await page.goto(expectedURL,{waitUntil:'load'});
  await page.waitForFunction(()=>{const v=document.querySelector('#film');return v.readyState>=2&&!document.querySelector('#play').disabled&&!v.seeking;});
  run.geometry=await inspectSize(page,label);run.states.ready=await state(page);
  check(`${label}: inline film loads paused with correct dimensions`,run.states.ready.paused&&run.states.ready.videoWidth===1920&&run.states.ready.videoHeight===1080&&Math.abs(run.states.ready.duration-31.146667)<.003,run.states.ready);
  run.poster=await page.evaluate(async()=>{const v=document.querySelector('#film');return new Promise(resolve=>{const image=new Image();image.onload=()=>resolve({loaded:true,width:image.naturalWidth,height:image.naturalHeight,inline:v.poster.startsWith('data:image/'),filmInline:v.currentSrc.startsWith('data:video/mp4;base64,')});image.onerror=()=>resolve({loaded:false});image.src=v.poster;});});
  check(`${label}: inline poster decodes`,run.poster.loaded&&run.poster.inline&&run.poster.filmInline,run.poster);
  async function shot(phase){const file=`player-mobile-${label}-${phase}.png`;await page.screenshot({path:path.join(qa,file),fullPage:false,animations:'allow'});run.screenshots.push({phase,file,actualViewport:{width,height}});}
  await shot('poster');
  await page.locator('#play').click();await page.waitForFunction(()=>!document.querySelector('#film').paused&&document.querySelector('#film').currentTime>.25);
  run.states.playing=await state(page);check(`${label}: Play starts actual media`,!run.states.playing.paused&&run.states.playing.playText==='Pause',run.states.playing);await shot('playing');
  await page.locator('#play').click();await page.waitForFunction(()=>document.querySelector('#film').paused);
  run.states.pausedImmediate=await state(page);await page.waitForTimeout(250);run.states.pausedSettled=await state(page);
  check(`${label}: Pause holds media clock`,run.states.pausedSettled.paused&&Math.abs(run.states.pausedSettled.currentTime-run.states.pausedImmediate.currentTime)<.002,run.states.pausedSettled);
  await page.locator('#audio').click();run.states.muted=await state(page);
  check(`${label}: Mute state and labels update`,run.states.muted.muted&&run.states.muted.audioPressed==='true'&&run.states.muted.audioText==='Enable sound'&&run.states.muted.playText==='Play muted',run.states.muted);
  await page.locator('#play').click();await page.waitForFunction(()=>!document.querySelector('#film').paused&&document.querySelector('#film').currentTime>.65);
  await page.locator('#audio').click();run.states.unmutedPlaying=await state(page);
  check(`${label}: Unmute preserves playback and reports state`,!run.states.unmutedPlaying.muted&&!run.states.unmutedPlaying.paused&&run.states.unmutedPlaying.audioPressed==='false'&&run.states.unmutedPlaying.audioText==='Mute sound',run.states.unmutedPlaying);
  await page.locator('#play').click();await page.waitForFunction(()=>document.querySelector('#film').paused);
  const scrub=page.locator('#scrub'),rect=await scrub.boundingBox();await scrub.click({position:{x:rect.width*.56,y:rect.height*.5}});
  await page.waitForFunction(()=>{const v=document.querySelector('#film');return !v.seeking&&v.paused&&v.currentTime>10;});
  run.states.scrubSettled=await state(page);
  check(`${label}: Timeline scrubs and pauses at requested value`,Math.abs(run.states.scrubSettled.currentTime-run.states.scrubSettled.scrubValue)<.002,run.states.scrubSettled);await shot('scrub');
  await page.locator('#restart').click();await page.waitForFunction(()=>{const v=document.querySelector('#film');return !v.paused&&!v.seeking&&v.currentTime>.15&&v.currentTime<1;});
  run.states.restart=await state(page);check(`${label}: Restart resets and plays`,!run.states.restart.paused&&run.states.restart.currentTime<1,run.states.restart);
  run.naturalPlayStart=new Date().toISOString();let progress=Date.now();
  for(let count=0;count<200;count++){
    const actual=await state(page);
    if(actual.ended&&actual.paused){run.states.naturalEnd=actual;break;}
    if(Date.now()-progress>=10000){console.log(JSON.stringify({viewport:label,phase:'natural-play',clock:actual.currentTime}));progress=Date.now();}
    await page.waitForTimeout(250);
  }
  run.naturalPlayEnd=new Date().toISOString();
  check(`${label}: Natural completion reaches final container duration`,Boolean(run.states.naturalEnd)&&Math.abs(run.states.naturalEnd.currentTime-run.states.naturalEnd.duration)<.003&&run.states.naturalEnd.status==='Finished. Replay or download the film.',run.states.naturalEnd);await shot('ended');
  await page.locator('#play').click();await page.waitForFunction(()=>{const v=document.querySelector('#film');return !v.paused&&v.currentTime>.15&&v.currentTime<1;});run.states.replay=await state(page);
  check(`${label}: Play after natural end replays from start`,run.states.replay.currentTime<1&&!run.states.replay.paused,run.states.replay);
  await page.locator('#play').click();await page.waitForFunction(()=>document.querySelector('#film').paused);
  const downloadEvent=page.waitForEvent('download');await page.locator('#download').click();const download=await downloadEvent;
  const downloadFile=path.join(qa,`player-mobile-${label}-download.mp4`);await download.saveAs(downloadFile);
  run.download={suggestedFilename:download.suggestedFilename(),failure:await download.failure(),file:path.basename(downloadFile),...digest(await fs.readFile(downloadFile))};
  check(`${label}: Actual browser download matches frozen MP4 bytes`,run.download.failure===null&&run.download.sha256===filmExpected&&run.download.bytes===report.film.bytes,run.download);
  run.geometryAfter=await inspectSize(page,label);run.states.final=await state(page);
  await context.close();console.log(JSON.stringify({viewport:label,checks:'PLAYER_UI_COMPLETED',download:run.download.sha256}));
}
try{
  await exercise(390,844);await exercise(1280,844);
  report.finalArtifact=await bind(artifact,artifactExpected);report.finalFilm=await bind(film,filmExpected);
  check('Zero external requests while browser offline',report.externalRequests.length===0,report.externalRequests);
  check('Zero browser console/page errors',report.console.length===0,report.console);
  check('Zero observed failed network requests',report.networkFailures.length===0,report.networkFailures);
  report.status='PASS_TECHNICAL_PLAYER_CURRENT_CANDIDATE';
}catch(error){report.status='FAIL';report.error=String(error);process.exitCode=1;}
finally{
  for(const context of contexts)await context.close().catch(()=>{});
  await browser.close();
  await fs.writeFile(path.join(qa,'player-mobile-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,checks:report.checks.length,error:report.error,console:report.console,external:report.externalRequests,network:report.networkFailures}));
}
