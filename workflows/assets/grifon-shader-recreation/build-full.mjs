import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import sharp from 'sharp';

const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../..'),assets=path.join(here,'assets/full');
const hash=b=>createHash('sha256').update(b).digest('hex'),spec=JSON.parse(fs.readFileSync(path.join(here,'full.json')));
if(hash(fs.readFileSync(path.join(here,spec.prefixFile)))!==spec.prefixSha256)throw Error('Accepted opening changed');
const capture=JSON.parse(fs.readFileSync(path.join(here,'../grifon-shader-launch/qa/product-capture.json')));
for(const source of capture.productSources.filter(s=>/Step3|Step5/.test(s.path)))if(hash(fs.readFileSync(path.join(root,source.path)))!==source.sha256)throw Error(`Capture component differs: ${source.path}`);
const registry=fs.readFileSync(path.join(root,'config/moduleIdentity.ts'),'utf8'),terms=fs.readFileSync(path.join(root,'UBIQUITOUS_LANGUAGE.md'),'utf8');
for(const name of spec.catalogNames)if(!registry.includes(`name: '${name}'`)&&!terms.includes(`**${name}**`))throw Error(`Noncanonical catalog label ${name}`);
fs.mkdirSync(assets,{recursive:true});
const inputs=[
  ['../grifon-motion-depth/assets/inter-normalized-outlines.json','inter-outlines.json'],
  ['../grifon-motion-depth/assets/inter-900.ttf','inter-900.ttf'],
  ['../grifon-motion-depth/assets/OFL-Inter.txt','OFL-Inter.txt'],
  ['../../../public/logo.png','logo.png'],
  ['../grifon-shader-launch/assets/captures/script.png','script-desktop.png'],
  ['../grifon-shader-launch/assets/captures/portrait-script.png','script-mobile.png'],
  ['../grifon-shader-launch/assets/captures/storyboard.png','storyboard.png']
];
const files=[];
for(const [source,file]of inputs){
  const bytes=fs.readFileSync(path.join(here,source));
  if(source.includes('/captures/')){const original=capture.captures.find(c=>c.path.endsWith(source.slice(source.indexOf('/assets/')+1)));if(!original||original.sha256!==hash(bytes))throw Error(`Capture bytes differ ${source}`);}
  fs.writeFileSync(path.join(assets,file),bytes);files.push({file:`assets/full/${file}`,bytes:bytes.length,sha256:hash(bytes),source});
}
const {data,info}=await sharp(path.join(assets,'logo.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
let left=info.width,top=info.height,right=0,bottom=0;
for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>4){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
if(right<=left||bottom<=top)throw Error('Canonical logo has empty alpha');
const manifest={specSha256:hash(fs.readFileSync(path.join(here,'full.json'))),files,logoAlphaBounds:{left,top,width:right-left+1,height:bottom-top+1,sourceWidth:info.width,sourceHeight:info.height},captureEvidence:'../grifon-shader-launch/qa/product-capture.json',captureEvidenceSha256:hash(fs.readFileSync(path.join(here,'../grifon-shader-launch/qa/product-capture.json'))),providerCalls:0,paidSpendUsd:0};
fs.writeFileSync(path.join(assets,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`PASS ${files.length} unchanged local assets, canonical catalog names and visible logo alpha bounds`);
