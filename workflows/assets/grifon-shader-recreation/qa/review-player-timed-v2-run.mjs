import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import sharp from 'sharp';
const qa=path.dirname(fileURLToPath(import.meta.url)),here=path.dirname(qa);
const folder=path.join(qa,'review-player-timed-v2-captures');await fs.mkdir(folder,{recursive:true});
const origin='http://127.0.0.1:63407',fps=30000/1001;
const expected={'grifon-opening-pilot-silent.mp4':'50713631826e5b6cb7cf90d6795f6f20e492fbc970a5d63cc3cb82256b7e57e8','reference/source-x.mp4':'47c8bbc8e3d06953dd850500e4c7702ce690b3a4bc6708c4fc6a1f3d392df089'};
const report={scope:'Independent actual timed visual comparison capture, audio muted; not a technical or listening approval',generatedAt:new Date().toISOString(),bindings:{},plays:[],console:[],externalRequests:[],helperServersStarted:0};
async function bind(){for(const file of Object.keys(expected)){const bytes=await fs.readFile(path.join(here,file)),sha256=crypto.createHash('sha256').update(bytes).digest('hex');if(sha256!==expected[file])throw new Error(`Exact input changed: ${file}`);report.bindings[file]={bytes:bytes.length,sha256};}}
await bind();const browser=await chromium.launch({headless:true});report.browserVersion=browser.version();
const context=await browser.newContext({viewport:{width:1600,height:1000},deviceScaleFactor:1});
await context.route('**/*',route=>{if(route.request().url().startsWith(origin+'/'))return route.continue();report.externalRequests.push(route.request().url());return route.abort();});
const page=await context.newPage();page.on('pageerror',e=>report.console.push(e.message));page.on('console',m=>{if(m.type()==='error')report.console.push(m.text());});
async function clock(){return page.evaluate(()=>({frame:Number(document.querySelector('#seek').value),status:document.querySelector('#readout').textContent,reference:document.querySelector('#reference').currentTime,pilot:document.querySelector('#pilot').currentTime,paused:[...document.querySelectorAll('video')].map(v=>v.paused),muted:[...document.querySelectorAll('video')].map(v=>v.muted),rates:[...document.querySelectorAll('video')].map(v=>v.playbackRate)}));}
async function play(rate,label,interval){
  await page.locator('#speed').selectOption(String(rate));await page.getByRole('button',{name:'Restart',exact:true}).click();await page.waitForFunction(()=>[...document.querySelectorAll('video')].every(v=>!v.seeking&&v.readyState>=2));
  const rect=await page.locator('.pair').boundingBox(),play={rate,label,start:await clock(),observations:[],wallStart:new Date().toISOString()};
  await page.getByRole('button',{name:'Play both',exact:true}).click();await page.waitForFunction(()=>[...document.querySelectorAll('video')].every(v=>!v.paused));
  let index=0;
  while(true){
    const before=await clock(),file=`${label}-${String(index).padStart(3,'0')}.png`,wallBefore=new Date().toISOString();
    await page.screenshot({path:path.join(folder,file),clip:rect,animations:'allow'});
    const after=await clock();play.observations.push({file,wallBefore,wallAfter:new Date().toISOString(),before,after});index++;
    if(after.frame===221&&after.paused.every(Boolean))break;
    if(index>240)throw new Error('Timed playback observation cap exceeded');
    await page.waitForTimeout(interval);
  }
  play.end=await clock();play.wallEnd=new Date().toISOString();play.maxObservedClockDeltaSeconds=Math.max(...play.observations.flatMap(o=>[Math.abs(o.before.reference-o.before.pilot),Math.abs(o.after.reference-o.after.pilot)]));report.plays.push(play);
  await fs.writeFile(path.join(qa,'review-player-timed-v2-clocks.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({phase:label,observations:index,start:play.start.pilot,end:play.end.pilot,maxClockDelta:play.maxObservedClockDeltaSeconds}));
}
try{await page.goto(origin+'/',{waitUntil:'load'});await page.waitForFunction(()=>[...document.querySelectorAll('video')].every(v=>v.readyState>=2&&!v.seeking));await play(1,'normal',100);await play(0.25,'quarter',170);await bind();}
finally{await context.close();await browser.close();await fs.writeFile(path.join(qa,'review-player-timed-v2-clocks.json'),JSON.stringify(report,null,2)+'\n');}
const ranges=[[0,0.868,'opening'],[0.868,2.7361,'lens'],[2.7361,4.8382,'ring-flare'],[4.8382,7.408,'relief']];
for(const play of report.plays){
  for(const [start,end,name] of ranges){
    const all=play.observations.filter(o=>o.before.pilot>=start&&o.before.pilot<end),selected=all.length<=18?all:Array.from({length:18},(_,i)=>all[Math.round(i*(all.length-1)/17)]);
    if(!selected.length)continue;
    const width=780,height=236,labelHeight=24,tileHeight=height+labelHeight,rows=Math.ceil(selected.length/2),composite=[];
    for(let i=0;i<selected.length;i++){
      const o=selected[i],tile=await sharp(path.join(folder,o.file)).resize(width,height,{fit:'fill'}).png().toBuffer(),text=`${play.rate}x ${o.file} REF ${o.before.reference.toFixed(4)}-${o.after.reference.toFixed(4)} / PILOT ${o.before.pilot.toFixed(4)}-${o.after.pilot.toFixed(4)}`;
      composite.push({input:tile,left:(i%2)*width,top:Math.floor(i/2)*tileHeight});composite.push({input:Buffer.from(`<svg width="${width}" height="${labelHeight}"><rect width="100%" height="100%" fill="#111"/><text x="8" y="16" fill="white" font-family="monospace" font-size="12">${text}</text></svg>`),left:(i%2)*width,top:Math.floor(i/2)*tileHeight+height});
    }
    await sharp({create:{width:width*2,height:tileHeight*rows,channels:3,background:'#111'}}).composite(composite).jpeg({quality:93}).toFile(path.join(qa,`review-player-timed-v2-${play.label}-${name}.jpg`));
  }
}
console.log(JSON.stringify({status:'CAPTURED_FOR_VISUAL_REVIEW',browser:report.browserVersion,plays:report.plays.map(p=>({rate:p.rate,observations:p.observations.length})),console:report.console,external:report.externalRequests,clockFile:'qa/review-player-timed-v2-clocks.json'}));
