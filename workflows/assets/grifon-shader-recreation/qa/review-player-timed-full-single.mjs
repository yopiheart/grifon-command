import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import sharp from 'sharp';

// Prepared independently. Execution requires the owner's frozen film/pair hashes
// and localhost origin; there is no default ready stream or fidelity verdict.
const qa=path.dirname(fileURLToPath(import.meta.url)), here=path.dirname(qa);
const options={};
for(let i=2;i<process.argv.length;i+=2){
  if(!process.argv[i].startsWith('--')||!process.argv[i+1])throw new Error('Use --origin URL --film-sha SHA256 --pair-sha SHA256');
  options[process.argv[i].slice(2)]=process.argv[i+1];
}
if(!options.origin||!options['film-sha']||!options['pair-sha'])throw new Error('Frozen owner input binding is required before playback');
const originURL=new URL(options.origin);
if(originURL.protocol!=='http:'||originURL.hostname!=='127.0.0.1'||originURL.pathname!=='/'||originURL.search||originURL.hash)throw new Error('Only a local development origin is permitted');
const origin=originURL.origin;
for(const name of ['film-sha','pair-sha','page-sha','receipt-sha'])if(options[name]&&!/^[a-f0-9]{64}$/.test(options[name]))throw new Error(`Invalid ${name}`);
const digest=bytes=>({bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
const expected={reference:'47c8bbc8e3d06953dd850500e4c7702ce690b3a4bc6708c4fc6a1f3d392df089',film:options['film-sha'],pair:options['pair-sha'],html:options['page-sha']??digest(await fs.readFile(path.join(here,'paired-full-review.html'))).sha256};
const receiptBytes=await fs.readFile(path.join(qa,'full-paired-review-receipt.json'));
const receipt=JSON.parse(receiptBytes);
if(receipt.inputs.reference.sha256!==expected.reference||receipt.inputs.film.sha256!==expected.film||receipt.output.sha256!==expected.pair)throw new Error('Full pair receipt input binding changed');
if(receipt.output.frames!==932||receipt.output.fps!=='30000/1001'||receipt.output.width!==1920||receipt.output.height!==540||receipt.output.audio!==false)throw new Error('Full pair timing/layout contract differs');
const receiptBinding=digest(receiptBytes);
if(options['receipt-sha']&&receiptBinding.sha256!==options['receipt-sha'])throw new Error('Owner receipt hash changed');
const producerBytes=await fs.readFile(path.join(qa,'full-media.json'));
const producerBinding=digest(producerBytes),producerReceipt=JSON.parse(producerBytes);
if(producerBinding.sha256!==receipt.producerReceiptSha256||producerReceipt.sha256!==expected.film||producerReceipt.prefixFramesVerified!==222)throw new Error('Accepted-prefix/producer binding differs');
const folder=path.join(qa,'review-player-timed-full-single-captures');
await fs.mkdir(folder,{recursive:true});
await fs.writeFile(path.join(qa,'review-player-timed-full-receipt.json'),receiptBytes);
await fs.writeFile(path.join(qa,'review-player-timed-full-producer-receipt.json'),producerBytes);
async function bindings(){
  const files={reference:'reference/source-x.mp4',film:'grifon-recreation-landscape-provisional.mp4',pair:'.tmp/paired-full.mp4',html:'paired-full-review.html'};
  const entries=await Promise.all(Object.entries(files).map(async([name,file])=>{
    const value=digest(await fs.readFile(path.join(here,file)));
    if(value.sha256!==expected[name])throw new Error(`${name} bytes changed`);
    return [name,{file,...value}];
  }));
  return Object.fromEntries(entries);
}
const report={scope:'Independent full-film actual timed browser inspection; one decoded silent comparison stream, source left/Grifon right, 932 native frames',generatedAt:new Date().toISOString(),expected,origin,initialBindings:await bindings(),receiptBinding,receipt,producerBinding,producerReceipt,plays:[],console:[],externalRequests:[],localNetworkFailures:[],helperServersStarted:0};
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
const reportPath=path.join(qa,'review-player-timed-full-single-clocks.json');
async function save(){await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');}
function sampleInterval(rate,frame){
  if(rate===1)return 100;
  // Denser actual-play capture covers brief montage cuts, responsive reflow,
  // spin, typing, and glitch. No frames are manually sought during a run.
  if([[222,258],[391,417],[496,547],[586,640]].some(([a,b])=>frame>=a&&frame<b))return 60;
  return 170;
}
async function play(rate,label){
  await page.locator('#speed').selectOption(String(rate));
  await page.getByRole('button',{name:'Restart',exact:true}).click();
  await page.waitForFunction(()=>{const v=document.querySelector('#pair');return v.currentTime===0&&!v.seeking&&v.readyState>=2;});
  const rect=await page.locator('#pair').boundingBox();
  const run={rate,label,start:await clock(),wallStart:new Date().toISOString(),videoDisplayRect:rect,observations:[]};
  await page.getByRole('button',{name:'Play',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('#pair').paused);
  let progressWall=Date.now();
  for(let index=0;index<1300;index++){
    const before=await clock(),file=`full-${label}-${String(index).padStart(4,'0')}.png`,wallBefore=new Date().toISOString();
    await page.screenshot({path:path.join(folder,file),clip:rect,animations:'allow'});
    const after=await clock();
    run.observations.push({file,wallBefore,wallAfter:new Date().toISOString(),before,after});
    if(Date.now()-progressWall>=10000){
      console.log(JSON.stringify({phase:label,progressPresented:after.presentedFrame,clock:after.currentTime,observations:run.observations.length}));progressWall=Date.now();
    }
    if(after.paused&&after.presentedFrame===931)break;
    if(index===1299)throw new Error('Playback observation cap exceeded');
    await page.waitForTimeout(sampleInterval(rate,after.presentedFrame));
  }
  run.end=await clock();run.wallEnd=new Date().toISOString();
  report.plays.push(run);await save();
  console.log(JSON.stringify({phase:label,observations:run.observations.length,presentedStart:run.observations[0].before.presentedFrame,presentedEnd:run.end.presentedFrame,clock:run.end.currentTime}));
}
try{
  const receiptResponsePromise=page.waitForResponse(origin+'/paired-full-receipt.json');
  const htmlResponse=await page.goto(origin+'/paired-full',{waitUntil:'load'});
  const servedHTML=await htmlResponse.body();
  report.servedHTML={url:htmlResponse.url(),status:htmlResponse.status(),cacheControl:htmlResponse.headers()['cache-control'],...digest(servedHTML)};
  if(report.servedHTML.sha256!==expected.html)throw new Error('Served HTML differs from bound source');
  await fs.writeFile(path.join(qa,'review-player-timed-full-served.html'),servedHTML);
  const servedReceiptResponse=await receiptResponsePromise;
  const servedReceiptBytes=await servedReceiptResponse.body();
  report.servedReceipt={url:servedReceiptResponse.url(),status:servedReceiptResponse.status(),cacheControl:servedReceiptResponse.headers()['cache-control'],...digest(servedReceiptBytes)};
  if(report.servedReceipt.sha256!==receiptBinding.sha256)throw new Error('Served receipt differs from bound receipt');
  await page.waitForFunction(()=>{const v=document.querySelector('#pair');return v.readyState>=2&&!v.seeking;});
  await play(1,'normal');
  await play(0.25,'quarter');
  report.finalBindings=await bindings();
  report.finalProducerBinding=digest(await fs.readFile(path.join(qa,'full-media.json')));
  if(report.finalProducerBinding.sha256!==producerBinding.sha256)throw new Error('Producer receipt changed during playback');
  report.captureStatus='TIMED_CAPTURED_FOR_VISUAL_REVIEW';
}catch(error){report.error=String(error);throw error;}
finally{await context.close();await browser.close();await save();}

const ranges=[[0,26,'opening'],[26,82,'lens'],[82,145,'ring-flare'],[145,222,'relief'],[222,258,'first-montage'],[258,307,'catalog'],[307,344,'capability-lens'],[344,397,'shell-montage'],[397,417,'rapid-pattern'],[417,445,'ribbon'],[445,496,'glyphs'],[496,541,'script-reflow'],[541,567,'script-spin-return'],[567,610,'storyboard-typing'],[610,640,'canvas-pullback-glitch'],[640,655,'end-onset'],[655,834,'end-hold'],[834,853,'end-fade'],[853,932,'black-tail']];
report.sheets=[];
for(const run of report.plays)for(const[start,end,name]of ranges){
  const all=run.observations.filter(o=>o.before.presentedFrame>=start&&o.before.presentedFrame<end);
  // Every capture is retained in chronological phase/chunk sheets; no sparse
  // sheet selection can conceal a brief pattern/reflow/typing transition.
  for(let offset=0;offset<all.length;offset+=18){
    const selected=all.slice(offset,offset+18),width=960,height=270,labelHeight=22,tileHeight=height+labelHeight,rows=Math.ceil(selected.length/2),composite=[];
    for(let i=0;i<selected.length;i++){
      const o=selected[i],tile=await sharp(path.join(folder,o.file)).resize(width,height,{fit:'fill'}).png().toBuffer();
      const caption=`${run.rate}x ${o.file} PRESENTED ${o.before.presentedFrame}-${o.after.presentedFrame} CLOCK ${o.before.currentTime.toFixed(4)}-${o.after.currentTime.toFixed(4)}`;
      composite.push({input:tile,left:i%2*width,top:Math.floor(i/2)*tileHeight});
      composite.push({input:Buffer.from(`<svg width="${width}" height="${labelHeight}"><rect width="100%" height="100%" fill="#111"/><text x="8" y="15" fill="white" font-family="monospace" font-size="12">${caption}</text></svg>`),left:i%2*width,top:Math.floor(i/2)*tileHeight+height});
    }
    const file=`review-player-timed-full-single-${run.label}-${name}-${String(offset/18).padStart(2,'0')}.jpg`;
    await sharp({create:{width:width*2,height:tileHeight*rows,channels:3,background:'#111'}}).composite(composite).jpeg({quality:93}).toFile(path.join(qa,file));
    report.sheets.push({rate:run.rate,phase:name,range:[start,end],file,captures:selected.map(o=>o.file)});
  }
}
await save();
console.log(JSON.stringify({status:report.captureStatus,plays:report.plays.map(p=>({rate:p.rate,observations:p.observations.length,presentedFinal:p.end.presentedFrame})),sheets:report.sheets.length,console:report.console,external:report.externalRequests,network:report.localNetworkFailures}));
