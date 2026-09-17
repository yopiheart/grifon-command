import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../..');
const spec=JSON.parse(readFileSync(process.argv[2]||path.join(here,'demo.json'),'utf8'));
const out=process.argv[3]?path.resolve(process.argv[3]):here;
if(spec.duration!==25||spec.fps!==24)throw Error('Edit the timeline before changing its 25s / 24fps contract.');
const template=readFileSync(path.join(here,'composition.template.html'),'utf8');
const assets={LOGO:'public/logo.png',INTER:'workflows/assets/grifon-promo-canvas/fonts/inter-900.ttf',MONO:'workflows/assets/grifon-promo-canvas/fonts/jbmono-600.ttf'};
const values={},hashes={};
for(const [key,file] of Object.entries(assets)){
 const bytes=readFileSync(path.join(root,file));
 values[key]=`data:${key==='LOGO'?'image/png':'font/ttf'};base64,${bytes.toString('base64')}`;
 hashes[file]=createHash('sha256').update(bytes).digest('hex');
}
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
for(const [key,value] of Object.entries(spec.copy)){
 if(typeof value!=='string'||!value.trim()||value.length>28)throw Error(`Invalid copy: ${key}`);
 values[key.toUpperCase()]=escape(value);
}
for(const [format,size] of Object.entries(spec.formats)){
 if(!['portrait','landscape'].includes(format))throw Error('Unknown layout');
 const folder=path.join(out,format);mkdirSync(path.join(folder,'media'),{recursive:true});mkdirSync(path.join(folder,'vendor'),{recursive:true});
 for(const name of ['sample.mp4','product.jpg','product-end.jpg','presenter.jpg'])copyFileSync(path.join(here,'media',name),path.join(folder,'media',name));
 copyFileSync(path.join(here,'vendor/gsap.min.js'),path.join(folder,'vendor/gsap.min.js'));
 const tokens={...values,FORMAT:format,WIDTH:size.width,HEIGHT:size.height};
 writeFileSync(path.join(folder,'index.html'),template.replace(/\{\{([A-Z]+)\}\}/g,(_,key)=>{if(!(key in tokens))throw Error(key);return tokens[key];}));
 console.log(`Built ${format} ${size.width}x${size.height}`);
}
for(const name of ['sample.mp4','product.jpg','product-end.jpg','presenter.jpg'])hashes[`media/${name}`]=createHash('sha256').update(readFileSync(path.join(here,'media',name))).digest('hex');
writeFileSync(path.join(out,'source-manifest.json'),JSON.stringify({spec,assets:hashes,footage:'First270frames of public/samples/real_talk.mp4;271 decoded original frames@30fps; last frame belongs to next scene and is excluded. Source run apr_34d06c7f per recipes.ts; edited excerpt9.0s.',productStill:'sample.mp4 at 8s; not a separate input-photo claim',generationSpendUsd:0},null,2)+'\n');
