import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createGrifonGriffinEmblemModel } from './createGriffinModel';

const params = new URLSearchParams(location.search);
const view = params.get('view') ?? 'front';
const silhouette = params.get('silhouette') === '1';
const spin = params.get('spin') !== '0';

const VIEWS: Record<string, { position: [number, number, number]; lookAt: [number, number, number] }> = {
  front: { position: [0, 0.2, 4.1], lookAt: [0, 0.05, 0] },
  'three-quarter': { position: [2.6, 0.9, 2.9], lookAt: [0, 0.05, 0] },
  profile: { position: [4.0, 0.2, 0.15], lookAt: [0, 0.05, 0] },
  'low-hero': { position: [1.1, -0.7, 3.5], lookAt: [0, 0.15, 0] },
};

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.style.margin = '0';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#09090b'); // zinc-950 stage

const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 50);
const v = VIEWS[view] ?? VIEWS.front;
camera.position.set(...v.position);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(...v.lookAt);
controls.enableDamping = true;
controls.minDistance = 1.6;
controls.maxDistance = 7;
controls.update();

// spec lighting rig (lightingFromPhoto)
const key = new THREE.SpotLight('#fff2d9', 60, 0, Math.PI / 5, 0.55);
key.position.set(1.6, 2.6, 2.4);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.bias = -0.0002;
scene.add(key);
const keyTarget = new THREE.Object3D();
keyTarget.position.set(0, 0.4, 0);
scene.add(keyTarget);
key.target = keyTarget;

const fill = new THREE.DirectionalLight('#b8c4d9', 0.35);
fill.position.set(-2.0, 0.8, 2.0);
scene.add(fill);

const rimTarget = new THREE.Object3D();
rimTarget.position.set(0, 0.3, 0);
scene.add(rimTarget);
const rimR = new THREE.SpotLight('#ffb84d', 80, 0, Math.PI / 4, 0.4);
rimR.position.set(2.4, 1.2, -1.6);
rimR.target = rimTarget;
scene.add(rimR);
const rimL = new THREE.SpotLight('#ffb84d', 64, 0, Math.PI / 4, 0.4);
rimL.position.set(-2.4, 1.0, -1.4);
rimL.target = rimTarget;
scene.add(rimL);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;

// soft radial contact shadow on the invisible ground
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
contactShadow.position.y = -1.18;
scene.add(contactShadow);

const model = createGrifonGriffinEmblemModel({ castShadow: true, receiveShadow: true });
scene.add(model);

// entry animation: rise from below with ease-out (reduced-motion honored)
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const entryStart = performance.now();
const ENTRY_MS = 1400;
if (!reducedMotion) model.position.y = -2.4;

// eye glow pulse
const runtime = model.userData.sculptRuntime as { meshes: Record<string, THREE.Mesh> };
const eyeMats: THREE.MeshStandardMaterial[] = ['eyeR', 'eyeL']
  .map((id) => runtime.meshes[id]?.material as THREE.MeshStandardMaterial)
  .filter(Boolean);

if (silhouette) {
  // blockout review mode: flat clay, no materials
  const clay = new THREE.MeshStandardMaterial({ color: '#8f8f94', roughness: 0.9, metalness: 0 });
  model.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = clay;
  });
  scene.environmentIntensity = 0.8;
}

declare global {
  interface Window { setReviewView: (id: string) => void; sceneReady: boolean; }
}
window.setReviewView = (id: string) => {
  const rv = VIEWS[id];
  if (!rv) return;
  camera.position.set(...rv.position);
  controls.target.set(...rv.lookAt);
  controls.update();
};
window.sceneReady = false;

let dblToggle = spin;
addEventListener('dblclick', () => { dblToggle = !dblToggle; });

renderer.setAnimationLoop((now: number) => {
  if (!reducedMotion) {
    const t = Math.min((now - entryStart) / ENTRY_MS, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    model.position.y = -2.4 * (1 - ease);
    if (dblToggle && t >= 1) model.rotation.y += 0.0035;
    const pulse = 1.05 + Math.sin(now * 0.0018) * 0.45;
    for (const m of eyeMats) m.emissiveIntensity = pulse;
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
