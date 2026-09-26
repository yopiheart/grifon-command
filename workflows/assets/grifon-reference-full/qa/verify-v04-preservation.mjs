import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),sharp=require(process.argv[2]||'sharp');
const root=path.dirname(fileURLToPath(import.meta.url));
async function difference(a,b,bounds){
 const [x,y]=await Promise.all([a,b].map(f=>sharp(path.join(root,f)).ensureAlpha().raw().toBuffer()));
 if(x.length!==y.length)throw Error('Frame sizes differ');
 let changed=0,outside=0,maxDelta=0;
 for(let p=0;p<x.length/4;p++){
  let delta=0;for(let c=0;c<4;c++)delta=Math.max(delta,Math.abs(x[p*4+c]-y[p*4+c]));
  maxDelta=Math.max(maxDelta,delta);if(delta){changed++;const px=p%1920,py=Math.floor(p/1920);if(bounds&&(px<bounds[0]||px>bounds[2]||py<bounds[1]||py>bounds[3]))outside++;}
 }
 return {changedPixels:changed,outside,maxDelta};
}
const cards=await difference('preservation-v04/frame-03-at-28.5s.png','approved-ending-fresh/frame-00-at-5.7s.png');
const brand=await difference('preservation-v04/frame-04-at-30.6s.png','approved-ending-fresh/frame-01-at-7.8s.png');
const edit=await difference('motion-final/frame-01-at-0.6s.png','editability/v04-capture/frame-00-at-0.6s.png',[620,470,1300,610]);
const sceneResets=[];
for(const file of ['frame-00-at-4.9s.png','frame-01-at-7.75s.png','frame-02-at-11.4s.png']){
 const data=await sharp(path.join(root,'preservation-v04',file)).removeAlpha().extract({left:20,top:20,width:8,height:8}).raw().toBuffer();
 let maxDelta=0;for(let p=0;p<data.length;p++)maxDelta=Math.max(maxDelta,Math.abs(data[p]-[242,241,236][p%3]));
 sceneResets.push({file,maxDelta,pass:maxDelta===0});
}
const result={cards,brand,edit,sceneResets,cardRoundingTolerance:1,pass:cards.maxDelta<=1&&brand.changedPixels===0&&edit.changedPixels>0&&edit.outside===0&&sceneResets.every(s=>s.pass)};
writeFileSync(path.join(root,'preservation-v04.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(!result.pass)process.exitCode=1;
