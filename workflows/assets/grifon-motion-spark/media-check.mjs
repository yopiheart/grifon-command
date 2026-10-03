// Measure final exported media and extract the actual encoded frames for review.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../..');
const ffmpeg=process.env.HYPERFRAMES_FFMPEG_PATH || path.join(root,'node_modules/ffmpeg-static',process.platform==='win32'?'ffmpeg.exe':'ffmpeg');
const qa=path.join(here,'qa');mkdirSync(qa,{recursive:true});
const results={};
function run(args){const p=spawnSync(ffmpeg,args,{encoding:'utf8',windowsHide:true,maxBuffer:20e6});if(p.status!==0)throw Error(p.stderr);return p.stderr;}
for(const format of ['portrait','landscape']){
 const file=path.join(here,`${format}.mp4`);
 const audio=run(['-hide_banner','-i',file,'-af','loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json','-f','null','-']);
 const measurement=JSON.parse(audio.match(/\{\s*"input_i"[\s\S]*?\}/)?.[0]||'null');
 if(!measurement)throw Error('Missing audio measurement');
 const loudness=Number(measurement.input_i),peak=Number(measurement.input_tp);
 if(!Number.isFinite(loudness)||!Number.isFinite(peak)||peak>-1||loudness< -22||loudness> -12)throw Error(`${format}: audio out of bounds: ${loudness} LUFS, ${peak} dBTP`);
 const decode=run(['-hide_banner','-i',file,'-vf','blackdetect=d=0.3:pix_th=0.02:pic_th=0.98','-an','-f','null','-']);
 // Zinc-950 is deliberately dark; no 98%-black interval should last 0.3s.
 if(/black_start:/.test(decode))throw Error(`${format}: nearly blank interval detected; inspect frames`);
 const frames=path.join(qa,`${format}-export`);mkdirSync(frames,{recursive:true});
 const times=[.8,1.5,3.8,4.4,5.5,8.8,9.6,10.5,11.8,12.8,14.9];
 const thumbs=[];
 for(let i=0;i<times.length;i++){
  const out=path.join(frames,`frame-${String(i).padStart(2,'0')}-${times[i]}s.png`);
  run(['-y','-ss',String(times[i]),'-i',file,'-frames:v','1',out]);
  thumbs.push(await sharp(out).resize({width:360}).png().toBuffer());
 }
 const th=format==='portrait'?640:203,columns=format==='portrait'?4:3;
 const sheet=await sharp({create:{width:columns*360,height:Math.ceil(times.length/columns)*th,channels:3,background:'#09090B'}}).composite(thumbs.map((input,i)=>({input,left:(i%columns)*360,top:Math.floor(i/columns)*th}))).jpeg({quality:90}).toBuffer();
 writeFileSync(path.join(qa,`${format}-actual-mp4-sheet.jpg`),sheet);
 // Small-display samples retain enough pixels to evaluate the key labels.
 for(const [name,index] of [['describe',1],['build',4],['ending',10]])await sharp(path.join(frames,`frame-${String(index).padStart(2,'0')}-${times[index]}s.png`)).resize({width:390}).png().toFile(path.join(qa,`${format}-phone-${name}.png`));
 results[format]={sha256:createHash('sha256').update(readFileSync(file)).digest('hex'),integratedLufs:loudness,truePeakDbtp:peak,audioPass:true,fullDecodePass:true,nearBlackIntervals:0,actualEncodedFrameTimes:times};
 console.log(`${format}: ${loudness} LUFS / ${peak} dBTP, decode and dark-interval checks pass`);
}
writeFileSync(path.join(qa,'media-check.json'),JSON.stringify(results,null,2)+'\n');
