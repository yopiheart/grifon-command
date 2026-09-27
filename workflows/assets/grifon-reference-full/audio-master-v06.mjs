// V06 master + MP4; preserves V05 files and stream-copies the approved picture.
import {spawnSync} from 'node:child_process';
import {writeFileSync,mkdirSync,existsSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(root,'../../..');
const ff=path.join(repo,'node_modules/ffmpeg-static/ffmpeg.exe');
const dir=path.join(root,'assets/audio-v06'),qa=path.join(root,'qa/sound-v06');mkdirSync(qa,{recursive:true});
const run=args=>{const r=spawnSync(ff,['-hide_banner','-nostats',...args],{encoding:'utf8',maxBuffer:3e6,windowsHide:true});if(r.status!==0)throw Error(r.stderr||'FFmpeg failed');return r.stderr};
const stats=s=>{const m=s.match(/\{\s*"input_i"[\s\S]+?\}/);if(!m)throw Error('Missing loudness evidence');return JSON.parse(m[0])};
// Leave extra encoder headroom: the first AAC test overshot -1 dBTP by 0.09 dB.
const target='loudnorm=I=-15.5:TP=-1.7:LRA=9';
// Attack/release catches peaks while preserving short click transients.
const prep='highpass=f=32,acompressor=threshold=0.085:ratio=2.4:attack=6:release=80:makeup=1';
const first=stats(run(['-i',path.join(dir,'mix-premaster.wav'),'-af',`${prep},${target}:print_format=json`,'-f','null','NUL']));
const norm=`${target}:measured_I=${first.input_i}:measured_TP=${first.input_tp}:measured_LRA=${first.input_lra}:measured_thresh=${first.input_thresh}:offset=${first.target_offset}:linear=true:print_format=json`;
run(['-y','-i',path.join(dir,'mix-premaster.wav'),'-af',`${prep},${norm}`,'-ar','48000','-c:a','pcm_s24le',path.join(dir,'score-master.wav')]);
run(['-y','-i',path.join(dir,'score-master.wav'),'-c:a','aac','-b:a','256k','-movflags','+faststart',path.join(dir,'score-master.m4a')]);
const delivered=stats(run(['-i',path.join(dir,'score-master.m4a'),'-af',`${target}:print_format=json`,'-f','null','NUL']));
if(Number(delivered.input_i)<-16.5||Number(delivered.input_i)>-14.5||Number(delivered.input_tp)>-1)throw Error('Delivered audio outside loudness/peak contract');
// Read-only measurements of the reference; it is never part of the authored mix.
const reference=stats(run(['-i',path.join(root,'assets/reference.mp4'),'-vn','-af',`${target}:print_format=json`,'-f','null','NUL']));
const picture=path.join(root,'exports/grifon-picture-v04.mp4');
const pictureSource=existsSync(picture)?picture:path.join(root,'exports/grifon-your-next-ad-1080p.mp4');
const final=path.join(root,'exports/grifon-your-next-ad-v06-1080p.mp4');
run(['-y','-i',pictureSource,'-i',path.join(dir,'score-master.m4a'),'-map','0:v:0','-map','1:a:0','-c','copy','-t','32.9','-map_metadata','-1','-metadata','title=Grifon - Your Next Ad - V06','-movflags','+faststart',final]);
// Standalone MP3 makes phone-only audition possible without video-player settings.
run(['-y','-i',path.join(dir,'score-master.wav'),'-c:a','libmp3lame','-b:a','256k',path.join(dir,'grifon-sound-v06.mp3')]);
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const report={version:6,duration:32.9,sampleRate:48000,channels:2,first,delivered,reference,pass:true,finalSha256:hash(final),pictureSourceSha256:hash(pictureSource),compositionSha256:hash(path.join(root,'index.html')),auditoryReview:'Not claimed; signal metrics and user audition are distinct.'};
writeFileSync(path.join(qa,'master-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({final,delivered,reference}));
