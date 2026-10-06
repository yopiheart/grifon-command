const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const out=__dirname;
const root=path.resolve(out,'../..');
const base='http://127.0.0.1:8765/';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const snapshot=page=>page.evaluate(()=>window.grifonDebug.snapshot());
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
const sourceHashes=()=>Object.fromEntries(['index.html','style.css','main.js','reactions.js','baked-body-clean.png'].filter(file=>fs.existsSync(path.join(root,file))).map(file=>[file,hash(file)]));
function logs(page){const evidence={console:[],pageerrors:[]};page.on('console',msg=>{if(['error','warning'].includes(msg.type()))evidence.console.push({type:msg.type(),message:msg.text(),location:msg.location()});});page.on('pageerror',error=>evidence.pageerrors.push(error.message));return evidence;}
async function load(page){await page.goto(base);await page.waitForFunction(()=>window.grifonDebug?.snapshot().ready||window.grifonDebug?.snapshot().failed);if(!(await snapshot(page)).ready)throw new Error('Reaction prototype failed to initialize');}
async function capture(page,name){await page.locator('#stage').scrollIntoViewIfNeeded();const pagePath=path.join(out,name+'.png');await page.screenshot({path:pagePath,fullPage:true});const bounds=await page.locator('#stage').boundingBox();const scroll=await page.evaluate(()=>({x:scrollX,y:scrollY}));const stagePath=path.join(out,name+'-stage.png');await page.screenshot({path:stagePath,clip:{x:bounds.x+scroll.x,y:bounds.y+scroll.y,width:bounds.width,height:Math.max(1,bounds.height-30)}});return{page:pagePath,stage:stagePath};}
async function samples(page,duration){return page.evaluate(duration=>new Promise(resolve=>{const frames=[],start=performance.now();function take(){frames.push(window.grifonDebug.snapshot());if(performance.now()-start<duration)requestAnimationFrame(take);else resolve(frames);}requestAnimationFrame(take);}),duration);}
function stats(values){const sorted=[...values].sort((a,b)=>a-b);return{samples:values.length,medianMs:sorted[Math.floor(sorted.length/2)],p95Ms:sorted[Math.floor(sorted.length*.95)],meanMs:values.reduce((a,b)=>a+b,0)/values.length};}
function save(name,data){fs.writeFileSync(path.join(out,name),JSON.stringify(data,null,2));}
module.exports={chromium,fs,path,out,root,base,wait,snapshot,hash,sourceHashes,logs,load,capture,samples,stats,save};
