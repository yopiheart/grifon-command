// Await each authored absolute-time GPU frame before capture. No network assets.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { actionMap, cueManifest } from '../grifon-motion-action-pilot/action-spec.mjs';
import { validateLaunchSpec } from './launch-contract.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(HERE,'../../..');
const PRIMARY=path.resolve(process.env.GRIFON_TOOL_ROOT||ROOT),require=createRequire(path.join(PRIMARY,'package.json'));
const {chromium}=require('playwright'),sharp=require('sharp');
const ffmpeg=path.join(PRIMARY,'node_modules/ffmpeg-static/ffmpeg.exe'),ffprobe=path.join(PRIMARY,'.tools/media-runtime/node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe');
const specPath=path.join(HERE,'launch.json'),spec=validateLaunchSpec(JSON.parse(fs.readFileSync(specPath,'utf8'))),actions=actionMap(spec);
const sourceNames=['index.html','composition.js','launch.json','launch-contract.mjs','contract.test.mjs','materials-source.js','shader-materials.js','build.mjs','render.mjs','../grifon-motion-action-pilot/action-spec.mjs',spec.assets.logo,spec.assets.displayFont,spec.assets.bodyFont,...spec.assets.captures,...spec.assets.portraitCaptures];
const task=process.argv[2]||'check',format=process.argv[3]||'landscape';
if(!['samples','check','render','encode','verify','verify-cache','cache-test','probe-contour'].includes(task)||!spec.formats[format])throw Error('Use samples|check|render|encode|verify|verify-cache|cache-test|probe-contour landscape|portrait');
const dimensions=spec.formats[format],QA=path.join(HERE,'qa'),SCRATCH=path.join(ROOT,'.tmp/grifon-shader-launch',format),frameDir=path.join(SCRATCH,'frames'),video=path.join(HERE,`${format}.mp4`);
fs.mkdirSync(QA,{recursive:true});fs.mkdirSync(SCRATCH,{recursive:true});
const hash=buffer=>crypto.createHash('sha256').update(buffer).digest('hex'),hashFile=file=>hash(fs.readFileSync(file));
const browserArgs=['--enable-unsafe-webgpu','--enable-gpu','--ignore-gpu-blocklist','--disable-dawn-features=use_dxc','--disable-gpu-rasterization'];
function run(file,args){const result=spawnSync(file,args,{encoding:'utf8',maxBuffer:16*1024*1024});if(result.status!==0)throw Error(`${path.basename(file)} failed (${result.status}): ${result.stderr?.slice(-4000)}`);return result;}
function validateCache(receipt,sourceRoot=HERE,framesRoot=frameDir,specSha256=hashFile(specPath),requiredSources=sourceNames){
  if(receipt.specSha256!==specSha256||receipt.frameCount!==936||!Array.isArray(receipt.frames)||receipt.frames.length!==936)throw Error('Capture frames do not match final spec');
  if(!receipt.sources||JSON.stringify(Object.keys(receipt.sources).sort())!==JSON.stringify([...requiredSources].sort()))throw Error('Capture source manifest is incomplete');
  for(const[name,digest]of Object.entries(receipt.sources))if(hashFile(path.join(sourceRoot,name))!==digest)throw Error(`Capture source changed since render: ${name}`);
  for(let i=0;i<936;i++){const frame=receipt.frames[i],name=`${String(i).padStart(4,'0')}.png`;if(frame.file!==name||hashFile(path.join(framesRoot,name))!==frame.sha256)throw Error(`Capture frame changed since render: ${name}`);}
  return receipt;
}
if(task==='cache-test'){
  const probe=path.join(SCRATCH,'cache-integrity-probe'),probeFrames=path.join(probe,'frames');fs.mkdirSync(probeFrames,{recursive:true});const bytes=Buffer.from('deliberate cache fixture'),source=path.join(probe,'source.txt');fs.writeFileSync(source,bytes);
  const frames=Array.from({length:936},(_,i)=>{const file=`${String(i).padStart(4,'0')}.png`;fs.writeFileSync(path.join(probeFrames,file),bytes);return {file,sha256:hash(bytes)};});
  const receipt={specSha256:'fixture',frameCount:936,sources:{'source.txt':hash(bytes)},frames},probeCheck=next=>validateCache(next,probe,probeFrames,'fixture',['source.txt']);probeCheck(receipt);
  const failures=[];for(const file of ['0000.png','0468.png','0935.png']){const target=path.join(probeFrames,file);fs.writeFileSync(target,Buffer.from('changed frame'));try{probeCheck(receipt);throw Error('Mutation incorrectly accepted');}catch(error){if(!error.message.startsWith('Capture frame changed'))throw error;failures.push({file,error:error.message});}finally{fs.writeFileSync(target,bytes);}}
  fs.writeFileSync(source,Buffer.from('changed served source'));try{probeCheck(receipt);throw Error('Source mutation incorrectly accepted');}catch(error){if(!error.message.startsWith('Capture source changed'))throw error;failures.push({file:'source.txt',error:error.message});}finally{fs.writeFileSync(source,bytes);}
  try{probeCheck({...receipt,sources:{}});throw Error('Missing source manifest incorrectly accepted');}catch(error){if(!error.message.startsWith('Capture source manifest'))throw error;failures.push({file:'omitted source.txt',error:error.message});}
  probeCheck(receipt);fs.writeFileSync(path.join(QA,'cache-integrity-test.json'),JSON.stringify({result:'PASS',verified:936,originalPass:true,mutationsRejected:failures,restoredPass:true},null,2)+'\n');
}
if(task==='verify-cache')validateCache(JSON.parse(fs.readFileSync(path.join(SCRATCH,'frame-receipt.json'),'utf8')));
function verify(file){
  const data=JSON.parse(run(ffprobe,['-v','error','-count_frames','-show_streams','-show_format','-of','json',file]).stdout),v=data.streams.find(s=>s.codec_type==='video'),a=data.streams.find(s=>s.codec_type==='audio');
  if(!v||v.width!==dimensions.width||v.height!==dimensions.height||v.r_frame_rate!==`${spec.fps}/1`||+v.nb_read_frames!==Math.round(spec.duration*spec.fps)||v.pix_fmt!=='yuv420p'||v.codec_name!=='h264'||Math.abs(+data.format.duration-spec.duration)>.02)throw Error(`${format} picture contract mismatch`);
  if(!a||a.codec_name!=='aac'||+a.sample_rate!==48000||a.channels!==2)throw Error(`${format} AAC contract mismatch`);
  run(ffmpeg,['-v','error','-xerror','-i',file,'-f','null','-']);
  const meter=run(ffmpeg,['-hide_banner','-i',file,'-af','ebur128=peak=true','-f','null','-']).stderr,summary=meter.slice(meter.lastIndexOf('Summary:'));
  const integratedLufs=+summary.match(/I:\s*([-\d.]+) LUFS/)[1],truePeakDbtp=+summary.match(/Peak:\s*([-\d.]+) dBFS/)[1];
  if(Math.abs(integratedLufs+16)>.7||truePeakDbtp> -1.5)throw Error(`Encoded AAC outside levels: ${integratedLufs} LUFS / ${truePeakDbtp} dBTP`);
  const bytes=fs.statSync(file).size;if(format==='portrait'&&bytes>12000000)throw Error('Portrait review exceeds 12 MB attachment limit');
  return {file:path.basename(file),bytes,sha256:hashFile(file),frames:+v.nb_read_frames,duration:+data.format.duration,dimensions:[v.width,v.height],fps:v.r_frame_rate,audio:{codec:a.codec_name,sampleRate:+a.sample_rate,channels:a.channels,integratedLufs,truePeakDbtp},strictDecode:'PASS'};
}

if(['samples','check','render','probe-contour'].includes(task)){
  const invalid=structuredClone(spec);invalid.actions.push({...invalid.actions[0]});const invalidPath=path.join(QA,'invalid-duplicate-action.json');fs.writeFileSync(invalidPath,JSON.stringify(invalid,null,2)+'\n');
  const rejected=spawnSync(process.execPath,[path.join(HERE,'contract.test.mjs'),'--validate',invalidPath],{encoding:'utf8'});
  if(rejected.status===0||!rejected.stderr.includes('duplicate/missing action ID'))throw Error('Invalid specification was not rejected');
  const server=http.createServer((request,response)=>{
    try{
      if(request.method!=='GET'){response.writeHead(404);response.end();return;}
      const relative=decodeURIComponent(new URL(request.url,'http://localhost').pathname);let file;
      if(relative==='/grifon-motion-action-pilot/action-spec.mjs')file=path.resolve(HERE,'../grifon-motion-action-pilot/action-spec.mjs');
      else if(relative.startsWith('/grifon-shader-launch/')){const name=relative.slice('/grifon-shader-launch/'.length)||'index.html';if(!/^(?:index\.html|composition\.js|launch\.json|launch-contract\.mjs|shader-materials\.js|assets\/(?:inter-(?:900|variable)\.ttf|logo\.png|captures\/[a-z-]+\.png))$/.test(name))throw Error('Route not in composition allowlist');file=path.join(HERE,name);}
      else throw Error('Unknown route');
      const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.png':'image/png','.ttf':'font/ttf'}[path.extname(file)];
      response.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-store'});response.end(fs.readFileSync(file));
    }catch{response.writeHead(404);response.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
  const errors=[],blocked=[];let browser;
  const open=async instance=>{
    const context=await instance.newContext({viewport:{width:dimensions.width,height:dimensions.height},deviceScaleFactor:1});
    await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith(origin+'/'))return route.continue();blocked.push(url);return route.abort();});
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto(`${origin}/grifon-shader-launch/?format=${format}`);
    await page.waitForFunction(()=>window.__motionReady||window.__motionError,{}, {timeout:60000});const error=await page.evaluate(()=>window.__motionError);if(error)throw Error(error);return page;
  };
  const capture=async(page,time)=>{await page.evaluate(async seconds=>{await window.seekComposition(seconds);},time);return page.screenshot({type:'png',animations:'disabled'});};
  try{
    browser=await chromium.launch({headless:true,args:browserArgs});let page=await open(browser);
    if(task==='probe-contour'){
      const measurements=[];for(const hidden of [false,true]){
        if(hidden)await page.addStyleTag({content:'#contour-field{display:none!important}'});
        await capture(page,spec.scenes.find(scene=>scene.id==='business').sample);
        const time=spec.scenes.find(scene=>scene.id==='research').sample,first=await capture(page,time);await capture(page,spec.duration);const replay=await capture(page,time);
        measurements.push({contourHidden:hidden,first:hash(first),replay:hash(replay),exact:hash(first)===hash(replay)});
      }
      fs.writeFileSync(path.join(QA,`${format}-contour-isolation.json`),JSON.stringify({purpose:'Diagnosis only, excluded from final verification.',measurements},null,2)+'\n');console.log(JSON.stringify(measurements));
    }else{
    const sampleTimes=spec.scenes.map(scene=>scene.sample),samples=[],tiles=[];
    for(const [index,time]of sampleTimes.entries()){
      const png=await capture(page,time),name=`${format}-sample-${String(index).padStart(2,'0')}.png`;fs.writeFileSync(path.join(QA,name),png);
      samples.push({scene:spec.scenes[index].id,time,file:name,sha256:hash(png)});
      const tw=format==='portrait'?270:480,th=format==='portrait'?480:270;tiles.push({input:await sharp(png).resize(tw,th).toBuffer(),left:index%4*tw,top:Math.floor(index/4)*th});
    }
    const tw=format==='portrait'?270:480,th=format==='portrait'?480:270;await sharp({create:{width:tw*4,height:th*3,channels:3,background:'#09090B'}}).composite(tiles).jpeg({quality:92}).toFile(path.join(QA,`${format}-contact-sheet.jpg`));
    fs.writeFileSync(path.join(QA,`${format}-poster.png`),await capture(page,spec.scenes.at(-1).sample));
    const safeCases=[];
    for(const scene of spec.scenes){
      await capture(page,scene.sample);
      const selectors=scene.id==='opening'?['#opening-copy']:['product','story','business'].includes(scene.id)?['#intent-copy']:['research','script','storyboard'].includes(scene.id)?['#workflow-title','#workflow-detail','.track-label']:scene.id.endsWith('-screen')?['#screen-copy','#screen-disclosure','#screen-panel']:scene.id==='direction'?['#direction-copy']:['#mark-ring','#brand-word','#brand-url'];
      const boxes=await page.evaluate(selectors=>selectors.flatMap(selector=>[...document.querySelectorAll(selector)].flatMap(element=>{
        if(element.children.length&&element.querySelector('.line'))return [...element.children].map(line=>{const r=document.createRange();r.selectNodeContents(line);const b=r.getBoundingClientRect();return {selector,text:line.textContent,x:b.x,y:b.y,width:b.width,height:b.height};});
        if(element.textContent.trim()){const r=document.createRange();r.selectNodeContents(element);const b=r.getBoundingClientRect();return[{selector,text:element.textContent,x:b.x,y:b.y,width:b.width,height:b.height}];}
        const b=element.getBoundingClientRect();return[{selector,x:b.x,y:b.y,width:b.width,height:b.height}];
      })),selectors);
      for(const box of boxes)if(box.x<dimensions.safeMargin||box.y<dimensions.safeMargin||box.x+box.width>dimensions.width-dimensions.safeMargin||box.y+box.height>dimensions.height-dimensions.safeMargin)throw Error(`Safe area fails: ${scene.id} ${JSON.stringify(box)}`);
      safeCases.push({scene:scene.id,boxes,result:'PASS'});
    }
    const base={date:new Date().toISOString(),format,resolution:[dimensions.width,dimensions.height],browser:browser.version(),browserArgs,specSha256:hashFile(specPath),samples,safeCases,invalidFixture:{file:path.basename(invalidPath),exitCode:rejected.status,error:rejected.stderr.match(/Error: (.+)/)?.[1]},providerCalls:0,paidSpendUsd:0};
    if(task==='samples'){const gpu=await page.evaluate(()=>window.__shaderEvidence);if(gpu?.renderer!=='WebGPU'||gpu.failure||gpu.adapter?.isFallbackAdapter)throw Error('Native adapter required');fs.writeFileSync(path.join(QA,`${format}-samples.json`),JSON.stringify({...base,gpu,runtimeErrors:errors,externalRequests:blocked},null,2)+'\n');}
    else{
      const nonlinear=[];for(const scene of spec.scenes){const firstPng=await capture(page,scene.sample),first=hash(firstPng);await capture(page,spec.duration);const replayPng=await capture(page,scene.sample),replay=hash(replayPng);if(first!==replay){fs.writeFileSync(path.join(QA,`${format}-nonlinear-first.png`),firstPng);fs.writeFileSync(path.join(QA,`${format}-nonlinear-replay.png`),replayPng);fs.writeFileSync(path.join(QA,`${format}-nonlinear-failure.json`),JSON.stringify({scene:scene.id,time:scene.sample,first,replay,state:await page.evaluate(()=>window.__motionState)},null,2));throw Error(`Nonlinear seek differs in ${scene.id}`);}nonlinear.push({scene:scene.id,time:scene.sample,first,nonlinear:replay});}
      // A new Chromium instance replays the whole composition in reverse order.
      await browser.close();browser=await chromium.launch({headless:true,args:browserArgs});page=await open(browser);
      for(const scene of [...spec.scenes].reverse()){const fresh=hash(await capture(page,scene.sample)),item=nonlinear.find(item=>item.scene===scene.id);if(item.first!==fresh)throw Error(`Fresh-browser seek differs in ${scene.id}`);item.fresh=fresh;item.result='EXACT_PASS';}
      const motionWindows=[];for(const window of spec.qa.motionWindows){const a=actions[window.actionId],times=window.fraction.map(f=>a.start+((a.contact??a.end)-a.start)*f),first=hash(await capture(page,times[0])),before=await page.locator(`#${a.target}`).evaluate(el=>({transform:getComputedStyle(el).transform,opacity:getComputedStyle(el).opacity,filter:getComputedStyle(el).filter})),last=hash(await capture(page,times[1])),after=await page.locator(`#${a.target}`).evaluate(el=>({transform:getComputedStyle(el).transform,opacity:getComputedStyle(el).opacity,filter:getComputedStyle(el).filter}));if(first===last||JSON.stringify(before)===JSON.stringify(after))throw Error(`Unexpected still inside target motion window ${window.actionId}`);motionWindows.push({...window,target:a.target,times,styles:[before,after],hashes:[first,last],result:'PASS'});}
      const finish=spec.scenes.at(-1),holdStart=hash(await capture(page,finish.readable[0])),holdEnd=hash(await capture(page,finish.readable[1]));if(holdStart!==holdEnd)throw Error('Final readable brand hold is not exact');
      const edit=spec.qa.contactMutation,revised=structuredClone(spec),action=actions[edit.actionId];revised.actions.find(a=>a.id===edit.actionId).contact+=edit.delta;validateLaunchSpec(revised);
      const revisionTime=Math.min(action.contact,revised.actions.find(a=>a.id===edit.actionId).contact),contactBefore=await capture(page,revisionTime),stateBefore=await page.evaluate(()=>window.__motionState);await page.evaluate(s=>window.setCompositionSpec(s),revised);const contactAfter=await capture(page,revisionTime),stateAfter=await page.evaluate(()=>window.__motionState);
      if(hash(contactBefore)===hash(contactAfter)||stateBefore.actions[edit.actionId]===stateAfter.actions[edit.actionId]||Math.max(stateBefore.actions[edit.actionId],stateAfter.actions[edit.actionId])!==1)throw Error('Contact edit did not change visual landing');
      fs.writeFileSync(path.join(QA,`${format}-contact-original.png`),contactBefore);fs.writeFileSync(path.join(QA,`${format}-contact-revised.png`),contactAfter);
      const cues=cueManifest(spec).cues.filter(c=>c.actionId===edit.actionId).map(before=>{const after=cueManifest(revised).cues.find(c=>c.id===before.id);if(Math.abs(after.start-before.start-edit.delta)>1e-8)throw Error('Audio cue did not follow revised contact');return {id:before.id,before:before.start,after:after.start};});
      await page.evaluate(s=>window.setCompositionSpec(s),spec);const copyTime=spec.scenes[0].sample,copyBefore=await capture(page,copyTime),stateCopyBefore=await page.evaluate(()=>window.__motionState),rect=await page.locator('#opening-copy').boundingBox();
      const copySpec=structuredClone(spec);copySpec.copy[spec.qa.copyMutation.key]=spec.qa.copyMutation.value;await page.evaluate(s=>window.setCompositionSpec(s),copySpec);const copyAfter=await capture(page,copyTime),stateCopyAfter=await page.evaluate(()=>window.__motionState);
      if(JSON.stringify(stateCopyBefore)!==JSON.stringify(stateCopyAfter))throw Error('Copy-only edit changed clocks');
      const beforePixels=await sharp(copyBefore).removeAlpha().raw().toBuffer(),afterPixels=await sharp(copyAfter).removeAlpha().raw().toBuffer();let changedInside=0,changedOutside=0;
      for(let y=0;y<dimensions.height;y++)for(let x=0;x<dimensions.width;x++){const n=(y*dimensions.width+x)*3;if(beforePixels[n]!==afterPixels[n]||beforePixels[n+1]!==afterPixels[n+1]||beforePixels[n+2]!==afterPixels[n+2]){if(x>=rect.x-4&&x<=rect.x+rect.width+4&&y>=rect.y-4&&y<=rect.y+rect.height+4)changedInside++;else changedOutside++;}}
      if(!changedInside||changedOutside)throw Error(`Copy-only pixels escape intended line: ${changedInside}/${changedOutside}`);
      fs.writeFileSync(path.join(QA,`${format}-copy-original.png`),copyBefore);fs.writeFileSync(path.join(QA,`${format}-copy-revised.png`),copyAfter);await page.evaluate(s=>window.setCompositionSpec(s),spec);
      const gpu=await page.evaluate(()=>window.__shaderEvidence);if(gpu?.renderer!=='WebGPU'||gpu.failure||gpu.adapter?.isFallbackAdapter)throw Error('Native WebGPU adapter success required');
      const sources=Object.fromEntries(sourceNames.map(name=>[name,hashFile(path.join(HERE,name))]));
      fs.writeFileSync(path.join(QA,`${format}-capture-check.json`),JSON.stringify({...base,sources,nonlinear,motionWindows,stillBrandHold:{result:'EXACT_PASS',start:finish.readable[0],end:finish.readable[1],sha256:holdStart},contactRevision:{result:'PASS',actionId:edit.actionId,delta:edit.delta,cues},copyRevision:{result:'PASS',changedInside,changedOutside},gpu,runtimeErrors:errors,externalRequests:blocked},null,2)+'\n');
      if(task==='render'){
        await browser.close();browser=await chromium.launch({headless:true,args:browserArgs});page=await open(browser);fs.mkdirSync(frameDir,{recursive:true});
        const frames=[];for(let frame=0;frame<Math.round(spec.duration*spec.fps);frame++){const file=`${String(frame).padStart(4,'0')}.png`,png=await capture(page,frame/spec.fps);fs.writeFileSync(path.join(frameDir,file),png);frames.push({file,sha256:hash(png)});if(frame%60===0)console.log(`${format}: ${frame}/936 frames`);}
        const receipt=JSON.stringify({format,specSha256:hashFile(specPath),sources,frameCount:936,browserArgs,frames,providerCalls:0,paidSpendUsd:0},null,2)+'\n';
        fs.writeFileSync(path.join(SCRATCH,'frame-receipt.json'),receipt);fs.writeFileSync(path.join(QA,`${format}-frame-receipt.json`),receipt);
      }
    }
    if(errors.length||blocked.length)throw Error(`Runtime/network errors: ${JSON.stringify({errors,blocked})}`);
    }
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
if(['render','encode'].includes(task)){
  validateCache(JSON.parse(fs.readFileSync(path.join(SCRATCH,'frame-receipt.json'),'utf8')));
  run(process.execPath,[path.join(HERE,'audio.mjs')]);
  const videoOptions=format==='portrait'?['-preset','medium','-b:v','2300k','-maxrate','2700k','-bufsize','5400k']:['-preset','medium','-crf','19','-maxrate','6500k','-bufsize','13000k'];
  run(ffmpeg,['-y','-framerate',String(spec.fps),'-i',path.join(frameDir,'%04d.png'),'-i',path.join(HERE,'mix-master.wav'),'-map','0:v:0','-map','1:a:0','-frames:v','936','-c:v','libx264',...videoOptions,'-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-t',String(spec.duration),'-movflags','+faststart',video]);
}
if(['verify','render','encode'].includes(task))fs.writeFileSync(path.join(QA,`${format}-media.json`),JSON.stringify({specSha256:hashFile(specPath),output:verify(video),providerCalls:0,paidSpendUsd:0},null,2)+'\n');
console.log(`PASS ${task}: ${format}, local-only Grifon shader launch.`);
