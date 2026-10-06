const {chromium}=require('playwright');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const out=__dirname,base='http://127.0.0.1:8765/',revision='e94959f1';
const states=require('./contract.json').states;
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const fixtures={};
  for(const file of ['index.html','main.js','style.css']) fixtures[file]=execFileSync('git',['show',`${revision}:assets/3d-lab/grifon-companion-live/${file}`],{encoding:'utf8'});
  await context.route('http://127.0.0.1:8765/**',async route=>{
    const file=new URL(route.request().url()).pathname.slice(1)||'index.html';
    if(file in fixtures)await route.fulfill({status:200,body:fixtures[file],contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});
    else await route.continue();
  });
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.goto(base);await page.waitForFunction(()=>window.grifonDebug?.snapshot().ready);
    const api=await page.evaluate(()=>typeof window.grifonCompanion?.setState==='function');
    const buttons={};for(const state of states)buttons[state]=await page.getByRole('button',{name:state,exact:true}).count();
    const screenshot=path.join(out,'baseline-contract-failure.png');await page.screenshot({path:screenshot,fullPage:true});
    const report={revision,method:'Route-only original index/main/style; no runtime files modified',fixtureHashes:Object.fromEntries(Object.entries(fixtures).map(([n,v])=>[n,crypto.createHash('sha256').update(v).digest('hex')])),stateApi:api,stateButtons:buttons,contractPass:api&&Object.values(buttons).every(v=>v===1),pageerrors:errors,screenshot};
    report.expectedBaselineRejection=!report.contractPass;
    fs.writeFileSync(path.join(out,'baseline-regression.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
    if(!report.expectedBaselineRejection)process.exitCode=1;
  }finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
