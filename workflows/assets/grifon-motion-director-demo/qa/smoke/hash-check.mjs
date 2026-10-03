import fs from 'node:fs';
import crypto from 'node:crypto';
const base='workflows/assets/grifon-motion-director-demo/';
const files=['portrait.mp4','landscape.mp4','demo.json','composition.template.html','build.mjs','render.mjs','source-manifest.json','portrait/index.html','landscape/index.html'].map(f=>base+f).concat(['artifacts/grifon-motion-director-review.html','tools/artifacts/build-motion-director-review.mjs']);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const hashes=Object.fromEntries(files.map(f=>[f,hash(fs.readFileSync(f))]));
const html=fs.readFileSync('artifacts/grifon-motion-director-review.html','utf8');
const embedded={};
for(const format of ['portrait','landscape']){const m=html.match(new RegExp(`<video id="${format}"[^>]+src="data:video/mp4;base64,([^"]+)"`));embedded[format]={found:!!m,matchesExport:!!m&&hash(Buffer.from(m[1],'base64'))===hashes[base+format+'.mp4']};}
const result={capturedAt:new Date().toISOString(),hashes,embedded,notes:'Non-browser file inspection only. No browser screenshots or playback claim.'};
fs.writeFileSync(base+'qa/smoke/reviewed-hashes.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
if(Object.values(embedded).some(video=>!video.matchesExport))process.exitCode=1;
