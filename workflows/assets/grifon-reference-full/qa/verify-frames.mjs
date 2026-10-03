import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),sharp=require(process.argv[2]||'sharp');
const here=path.dirname(fileURLToPath(import.meta.url));
async function diff(a,b,bounds){
 const x=await sharp(path.resolve(here,a)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const y=await sharp(path.resolve(here,b)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 if(x.info.width!==y.info.width||x.info.height!==y.info.height)throw Error('Dimensions differ');
 let changed=0,outside=0,maxDelta=0,minX=1920,minY=1080,maxX=-1,maxY=-1;
 for(let row=0;row<x.info.height;row++)for(let col=0;col<x.info.width;col++){
   const i=(row*x.info.width+col)*4;let delta=0;for(let c=0;c<4;c++)delta=Math.max(delta,Math.abs(x.data[i+c]-y.data[i+c]));
   maxDelta=Math.max(maxDelta,delta);if(!delta)continue;
   changed++;minX=Math.min(minX,col);minY=Math.min(minY,row);maxX=Math.max(maxX,col);maxY=Math.max(maxY,row);
   if(bounds&&(col<bounds[0]||row<bounds[1]||col>bounds[2]||row>bounds[3]))outside++;
 }
 return {width:x.info.width,height:x.info.height,changedPixels:changed,outsideEditedRegion:outside,maxChannelDelta:maxDelta,bounds:changed?{minX,minY,maxX,maxY}:null};
}
const editable=await diff('baseline/frame-00-at-0.6s.png','editability/capture/frame-00-at-0.6s.png',[620,470,1300,610]);
const endingCards=await diff('baseline/frame-01-at-28.5s.png','approved-ending-fresh/frame-00-at-5.7s.png');
const endingBrand=await diff('baseline/frame-02-at-30.6s.png','approved-ending-fresh/frame-01-at-7.8s.png');
// Moving the same animation to 22.8s changes floating-point interpolation rounding.
// Keep every raw difference visible; accept at most one 8-bit level for the moving
// card frame. The stationary brand and the text edit's outside region stay exact.
const result={editable,endingCards,endingBrand,cardRoundingTolerance:1,editablePass:editable.changedPixels>0&&editable.outsideEditedRegion===0,endingPass:endingCards.maxChannelDelta<=1&&endingBrand.changedPixels===0};
writeFileSync(path.join(here,'frame-verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
if(!result.editablePass||!result.endingPass)process.exitCode=1;
