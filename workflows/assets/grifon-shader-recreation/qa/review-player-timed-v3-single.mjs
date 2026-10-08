import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import sharp from 'sharp';

const qa=path.dirname(fileURLToPath(import.meta.url)), here=path.dirname(qa);
const folder=path.join(qa,'review-player-timed-v3-single-captures');
await fs.mkdir(folder,{recursive:true});
const origin='http://127.0.0.1:61632';
const expected={
  reference:'47c8bbc8e3d06953dd850500e4c7702ce690b3a4bc6708c4fc6a1f3d392df089',
  pilot:'6815c6e5143257c2d8b4fa368735677754b8d57cc0685ccb7d2ce380459a1c69',
  pair:'d7622e8c2e71b24cf7da7806e80ea7456272bcec3b51efe761a2d5523ed3a4fa',
  html:'24be8ad9854fd37a8909ec81d403cae61a482de74b445dd8eb03e9afb2bb48cf',
};
const digest=bytes=>({bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
const receiptBytes=await fs.readFile(path.join(qa,'paired-review-receipt.json'));
const receipt=JSON.parse(receiptBytes);
if(receipt.inputs.pilot.sha256!==expected.pilot||receipt.inputs.reference.sha256!==expected.reference||receipt.output.sha256!==expected.pair)throw new Error('Pair receipt binding changed');
await fs.writeFile(path.join(qa,'review-player-timed-v3-receipt.json'),receiptBytes);
async function bindings(){
  const files={reference:'reference/source-x.mp4',pilot:'grifon-opening-pilot-silent.mp4',pair:'.tmp/paired-pilot.mp4',html:'paired-review.html'};
  const entries=await Promise.all(Object.entries(files).map(async([name,file])=>{
    const value=digest(await fs.readFile(path.join(here,file)));
    if(value.sha256!==expected[name])throw new Error(`${name} bytes changed`);
    return [name,{file,...value}];
  }));
  return Object.fromEntries(entries);
}
const report={scope:'Independent actual timed browser inspection of one frame-aligned decoded comparison stream; left reference/right pilot, audio absent',generatedAt:new Date().toISOString(),initialBindings:await bindings(),receiptBinding:digest(receiptBytes),receipt,plays:[],console:[],externalRequests:[],localNetworkFailures:[],helperServersStarted:0};
const browser=await chromium.launch({headless:true});
report.browserVersion=browser.version();
const context=await browser.newContext({viewport:{width:1600,height:1000},deviceScaleFactor:1});
report.viewport={width:1600,height:1000,deviceScaleFactor:1};
await context.route('**/*',route=>{
  if(route.request().url().startsWith(origin+'/'))return route.continue();
  report.externalRequests.push(route.request().url());return route.abort();
});
const page=await context.newPage();
page.on('pageerror',e=>report.console.push(e.message));
page.on('console',m=>{if(m.type()==='error')report.console.push(m.text());});
page.on('requestfailed',r=>report.localNetworkFailures.push({url:r.url(),type:r.resourceType(),failure:r.failure()}));
page.on('response',r=>{if(r.status()>=400)report.localNetworkFailures.push({url:r.url(),status:r.status()});});
async function clock(){
  return page.evaluate(()=>{
    const v=document.querySelector('#pair'),text=document.querySelector('#clock').textContent,match=text.match(/presented frame (\d+)/),quality=v.getVideoPlaybackQuality();
    return {currentTime:v.currentTime,frame:Number(document.querySelector('#seek').value),presentedFrame:match?Number(match[1]):null,clockText:text,paused:v.paused,seeking:v.seeking,rate:v.playbackRate,muted:v.muted,quality:{totalVideoFrames:quality.totalVideoFrames,droppedVideoFrames:quality.droppedVideoFrames}};
  });
}
const reportPath=path.join(qa,'review-player-timed-v3-single-clocks.json');
async function save(){await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');}
async function play(rate,label,interval){
  await page.locator('#speed').selectOption(String(rate));
  await page.getByRole('button',{name:'Restart',exact:true}).click();
  await page.waitForFunction(()=>{const v=document.querySelector('#pair');return v.currentTime===0&&!v.seeking&&v.readyState>=2;});
  const rect=await page.locator('#pair').boundingBox();
  const run={rate,label,start:await clock(),wallStart:new Date().toISOString(),videoDisplayRect:rect,observations:[]};
  await page.getByRole('button',{name:'Play',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('#pair').paused);
  for(let index=0;index<240;index++){
    const before=await clock(),file=`single-${label}-${String(index).padStart(3,'0')}.png`,wallBefore=new Date().toISOString();
    await page.screenshot({path:path.join(folder,file),clip:rect,animations:'allow'});
    const after=await clock();
    run.observations.push({file,wallBefore,wallAfter:new Date().toISOString(),before,after});
    if(after.paused&&after.presentedFrame===221)break;
    if(index===239)throw new Error('Playback observation cap exceeded');
    await page.waitForTimeout(interval);
  }
  run.end=await clock();run.wallEnd=new Date().toISOString();
  report.plays.push(run);await save();
  console.log(JSON.stringify({phase:label,observations:run.observations.length,presentedStart:run.observations[0].before.presentedFrame,presentedEnd:run.end.presentedFrame,clock:run.end.currentTime}));
}
try{
  const receiptResponsePromise=page.waitForResponse(origin+'/paired-receipt.json');
  const htmlResponse=await page.goto(origin+'/paired',{waitUntil:'load'});
  const servedHTML=await htmlResponse.body();
  report.servedHTML={url:htmlResponse.url(),status:htmlResponse.status(),cacheControl:htmlResponse.headers()['cache-control'],...digest(servedHTML)};
  if(report.servedHTML.sha256!==expected.html)throw new Error('Served HTML differs from bound source');
  await fs.writeFile(path.join(qa,'review-player-timed-v3-served.html'),servedHTML);
  const servedReceiptResponse=await receiptResponsePromise;
  const servedReceiptBytes=await servedReceiptResponse.body();
  report.servedReceipt={url:servedReceiptResponse.url(),status:servedReceiptResponse.status(),cacheControl:servedReceiptResponse.headers()['cache-control'],...digest(servedReceiptBytes)};
  if(report.servedReceipt.sha256!==report.receiptBinding.sha256)throw new Error('Served receipt differs from bound receipt');
  await page.waitForFunction(()=>{const v=document.querySelector('#pair');return v.readyState>=2&&!v.seeking;});
  await play(1,'normal',100);
  await play(0.25,'quarter',170);
  report.finalBindings=await bindings();
  report.captureStatus='TIMED_CAPTURED_FOR_VISUAL_REVIEW';
}catch(error){report.error=String(error);throw error;}
finally{await context.close();await browser.close();await save();}

const ranges=[[0,26,'opening'],[26,82,'lens'],[82,145,'ring-flare'],[145,222,'relief']];
for(const run of report.plays)for(const[start,end,name]of ranges){
  const all=run.observations.filter(o=>o.before.presentedFrame>=start&&o.before.presentedFrame<end);
  const selected=all.length<=18?all:Array.from({length:18},(_,i)=>all[Math.round(i*(all.length-1)/17)]);
  if(!selected.length)continue;
  const width=960,height=270,labelHeight=22,tileHeight=height+labelHeight,rows=Math.ceil(selected.length/2),composite=[];
  for(let i=0;i<selected.length;i++){
    const o=selected[i],tile=await sharp(path.join(folder,o.file)).resize(width,height,{fit:'fill'}).png().toBuffer();
    const caption=`${run.rate}x ${o.file} PRESENTED ${o.before.presentedFrame}-${o.after.presentedFrame} CLOCK ${o.before.currentTime.toFixed(4)}-${o.after.currentTime.toFixed(4)}`;
    composite.push({input:tile,left:i%2*width,top:Math.floor(i/2)*tileHeight});
    composite.push({input:Buffer.from(`<svg width="${width}" height="${labelHeight}"><rect width="100%" height="100%" fill="#111"/><text x="8" y="15" fill="white" font-family="monospace" font-size="12">${caption}</text></svg>`),left:i%2*width,top:Math.floor(i/2)*tileHeight+height});
  }
  await sharp({create:{width:width*2,height:tileHeight*rows,channels:3,background:'#111'}}).composite(composite).jpeg({quality:93}).toFile(path.join(qa,`review-player-timed-v3-single-${run.label}-${name}.jpg`));
}
console.log(JSON.stringify({status:report.captureStatus,plays:report.plays.map(p=>({rate:p.rate,observations:p.observations.length,presentedFinal:p.end.presentedFrame})),console:report.console,external:report.externalRequests,network:report.localNetworkFailures}));
