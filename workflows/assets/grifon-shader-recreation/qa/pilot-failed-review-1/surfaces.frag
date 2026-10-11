precision highp float;
varying vec2 vUv;
uniform float frame;
uniform vec2 resolution;
uniform sampler2D introSdf,reliefSdf;
uniform vec4 cuts,ringSize,lensSize,reliefSize;
uniform float phaseCuts[10],titleFrames[6],titlePositions[6];
uniform vec4 entryPitch,reversePitch,foreshortenKeys;
uniform vec2 openBowl;
const vec3 dark=vec3(.0353,.0353,.0431),gold=vec3(1.,.8,0.),cream=vec3(.949,.945,.918);
float sat(float x){return clamp(x,0.,1.);}
float ease(float x){x=sat(x);return x*x*(3.-2.*x);}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
mat2 rotate(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
float sdfSample(sampler2D tex,vec2 uv){
  if(min(uv.x,uv.y)<0.||max(uv.x,uv.y)>1.)return .5;
  vec2 pixel=uv*512.-.5,base=floor(pixel),f=fract(pixel);
  float a=texture2D(tex,(base+.5)/512.).r,b=texture2D(tex,(base+vec2(1.5,.5))/512.).r;
  float c=texture2D(tex,(base+vec2(.5,1.5))/512.).r,d=texture2D(tex,(base+1.5)/512.).r;
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}
vec3 field(vec2 p,float t,float warm){
  float bend=sin(p.x*3.4+t*.7)*.16+sin(p.x*5.7-t*.23)*.06;
  float ribbons=.5+.5*sin((p.y-bend)*15.+sin(p.x*2.7+t)*1.4);
  float h=pow(ribbons,4.)*.65+pow(.5+.5*sin(p.x*2.-p.y*3.+t),3.)*.16;
  return mix(dark,mix(vec3(.21,.21,.20),gold,warm),h)*(.45+.55*warm);
}
float rounded(vec2 p,vec2 halfSize,float radius){vec2 q=abs(p)-halfSize+radius;return length(max(q,0.))+min(max(q.x,q.y),0.)-radius;}
float ringSdf(vec2 p){float aspect=resolution.x/resolution.y;return max(rounded(p,ringSize.xy*vec2(aspect,1.)*.5,ringSize.y*.5),-rounded(p,ringSize.zw*vec2(aspect,1.)*.5,ringSize.w*.5));}
vec3 studio(vec3 r,float turn,float soft){
  r.xy=rotate(turn)*r.xy;
  float stripes=.5+.5*sin(r.x*5.+r.y*7.);
  vec3 c=mix(vec3(.018),vec3(.78),smoothstep(-.22,.35,r.y));
  float box=1.-smoothstep(.0,.025+soft, max(abs(r.x+.2)-.36,abs(r.y-.42)-.19));
  c+=vec3(1.4)*box;
  c=mix(c,vec3(.017),smoothstep(.43,.53,abs(r.x+r.y*.24))*.9);
  c+=cream*.22*pow(stripes,18.);
  return c;
}
vec3 ringColor(vec2 p,float material,float t){
  vec2 q=p;
  if(material>5.5&&material<6.5)q=(floor(q*32.)+.5)/32.;
  float s=ringSdf(q),e=.0007;
  vec2 grad=normalize(vec2(ringSdf(q+vec2(e,0.))-ringSdf(q-vec2(e,0.)),ringSdf(q+vec2(0.,e))-ringSdf(q-vec2(0.,e)))+1e-8);
  float depth=max(0.,-s),slope=cos(sat(depth/.039)*1.5707963)*.98;
  vec3 n=normalize(vec3(grad*slope,sqrt(max(.005,1.-slope*slope))));
  vec3 reflection=reflect(vec3(0.,0.,-1.),n);
  vec3 c=studio(reflection,t,.009);
  float face=smoothstep(.015,.024,depth);
  float diagonal=1.-smoothstep(.030,.075,abs(q.x*.55-q.y*.85-.21));
  vec3 faceReflection=cream*(.82+.15*sin(q.x*6.+q.y*9.+t))*(1.-diagonal*.94);
  c=mix(c,faceReflection,face*.88);
  if(material<.5)c=mix(c,c*cream,.08);
  else if(material<1.5){c=cream*.87+c*.12;c*=1.-pow(1.-n.z,2.)*.14;c+=pow(1.-n.z,8.)*cream*.12;}
  else if(material<2.5){float grain=hash(floor(q*vec2(370.,1400.)));c=mix(c,vec3(.66,.48,.15)*(1.-diagonal*.62),face*.45);c*=mix(gold,cream,.20)*(.84+.16*grain);}
  else if(material<3.5){c=mix(cream*.68,cream, pow(max(dot(n,normalize(vec3(-.6,.8,1.))),0.),.7));c+=pow(1.-n.z,5.)*.16;}
  else if(material<4.5){vec2 weave=floor(q*340.);float tile=mod(weave.x+weave.y,2.);float line=sin(q.x*1800.)*sin(q.y*1800.);c=vec3(.018+tile*.055+line*.012)+c*.17;}
  else if(material<5.5)c=studio(reflection,.7+t,.018)*mix(cream,vec3(1.),.5);
  else if(material<6.5){float blocks=hash(floor(q*32.));c=mix(gold*.55,cream,blocks)*(.25+.75*n.z);}
  else {c=mix(field(q*1.8+n.xy*.22,t,1.),c*.4+cream*.2,.4);c+=gold*pow(1.-n.z,3.)*.22;}
  float alpha=1.-smoothstep(-.0008,.0008,s);
  vec3 bg=material<6.5?cream:mix(cream,gold,.25)+vec3(sin(q.x*3.+t)*.14);
  float shadow=exp(-pow(p.x/.42,2.)-pow((p.y+.285)/.025,2.))*.13;
  bg*=1.-shadow;
  return mix(bg,min(c,vec3(1.)),alpha);
}
vec3 lens(vec2 uv,float f){
  float aspect=resolution.x/resolution.y,t=f*.0333667,warm=step(cuts.y,f);
  vec2 p=(uv-.5)*vec2(aspect,1.);
  float opening=ease((f-12.)/22.),radius=mix(.12,lensSize.x*aspect*.5,opening);
  vec2 sphere=vec2(p.x/radius,(p.y-.015)/(lensSize.y*.5));
  float rr=dot(sphere,sphere),z=sqrt(max(0.,1.-rr));
  float pitch=f<cuts.y?mix(entryPitch.z,entryPitch.w,ease((f-entryPitch.x)/(entryPitch.y-entryPitch.x))):mix(reversePitch.z,reversePitch.w,ease((f-reversePitch.x)/(reversePitch.y-reversePitch.x)));
  vec3 n=vec3(sphere,z),object=n;object.yz=rotate(pitch)*object.yz;
  vec3 bg=field(p,t,warm);
  vec2 refracted=p+normalize(n.xy+1e-8)*(.30*z-.08);
  vec3 body=field(refracted*1.25,t,warm)*(.75+.4*z);
  float band=1.-smoothstep(.23,.38,abs(object.y-.36));body*=1.-band*.91;
  vec3 r=reflect(vec3(0.,0.,-1.),n);
  body+=studio(r,.12,.07)*pow(1.-z,3.)*.38;
  body+=mix(cream,gold,warm)*pow(max(0.,1.-rr),.2)*.027;
  float rim=exp(-abs(rr-1.)*120.);body+=cream*rim*.43;
  float bowlProgress=ease((f-openBowl.x)/(openBowl.y-openBowl.x));
  float lensMask=1.-smoothstep(.996,1.004,rr);
  // In the pitch reversal the open bowl and its inverted reflection replace the full lens.
  if(f>=openBowl.x){
    float oval=length(vec2(p.x/radius,(p.y-.015)/.15));
    float openingMask=1.-smoothstep(.995,1.007,oval);
    float frontHalf=lensMask*(1.-smoothstep(.013,.017,p.y));
    float bowlMask=max(frontHalf,openingMask);
    vec3 interior=field(vec2(p.x*1.7,-p.y*2.5-.15),t,1.)*.62;
    interior*=smoothstep(.96,.10,oval)*.8+.12;
    interior+=gold*.16*pow(sat(-p.y/.15),3.);
    vec3 bowl=mix(body,interior,openingMask);
    bowl+=cream*exp(-abs(oval-1.)*190.)*.37;
    body=mix(body,bowl,bowlProgress);lensMask=mix(lensMask,bowlMask,bowlProgress);
  }
  vec3 c=mix(bg,body,lensMask);
  float labelY=titlePositions[0];
  for(int i=0;i<5;i++){if(f>=titleFrames[i])labelY=mix(titlePositions[i],titlePositions[i+1],ease((f-titleFrames[i])/(titleFrames[i+1]-titleFrames[i])));}
  float foreshorten=mix(foreshortenKeys.z,foreshortenKeys.w,ease((f-foreshortenKeys.x)/(foreshortenKeys.y-foreshortenKeys.x)));
  float curve=mix(.018,.10,bowlProgress);
  vec2 label=vec2(atan(n.x,max(.12,n.z))*radius*.93,(p.y-labelY+curve*p.x*p.x)/foreshorten);
  vec2 texUV=label*vec2(1.0,1.0)/(lensSize.z*aspect/.88)+.5;
  float sdf=sdfSample(introSdf,texUV),title=1.-smoothstep(-.001,.001,sdf);
  title*=ease((f-cuts.x-4.)/5.)*(1.-smoothstep(.995,1.004,rr));
  c=mix(c,cream,title);
  // Horizontal strips are tied to the two measured break-up windows.
  float glitch=max((1.-ease((f-cuts.x+7.)/7.))*step(8.,f),(1.-ease((f-cuts.y-11.)/9.))*step(cuts.y,f));
  float stripe=step(.82,hash(vec2(floor(uv.y*72.),floor(f*.7))));
  c=mix(c,field(vec2(p.x+sin(uv.y*172.)*.4,p.y),t,warm),stripe*glitch*.85);
  float dotRadius=.24+hash(floor(uv*vec2(260.,145.)))*.07;
  vec2 cell=fract(uv*vec2(260.,145.))-.5;
  float dots=(1.-smoothstep(dotRadius,dotRadius+.09,length(cell)))*(.3+.7*hash(floor(uv*vec2(260.,145.))));
  vec3 onset=mix(dark,cream*.7,dots)*(.25+.75*pow(.5+.5*sin(p.x*3.+p.y*3.),2.));
  c=mix(onset,c,ease((f-17.)/12.));c*=ease((f-3.)/8.);
  return c;
}
float textField(vec2 p){vec2 uv=p/(reliefSize.x*resolution.x/resolution.y/.88)+.5;return sdfSample(reliefSdf,uv)*(reliefSize.x*resolution.x/resolution.y/.88);}
float patternField(vec2 p,float f){
  vec2 cellSize=vec2(.029,.027),cell=floor(p/cellSize),local=fract(p/cellSize)-.5;
  float grow=ease((f-cuts.w)/(phaseCuts[9]-cuts.w-11.));
  float corner=min(length((p-vec2(-1.01,.63))*vec2(.7,1.)),length((p-vec2(1.01,-.63))*vec2(.7,1.)));
  float reach=.27+grow*.20;
  float radius=.0055+.002*sin(dot(cell,vec2(.71,1.39))+f*.08);
  float dotSdf=length(local*cellSize)-radius;
  float textSurround=abs(textField(p)-.034)-.026;
  float surroundGate=mix(.20,textSurround,ease((f-cuts.w-29.)/22.));
  float region=min((corner-reach)*.08,surroundGate);
  return max(dotSdf,region);
}
float reliefField(vec2 p,float f){return min(textField(p),patternField(p,f));}
vec3 embossed(vec2 uv,float f){
  float t=(f-cuts.w)/(phaseCuts[9]-cuts.w),aspect=resolution.x/resolution.y;
  vec2 p=(uv-vec2(.5,1.-reliefSize.y))*vec2(aspect,1.);
  float s=reliefField(p,f),e=.0007;
  vec2 grad=vec2(reliefField(p+vec2(e,0.),f)-reliefField(p-vec2(e,0.),f),reliefField(p+vec2(0.,e),f)-reliefField(p-vec2(0.,e),f))/(2.*e);
  float width=reliefSize.z,inside=1.-smoothstep(-.001,.001,s);
  float bevel=cos(sat(-s/width)*1.5707963),height=sqrt(max(0.,1.-bevel*bevel));
  float flowing=sin(max(0.,-s)*430.+sin(p.x*54.+t*3.)*.6)*.31;
  vec3 n=normalize(vec3(grad*(bevel*1.9+flowing),max(.14,height)));
  vec2 displaced=p+n.xy*.021*(inside+.28*exp(-max(0.,s)*140.));
  vec3 base=mix(gold,cream,.48+.48*sin(t*5.3+1.1));
  base=mix(base,vec3(.10,.10,.105),ease((t-.45)*2.)*.6);
  float wave=.5+.5*sin(displaced.x*7.+displaced.y*14.+t*7.);
  vec3 surface=mix(gold,cream,wave);
  surface=mix(surface,dark,pow(.5+.5*sin(displaced.y*37.+displaced.x*19.+t*11.),6.)*.66);
  vec3 reflected=studio(reflect(vec3(0.,0.,-1.),n),t*1.2,.035);
  vec3 raised=surface*(.4+.6*max(dot(n,normalize(vec3(-.4,.7,1.))),0.))+reflected*.56;
  raised+=cream*pow(max(dot(reflect(normalize(vec3(.6,-.7,-1.)),n),vec3(0.,0.,1.)),0.),35.)*.9;
  float shadow=exp(-max(0.,s)*230.)*(1.-inside)*.24;
  vec3 c=mix(base*(1.-shadow),min(raised,vec3(1.)),inside);
  // A displaced rim outside the glyph gives the surrounding field a true relief shoulder.
  c+=cream*exp(-pow((s+.001)/.002,2.))*.12;
  if(f>=phaseCuts[9]){float l=dot(c,vec3(.2126,.7152,.0722));c=vec3(l*.87);}
  return c;
}
void main(){
  vec3 c;
  if(frame<cuts.z)c=lens(vUv,frame);
  else if(frame<phaseCuts[7]){
    float m=frame<phaseCuts[0]?0.:frame<phaseCuts[1]?1.:frame<phaseCuts[2]?2.:frame<phaseCuts[3]?3.:frame<phaseCuts[4]?4.:frame<phaseCuts[5]?5.:frame<phaseCuts[6]?6.:7.;
    c=ringColor((vUv-.5)*vec2(resolution.x/resolution.y,1.),m,frame*.006);
  }else if(frame<phaseCuts[8]){
    float blend=ease((frame-phaseCuts[7])/(phaseCuts[8]-phaseCuts[7]));
    c=mix(ringColor((vUv-.5)*vec2(resolution.x/resolution.y,1.),7.,frame*.006),embossed(vUv,phaseCuts[8]),blend);
    float flash=sin(sat((frame-phaseCuts[7])/(phaseCuts[8]-phaseCuts[7]))*3.14159265);
    c=mix(c,cream,flash*.94);
  }else c=embossed(vUv,frame);
  gl_FragColor=vec4(c,1.);
}
