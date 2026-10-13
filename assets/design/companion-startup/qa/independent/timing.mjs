import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const OUT=path.resolve('assets/design/companion-startup/qa/independent');
const browser=await chromium.launch({channel:'msedge',headless:true});
const observations=[];
for(const [width,height] of [[375,667],[1280,900]]) {
 const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block',reducedMotion:'no-preference'});
 const page=await context.newPage();
 const blocked=[];
 await page.addInitScript(()=>{
   delete window.SpeechRecognition;delete window.webkitSpeechRecognition;
   if(window!==window.top)return;
   const ledger={inserted:null,samples:[]};window.independentTiming=ledger;
   const visible=el=>{if(!el)return false;for(let p=el;p;p=p.parentElement){const css=getComputedStyle(p);if(css.display==='none'||css.visibility==='hidden'||Number(css.opacity)===0)return false;}return el.getBoundingClientRect().width>0;};
   new MutationObserver(records=>{
     for(const r of records)for(const n of r.addedNodes)if(n instanceof Element&&(n.matches('.companion-avatar-loading')||n.querySelector('.companion-avatar-loading'))) ledger.inserted={wall:performance.now(),timeline:document.timeline.currentTime};
   }).observe(document,{childList:true,subtree:true});
   const tick=()=>{
     const cue=document.querySelector('.companion-avatar-loading');
     if(cue){const css=getComputedStyle(cue),animation=cue.getAnimations().find(a=>a.animationName==='companion-loading-reveal');ledger.samples.push({wall:performance.now(),timeline:document.timeline.currentTime,visible:visible(cue),opacity:css.opacity,animation:animation?{startTime:animation.startTime,currentTime:animation.currentTime,delay:animation.effect.getTiming().delay,duration:animation.effect.getTiming().duration,playbackRate:animation.playbackRate}:null});}
     requestAnimationFrame(tick);
   };requestAnimationFrame(tick);
 });
 await page.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(route.request().method()==='GET'&&['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname))return route.continue();
   if(url.origin!=='http://127.0.0.1:5173'||url.pathname.startsWith('/api/')){blocked.push(url.pathname);return route.abort();}
   return route.continue();
 });
 let release;const held=new Promise(r=>release=r);
 await page.route('**/companion/scene.bin',async route=>{await held;await route.continue();});
 try{
   await page.goto('http://127.0.0.1:5173/companion-chat-preview.html',{waitUntil:'domcontentloaded'});
   await expect(page.getByRole('textbox',{name:'Message Grifon',exact:true})).toBeVisible();await page.waitForTimeout(900);
   const raw=await page.evaluate(()=>window.independentTiming),first=raw.samples.find(s=>s.visible);
   const before=raw.samples.filter(s=>s.timeline-raw.inserted.timeline<280&&s.visible);
   const report={width,height,inserted:raw.inserted,firstVisible:first,timelineElapsed:first.timeline-raw.inserted.timeline,wallElapsed:first.wall-raw.inserted.wall,visibleBefore280Timeline:before,blocked,samples:raw.samples};
   expect(first.animation.currentTime).toBeGreaterThanOrEqual(300);expect(report.timelineElapsed).toBeGreaterThanOrEqual(280);expect(before).toEqual([]);expect(blocked).toEqual([]);
   observations.push(report);console.log(JSON.stringify({width,timelineElapsed:report.timelineElapsed,wallElapsed:report.wallElapsed,firstAnimation:first.animation,visibleBefore280:before.length}));
 }finally{release();await context.close();}
}
await browser.close();
fs.writeFileSync(path.join(OUT,'timing.json'),JSON.stringify({command:'node assets/design/companion-startup/qa/independent/timing.mjs',exitCode:0,clockMeaning:'Native document.timeline verifies the CSS animation delay; wallElapsed retained as a separate observation and is not a UX-performance claim.',observations},null,2));
