import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join,resolve} from 'node:path';
import {spawn} from 'node:child_process';
import ffmpeg from 'ffmpeg-static';

const dir=fileURLToPath(new URL('.',import.meta.url));
const story=JSON.parse(await readFile(join(dir,'story.json'),'utf8'));
const music=resolve(dir,'../stp-explainer/output/Oceanides-STP-Flow-Original-150s.mp3');
const video=join(dir,'output/Oceanides-EC-AOP-Visual-Review-1080p.mp4');
const output=join(dir,'output/Oceanides-EC-AOP-Visual-Review-Music-1080p.mp4');
const sha=b=>createHash('sha256').update(b).digest('hex');
if(sha(await readFile(music))!=='712324e214181fe81e5254baaa8ee62c3410205faa694ea9e155015520bfd4c8')
  throw Error('Accepted Flow music source differs from its receipt.');
await readFile(video);
const duration=story.scenes.at(-1).end;
const args=['-hide_banner','-nostdin','-y','-i',video,'-i',music,'-map','0:v:0','-map','1:a:0',
  '-t',String(duration),'-c:v','copy','-af',`loudnorm=I=-24:TP=-2:LRA=7,afade=t=in:st=0:d=0.3,afade=t=out:st=${duration-1.2}:d=1.2`,
  '-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-movflags','+faststart',output];
await new Promise((ok,bad)=>{const p=spawn(ffmpeg,args,{stdio:['ignore','ignore','pipe']});let log='';
  p.stderr.on('data',d=>log+=d);p.on('error',bad);p.on('close',code=>code===0?ok():bad(Error(log.slice(-2000))));});
const evidence=resolve(dir,'../../../.tmp/oceanides-stp-ec-aop/qa');await mkdir(evidence,{recursive:true});
const receipt={paidCalls:0,status:'VISUAL_PREVIEW_NO_NARRATION',videoSource:video,musicSource:music,
  originalMusicSha256:'712324e214181fe81e5254baaa8ee62c3410205faa694ea9e155015520bfd4c8',
  duration,voiceAttached:false,musicTargetLufs:-24,videoStreamCopied:true,
  output,outputSha256:sha(await readFile(output)),scope:'Local review and draft PR. Final narration blocked by provider payment_issue.'};
await writeFile(join(evidence,'preview-mix.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
