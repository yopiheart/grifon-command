// Master locally, retain stems, and optionally mux the approved picture.
import {spawnSync} from 'node:child_process';
import {existsSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const ffmpeg=path.resolve(root,'../../../node_modules/ffmpeg-static/ffmpeg.exe');
const dir=path.join(root,'assets/audio');
function run(args){const r=spawnSync(ffmpeg,['-hide_banner','-nostats',...args],{encoding:'utf8',maxBuffer:4*1024*1024,windowsHide:true});if(r.status!==0)throw Error(r.stderr||r.error?.message||'FFmpeg failed');return r.stderr;}
function stats(log){const json=log.match(/\{\s*"input_i"[\s\S]+?\}/);if(!json)throw Error('Missing loudness evidence');return JSON.parse(json[0]);}
const prepare='highpass=f=28,acompressor=threshold=0.10:ratio=2:attack=10:release=110';
const target='loudnorm=I=-17:TP=-1:LRA=9';
const first=stats(run(['-i',path.join(dir,'mix-premaster.wav'),'-af',`${prepare},${target}:print_format=json`,'-f','null','NUL']));
const normalize=`${target}:measured_I=${first.input_i}:measured_TP=${first.input_tp}:measured_LRA=${first.input_lra}:measured_thresh=${first.input_thresh}:offset=${first.target_offset}:linear=true:print_format=json`;
const mastered=stats(run(['-y','-i',path.join(dir,'mix-premaster.wav'),'-af',`${prepare},${normalize}`,'-ar','48000','-c:a','pcm_s24le',path.join(dir,'score-master.wav')]));
run(['-y','-i',path.join(dir,'score-master.wav'),'-c:a','aac','-b:a','256k','-movflags','+faststart',path.join(dir,'score-master.m4a')]);
const delivered=stats(run(['-i',path.join(dir,'score-master.m4a'),'-af',`${target}:print_format=json`,'-f','null','NUL']));
const pass=Number(delivered.input_i)>=-18&&Number(delivered.input_i)<=-16&&Number(delivered.input_tp)<=-1;
const report={sampleRate:48000,channels:2,duration:32.9,targetLUFS:-17,truePeakCeilingDBTP:-1,firstPass:first,master:mastered,deliveredAAC:delivered,pass};
writeFileSync(path.join(root,'qa/audio-analysis.json'),JSON.stringify(report,null,2)+'\n');
if(!pass)throw Error('Audio master is outside the loudness/true-peak contract');
if(process.argv.includes('--mux')){
 const picture=path.join(root,'exports/grifon-picture-v04.mp4');if(!existsSync(picture))throw Error('Render the approved picture first');
 const final=path.join(root,'exports/grifon-your-next-ad-1080p.mp4');
 run(['-y','-i',picture,'-i',path.join(dir,'score-master.m4a'),'-map','0:v:0','-map','1:a:0','-c','copy','-t','32.9','-map_metadata','-1','-metadata','title=Grifon - Your Next Ad','-movflags','+faststart',final]);
 console.log('Exported '+final);
}
console.log(JSON.stringify({lufs:Number(delivered.input_i),truePeakDBTP:Number(delivered.input_tp),pass}));
