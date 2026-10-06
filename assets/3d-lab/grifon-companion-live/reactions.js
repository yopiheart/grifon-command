export const REACTION_STATES = Object.freeze(['idle', 'listening', 'reading', 'working', 'ready']);

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const smooth = value => { const t = clamp(value, 0, 1); return t*t*(3-2*t); };

// Three short lines with fixations, quick returns, then a brief glance toward the user.
const readingFixations = [
  [0,-.22,-.43], [.30,-.22,-.43], [.44,-.04,-.43], [.95,-.04,-.43],
  [1.09,.12,-.43], [1.60,.12,-.43], [1.73,.24,-.43], [2.18,.24,-.43],
  [2.32,-.22,-.53], [2.65,-.22,-.53], [2.80,-.04,-.53], [3.29,-.04,-.53],
  [3.43,.12,-.53], [3.94,.12,-.53], [4.07,.24,-.53], [4.50,.24,-.53],
  [4.64,-.22,-.63], [4.97,-.22,-.63], [5.12,-.04,-.63], [5.61,-.04,-.63],
  [5.75,.12,-.63], [6.26,.12,-.63], [6.39,.24,-.63], [7.18,.24,-.63],
  [7.54,0,-.04], [8.10,0,-.04], [8.45,-.22,-.43], [10.40,-.22,-.43],
];

function readingGaze(age, animated) {
  if (!animated) return { x: -.08, y: -.5, glance: 0 };
  const time = age%10.4;
  const end = readingFixations.findIndex(point => point[0] > time);
  const a = readingFixations[Math.max(0,end-1)], b = readingFixations[end];
  const mix = smooth((time-a[0])/(b[0]-a[0]));
  const x = a[1]+(b[1]-a[1])*mix, y = a[2]+(b[2]-a[2])*mix;
  return { x, y, glance: clamp((y+.43)/.39,0,1) };
}

const readingCard = { x: 0, y: -.74, z: .90, tilt: 1.35, surface: .025 };
const readingWingExtension = 1.10;
const wingTip = { x: .0109637, y: -.18967935, z: -.72759208*readingWingExtension };

function readingContact(side, row) {
  const c = Math.cos(readingCard.tilt), s = Math.sin(readingCard.tilt);
  const y = readingCard.y+c*row-s*readingCard.surface;
  const z = readingCard.z+s*row+c*readingCard.surface;
  const dy = y+.10, dz = z-1.16;
  const radiusSquared = wingTip.x**2+wingTip.y**2+wingTip.z**2;
  const dx = -side*Math.sqrt(Math.max(0,radiusSquared-dy*dy-dz*dz));
  const rx = Math.atan2(wingTip.y,wingTip.z)+Math.acos(clamp(dz/Math.hypot(wingTip.y,wingTip.z),-1,1));
  const rotatedY = Math.cos(rx)*wingTip.y-Math.sin(rx)*wingTip.z;
  let rz = Math.atan2(dy,dx)-Math.atan2(rotatedY,side*wingTip.x);
  if (rz > Math.PI) rz -= Math.PI*2;
  return { angles: [rx,0,rz], point: [side*.88+dx,y,z] };
}

function readingTrace(age, animated) {
  if (!animated) return .025;
  const t = age%10.4;
  if (t < .35) return .115;
  if (t < 1.65) return .115-.09*smooth((t-.35)/1.3);
  if (t < 2.3) return .025;
  if (t < 3.6) return .025-.09*smooth((t-2.3)/1.3);
  if (t < 4.3) return -.065;
  if (t < 4.7) return -.065+.18*smooth((t-4.3)/.4);
  if (t < 6.5) return .115-.18*smooth((t-4.7)/1.8);
  if (t < 8.45) return -.065;
  return -.065+.18*smooth((t-8.45)/1.95);
}

export function createReactionController() {
  let state = 'idle', age = 0, transitionAge = .4;
  let weights = [1, 0, 0, 0, 0], from = [...weights];
  return {
    setState(next, reducedMotion = false) {
      if (!REACTION_STATES.includes(next)) throw new TypeError(`Unknown companion state: ${String(next)}`);
      if (next === state) return false;
      state = next; age = 0; transitionAge = 0; from = [...weights];
      if (reducedMotion) { weights = REACTION_STATES.map(name => Number(name === state)); transitionAge = .4; }
      return true;
    },
    tick(dt, reducedMotion = false) {
      age += dt; transitionAge += dt;
      const blend = reducedMotion ? 1 : smooth(transitionAge/.4);
      weights = REACTION_STATES.map((name, i) => from[i] + (Number(name === state)-from[i])*blend);
      return this.snapshot();
    },
    snapshot() {
      return { state, age, blend: smooth(transitionAge/.4), weights: [...weights] };
    },
  };
}

export function reactionPose(reaction, reducedMotion) {
  const [idle, listening, reading, working, ready] = reaction.weights;
  const age = reaction.age;
  const animated = !reducedMotion;
  const workingNow = reaction.state === 'working' && animated;
  const readingNow = reaction.state === 'reading' && animated;
  const beat = age*2.4;
  const press = phase => {
    const t = ((beat+phase)%1+1)%1;
    return t < .38 ? Math.sin(Math.PI*t/.38) ** 2 : 0;
  };
  const leftTap = workingNow ? press(0) : 0;
  const rightTap = workingNow ? press(.5) : 0;
  const scan = readingGaze(age,readingNow);
  const traceRow = readingTrace(age,readingNow);
  const support = readingContact(-1,-.02), tracing = readingContact(1,traceRow);
  const perk = reaction.state === 'ready' && animated ? Math.exp(-age*1.8)*Math.sin(age*6) : 0;
  const readyBlink = reaction.state === 'ready' && animated
    ? smooth((age-.34)/.12)*(1-smooth((age-.64)/.14)) : 0;
  return {
    cursorScale: idle + listening + reading*.2 + working*.15 + ready*.5,
    gazeX: reading*scan.x,
    gazeY: listening*.2 + reading*(scan.y-.12*(1-scan.glance)) - working*.7 + ready*.12,
    headPitch: -listening*.018 + reading*(.145-scan.glance*.105) + working*.055 - ready*(.025+perk*.018),
    headYaw: reading*scan.x*.01,
    headRoll: listening*.085,
    breathGain: idle + listening*.8 + reading*.55 + working*.35 + ready*.7,
    leftWing: [listening*-.6 + reading*support.angles[0] + working*(-1.15+leftTap*.145) + ready*-.3,
      listening*2.5 + ready*.85, listening*.3 + reading*support.angles[2] + working*.48 + ready*.1],
    rightWing: [reading*tracing.angles[0] + working*(-1.15+rightTap*.145) + ready*-.3,
      ready*-.85, reading*tracing.angles[2] - working*.48 - ready*.1],
    leftTap: leftTap*working, rightTap: rightTap*working,
    readingPanel: reading, workingPanel: working,
    readingSupport: support.point, readingTrace: tracing.point, readingRow: traceRow,
    readingWingExtension: 1+reading*(readingWingExtension-1),
    cleanBody: clamp(listening+reading+working+ready, 0, 1),
    readyBlink: readyBlink*ready,
    focusBlink: reading*.18*(1-scan.glance) + (reducedMotion ? working*.18 : 0),
  };
}

export function createReactionProps(THREE, scene) {
  const gold = new THREE.MeshBasicMaterial({ color: '#ffcc00', toneMapped: false });
  const charcoal = new THREE.MeshBasicMaterial({ color: '#18181b', toneMapped: false });
  const keyMaterial = new THREE.MeshBasicMaterial({ color: '#332e1b', toneMapped: false });
  const messageMaterial = new THREE.MeshBasicMaterial({ color: '#d4d4d8', toneMapped: false });
  function rounded(width, height, radius, depth, material) {
    const x = -width/2, y = -height/2, s = new THREE.Shape();
    s.moveTo(x+radius,y); s.lineTo(x+width-radius,y);
    s.quadraticCurveTo(x+width,y,x+width,y+radius); s.lineTo(x+width,y+height-radius);
    s.quadraticCurveTo(x+width,y+height,x+width-radius,y+height); s.lineTo(x+radius,y+height);
    s.quadraticCurveTo(x,y+height,x,y+height-radius); s.lineTo(x,y+radius);
    s.quadraticCurveTo(x,y,x+radius,y);
    return new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 8 }), material);
  }
  const working = new THREE.Group();
  working.name = 'Working control pad'; working.position.set(0,-.78,.832); working.rotation.x=.8;
  working.add(rounded(1.62,.55,.09,.025,gold));
  const pad = rounded(1.58,.51,.075,.027,charcoal); pad.position.z=.008; working.add(pad);
  const keys = [-1,1].map(side => {
    const key = rounded(.30,.27,.045,.018,keyMaterial.clone());
    key.position.set(side*.565,.095,.044); working.add(key); return key;
  });
  const traces = new THREE.Group();
  for (let i=0;i<3;i++) {
    const line = rounded(.29-i*.035,.014,.007,.003,gold);
    line.position.set(-.05,-.08+i*.055,.037); traces.add(line);
  }
  const dot = new THREE.Mesh(new THREE.TorusGeometry(.068,.007,6,32),gold);
  dot.position.set(.20,.02,.045); traces.add(dot); working.add(traces);
  scene.add(working);
  working.visible = false;
  const reading = new THREE.Group();
  reading.name = 'Held message card';
  reading.position.set(readingCard.x,readingCard.y,readingCard.z); reading.rotation.x=readingCard.tilt;
  reading.add(rounded(1.14,.44,.045,.010,gold));
  const message = rounded(1.124,.424,.039,.010,charcoal); message.position.z=.008; reading.add(message);
  for (let i=0;i<4;i++) {
    const line = rounded(i===0 ? .31 : .61-i*.04,.017,.0085,.004,i===0 ? gold : messageMaterial);
    line.position.set(i===0 ? -.14 : -.015,.135-i*.080,.019); reading.add(line);
  }
  const readingMarker = rounded(.055,.023,.01,.004,gold);
  readingMarker.position.set(.34,.115,.021); reading.add(readingMarker);
  scene.add(reading); reading.visible=false;
  return {
    update(pose) {
      working.visible = pose.workingPanel > .005;
      working.scale.setScalar(Math.max(.001,pose.workingPanel));
      reading.visible=pose.readingPanel>.005;
      reading.scale.setScalar(Math.max(.001,pose.readingPanel));
      readingMarker.position.x=pose.readingTrace[0]-.035;
      readingMarker.position.y=pose.readingRow;
      keys.forEach((key,i) => {
        const tap = i === 0 ? pose.leftTap : pose.rightTap;
        key.position.z = .044-tap*.018;
        key.material.color.set(tap > .6 ? '#ffcc00' : '#332e1b');
      });
    },
  };
}
