precision highp float;
varying vec2 vUv;
uniform float frame;
uniform vec2 resolution;
uniform sampler2D introSdf,reliefSdf,reliefHeight;
uniform vec4 cuts,ringSize,lensSize,reliefSize;
uniform float phaseCuts[10],titleFrames[8],titlePositions[8];
uniform vec4 entryPitch,reversePitch,foreshortenKeys;
uniform vec4 entryForeshorten,entryZoom,ringScale;
uniform vec2 openBowl;
uniform float reliefFrames[6];
uniform vec3 reliefBackgrounds[6],reliefSurfaces[6];
const vec3 dark=vec3(.0353,.0353,.0431),gold=vec3(1.,.8,0.),cream=vec3(.949,.945,.918);
float sat(float x){return clamp(x,0.,1.);}
float ease(float x){x=sat(x);return x*x*(3.-2.*x);}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
mat2 rotate(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
float cubic(float a,float b,float c,float d,float t){return b+.5*t*(c-a+t*(2.*a-5.*b+4.*c-d+t*(3.*(b-c)+d-a)));}
float sdfSample(sampler2D tex,vec2 uv){
  if(min(uv.x,uv.y)<0.||max(uv.x,uv.y)>1.)return .5;
  vec2 pixel=uv*512.-.5,base=floor(pixel),f=fract(pixel);
  vec4 rows;
  for(int i=0;i<4;i++){
    float y=float(i)-.5;
    float a=texture2D(tex,(base+vec2(-.5,y))/512.).r,b=texture2D(tex,(base+vec2(.5,y))/512.).r;
    float c=texture2D(tex,(base+vec2(1.5,y))/512.).r,d=texture2D(tex,(base+vec2(2.5,y))/512.).r;
    rows[i]=cubic(a,b,c,d,f.x);
  }
  return cubic(rows.x,rows.y,rows.z,rows.w,f.y);
}
vec3 field(vec2 p,float t,float warm){
  float bend=sin(p.x*3.4+t*.7)*.16+sin(p.x*5.7-t*.23)*.06;
  float ribbons=.5+.5*sin((p.y-bend)*15.+sin(p.x*2.7+t)*1.4);
  float h=pow(ribbons,4.)*.65+pow(.5+.5*sin(p.x*2.-p.y*3.+t),3.)*.16;
  return mix(dark,mix(vec3(.40,.39,.34),gold,warm),h)*(.65+.35*warm);
}
vec3 characters(vec2 uv,float f){
  float rush=ease((f-25.)/5.),change=ease((f-20.)/5.);
  vec2 screen=vec2(uv.x,1.-uv.y),q=uv;
  float row=floor(screen.y*35.),slice=floor(screen.y*150.);
  float tear=(hash(vec2(slice,floor(f*.5)))-.5)*.16*(1.-ease((f-13.)/7.));
  screen.x+=tear;
  vec2 coarse=floor(screen*vec2(32.,35.))/vec2(32.,35.);
  float left=step(coarse.x,.44)*step(coarse.y,mix(.65,1.,ease((f-12.)/7.)));
  left*=1.-step(.29,coarse.x)*step(.46,coarse.y)*step(coarse.y,.73);
  float foot=step(coarse.x,.26)*step(.72,coarse.y)*step(coarse.y,.98);
  float top=step(coarse.y,.11)*mix(.45,1.,step(.28,coarse.x));
  float right=step(.50,coarse.x)*step(coarse.y,.40)*mix(.22,.82,change);
  float stem=step(.43,coarse.x)*step(coarse.x,.73)*step(.36,coarse.y)*step(coarse.y,.94);
  float mask=max(max(left*(1.-change),foot*(1.-change)),max(top,max(right,stem*.58)));
  mask*=mix(.12,1.,ease((f-7.)/5.));
  float earlyBands=step(.78,screen.y)*step(screen.y,.89)+step(.51,screen.y)*step(screen.y,.53)+step(.22,screen.y)*step(screen.y,.24);
  mask=max(mask,earlyBands*step(.29,screen.x)*(1.-ease((f-7.)/4.))*.82);
  q.x=screen.x+mix(-.022,.014,step(.45,screen.x));
  q.y=1.-screen.y+step(.45,screen.x)*.028;
  q.x=.5+(q.x-.5)/(1.+rush*2.2);
  q.y+=rush*(screen.x-.5)*(screen.y-.43)*.65;
  q.x+=step(.73,hash(vec2(row,floor(f*.55))))*sin(row*7.+f)*.065*(1.-ease((f-15.)/5.));
  vec2 cells=q*vec2(64.,35.),cell=floor(cells),local=fract(cells)-.5;
  float intensity=mask*mix(.33,1.,sat(1.25-screen.x*.72-screen.y*.20));
  vec2 ellipse=local/vec2(.25,.34);
  float zero=1.-smoothstep(.12,.23,abs(length(ellipse)-.82));
  float slash=(1.-smoothstep(.038,.073,abs(local.x-local.y*.32)))*(1.-smoothstep(.29,.34,abs(local.y)));
  float one=1.-smoothstep(.035,.075,abs(local.x));
  one=max(one,(1.-smoothstep(.026,.065,abs(local.y+.28)))*(1.-smoothstep(.15,.20,abs(local.x))));
  one*=1.-smoothstep(.30,.35,abs(local.y));
  float bit=max(step(screen.x,.44),step(screen.y,.40));
  float glyph=mix(one,max(zero,slash),bit);
  vec3 tone=mix(cream*.77,gold*.36,screen.x*.22);
  float dropout=step(.84,hash(vec2(slice,floor(f*.43))))*(1.-ease((f-14.)/5.));
  float echo=max(0.,glyph*.23*(hash(vec2(slice,17.))-.3))*(1.-ease((f-16.)/4.));
  return (dark*.025+tone*(glyph+echo)*intensity*(1.-dropout*.98))*ease((f-3.)/5.);
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
  float scale=mix(ringScale.z,ringScale.w,ease((frame-ringScale.x)/(ringScale.y-ringScale.x)));
  p/=scale;vec2 q=p;
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
  else if(material<4.5){vec2 woven=q*14.85,tile=floor(woven),thread=fract(woven);float over=mod(tile.x+tile.y,2.);float axis=mix(thread.x,thread.y,over);float fibers=.5+.5*cos(axis*50.2655);float roundTow=sin(mix(thread.y,thread.x,over)*3.14159265);float seam=smoothstep(.0,.035,min(min(thread.x,thread.y),min(1.-thread.x,1.-thread.y)));c=vec3(.075+.095*roundTow+.105*pow(fibers,5.)+.040*over)*(.45+.55*seam)+c*.065;}
  else if(material<5.5)c=studio(reflection,.7+t,.018)*mix(cream,vec3(1.),.5);
  else if(material<6.5){float blocks=hash(floor(q*32.));c=mix(gold*.55,cream,blocks)*(.25+.75*n.z);}
  else {c=mix(field(q*1.8+n.xy*.22,t,1.),c*.4+cream*.2,.4);c+=gold*pow(1.-n.z,3.)*.22;}
  float alpha=1.-smoothstep(-.0008,.0008,s);
  vec3 bg=material<6.5?cream:mix(cream,gold,.25)+vec3(sin(q.x*3.+t)*.14);
  float shadow=exp(-pow(p.x/.42,2.)-pow((p.y+.285)/.025,2.))*.13;
  bg*=1.-shadow;
  return mix(bg,min(c,vec3(1.)),alpha);
}
vec3 lensSurface(vec2 uv,float f){
  if(f<cuts.x)return characters(uv,f);
  float tearEnvelope=step(cuts.y+11.,f)*(1.-step(cuts.y+13.,f));
  if(f>=cuts.y+13.&&f<cuts.y+18.)tearEnvelope=.14*(1.-ease((f-cuts.y-13.)/5.))*step(.72,abs(uv.x-.5)*2.);
  if(tearEnvelope>0.){float strip=floor(uv.y*68.);uv.x+=(hash(vec2(strip,floor(f)))-.5)*.28*tearEnvelope;uv.y+=(hash(vec2(strip+71.,floor(f)))-.5)*.019*tearEnvelope;}
  float aspect=resolution.x/resolution.y,t=f*.0333667,warm=step(cuts.y,f);
  vec2 p=(uv-.5)*vec2(aspect,1.);
  float opening=ease((f-cuts.x)/10.),zoom=mix(entryZoom.z,entryZoom.w,ease((f-entryZoom.x)/(entryZoom.y-entryZoom.x)));
  float radius=lensSize.x*aspect*.5*zoom;
  float profile=mix(.83,1.,opening);
  vec2 sphere=vec2(p.x/radius,(p.y-.015)/(lensSize.y*.5*profile*zoom));
  float rr=dot(sphere,sphere),z=sqrt(max(0.,1.-rr));
  float pitch=f<cuts.y?mix(entryPitch.z,entryPitch.w,ease((f-entryPitch.x)/(entryPitch.y-entryPitch.x))):mix(reversePitch.z,reversePitch.w,ease((f-reversePitch.x)/(reversePitch.y-reversePitch.x)));
  float bowlProgress=ease((f-openBowl.x)/(openBowl.y-openBowl.x));
  vec3 n=vec3(sphere,z),object=n;object.yz=rotate(pitch)*object.yz;
  vec3 bg=field(p,t,warm);
  vec2 refracted=p+normalize(n.xy+1e-8)*(.30*z-.08);
  vec3 body=field(refracted*1.25,t,warm)*(.75+.4*z);
  body+=cream*(1.-ease((f-cuts.x)/10.))*.33*(.4+.6*smoothstep(-.10,.50,object.y));
  float band=1.-smoothstep(.23,.38,abs(object.y-.36));body*=1.-band*.91;
  float capCenter=mix(.005,.16,ease((f-cuts.x-2.)/8.))-.13*sphere.x*sphere.x;
  if(f<cuts.y)capCenter+=.07*ease((f-cuts.x-10.)/8.);
  float capRadius=f<cuts.y?mix(.24,.13,ease((f-cuts.x-3.)/7.)):.20;
  float cap=length(vec2(sphere.x,(p.y-capCenter)/capRadius));
  body*=1.-(1.-smoothstep(.99,1.01,cap))*.97*(1.-bowlProgress);
  vec3 r=reflect(vec3(0.,0.,-1.),n);
  body+=studio(r,.12,.07)*pow(1.-z,3.)*.38;
  body+=mix(cream,gold,warm)*pow(max(0.,1.-rr),.2)*.027;
  float rim=exp(-abs(rr-1.)*120.);body+=cream*rim*.43*ease((f-cuts.x-2.)/6.);
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
  for(int i=0;i<7;i++){if(f>=titleFrames[i])labelY=mix(titlePositions[i],titlePositions[i+1],ease((f-titleFrames[i])/(titleFrames[i+1]-titleFrames[i])));}
  float foreshorten=mix(foreshortenKeys.z,foreshortenKeys.w,ease((f-foreshortenKeys.x)/(foreshortenKeys.y-foreshortenKeys.x)));
  foreshorten*=mix(entryForeshorten.z,entryForeshorten.w,ease(pow(sat((f-entryForeshorten.x)/(entryForeshorten.y-entryForeshorten.x)),2.)));
  float curve=mix(.018,.10,bowlProgress)+.12*(1.-ease((f-cuts.x)/12.));
  vec2 label=vec2(atan(n.x,max(.12,n.z))*radius*.93,(p.y-labelY+curve*p.x*p.x)/foreshorten);
  vec2 texUV=label*vec2(1.0,1.0)/(lensSize.z*aspect/.88)+.5;
  float sdf=sdfSample(introSdf,texUV),title=1.-smoothstep(-.001,.001,sdf);
  title*=ease((f-cuts.x-1.)/2.)*(1.-smoothstep(.995,1.004,rr));
  c=mix(c,cream,title);
  if(f>=cuts.y&&f<cuts.y+11.){
    float marks=0.;
    for(int i=0;i<4;i++){
      vec2 center=vec2(mod(float(i),2.)<.5?-.67:.64,float(i)<2.?.37:-.25);
      vec2 local=abs(p-center)-vec2(.032,.021);
      float horizontal=(1.-smoothstep(.0005,.0015,abs(local.y)))*(1.-smoothstep(.008,.015,abs(local.x)));
      float vertical=(1.-smoothstep(.0005,.0015,abs(local.x)))*(1.-smoothstep(.009,.014,abs(local.y)));
      marks=max(marks,max(horizontal,vertical));
    }
    c=mix(c,cream,marks*.55);
  }
  vec3 onset=characters(uv,f);
  c=mix(onset,c,ease((f-cuts.x)/5.));
  return c;
}
vec3 lens(vec2 uv,float f){
  if(f<cuts.x||f>=cuts.x+10.)return lensSurface(uv,f);
  float blur=.17*(1.-ease((f-cuts.x)/10.));
  vec2 radial=(uv-vec2(.5,.43))*blur;
  vec3 c=vec3(0.);float total=0.;
  for(int i=0;i<7;i++){
    float k=float(i)/6.-.5,weight=1.-abs(k)*1.4;
    c+=lensSurface(uv+radial*k+vec2(k*.006,-k*.004)*(1.-ease((f-cuts.x)/10.)),f)*weight;total+=weight;
  }
  return c/total;
}
float textField(vec2 p){vec2 uv=p/(reliefSize.x*resolution.x/resolution.y/.88)+.5;return sdfSample(reliefSdf,uv)*(reliefSize.x*resolution.x/resolution.y/.88);}
float merge(float a,float b,float k){float h=sat(.5+.5*(b-a)/k);return mix(b,a,h)-k*h*(1.-h);}
float patternRegion(vec2 p,float f){
  f=min(f,phaseCuts[9]);
  float grow=ease((f-cuts.w)/(phaseCuts[9]-cuts.w-3.));
  float t=(f-cuts.w)*.025;
  vec2 upper=rotate(-.34)*(p-vec2(-1.03,.65)),lower=rotate(-.36)*(p-vec2(1.03,-.65));
  vec2 cornerSize=vec2(.34+grow*.60,.22+grow*.20);
  float corner=min(length(upper/cornerSize),length(lower/cornerSize))-1.;
  vec2 envelopeP=p+vec2(sin(p.y*11.+t)*.014,sin(p.x*6.+t)*.018);
  float surroundGrow=ease((f-cuts.w-43.)/21.);
  float outer=rounded(envelopeP,vec2(reliefSize.x*resolution.x/resolution.y*.5+.065+surroundGrow*.080,.184+surroundGrow*.085),.14);
  float inner=rounded(envelopeP,vec2(reliefSize.x*resolution.x/resolution.y*.5-.025,.095),.075);
  float surround=max(outer,-inner);
  float front=length(p)-mix(-.06,1.62,ease((f-cuts.w-43.)/12.));
  return merge(corner*.055,max(surround,front),.018);
}
float patternField(vec2 p,float f){
  f=min(f,phaseCuts[9]);float t=(f-cuts.w)*.025;
  vec2 warped=p+vec2(sin(p.y*8.+t)*.025,sin(p.x*9.-t)*.020);
  float spacing=.034;
  vec2 cell=floor(warped/spacing);
  float dotSdf=1.;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
    vec2 id=cell+vec2(float(x),float(y));
    vec2 jitter=vec2(hash(id+13.1),hash(id+41.7))-.5;
    vec2 center=(id+.5+jitter*.50)*spacing;
    float region=patternRegion(center,f),fringe=exp(-max(0.,-region)*60.);
    float r=(.008+.008*hash(id+72.4)+.007*fringe)*ease(-region/.024);
    if(r<.0008)continue;
    vec2 local=rotate(hash(id+29.)*6.283185)*(warped-center);
    float kind=hash(id+104.7);
    float stretch=1.+1.35*pow(kind,7.);
    local.x/=stretch;
    float angle=atan(local.y,local.x);
    float organic=length(local)-r*(1.+.10*sin(angle*2.+id.x+t));
    if(kind>.70&&kind<.86)organic=max(organic,-(length(local-vec2(r*.46,0.))-r*.72));
    dotSdf=merge(dotSdf,organic,.009);
  }
  float clusters=dotSdf;
  float wisp=abs(length((p-vec2(1.14,-.64))/vec2(.53,.22))-1.)*.05-.0016;
  wisp=max(wisp,.76-p.x);
  return min(clusters,wisp);
}
vec3 honeycomb(vec2 p,float f){
  float start=cuts.w+43.,progress=ease((f-start)/11.);
  if(f<start||f>=start+15.)return vec3(0.);
  float radius=progress*1.85,spacing=.064*(1.+progress*.45),row=floor(p.y/(spacing*.8660254));
  float shape=1.,distance=length(p);vec2 faceNormal=vec2(0.);
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
    float iy=row+float(y),ix=floor(p.x/spacing)+float(x);
    vec2 center=vec2((ix+.5*mod(iy,2.))*spacing,iy*spacing*.8660254),offset=p-center,local=abs(offset);
    float visible=ease((radius-length(center)+.05)/.22);
    float hex=max(local.y*.8660254+local.x*.5,local.x)-spacing*.46*visible;
    if(hex<shape){shape=hex;faceNormal=local.y*.8660254+local.x*.5>local.x?sign(offset)*vec2(.5,.8660254):vec2(sign(offset.x),0.);}
  }
  float front=ease((radius-distance+.02)/.18)*(1.-ease((radius-distance-.18)/.48));
  float envelope=front*(1.-ease((f-start-10.)/5.)),shoulder=sat((shape+.003)/.005);
  return vec3((1.-smoothstep(-.003,.002,shape))*envelope,-faceNormal*6.*shoulder*(1.-shoulder)/.005*envelope);
}
float reliefField(vec2 p,float f){return min(textField(p)-.0025,patternField(p,f));}
float surfaceHeight(vec2 p,float f){
  vec2 uv=p/(reliefSize.x*resolution.x/resolution.y/.88)+.5;
  float textHeight=min(uv.x,uv.y)<0.||max(uv.x,uv.y)>1.?0.:sdfSample(reliefHeight,uv);
  float patternHeight=1.-smoothstep(-.008,.008,patternField(p,f));
  return max(textHeight,patternHeight)*reliefSize.w;
}
vec3 embossed(vec2 uv,float f){
  float t=(f-cuts.w)/(phaseCuts[9]-cuts.w),aspect=resolution.x/resolution.y;
  vec2 p=(uv-vec2(.5,1.-reliefSize.y))*vec2(aspect,1.);
  float s=reliefField(p,f),e=.0007;
  vec2 grad=vec2(surfaceHeight(p+vec2(e,0.),f)-surfaceHeight(p-vec2(e,0.),f),surfaceHeight(p+vec2(0.,e),f)-surfaceHeight(p-vec2(0.,e),f))/(2.*e);
  float inside=1.-smoothstep(-.002,.002,s);
  vec3 n=normalize(vec3(-grad,1.));
  vec2 displaced=p+n.xy*.021*(inside+.28*exp(-max(0.,s)*140.));
  vec3 base=reliefBackgrounds[0],surface=reliefSurfaces[0];
  for(int i=0;i<5;i++){if(f>=reliefFrames[i]){float material=ease((f-reliefFrames[i])/(reliefFrames[i+1]-reliefFrames[i]));base=mix(reliefBackgrounds[i],reliefBackgrounds[i+1],material);surface=mix(reliefSurfaces[i],reliefSurfaces[i+1],material);}}
  float wave=.5+.5*sin(displaced.x*4.+displaced.y*6.+t*5.);
  surface=mix(surface,surface*cream,wave*.15);
  vec3 reflected=studio(reflect(vec3(0.,0.,-1.),n),t*.62,.12);
  float diffuse=.42+.58*max(dot(n,normalize(vec3(-.5,.7,1.))),0.);
  vec3 raised=surface*(.40+.60*diffuse)*.88+reflected*.13;
  raised+=cream*pow(max(dot(n,normalize(vec3(-.5,.7,1.))),0.),16.)*.39;
  if(f>=phaseCuts[9]){base=vec3(.76);raised=vec3(.74+.025*diffuse+.012*dot(reflected,vec3(.3333))-.40*pow(1.-n.z,.55));}
  float shadow=exp(-max(0.,s)*250.)*(1.-inside)*(f>=phaseCuts[9]?.24:.12);
  vec3 c=mix(base*(1.-shadow),min(raised,vec3(1.)),inside);
  // A displaced rim outside the glyph gives the surrounding field a true relief shoulder.
  c+=cream*exp(-pow((s+.001)/.0025,2.))*(f>=phaseCuts[9]?.025:.07);
  if(f>=phaseCuts[9])c+=vec3(-.20*exp(-pow((s+.002)/.0028,2.))+.12*exp(-pow((s+.008)/.004,2.)));
  vec3 hex=honeycomb(p,f);float glyph=1.-smoothstep(-.001,.002,textField(p));
  if(hex.x>0.){
    vec3 hexNormal=normalize(vec3(hex.yz*.009,1.));
    vec3 cell=base*.56+cream*(.04+.24*max(dot(hexNormal,normalize(vec3(-.5,.7,1.))),0.));
    c=mix(c,cell,hex.x*.65*(1.-glyph));
  }
  if(f>=phaseCuts[9])c=vec3(dot(c,vec3(.2126,.7152,.0722)));
  return c;
}
void main(){
  vec3 c;
  if(frame<cuts.z)c=lens(vUv,frame);
  else if(frame<phaseCuts[7]){
    float m=frame<phaseCuts[0]?0.:frame<phaseCuts[1]?1.:frame<phaseCuts[2]?2.:frame<phaseCuts[3]?3.:frame<phaseCuts[4]?4.:frame<phaseCuts[5]?5.:frame<phaseCuts[6]?6.:7.;
    c=ringColor((vUv-.5)*vec2(resolution.x/resolution.y,1.),m,frame*.006);
  }else if(frame<phaseCuts[8]){
    float after=sat((frame-phaseCuts[7]-4.)/3.);
    float flash=ease((frame-phaseCuts[7])/3.)*(1.-pow(after,2.4));
    c=frame<phaseCuts[7]+3.?ringColor((vUv-.5)*vec2(resolution.x/resolution.y,1.),7.,frame*.006):embossed(vUv,phaseCuts[8]);
    c=mix(c,vec3(.985,.985,.977),flash);
  }else c=embossed(vUv,frame);
  gl_FragColor=vec4(c,1.);
}
