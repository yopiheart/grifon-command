// Scoped loopback route: only the vetted finished player is served from memory.
import http from 'node:http';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { assertPlayerScriptSyntax } from '../grifon-motion-action-pilot/verify-player.mjs';
const html=fs.readFileSync(new URL('../../../artifacts/grifon-shader-launch.html',import.meta.url));
assertPlayerScriptSyntax(html.toString('utf8'));
const artifactSha256=crypto.createHash('sha256').update(html).digest('hex');
const server=http.createServer((request,response)=>{
  if(request.method==='GET'&&request.url==='/review'){
    response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});response.end(html);
  }else{response.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});response.end('Not found');}
});
server.listen(0,'127.0.0.1',()=>console.log(JSON.stringify({pid:process.pid,url:`http://127.0.0.1:${server.address().port}/review`,artifactSha256})));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
