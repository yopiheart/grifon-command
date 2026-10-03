// Actual browser-rendered revision isolation check; no AI analysis or API calls.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import sharp from 'sharp';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const scratch=path.join(root,'.tmp/grifon-motion-director/revision');
await mkdir(scratch,{recursive:true});
const spec=JSON.parse(await readFile(path.join(here,'demo.json'),'utf8'));
spec.copy.describe='CREATE';
const input=path.join(scratch,'revision.json');
await writeFile(input,JSON.stringify(spec));
const build=spawnSync(process.execPath,[path.join(here,'build.mjs'),input,scratch],{encoding:'utf8',windowsHide:true});
if(build.status!==0)throw new Error(build.stderr);
const chromePath=chromium.executablePath();
const browserPath=process.env.HYPERFRAMES_BROWSER_PATH || chromePath.replace(/chromium-(\d+)/,'chromium_headless_shell-$1').replace('chrome-win64','chrome-headless-shell-win64').replace(/chrome\.exe$/,'chrome-headless-shell.exe');
const browser=await chromium.launch({headless:true,executablePath:browserPath});
const results=[];
try{
 for(const [format,size] of Object.entries(spec.formats)){
  const original=await browser.newPage({viewport:size});
  const revised=await browser.newPage({viewport:size});
  for(const [page,folder] of [[original,here],[revised,scratch]]){
   await page.goto(pathToFileURL(path.join(folder,format,'index.html')).href);
   await page.evaluate(()=>document.fonts.ready);
  }
  for(const time of [1.5,4.8,7.5,9.5,11.5]){
   // GSAP timelines are thenable: returning seek() would await a paused timeline forever.
   for(const page of [original,revised])await page.evaluate(t=>{window.__timelines.main.seek(t,false);},time);
   const a=await original.screenshot();const b=await revised.screenshot();
   const changed=!a.equals(b);
   if(changed!==(time===4.8))throw new Error(`${format} unexpected change state at ${time}`);
   if(changed){
    const rect=await original.locator('.prompt').boundingBox();
    const pa=await sharp(a).removeAlpha().raw().toBuffer();const pb=await sharp(b).removeAlpha().raw().toBuffer();
    let inside=0,outside=0;
    for(let y=0;y<size.height;y++)for(let x=0;x<size.width;x++){
      const i=(y*size.width+x)*3;
      if(pa[i]===pb[i]&&pa[i+1]===pb[i+1]&&pa[i+2]===pb[i+2])continue;
      if(x>=Math.floor(rect.x)&&x<=Math.ceil(rect.x+rect.width)&&y>=Math.floor(rect.y)&&y<=Math.ceil(rect.y+rect.height))inside++;else outside++;
    }
    if(!inside||outside)throw new Error(`Revision leaked outside the prompt card: ${inside} inside, ${outside} outside`);
    await writeFile(path.join(scratch,`${format}-CREATE.png`),b);
    results.push({format,time,changedPixelsInsidePrompt:inside,changedPixelsOutsidePrompt:outside});
   } else results.push({format,time,pixelIdentical:true});
  }
  await original.close();await revised.close();
 }
} finally{await browser.close();}
await mkdir(path.join(here,'qa'),{recursive:true});
await writeFile(path.join(here,'qa/revision-check.json'),JSON.stringify({change:'DESCRIBE -> CREATE in disposable spec',actualBrowserFrames:true,passed:true,results},null,2)+'\n');
console.log('PASS: both layouts change only the prompt card; all other sampled beats are pixel-identical.');
