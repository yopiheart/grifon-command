import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {finalize} from './_gates.mjs';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const source=path.join(repo,'workflows/assets/grifon-reference-full');
const read=file=>readFileSync(path.join(source,file),'utf8');
const data=(file,mime)=>`data:${mime};base64,${readFileSync(path.join(source,file)).toString('base64')}`;
const escapeAttr=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
let comp=read('backups/approved-closing.html');
const mainAt=comp.indexOf('<main'),mainEnd=comp.indexOf('</main>');
const main=comp.slice(mainAt,mainEnd);
const firstEnd=main.indexOf('>')+1;
const closing=main.slice(firstEnd).replace(/data-start="([\d.]+)"/g,(_,n)=>`data-start="${Number((Number(n)+22.8).toFixed(3))}"`);
comp=comp.slice(0,mainAt)+main.slice(0,firstEnd).replace('grifon-closing','grifon-full').replace('data-duration="10.1"','data-duration="32.9"')+'\n'+read('opening.html')+'\n'+closing+comp.slice(mainEnd);
comp=comp.replace('<title>Grifon reference study · closing sequence</title>','<title>Grifon · Your next ad</title>')
 .replace('</style>',read('opening.css')+'\n</style>')
 .replace('<script src="copy.js"></script>','<script src="copy.js"></script>\n<script src="objects.js"></script>\n<script>\n'+read('opening.js')+'\n</script>')
 .replace('// All animation lives in this main composition. Times are seconds from source 22.8s.','// Approved closing choreography is shifted intact to 22.8s. Opening uses absolute seconds.')
 .replace("window.__timelines=window.__timelines||{};","tl.shiftChildren(22.8);\nwindow.buildGrifonOpening(tl,copy);\nconst visibility=()=>{const t=tl.time();document.querySelectorAll('.clip').forEach(el=>{const start=Number(el.dataset.start),end=start+Number(el.dataset.duration);el.style.visibility=t>=start&&t<end?'visible':'hidden'});window.drawGrifonOpening(t);};\ntl.eventCallback('onUpdate',visibility);\nwindow.__timelines=window.__timelines||{};")
 .replace("window.__timelines['grifon-closing']=tl;","window.__timelines['grifon-full']=tl;")
 .replace(/window.seekComposition=\(seconds\)=>\{[^\n]+/,"window.seekComposition=(seconds)=>{const t=Math.max(0,Math.min(32.9,seconds));tl.pause().time(t,false);visibility();};");
writeFileSync(path.join(source,'index.html'),comp);
let embedded=comp.replace('./assets/inter.ttf',data('assets/inter.ttf','font/ttf'))
 .replace('assets/grifon-logo.png',data('assets/grifon-logo.png','image/png'))
 .replace('<script src="assets/gsap.min.js"></script>',`<script>${read('assets/gsap.min.js')}</script>`)
 .replace('<script src="copy.js"></script>',`<script>${read('copy.js')}</script>`)
 .replace('<script src="objects.js"></script>',`<script>${read('objects.js')}</script>`);
let html=read('compare.html').replace('src="index.html"',`srcdoc="${escapeAttr(embedded)}"`)
 .replace('src="assets/reference.mp4"',`src="${data('assets/reference.mp4','video/mp4')}"`)
 .replace('<a href="copy.js">copy.js</a>','copy.js in the source folder')
 .replace('<a href="index.html">index.html</a>','index.html in the source folder');
html=finalize(html,{label:'grifon-reference-full',ascii:false,required:['<meta charset="utf-8">','class="ground"','srcdoc=','data:video/mp4;base64,','seekComposition']});
const out=path.join(repo,'artifacts/grifon-reference-full.html');mkdirSync(path.dirname(out),{recursive:true});writeFileSync(out,html);
console.log(`Main composition and standalone preview built (${(Buffer.byteLength(html)/1048576).toFixed(1)} MiB).`);
