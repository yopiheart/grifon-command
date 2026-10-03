import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),sharp=require(process.argv[2]||'sharp');
const here=path.dirname(fileURLToPath(import.meta.url)),folder=process.argv[3]||'motion-final';
const times=[.3,.6,.95,1.85,2.1,3.5,3.75,6.45,6.7,9.05,9.35,3.87,3.97];
const imageAt=i=>path.join(here,folder,`frame-${String(i).padStart(2,'0')}-at-${times[i]}s.png`);
// Inspect foreground ink, not the moving blue canvas. Its blue channel stays
// above this cutoff throughout these ROIs; dark text/device pixels do not.
async function mask(i,box){
 const {data,info}=await sharp(imageAt(i)).removeAlpha().extract(box).raw().toBuffer({resolveWithObject:true});
 const bits=new Uint8Array(info.width*info.height);let count=0,xSum=0,minX=info.width,maxX=0,minY=info.height,maxY=0;
 for(let p=0;p<bits.length;p++){const v=p*info.channels;bits[p]=Math.max(data[v],data[v+1],data[v+2])<75?1:0;if(bits[p]){const x=p%info.width,y=Math.floor(p/info.width);count++;xSum+=x;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}}
 return {bits,count,centroidX:count?xSum/count:0,bounds:[minX,minY,maxX,maxY]};
}
const introBox={left:600,top:450,width:720,height:190},heroBox={left:410,top:175,width:1100,height:740};
const intro=await Promise.all([0,1,2].map(i=>mask(i,introBox)));
const checks=[{name:'Typing adds foreground letters across the opening',counts:intro.map(m=>m.count),pass:intro[1].count>intro[0].count*1.2&&intro[2].count>intro[1].count*1.2}];
const collage=await Promise.all([3,4].map(i=>mask(i,{left:0,top:230,width:1920,height:650})));
checks.push({name:'Collage travels left during its readable beat',deltaX:collage[1].centroidX-collage[0].centroidX,pass:collage[1].centroidX<collage[0].centroidX-20});
for(const [name,a,b] of [['camera',5,6],['phone',7,8],['laptop',9,10]]){
 const [x,y]=await Promise.all([mask(a,heroBox),mask(b,heroBox)]);let changed=0;for(let i=0;i<x.bits.length;i++)changed+=x.bits[i]!==y.bits[i]?1:0;
 checks.push({name:`${name} keeps turning after its entrance`,changedForegroundPixels:changed,pass:changed>100});
}
if(folder==='motion-final'){
 const [x,y]=await Promise.all([mask(11,heroBox),mask(12,heroBox)]);let changed=0;for(let i=0;i<x.bits.length;i++)changed+=x.bits[i]!==y.bits[i]?1:0;
 // The blue field keeps moving behind antialiased device edges. The first exact
 // mask check failed at four such pixels (three moved one RGB level). Require
 // identical foreground bounds and <0.01% mask change, not a frozen background.
 const sameBounds=JSON.stringify(x.bounds)===JSON.stringify(y.bounds);
 checks.push({name:'Camera settles into a still hold',changedForegroundPixels:changed,sameBounds,maskChangeLimit:0.0001,pass:sameBounds&&changed/x.bits.length<0.0001});
}
const result={folder,checks,pass:checks.every(c=>c.pass)};
writeFileSync(path.join(here,`motion-check-${folder}.json`),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
if(!result.pass)process.exitCode=1;
