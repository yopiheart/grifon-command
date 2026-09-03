import { chromium } from 'playwright'; import { pathToFileURL } from 'node:url';
const [f,o,w]=process.argv.slice(2);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const p=await b.newPage({viewport:{width:+w,height:900},deviceScaleFactor:2});
await p.goto(pathToFileURL(f).href,{waitUntil:'networkidle'});
await p.evaluate(()=>document.fonts.ready).catch(()=>{}); await p.waitForTimeout(700);
await p.screenshot({path:o,fullPage:true}); console.log('ok'); await b.close();
