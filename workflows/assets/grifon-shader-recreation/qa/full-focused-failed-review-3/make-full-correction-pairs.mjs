import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import sharp from 'sharp';
const here=path.dirname(fileURLToPath(import.meta.url)),spec=JSON.parse(fs.readFileSync(path.join(here,'full.json'),'utf8'));
const native=path.join(here,'.tmp/full-correction-1-native'),out=path.join(here,'.tmp/full-correction-2-pairs'),source=path.join(here,'reference/source-x.mp4');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),sourceVideoSha256=sha(fs.readFileSync(source));
fs.mkdirSync(native,{recursive:true});fs.mkdirSync(out,{recursive:true});
if(process.argv[2]==='source'){
  const ffmpeg=path.join(process.env.GRIFON_TOOL_ROOT||'C:/Users/ADMIN/Desktop/grifon-command','node_modules/ffmpeg-static/ffmpeg.exe');
  const select=spec.correctionFrames.map(frame=>`eq(n,${frame})`).join('+');
  const result=spawnSync(ffmpeg,['-y','-v','error','-i',source,'-vf',`select='${select}'`,'-vsync','0','-frames:v',String(spec.correctionFrames.length),'-q:v','2',path.join(native,'%03d.jpg')],{encoding:'utf8'});
  if(result.status!==0)throw Error(`Source extraction failed ${result.stderr}`);
  const samples=spec.correctionFrames.map((frame,i)=>{const file=`${String(i+1).padStart(3,'0')}.jpg`;return {frame,file,sha256:sha(fs.readFileSync(path.join(native,file)))};});
  fs.writeFileSync(path.join(native,'frame-map.json'),JSON.stringify({sourceVideoSha256,samples},null,2)+'\n');
  for(let start=0;start<samples.length;start+=12){const group=samples.slice(start,start+12),tiles=[];
    for(const [i,sample]of group.entries()){const label=Buffer.from(`<svg width="640" height="360"><rect width="104" height="30" fill="black"/><text x="8" y="23" font-family="monospace" font-size="22" fill="white">f${sample.frame}</text></svg>`);tiles.push({input:await sharp(path.join(native,sample.file)).resize(640,360).composite([{input:label}]).toBuffer(),left:i%3*640,top:Math.floor(i/3)*360});}
    await sharp({create:{width:1920,height:Math.ceil(group.length/3)*360,channels:3,background:'#000'}}).composite(tiles).jpeg({quality:95}).toFile(path.join(native,`source-board-${start/12}.jpg`));
  }
  console.log(`PASS ${samples.length} native source correction frames extracted`);
}else{
  const map=JSON.parse(fs.readFileSync(path.join(native,'frame-map.json'),'utf8')),focused=JSON.parse(fs.readFileSync(path.join(here,'qa/full-focused.json'),'utf8')),pairs=[];
  if(map.sourceVideoSha256!==sourceVideoSha256)throw Error('Native reference source binding differs');
  for(const sample of focused.samples){const original=map.samples.find(entry=>entry.frame===sample.frame);if(!original)throw Error(`Missing native frame ${sample.frame}`);
    const left=fs.readFileSync(path.join(native,original.file)),right=fs.readFileSync(path.join(here,'qa',sample.file));if(sha(left)!==original.sha256||sha(right)!==sample.sha256)throw Error('Focused sample bytes differ');
    const file=`frame-${sample.frame}.jpg`,label=Buffer.from(`<svg width="1920" height="34"><rect width="1920" height="34" fill="black"/><text x="12" y="25" font-family="monospace" font-size="22" fill="white">Reference f${sample.frame}</text><text x="972" y="25" font-family="monospace" font-size="22" fill="white">Correction draft f${sample.frame}</text></svg>`);
    await sharp({create:{width:1920,height:574,channels:3,background:'#000'}}).composite([{input:await sharp(left).resize(960,540).toBuffer(),left:0,top:34},{input:await sharp(right).resize(960,540).toBuffer(),left:960,top:34},{input:label,left:0,top:0}]).jpeg({quality:95}).toFile(path.join(out,file));
    pairs.push({frame:sample.frame,file,referenceSampleSha256:original.sha256,authoredSampleSha256:sample.sha256});
  }
  fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify({sources:focused.sources,sourceVideoSha256,pairs,status:'FOCUSED_SAMPLE_REVIEW_PENDING'},null,2)+'\n');
  console.log(`PASS ${pairs.length} bound focused native pairs; no fidelity verdict`);
}
