/* Local authored GPU surfaces. Copy and cuts are in pilot.json; glyph SDFs are built offline. */
(async () => {
  const THREE = window.THREE;
  const spec = await fetch('pilot.json').then(r=>r.json());
  const manifest = await fetch('assets/sdf-manifest.json').then(r=>r.json());
  const orderedCuts=Object.values(spec.cuts);
  if(orderedCuts.some((value,i)=>!Number.isInteger(value)||(i&&value<=orderedCuts[i-1]))||spec.cuts.end!==spec.frames)throw Error('Pilot cuts must increase and end at the frame bound');
  const renderer = new THREE.WebGLRenderer({canvas:document.getElementById('pilot'),antialias:false,preserveDrawingBuffer:true});
  renderer.setSize(spec.width,spec.height,false); renderer.setPixelRatio(1);
  renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
  const textures = {};
  for(const asset of [...manifest.assets,...manifest.heightAssets]) {
    const bytes=await fetch(asset.file).then(r=>{if(!r.ok)throw Error('Local SDF missing');return r.arrayBuffer();});
    if(bytes.byteLength!==1048576)throw Error('Local SDF byte count differs');
    const data=new Float32Array(bytes);
    if(asset.sampleType==='height'){
      if(data.some(v=>!Number.isFinite(v)||v<0||v>1)||!data.some(v=>v>.9))throw Error('Local relief height contract differs');
    }else if(!data.some(v=>v<0)||!data.some(v=>v>0))throw Error('Local SDF sign contract differs');
    // Flip the row-major image once, explicitly, before its synchronous GPU upload.
    const flipped=new Float32Array(data.length);for(let y=0;y<512;y++)flipped.set(data.subarray(y*512,(y+1)*512),(511-y)*512);
    textures[asset.key]=new THREE.DataTexture(flipped,512,512,THREE.RedFormat,THREE.FloatType);
    textures[asset.key].minFilter=THREE.NearestFilter;textures[asset.key].magFilter=THREE.NearestFilter;
    textures[asset.key].needsUpdate=true;renderer.initTexture(textures[asset.key]);
  }
  const uniforms={frame:{value:0},resolution:{value:new THREE.Vector2(spec.width,spec.height)},introSdf:{value:textures.introduction},reliefSdf:{value:textures.relief},cuts:{value:new THREE.Vector4(spec.cuts.lens,spec.cuts.warmLens,spec.cuts.ring,spec.cuts.relief)},ringSize:{value:new THREE.Vector4(spec.ring.width,spec.ring.height,spec.ring.holeWidth,spec.ring.holeHeight)},lensSize:{value:new THREE.Vector4(spec.lens.width,spec.lens.height,spec.lens.titleWidth,spec.lens.titleCenterY)},reliefSize:{value:new THREE.Vector4(spec.relief.width,spec.relief.centerY,spec.relief.bevel,spec.relief.depth)}};
  uniforms.phaseCuts={value:new Float32Array(['glass','gold','cream','carbon','returnChrome','voxel','coloredGlass','flare','relief','grayscale'].map(key=>spec.cuts[key]))};
  uniforms.titleFrames={value:new Float32Array(spec.camera.titleFrames)};uniforms.titlePositions={value:new Float32Array(spec.camera.titleY)};
  uniforms.entryPitch={value:new THREE.Vector4(...spec.camera.entryPitch)};uniforms.reversePitch={value:new THREE.Vector4(...spec.camera.reversePitch)};
  uniforms.openBowl={value:new THREE.Vector2(...spec.camera.openBowl)};uniforms.foreshortenKeys={value:new THREE.Vector4(...spec.camera.foreshorten)};
  uniforms.entryForeshorten={value:new THREE.Vector4(...spec.camera.entryForeshorten)};
  uniforms.reliefHeight={value:textures.reliefHeight};
  const shader=await fetch('surfaces.frag').then(r=>r.text());
  const material=new THREE.ShaderMaterial({uniforms,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:shader,depthTest:false,depthWrite:false});
  const scene=new THREE.Scene();scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));
  const camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
  window.__pilotEvidence={engine:'Three r180; locally authored WebGL2 distance-field/height surfaces',renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),sdfUploads:[...manifest.assets,...manifest.heightAssets].map(a=>({key:a.key,bytes:a.bytes,sha256:a.sha256,upload:'renderer.initTexture completed; local buffer validated'})),providerCalls:0,paidSpendUsd:0};
  window.seekPilotFrame=async value=>{
    if(!Number.isFinite(value)||value<0||value>=spec.frames)throw Error('Pilot frame out of range');
    uniforms.frame.value=value;renderer.render(scene,camera);gl.finish();
    if(gl.getError()!==gl.NO_ERROR)throw Error('GPU draw error');
    window.__pilotState={frame:value,seconds:value*spec.fpsDenominator/spec.fpsNumerator,material:value<82?'lens':value<145?'ring':'relief',completed:true};
  };
  window.seekComposition=async seconds=>window.seekPilotFrame(Math.min(spec.frames-1,seconds*spec.fpsNumerator/spec.fpsDenominator));
  await window.seekPilotFrame(0);window.__motionReady=true;
})().catch(error=>{window.__motionError=String(error.stack||error);console.error(error);});
