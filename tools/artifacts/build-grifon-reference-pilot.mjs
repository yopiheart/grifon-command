import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {finalize} from './_gates.mjs';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const source=path.join(repo,'workflows/assets/grifon-reference-pilot');
const read=file=>readFileSync(path.join(source,file),'utf8');
const data=(file,mime)=>`data:${mime};base64,${readFileSync(path.join(source,file)).toString('base64')}`;
const escapeAttr=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
let comp=read('index.html')
  .replace("./assets/inter.ttf",data('assets/inter.ttf','font/ttf'))
  .replace('assets/grifon-logo.png',data('assets/grifon-logo.png','image/png'))
  .replace('<script src="assets/gsap.min.js"></script>',`<script>${read('assets/gsap.min.js')}</script>`)
  .replace('<script src="copy.js"></script>',`<script>${read('copy.js')}</script>`);
// Inert srcdoc text needs its closing script tags escaped in the HTML attribute.
let html=read('compare.html')
  .replace('src="index.html"',`srcdoc="${escapeAttr(comp)}"`)
  .replace('src="assets/reference.mp4"',`src="${data('assets/reference.mp4','video/mp4')}"`)
  .replace('<a href="copy.js">copy.js</a>','copy.js in the source folder')
  .replace('<a href="index.html">index.html</a>','index.html in the source folder');
html=finalize(html,{label:'grifon-reference-pilot',ascii:false,required:['<meta charset="utf-8">','class="ground"','srcdoc=','data:video/mp4;base64,','seekComposition']});
const out=path.join(repo,'artifacts/grifon-reference-pilot.html');
mkdirSync(path.dirname(out),{recursive:true});writeFileSync(out,html,'utf8');
console.log(`Standalone preview saved: ${out} (${(Buffer.byteLength(html)/1024/1024).toFixed(1)} MiB)`);
