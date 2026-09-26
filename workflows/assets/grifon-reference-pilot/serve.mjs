import {createServer} from 'node:http';
import {createReadStream,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.ttf':'font/ttf','.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4','.txt':'text/plain; charset=utf-8'};
createServer((req,res)=>{
  let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(file===root)file=path.join(root,'compare.html');if(!file.startsWith(root+path.sep))throw Error('Outside root');const stat=statSync(file);if(!stat.isFile())throw Error('Not file');const headers={'Content-Type':mime[path.extname(file)]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-store'};const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);if(range){const begin=Number(range[1]),end=Math.min(range[2]?Number(range[2]):stat.size-1,stat.size-1);if(begin>end){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});res.end();return}res.writeHead(206,{...headers,'Content-Range':`bytes ${begin}-${end}/${stat.size}`,'Content-Length':end-begin+1});createReadStream(file,{start:begin,end}).pipe(res)}else{res.writeHead(200,{...headers,'Content-Length':stat.size});createReadStream(file).pipe(res)}}catch{res.writeHead(404);res.end('Not found')}
}).listen(4178,'127.0.0.1',()=>console.log('Grifon comparison preview: http://127.0.0.1:4178/compare.html'));
