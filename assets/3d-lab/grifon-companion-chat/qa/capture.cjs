const {chromium}=require('playwright');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
  const page=await context.newPage();
  await page.route('**/*',r=>{const u=new URL(r.request().url());if(r.request().method()==='GET'&&['fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname))return r.continue();return u.origin!=='http://127.0.0.1:5173'||u.pathname.startsWith('/api/')?r.abort():r.continue()});
  await page.goto('http://127.0.0.1:5173/companion-chat-preview.html');
  await page.locator('iframe:visible[data-ready="true"]').waitFor({timeout:30000});
  await page.screenshot({path:path.join(__dirname,`early-${width}.png`),fullPage:true});
  await context.close();
 }
 await browser.close();
 console.log('captured early-390.png and early-1280.png');
})().catch(e=>{console.error(e);process.exitCode=1});
