import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {chromium} from 'playwright';
import sharp from 'sharp';

const here=path.dirname(fileURLToPath(import.meta.url)),primary=process.env.GRIFON_TOOL_ROOT||'C:/Users/ADMIN/Desktop/grifon-command';
const spec=JSON.parse(fs.readFileSync(path.join(here,'pilot.json'),'utf8'));
const command=process.argv[2]||'samples',qa=path.join(here,'qa'),scratch=path.join(here,'.tmp/pilot-frames');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const sources=['pilot.json','pilot.html','pilot.js','surfaces.frag','vendor/three.global.js','assets/sdf-manifest.json','assets/introduction-sdf.bin','assets/relief-sdf.bin','assets/relief-height.bin'];
const manifest=Object.fromEntries(sources.map(file=>[file,hash(fs.readFileSync(path.join(here,file)))]));
fs.mkdirSync(qa,{recursive:true});
function run(exe,args){const result=spawnSync(exe,args,{encoding:'utf8',maxBuffer:32*1024*1024});if(result.status!==0)throw Error(`${path.basename(exe)} ${result.status}\n${result.stderr}\n${result.stdout}`);return result;}
const ffmpeg=path.join(primary,'node_modules/ffmpeg-static/ffmpeg.exe'),ffprobe=path.join(primary,'.tools/media-runtime/node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe');
const video=path.join(here,'grifon-opening-pilot-silent.mp4');
if(command==='encode'||command==='render') {
  // Encoding occurs below, after render, and requires an unchanged complete receipt.
}
const allowed=new Set([...sources,'assets/introduction-mask.png','assets/relief-mask.png']);
const server=http.createServer((request,response)=>{
  try{
    const route=decodeURIComponent(new URL(request.url,'http://localhost').pathname).slice(1)||'pilot.html';
    if(request.method!=='GET'||!allowed.has(route)){response.writeHead(404);response.end();return;}
    const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.bin':'application/octet-stream','.frag':'text/plain','.png':'image/png'};
    response.writeHead(200,{'Content-Type':mime[path.extname(route)],'Cache-Control':'no-store'});response.end(fs.readFileSync(path.join(here,route)));
  }catch{response.writeHead(404);response.end();}
});
const browserArgs=['--enable-gpu','--ignore-gpu-blocklist','--disable-gpu-rasterization'];
if(['samples','check','render'].includes(command)){
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
  const errors=[],externalRequests=[];let browser;
  async function open(){
    browser=await chromium.launch({headless:true,args:browserArgs});
    const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},deviceScaleFactor:1});
    await context.route('**/*',route=>{if(route.request().url().startsWith(origin+'/'))return route.continue();externalRequests.push(route.request().url());return route.abort();});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(origin+'/pilot.html');await page.waitForFunction(()=>window.__motionReady||window.__motionError,{}, {timeout:60000});
    const error=await page.evaluate(()=>window.__motionError);if(error)throw Error(error);
    return page;
  }
  async function capture(page,frame){await page.evaluate(async f=>window.seekPilotFrame(f),frame);return page.screenshot({type:'png',animations:'disabled'});}
  try{
    let page=await open();const samples=[],tiles=[];
    for(const [i,frame]of spec.sampleFrames.entries()){
      const bytes=await capture(page,frame),file=`pilot-frame-${String(frame).padStart(3,'0')}.png`;
      fs.writeFileSync(path.join(qa,file),bytes);samples.push({frame,time:frame*spec.fpsDenominator/spec.fpsNumerator,file,sha256:hash(bytes)});
      tiles.push({input:await sharp(bytes).resize(480,270).toBuffer(),left:i%4*480,top:Math.floor(i/4)*270});
    }
    await sharp({create:{width:1920,height:Math.ceil(samples.length/4)*270,channels:3,background:'#09090B'}}).composite(tiles).jpeg({quality:93}).toFile(path.join(qa,'pilot-contact-sheet.jpg'));
    const evidence=await page.evaluate(()=>window.__pilotEvidence);
    if(/swiftshader|llvmpipe|software/i.test(evidence.renderer))throw Error(`Software renderer fails hardware contract: ${evidence.renderer}`);
    const report={command,dimensions:[spec.width,spec.height],fps:`${spec.fpsNumerator}/${spec.fpsDenominator}`,frames:spec.frames,sources:manifest,samples,evidence,errors,externalRequests,providerCalls:0,paidSpendUsd:0};
    if(command!=='samples'){
      const replay=[];
      for(const sample of [...samples].reverse()){
        await capture(page,(sample.frame+71)%spec.frames);const bytes=await capture(page,sample.frame);
        if(hash(bytes)!==sample.sha256)throw Error(`Nonlinear seek changes frame ${sample.frame}`);
        replay.push({frame:sample.frame,nonlinearSha256:hash(bytes)});
      }
      await browser.close();page=await open();
      for(const sample of samples){const bytes=await capture(page,sample.frame);if(hash(bytes)!==sample.sha256)throw Error(`Fresh renderer changes frame ${sample.frame}`);replay.find(r=>r.frame===sample.frame).freshSha256=hash(bytes);}
      report.deterministicReplay={result:'EXACT_PASS',cases:replay};
      const invalid=await page.evaluate(async()=>{try{await window.seekPilotFrame(222);return false;}catch{return true;}});
      if(!invalid)throw Error('Invalid frame accepted');report.invalidFrameRejected=true;
      if(command==='render'){
        fs.mkdirSync(scratch,{recursive:true});const frames=[];
        for(let frame=0;frame<spec.frames;frame++){
          const file=`${String(frame).padStart(4,'0')}.png`,bytes=await capture(page,frame);fs.writeFileSync(path.join(scratch,file),bytes);frames.push({file,sha256:hash(bytes)});
          if(frame%30===0)console.log(`Pilot ${frame}/${spec.frames} local GPU frames`);
        }
        fs.writeFileSync(path.join(scratch,'receipt.json'),JSON.stringify({sources:manifest,frames},null,2)+'\n');
      }
    }
    if(errors.length||externalRequests.length)throw Error(`Runtime/network errors ${JSON.stringify({errors,externalRequests})}`);
    fs.writeFileSync(path.join(qa,`pilot-${command}.json`),JSON.stringify(report,null,2)+'\n');
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
if(['encode','render'].includes(command)){
  const receipt=JSON.parse(fs.readFileSync(path.join(scratch,'receipt.json'),'utf8'));
  if(JSON.stringify(receipt.sources)!==JSON.stringify(manifest)||receipt.frames.length!==spec.frames)throw Error('Capture receipt or source manifest differs');
  for(const frame of receipt.frames)if(hash(fs.readFileSync(path.join(scratch,frame.file)))!==frame.sha256)throw Error(`Captured frame changed ${frame.file}`);
  run(ffmpeg,['-y','-framerate',`${spec.fpsNumerator}/${spec.fpsDenominator}`,'-i',path.join(scratch,'%04d.png'),'-frames:v',String(spec.frames),'-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-an','-movflags','+faststart',video]);
}
if(['verify','encode','render'].includes(command)){
  const probe=JSON.parse(run(ffprobe,['-v','error','-count_frames','-show_streams','-show_format','-of','json',video]).stdout),v=probe.streams.find(s=>s.codec_type==='video');
  if(v.width!==spec.width||v.height!==spec.height||+v.nb_read_frames!==spec.frames||v.r_frame_rate!==`${spec.fpsNumerator}/${spec.fpsDenominator}`||v.pix_fmt!=='yuv420p'||probe.streams.some(s=>s.codec_type==='audio'))throw Error('Silent visual pilot media contract differs');
  run(ffmpeg,['-v','error','-xerror','-i',video,'-f','null','-']);
  fs.writeFileSync(path.join(qa,'pilot-media.json'),JSON.stringify({file:path.basename(video),bytes:fs.statSync(video).size,sha256:hash(fs.readFileSync(video)),frames:+v.nb_read_frames,dimensions:[v.width,v.height],fps:v.r_frame_rate,duration:+probe.format.duration,strictDecode:'PASS',audio:'intentionally absent: visual comparison pilot only',sources:manifest,providerCalls:0,paidSpendUsd:0},null,2)+'\n');
}
console.log(`PASS ${command}; reference fidelity is a separate independent verdict.`);
