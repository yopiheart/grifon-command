import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import sharp from 'sharp';
const qa=path.dirname(fileURLToPath(import.meta.url)),here=path.dirname(qa),folder=path.join(qa,'review-player-timed-v2-single-captures');await fs.mkdir(folder,{recursive:true});
const origin='http://127.0.0.1:61632',expectedPair='0ef1e831e42a363f14d20591f4661c538f275818f3948597b6570766d0e478b9';
const receipt=JSON.parse(await fs.readFile(path.join(qa,'paired-review-receipt.json'),'utf8'));
if(receipt.inputs.pilot.sha256!=='50713631826e5b6cb7cf90d6795f6f20e492fbc970a5d63cc3cb82256b7e57e8'||receipt.inputs.reference.sha256!=='47c8bbc8e3d06953dd850500e4c7702ce690b3a4bc6708c4fc6a1f3d392df089'||receipt.output.sha256!==expectedPair)throw new Error('Pair receipt binding changed');
async function binding(){const bytes=await fs.readFile(path.join(here,'.tmp/paired-pilot.mp4')),sha256=crypto.createHash('sha256').update(bytes).digest('hex');if(sha256!==expectedPair)throw new Error('Paired stream bytes changed');return {bytes:bytes.length,sha256};}
const report={scope:'Independent timed visual inspection of one frame-aligned decoded comparison stream; left reference/right pilot, audio absent',generatedAt:new Date().toISOString(),binding:await binding(),receipt,plays:[],console:[],externalRequests:[],helperServersStarted:0};
const browser=await chromium.launch({headless:true});report.browserVersion=browser.version();const context=await browser.newContext({viewport:{width:1600,height:1000},deviceScaleFactor:1});
await context.route('**/*',route=>{if(route.request().url().startsWith(origin+'/'))return route.continue();report.externalRequests.push(route.request().url());return route.abort();});
const page=await context.newPage();page.on('pageerror',e=>report.console.push(e.message));page.on('console',m=>{if(m.type()==='error')report.console.push(m.text());});
async function clock(){return page.evaluate(()=>{const v=document.querySelector('#pair'),text=document.querySelector('#clock').textContent,match=text.match(/presented frame (\d+)/);return {currentTime:v.currentTime,frame:Number(document.querySelector('#seek').value),presentedFrame:match?Number(match[1]):null,clockText:text,paused:v.paused,seeking:v.seeking,rate:v.playbackRate,muted:v.muted,quality:v.getVideoPlaybackQuality().toJSON?.()??{totalVideoFrames:v.getVideoPlaybackQuality().totalVideoFrames,droppedVideoFrames:v.getVideoPlaybackQuality().droppedVideoFrames}};});}
async function play(rate,label,interval){
  await page.locator('#speed').selectOption(String(rate));await page.getByRole('button',{name:'Restart',exact:true}).click();await page.waitForFunction(()=>{const v=document.querySelector('#pair');return v.currentTime===0&&!v.seeking&&v.readyState>=2;});
  const rect=await page.locator('#pair').boundingBox(),play={rate,label,start:await clock(),wallStart:new Date().toISOString(),observations:[]};await page.getByRole('button',{name:'Play',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#pair').paused);
  for(let index=0;index<240;index++){
    const before=await clock(),file=`single-${label}-${String(index).padStart(3,'0')}.png`,wallBefore=new Date().toISOString();await page.screenshot({path:path.join(folder,file),clip:rect,animations:'allow'});const after=await clock();play.observations.push({file,wallBefore,wallAfter:new Date().toISOString(),before,after});
    if(after.paused&&after.presentedFrame===221)break;
    if(index===239)throw new Error('Playback observation cap exceeded');await page.waitForTimeout(interval);
  }
  play.end=await clock();play.wallEnd=new Date().toISOString();report.plays.push(play);await fs.writeFile(path.join(qa,'review-player-timed-v2-single-clocks.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({phase:label,observations:play.observations.length,presentedStart:play.observations[0].before.presentedFrame,presentedEnd:play.end.presentedFrame,clock:play.end.currentTime}));
}
try{await page.goto(origin+'/paired',{waitUntil:'load'});await page.waitForFunction(()=>{const v=document.querySelector('#pair');return v.readyState>=2&&!v.seeking;});await play(1,'normal',100);await play(0.25,'quarter',170);report.finalBinding=await binding();}
finally{await context.close();await browser.close();await fs.writeFile(path.join(qa,'review-player-timed-v2-single-clocks.json'),JSON.stringify(report,null,2)+'\n');}
const ranges=[[0,26,'opening'],[26,82,'lens'],[82,145,'ring-flare'],[145,222,'relief']];
for(const play of report.plays)for(const [start,end,name] of ranges){
  const all=play.observations.filter(o=>o.before.presentedFrame>=start&&o.before.presentedFrame<end),selected=all.length<=18?all:Array.from({length:18},(_,i)=>all[Math.round(i*(all.length-1)/17)]);if(!selected.length)continue;
  const width=960,height=270,labelHeight=22,tileHeight=height+labelHeight,rows=Math.ceil(selected.length/2),composite=[];
  for(let i=0;i<selected.length;i++){
    const o=selected[i],tile=await sharp(path.join(folder,o.file)).resize(width,height,{fit:'fill'}).png().toBuffer(),text=`${play.rate}x ${o.file} PRESENTED ${o.before.presentedFrame}-${o.after.presentedFrame} CLOCK ${o.before.currentTime.toFixed(4)}-${o.after.currentTime.toFixed(4)}`;
    composite.push({input:tile,left:i%2*width,top:Math.floor(i/2)*tileHeight});composite.push({input:Buffer.from(`<svg width="${width}" height="${labelHeight}"><rect width="100%" height="100%" fill="#111"/><text x="8" y="15" fill="white" font-family="monospace" font-size="12">${text}</text></svg>`),left:i%2*width,top:Math.floor(i/2)*tileHeight+height});
  }
  await sharp({create:{width:width*2,height:tileHeight*rows,channels:3,background:'#111'}}).composite(composite).jpeg({quality:93}).toFile(path.join(qa,`review-player-timed-v2-single-${play.label}-${name}.jpg`));
}
console.log(JSON.stringify({status:'TIMED_CAPTURED_FOR_VISUAL_REVIEW',plays:report.plays.map(p=>({rate:p.rate,observations:p.observations.length,presentedFinal:p.end.presentedFrame})),console:report.console,external:report.externalRequests}));
