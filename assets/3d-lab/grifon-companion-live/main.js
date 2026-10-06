const stage = document.querySelector('#stage');
const host = document.querySelector('#canvas-host');
const fallback = document.querySelector('#fallback');
const status = document.querySelector('#status');
const pauseButton = document.querySelector('#pause');
const retryButton = document.querySelector('#retry');
const motionNote = document.querySelector('#motion-note');
const diagnosticOutput = document.querySelector('#diagnostics');
const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const pose = { gazeX: 0, gazeY: 0, headYaw: 0, headPitch: 0, blink: 0, breath: 0 };
const target = { x: 0, y: 0 };
const frameTimes = [];
const targetHistory = [];
let ready = false, paused = false, visible = true, failed = false;
let reducedMotion = reducedQuery.matches;
let renderer, scene, camera, objects = [], raf = 0, lastFrame = 0, frameCount = 0;
let activeTime = 0, relaxAt = Infinity, blinkStart = -10, nextBlink = 3.4;
let pointerId = null, lastDiagnostics = 0;
const clamp = (v, low, high) => Math.max(low, Math.min(high, v));

Object.defineProperty(window, 'grifonDebug', { value: Object.freeze({
  snapshot: () => Object.freeze({
    ready, renderer: renderer ? 'WebGL2 / Three.js' : null, failed, pause: paused,
    reducedMotion, visible, frameCount, activeTime,
    controls: Object.freeze({ ...pose }), target: Object.freeze({ ...target }),
    rollingFrameTimes: Object.freeze([...frameTimes]),
    viewport: Object.freeze({ width: stage.clientWidth, height: stage.clientHeight, pixelRatio: renderer?.getPixelRatio() ?? 0 }),
  }),
}), writable: false, configurable: false });

const vertexShader = `
  attribute vec2 weight;
  varying vec2 vUv;
  uniform vec2 gaze;
  uniform vec2 head;
  uniform float blink;
  uniform float breath;
  uniform float kind;
  uniform vec3 eyeCenter;
  uniform float eyeBaseZ;
  vec3 rotateX(vec3 p, float a) { float c=cos(a), s=sin(a); return vec3(p.x,c*p.y-s*p.z,s*p.y+c*p.z); }
  vec3 rotateZ(vec3 p, float a) { float c=cos(a), s=sin(a); return vec3(c*p.x-s*p.y,s*p.x+c*p.y,p.z); }
  void main() {
    vUv = uv;
    vec3 original = position;
    vec3 p = position;
    if (kind > 0.5) {
      vec3 local = rotateZ(p-eyeCenter, -eyeBaseZ);
      if (kind < 1.5) {
        local.y *= 1.0 - .90*blink*blink;
        local.z *= max(.03, 1.0-.97*blink);
      } else {
        local *= clamp((blink-.65)/.35,0.0,1.0);
      }
      p = eyeCenter + rotateZ(rotateX(local, gaze.y*.09), eyeBaseZ+gaze.x*.12);
      p += vec3(gaze.x*.010, kind < 1.5 ? .040*pow(blink,4.0) : 0.0, gaze.y*.008);
    }
    vec3 pivot = vec3(0.0,0.0,1.32);
    p = pivot + rotateZ(rotateX(p-pivot,head.y*weight.x),head.x*weight.x);
    p += vec3(original.x*.012, original.y*.022, .004)*weight.y*breath;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
  }
`;
const fragmentShader = `
  uniform sampler2D baked;
  uniform float opacity;
  uniform float kind;
  uniform vec3 creaseColor;
  varying vec2 vUv;
  void main() {
    vec4 texel = texture2D(baked, vUv);
    gl_FragColor = vec4(kind > 1.5 ? creaseColor : texel.rgb, opacity);
    #include <colorspace_fragment>
  }
`;

function syncButtons() {
  document.querySelectorAll('[data-look], #blink, #reset').forEach(button => { button.disabled = !ready || paused || failed; });
  pauseButton.disabled = !ready || failed;
  pauseButton.textContent = paused ? 'Resume' : 'Pause';
  pauseButton.setAttribute('aria-pressed', String(paused));
  motionNote.textContent = reducedMotion
    ? 'Reduced motion is on. Idle motion is off; controls still work.'
    : 'Eyes lead. Head follows. A quiet breath in between.';
}

function setTarget(x, y, relax = false) {
  if (!ready || paused || failed) return;
  target.x = clamp(x, -1, 1); target.y = clamp(y, -1, 1);
  targetHistory.push({ time: activeTime, x: target.x, y: target.y });
  if (targetHistory.length > 200) targetHistory.shift();
  relaxAt = relax ? activeTime + 1.5 : Infinity;
}

function center() {
  setTarget(0, 0);
  pointerId = null;
}

function pointAt(event) {
  const bounds = stage.getBoundingClientRect();
  setTarget((event.clientX - bounds.left) / bounds.width * 2 - 1,
    1 - (event.clientY - bounds.top) / bounds.height * 2);
}

stage.addEventListener('pointerdown', event => {
  if (!ready || paused || failed) return;
  pointerId = event.pointerId;
  stage.setPointerCapture(event.pointerId);
  pointAt(event);
});
document.addEventListener('pointermove', event => {
  if (event.pointerType === 'mouse' || event.pointerId === pointerId) pointAt(event);
});
function releasePointer(event) {
  if (event.pointerId !== pointerId) return;
  pointerId = null; relaxAt = activeTime + 1.5;
}
stage.addEventListener('pointerup', releasePointer);
stage.addEventListener('pointercancel', releasePointer);
document.documentElement.addEventListener('pointerleave', () => { relaxAt = activeTime + 1.5; });
document.querySelectorAll('[data-look]').forEach(button => button.addEventListener('click', () => {
  const [x, y] = button.dataset.look.split(',').map(Number);
  setTarget(x, y, true);
}));
document.querySelector('#reset').addEventListener('click', center);
document.querySelector('#blink').addEventListener('click', () => { if (ready && !paused && !failed) blinkStart = activeTime; });
document.addEventListener('keydown', event => { if (event.key === 'Escape') center(); });
pauseButton.addEventListener('click', () => {
  paused = !paused; lastFrame = 0; syncButtons(); updateStatus();
});
retryButton.addEventListener('click', () => location.reload());
reducedQuery.addEventListener('change', event => {
  reducedMotion = event.matches;
  if (reducedMotion && !paused) { pose.breath = 0; pose.blink = 0; blinkStart = -10; }
  syncButtons(); updateStatus();
});
document.addEventListener('visibilitychange', () => { lastFrame = 0; });
new IntersectionObserver(entries => { visible = entries[0].isIntersecting; lastFrame = 0; }).observe(stage);

function updateStatus() {
  if (failed) return;
  status.textContent = paused ? 'Paused' : reducedMotion ? 'Ready · reduced motion' : 'Ready · follows your touch or cursor';
}

function showFailure(error) {
  if (failed) return;
  failed = true; ready = false;
  cancelAnimationFrame(raf);
  host.hidden = true; fallback.hidden = false; retryButton.hidden = false;
  status.textContent = 'Still preview · live rendering is unavailable. Try again to reconnect.';
  diagnosticOutput.textContent = `Live renderer unavailable: ${error.message || String(error)}`;
  syncButtons();
  console.error('Grifon companion:', error);
}

function renderFrame() {
  if (failed) return false;
  try {
    renderer.render(scene, camera);
    return !failed;
  } catch (error) {
    showFailure(error);
    return false;
  }
}

function animate(timestamp) {
  if (failed) return;
  raf = requestAnimationFrame(animate);
  if (!ready || failed || paused || document.hidden || !visible) { lastFrame = 0; return; }
  const dt = lastFrame ? Math.min((timestamp-lastFrame)/1000, .05) : 1/60;
  if (lastFrame) { frameTimes.push(timestamp-lastFrame); if (frameTimes.length > 180) frameTimes.shift(); }
  lastFrame = timestamp; activeTime += dt;
  if (activeTime > relaxAt) { setTarget(0, 0); relaxAt = Infinity; }
  let delayed = { x: 0, y: 0 };
  while (targetHistory.length > 1 && targetHistory[1].time <= activeTime-.08) targetHistory.shift();
  if (targetHistory.length && targetHistory[0].time <= activeTime-.08) delayed = targetHistory[0];
  const gazeEase = reducedMotion ? 1 : 1-Math.exp(-dt/.08);
  const headEase = reducedMotion ? 1 : 1-Math.exp(-dt/.3);
  pose.gazeX += (target.x-pose.gazeX)*gazeEase;
  pose.gazeY += (target.y-pose.gazeY)*gazeEase;
  pose.headYaw += ((reducedMotion ? target.x : delayed.x)*.13-pose.headYaw)*headEase;
  pose.headPitch += ((reducedMotion ? target.y : delayed.y)*-.045-pose.headPitch)*headEase;
  pose.breath = reducedMotion ? 0 : Math.sin(activeTime*Math.PI/3);
  if (!reducedMotion && activeTime >= nextBlink) {
    blinkStart = activeTime; nextBlink = activeTime + 3.5 + Math.random()*2;
  }
  const blinkAge = activeTime-blinkStart;
  // Hold fully closed for 40ms so the accepted closed pose survives frame sampling.
  pose.blink = blinkAge < 0 || blinkAge >= .24 ? 0
    : blinkAge < .10 ? Math.sin(Math.PI*.5*blinkAge/.10) ** 2
    : blinkAge < .14 ? 1 : Math.cos(Math.PI*.5*(blinkAge-.14)/.10) ** 2;
  for (const object of objects) {
    const u = object.material.uniforms;
    u.gaze.value.set(pose.gazeX, pose.gazeY);
    u.head.value.set(pose.headYaw, pose.headPitch);
    u.blink.value = pose.blink; u.breath.value = pose.breath;
    object.visible = object.userData.deform !== 'eye' || pose.blink <= .995;
  }
  if (!renderFrame()) return;
  frameCount++;
  if (timestamp-lastDiagnostics > 500) {
    lastDiagnostics = timestamp;
    const average = frameTimes.reduce((sum, value) => sum+value, 0) / (frameTimes.length || 1);
    diagnosticOutput.textContent = `${average ? (1000/average).toFixed(0) : '—'} fps · ${average.toFixed(1)} ms/frame\n${stage.clientWidth} × ${stage.clientHeight} · pixel ratio ${renderer.getPixelRatio().toFixed(2)}\n${objects.length} objects · ${renderer.info.render.triangles.toLocaleString()} triangles\nHead ${pose.headYaw.toFixed(3)} / ${pose.headPitch.toFixed(3)} · gaze ${pose.gazeX.toFixed(2)} / ${pose.gazeY.toFixed(2)}`;
  }
}

async function start() {
  try {
    const THREE = await import('./vendor/three.module.js');
    const [description, binary] = await Promise.all([
      fetch('./scene.json').then(response => { if (!response.ok) throw new Error('Scene description could not load.'); return response.json(); }),
      fetch('./scene.bin').then(response => { if (!response.ok) throw new Error('Scene geometry could not load.'); return response.arrayBuffer(); }),
    ]);
    const loader = new THREE.TextureLoader();
    const [skin, hero] = await Promise.all([loader.loadAsync('./baked-skin.png'), loader.loadAsync('./baked-hero.png')]);
    for (const texture of [skin, hero]) { texture.colorSpace = THREE.SRGBColorSpace; texture.generateMipmaps = true; }
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.debug.onShaderError = () => { throw new Error('The companion shader could not compile on this device.'); };
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.setClearColor(0x09090b, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.addEventListener('webglcontextlost', event => {
      event.preventDefault(); showFailure(new Error('Graphics context was interrupted.'));
    });
    host.append(renderer.domElement);
    scene = new THREE.Scene();
    const half = description.camera.ortho / 2;
    camera = new THREE.OrthographicCamera(-half, half, half, -half, .01, 100);
    camera.position.fromArray(description.camera.position);
    camera.up.fromArray(description.camera.up);
    camera.lookAt(...description.camera.target);
    for (const item of description.objects) {
      const geometry = new THREE.BufferGeometry();
      for (const [name, spec] of Object.entries(item.attributes)) {
        geometry.setAttribute(name, new THREE.BufferAttribute(new Float32Array(binary, spec.offset, spec.count), spec.itemSize));
      }
      if (item.index) geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(binary, item.index.offset, item.index.count), 1));
      geometry.computeBoundingSphere();
      const isHair = item.kind === 'hair';
      const material = new THREE.ShaderMaterial({
        vertexShader, fragmentShader, transparent: isHair, depthWrite: !isHair,
        side: THREE.DoubleSide,
        uniforms: {
          baked: { value: item.texture === 'skin' ? skin : hero }, opacity: { value: isHair ? .42 : 1 },
          gaze: { value: new THREE.Vector2() }, head: { value: new THREE.Vector2() },
          blink: { value: 0 }, breath: { value: 0 },
          kind: { value: item.deform === 'eye' ? 1 : item.deform === 'crease' ? 2 : 0 },
          creaseColor: { value: new THREE.Color('#29251f') },
          eyeCenter: { value: new THREE.Vector3(...(item.eyeCenter || [0,0,0])) },
          eyeBaseZ: { value: item.eyeBaseZ || 0 },
        },
      });
      const object = isHair ? new THREE.LineSegments(geometry, material) : new THREE.Mesh(geometry, material);
      object.name = item.name; object.userData.deform = item.deform;
      object.frustumCulled = false;
      scene.add(object); objects.push(object);
    }
    const resize = () => {
      if (failed) return;
      const width = stage.clientWidth, height = stage.clientHeight;
      renderer.setSize(width, height, false);
      camera.left = -half*width/height; camera.right = half*width/height;
      camera.updateProjectionMatrix();
      if (ready) renderFrame();
    };
    new ResizeObserver(resize).observe(stage); resize();
    renderer.compile(scene, camera);
    if (!renderFrame()) return;
    ready = true; fallback.hidden = true;
    syncButtons(); updateStatus(); raf = requestAnimationFrame(animate);
  } catch (error) { showFailure(error); }
}

start();
