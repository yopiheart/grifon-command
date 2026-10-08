(async()=>{
  const started=performance.now();
  try{
    const T=window.THREE;
    const [spec,manifest,outlines,fragment]=await Promise.all([
      fetch('full.json').then(r=>r.json()),fetch('assets/full/manifest.json').then(r=>r.json()),
      fetch('assets/full/inter-outlines.json').then(r=>r.json()),fetch('full-surfaces.frag').then(r=>r.text())
    ]);
    await document.fonts.load('900 100px Inter');await document.fonts.ready;
    const renderer=new T.WebGLRenderer({canvas:document.getElementById('full'),antialias:true,preserveDrawingBuffer:true,alpha:false});
    renderer.setSize(spec.width,spec.height);renderer.setPixelRatio(1);renderer.setClearColor(0x000000,1);renderer.autoClear=false;
    renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;
    const gl=renderer.getContext(),extension=gl.getExtension('WEBGL_debug_renderer_info');
    const background=new T.Scene(),orthographic=new T.OrthographicCamera(-1,1,1,-1,0,2);
    const uniforms={uFrame:{value:222},uMode:{value:0},uPhase:{value:0},uFade:{value:1},uExit:{value:0}};
    const field=new T.Mesh(new T.PlaneGeometry(2,2),new T.ShaderMaterial({uniforms,vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:fragment,depthTest:false,depthWrite:false,transparent:true}));
    background.add(field);
    const scene=new T.Scene(),camera=new T.PerspectiveCamera(45,spec.width/spec.height,.05,100);
    camera.position.set(0,0,7.2);camera.lookAt(0,0,0);
    scene.add(new T.HemisphereLight(0xfff9e3,0x171717,2.6));
    const key=new T.DirectionalLight(0xffffff,5);key.position.set(-4,5,5);scene.add(key);
    const warm=new T.DirectionalLight(0xffcc00,3);warm.position.set(4,-2,3);scene.add(warm);
    const rim=new T.DirectionalLight(0xffffff,3);rim.position.set(2,3,-3);scene.add(rim);
    const objects=[];
    const add=object=>{scene.add(object);objects.push(object);return object;};
    const canvasTexture=canvas=>{const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;return texture;};
    const loader=new T.TextureLoader();
    const textures=await Promise.all(['script-desktop.png','script-mobile.png','storyboard.png','logo.png'].map(file=>loader.loadAsync(`assets/full/${file}`)));
    for(const texture of textures){texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;renderer.initTexture(texture);}
    function textTexture(text,color='#F2F1EA',italic=false){
      const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font=`${italic?'italic ':''}900 160px Inter`;
      canvas.width=Math.ceil(ctx.measureText(text).width)+32;canvas.height=208;
      ctx.font=`${italic?'italic ':''}900 160px Inter`;ctx.fillStyle=color;ctx.textBaseline='alphabetic';ctx.fillText(text,16,165);
      return {texture:canvasTexture(canvas),aspect:canvas.width/canvas.height};
    }
    function textMesh(text,width,color,italic=false){const asset=textTexture(text,color,italic);return new T.Mesh(new T.PlaneGeometry(width,width/asset.aspect),new T.MeshBasicMaterial({map:asset.texture,transparent:true,depthTest:false,depthWrite:false}));}
    const capability=add(textMesh(spec.copy.capability,3.75,'#3A3218'));capability.renderOrder=9;
    const canvasText=add(textMesh(spec.copy.canvas,4.25,'#FAFAF8'));canvasText.renderOrder=9;
    const disclosureCanvas=document.createElement('canvas');disclosureCanvas.width=1140;disclosureCanvas.height=96;
    const dc=disclosureCanvas.getContext('2d');dc.fillStyle='rgba(9,9,11,.92)';dc.fillRect(0,0,1140,96);dc.font='500 39px monospace';dc.fillStyle='#FFCC00';dc.fillText(`${spec.copy.disclosure} · ${spec.copy.disclosureDetail}`,24,62);
    const disclosure=add(new T.Mesh(new T.PlaneGeometry(3.15,.265),new T.MeshBasicMaterial({map:canvasTexture(disclosureCanvas),transparent:true,depthTest:false,depthWrite:false})));disclosure.renderOrder=20;
    function catalogTexture(){
      const canvas=document.createElement('canvas');canvas.width=4096;canvas.height=2560;const ctx=canvas.getContext('2d');
      ctx.fillStyle='#09090B';ctx.fillRect(0,0,4096,2560);
      for(let row=0;row<10;row++)for(let col=0;col<5;col++){
        const x=col*828-18,y=row*263-38,w=790,h=232;
        ctx.fillStyle='#161617';ctx.beginPath();ctx.roundRect(x,y,w,h,38);ctx.fill();
        ctx.strokeStyle='#6B6650';ctx.lineWidth=2;ctx.stroke();
        const cx=x+104,cy=y+116;
        ctx.save();ctx.beginPath();ctx.arc(cx,cy,52.5,0,Math.PI*2);ctx.clip();
        const grad=ctx.createRadialGradient(cx-35,cy-26,2,cx,cy,84);grad.addColorStop(0,'#F2F1EA');grad.addColorStop(.35,'#D9AE28');grad.addColorStop(1,'#151516');ctx.fillStyle=grad;ctx.fillRect(cx-80,cy-80,160,160);
        const treatment=(row*5+col)%6;ctx.strokeStyle=treatment%2?'#3A3117':'#F2F1EA';ctx.globalAlpha=.85;ctx.lineWidth=4;
        if(treatment===0)for(let k=0;k<10;k++){ctx.beginPath();ctx.ellipse(cx,cy,16+k*7,12+k*6,(row+col)*.25,0,Math.PI*2);ctx.stroke();}
        else if(treatment===1)for(let k=-100;k<100;k+=12){ctx.beginPath();ctx.moveTo(cx+k,cy-85);ctx.lineTo(cx+k+95,cy+85);ctx.stroke();}
        else if(treatment===2)for(let u=-80;u<80;u+=18)for(let v=-80;v<80;v+=18){ctx.fillStyle=((u+v)/18)%2?'#09090B':'#F2F1EA';ctx.fillRect(cx+u,cy+v,14,14);}
        else if(treatment===3)for(let k=0;k<32;k++){const a=k*Math.PI/16;ctx.beginPath();ctx.moveTo(cx+20*Math.cos(a),cy+20*Math.sin(a));ctx.lineTo(cx+90*Math.cos(a+.8),cy+90*Math.sin(a+.8));ctx.stroke();}
        else if(treatment===4)for(let u=-75;u<75;u+=12)for(let v=-75;v<75;v+=12){ctx.fillStyle='#F2F1EA';ctx.beginPath();ctx.arc(cx+u,cy+v,3.5,0,Math.PI*2);ctx.fill();}
        else{ctx.fillStyle='#09090B';ctx.fillRect(cx-85,cy-85,170,170);ctx.strokeStyle='#F2F1EA';for(let k=-85;k<85;k+=7){ctx.beginPath();ctx.moveTo(cx-90,cy+k);ctx.bezierCurveTo(cx-30,cy+k-60,cx+30,cy+k+60,cx+90,cy+k);ctx.stroke();}}ctx.restore();
        ctx.font='70px monospace';ctx.fillStyle='#FFCC00';ctx.textBaseline='middle';let name=spec.catalogNames[(row*5+col)%spec.catalogNames.length];
        if(ctx.measureText(name).width>w-290){while(ctx.measureText(name+'…').width>w-290)name=name.slice(0,-1);name+='…';}ctx.fillText(name,x+180,cy);
        ctx.strokeStyle='#F2F1EA';ctx.lineWidth=3;
        for(const sign of[-1,1]){const bx=x+w-65+sign*19;ctx.beginPath();ctx.moveTo(bx-sign*9,cy-23);ctx.lineTo(bx,cy-23);ctx.lineTo(bx,cy+23);ctx.lineTo(bx-sign*9,cy+23);ctx.stroke();}
      }
      return canvasTexture(canvas);
    }
    const atlas=catalogTexture(),blurCanvas=document.createElement('canvas');blurCanvas.width=atlas.image.width;blurCanvas.height=atlas.image.height;
    const blurContext=blurCanvas.getContext('2d');blurContext.filter='blur(28px)';blurContext.drawImage(atlas.image,0,0);const blurredAtlas=canvasTexture(blurCanvas);
    renderer.initTexture(atlas);renderer.initTexture(blurredAtlas);
    const catalog=add(new T.Mesh(new T.PlaneGeometry(11.4,7.125),new T.MeshBasicMaterial({map:atlas,side:T.DoubleSide})));
    function captureMesh(texture,mobile=false){
      if(!mobile){texture.repeat.y=.80;texture.offset.y=.20;}
      return new T.Mesh(new T.PlaneGeometry(mobile?3.20:11.65,mobile?4.44:6.553),new T.MeshBasicMaterial({map:texture,transparent:true,side:T.DoubleSide}));
    }
    const desktop=add(captureMesh(textures[0])),mobile=add(captureMesh(textures[1],true)),storyboard=add(captureMesh(textures[2]));
    const cursorCanvas=document.createElement('canvas');cursorCanvas.width=80;cursorCanvas.height=100;const cc=cursorCanvas.getContext('2d');cc.beginPath();cc.moveTo(8,6);cc.lineTo(12,79);cc.lineTo(29,63);cc.lineTo(43,95);cc.lineTo(56,88);cc.lineTo(41,58);cc.lineTo(68,54);cc.closePath();cc.fillStyle='#FAFAF8';cc.fill();cc.strokeStyle='#09090B';cc.lineWidth=5;cc.stroke();
    const cursor=add(new T.Mesh(new T.PlaneGeometry(.16,.20),new T.MeshBasicMaterial({map:canvasTexture(cursorCanvas),transparent:true,depthTest:false})));cursor.renderOrder=21;
    const patternMaterial=new T.ShaderMaterial({uniforms:{uTime:{value:0}},vertexShader:'varying vec2 vUv;varying vec3 vNormal;void main(){vUv=uv;vNormal=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`precision highp float;varying vec2 vUv;varying vec3 vNormal;uniform float uTime;void main(){vec2 cells=vUv*vec2(480.,190.);float dotMask=1.-smoothstep(.18,.32,length(fract(cells)-.5));float stripe=pow(.5+.5*cos(vUv.y*1300.),5.);vec3 n=normalize(vNormal)*(gl_FrontFacing?1.:-1.);float light=.44+.56*max(0.,dot(n,normalize(vec3(-.4,.8,1.))));vec3 base=mix(vec3(.018),vec3(.98,.91,.70),max(dotMask,stripe*.58)*light);base+=vec3(.55,.40,0.)*pow(max(0.,n.x),3.)*.08;if(!gl_FrontFacing)base*=.34;gl_FragColor=vec4(base,1.);}`,side:T.DoubleSide});
    function openShellGeometry(){
      const curve=new T.CatmullRomCurve3([new T.Vector3(-1.70,.12,1.15),new T.Vector3(-1.55,.67,-.8),new T.Vector3(-.35,.95,-.20),new T.Vector3(.92,.20,-.55),new T.Vector3(1.70,-.16,1.05)]),segments=260,sides=150,frames=curve.computeFrenetFrames(segments,false),positions=[],uvs=[],indices=[];
      for(let i=0;i<=segments;i++){
        const u=i/segments,center=curve.getPointAt(u),radius=.57+.64*Math.exp(-u*9.)+.25*Math.exp(-(1.-u)*10.)+.14*Math.sin(u*Math.PI*3.);
        for(let j=0;j<=sides;j++){const v=j/sides,a=v*Math.PI*2+u*2.2,point=center.clone().addScaledVector(frames.normals[i],Math.cos(a)*radius).addScaledVector(frames.binormals[i],Math.sin(a)*radius*(.84+.12*Math.cos(u*6.)));positions.push(point.x,point.y,point.z);uvs.push(u,v);}
      }
      for(let i=0;i<segments;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;indices.push(a,a+1,b,b,a+1,b+1);}
      const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
    }
    const shell=add(new T.Mesh(openShellGeometry(),patternMaterial));
    const metal=new T.ShaderMaterial({vertexShader:'varying vec3 vN;varying vec2 vUv;void main(){vN=normalize(normalMatrix*normal);vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'precision highp float;varying vec3 vN;varying vec2 vUv;void main(){vec3 n=normalize(vN);float edge=pow(1.-abs(n.z),.7);float reflection=pow(max(0.,dot(n,normalize(vec3(-.45,.70,1.)))),18.);vec3 c=mix(vec3(.035,.03,.012),vec3(.94,.91,.72),edge*.72);c+=vec3(1.,.80,.02)*(edge*.19+reflection*.60);if(!gl_FrontFacing)c*=.32;gl_FragColor=vec4(c,1.);}',side:T.DoubleSide});
    const cluster=add(new T.Group());
    function cupGeometry(){
      const vertices=[],uvs=[],indices=[],segments=100,rings=42;
      for(let j=0;j<=rings;j++)for(let i=0;i<=segments;i++){
        const a=i/segments*Math.PI*2,t=j/rings,roundedSquare=1/Math.pow(Math.pow(Math.abs(Math.cos(a)),8)+Math.pow(Math.abs(Math.sin(a)),8),1/8),r=(.53+.40*t)*(1+(roundedSquare-1)*Math.pow(t,3)),z=-.64+.75*Math.sin(t*Math.PI*.72)+.20*Math.cos(a*4.)*Math.pow(t,4);
        vertices.push(r*Math.cos(a),r*Math.sin(a),z);uvs.push(i/segments,t);
      }
      for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;indices.push(a,b,a+1,b,b+1,a+1);}
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
    }
    for(let i=0;i<6;i++){
      const group=new T.Group(),angle=i*Math.PI/3,lip=new T.Mesh(cupGeometry(),metal);group.add(lip);
      const placements=[[-.86,1.27],[1.01,1.13],[-1.21,-.10],[1.15,-.06],[-.58,-1.35],[.73,-1.31]];
      group.position.set(...placements[i],i%2?.06:-.04);group.rotation.set(.3*Math.sin(angle),.4*Math.cos(angle),angle*.7);cluster.add(group);
    }
    const pinwheel=add(new T.Group());
    function foldedPetal(angle){const positions=[],uvs=[],indices=[],rings=70,segments=70;
      for(let i=0;i<=rings;i++)for(let j=0;j<=segments;j++){const u=i/rings,v=j/segments,a=angle+v*Math.PI/2,r=u*(2.7-.25*Math.sin(v*Math.PI));positions.push(r*Math.cos(a),r*Math.sin(a),u*.65*Math.cos(v*Math.PI)+Math.sin(u*Math.PI)*Math.sin(v*Math.PI)*1.2);uvs.push(u,v);}
      for(let i=0;i<rings;i++)for(let j=0;j<segments;j++){const a=i*(segments+1)+j,b=a+segments+1;indices.push(a,b,a+1,b,b+1,a+1);}const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;}
    const silver=new T.ShaderMaterial({vertexShader:'varying vec3 vN;varying vec2 vUv;void main(){vN=normalize(normalMatrix*normal);vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'precision highp float;varying vec3 vN;varying vec2 vUv;void main(){vec3 n=normalize(vN)*(gl_FrontFacing?1.:-1.);float shade=clamp(n.z*.8+n.x*.42-n.y*.32,0.,1.);float fine=.9+.1*pow(.5+.5*cos(vUv.x*1400.+vUv.y*750.),5.);vec3 c=mix(vec3(.028),vec3(.94,.94,.92),shade)*fine;gl_FragColor=vec4(c,1.);}',side:T.DoubleSide});
    for(let i=0;i<4;i++)pinwheel.add(new T.Mesh(foldedPetal(i*Math.PI/2),silver));
    const secondPinwheel=add(pinwheel.clone());
    const glyphMeshes=[];
    for(const character of spec.glyphs){
      const glyph=outlines.glyphs[character],scale=3.2/outlines.unitsPerEm;
      const shapes=glyph.shapes.map(contour=>{
        const points=contour.outer.map(([x,y])=>new T.Vector2(x*scale,y*scale));const shape=new T.Shape(points);
        shape.holes=contour.holes.map(h=>new T.Path(h.map(([x,y])=>new T.Vector2(x*scale,y*scale))));return shape;
      });
      const geometry=new T.ExtrudeGeometry(shapes,{depth:.66,bevelEnabled:true,bevelSegments:18,steps:1,bevelSize:.16,bevelThickness:.20,curveSegments:12});geometry.center();
      const positions=geometry.getAttribute('position'),normals=geometry.getAttribute('normal'),sums=new Map(),keys=[];
      for(let i=0;i<positions.count;i++){const key=[positions.getX(i),positions.getY(i),positions.getZ(i)].map(x=>Math.round(x*100000)).join(',');keys.push(key);const sum=sums.get(key)||new T.Vector3();sum.add(new T.Vector3(normals.getX(i),normals.getY(i),normals.getZ(i)));sums.set(key,sum);}
      for(let i=0;i<positions.count;i++){const normal=sums.get(keys[i]).clone().normalize();normals.setXYZ(i,normal.x,normal.y,normal.z);}
      const mesh=add(new T.Mesh(geometry,new T.MeshPhysicalMaterial({color:0xf2f1ea,metalness:.68,roughness:.22,clearcoat:1,clearcoatRoughness:.10,side:T.DoubleSide})));glyphMeshes.push(mesh);
    }
    const lockup=add(new T.Group()),brand=textMesh(spec.copy.brand,1.63,'#FFCC00',true);brand.position.x=.18;lockup.add(brand);
    const bounds=manifest.logoAlphaBounds,logo=textures[3];logo.repeat.set(bounds.width/bounds.sourceWidth,bounds.height/bounds.sourceHeight);logo.offset.set(bounds.left/bounds.sourceWidth,1.-(bounds.top+bounds.height)/bounds.sourceHeight);
    const emblem=new T.Mesh(new T.PlaneGeometry(.32,.32*bounds.height/bounds.width),new T.MeshBasicMaterial({map:logo,color:0xffcc00,transparent:true,depthTest:false}));emblem.position.x=-.94;lockup.add(emblem);lockup.renderOrder=12;
    const prefix=document.getElementById('prefix');
    await new Promise((resolve,reject)=>{if(prefix.readyState>=2)return resolve();prefix.addEventListener('loadeddata',resolve,{once:true});prefix.addEventListener('error',()=>reject(Error('Frozen prefix failed local decode')),{once:true});prefix.load();});
    const prefixScene=new T.Scene(),prefixTexture=new T.VideoTexture(prefix);prefixTexture.colorSpace=T.SRGBColorSpace;
    const prefixQuad=new T.Mesh(new T.PlaneGeometry(2,2),new T.MeshBasicMaterial({map:prefixTexture,depthTest:false}));prefixScene.add(prefixQuad);
    function lerp(a,b,t){return a+(b-a)*t;}
    function smooth(a,b,value){const t=Math.max(0,Math.min(1,(value-a)/(b-a)));return t*t*(3-2*t);}
    function keyframe(frames,values,frame){let i=0;while(i<frames.length-2&&frame>frames[i+1])i++;return lerp(values[i],values[i+1],smooth(frames[i],frames[i+1],frame));}
    function clear(){for(const object of objects)object.visible=false;camera.position.set(0,0,7.2);camera.rotation.set(0,0,0);camera.lookAt(0,0,0);uniforms.uFade.value=1;uniforms.uExit.value=0;}
    function applyFrame(frame){
      clear();const shot=spec.shots.find(s=>frame>=s.start&&frame<s.end),phase=(frame-shot.start)/(shot.end-shot.start),key=shot.key;
      uniforms.uFrame.value=frame;uniforms.uPhase.value=phase;let mode=9;
      if(key==='rosette')mode=0;
      else if(key==='polygon-strip')mode=1;
      else if(key==='dotted-aperture')mode=2;
      else if(key==='catalog'||key==='catalog-overlap'){
        mode=key==='catalog-overlap'?2:9;catalog.visible=true;catalog.material.map=key==='catalog-overlap'?blurredAtlas:atlas;catalog.rotation.set(.05,spec.camera.catalogTilt[0],-.015);
        camera.position.z=keyframe(spec.camera.catalogFrames,spec.camera.catalogDistance,frame);
        catalog.rotation.y=keyframe(spec.camera.catalogFrames,spec.camera.catalogTilt,frame);
        camera.position.x=keyframe(spec.camera.catalogFrames,spec.camera.catalogTargetX,frame);camera.position.y=keyframe(spec.camera.catalogFrames,spec.camera.catalogTargetY,frame);camera.lookAt(camera.position.x,camera.position.y,0);
      }else if(key.includes('capability-lens')){
        mode=4;capability.visible=frame>=307;capability.position.set(0,-.025,1);capability.rotation.set(0,0,0);capability.scale.setScalar(frame===306?.065:1.);
        if(frame===306){catalog.visible=true;catalog.material.map=atlas;catalog.rotation.set(.05,-.12,-.015);camera.position.set(1.25,-.9,2.8);camera.lookAt(1.25,-.9,0);}
      }
      else if(key==='character-reprise')mode=3;
      else if(key==='twisting-point-shell'){
        shell.visible=true;shell.rotation.set(.08+phase*.15,-.06+phase*.16,-.06+phase*.22);shell.scale.setScalar(1.62);shell.position.set(.02,-.12,.45);patternMaterial.uniforms.uTime.value=frame;
      }else if(key==='folded-lobe-cluster'){
        cluster.visible=true;cluster.rotation.set(-.12+phase*.25,.18+phase*.20,.03);cluster.scale.setScalar(1.05);cluster.position.set(0,.02,.3);
      }else if(key==='folded-pinwheel'){
        mode=10;pinwheel.visible=true;pinwheel.rotation.set(.12,-.18,.08+phase*.16);pinwheel.scale.setScalar(1.10);pinwheel.position.set(-.43,-.90,.7);
        secondPinwheel.visible=true;secondPinwheel.rotation.set(.17,.12,.25+phase*.16);secondPinwheel.scale.setScalar(.85);secondPinwheel.position.set(1.92,1.80,-.15);
      }else if(key.startsWith('chevron')||key.startsWith('stepped')||key.startsWith('zigzag')){
        mode=5;uniforms.uPhase.value=(frame-397)/13;
      }else if(key==='particle-ribbon')mode=6;
      else if(key.startsWith('glyph-')){
        const i=spec.glyphs.findIndex((_,i)=>spec.shots.filter(s=>s.key.startsWith('glyph-'))[i].key===key),mesh=glyphMeshes[i];mesh.visible=true;
        mode=i>=2?11:9;mesh.scale.setScalar(i===2?3.9:2.70);mesh.position.set(i===0?-.65:i===1?.3:0,i===3?-.7:0,1.2);mesh.rotation.set(.60-phase*.16,.65-phase*.2,i===0?-.24:i===1?.35:i===2?-.1:-.60);
        mesh.material.color.set(i===0?0xf2f1ea:i===1?0xb08a12:i===2?0xffcc00:0xd5cfb6);mesh.material.roughness=i===3?.12:.22;mesh.material.metalness=i===2?.45:.72;
      }else if(key.startsWith('script')||key==='storyboard'){
        mode=key==='script-alternate'?6:9;
        const isMobile=key==='script-mobile',isReflow=key==='script-reflow',isWhirl=key==='script-whirl',target=key==='storyboard'?storyboard:isMobile?mobile:desktop;
        target.visible=true;target.position.set(isMobile?.78:0,0,.30);target.rotation.set(.08,-.17,-.06);target.scale.setScalar(spec.camera.productDesktopScale);target.material.opacity=1;
        if(isMobile){desktop.visible=true;desktop.position.set(0,0,.0);desktop.rotation.set(.08,-.17,-.06);desktop.scale.setScalar(spec.camera.productDesktopScale);desktop.material.opacity=1.;target.position.set(1.20,0,.50);target.rotation.set(.05,-.11,-.02);target.scale.setScalar(1.);}
        if(isReflow){const mix=smooth(514,518,frame);desktop.material.opacity=1.;mobile.visible=true;mobile.position.set(1.20,0,.50);mobile.rotation.set(.05,-.11,-.02);mobile.material.opacity=mix;mobile.scale.setScalar(mix*.30+.70);}
        if(isWhirl){target.rotation.z=-.06+phase*Math.PI*1.5;target.scale.setScalar(lerp(1.,.43,Math.sin(phase*Math.PI)));}
        if(key==='script-alternate'){target.position.x=.18;target.rotation.set(-.08,.16,.045);target.scale.setScalar(1.03);}
        if(key==='storyboard'){target.rotation.set(.09,-.18,-.085);target.position.x=-.3;target.scale.setScalar(1.10+phase*.08);}
        disclosure.visible=true;disclosure.position.set(-2.50,2.17,1.5);
        cursor.visible=frame>=504&&frame<518;cursor.position.set(lerp(3.1,1.4,smooth(504,518,frame)),lerp(-1.85,.35,smooth(504,518,frame)),1.6);
      }else if(key.startsWith('canvas')||key==='binary-canvas'){
        mode=7;canvasText.visible=frame<636;
        const pull=frame>=626?1.+(frame-626)*.11:1.;canvasText.position.set(1.95,-.85,1.);canvasText.rotation.set(0,0,0);canvasText.scale.setScalar(1./pull);
        const count=frame<608?Math.min(spec.copy.canvas.length,Math.floor((frame-586)*.52)+1):spec.copy.canvas.length;
        if(canvasText.userData.count!==count){const asset=textTexture(spec.copy.canvas.slice(0,count),'#FAFAF8');canvasText.material.map.dispose();canvasText.material.map=asset.texture;canvasText.geometry.dispose();canvasText.geometry=new T.PlaneGeometry(4.25*count/spec.copy.canvas.length,4.25*count/spec.copy.canvas.length/asset.aspect);canvasText.userData.count=count;}
        canvasText.position.x=.72+(1.95-2.125+2.125*count/spec.copy.canvas.length-.72)/pull;
        canvasText.position.y=.206+(-.85-.206)/pull;
      }else if(key==='end-pause'||key==='end-hold'||key==='end-exit'){
        const onset=smooth(...spec.camera.endOnset,frame),exit=1.-smooth(...spec.camera.endExit,frame),opacity=onset*Math.pow(exit,1.35);mode=frame<648?9:8;uniforms.uFade.value=opacity;uniforms.uExit.value=1.-exit;
        lockup.visible=frame>=648;lockup.position.set(0,0,0);lockup.scale.setScalar(1.-(1.-exit)*.70);lockup.rotation.z=-(1.-exit)*.18;
        for(const child of lockup.children){child.material.opacity=opacity;child.material.transparent=true;}
      }
      uniforms.uMode.value=mode;renderer.clear(true,true,true);if(mode!==9)renderer.render(background,orthographic);renderer.clearDepth();renderer.render(scene,camera);
      if(frame===306){renderer.render(background,orthographic);catalog.visible=false;capability.visible=true;camera.position.set(0,0,7.2);camera.lookAt(0,0,0);renderer.render(scene,camera);}
    }
    window.seekFullFrame=async frame=>{
      if(!Number.isInteger(frame)||frame<0||frame>=spec.frames)throw Error(`Invalid native frame ${frame}`);
      if(frame<spec.prefixFrames){
        const time=(frame+.25)*spec.fpsDenominator/spec.fpsNumerator;
        if(Math.abs(prefix.currentTime-time)>.00001)await new Promise(resolve=>{prefix.addEventListener('seeked',resolve,{once:true});prefix.currentTime=time;});
        renderer.clear();renderer.render(prefixScene,orthographic);gl.finish();return;
      }
      applyFrame(frame);gl.finish();if(gl.getError()!==gl.NO_ERROR)throw Error(`GPU draw failed for native frame ${frame}`);
    };
    for(const frame of[225,285,324,362,383,393,450,500,529,573,600,740,931]){applyFrame(frame);gl.finish();}
    if(renderer.info.programs.some(program=>program.diagnostics&&!program.diagnostics.runnable))throw Error('Continuation shader compilation failed');
    const pixel=new Uint8Array(4);applyFrame(324);gl.readPixels(960,540,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);if(pixel[0]<10)throw Error('Ready draw readback is empty');
    window.__fullEvidence={renderer:extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),initializationMs:performance.now()-started,localAssetsReady:true,fontReady:document.fonts.check('900 100px Inter'),textureUploadsVerified:true,readback:Array.from(pixel),prefixPreviewOnly:true,exportStartsAt:222,providerCalls:0};
    applyFrame(222);window.__motionReady=true;
  }catch(error){window.__motionError=error.stack||error.message;console.error(error);}
})();
