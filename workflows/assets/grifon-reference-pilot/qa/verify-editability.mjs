import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const require=createRequire(import.meta.url);
const sharp=require(process.argv[2]||'sharp');
const root=path.dirname(fileURLToPath(import.meta.url));
const a=await sharp(path.join(root,'editability-baseline/frame-00-at-5.7s.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const b=await sharp(path.join(root,'editability/hero/frame-00-at-5.7s.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
if(a.info.width!==b.info.width||a.info.height!==b.info.height)throw Error('Frame dimensions changed');
let changed=0,minX=a.info.width,minY=a.info.height,maxX=0,maxY=0,outside=0,rawChanged=0,outsideMaxDelta=0;
for(let y=0;y<a.info.height;y++)for(let x=0;x<a.info.width;x++){
 const offset=(y*a.info.width+x)*4;
 const delta=Math.max(...[0,1,2,3].map(c=>Math.abs(a.data[offset+c]-b.data[offset+c])));
 if(delta)rawChanged++;
 if(x<700||x>1220||y<570||y>625)outsideMaxDelta=Math.max(outsideMaxDelta,delta);
 // Both images must use the same fresh-seek capture protocol.
 if(delta>0){
  changed++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
  if(x<700||x>1220||y<570||y>625)outside++;
 }
}
const result={rawChangedPixels:rawChanged,tolerancePerChannel:0,changedPixels:changed,differenceBounds:{minX,minY,maxX,maxY},pixelsOutsideEditedLine:outside,outsideMaxDelta,pass:changed>0&&outside===0};
writeFileSync(path.join(root,'editability-result.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
const original=await sharp(path.join(root,'reference-cards.png')).resize(960,540).toBuffer();
const remake=await sharp(path.join(root,'hero/frame-02-at-5.7s.png')).resize(960,540).toBuffer();
const labels=Buffer.from('<svg width="1920" height="70"><rect width="1920" height="70" fill="#111113"/><g font-family="Arial" font-size="23" fill="#e9e9e9"><text x="30" y="44">REFERENCE / 28.50s</text><text x="990" y="44" fill="#ffcc00">GRIFON PILOT / same timestamp</text></g></svg>');
await sharp({create:{width:1920,height:610,channels:3,background:'#000'}}).composite([{input:labels,left:0,top:0},{input:original,left:0,top:70},{input:remake,left:960,top:70}]).jpeg({quality:92}).toFile(path.join(root,'comparison.jpg'));
if(!result.pass)process.exitCode=1;
