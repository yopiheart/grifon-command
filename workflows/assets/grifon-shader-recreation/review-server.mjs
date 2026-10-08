// Private comparison utility. Reference bytes are served locally, never embedded in a delivery artifact.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const routes=new Map([
  ['/',{file:'review.html',mime:'text/html; charset=utf-8'}],
  ['/reference.mp4',{file:'reference/source-x.mp4',mime:'video/mp4'}],
  ['/pilot.mp4',{file:'grifon-opening-pilot-silent.mp4',mime:'video/mp4'}],
]);
const server=http.createServer((request,response)=>{
  const route=routes.get(new URL(request.url,'http://127.0.0.1').pathname);
  if(!route||!['GET','HEAD'].includes(request.method)){response.writeHead(404);response.end();return;}
  const file=path.join(here,route.file);
  if(!fs.existsSync(file)){response.writeHead(404);response.end();return;}
  const size=fs.statSync(file).size,range=request.headers.range;
  const common={'Content-Type':route.mime,'Accept-Ranges':'bytes','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
  if(range){
    const match=/^bytes=(\d+)-(\d*)$/.exec(range);
    if(!match){response.writeHead(416,{'Content-Range':`bytes */${size}`});response.end();return;}
    const start=Number(match[1]),end=match[2]?Math.min(Number(match[2]),size-1):size-1;
    if(start>=size||end<start){response.writeHead(416,{'Content-Range':`bytes */${size}`});response.end();return;}
    response.writeHead(206,{...common,'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});
    if(request.method==='HEAD'){response.end();return;}fs.createReadStream(file,{start,end}).pipe(response);return;
  }
  response.writeHead(200,{...common,'Content-Length':size});
  if(request.method==='HEAD'){response.end();return;}fs.createReadStream(file).pipe(response);
});
const requested=Number(process.argv[2]||0);
if(!Number.isInteger(requested)||requested<0||requested>65535)throw new Error('Port must be an integer from 0 through 65535');
server.listen(requested,'127.0.0.1',()=>console.log(`Private comparison: http://127.0.0.1:${server.address().port}/`));
