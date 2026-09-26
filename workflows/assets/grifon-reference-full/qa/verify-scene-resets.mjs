import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),sharp=require(process.argv[2]||'sharp');
const here=path.dirname(fileURLToPath(import.meta.url));
const folder=process.argv[3]||'final-v03';
const files=['frame-04-at-4.9s.png','frame-06-at-7.75s.png','frame-08-at-11.4s.png'];
const results=[];
for(const file of files){
 const {data,info}=await sharp(path.join(here,folder,file)).removeAlpha().extract({left:20,top:20,width:8,height:8}).raw().toBuffer({resolveWithObject:true});
 let maxDelta=0;for(let i=0;i<data.length;i++)maxDelta=Math.max(maxDelta,Math.abs(data[i]-[242,241,236][i%info.channels]));
 results.push({file,maxDelta,pass:maxDelta===0});
}
console.log(JSON.stringify({folder,results}));if(results.some(r=>!r.pass))process.exitCode=1;
