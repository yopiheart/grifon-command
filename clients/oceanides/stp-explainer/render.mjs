import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {chromium} from 'playwright';
import ffmpeg from 'ffmpeg-static';
const dir=fileURLToPath(new URL('.',import.meta.url)),root=resolve(dir,'..');
const story=JSON.parse(await readFile(join(dir,'story.json'),'utf8'));
const evidence=resolve('.tmp/oceanides-stp/frames-onsite');await mkdir(evidence,{recursive:true});await mkdir(join(dir,'output'),{recursive:true});
const server=createServer(async(req,res)=>{try{const p=resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!p.startsWith(root+'\\')&&!p.startsWith(root+'/'))throw Error('Path outside client');const data=await readFile(p);res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.json':'application/json','.png':'image/png'})[extname(p)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:process.argv.includes('--software')?['--use-angle=swiftshader','--enable-unsafe-swiftshader']:[]});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(`http://127.0.0.1:${server.address().port}/stp-explainer/scene.html`);await page.waitForFunction(()=>window.ready,null,{timeout:45000});
 const framesOnly=process.argv.includes('--frames-only');
 for(const s of story.scenes){await page.evaluate(t=>window.renderFrame(t),s.start+Math.min(3,(s.end-s.start)/2));await page.screenshot({path:join(evidence,`${s.id}.png`)});console.log('Reviewed frame: '+s.id);}
 if(errors.length)throw Error(errors.join('\n'));
 if(framesOnly){console.log('12 story frames ready.');}
 else{
  const fps=30,duration=story.scenes.at(-1).end,filename='Oceanides-Onsite-STP-Explainer-Visual-Draft-1080p.mp4';
  const output=join(dir,'output',filename);const enc=spawn(ffmpeg,['-hide_banner','-loglevel','warning','-y','-f','image2pipe','-framerate',String(fps),'-vcodec','mjpeg','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',output],{stdio:['pipe','ignore','pipe']});
  let logs='';enc.stderr.on('data',d=>logs+=d.toString());enc.stdin.on('error',()=>{});let failed;enc.on('error',e=>failed=e);const done=once(enc,'close');
  for(let i=0;i<duration*fps;i++){const data=await page.evaluate(t=>window.renderFrame(t),i/fps);if(!enc.stdin.write(Buffer.from(data,'base64')))await once(enc.stdin,'drain');if(i%(fps*10)===0)console.log(`Rendered ${i/fps}/${duration}s`);if(failed)throw failed;}
  enc.stdin.end();const [code]=await done;if(code!==0)throw Error('Encoder failed: '+logs);if(errors.length)throw Error(errors.join('\n'));
  await writeFile(join(evidence,'validation.json'),JSON.stringify({width:1920,height:1080,fps,duration,frames:duration*fps,scenes:story.scenes.length,errors,paidGeneration:false,narration:'Pending user approval',filename},null,2));console.log(output);
 }
}finally{await browser.close();await new Promise(ok=>server.close(ok));}
