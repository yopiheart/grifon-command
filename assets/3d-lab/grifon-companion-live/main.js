import { REACTION_STATES, createReactionController, reactionPose, createReactionProps } from './reactions.js';

const stage = document.querySelector('#stage');
const host = document.querySelector('#canvas-host');
const fallback = document.querySelector('#fallback');
const status = document.querySelector('#status');
const pauseButton = document.querySelector('#pause');
const retryButton = document.querySelector('#retry');
const motionNote = document.querySelector('#motion-note');
const diagnosticOutput = document.querySelector('#diagnostics');
const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const tourButton = document.querySelector('#preview-all');
const reactionController = createReactionController();
let reaction = reactionController.snapshot();
let reactionMotion = reactionPose(reaction, reducedQuery.matches);
let reactionProps, touring = false, tourStart = 0, tourIndex = 0;
const pose = { gazeX: 0, gazeY: 0, headYaw: 0, headPitch: 0, headRoll: 0, blink: 0, breath: 0 };
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
    reaction: Object.freeze({
      state: reaction.state, stateAge: reaction.age, blend: reaction.blend,
      weights: Object.freeze([...reaction.weights]),
      wingLeft: Object.freeze([...reactionMotion.leftWing]), wingRight: Object.freeze([...reactionMotion.rightWing]),
      tapLeft: reactionMotion.leftTap, tapRight: reactionMotion.rightTap,
      propReading: reactionMotion.readingPanel, propWorking: reactionMotion.workingPanel,
      cleanBody: reactionMotion.cleanBody, cursorScale: reactionMotion.cursorScale,
      readyBlink: reactionMotion.readyBlink, touring,
    }),
    rollingFrameTimes: Object.freeze([...frameTimes]),
    viewport: Object.freeze({ width: stage.clientWidth, height: stage.clientHeight, pixelRatio: renderer?.getPixelRatio() ?? 0 }),
  }),
}), writable: false, configurable: false });

Object.defineProperty(window, 'grifonCompanion', { value: Object.freeze({
  setState: state => selectState(state),
}), writable: false, configurable: false });

const vertexShader = `
  attribute vec2 weight;
  varying vec2 vUv;
  uniform vec2 gaze;
  uniform vec2 head;
  uniform float headRoll;
  uniform vec3 wingAngles;
  uniform float wingSide;
  uniform float blink;
  uniform float breath;
  uniform float kind;
  uniform vec3 eyeCenter;
  uniform float eyeBaseZ;
  vec3 rotateX(vec3 p, float a) { float c=cos(a), s=sin(a); return vec3(p.x,c*p.y-s*p.z,s*p.y+c*p.z); }
  vec3 rotateY(vec3 p, float a) { float c=cos(a), s=sin(a); return vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z); }
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
    p = pivot + rotateZ(rotateY(rotateX(p-pivot,head.y*weight.x),headRoll*weight.x),head.x*weight.x);
    p += vec3(original.x*.012, original.y*.022, .004)*weight.y*breath;
    if (abs(wingSide) > .5) {
      vec3 wingPivot = vec3(wingSide*.88,-.10,1.16);
      p = wingPivot + rotateZ(rotateY(rotateX(p-wingPivot,wingAngles.x),wingAngles.y),wingAngles.z);
    }
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
  }
`;
const fragmentShader = `
  uniform sampler2D baked;
  uniform sampler2D cleanBody;
  uniform float cleanBlend;
  uniform float opacity;
  uniform float kind;
  uniform vec3 creaseColor;
  varying vec2 vUv;
  void main() {
    vec4 texel = mix(texture2D(baked, vUv),texture2D(cleanBody,vUv),cleanBlend);
    gl_FragColor = vec4(kind > 1.5 ? creaseColor : texel.rgb, opacity);
    #include <colorspace_fragment>
  }
`;

function syncButtons() {
  document.querySelectorAll('[data-look], [data-state], #blink, #reset').forEach(button => { button.disabled = !ready || paused || failed; });
  document.querySelectorAll('[data-state]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.state === reaction.state)));
  tourButton.disabled = !ready || paused || failed || reducedMotion;
  tourButton.textContent = touring ? 'Stop preview' : 'Preview all';
  tourButton.setAttribute('aria-pressed', String(touring));
  pauseButton.disabled = !ready || failed;
  pauseButton.textContent = paused ? 'Resume' : 'Pause';
  pauseButton.setAttribute('aria-pressed', String(paused));
  motionNote.textContent = reducedMotion
    ? 'Reduced motion is on. Static reactions; automatic previews are off.'
    : 'Reaction previews only. No microphone or agent tasks are running.';
}

function selectState(next, fromTour = false) {
  if (!REACTION_STATES.includes(next)) throw new TypeError(`Unknown companion state: ${String(next)}`);
  if (!ready || paused || failed) return false;
  if (!fromTour) touring = false;
  const changed = reactionController.setState(next, reducedMotion);
  reaction = reactionController.snapshot();
  // Natural blinking keeps its own clock across reaction changes.
  target.x = 0; target.y = 0; targetHistory.length = 0; relaxAt = Infinity;
  syncButtons(); updateStatus();
  return changed;
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
document.querySelectorAll('[data-state]').forEach(button => button.addEventListener('click', () => selectState(button.dataset.state)));
tourButton.addEventListener('click', () => {
  if (!ready || paused || failed || reducedMotion) return;
  if (touring) { touring = false; selectState('idle'); return; }
  selectState('idle'); touring = true; tourStart = activeTime; tourIndex = 0;
  syncButtons(); updateStatus();
});
document.addEventListener('keydown', event => { if (event.key === 'Escape') center(); });
pauseButton.addEventListener('click', () => {
  paused = !paused; lastFrame = 0; syncButtons(); updateStatus();
});
retryButton.addEventListener('click', () => location.reload());
reducedQuery.addEventListener('change', event => {
  reducedMotion = event.matches;
  if (reducedMotion) touring = false;
  if (reducedMotion && !paused) { pose.breath = 0; pose.blink = 0; blinkStart = -10; }
  syncButtons(); updateStatus();
});
document.addEventListener('visibilitychange', () => { lastFrame = 0; });
new IntersectionObserver(entries => { visible = entries[0].isIntersecting; lastFrame = 0; }).observe(stage);

function updateStatus() {
  if (failed) return;
  const labels = { idle: 'Idle preview', listening: 'Listening preview · microphone off', reading: 'Reading preview · attentive gaze', working: 'Working preview · no task running', ready: 'Ready preview' };
  status.textContent = `${paused ? 'Paused · ' : touring ? 'Preview all · ' : ''}${labels[reaction.state]}${reducedMotion ? ' · reduced motion' : ''}`;
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
  if (touring) {
    const index = Math.floor((activeTime-tourStart)/3);
    if (index !== tourIndex) {
      tourIndex = index;
      selectState(REACTION_STATES[index] || 'idle', true);
      if (index >= REACTION_STATES.length) { touring = false; syncButtons(); updateStatus(); }
    }
  }
  reaction = reactionController.tick(dt, reducedMotion);
  reactionMotion = reactionPose(reaction, reducedMotion);
  if (activeTime > relaxAt) { setTarget(0, 0); relaxAt = Infinity; }
  let delayed = { x: 0, y: 0 };
  while (targetHistory.length > 1 && targetHistory[1].time <= activeTime-.08) targetHistory.shift();
  if (targetHistory.length && targetHistory[0].time <= activeTime-.08) delayed = targetHistory[0];
  const gazeEase = reducedMotion ? 1 : 1-Math.exp(-dt/.08);
  const headEase = reducedMotion ? 1 : 1-Math.exp(-dt/.3);
  pose.gazeX += (clamp(target.x*reactionMotion.cursorScale+reactionMotion.gazeX,-1,1)-pose.gazeX)*gazeEase;
  pose.gazeY += (clamp(target.y*reactionMotion.cursorScale+reactionMotion.gazeY,-1,1)-pose.gazeY)*gazeEase;
  pose.headYaw += (clamp((reducedMotion ? target.x : delayed.x)*.13*reactionMotion.cursorScale+reactionMotion.headYaw,-.13,.13)-pose.headYaw)*headEase;
  pose.headPitch += (clamp((reducedMotion ? target.y : delayed.y)*-.045*reactionMotion.cursorScale+reactionMotion.headPitch,-.055,.08)-pose.headPitch)*headEase;
  pose.headRoll += (reactionMotion.headRoll-pose.headRoll)*headEase;
  pose.breath = reducedMotion ? 0 : Math.sin(activeTime*Math.PI/3)*reactionMotion.breathGain;
  if (!reducedMotion && activeTime >= nextBlink) {
    blinkStart = activeTime; nextBlink = activeTime + 3.5 + Math.random()*2;
  }
  const blinkAge = activeTime-blinkStart;
  // Hold fully closed for 40ms so the accepted closed pose survives frame sampling.
  pose.blink = blinkAge < 0 || blinkAge >= .24 ? 0
    : blinkAge < .10 ? Math.sin(Math.PI*.5*blinkAge/.10) ** 2
    : blinkAge < .14 ? 1 : Math.cos(Math.PI*.5*(blinkAge-.14)/.10) ** 2;
  pose.blink = Math.max(pose.blink,reactionMotion.readyBlink,reactionMotion.focusBlink);
  for (const object of objects) {
    const u = object.material.uniforms;
    u.gaze.value.set(pose.gazeX, pose.gazeY);
    u.head.value.set(pose.headYaw, pose.headPitch);
    u.headRoll.value = pose.headRoll;
    u.wingAngles.value.fromArray(object.userData.wingSide < 0 ? reactionMotion.leftWing : reactionMotion.rightWing);
    u.cleanBlend.value = object.userData.cleanBody ? reactionMotion.cleanBody : 0;
    u.blink.value = pose.blink; u.breath.value = pose.breath;
    object.visible = object.userData.deform !== 'eye' || pose.blink <= .995;
  }
  reactionProps.update(reactionMotion);
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
    const [skin, hero, cleanBody] = await Promise.all([loader.loadAsync('./baked-skin.png'), loader.loadAsync('./baked-hero.png'), loader.loadAsync('./baked-body-clean.png')]);
    for (const texture of [skin, hero, cleanBody]) { texture.colorSpace = THREE.SRGBColorSpace; texture.generateMipmaps = true; }
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
      const wingSide = /^(Left folded wing|Left gold inner wing|Folded wing fine feathers 0)$/.test(item.name) ? -1
        : /^(Right folded wing|Right gold inner wing|Folded wing fine feathers 1)$/.test(item.name) ? 1 : 0;
      const usesCleanBody = item.name === 'Continuous griffin silhouette' || item.name === 'Graphite short feather coat';
      const material = new THREE.ShaderMaterial({
        vertexShader, fragmentShader, transparent: isHair, depthWrite: !isHair,
        side: THREE.DoubleSide,
        uniforms: {
          baked: { value: item.texture === 'skin' ? skin : hero }, opacity: { value: isHair ? .42 : 1 },
          cleanBody: { value: cleanBody }, cleanBlend: { value: 0 },
          gaze: { value: new THREE.Vector2() }, head: { value: new THREE.Vector2() },
          headRoll: { value: 0 }, wingAngles: { value: new THREE.Vector3() }, wingSide: { value: wingSide },
          blink: { value: 0 }, breath: { value: 0 },
          kind: { value: item.deform === 'eye' ? 1 : item.deform === 'crease' ? 2 : 0 },
          creaseColor: { value: new THREE.Color('#29251f') },
          eyeCenter: { value: new THREE.Vector3(...(item.eyeCenter || [0,0,0])) },
          eyeBaseZ: { value: item.eyeBaseZ || 0 },
        },
      });
      const object = isHair ? new THREE.LineSegments(geometry, material) : new THREE.Mesh(geometry, material);
      object.name = item.name; object.userData.deform = item.deform;
      object.userData.wingSide = wingSide; object.userData.cleanBody = usesCleanBody;
      object.frustumCulled = false;
      scene.add(object); objects.push(object);
    }
    reactionProps = createReactionProps(THREE,scene);
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
