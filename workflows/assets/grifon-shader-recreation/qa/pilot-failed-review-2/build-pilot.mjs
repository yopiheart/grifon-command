import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const depth = path.resolve(here, '../grifon-motion-depth');
const spec = JSON.parse(await fs.readFile(path.join(here, 'pilot.json'), 'utf8'));
const outlines = JSON.parse(await fs.readFile(path.join(depth, 'assets/inter-normalized-outlines.json'), 'utf8'));
const size = 512;
const supersample = 4;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
await fs.mkdir(path.join(here, 'assets'), {recursive:true});
await fs.mkdir(path.join(here, 'vendor'), {recursive:true});
await fs.mkdir(path.join(here, 'qa'), {recursive:true});

// Exact squared Euclidean distance transform, applied independently along both axes.
function transform1D(input) {
  const length=input.length;
  const v = new Int32Array(length), z = new Float64Array(length + 1), out = new Float64Array(length);
  let k = 0; v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
  for (let q = 1; q < length; q++) {
    let s = ((input[q] + q*q) - (input[v[k]] + v[k]*v[k])) / (2*q - 2*v[k]);
    while (s <= z[k]) { k--; s = ((input[q] + q*q) - (input[v[k]] + v[k]*v[k])) / (2*q - 2*v[k]); }
    v[++k] = q; z[k] = s; z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < length; q++) { while (z[k + 1] < q) k++; out[q] = (q-v[k])**2 + input[v[k]]; }
  return out;
}
function distance(mask, inside, length) {
  const intermediate = new Float64Array(length*length), output = new Float64Array(length*length), input = new Float64Array(length);
  for (let x = 0; x < length; x++) {
    for (let y = 0; y < length; y++) input[y] = (mask[y*length+x] > 127) === inside ? 0 : 1e9;
    const result = transform1D(input); for (let y = 0; y < length; y++) intermediate[y*length+x] = result[y];
  }
  for (let y = 0; y < length; y++) {
    for (let x = 0; x < length; x++) input[x] = intermediate[y*length+x];
    const result = transform1D(input); for (let x = 0; x < length; x++) output[y*length+x] = Math.sqrt(result[x]);
  }
  return output;
}
function wordPaths(text) {
  const paths = []; let advance = 0;
  for (const character of text) {
    const glyph = outlines.glyphs[character];
    if (!glyph) throw new Error(`Missing local editable glyph ${character}`);
    for (const shape of glyph.shapes) {
      const contours = [shape.outer, ...shape.holes].map(points => points.map(([x,y]) => [x+advance,-y]));
      paths.push(contours);
    }
    advance += glyph.advance - outlines.unitsPerEm * .018;
  }
  const points = paths.flat(2), xs=points.map(point=>point[0]), ys=points.map(point=>point[1]);
  return {paths, bounds:{left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys)}};
}
const assets = [],heightAssets=[];
for (const [key, text] of Object.entries(spec.copy)) {
  const {paths,bounds} = wordPaths(text), width=bounds.right-bounds.left, height=bounds.bottom-bounds.top;
  const scale = size*.88/width, x=size*.06-bounds.left*scale, y=(size-height*scale)/2-bounds.top*scale;
  const d = paths.map(contours => contours.map(points => `M${points.map(([px,py])=>`${(px*scale+x).toFixed(4)},${(py*scale+y).toFixed(4)}`).join('L')}Z`).join('')).join('');
  const rasterSize=size*supersample;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${rasterSize}" height="${rasterSize}" viewBox="0 0 512 512"><path fill="white" fill-rule="evenodd" d="${d}"/></svg>`;
  const highPng = await sharp(Buffer.from(svg)).png().toBuffer();
  const png = await sharp(highPng).resize(size,size).png().toBuffer();
  const lowRaster=await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const lowMask=Float32Array.from({length:size*size},(_,i)=>lowRaster.data[i*lowRaster.info.channels+3]/255);
  const {data,info} = await sharp(highPng).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const mask = Uint8Array.from({length:rasterSize*rasterSize},(_,i)=>data[i*info.channels+3]);
  const toInside = distance(mask,true,rasterSize), toOutside = distance(mask,false,rasterSize);
  const sdf = new Float32Array(size*size);
  for (let py=0;py<size;py++)for(let px=0;px<size;px++){
    let value=0;
    for(const dy of [1,2])for(const dx of [1,2]){
      const i=(py*supersample+dy)*rasterSize+px*supersample+dx;
      value+=(mask[i]>127?-(toOutside[i]-.5):toInside[i]-.5)/rasterSize;
    }
    const averaged=value/4;
    sdf[py*size+px]=averaged===0?(lowMask[py*size+px]>.5?-1e-7:1e-7):averaged;
  }
  const bytes=Buffer.from(sdf.buffer), filename=`${key}-sdf.bin`;
  if(bytes.length!==1048576||!sdf.some(v=>v<0)||!sdf.some(v=>v>0))throw Error('Invalid signed-distance field');
  await fs.writeFile(path.join(here,'assets',filename),bytes);
  await fs.writeFile(path.join(here,'assets',`${key}-mask.png`),png);
  assets.push({key,text,file:`assets/${filename}`,bytes:bytes.length,sha256:sha256(bytes),fontBounds:bounds,rasterBounds:{width:size*.88,height:height*scale},aspect:width/height,negativeInside:true,positiveOutside:true});
  if(key==='relief'){
    const sigma=3.,radius=10,kernel=[];let total=0;
    for(let i=-radius;i<=radius;i++){const weight=Math.exp(-i*i/(2*sigma*sigma));kernel.push(weight);total+=weight;}
    const intermediate=new Float32Array(lowMask.length),heightField=new Float32Array(lowMask.length);
    for(let py=0;py<size;py++)for(let px=0;px<size;px++){
      let value=0;for(let i=-radius;i<=radius;i++)value+=lowMask[py*size+Math.min(size-1,Math.max(0,px+i))]*kernel[i+radius]/total;
      intermediate[py*size+px]=value;
    }
    for(let py=0;py<size;py++)for(let px=0;px<size;px++){
      let value=0;for(let i=-radius;i<=radius;i++)value+=intermediate[Math.min(size-1,Math.max(0,py+i))*size+px]*kernel[i+radius]/total;
      heightField[py*size+px]=value;
    }
    const heightBytes=Buffer.from(heightField.buffer),file='assets/relief-height.bin';
    await fs.writeFile(path.join(here,file),heightBytes);
    heightAssets.push({key:'reliefHeight',file,bytes:heightBytes.length,sha256:sha256(heightBytes),sampleType:'height',method:'separable Gaussian contour-height convolution in Float32; sigma3 pixels; no repeated distance ridges',range:[0,1]});
  }
}
const three = await fs.readFile(path.join(depth,'vendor/three.global.js'));
await fs.writeFile(path.join(here,'vendor/three.global.js'),three);
await fs.copyFile(path.join(depth,'vendor/LICENSE'),path.join(here,'vendor/LICENSE-Three.txt'));
await fs.copyFile(path.join(depth,'assets/OFL-Inter.txt'),path.join(here,'assets/OFL-Inter.txt'));
const manifest={specSha256:sha256(await fs.readFile(path.join(here,'pilot.json'))),size,supersample,rasterSize:size*supersample,method:'2048px contour mask; Euclidean boundary distance; four central subpixel samples per final texel',format:'headerless row-major Float32; distance in pixel/512; negative inside; top row first',assets,heightAssets,threeSha256:sha256(three),providerCalls:0,paidSpendUsd:0};
await fs.writeFile(path.join(here,'assets/sdf-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Built ${assets.length} local glyph SDFs; counters preserved by even-odd contours; no install or remote request.`);
