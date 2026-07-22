import * as THREE from 'three';

export type ProceduralModelOptions = {
  castShadow?: boolean;
  receiveShadow?: boolean;
};

// deterministic seed noise (spec rule: no Math.random)
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ---------------------------------------------------------------- materials
function striationBump(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 128, 128);
  for (let x = 0; x < 128; x += 2) {
    const v = 108 + Math.round(40 * Math.sin(x * 1.7));
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, 0, 1, 128);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  return t;
}

function makeMaterials() {
  const feather = new THREE.MeshStandardMaterial({
    color: '#1b1b1e', roughness: 0.85, metalness: 0.05,
    bumpMap: striationBump(), bumpScale: 0.6,
  });
  const plate = new THREE.MeshPhysicalMaterial({
    color: '#141417', roughness: 0.5, metalness: 0.3, clearcoat: 0.25, clearcoatRoughness: 0.4,
  });
  const gold = new THREE.MeshPhysicalMaterial({
    color: '#d4a017', roughness: 0.22, metalness: 1.0, clearcoat: 0.4, clearcoatRoughness: 0.2,
  });
  const goldBright = new THREE.MeshPhysicalMaterial({
    color: '#ffcc33', roughness: 0.18, metalness: 1.0, clearcoat: 0.5, clearcoatRoughness: 0.15,
  });
  const eye = new THREE.MeshStandardMaterial({
    color: '#ffb300', emissive: '#ff9500', emissiveIntensity: 1.2, roughness: 0.3,
  });
  const pupil = new THREE.MeshStandardMaterial({ color: '#050505', roughness: 0.4 });
  return { feather, plate, gold, goldBright, eye, pupil };
}

// ---------------------------------------------------------------- bust profile
// radius of the bust core at height y (y in [-1.15, 0.62])
function bustRadius(y: number): number {
  const pts: [number, number][] = [
    [-1.15, 0.6], [-0.95, 0.58], [-0.7, 0.53], [-0.45, 0.47],
    [-0.2, 0.41], [0.05, 0.34], [0.3, 0.27], [0.5, 0.24], [0.62, 0.22],
  ];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const [y0, r0] = pts[i];
    const [y1, r1] = pts[i + 1];
    if (y >= y0 && y <= y1) {
      const t = (y - y0) / (y1 - y0);
      return r0 + (r1 - r0) * t;
    }
  }
  return y < -1.15 ? 0.6 : 0.22;
}

function bustCoreGeometry(): THREE.LatheGeometry {
  const profile: THREE.Vector2[] = [];
  for (let i = 0; i <= 40; i += 1) {
    const y = -1.15 + (1.77 * i) / 40;
    profile.push(new THREE.Vector2(bustRadius(y), y));
  }
  profile.push(new THREE.Vector2(0.0, 0.66)); // close top
  return new THREE.LatheGeometry(profile, 48);
}

// ---------------------------------------------------------------- feather leaf
// almond leaf, tip at -Y, anchored at +Y base, slightly cupped toward -Z
function leafGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.2, -0.1, 0.16, -0.5);
  shape.quadraticCurveTo(0.12, -0.82, 0, -1.0);
  shape.quadraticCurveTo(-0.12, -0.82, -0.16, -0.5);
  shape.quadraticCurveTo(-0.2, -0.1, 0, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.02, bevelSegments: 2, steps: 1, curveSegments: 8 });
  // cup: pull edges back, push center rib forward
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i), y = pos.getY(i);
    pos.setZ(i, pos.getZ(i) - Math.abs(x) * 0.3 - Math.abs(y) * 0.08);
  }
  geo.computeVertexNormals();
  return geo;
}

type FeatherSlot = { pos: THREE.Vector3; quat: THREE.Quaternion; scale: number; gold: boolean };

// wrap imbricated feather rows around the bust core between yTop and yBottom
function featherRows(yTop: number, yBottom: number, rows: number, baseCount: number, baseScale: number, seedN: number, goldRamp: boolean, clearFront = false): FeatherSlot[] {
  const rand = seeded(seedN);
  const slots: FeatherSlot[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (let r = 0; r < rows; r += 1) {
    const t = rows === 1 ? 0 : r / (rows - 1);
    const y = yTop + (yBottom - yTop) * t;
    const count = Math.round(baseCount + t * baseCount * 0.5);
    const scale = baseScale * (1 + t * 0.9);
    const radius = bustRadius(y - scale * 0.4) + 0.015;
    const offset = (r % 2) * (Math.PI / count); // half-step imbrication
    for (let i = 0; i < count; i += 1) {
      const theta = (i / count) * Math.PI * 2 + offset + (rand() - 0.5) * 0.04;
      // front-center panel stays smooth for the filigree (theta 0 faces +Z... front is +Z)
      const frontAngle = Math.atan2(Math.cos(theta), Math.sin(theta)); // angle from +Z around Y
      if (clearFront && Math.abs(frontAngle) < 0.55 && y < -0.02) continue;
      const out = new THREE.Vector3(Math.cos(theta), 0, Math.sin(theta));
      const pos = out.clone().multiplyScalar(radius).setY(y);
      // explicit basis: leaf face (+Z local) outward, tip (-Y local) down
      const zAxis = out.clone();
      const yAxis = up.clone().sub(zAxis.clone().multiplyScalar(up.dot(zAxis))).normalize();
      const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis);
      const quat = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis));
      // follow the cone slope so hanging tips stay on the surface, plus slight flare
      const slope = Math.atan2(bustRadius(y - scale) - bustRadius(y), scale);
      const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -slope - 0.12 + (rand() - 0.5) * 0.08);
      quat.multiply(tilt);
      const gold = goldRamp ? rand() < 0.05 + t * 0.16 : rand() < 0.05;
      slots.push({ pos, quat, scale: scale * (0.92 + rand() * 0.16), gold });
    }
  }
  return slots;
}

function instanceFeathers(slots: FeatherSlot[], leaf: THREE.BufferGeometry, mats: ReturnType<typeof makeMaterials>, shadows: boolean): THREE.Group {
  const g = new THREE.Group();
  g.name = 'featherSystem';
  const black = new THREE.InstancedMesh(leaf, mats.feather, slots.length);
  const goldSlots = slots.filter((s) => s.gold);
  const goldRim = new THREE.InstancedMesh(leaf, mats.gold, Math.max(goldSlots.length, 1));
  const m = new THREE.Matrix4();
  slots.forEach((s, i) => {
    m.compose(s.pos, s.quat, new THREE.Vector3(s.scale, s.scale, s.scale));
    black.setMatrixAt(i, m);
  });
  goldSlots.forEach((s, i) => {
    // gold leaf slightly larger, nudged behind -> reads as a gold rim around the black leaf
    const back = new THREE.Vector3(0, 0, -0.012).applyQuaternion(s.quat);
    m.compose(s.pos.clone().add(back), s.quat, new THREE.Vector3(s.scale * 1.1, s.scale * 1.08, s.scale));
    goldRim.setMatrixAt(i, m);
  });
  black.castShadow = shadows; black.receiveShadow = shadows;
  goldRim.castShadow = shadows;
  g.add(goldRim, black);
  return g;
}

// ---------------------------------------------------------------- beak
function beakGeometry(): THREE.BufferGeometry {
  // side profile in ZY plane: cere -> forward ridge -> hooked tip -> jaw return
  const shape = new THREE.Shape();
  shape.moveTo(0.0, 0.13);
  shape.quadraticCurveTo(0.18, 0.12, 0.26, 0.03);
  shape.quadraticCurveTo(0.31, -0.04, 0.28, -0.15);  // hook down
  shape.quadraticCurveTo(0.24, -0.07, 0.16, -0.03);  // inner hook return
  shape.quadraticCurveTo(0.08, -0.01, 0.0, -0.03);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 5, curveSegments: 24 });
  geo.translate(0, 0, -0.08); // center the width
  geo.rotateY(-Math.PI / 2);  // extrusion (width) now on X, profile faces forward on +Z
  // pinch width toward tip + ridge line
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const tip = new THREE.Vector2(0.28, -0.15);
    const d = Math.min(1, new THREE.Vector2(z, y).distanceTo(tip) / 0.5);
    pos.setX(i, x * (0.38 + 0.62 * d));
  }
  geo.computeVertexNormals();
  return geo;
}

// ---------------------------------------------------------------- filigree
function filigreeGroup(mats: ReturnType<typeof makeMaterials>): THREE.Group {
  const g = new THREE.Group();
  g.name = 'filigree';
  const zAt = (x: number, y: number): number => {
    const r = bustRadius(y) + 0.045;
    const clamped = Math.min(Math.abs(x), r * 0.92);
    return Math.sqrt(Math.max(r * r - clamped * clamped, 0.001));
  };
  // flame-lick strokes as (x, y) control points, mirrored across x=0
  const strokes: [number, number][][] = [
    [[0.04, -0.74], [0.15, -0.54], [0.26, -0.4]],
    [[0.03, -0.6], [0.13, -0.42], [0.23, -0.3]],
    [[0.03, -0.46], [0.11, -0.3], [0.21, -0.2]],
    [[0.02, -0.32], [0.08, -0.2], [0.16, -0.13]],
  ];
  for (const sgn of [1, -1]) {
    for (const pts of strokes) {
      const curve = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(sgn * x, y, zAt(x, y))));
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.022, 8), mats.gold);
      tube.castShadow = true;
      g.add(tube);
      // tapered tip cone
      const end = curve.getPoint(1);
      const tan = curve.getTangent(1);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.1, 8), mats.gold);
      cone.position.copy(end);
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
      cone.translateY(0.04);
      g.add(cone);
    }
  }
  // center spear blade pointing down
  const spear = new THREE.Shape();
  spear.moveTo(0, 0.2);
  spear.lineTo(0.07, 0.0);
  spear.lineTo(0.022, -0.07);
  spear.lineTo(0, -0.55);
  spear.lineTo(-0.022, -0.07);
  spear.lineTo(-0.07, 0.0);
  spear.closePath();
  const spearMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(spear, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2 }),
    mats.goldBright,
  );
  spearMesh.position.set(0, -0.38, zAt(0, -0.55) + 0.03);
  spearMesh.name = 'center-spear';
  spearMesh.castShadow = true;
  g.add(spearMesh);
  return g;
}

// ---------------------------------------------------------------- factory
export function createGrifonGriffinEmblemModel(options: ProceduralModelOptions = {}): THREE.Group {
  const shadows = options.castShadow ?? true;
  const mats = makeMaterials();
  const leaf = leafGeometry();
  const root = new THREE.Group();
  root.name = 'Grifon Griffin Emblem';
  const nodes: Record<string, THREE.Object3D> = { root };
  const meshes: Record<string, THREE.Mesh> = {};

  // --- chest/neck core (dark plate under the feathers)
  const core = new THREE.Mesh(bustCoreGeometry(), mats.plate);
  core.name = 'bustCore';
  core.castShadow = shadows; core.receiveShadow = shadows;
  root.add(core);
  meshes.bustCore = core;

  // --- neck + chest feather coat (imbricated rows, gold rims ramp toward collar)
  const neckCoat = instanceFeathers(featherRows(0.52, -0.62, 12, 18, 0.125, 1101, true, true), leaf, mats, shadows);
  neckCoat.name = 'neckFeatherRows';
  root.add(neckCoat);

  // --- lower skirt: large dark plates sweeping the base (shoulder read)
  const skirtSlots: FeatherSlot[] = [];
  const skirt = new THREE.Group();
  skirt.name = 'baseSkirt';
  {
    const m = new THREE.Matrix4();
    const inst = new THREE.InstancedMesh(leaf, mats.plate, skirtSlots.length);
    skirtSlots.forEach((s, i) => {
      m.compose(s.pos, s.quat, new THREE.Vector3(s.scale, s.scale, s.scale));
      inst.setMatrixAt(i, m);
    });
    inst.castShadow = shadows; inst.receiveShadow = shadows;
    skirt.add(inst);
  }
  root.add(skirt);

  // --- shoulder plates: 3 big swept blades per side
  const shoulders = new THREE.Group();
  shoulders.name = 'shoulderPlates';
  for (const sgn of [1, -1]) {
    for (let i = 0; i < 3; i += 1) {
      const blade = new THREE.Mesh(leaf, mats.plate);
      const s = 1.15 - i * 0.18;
      blade.scale.set(s * 0.9, s, s);
      blade.position.set(sgn * (0.4 + i * 0.1), -0.68 - i * 0.08, -0.02 + i * 0.03);
      blade.rotation.set(0.35, sgn * (0.8 + i * 0.22), sgn * -0.35);
      blade.castShadow = shadows;
      shoulders.add(blade);
    }
  }
  root.add(shoulders);

  // --- head group
  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 0.66, 0.02);
  root.add(head);
  nodes.head = head;

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.26, 40, 28), mats.feather);
  skull.name = 'skull';
  skull.scale.set(1, 1.05, 0.95);
  skull.castShadow = shadows;
  head.add(skull);
  meshes.skull = skull;

  // head feather cap (small feathers over the skull)
  const capSlots: FeatherSlot[] = [];
  const capRand = seeded(3303);
  for (let ring = 0; ring < 5; ring += 1) {
    const phi = 0.3 + ring * 0.3; // from crown downward
    const y = Math.cos(phi) * 0.27;
    const rr = Math.sin(phi) * 0.27;
    const count = 8 + ring * 3;
    for (let i = 0; i < count; i += 1) {
      const theta = (i / count) * Math.PI * 2 + ring * 0.2;
      const out = new THREE.Vector3(Math.cos(theta) * Math.sin(phi), Math.cos(phi), Math.sin(theta) * Math.sin(phi));
      const pos = new THREE.Vector3(Math.cos(theta) * rr, y + 0.05, Math.sin(theta) * rr);
      const quat = new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().lookAt(pos, pos.clone().add(out), new THREE.Vector3(0, 1, 0)),
      );
      quat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.35));
      capSlots.push({ pos, quat, scale: 0.1 + capRand() * 0.02, gold: capRand() < 0.05 });
    }
  }
  const cap = instanceFeathers(capSlots, leaf, mats, shadows);
  cap.name = 'headFeatherCap';
  head.add(cap);

  // --- beak
  const beak = new THREE.Mesh(beakGeometry(), mats.gold);
  beak.name = 'beak';
  beak.position.set(0, -0.03, 0.2);
  beak.scale.setScalar(1.1);
  beak.castShadow = shadows;
  head.add(beak);
  meshes.beak = beak;

  // --- eyes + brows
  for (const sgn of [1, -1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 24, 16), mats.eye);
    eye.name = sgn > 0 ? 'eyeR' : 'eyeL';
    eye.position.set(sgn * 0.125, 0.07, 0.19);
    head.add(eye);
    meshes[eye.name] = eye;
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), mats.pupil);
    pupil.position.set(sgn * 0.133, 0.07, 0.242);
    head.add(pupil);
    const brow = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 12), mats.feather);
    brow.name = sgn > 0 ? 'browR' : 'browL';
    brow.scale.set(1.5, 0.34, 0.55);
    brow.position.set(sgn * 0.128, 0.128, 0.18);
    brow.rotation.z = sgn * -0.32; // angled down toward beak = fierce
    brow.rotation.y = sgn * 0.2;
    brow.castShadow = shadows;
    head.add(brow);
  }

  // --- ear tufts: fanned blades per side, gold edge on the lead blade
  for (const sgn of [1, -1]) {
    const tuft = new THREE.Group();
    tuft.name = sgn > 0 ? 'earTuftR' : 'earTuftL';
    for (let i = 0; i < 4; i += 1) {
      const blade = new THREE.Mesh(leaf, mats.feather);
      const s = 0.44 - i * 0.06;
      blade.scale.set(s * 0.6, s, s);
      blade.position.set(sgn * i * 0.035, i * 0.02, -0.02 - i * 0.03);
      blade.rotation.set(0.15 + i * 0.08, 0, Math.PI + sgn * (0.85 + i * 0.2)); // tip UP, swept outward
      blade.castShadow = shadows;
      tuft.add(blade);
      if (i === 0) {
        const goldEdge = new THREE.Mesh(leaf, mats.gold);
        goldEdge.scale.set(s * 0.5, s * 1.03, s * 0.9);
        goldEdge.position.copy(blade.position).add(new THREE.Vector3(0, -0.005, 0.012));
        goldEdge.rotation.copy(blade.rotation);
        tuft.add(goldEdge);
      }
    }
    tuft.position.set(sgn * 0.24, 0.19, -0.03);
    tuft.rotation.z = sgn * -0.15;
    head.add(tuft);
    nodes[tuft.name] = tuft;
  }

  // --- crest spikes between the tufts
  const crest = new THREE.Group();
  crest.name = 'crestSpikes';
  for (let i = 0; i < 7; i += 1) {
    const t = i / 6;
    const x = (t - 0.5) * 0.24;
    const h = 0.16 - Math.abs(t - 0.5) * 0.12;
    const spike = new THREE.Mesh(leaf, mats.feather);
    spike.scale.set(0.06, h, 0.08);
    spike.position.set(x, 0.26, 0.02);
    spike.rotation.set(-0.25, 0, Math.PI + (t - 0.5) * 0.5); // tips up, slight fan
    spike.castShadow = shadows;
    crest.add(spike);
  }
  head.add(crest);
  nodes.crestSpikes = crest;

  // --- gold collar chevrons at the neck/chest boundary
  const collar = new THREE.Group();
  collar.name = 'collarTrims';
  for (const sgn of [1, -1]) {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.026, 8, 40, Math.PI * 0.62), mats.gold);
    arc.position.set(0, -0.12, 0.36);
    arc.rotation.set(0.62, sgn * 0.5, sgn * (Math.PI * 0.74));
    arc.castShadow = shadows;
    collar.add(arc);
  }
  root.add(collar);
  nodes.collarTrims = collar;

  // --- chest filigree
  const filigree = filigreeGroup(mats);
  root.add(filigree);
  nodes.filigree = filigree;

  // --- action-ready runtime (display prop: pivots + sockets, no destruction)
  const crownSocket = new THREE.Object3D();
  crownSocket.name = 'socket-crown';
  crownSocket.position.set(0, 0.3, 0);
  head.add(crownSocket);
  const baseSocket = new THREE.Object3D();
  baseSocket.name = 'socket-base';
  baseSocket.position.set(0, -1.15, 0);
  root.add(baseSocket);
  root.userData.sculptRuntime = {
    nodes, meshes,
    sockets: { crown: crownSocket, base: baseSocket },
    colliders: { root: { type: 'capsule', radius: 0.95, height: 2.4, offset: [0, -0.2, 0] } },
    destructionGroups: {},
    animationAnchors: { turntable: 'root', eyeGlow: ['eyeR', 'eyeL'], entry: 'root' },
  };
  return root;
}

export function createGrifonGriffinEmblemLookDevLights(): THREE.Group {
  const g = new THREE.Group();
  g.add(new THREE.HemisphereLight(0xf2f4ff, 0x363b42, 0.8));
  const key = new THREE.DirectionalLight(0xfff4e8, 2.2);
  key.position.set(-4, 6, 5.5);
  g.add(key);
  return g;
}
