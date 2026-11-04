import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.mjs':'application/javascript','.js':'application/javascript',
  '.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4','.txt':'text/plain; charset=utf-8'};
const server=createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    const path=resolve(root,'.'+pathname);
    if(!path.startsWith(resolve(root)+'/')&&!path.startsWith(resolve(root)+'\\'))throw Error('Outside client folder.');
    const data=await readFile(path);
    res.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');
    res.setHeader('Cache-Control','no-store');res.setHeader('Accept-Ranges','bytes');
    const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
    if(match){const start=Number(match[1]),end=Math.min(data.length-1,match[2]?Number(match[2]):data.length-1);
      if(start>end||start>=data.length){res.writeHead(416,{'Content-Range':`bytes */${data.length}`});res.end();return;}
      res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':end-start+1});res.end(data.subarray(start,end+1));
    }else{res.setHeader('Content-Length',data.length);res.end(data);}
  }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(8766,'127.0.0.1',()=>console.log('Oceanides local review: http://127.0.0.1:8766/stp-ec-aop/review.html'));
