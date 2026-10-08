import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const here=path.dirname(fileURLToPath(import.meta.url)),native=path.join(here,'.tmp/full-reference-native'),out=path.join(here,'.tmp/full-draft-pairs');
const map=JSON.parse(fs.readFileSync(path.join(native,'frame-map.json'),'utf8')),draft=JSON.parse(fs.readFileSync(path.join(here,'qa/full-draft.json'),'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');fs.mkdirSync(out,{recursive:true});const pairs=[];
for(const sample of draft.samples){
  const source=map.find(entry=>entry.frame===sample.frame);if(!source)continue;
  const bytes=fs.readFileSync(path.join(here,'qa',sample.file));if(sha(bytes)!==sample.sha256)throw Error('Draft sample bytes changed');
  const left=fs.readFileSync(path.join(native,source.file)),file=`frame-${sample.frame}.jpg`;
  const label=Buffer.from(`<svg width="1920" height="34"><rect width="1920" height="34" fill="black"/><text x="12" y="25" fill="white" font-family="monospace" font-size="22">Reference f${sample.frame}</text><text x="972" y="25" fill="white" font-family="monospace" font-size="22">Authored draft f${sample.frame}</text></svg>`);
  await sharp({create:{width:1920,height:574,channels:3,background:'#000'}}).composite([{input:await sharp(left).resize(960,540).toBuffer(),left:0,top:34},{input:await sharp(bytes).resize(960,540).toBuffer(),left:960,top:34},{input:label,left:0,top:0}]).jpeg({quality:95}).toFile(path.join(out,file));
  pairs.push({frame:sample.frame,file,referenceSampleSha256:sha(left),authoredSampleSha256:sample.sha256});
}
fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify({draftSources:draft.sources,sourceVideoSha256:sha(fs.readFileSync(path.join(here,'reference/source-x.mp4'))),pairs},null,2)+'\n');
console.log(`PASS ${pairs.length} exact native-number sample pairs; draft framing only, not a fidelity verdict`);
