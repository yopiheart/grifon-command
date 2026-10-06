export const REACTION_STATES = Object.freeze(['idle', 'listening', 'reading', 'working', 'ready']);

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const smooth = value => { const t = clamp(value, 0, 1); return t*t*(3-2*t); };

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
  const scan = readingNow ? Math.sin(age*1.55)*.65 : -.35;
  const perk = reaction.state === 'ready' && animated ? Math.exp(-age*1.8)*Math.sin(age*6) : 0;
  const readyBlink = reaction.state === 'ready' && animated
    ? smooth((age-.34)/.12)*(1-smooth((age-.64)/.14)) : 0;
  return {
    cursorScale: idle + listening + reading*.2 + working*.15 + ready*.5,
    gazeX: reading*scan,
    gazeY: listening*.2 - reading*.6 - working*.7 + ready*.12,
    headPitch: -listening*.018 + reading*.07 + working*.055 - ready*(.025+perk*.018),
    headYaw: reading*scan*.035,
    headRoll: listening*.085,
    breathGain: idle + listening*.8 + reading*.55 + working*.35 + ready*.7,
    leftWing: [listening*-.6 + working*(-1.15+leftTap*.145) + ready*-.3,
      listening*2.5 + ready*.85, listening*.3 + working*.48 + ready*.1],
    rightWing: [working*(-1.15+rightTap*.145) + ready*-.3,
      ready*-.85, -working*.48 - ready*.1],
    leftTap: leftTap*working, rightTap: rightTap*working,
    readingPanel: reading, workingPanel: working,
    cleanBody: clamp(listening+working+ready, 0, 1),
    readyBlink: readyBlink*ready,
    focusBlink: reducedMotion ? (reading*.12+working*.18) : 0,
  };
}

export function createReactionProps(THREE, scene) {
  const gold = new THREE.MeshBasicMaterial({ color: '#ffcc00', toneMapped: false });
  const charcoal = new THREE.MeshBasicMaterial({ color: '#18181b', toneMapped: false });
  const muted = new THREE.MeshBasicMaterial({ color: '#d4d4d8', toneMapped: false });
  const keyMaterial = new THREE.MeshBasicMaterial({ color: '#332e1b', toneMapped: false });
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
  const reading = new THREE.Group();
  reading.name = 'Reading page'; reading.position.set(0,-.91,.99); reading.rotation.x=1.12;
  reading.add(rounded(.83,.53,.055,.022,gold));
  const page = rounded(.80,.50,.045,.023,charcoal); page.position.z=.007; reading.add(page);
  for (let i=0;i<5;i++) {
    const line = rounded(i===0 ? .24 : .58-i*.035,.016,.008,.003,i===0 ? gold : muted);
    line.position.set(i===0 ? -.15 : -.03,.16-i*.068,.033); reading.add(line);
  }
  const underline = rounded(.21,.018,.009,.004,gold);
  underline.position.set(-.2,-.1,.041); reading.add(underline);
  scene.add(working,reading);
  working.visible = false; reading.visible = false;
  return {
    update(pose) {
      working.visible = pose.workingPanel > .005;
      reading.visible = pose.readingPanel > .005;
      working.scale.setScalar(Math.max(.001,pose.workingPanel));
      reading.scale.setScalar(Math.max(.001,pose.readingPanel));
      keys.forEach((key,i) => {
        const tap = i === 0 ? pose.leftTap : pose.rightTap;
        key.position.z = .044-tap*.018;
        key.material.color.set(tap > .6 ? '#ffcc00' : '#332e1b');
      });
      underline.position.x = pose.gazeX*.2;
    },
  };
}
