precision highp float;
varying vec2 vUv;
uniform float uFrame;
uniform float uMode;
uniform float uPhase;
uniform float uFade;
uniform float uExit;
uniform vec2 uRibbon0;
uniform vec2 uRibbon1;
uniform vec2 uRibbon2;
uniform vec2 uRibbon3;
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
vec2 stripCurve(float u){float v=1.-u;return v*v*v*uRibbon0+3.*v*v*u*uRibbon1+3.*v*u*u*uRibbon2+u*u*u*uRibbon3;}
void main(){
  vec2 p=(vUv-.5)*vec2(3.5555556,2.);
  float f=uFrame, t=uPhase, grain=hash(gl_FragCoord.xy+floor(f))* .022;
  vec3 color=DARK;
  if(uMode<.5){
    vec2 q=p-vec2(-.18,.42);float r=length(q),a=atan(q.y,q.x);
    float layered=r+.13*sin(a*3.+r*2.1+f*.014)+.04*sin(a*7.-r*4.);
    float rows=pow(.5+.5*cos(layered*490.),12.);
    float island=exp(-pow((r-.78)/.46,2.))*(.3+.7*pow(.5+.5*sin(a*3.+r*4.),2.));
    float secondary=exp(-pow(length(p-vec2(1.56,-.42))/.72,2.));
    float rightRows=pow(.5+.5*cos(length(p-vec2(1.61,.38))*530.),10.);
    color=vec3(.045,.031,.008)+GOLD*island*.035+GOLD*rows*(.07+island*.95)+CREAM*rows*island*.36;
    color+=GOLD*rightRows*secondary*.64+CREAM*rightRows*secondary*.36;
  }else if(uMode<1.5){
    vec2 q=rot(.18-t*.07)*p;float a=atan(q.y,q.x),r=length(q);
    float polygon=r*cos(mod(a+3.14159/6.,6.28318/6.)-3.14159/6.);
    float ramp=fract((polygon+.12+t*.025)/.58),edge=pow(1.-ramp,12.);
    color=mix(vec3(.44,.31,.055),mix(GOLD,CREAM,.30),ramp*.70)+CREAM*edge*.30;
    vec2 localStrip=p;float distanceToStrip=20.;
    for(int i=0;i<48;i++){
      float u=float(i)/48.,next=float(i+1)/48.;vec2 start=stripCurve(u),end=stripCurve(next),edge=end-start;
      float along=clamp(dot(localStrip-start,edge)/dot(edge,edge),0.,1.),position=mix(u,next,along);
      distanceToStrip=min(distanceToStrip,length(localStrip-start-edge*along)-(.028+.40*position*position));
    }
    float strip=1.-smoothstep(-.006,.006,distanceToStrip);
    vec2 grid=localStrip*vec2(28.,26.),cell=floor(grid),local=fract(grid)-.5;
    float arrow=line(abs(local.y)-(.20-local.x*.40),.026)*step(abs(local.x),.24);
    float dash=line(local.y,.018)*step(abs(local.x),.14);
    float upright=line(local.x,.020)*step(abs(local.y),.26)*step(.91,hash(cell));
    float holes=max(max(arrow*.65*step(.60,hash(cell)),dash*.66),upright);
    color=mix(color,vec3(.021,.018,.009)+mix(GOLD,CREAM,.4)*holes*.85,strip);
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
    vec2 grid=vUv*vec2(64.,36.),cell=floor(grid),local=fract(grid)-.5;
    float wave=p.y+.23*sin(p.x*2.2+t*.22)+.08*sin(p.y*3.-p.x);
    float r=length(vec2(p.x+.12,p.y+.03))+.15*sin(atan(p.y,p.x)*3.+t*.18);
    float brightness=clamp((r-.40)*1.05,0.,1.);
    float plus=max(line(local.x,.035)*step(abs(local.y),.24),line(local.y,.035)*step(abs(local.x),.24));
    float cross=max(line(local.x-local.y,.028),line(local.x+local.y,.028))*step(length(local),.29);
    float dash=line(local.y,.025)*step(abs(local.x),.24);
    float oval=line(length(local*vec2(1.5,.85))-.25,.028);
    float percent=max(line(local.x-local.y,.026)*step(length(local),.28),max(line(length(local-vec2(-.11,.12))-.06,.020),line(length(local-vec2(.11,-.12))-.06,.020)));
    float kind=fract((p.x+wave*.42)*.21+.56);
    float mark=kind<.22?oval:kind<.43?percent:kind<.62?cross:kind<.85?plus:dash;
    float centerMarks=oval*step(.985,hash(vec2(cell.x,floor(cell.y*.25))))*(1.-brightness)*.42;
    color=vec3(.009)+mix(GOLD,CREAM,.85)*mark*(.12+.82*brightness)+GOLD*centerMarks;
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
    if(f<307.){float bubble=1.-smoothstep(.92,.99,length(p));color=glass+CREAM*pow(max(0.,1.-length(p)),2.)*.15;}
  }else if(uMode<5.5){
    float band;
    if(t<.25)band=step(.53,fract((-p.x+abs(p.y)*.92+.18)*.62));
    else if(t<.5)band=step(.55,fract((p.x+floor((p.y+.8)*1.25)*.66)*.42));
    else if(t<.75)band=step(.53,fract((p.y-abs(fract(p.x*.42+.15)-.5)*2.7)*.66));
    else band=step(.56,fract((p.x+floor((p.y+1.)*1.20)*.72+.18)*.39));
    float direction=.5+.5*cos((p.x+p.y)*465.);
    float striation=direction*.86+hash(floor(p*vec2(920.,520.)))*.14;
    vec3 light=t<.25?mix(GOLD,CREAM,.60):t<.5?CREAM:t<.75?mix(GOLD,CREAM,.89):GOLD;
    vec3 shadow=t<.25?vec3(.58,.48,.14):t<.5?vec3(.27,.23,.065):t<.75?vec3(.73,.64,.20):vec3(.44,.30,.045);
    color=mix(light,shadow,band*(.20+.80*striation));
    color+=CREAM*direction*.06;
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
    if(f<608.){vec2 view=p-vec2(-.20,-.14);float perspective=1.+view.x*.14;q=vec2(view.x*.88,view.y*.98+.10*view.x)/perspective+vec2(-.12,.08);}
    if(f>=608.&&f<610.)q.x+=.15*sin(floor(p.y*30.)*17.+f*3.);
    vec2 grid=q*vec2(f<608.?7.0:5.6,f<608.?6.5:5.6);vec2 id=floor(grid),local=fract(grid);
    float digit=hash(vec2(id.x,floor(f*.08)))*step(0.,id.y);
    float one=max(line(local.x-.53,.07)*step(.13,local.y)*step(local.y,.85),line(local.y-.14,.055)*step(.25,local.x)*step(local.x,.72));
    float zero=line(length((local-.5)*vec2(1.,.7))-.29,.07);
    float binary=mix(zero,one,step(.5,digit));
    float striation=.5+.5*cos(q.y*1100.);
    float layered=exp(-pow((q.x-.48*sin(q.y*1.8+f*.04))/.65,2.));
    float overlap=exp(-pow((q.y-.45*sin(q.x*1.1-f*.033))/.48,2.));
    float lightA=exp(-pow((q.x-.55-.30*sin(f*.035))/.85,2.)-pow((q.y-.12-.25*sin(f*.026))/1.40,2.));
    float lightB=exp(-pow((q.x+.70+.25*sin(f*.024))/.50,2.)-pow((q.y+.55+.12*cos(f*.028))/.90,2.));
    float warmField=clamp(.82*overlap+.34*lightB,0.,1.);
    float creamField=clamp(.72*layered+.60*lightA,0.,1.);
    color=mix(DARK,mix(GOLD,CREAM,.20),warmField);
    color=mix(color,CREAM,creamField);color*=.97+.03*striation;
    float visibility=pow(.5+.5*sin(id.x*.38+id.y*.09+f*.048),3.)*(1.-layered*.70)*(1.-lightA*.55);
    vec3 ink=mix(mix(GOLD,CREAM,.66),vec3(.20,.17,.07),smoothstep(.22,.55,dot(color,vec3(.21,.72,.07))));
    color=mix(color,ink,binary*(.12+.48*visibility));
    if(f>=626.){float edge=max(abs(q.x-.04)-1.59,abs(q.y-.34)-.91);float frame=line(edge,.006);color=mix(color,CREAM,frame*.18);}
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
    if(f<459.)color=mix(vec3(.21,.21,.20),CREAM,exp(-length(p-vec2(-1.1,.65))*.85));
    else if(f<471.)color=mix(vec3(.21,.16,.035),mix(GOLD,CREAM,.45),exp(-length(p-vec2(-.7,-.8))*.75));
    else if(f<483.)color=mix(vec3(.51,.35,.055),mix(GOLD,CREAM,.54),.5+.35*sin(p.x*.8-p.y*.4));
    else{float internal=exp(-pow(length(p-vec2(.24,.17))/.88,2.));color=mix(vec3(.34,.35,.32),vec3(.69,.69,.62),.34+.33*sin(p.x*.7+p.y))+CREAM*internal*.17;}
  }
  color+=grain*step(uMode,7.9);
  float alpha=f>=306.&&f<307.?1.-smoothstep(.92,.99,length(p)):1.;
  gl_FragColor=vec4(color,alpha);
}
