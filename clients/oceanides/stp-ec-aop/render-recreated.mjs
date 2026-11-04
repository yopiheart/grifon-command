import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {chromium} from 'playwright';
import ffmpeg from 'ffmpeg-static';
const dir=dirname(fileURLToPath(import.meta.url)),root=resolve(dir,'..');
const story=JSON.parse(await readFile(join(dir,'story-aira-tight.json'),'utf8'));
const timing=JSON.parse(await readFile(join(dir,'source-edit-timing.json'),'utf8'));
const a=JSON.parse(await readFile(join(dir,'output/aira-alignment.json'),'utf8'));
const sha=x=>createHash('sha256').update(x).digest('hex');
if(sha(await readFile(join(dir,'output/Oceanides-EC-AOP-Aira-Raw.mp3')))!==timing.rawSha256)throw Error('Approved Aira source changed.');
const mapTime=t=>t-timing.cuts.reduce((n,c)=>n+Math.max(0,Math.min(t,c.end)-c.start),0)+timing.initialLeadSeconds;
const captions=[];
for(let i=0;i<story.scenes.length;i++){
 const s=story.scenes[i],seg=a.voice_segments[i],al=a.alignment;
 const chars=al.characters.slice(seg.character_start_index,seg.character_end_index).join('');if(chars!==s.vo)throw Error('Approved words differ '+s.id);
 let from=0;while(from<chars.length){let to=Math.min(chars.length,from+101);if(to<chars.length){const j=chars.lastIndexOf(' ',to);if(j>from)to=j;}const first=seg.character_start_index+from,last=seg.character_start_index+to-1;
  captions.push({scene:s.id,start:Math.max(s.start,mapTime(al.character_start_times_seconds[first])),end:Math.min(s.end,mapTime(al.character_end_times_seconds[last])+.06),text:chars.slice(from,to).trim()});from=to;while(chars[from]===' ')from++;
 }
}
await writeFile(join(dir,'recreation-captions.json'),JSON.stringify(captions,null,2)+'\n');
const sourceHtml=await readFile(join(dir,'scene-recreated.html'),'utf8');
if(/<video|source\/BioGreen|\.mp4|source-reference\//i.test(sourceHtml))throw Error('Recreation renderer must not use source footage pixels.');
const proof=process.argv.includes('--proof'),framesOnly=process.argv.includes('--frames-only'),offset=proof?story.scenes.find(s=>s.id==='ec').start:0;
const fps=30,duration=proof?4:story.duration,evidence=resolve('.tmp/oceanides-stp-ec-aop/recreated-frames');await mkdir(evidence,{recursive:true});
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!path.startsWith(root+'\\')&&!path.startsWith(root+'/'))throw Error('Outside client');res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.json':'application/json','.png':'image/png'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404);res.end();}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(`http://127.0.0.1:${server.address().port}/stp-ec-aop/scene-recreated.html`);await page.waitForFunction(()=>window.ready,null,{timeout:90000});
 for(const s of story.scenes){await page.evaluate(t=>window.renderFrame(t),s.start+Math.min(2,(s.end-s.start)/2));await page.screenshot({path:join(evidence,s.id+'.png')});console.log('Recreated frame: '+s.id);}
 for(const[name,time]of [['fractionation',46.4],['uv-detail',54.8]]){await page.evaluate(t=>window.renderFrame(t),time);await page.screenshot({path:join(evidence,name+'.png')});}
 if(errors.length)throw Error(errors.join('\n'));
 if(!framesOnly){
  const filename=proof?'Oceanides-STP-Recreated-3D-Motion-Proof.mp4':'Oceanides-STP-Recreated-3D-Silent-1080p.mp4',target=join(dir,'output',filename);
  const enc=spawn(ffmpeg,['-hide_banner','-loglevel','warning','-nostdin','-y','-f','image2pipe','-framerate',String(fps),'-vcodec','mjpeg','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',target],{stdio:['pipe','ignore','pipe']});let log='';enc.stderr.on('data',b=>log+=b);enc.stdin.on('error',()=>{});const done=once(enc,'close'),start=Date.now();
  for(let i=0;i<Math.round(duration*fps);i++){const b=await page.evaluate(t=>window.renderFrame(t),offset+i/fps);if(!enc.stdin.write(Buffer.from(b,'base64')))await once(enc.stdin,'drain');if(i%(fps*10)===0)console.log('Rendered original3D '+i/fps+'/'+duration+'s');}
  enc.stdin.end();const[code]=await done;if(code!==0)throw Error('Encode failed '+log);if(errors.length)throw Error(errors.join('\n'));
  await writeFile(join(evidence,proof?'motion-proof.json':'render.json'),JSON.stringify({filename,width:1920,height:1080,fps,frames:Math.round(duration*fps),duration,elapsedSeconds:(Date.now()-start)/1000,source:'Authored Blender mesh only; no supplier footage, source images or watermark textures',paidCalls:0,gpu:await page.evaluate(()=>window.renderInfo),errors},null,2)+'\n');console.log(target);
 }
}finally{await browser.close();await new Promise(ok=>server.close(ok));}
