// Independent checks on the encoded deliverables, rather than browser frame buffers.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateSpec, actionMap } from '../grifon-motion-action-pilot/action-spec.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const PRIMARY=process.env.GRIFON_TOOL_ROOT;
if(!PRIMARY)throw Error('Set GRIFON_TOOL_ROOT to the existing primary runtime');
const require=createRequire(path.join(PRIMARY,'package.json')),sharp=require('sharp');
const ffmpeg=path.join(PRIMARY,'node_modules/ffmpeg-static/ffmpeg.exe');
const ffprobe=path.join(PRIMARY,'.tools/media-runtime/node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe');
const spec=validateSpec(JSON.parse(fs.readFileSync(path.join(HERE,'launch.json'),'utf8'))),actions=actionMap(spec);
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function run(exe,args,binary=false){const r=spawnSync(exe,args,{encoding:binary?null:'utf8',maxBuffer:48*1024*1024});if(r.status!==0)throw Error(`${path.basename(exe)} exit ${r.status}: ${r.stderr.toString().slice(-1800)}`);return r;}
const frameAt=(file,time)=>run(ffmpeg,['-v','error','-ss',String(time),'-i',file,'-frames:v','1','-f','image2pipe','-vcodec','png','-'],true).stdout;
const report={date:new Date().toISOString(),specSha256:sha(fs.readFileSync(path.join(HERE,'launch.json'))),files:[],providerCalls:0,paidSpendUsd:0,auditoryQa:'PENDING: encoded AAC levels and timing are measured; direct listening is unavailable.'};
for(const format of ['landscape','portrait']){
  const file=path.join(HERE,`${format}.mp4`),bytes=fs.readFileSync(file);
  const data=JSON.parse(run(ffprobe,['-v','error','-count_frames','-show_streams','-show_format','-of','json',file]).stdout);
  const v=data.streams.find(s=>s.codec_type==='video'),a=data.streams.find(s=>s.codec_type==='audio'),layout=spec.formats[format];
  if(!v||v.codec_name!=='h264'||v.pix_fmt!=='yuv420p'||v.width!==layout.width||v.height!==layout.height||v.r_frame_rate!==`${spec.fps}/1`||+v.nb_read_frames!==Math.round(spec.duration*spec.fps)||Math.abs(+data.format.duration-spec.duration)>.02)throw Error(`${format}: video contract failed`);
  if(!a||a.codec_name!=='aac'||+a.sample_rate!==48000||a.channels!==2)throw Error(`${format}: audio contract failed`);
  if(format==='portrait'&&bytes.length>12000000)throw Error('Portrait exceeds12MB');
  run(ffmpeg,['-v','error','-xerror','-i',file,'-f','null','-']);
  const meter=run(ffmpeg,['-hide_banner','-i',file,'-af','ebur128=peak=true','-f','null','-']).stderr;
  const summary=meter.slice(meter.lastIndexOf('Summary:')),integratedLufs=+summary.match(/I:\s*([-\d.]+) LUFS/)[1],truePeakDbtp=+summary.match(/Peak:\s*([-\d.]+) dBFS/)[1];
  if(Math.abs(integratedLufs+16)>.7||truePeakDbtp>-1.5)throw Error(`${format}: encoded AAC ${integratedLufs}LUFS/${truePeakDbtp}dBTP violates mix contract`);
  const folder=path.join(HERE,'qa',`encoded-${format}`);fs.mkdirSync(folder,{recursive:true});
  const times=[...new Set([...spec.scenes.flatMap(scene=>[scene.sample??(scene.readable[0]+scene.readable[1])/2]),...spec.qa.motionWindows.flatMap(window=>{const action=actions[window.actionId];return window.fraction.map(f=>action.start+((action.contact??action.end)-action.start)*f)}),spec.duration-1/spec.fps])].sort((a,b)=>a-b);
  const samples=[],tiles=[];const tileW=format==='landscape'?480:270,tileH=format==='landscape'?270:480,columns=format==='landscape'?4:6;
  for(const [index,time]of times.entries()){
    const png=frameAt(file,time),name=`frame-${String(index).padStart(2,'0')}.png`;fs.writeFileSync(path.join(folder,name),png);
    samples.push({time,file:`qa/encoded-${format}/${name}`,sha256:sha(png)});
    const label=Buffer.from(`<svg width="${tileW}" height="${tileH}"><rect y="${tileH-26}" width="${tileW}" height="26" fill="#09090b"/><text x="10" y="${tileH-8}" font-family="Arial" font-size="14" fill="#ffcc00">${time.toFixed(3)}s</text></svg>`);
    tiles.push({input:await sharp(png).resize(tileW,tileH).composite([{input:label}]).toBuffer(),left:index%columns*tileW,top:Math.floor(index/columns)*tileH});
  }
  await sharp({create:{width:columns*tileW,height:Math.ceil(tiles.length/columns)*tileH,channels:3,background:'#09090b'}}).composite(tiles).jpeg({quality:91}).toFile(path.join(HERE,'qa',`${format}-encoded-contact-sheet.jpg`));
  const motion=[];
  for(const window of spec.qa.motionWindows){const action=actions[window.actionId],pair=window.fraction.map(f=>action.start+((action.contact??action.end)-action.start)*f);
    const raw=await Promise.all(pair.map(async time=>sharp(frameAt(file,time)).resize(320,320,{fit:'fill'}).removeAlpha().raw().toBuffer()));let sum=0;for(let i=0;i<raw[0].length;i++)sum+=Math.abs(raw[0][i]-raw[1][i]);const meanAbsoluteDifference=sum/raw[0].length;
    if(meanAbsoluteDifference<.08)throw Error(`${format}: encoded action ${action.id} does not move within its intended window`);motion.push({actionId:action.id,times:pair,meanAbsoluteDifference,result:'PASS'});
  }
  const finish=spec.scenes.at(-1),holdPair=[finish.readable[0],Math.min(finish.readable[1],spec.duration-1/spec.fps)],holdPixels=await Promise.all(holdPair.map(async t=>sharp(frameAt(file,t)).removeAlpha().raw().toBuffer()));let holdDiff=0;for(let i=0;i<holdPixels[0].length;i++)holdDiff+=Math.abs(holdPixels[0][i]-holdPixels[1][i]);holdDiff/=holdPixels[0].length;
  if(holdDiff>1.2)throw Error(`${format}: encoded ending changes during stationary brand hold`);
  report.files.push({file:`${format}.mp4`,bytes:bytes.length,sha256:sha(bytes),dimensions:[v.width,v.height],frames:+v.nb_read_frames,fps:v.r_frame_rate,duration:+data.format.duration,strictDecode:'PASS',audio:{codec:a.codec_name,sampleRate:+a.sample_rate,channels:a.channels,integratedLufs,truePeakDbtp},samples,motion,endingHold:{times:holdPair,meanAbsoluteDifference:holdDiff,result:'PASS'}});
}
fs.writeFileSync(path.join(HERE,'qa/encoded-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.files.map(({samples,motion,...info})=>info),null,2));
