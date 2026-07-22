import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

declare global {
  interface Window { GLB_B64: string; sceneReady: boolean; }
}

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.style.margin = '0';
document.getElementById('stage')!.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#09090b'); // zinc-950 stage

const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 50);
camera.position.set(0, 0.25, 4.1);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.minDistance = 1.4;
controls.maxDistance = 8;
controls.update();

// Grifon gold-rim lighting rig (from griffin-emblem spec)
const key = new THREE.SpotLight('#f4f1e8', 42, 0, Math.PI / 5, 0.55);
key.position.set(1.6, 2.6, 2.4);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.bias = -0.0002;
scene.add(key);
const keyTarget = new THREE.Object3D();
keyTarget.position.set(0, 0.3, 0);
scene.add(keyTarget);
key.target = keyTarget;

const fill = new THREE.DirectionalLight('#b8c4d9', 0.35);
fill.position.set(-2.0, 0.8, 2.0);
scene.add(fill);

const rimTarget = new THREE.Object3D();
rimTarget.position.set(0, 0.2, 0);
scene.add(rimTarget);
const rimR = new THREE.SpotLight('#ffb84d', 34, 0, Math.PI / 4, 0.4);
rimR.position.set(2.4, 1.2, -1.6);
rimR.target = rimTarget;
scene.add(rimR);
const rimL = new THREE.SpotLight('#ffb84d', 26, 0, Math.PI / 4, 0.4);
rimL.position.set(-2.4, 1.0, -1.4);
rimL.target = rimTarget;
scene.add(rimL);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.28;

// soft radial contact shadow
const shadowCanvas = document.createElement('canvas');
shadowCanvas.width = shadowCanvas.height = 256;
const sctx = shadowCanvas.getContext('2d')!;
const grad = sctx.createRadialGradient(128, 128, 20, 128, 128, 126);
grad.addColorStop(0, 'rgba(0,0,0,0.55)');
grad.addColorStop(1, 'rgba(0,0,0,0)');
sctx.fillStyle = grad;
sctx.fillRect(0, 0, 256, 256);
const contactShadow = new THREE.Mesh(
  new THREE.PlaneGeometry(2.6, 2.6),
  new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }),
);
contactShadow.rotation.x = -Math.PI / 2;
scene.add(contactShadow);

function b64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

const pivot = new THREE.Group();
scene.add(pivot);

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let entryStart = 0;
const ENTRY_MS = 1400;
let spinning = true;
addEventListener('dblclick', () => { spinning = !spinning; });
// pause auto-spin while the user is dragging, resume 3s after release
let lastDrag = 0;
controls.addEventListener('start', () => { lastDrag = Infinity; });
controls.addEventListener('end', () => { lastDrag = performance.now(); });

new GLTFLoader().parse(
  b64ToArrayBuffer(window.GLB_B64),
  '',
  (gltf) => {
    const model = gltf.scene;
    // normalize: center at origin, scale to ~2.2 units tall
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = 2.2 / Math.max(size.x, size.y, size.z);
    model.scale.setScalar(scale);
    model.position.copy(center).multiplyScalar(-scale);
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; }
    });
    pivot.add(model);
    const scaledBox = new THREE.Box3().setFromObject(pivot);
    contactShadow.position.y = scaledBox.min.y - 0.02;
    document.getElementById('loading')?.remove();
    entryStart = performance.now();
    if (!reducedMotion) pivot.position.y = -2.4;
  },
  (err) => {
    const el = document.getElementById('loading');
    if (el) el.textContent = '// GLB PARSE ERROR — ' + String((err as Error)?.message ?? err);
  },
);

renderer.setAnimationLoop((now: number) => {
  if (!reducedMotion && entryStart > 0) {
    const t = Math.min((now - entryStart) / ENTRY_MS, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    pivot.position.y = -2.4 * (1 - ease);
    const idle = now - lastDrag > 3000;
    if (spinning && idle && t >= 1) pivot.rotation.y += 0.004;
  }
  controls.update();
  renderer.render(scene, camera);
  window.sceneReady = true;
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
