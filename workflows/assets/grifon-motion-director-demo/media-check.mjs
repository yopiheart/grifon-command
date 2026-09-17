// Audit encoded audio, not just the filter's requested targets.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const ffmpeg=process.env.HYPERFRAMES_FFMPEG_PATH || path.join(root,'node_modules/ffmpeg-static',process.platform==='win32'?'ffmpeg.exe':'ffmpeg');
const qa=path.join(here,'qa');mkdirSync(qa,{recursive:true});
function measure(file){
 const r=spawnSync(ffmpeg,['-hide_banner','-i',file,'-af','loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json','-f','null','-'],{encoding:'utf8',windowsHide:true,maxBuffer:5e6});
 if(r.status!==0)throw new Error(r.stderr);
 const json=r.stderr.match(/\{\s*"input_i"[\s\S]*?\}/)?.[0];
 if(!json)throw new Error('No decoded audio measurements');
 const values=JSON.parse(json);
 return {sha256:createHash('sha256').update(readFileSync(file)).digest('hex'),integratedLufs:Number(values.input_i),truePeakDbtp:Number(values.input_tp),loudnessRange:Number(values.input_lra)};
}
function passes(m){return Number.isFinite(m.truePeakDbtp)&&m.truePeakDbtp<=-1 && m.integratedLufs>=-22 && m.integratedLufs<=-12;}
const results={};
for(const format of ['portrait','landscape']){
 const m=measure(path.join(here,`${format}.mp4`));
 results[format]={...m,pass:passes(m)};
 console.log(`${format}: ${m.integratedLufs} LUFS, ${m.truePeakDbtp} dBTP`);
 if(!passes(m))throw new Error(`Encoded audio out of bounds: ${format}`);
}
// Prove the check fails the earlier real defect, using the exact original mix.
const scratch=path.join(root,'.tmp/grifon-motion-director');mkdirSync(scratch,{recursive:true});
const old=path.join(scratch,'original-audio-defect.mp4');
const reproduced=spawnSync(ffmpeg,['-y','-i',path.join(here,'portrait.mp4'),'-i',path.join(root,'api/_lib/assets/music/mrbeast.mp3'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-af','atrim=duration=12,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.35,afade=t=out:st=11.2:d=0.8,loudnorm=I=-14:TP=-1.5:LRA=11','-c:a','aac','-b:a','192k','-ar','48000','-t','12',old],{encoding:'utf8',windowsHide:true});
if(reproduced.status!==0)throw new Error(reproduced.stderr);
const oldMeasurement=measure(old);
if(passes(oldMeasurement))throw new Error('Negative control unexpectedly passed');
results.negativeControl={...oldMeasurement,rejected:true,reason:'Original single-pass loudnorm mix without post-resample limiter'};
await import('node:fs/promises').then(async({writeFile})=>writeFile(path.join(qa,'audio-check.json'),JSON.stringify(results,null,2)+'\n'));
console.log('PASS: both final mixes pass; original clipping defect is rejected.');
