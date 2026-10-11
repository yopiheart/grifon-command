// Private comparison utility. Reference bytes are served locally, never embedded in a delivery artifact.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const routes=new Map([
  ['/',{file:'review.html',mime:'text/html; charset=utf-8'}],
  ['/paired',{file:'paired-review.html',mime:'text/html; charset=utf-8'}],
  ['/paired.mp4',{file:'.tmp/paired-pilot.mp4',mime:'video/mp4'}],
  ['/paired-receipt.json',{file:'qa/paired-review-receipt.json',mime:'application/json'}],
  ['/reference.mp4',{file:'reference/source-x.mp4',mime:'video/mp4'}],
  ['/pilot.mp4',{file:'grifon-opening-pilot-silent.mp4',mime:'video/mp4'}],
]);
const fullRoutes=new Set(['/paired-full','/paired-full.mp4','/paired-full-receipt.json']);
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
let fullBundle=null;
function loadFullBundle(){
  const receiptBytes=fs.readFileSync(path.join(here,'qa/full-paired-review-receipt.json'));
  const receipt=JSON.parse(receiptBytes.toString('utf8'));
  function generationFile(relative){
    if(typeof relative!=='string'||!relative.startsWith('.tmp/full-paired-generations/'))throw Error('Missing immutable full comparison generation');
    const root=path.resolve(here,'.tmp/full-paired-generations'),file=path.resolve(here,relative);
    if(!file.startsWith(root+path.sep))throw Error('Comparison generation path escapes its root');
    return file;
  }
  const mediaFile=generationFile(receipt.generation?.mediaPath),pageFile=generationFile(receipt.generation?.pagePath),receiptFile=generationFile(receipt.generation?.receiptPath);
  if(path.dirname(mediaFile)!==path.dirname(pageFile)||path.dirname(pageFile)!==path.dirname(receiptFile))throw Error('Comparison files span generations');
  const mediaBytes=fs.readFileSync(mediaFile),pageBytes=fs.readFileSync(pageFile);
  const producerBytes=fs.readFileSync(path.join(here,'qa/full-media.json')),producer=JSON.parse(producerBytes.toString('utf8'));
  if(!fs.readFileSync(receiptFile).equals(receiptBytes)||digest(mediaBytes)!==receipt.output.sha256||mediaBytes.length!==receipt.output.bytes||digest(pageBytes)!==receipt.page.sha256)throw Error('Comparison generation bytes differ from its receipt');
  if(digest(producerBytes)!==receipt.producerReceiptSha256||producer.sha256!==receipt.inputs.film.sha256||digest(fs.readFileSync(path.join(here,producer.file)))!==producer.sha256)throw Error('Comparison producer binding differs');
  if(receipt.inputs.reference.sha256!=='47c8bbc8e3d06953dd850500e4c7702ce690b3a4bc6708c4fc6a1f3d392df089'||receipt.inputs.acceptedOpening.sha256!=='6815c6e5143257c2d8b4fa368735677754b8d57cc0685ccb7d2ce380459a1c69'||producer.prefixSha256!==receipt.inputs.acceptedOpening.sha256)throw Error('Comparison reference or opening binding differs');
  if(digest(fs.readFileSync(path.join(here,'reference/source-x.mp4')))!==receipt.inputs.reference.sha256||digest(fs.readFileSync(path.join(here,'grifon-opening-pilot-silent.mp4')))!==receipt.inputs.acceptedOpening.sha256)throw Error('Comparison reference or opening bytes differ');
  if(Object.keys(receipt.sources??{}).length!==13||JSON.stringify(producer.sources)!==JSON.stringify(receipt.sources))throw Error('Comparison source set differs');
  for(const [file,expected]of Object.entries(receipt.sources))if(digest(fs.readFileSync(path.join(here,file)))!==expected)throw Error('Comparison continuation input differs: '+file);
  if(digest(fs.readFileSync(path.join(here,'paired-full-review.html')))!==receipt.page.sha256)throw Error('Comparison page version differs');
  return new Map([
    ['/paired-full',{bytes:pageBytes,mime:'text/html; charset=utf-8'}],
    ['/paired-full.mp4',{bytes:mediaBytes,mime:'video/mp4'}],
    ['/paired-full-receipt.json',{bytes:receiptBytes,mime:'application/json'}],
  ]);
}
const server=http.createServer((request,response)=>{
  const pathname=new URL(request.url,'http://127.0.0.1').pathname;
  let route;
  if(fullRoutes.has(pathname)&&['GET','HEAD'].includes(request.method)){
    try{fullBundle??=loadFullBundle();route=fullBundle.get(pathname);}
    catch(error){response.writeHead(503,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});response.end('Full comparison unavailable: '+error.message);return;}
  }else route=routes.get(pathname);
  if(!route||!['GET','HEAD'].includes(request.method)){response.writeHead(404);response.end();return;}
  const file=route.file?path.join(here,route.file):null;
  if(file&&!fs.existsSync(file)){response.writeHead(404);response.end();return;}
  const size=route.bytes?route.bytes.length:fs.statSync(file).size,range=request.headers.range;
  const common={'Content-Type':route.mime,'Accept-Ranges':'bytes','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
  if(range){
    const match=/^bytes=(\d+)-(\d*)$/.exec(range);
    if(!match){response.writeHead(416,{'Content-Range':`bytes */${size}`});response.end();return;}
    const start=Number(match[1]),end=match[2]?Math.min(Number(match[2]),size-1):size-1;
    if(start>=size||end<start){response.writeHead(416,{'Content-Range':`bytes */${size}`});response.end();return;}
    response.writeHead(206,{...common,'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});
    if(request.method==='HEAD'){response.end();return;}if(route.bytes){response.end(route.bytes.subarray(start,end+1));return;}fs.createReadStream(file,{start,end}).pipe(response);return;
  }
  response.writeHead(200,{...common,'Content-Length':size});
  if(request.method==='HEAD'){response.end();return;}if(route.bytes){response.end(route.bytes);return;}fs.createReadStream(file).pipe(response);
});
const requested=Number(process.argv[2]||0);
if(!Number.isInteger(requested)||requested<0||requested>65535)throw new Error('Port must be an integer from 0 through 65535');
server.listen(requested,'127.0.0.1',()=>console.log(`Private comparison: http://127.0.0.1:${server.address().port}/ (PID ${process.pid})`));
