import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import sharp from 'sharp';

const here=path.dirname(fileURLToPath(import.meta.url)),size=512;
const spec=JSON.parse(await fs.readFile(path.join(here,'pilot.json'),'utf8'));
const manifest=JSON.parse(await fs.readFile(path.join(here,'assets/sdf-manifest.json'),'utf8'));
const outlines=JSON.parse(await fs.readFile(path.resolve(here,'../grifon-motion-depth/assets/inter-normalized-outlines.json'),'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
if(manifest.specSha256!==hash(await fs.readFile(path.join(here,'pilot.json'))))throw Error('SDF manifest belongs to another spec');
function check(bytes,mask){
  if(bytes.byteLength!==1048576)throw Error('Wrong SDF byte length');
  const sdf=new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
  let inside=0,outside=0;
  for(let i=0;i<sdf.length;i++){
    if(!Number.isFinite(sdf[i])||(sdf[i]<0)!==(mask[i]>127))throw Error(`Wrong SDF sign at ${i}`);
    if(sdf[i]<0)inside++;else outside++;
  }
  if(!inside||!outside)throw Error('Missing inside/outside');
  return {sdf,inside,outside};
}
const assets=[];
for(const asset of manifest.assets){
  const bytes=await fs.readFile(path.join(here,asset.file));
  if(hash(bytes)!==asset.sha256)throw Error(`SDF hash differs ${asset.key}`);
  const {data,info}=await sharp(path.join(here,'assets',`${asset.key}-mask.png`)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const mask=Uint8Array.from({length:size*size},(_,i)=>data[i*info.channels+3]);
  const checked=check(bytes,mask),visited=new Uint8Array(mask.length),queue=new Int32Array(mask.length),counters=[];
  for(let start=0;start<mask.length;start++){
    if(visited[start]||mask[start]>127)continue;
    let head=0,tail=0,touchesEdge=false;queue[tail++]=start;visited[start]=1;
    while(head<tail){
      const i=queue[head++],x=i%size,y=Math.floor(i/size);
      if(!x||!y||x===size-1||y===size-1)touchesEdge=true;
      for(const j of [x?i-1:-1,x<size-1?i+1:-1,y?i-size:-1,y<size-1?i+size:-1])if(j>=0&&!visited[j]&&mask[j]<=127){visited[j]=1;queue[tail++]=j;}
    }
    if(!touchesEdge)counters.push({pixel:start,area:tail});
  }
  const expectedCounters=[...spec.copy[asset.key]].reduce((sum,c)=>sum+outlines.glyphs[c].shapes.reduce((n,s)=>n+s.holes.length,0),0);
  if(counters.length!==expectedCounters)throw Error(`Counter mismatch ${asset.key}: ${counters.length}/${expectedCounters}`);
  const firstInside=checked.sdf.findIndex(v=>v<0),lastInside=checked.sdf.findLastIndex(v=>v<0);
  const samples=[0,size-1,size*size-1,firstInside,lastInside,Math.floor(firstInside/size)*size,...counters.map(c=>c.pixel)];
  const distances=[];
  for(const index of samples){
    const x=index%size,y=Math.floor(index/size),isInside=mask[index]>127;let nearest=Infinity;
    // Brute-force nearest opposite pixel is deliberately independent of the builder's EDT.
    for(let j=0;j<mask.length;j++)if((mask[j]>127)!==isInside){const dx=x-j%size,dy=y-Math.floor(j/size),distance=dx*dx+dy*dy;if(distance<nearest)nearest=distance;}
    const expected=Math.sqrt(nearest)/size*(isInside?-1:1),actual=checked.sdf[index];
    if(Math.abs(expected-actual)>1e-6)throw Error(`Distance mismatch ${asset.key} pixel ${index}: ${actual}/${expected}`);
    distances.push({pixel:index,actual,expected,result:'PASS'});
  }
  const failures=[];
  const inverted=Buffer.from(bytes),floats=new Float32Array(inverted.buffer,inverted.byteOffset,inverted.byteLength/4);for(let i=0;i<floats.length;i++)floats[i]*=-1;
  const empty=Buffer.from(new Float32Array(size*size).fill(.5).buffer);
  for(const [name,fixture]of [['inverted-sign',inverted],['all-outside',empty],['truncated',bytes.subarray(0,bytes.length-4)]]){
    let error;try{check(fixture,mask);}catch(e){error=e.message;}if(!error)throw Error(`Bad fixture accepted ${name}`);failures.push({fixture:name,rejected:error});
  }
  assets.push({key:asset.key,sha256:asset.sha256,bytes:bytes.length,inside:checked.inside,outside:checked.outside,counters:{expected:expectedCounters,actual:counters.length,witnesses:counters},independentDistances:distances,invalidFixtures:failures,result:'PASS'});
}
await fs.writeFile(path.join(here,'qa/sdf-validation.json'),JSON.stringify({result:'PASS',format:manifest.format,assets,providerCalls:0,paidSpendUsd:0},null,2)+'\n');
console.log(`PASS ${assets.length} SDFs; all glyph counters, independent distances, and three bad fixtures per asset checked.`);
