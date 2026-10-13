const {chromium}=require('playwright');const fs=require('node:fs');const path=require('node:path');const sharp=require('sharp');
let browser;
async function guard(page){await page.routeWebSocket('**',ws=>ws.close());await page.route('**/*',r=>{const u=new URL(r.request().url());if(r.request().method()==='GET'&&['fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname))return r.continue();return u.origin!=='http://127.0.0.1:5173'||u.pathname.startsWith('/api/')?r.abort():r.continue()});page.setDefaultTimeout(10000)}
(async()=>{
 browser=await chromium.launch({channel:'msedge',headless:true});const report={cases:[],video:'final-mobile.webm',emulationOnly:true,fixture:'Real UI/avatar, mocked callbacks and existing sample media, no provider calls'};
 for(const width of [375,390,1280]){
  const context=await browser.newContext({viewport:{width,height:width===375?667:width===390?844:900},isMobile:width<1000,hasTouch:width<1000,serviceWorkers:'block',...(width===390?{recordVideo:{dir:__dirname,size:{width:390,height:844}}}:{})});
  const page=await context.newPage();await guard(page);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/companion-chat-preview.html');await page.locator('iframe:visible[data-ready="true"]').waitFor({timeout:30000});await page.evaluate(()=>document.fonts.ready);
  const frameBounds=await page.locator('iframe:visible').boundingBox();
  await page.screenshot({path:path.join(__dirname,`final-empty-${width}.png`)});
  const input=page.getByRole('textbox',{name:'Message Grifon'});const press=async(name)=>{const b=page.getByRole('button',{name,exact:true});return width<1000?b.tap():b.click()};
  if(width===390)await input.pressSequentially('Coffee for busy parents. Make the bottle clear.',{delay:35});else await input.fill('Coffee for busy parents. Make the bottle clear.');
  await page.waitForTimeout(width===390?1800:500);await page.screenshot({path:path.join(__dirname,`final-typing-${width}.png`)});await page.locator('.companion-composer').screenshot({path:path.join(__dirname,`final-composer-${width}.png`)});
  await press('Send');for(const answer of ['Timpla','Cold brew','Two bottles for199','199']){await input.fill(answer);await press('Send')}
  await page.getByLabel('Product photo',{exact:true}).setInputFiles('tests/fixtures/sample-batch/timpla-hero.jpg');await page.getByRole('button',{name:'Generate storyboard',exact:true}).waitFor();await page.waitForTimeout(500);
  await page.getByRole('button',{name:'Generate storyboard',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:path.join(__dirname,`final-brief-${width}.png`)});
  await press('Generate storyboard');await page.waitForTimeout(width===390?4200:700);await page.screenshot({path:path.join(__dirname,`final-working-${width}.png`)});
  await page.evaluate(()=>window.companionFixture.emit('storyboard'));await page.waitForTimeout(width===390?2600:500);await page.screenshot({path:path.join(__dirname,`final-ready-${width}.png`)});
  const pause=await page.getByRole('button',{name:'Pause companion motion',exact:true}).boundingBox();
  report.cases.push({width,frameBounds,pauseTarget:pause,errors,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
  const video=page.video();await context.close();if(video){const raw=await video.path();await video.saveAs(path.join(__dirname,'final-mobile.webm'));if(path.basename(raw)!=='final-mobile.webm')fs.unlinkSync(raw)}
 }
 // Pixel evidence is deliberately sampled outside the mascot; it detects the observed white matte only.
 report.matte=[];
 for(const width of [375,1280]){
  const bounds=report.cases.find(c=>c.width===width).frameBounds;const x=Math.floor(bounds.x)+3,y=Math.floor(bounds.y)+3;
  const sample=async file=>{const{data,info}=await sharp(path.join(__dirname,file)).raw().toBuffer({resolveWithObject:true});return [...data.subarray((y*info.width+x)*info.channels,(y*info.width+x)*info.channels+3)]};
  const old=await sample(`white-iframe-regression-${width}.png`),fixed=await sample(`final-empty-${width}.png`);
  report.matte.push({width,x,y,failedScreenshotRGB:old,fixedScreenshotRGB:fixed,oldFails:old.every(c=>c>240),fixedPass:fixed.every(c=>c<64)});
 }
 await browser.close();browser=null;fs.writeFileSync(path.join(__dirname,'capture-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1});
