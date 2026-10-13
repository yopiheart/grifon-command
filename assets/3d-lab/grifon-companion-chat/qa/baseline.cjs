const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
(async () => {
  const browser = await chromium.launch({channel:'msedge',headless:true});
  const context = await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  const page = await context.newPage();
  const blocked=[];
  await page.route('**/*', route=>{
    const u=new URL(route.request().url());
    if(u.origin!=='http://127.0.0.1:5173') {blocked.push(u.origin);return route.abort();}
    if(u.pathname.startsWith('/api/')&&!u.pathname.startsWith('/api/_lib/'))return route.fulfill({status:503,json:{error:'Baseline fixture blocks API calls'}});
    return route.continue();
  });
  await page.route(/\/services\/supabaseClient\.ts(?:\?.*)?$/,route=>{
    if(route.request().url().includes('baseline-original'))return route.fallback();
    return route.fulfill({contentType:'application/javascript',body:`
      export * from '/services/supabaseClient.ts?baseline-original';
      const session={access_token:'fixture-only',user:{id:'companion-baseline',email:'fixture@example.test',user_metadata:{}}};
      const query={select:()=>query,eq:()=>query,order:()=>query,limit:()=>query,maybeSingle:async()=>({data:{plan_id:'pro',status:'active'}}),single:async()=>({data:null}),then:r=>r({data:[]})};
      const channel={on:()=>channel,subscribe:()=>channel};
      export const getSupabase=()=>({auth:{getSession:async()=>({data:{session}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:()=>query,channel:()=>channel,removeChannel(){}});
    `});
  });
  await page.goto('http://127.0.0.1:5173/app?experience=companion');
  await page.waitForTimeout(5000);
  const chat=page.getByRole('textbox',{name:/message grifon|your message|message/i});
  const hasChat=await chat.count()>0;
  await page.screenshot({path:path.join(__dirname,'baseline390.png'),fullPage:true});
  const report={sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),url:page.url(),requiredFlow:'Enter a brief in the companion chat composer',passed:hasChat,expectedFailure:!hasChat,reason:hasChat?'Unexpected existing chat':'Rendered existing app has no companion message composer; guided chat flow cannot begin',blockedOrigins:[...new Set(blocked)]};
  fs.writeFileSync(path.join(__dirname,'baseline-report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
  await browser.close();
  process.exitCode=hasChat?0:1;
})().catch(e=>{console.error(e);process.exitCode=2});
