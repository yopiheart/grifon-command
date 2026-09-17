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
 const times=[.8,1.5,3.5,6.7,7.8,10,14,16.4,17.3,19,20.7,22,24.9];
 const thumbs=[];
 for(let i=0;i<times.length;i++){
  const out=path.join(frames,`frame-${String(i).padStart(2,'0')}-${times[i]}s.png`);
  run(['-y','-ss',String(times[i]),'-i',file,'-frames:v','1',out]);
  thumbs.push(await sharp(out).resize({width:360}).png().toBuffer());
 }
 const th=format==='portrait'?640:203,columns=format==='portrait'?4:3;
 const sheet=await sharp({create:{width:columns*360,height:Math.ceil(times.length/columns)*th,channels:3,background:'#09090B'}}).composite(thumbs.map((input,i)=>({input,left:(i%columns)*360,top:Math.floor(i/columns)*th}))).jpeg({quality:90}).toBuffer();
 writeFileSync(path.join(qa,`${format}-actual-mp4-sheet.jpg`),sheet);
 const boundaryFrames=[396,397,398,402,408,415,598,599];
 run(['-y','-i',file,'-vf',`select=${boundaryFrames.map(n=>`eq(n\\,${n})`).join('+')},scale=${format==='portrait'?'270:480':'480:270'},tile=4x2`,'-frames:v','1',path.join(qa,`${format}-boundary-sheet.jpg`)]);
 // Small-display samples retain enough pixels to evaluate the key labels.
 for(const [name,index] of [['opening',1],['proof',5],['ending',12]])await sharp(path.join(frames,`frame-${String(index).padStart(2,'0')}-${times[index]}s.png`)).resize({width:390}).png().toFile(path.join(qa,`${format}-phone-${name}.png`));
 // Verify the embedded clip advances at source timing, instead of trusting a video tag.
 const box=format==='portrait'?'864:1536:108:230':'535:951:1215:64';
 const compareDir=path.join(root,'.tmp/grifon-motion-spotlight/source-match');mkdirSync(compareDir,{recursive:true});
 async function pixels(input,time,name,crop){
  const output=path.join(compareDir,name+'.png');
  run(['-y','-ss',String(time),'-i',input,'-vf',`format=rgb24,${crop?`crop=${crop},`:''}scale=180:320,crop=160:280:10:20`,'-frames:v','1',output]);
  return sharp(output).removeAlpha().raw().toBuffer();
 }
 const sourceMatches=[];
 for(const sourceTime of [1,4,8]){
  const rendered=await pixels(file,7.5+sourceTime,`${format}-${sourceTime}`,box);
  let best=Infinity,bestOffset=0;
  for(const offset of [-.067,-.033,0,.033,.067]){
   const reference=await pixels(path.join(here,'media/sample.mp4'),sourceTime+offset,`source-${sourceTime}-${offset}`);
   let sum=0;for(let i=0;i<rendered.length;i++)sum+=Math.abs(rendered[i]-reference[i]);
   const mean=sum/rendered.length;if(mean<best){best=mean;bestOffset=offset;}
  }
  if(best>4)throw Error(`${format}: source frame mismatch at ${sourceTime}s: mean ${best}`);
  sourceMatches.push({sourceTime,exportTime:7.5+sourceTime,bestOffset,meanAbsoluteChannelDifference:best});
 }
 const frozen=await pixels(path.join(here,'media/sample.mp4'),1,'frozen-control');
 const moving=await pixels(path.join(here,'media/sample.mp4'),8,'moving-control');
 let frozenSum=0;for(let i=0;i<frozen.length;i++)frozenSum+=Math.abs(frozen[i]-moving[i]);
 const frozenMean=frozenSum/frozen.length;if(frozenMean<=4)throw Error('Source match verifier failed to reject frozen footage control');
 results[format]={sha256:createHash('sha256').update(readFileSync(file)).digest('hex'),integratedLufs:loudness,truePeakDbtp:peak,audioPass:true,fullDecodePass:true,nearBlackIntervals:0,actualEncodedFrameTimes:times,boundaryFrameIndices:boundaryFrames,sourceFrameMatches:sourceMatches,sourceMatchLimit:4,frozenNegativeControl:{rejected:true,meanAbsoluteChannelDifference:frozenMean}};
 console.log(`${format}: ${loudness} LUFS / ${peak} dBTP, decode and dark-interval checks pass`);
}
writeFileSync(path.join(qa,'media-check.json'),JSON.stringify(results,null,2)+'\n');
