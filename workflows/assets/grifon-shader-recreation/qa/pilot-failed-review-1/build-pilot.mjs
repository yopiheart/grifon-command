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
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
await fs.mkdir(path.join(here, 'assets'), {recursive:true});
await fs.mkdir(path.join(here, 'vendor'), {recursive:true});
await fs.mkdir(path.join(here, 'qa'), {recursive:true});

// Exact squared Euclidean distance transform, applied independently along both axes.
function transform1D(input) {
  const v = new Int32Array(size), z = new Float64Array(size + 1), out = new Float64Array(size);
  let k = 0; v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
  for (let q = 1; q < size; q++) {
    let s = ((input[q] + q*q) - (input[v[k]] + v[k]*v[k])) / (2*q - 2*v[k]);
    while (s <= z[k]) { k--; s = ((input[q] + q*q) - (input[v[k]] + v[k]*v[k])) / (2*q - 2*v[k]); }
    v[++k] = q; z[k] = s; z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < size; q++) { while (z[k + 1] < q) k++; out[q] = (q-v[k])**2 + input[v[k]]; }
  return out;
}
function distance(mask, inside) {
  const intermediate = new Float64Array(size*size), output = new Float64Array(size*size), input = new Float64Array(size);
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) input[y] = (mask[y*size+x] > 127) === inside ? 0 : 1e9;
    const result = transform1D(input); for (let y = 0; y < size; y++) intermediate[y*size+x] = result[y];
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) input[x] = intermediate[y*size+x];
    const result = transform1D(input); for (let x = 0; x < size; x++) output[y*size+x] = Math.sqrt(result[x]);
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
const assets = [];
for (const [key, text] of Object.entries(spec.copy)) {
  const {paths,bounds} = wordPaths(text), width=bounds.right-bounds.left, height=bounds.bottom-bounds.top;
  const scale = size*.88/width, x=size*.06-bounds.left*scale, y=(size-height*scale)/2-bounds.top*scale;
  const d = paths.map(contours => contours.map(points => `M${points.map(([px,py])=>`${(px*scale+x).toFixed(4)},${(py*scale+y).toFixed(4)}`).join('L')}Z`).join('')).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><path fill="white" fill-rule="evenodd" d="${d}"/></svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const {data,info} = await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const mask = Uint8Array.from({length:size*size},(_,i)=>data[i*info.channels+3]);
  const toInside = distance(mask,true), toOutside = distance(mask,false);
  const sdf = new Float32Array(size*size);
  for (let i=0;i<sdf.length;i++) sdf[i]=(mask[i]>127?-toOutside[i]:toInside[i])/size;
  const bytes=Buffer.from(sdf.buffer), filename=`${key}-sdf.bin`;
  if(bytes.length!==1048576||!sdf.some(v=>v<0)||!sdf.some(v=>v>0))throw Error('Invalid signed-distance field');
  await fs.writeFile(path.join(here,'assets',filename),bytes);
  await fs.writeFile(path.join(here,'assets',`${key}-mask.png`),png);
  assets.push({key,text,file:`assets/${filename}`,bytes:bytes.length,sha256:sha256(bytes),fontBounds:bounds,rasterBounds:{width:size*.88,height:height*scale},aspect:width/height,negativeInside:true,positiveOutside:true});
}
const three = await fs.readFile(path.join(depth,'vendor/three.global.js'));
await fs.writeFile(path.join(here,'vendor/three.global.js'),three);
await fs.copyFile(path.join(depth,'vendor/LICENSE'),path.join(here,'vendor/LICENSE-Three.txt'));
await fs.copyFile(path.join(depth,'assets/OFL-Inter.txt'),path.join(here,'assets/OFL-Inter.txt'));
const manifest={specSha256:sha256(await fs.readFile(path.join(here,'pilot.json'))),size,format:'headerless row-major Float32; distance in pixel/512; negative inside; top row first',assets,threeSha256:sha256(three),providerCalls:0,paidSpendUsd:0};
await fs.writeFile(path.join(here,'assets/sdf-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Built ${assets.length} local glyph SDFs; counters preserved by even-odd contours; no install or remote request.`);
