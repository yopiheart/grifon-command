precision highp float;
varying vec2 vUv;
uniform float uFrame;
uniform float uMode;
uniform float uPhase;
uniform float uFade;
uniform float uExit;
const vec3 DARK=vec3(.035,.035,.043);
const vec3 GOLD=vec3(1.,.80,0.);
const vec3 CREAM=vec3(.95,.945,.918);
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float line(float x,float width){return 1.-smoothstep(width,width+.008,abs(x));}
mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
float glyph(vec2 p,float seed){
  vec2 c=floor(p*vec2(5.,7.));
  float h=hash(vec2(seed,floor(c.y*.5)));
  float vertical=step(.55,h)*step(abs(c.x-2.),1.);
  float horizontal=step(.35,hash(vec2(seed,c.y)))*step(abs(c.y-3.),2.5);
  float edge=step(.66,hash(vec2(seed,c.x+c.y*3.)));
  return max(max(vertical,horizontal),edge)*step(c.x,4.)*step(c.y,6.);
}
void main(){
  vec2 p=(vUv-.5)*vec2(3.5555556,2.);
  float f=uFrame, t=uPhase, grain=hash(gl_FragCoord.xy+floor(f))* .022;
  vec3 color=DARK;
  if(uMode<.5){
    vec2 q=p-vec2(.08,-.1);float r=length(q),a=atan(q.y,q.x);
    float secondary=exp(-length(p-vec2(1.45,.1))*1.5);
    float petal=r+.16*sin(a*6.+r*1.7+f*.02)+secondary*.15*sin(p.y*4.);
    float rows=pow(.5+.5*cos(petal*390.),7.);
    float ripple=.5+.5*sin(a*6.+r*19.-f*.09);
    float halo=exp(-abs(petal-.73)*2.1);
    color=mix(vec3(.16,.09,.014),vec3(.79,.57,.12),rows*(.42+.74*halo)*(.36+.64*ripple));
    color+=CREAM*pow(rows,4.)*(halo*.45+secondary*.52);
  }else if(uMode<1.5){
    vec2 q=rot(-.36+t*.8)*p;float a=atan(q.y,q.x),r=length(q);
    float polygon=r*cos(mod(a+3.14159/6.,6.28318/6.)-3.14159/6.);
    float bands=.5+.5*cos((polygon+t*.7)*28.);
    vec2 cells=vec2(polygon*210.,a*48.);
    float perforation=smoothstep(.30,.19,length(fract(cells)-.5));
    float strip=1.-smoothstep(.14,.31,abs(q.y-.24*sin(q.x*2.+t*6.)));
    color=mix(DARK,CREAM,bands*.32*(1.-perforation));
    color=mix(color,vec3(.055),strip*(.55+.45*perforation));
    color+=GOLD*pow(bands,12.)*.24;
  }else if(uMode<2.5){
    vec2 q=p-vec2(-.30,.03);float r=length(q),a=atan(q.y,q.x)+t*.42;
    float blade=.5+.5*sin(a*6.+r*2.4);
    vec2 warped=q+normalize(q+vec2(.001))*.10*sin(a*6.+t*3.);
    vec2 grid=warped*9.7;float dots=1.-smoothstep(.30,.34,length(fract(grid)-.5));
    float fine=pow(.5+.5*cos((r+.02*sin(a*6.))*620.),9.);
    color=mix(vec3(.76,.61,.23),vec3(.96,.87,.44),.55+fine*.35);
    float blades=smoothstep(.43,.66,blade)*smoothstep(.52,.67,r)*(1.-smoothstep(1.45,1.80,r));
    vec3 perforated=mix(vec3(.74,.55,.16),vec3(.96,.88,.48),dots);
    color=mix(color,perforated,blades);
    color-=vec3(.035)*smoothstep(.4,1.8,r);
  }else if(uMode<3.5){
    float stretch=1.+.16*sin(f*.07);vec2 q=p*vec2(1.,stretch);
    vec2 grid=q*vec2(91.,42.);vec2 cell=floor(grid),local=fract(grid);
    float block=step(.31,hash(floor(cell/vec2(15.,8.))+floor(f*.08)));
    float g=glyph(local,hash(cell)*100.);
    color=mix(DARK,CREAM,g*block*(.48+.5*hash(cell)));
    color=mix(color,GOLD,g*block*step(.84,hash(floor(cell/6.)))*.6);
  }else if(uMode<4.5){
    vec2 q=(p-vec2(0.,1.04))/vec2(1.,.66);float r=length(q)/3.02;
    float z=sqrt(max(0.,1.-r*r));
    float rim=exp(-abs(r-.995)*180.);
    float sheen=pow(max(0.,dot(normalize(vec3(q/1.86,z)),normalize(vec3(-.35,.6,1.)))),5.);
    vec3 glass=mix(vec3(.62,.51,.22),CREAM,.74+.20*z);
    glass+=vec3(.12,.08,.005)*sin(q.x*2.+q.y*1.3+f*.007)*(.3+.3*z);
    glass+=vec3(.3)*sheen;
    color=mix(CREAM,glass,1.-smoothstep(.980,1.018,r));
    color+=GOLD*rim*.20;
    if(f<307.){float small=1.-smoothstep(.18,.19,length(p));color=mix(DARK,glass,small);}
  }else if(uMode<5.5){
    vec2 q=rot(-.37)*p;float zig=abs(fract(q.x*.45+.18)-.5)*3.3;
    if(t<.25)zig=abs(q.y)*.8;
    else if(t<.5)zig=floor(abs(q.y)*3.)*.32;
    else if(t<.75)zig=abs(fract(q.y*1.1)-.5)*1.5;
    else zig=floor(q.y*4.)*.20;
    float band=step(.53,fract((q.x+zig)*.62));
    float striation=(.5+.5*cos((q.x+zig*.8)*1320.))*.55+hash(vec2(floor((q.x+zig)*780.),floor(q.y*96.)))*.45;
    vec3 treatment=t<.25?mix(GOLD,CREAM,.34):t<.5?CREAM:t<.75?mix(GOLD,CREAM,.72):vec3(.65,.61,.45);
    color=mix(DARK,treatment,band*(.34+.66*striation));
  }else if(uMode<6.5){
    vec2 q=rot(.79)*p;float zoom=1.+max(0.,t-.72)*3.;q/=zoom;
    float band=1.-smoothstep(.38,.78,abs(q.x+.10*sin(q.y*3.+f*.035)));
    vec2 grid=q*vec2(40.,24.);vec2 cell=floor(grid),local=fract(grid)-.5;
    local+=(vec2(hash(cell+3.),hash(cell+7.))-.5)*.42;
    local=rot(hash(cell)*3.14159+.7*sin(q.y*3.))*local;
    float rice=1.-smoothstep(.27,.40,length(local*vec2(1.8,.65)));
    float flow=.5+.5*sin(q.y*6.+1.5*sin(q.x*2.+f*.04));
    float cluster=step(.14+.62*band+.18*flow,hash(cell));
    vec3 glow=mix(GOLD,CREAM,smoothstep(.1,.95,band))*band*.72;
    color=DARK+glow;
    color=mix(color,DARK,rice*cluster*band*(.3+.7*hash(cell+5.)));
    color+=CREAM*pow(band,8.)*.16;
    color=mix(color,CREAM,rice*(1.-band)*step(.93,hash(cell+17.))*.34);
  }else if(uMode<7.5){
    float pull=f>=626.?1.+(f-626.)*.11:1.;vec2 q=(p-vec2(.28,.08))*pull+vec2(.28,.08);
    if(f>=608.&&f<610.)q.x+=.15*sin(floor(p.y*30.)*17.+f*3.);
    vec2 grid=q*vec2(4.0,4.0);vec2 id=floor(grid),local=fract(grid);
    float digit=hash(vec2(id.x,floor(f*.08)))*step(0.,id.y);
    float one=max(line(local.x-.53,.07)*step(.13,local.y)*step(local.y,.85),line(local.y-.14,.055)*step(.25,local.x)*step(local.x,.72));
    float zero=line(length((local-.5)*vec2(1.,.7))-.29,.07);
    float binary=mix(zero,one,step(.5,digit));
    float block=step(0.,q.x+.55)+step(0.,q.y);
    vec3 tile=block<.5?CREAM:block<1.5?vec3(.68,.52,.12):vec3(.94,.85,.47);
    float panel=step(q.x,-1.55)+step(1.64,q.x)+step(q.y,-.57)+step(1.25,q.y);
    vec3 warm=mix(tile,vec3(.32,.24,.06),min(panel,1.)*.35);
    float striation=.5+.5*cos(q.y*1100.);
    color=warm*(.76+.09*striation);
    color=mix(color,mix(GOLD,CREAM,.58),binary*.75*step(q.x,.30));
    if(f>=636.){float erase=step(hash(vec2(floor(p.y*34.),f)),(f-636.)/3.);color*=1.-erase;}
  }else if(uMode<8.5){
    float exit=uExit;vec2 q=rot(-exit*.18)*p/(1.-exit*.70);
    float organic=q.y+.29*sin(q.x*1.5+q.y*1.7+f*.002)+.10*sin(q.x*3.-q.y*2.4)+.07*sin(q.y*5.+q.x*1.3);
    float contour=pow(.5+.5*cos(organic*83.),18.);
    float glow=exp(-length(q-vec2(0.,-.72))*1.6);
    float atmosphere=exp(-pow(length(q-vec2(0.,-1.35))/1.04,2.));
    color=DARK+GOLD*atmosphere*.70+GOLD*contour*.016;
    vec2 sphere=q-vec2(0.,-2.1);float r=length(sphere)/1.58;
    float z=sqrt(max(0.,1.-r*r));float rim=exp(-abs(r-1.)*65.);
    vec3 surface=vec3(.06,.051,.03)+vec3(.20,.14,.03)*z+CREAM*pow(max(0.,z*.9+q.x*.08),18.)*.17;
    color=mix(color,surface,1.-smoothstep(.985,1.03,r));
    color+=GOLD*rim*.10;
    color*=uFade;
    float bounds=(1.-smoothstep(1.767,1.777,abs(q.x)))*(1.-smoothstep(.99,1.,abs(q.y)));
    color*=bounds;
  }else if(uMode>9.5&&uMode<10.5){
    float checker=mod(step(0.,p.x)+step(0.,p.y),2.);
    float fine=pow(.5+.5*cos(p.x*790.+p.y*610.),6.);
    color=mix(vec3(.06),CREAM,checker)*(.70+.30*fine);
  }else if(uMode>10.5&&uMode<11.5){
    color=mix(vec3(.31,.25,.13),vec3(.87,.72,.27),.5+.4*sin(p.x*.8-p.y*.4));
  }
  color+=grain*step(uMode,7.9);
  float alpha=f>=306.&&f<307.?1.-smoothstep(.18,.19,length(p)):1.;
  gl_FragColor=vec4(color,alpha);
}
