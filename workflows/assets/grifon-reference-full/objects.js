// Fresh vector objects. No photographic cutouts or prior project art.
window.createGrifonObject=(kind,id)=>{
 const g=n=>`${id}-${n}`,url=n=>`url(#${g(n)})`;
 const defs=`<defs>
 <linearGradient id="${g('metal')}" x2=".8" y2="1"><stop stop-color="#a3a7a5"/><stop offset=".22" stop-color="#3a4043"/><stop offset=".56" stop-color="#111619"/><stop offset=".8" stop-color="#484b4b"/><stop offset="1" stop-color="#101518"/></linearGradient>
 <linearGradient id="${g('body')}" x2=".2" y2="1"><stop stop-color="#454b50"/><stop offset=".25" stop-color="#252a2d"/><stop offset=".7" stop-color="#111517"/><stop offset="1" stop-color="#070b0d"/></linearGradient>
 <linearGradient id="${g('paper')}" x2=".9" y2="1"><stop stop-color="#fffef8"/><stop offset=".5" stop-color="#eeeade"/><stop offset="1" stop-color="#bab9ac"/></linearGradient>
 <linearGradient id="${g('lavender')}" x2="1" y2="0"><stop stop-color="#5e527d"/><stop offset=".25" stop-color="#b2a5d0"/><stop offset=".5" stop-color="#9787b4"/><stop offset=".88" stop-color="#75668e"/><stop offset="1" stop-color="#554866"/></linearGradient>
 <linearGradient id="${g('blue')}" x2=".9" y2="1"><stop stop-color="#badad2"/><stop offset=".45" stop-color="#5c8a9a"/><stop offset="1" stop-color="#132c3a"/></linearGradient>
 <linearGradient id="${g('gold')}" x2="1" y2=".3"><stop stop-color="#876027"/><stop offset=".25" stop-color="#edc677"/><stop offset=".5" stop-color="#dba945"/><stop offset=".8" stop-color="#f6d597"/><stop offset="1" stop-color="#a77129"/></linearGradient>
 <radialGradient id="${g('lens')}"><stop stop-color="#203b36"/><stop offset=".2" stop-color="#081719"/><stop offset=".48" stop-color="#172730"/><stop offset=".6" stop-color="#4a6e68"/><stop offset=".65" stop-color="#132021"/><stop offset=".8" stop-color="#060c0d"/><stop offset="1" stop-color="#344145"/></radialGradient>
 <radialGradient id="${g('shine')}" cx=".35" cy=".22" r=".8"><stop stop-color="#c1e5e3" stop-opacity=".6"/><stop offset=".4" stop-color="#6da096" stop-opacity=".06"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
 <filter id="${g('shadow')}" x="-.5" y="-.5" width="2" height="2"><feDropShadow dx="3" dy="7" stdDeviation="5" flood-opacity=".18"/></filter></defs>`;
 const rect=(x,y,w,h,r,fill,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;
 let shape='';
 if(kind==='camera'){
   const ridges=Array.from({length:13},(_,i)=>`<path d="M${76+i*3} 157v70" stroke="#788084" opacity=".23"/>`).join('');
   shape=`<g filter="${url('shadow')}"><path d="M60 130 84 116H279L310 137V239L290 255H65Z" fill="${url('metal')}"/>
   ${rect(54,135,244,112,14,url('body'))}<path d="M139 135 156 111H216L234 137" fill="${url('metal')}"/>
   ${rect(60,142,60,97,12,'#24282a')}${ridges}${rect(258,122,28,9,3,'#93938d')}${rect(73,123,30,9,3,'#444947')}
   <ellipse cx="199" cy="193" rx="72" ry="66" fill="#0b1114" stroke="#596365" stroke-width="4"/>
   <ellipse cx="199" cy="193" rx="61" ry="57" fill="${url('metal')}" stroke="#04090b" stroke-width="3"/>
   <ellipse cx="199" cy="193" rx="52" ry="49" fill="#0a1215" stroke="#a1a4a0" stroke-opacity=".4"/>
   <ellipse cx="199" cy="193" rx="42" ry="40" fill="${url('lens')}"/>
   <ellipse cx="199" cy="193" rx="39" ry="37" fill="${url('shine')}"/>
   <ellipse cx="185" cy="177" rx="12" ry="7" fill="#bde9d1" opacity=".24"/>
   <circle cx="277" cy="153" r="4" fill="#dfc597"/><path d="M75 144h40M241 142h33" stroke="#ffffff" stroke-opacity=".2"/>
   <circle cx="199" cy="193" r="20" fill="#071016" opacity=".5"/></g>`;
 } else if(kind==='phone'){
   shape=`<g transform="rotate(9 180 180)" filter="${url('shadow')}">
   ${rect(111,35,145,288,25,url('metal'))}${rect(116,38,134,280,21,'#070a0d')}
   ${rect(123,48,120,258,15,url('blue'))}<path d="M123 211C160 132 209 251 243 152V306H123Z" fill="#c4c18c" opacity=".8"/>
   ${rect(126,191,114,111,13,'#f0efda')}${rect(138,205,47,5,2,'#879986')}${rect(138,217,86,7,2,'#334a3e')}${rect(138,230,61,7,2,'#334a3e')}
   ${rect(138,257,59,19,9,'#315743')}<path d="m208 262 9 5-9 5Z" fill="#4e725e"/>
   ${rect(154,51,55,9,5,'#050708')}<path d="M252 103v38M252 156v20" stroke="#858887" stroke-width="2"/>
   <path d="M119 77v202" stroke="#eff6f2" opacity=".26"/>
   <path d="M242 63 242 147 128 262V162Z" fill="#ffffff" opacity=".055"/></g>`;
 } else if(kind==='laptop'){
   shape=`<g filter="${url('shadow')}"><path d="M80 68 293 86 282 244 71 221Z" fill="${url('metal')}" stroke="#969d9e" stroke-width="1.5"/>
   <path d="m86 77 198 17-10 138-196-19Z" fill="#111c21"/>
   <path d="m94 87 181 16-2 24-181-16Z" fill="#29463d"/>
   <path d="M94 93 141 98" stroke="#bbcdbc" stroke-width="4"/>
   <path d="m94 121 52 5-3 69-52-5Z" fill="#91aea0"/><path d="m154 126 52 5-3 69-52-5Z" fill="#d8c998"/><path d="m214 132 52 5-3 69-52-5Z" fill="#88a5ac"/>
   <path d="m99 177 34 3m25 2 35 4m25 2 34 3" stroke="#344c49" stroke-width="5"/>
   <path d="m71 221 211 23 45 40-244-24Z" fill="${url('metal')}" stroke="#919796"/>
   <path d="m79 229 195 21 22 19-201-20Z" fill="#12191d"/>
   ${Array.from({length:4},(_,r)=>`<path d="m${83+r*5} ${233+r*4} 194 21" stroke="#5e6668" stroke-width="1"/>`).join('')}
   ${Array.from({length:17},(_,c)=>`<path d="m${90+c*11} ${230+c*1.2} 14 20" stroke="#5e6668" stroke-width="1"/>`).join('')}
   <path d="m166 262 56 6 8 8-58-6Z" fill="#596263"/>
   <path d="m83 260 244 24-8 5L83 265Z" fill="#141d21"/></g>`;
 } else if(kind==='bottle'){
   shape=`<g transform="rotate(11 180 180)" filter="${url('shadow')}">${rect(139,111,82,202,18,url('lavender'))}${rect(153,70,54,44,5,'#28252e')}${rect(169,41,21,32,3,'#37313e')}${rect(171,34,64,13,4,'#302d34')}<path d="M148 128v148" stroke="#eee5fa" stroke-opacity=".4" stroke-width="4"/>${rect(153,170,54,63,2,'#e9e5da')}<path d="M163 184h32M169 194h20M164 219h30" stroke="#8f7e98" stroke-width="3"/></g>`;
 } else if(kind==='bag'){
   shape=`<g transform="rotate(-8 180 180)" filter="${url('shadow')}"><path d="M95 126h165l21 174H79Z" fill="${url('paper')}"/><path d="M260 126 284 142 300 300h-19Z" fill="#bdb8a8"/><path d="M129 134V106a49 49 0 0 1 98 0v28" fill="none" stroke="#615846" stroke-width="9"/><path d="M129 134V106a49 49 0 0 1 98 0v28" fill="none" stroke="#b9ab86" stroke-width="4"/><circle cx="180" cy="217" r="28" fill="#7c856d"/><path d="m165 218 12 12 22-28" fill="none" stroke="#ede6cf" stroke-width="4"/></g>`;
 } else if(kind==='clapper'){
   shape=`<g transform="rotate(-12 180 180)" filter="${url('shadow')}">${rect(59,144,250,150,10,url('body'))}<path d="m59 130 225-55 9 42-224 55Z" fill="#202729"/>
   ${[0,1,2,3,4].map(i=>`<path d="m${78+i*44} ${126-i*11} 22-5-15 46-22 6Z" fill="#e7e6d9"/>`).join('')}
   ${rect(69,151,230,28,2,'#e6e6dd')}${[0,1,2,3,4].map(i=>`<path d="m${78+i*45} 151h23l-16 28h-23Z" fill="#2b3336"/>`).join('')}
   <path d="M83 202h196M83 244h196M159 202v68M221 202v68" stroke="#d4d8d1" stroke-width="2"/>
   <path d="M91 218h40M171 218h28M234 218h27M91 256h40M170 256h30" stroke="#d4d8d1" stroke-width="3"/>
   <circle cx="68" cy="153" r="7" fill="#999f9a"/></g>`;
 } else if(kind==='pencil'){
   shape=`<g transform="rotate(35 180 180)" filter="${url('shadow')}"><path d="M166 71h29v214l-15 38-14-38Z" fill="${url('gold')}"/><path d="M166 285h29l-15 38Z" fill="#cfa777"/><path d="m174 309 6 14 6-14Z" fill="#323738"/>${rect(166,49,29,32,5,'#d6968d')}${rect(166,75,29,20,1,url('metal'))}<path d="M172 100v176" stroke="#f7dc94" stroke-width="3"/></g>`;
 } else if(kind==='reel'){
   shape=`<g filter="${url('shadow')}"><circle cx="180" cy="180" r="112" fill="${url('metal')}" stroke="#c4c8c1" stroke-width="4"/><circle cx="180" cy="180" r="17" fill="#1a2425"/>
   ${Array.from({length:5},(_,i)=>{const a=i*Math.PI*2/5;return `<circle cx="${180+65*Math.cos(a)}" cy="${180+65*Math.sin(a)}" r="30" fill="#192427" stroke="#919b97" stroke-width="2"/>`}).join('')}
   <path d="M261 254q53 53 67 33" fill="none" stroke="#333d3e" stroke-width="12"/></g>`;
 } else if(kind==='board'){
   shape=`<g transform="rotate(8 180 180)" filter="${url('shadow')}">${rect(54,67,252,226,7,url('paper'))}${[0,1,2,3,4,5].map(i=>{let x=72+(i%3)*76,y=87+Math.floor(i/3)*95;return `${rect(x,y,64,57,2,i%2?'#bac4ad':'#8fabb4')}<path d="m${x+5} ${y+44} 18-17 10 8 20-27 7 38" fill="#59796b" opacity=".65"/><path d="M${x} ${y+68}h49M${x} ${y+75}h30" stroke="#6d766c" stroke-width="3"/>`}).join('')}</g>`;
 } else if(kind==='keyboard'){
   shape=`<g transform="rotate(8 180 180)" filter="${url('shadow')}">${rect(30,107,302,140,14,url('metal'))}${rect(35,111,291,125,10,'#232b2f')}${Array.from({length:44},(_,i)=>{let x=43+(i%11)*25,y=123+Math.floor(i/11)*24;return rect(x,y,i===43?17:20,17,3,url('paper'))}).join('')}${rect(113,216,111,12,3,url('paper'))}</g>`;
 }
 return `<svg viewBox="0 0 360 360" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${defs}${shape}</svg>`;
};
