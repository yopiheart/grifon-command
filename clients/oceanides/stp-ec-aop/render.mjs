import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join,extname,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {chromium} from 'playwright';
import ffmpeg from 'ffmpeg-static';
const dir=dirname(fileURLToPath(import.meta.url)),root=resolve(dir,'..');
const value=k=>{const i=process.argv.indexOf(k);return i<0?null:process.argv[i+1]};
const storyFile=value('--story')||'story.json',story=JSON.parse(await readFile(join(dir,storyFile),'utf8'));
const framesOnly=process.argv.includes('--frames-only'),proof=process.argv.includes('--motion-proof'),benchmark=process.argv.includes('--benchmark');
const fps=30,duration=benchmark?1:proof?4:story.scenes.at(-1).end,offset=proof||benchmark?(story.scenes.find(s=>s.id==='ec')?.start||0):0;
const outputDir=join(dir,'output'),evidence=resolve('.tmp/oceanides-stp-ec-aop/frames');await mkdir(outputDir,{recursive:true});await mkdir(evidence,{recursive:true});
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!path.startsWith(root+'\\')&&!path.startsWith(root+'/'))throw Error('Outside client');const b=await readFile(path);res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.json':'application/json','.png':'image/png','.glb':'model/gltf-binary'})[extname(path)]||'application/octet-stream');res.end(b)}catch{res.writeHead(404);res.end()}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:process.argv.includes('--software')?['--use-angle=swiftshader','--enable-unsafe-swiftshader']:process.argv.includes('--gpu')?['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist']:[]});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(`http://127.0.0.1:${server.address().port}/stp-ec-aop/scene.html?story=${encodeURIComponent(storyFile)}${process.argv.includes('--final')?'&final':''}`);await page.waitForFunction(()=>window.ready,null,{timeout:90000});
 for(const s of story.scenes){await page.evaluate(t=>window.renderFrame(t),s.start+Math.min(3,(s.end-s.start)/2));await page.screenshot({path:join(evidence,s.id+'.png')});console.log('Frame: '+s.id)}
 if(errors.length)throw Error(errors.join('\n'));
 if(!framesOnly){const filename=process.argv.includes('--final')?'Oceanides-EC-AOP-Reference-Matched-Silent-1080p.mp4':benchmark?'Oceanides-EC-AOP-GPU-Benchmark.mp4':proof?'Oceanides-EC-AOP-Motion-Proof-1080p.mp4':'Oceanides-EC-AOP-Visual-Review-1080p.mp4';const target=join(outputDir,filename);
  const enc=spawn(ffmpeg,['-hide_banner','-loglevel','warning','-y','-f','image2pipe','-framerate',String(fps),'-vcodec','mjpeg','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',target],{stdio:['pipe','ignore','pipe']});
  let log='';enc.stderr.on('data',d=>log+=d);enc.stdin.on('error',()=>{});const done=once(enc,'close');const began=Date.now();
  for(let i=0;i<Math.ceil(duration*fps);i++){const data=await page.evaluate(t=>window.renderFrame(t),offset+i/fps);if(!enc.stdin.write(Buffer.from(data,'base64')))await once(enc.stdin,'drain');if(i%(fps*5)===0)console.log('Rendered '+i/fps+'/'+duration+' sec; elapsed '+((Date.now()-began)/1000).toFixed(1)+'s');}
  enc.stdin.end();const[code]=await done;if(code!==0)throw Error('Encoding failed '+log);if(errors.length)throw Error(errors.join('\n'));
  const receipt={filename,width:1920,height:1080,fps,duration,frameCount:Math.ceil(duration*fps),elapsedSeconds:(Date.now()-began)/1000,sceneCount:story.scenes.length,sourceGeometry:'Original Blender master / evaluated mesh export',gpu:await page.evaluate(()=>window.renderInfo),paidCalls:0,voice:story.narrationAttached?'Aligned approved Aira narration; visual file is silent before final mix':'Narration not attached',errors};
  await writeFile(join(evidence,benchmark?'gpu-benchmark.json':proof?'motion-proof.json':'visual-review.json'),JSON.stringify(receipt,null,2));console.log(target);
 }
}finally{await browser.close();await new Promise(ok=>server.close(ok));}
