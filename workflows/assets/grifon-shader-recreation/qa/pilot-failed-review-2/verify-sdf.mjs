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
  let inside=0,outside=0,subpixelEdges=0;
  for(let i=0;i<sdf.length;i++){
    if(!Number.isFinite(sdf[i]))throw Error(`Non-finite SDF at ${i}`);
    if((sdf[i]<0)!==(mask[i]>127)){
      if(mask[i]!==0&&mask[i]!==255&&Math.abs(sdf[i])<=1/size)subpixelEdges++;
      else throw Error(`Wrong SDF sign at ${i}`);
    }
    if(sdf[i]<0)inside++;else outside++;
  }
  if(!inside||!outside)throw Error('Missing inside/outside');
  return {sdf,inside,outside,subpixelEdges};
}
function segments(asset){
  const bounds=asset.fontBounds,scale=size*.88/(bounds.right-bounds.left);
  const x=size*.06-bounds.left*scale,y=(size-(bounds.bottom-bounds.top)*scale)/2-bounds.top*scale;
  const result=[];let advance=0;
  for(const c of spec.copy[asset.key]){
    const glyph=outlines.glyphs[c];
    for(const shape of glyph.shapes)for(const contour of [shape.outer,...shape.holes]){
      const points=contour.map(([px,py])=>[(px+advance)*scale+x,-py*scale+y]);
      for(let i=0;i<points.length;i++)result.push([points[i],points[(i+1)%points.length]]);
    }
    advance+=glyph.advance-outlines.unitsPerEm*.018;
  }
  return result;
}
function contourDistance(index,lines){
  const px=index%size+.5,py=Math.floor(index/size)+.5;let nearest=Infinity;
  for(const [[ax,ay],[bx,by]]of lines){
    const dx=bx-ax,dy=by-ay,denom=dx*dx+dy*dy;
    const t=denom?Math.min(1,Math.max(0,((px-ax)*dx+(py-ay)*dy)/denom)):0;
    nearest=Math.min(nearest,Math.hypot(px-ax-t*dx,py-ay-t*dy));
  }
  return nearest/size;
}
const assets=[];
for(const asset of manifest.assets){
  const bytes=await fs.readFile(path.join(here,asset.file));
  if(hash(bytes)!==asset.sha256)throw Error(`SDF hash differs ${asset.key}`);
  const {data,info}=await sharp(path.join(here,'assets',`${asset.key}-mask.png`)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const mask=Uint8Array.from({length:size*size},(_,i)=>data[i*info.channels+3]);
  const checked=check(bytes,mask),insideMask=Uint8Array.from(checked.sdf,v=>v<0?255:0),visited=new Uint8Array(mask.length),queue=new Int32Array(mask.length),counters=[];
  for(let start=0;start<mask.length;start++){
    if(visited[start]||insideMask[start]>127)continue;
    let head=0,tail=0,touchesEdge=false;queue[tail++]=start;visited[start]=1;
    while(head<tail){
      const i=queue[head++],x=i%size,y=Math.floor(i/size);
      if(!x||!y||x===size-1||y===size-1)touchesEdge=true;
      for(const j of [x?i-1:-1,x<size-1?i+1:-1,y?i-size:-1,y<size-1?i+size:-1])if(j>=0&&!visited[j]&&insideMask[j]<=127){visited[j]=1;queue[tail++]=j;}
    }
    if(!touchesEdge)counters.push({pixel:start,area:tail});
  }
  const expectedCounters=[...spec.copy[asset.key]].reduce((sum,c)=>sum+outlines.glyphs[c].shapes.reduce((n,s)=>n+s.holes.length,0),0);
  if(counters.length!==expectedCounters)throw Error(`Counter mismatch ${asset.key}: ${counters.length}/${expectedCounters}`);
  const firstInside=checked.sdf.findIndex(v=>v<0),lastInside=checked.sdf.findLastIndex(v=>v<0);
  const samples=[0,size-1,size*size-1,firstInside,lastInside,Math.floor(firstInside/size)*size,...counters.map(c=>c.pixel)];
  const distances=[],lines=segments(asset),tolerance=.8/(manifest.rasterSize||size);
  for(const index of samples){
    // Closest vector contour segments are independent of raster thresholding and the EDT.
    const expected=contourDistance(index,lines)*(checked.sdf[index]<0?-1:1),actual=checked.sdf[index];
    if(Math.abs(expected-actual)>tolerance)throw Error(`Contour-distance mismatch ${asset.key} pixel ${index}: ${actual}/${expected}`);
    distances.push({pixel:index,actual,expected,result:'PASS'});
  }
  const failures=[];
  const inverted=Buffer.from(bytes),floats=new Float32Array(inverted.buffer,inverted.byteOffset,inverted.byteLength/4);for(let i=0;i<floats.length;i++)floats[i]*=-1;
  const empty=Buffer.from(new Float32Array(size*size).fill(.5).buffer);
  for(const [name,fixture]of [['inverted-sign',inverted],['all-outside',empty],['truncated',bytes.subarray(0,bytes.length-4)]]){
    let error;try{check(fixture,mask);}catch(e){error=e.message;}if(!error)throw Error(`Bad fixture accepted ${name}`);failures.push({fixture:name,rejected:error});
  }
  const originalPath=path.join(here,'qa/pilot-failed-review-1',asset.file);let originalQuantization;
  try{
    const old=await fs.readFile(originalPath),sdf=new Float32Array(old.buffer.slice(old.byteOffset,old.byteOffset+old.byteLength));
    const bad=samples.find(index=>Math.abs(Math.abs(sdf[index])-contourDistance(index,lines))>tolerance);
    if(bad===undefined)throw Error('Original quantization incorrectly passes new contour precision');
    originalQuantization={result:'REJECTED',pixel:bad,actual:sdf[bad],expectedMagnitude:contourDistance(bad,lines),tolerance};
  }catch(error){if(error.code!=='ENOENT')throw error;originalQuantization={result:'fixture unavailable'};}
  assets.push({key:asset.key,sha256:asset.sha256,bytes:bytes.length,inside:checked.inside,outside:checked.outside,antialiasBoundarySignDifferences:checked.subpixelEdges,counters:{expected:expectedCounters,actual:counters.length,witnesses:counters},independentDistances:distances,contourTolerance:tolerance,originalQuantization,invalidFixtures:failures,result:'PASS'});
}
await fs.writeFile(path.join(here,'qa/sdf-validation.json'),JSON.stringify({result:'PASS',format:manifest.format,assets,providerCalls:0,paidSpendUsd:0},null,2)+'\n');
console.log(`PASS ${assets.length} SDFs; all glyph counters, independent distances, and three bad fixtures per asset checked.`);
