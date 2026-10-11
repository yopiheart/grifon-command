/* Absolute native-frame composition. No animation clock, network assets or random text. */
(async () => {
  const config = await fetch('./orbital.json').then(reply => { if (!reply.ok) throw Error('Missing orbital config'); return reply.json(); });
  await Promise.all([document.fonts.load('900 100px Inter'), document.fonts.load('600 24px JetBrains')]);
  const logo = new Image(); logo.src = './assets/logo.png'; await logo.decode();
  const canvas = document.getElementById('film'), ctx = canvas.getContext('2d', { alpha: false });
  const W = 1920, H = 1080, gold = '#FFCC00', ink = '#09090B', white = '#FFFFFF', copy = config.copy;
  const clamp = x => Math.max(0, Math.min(1, x)), mix = (a, b, p) => a + (b - a) * p;
  const progress = (frame, start, end) => clamp((frame - start) / (end - start));
  const ease = p => 1 - Math.pow(1 - clamp(p), 3), smooth = p => { p = clamp(p); return p * p * (3 - 2 * p); };
  const TAU = Math.PI * 2;

  const globeCanvas = document.createElement('canvas'); globeCanvas.width = globeCanvas.height = 1024;
  const gl = globeCanvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false, preserveDrawingBuffer: true });
  if (!gl) throw Error('Orbital treatment requires the installed WebGL browser runtime');
  const shader = (type, source) => { const item = gl.createShader(type); gl.shaderSource(item, source); gl.compileShader(item); if (!gl.getShaderParameter(item, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(item)); return item; };
  const program = gl.createProgram();
  gl.attachShader(program, shader(gl.VERTEX_SHADER, 'attribute vec2 position;varying vec2 uv;void main(){uv=position;gl_Position=vec4(position,0.,1.);}'));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, `
    precision highp float;varying vec2 uv;uniform float turn;uniform float mono;
    float hash(vec3 p){p=fract(p*.3183099+vec3(.13,.71,.37));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
    float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
    float fbm(vec3 p){float v=0.,a=.55;for(int i=0;i<5;i++){v+=noise(p)*a;p=p*2.07+vec3(2.3,6.1,1.7);a*=.48;}return v;}
    void main(){float d=dot(uv,uv);if(d>1.){gl_FragColor=vec4(0.);return;}vec3 n=vec3(uv.x,uv.y,sqrt(1.-d));float c=cos(turn),s=sin(turn);vec3 p=vec3(c*n.x+s*n.z,n.y,-s*n.x+c*n.z);float terrain=fbm(p*5.5);float veins=1.-smoothstep(.018,.085,abs(fbm(p*9.)-.48));float detail=noise(p*210.);float ridges=fbm(p*34.);vec3 dark=vec3(.13,.10,.035),light=vec3(.95,.79,.36);vec3 color=mix(dark,light,smoothstep(.28,.67,terrain));color=mix(color,vec3(.98,.91,.67),veins*.38);color*=.67+ridges*.5+detail*.13;vec3 l=normalize(vec3(-.58,.7,1.));float shade=max(0.,dot(n,l));float relief=(noise(p*225.+vec3(.02))-detail)*.1;float rim=pow(1.-n.z,3.);color=color*(.13+.88*shade+relief)+vec3(.35,.24,.035)*rim*max(.1,n.y);float spec=pow(max(0.,dot(n,normalize(l+vec3(0,0,1)))),26.);color+=vec3(1.,.87,.49)*spec*.15;float gray=dot(color,vec3(.299,.587,.114));color=mix(color,vec3(gray),mono);float alpha=1.-smoothstep(.994,1.,d);gl_FragColor=vec4(color,alpha);}
  `));
  gl.linkProgram(program); if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program); const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const turnUniform = gl.getUniformLocation(program, 'turn'), monoUniform = gl.getUniformLocation(program, 'mono');
  gl.viewport(0, 0, 1024, 1024);
  function surface(turn = 0, mono = false) { gl.uniform1f(turnUniform, turn); gl.uniform1f(monoUniform, mono ? 1 : 0); gl.drawArrays(gl.TRIANGLES, 0, 6); gl.finish(); }
  function globe(x, y, radius, frame, mono = false, alpha = 1) {
    ctx.save(); ctx.globalAlpha *= alpha; surface(frame * .0018, mono); ctx.drawImage(globeCanvas, x - radius, y - radius, radius * 2, radius * 2); ctx.restore();
  }
  const points = Array.from({ length: 6100 }, (_, i) => { const y = 1 - (i + .5) / 6100 * 2, r = Math.sqrt(1 - y * y), a = i * 2.399963229728653; return [Math.cos(a) * r, y, Math.sin(a) * r, (i * 0.61803398875) % 1]; });
  function particles(x, y, radius, frame, mono = false, alpha = 1) {
    const a = frame * .002, c = Math.cos(a), s = Math.sin(a);
    ctx.save(); ctx.globalAlpha *= alpha;
    for (const [px, py, pz, seed] of points) {
      const xx = c * px + s * pz, zz = -s * px + c * pz;
      if (zz < -.08) continue;
      const shade = .4 + .6 * Math.max(0, zz), dot = (radius / 230) * (1.45 + seed * 1.8);
      ctx.fillStyle = mono || py < -.02 ? `rgba(255,255,255,${shade * .78})` : `rgba(255,${Math.round(155 + 70 * seed)},${Math.round(8 + 60 * seed)},${shade})`;
      ctx.fillRect(x + xx * radius, y - py * radius, dot, dot);
    }
    ctx.restore();
  }
  function line(x1, y1, x2, y2, alpha = .22, color = white, width = 1) { ctx.save(); ctx.strokeStyle = color; ctx.globalAlpha = alpha; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore(); }
  function ring(x, y, r, alpha = .3, color = white, width = 1) { ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.restore(); }
  function text(value, x, y, size, { color = white, alpha = 1, outline = false, align = 'center', italic = false, mono = false } = {}) {
    ctx.save(); ctx.globalAlpha *= alpha; ctx.font = `${italic ? 'italic ' : ''}${mono ? 600 : 900} ${size}px ${mono ? 'JetBrains' : 'Inter'}`;
    ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    if (outline) ctx.strokeText(value, x, y); else ctx.fillText(value, x, y); ctx.restore();
  }
  function maskText(value, x, y, size, amount, options = {}) {
    ctx.save(); ctx.beginPath(); ctx.rect(x - 870, y - size, 1740 * clamp(amount), size * 2); ctx.clip(); text(value, x, y, size, options); ctx.restore();
  }
  function guides(frame, strength = 1) {
    const length = 155 + 150 * smooth(progress(frame, 210, 275));
    for (const x of [352, 1568]) { line(x, 120, x, 356, strength * .2); line(x, 724, x, 960, strength * .2); }
    for (const y of [256, 824]) { line(176, y, 176 + length, y, strength * .24); line(1744 - length, y, 1744, y, strength * .24); }
    for (const [x, y] of [[352, 256], [1568, 256], [352, 824], [1568, 824]]) { line(x - 7, y, x + 7, y, strength * .45); line(x, y - 7, x, y + 7, strength * .45); }
  }
  function base(frame) {
    ctx.fillStyle = ink; ctx.fillRect(0, 0, W, H);
    const haze = ctx.createRadialGradient(970, 510, 50, 970, 510, 900); haze.addColorStop(0, '#151411'); haze.addColorStop(1, ink); ctx.fillStyle = haze; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#FFFFFF0A';
    for (let y = 35; y < H; y += 42) for (let x = 35; x < W; x += 42) if ((x * 13 + y * 7) % 5) ctx.fillRect(x, y, 1, 1);
  }
  function opening(frame) {
    if (frame < 75) {
      const p = frame / 75;
      for (let i = 0; i < 9; i++) {
        const x = 95 + (i % 3) * 650, y = 78 + Math.floor(i / 3) * 350, drift = Math.sin(frame * .035 + i) * (1 - p) * 100;
        ctx.save(); ctx.beginPath(); ctx.rect(x + drift, y, 110 + p * 200, 135 + p * 110); ctx.clip();
        text(i % 2 ? copy.idea : copy.one, x + 330 + drift, y + 140, 370, { outline: i % 3 === 0, color: i % 2 ? gold : white, alpha: .25 + p * .65 });
        ctx.fillStyle = ink; for (let j = 0; j < 25; j++) ctx.fillRect(x + j * 14, y, 6, 300); ctx.restore();
      }
    } else {
      const word = frame < 126 ? copy.one : frame < 162 ? copy.idea : copy.title;
      const start = frame < 126 ? 75 : frame < 162 ? 126 : 162, p = ease(progress(frame, start, start + 12));
      const size = frame < 162 ? 372 : 272, offset = mix(70, 0, p);
      line(0, 410, W, 410, .34); line(0, 670, W, 670, .34); line(212, 280, 212, 805, .24); line(1708, 280, 1708, 805, .24);
      text(word, 960, 541 + offset, size, { outline: frame >= 108 && frame < 126 || frame >= 148 && frame < 156, color: frame < 99 || frame >= 126 && frame < 140 ? gold : white });
      if (frame >= 162) { text(copy.one, 195, 540, 23, { mono: true }); text(copy.idea, 1725, 540, 23, { mono: true }); }
      if (frame >= 204) { const radius = mix(0, 1100, ease(progress(frame, 204, 210))); ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(960, 540, radius, 0, TAU); ctx.fill(); particles(960, 540, mix(35, 222, progress(frame, 204, 210)), frame); }
    }
  }
  function collage(frame) {
    const p = ease(progress(frame, 300, 316));
    surface(frame * .0018);
    for (const [index, x, y, width, height] of [[0, 402, 194, 260, 245], [1, 1250, 178, 250, 265], [2, 260, 673, 290, 270], [3, 1370, 692, 340, 220]]) {
      if (frame < 300 + index * 10) continue;
      ctx.save(); const shift = (1 - ease(progress(frame, 300 + index * 10, 314 + index * 10))) * 90;
      ctx.beginPath(); ctx.rect(x, y + shift, width, height); ctx.clip(); ctx.fillStyle = index % 2 ? '#191918' : '#C4B99B'; ctx.fillRect(x, y, width, height);
      ctx.drawImage(globeCanvas, x - width * .35, y - height * .4 + shift, width * 1.7, height * 1.8);
      for (let n = 0; n < 15; n++) line(x, y + n * 21, x + width, y + n * 21 + 50, .15, white);
      ctx.restore();
    }
    if (frame < 360) { ctx.fillStyle = ink; ctx.fillRect(640, 350, 640 * p, 380); globe(960, 540, 225, frame, frame < 330); }
    else if (frame < 390) globe(960, 540, 325 + 55 * ease(progress(frame, 360, 390)), frame);
    else globe(960, 700, mix(380, 1500, ease(progress(frame, 390, 434))), frame);
    text(copy.next, 960, 532, frame < 330 ? 100 : 112);
    text(copy.script, 728, 652, 19, { mono: true }); text(copy.storyboard, 960, 652, 19, { mono: true }); text(copy.video, 1190, 652, 19, { mono: true });
  }
  function world(frame) {
    guides(frame); text(copy.script, 178, 211, 18, { mono: true, align: 'left', alpha: .8 }); text(copy.storyboard, 1743, 211, 18, { mono: true, align: 'right', alpha: .8 }); text(copy.video, 178, 869, 18, { mono: true, align: 'left', alpha: .8 });
    if (frame < 300) { const radius = mix(215, 236, ease(progress(frame, 210, 255))); particles(960, 540, radius, frame); text(copy.next, 960, 540, 29); }
    else collage(frame);
  }
  function conveyor(frame) {
    const recede = 1 - .56 * ease(progress(frame, 540, 570)), radius = 230 * recede, spacing = 480 * recede;
    const travel = (frame - 434) * 1.7 * recede;
    for (let i = -4; i <= 4; i++) { const x = 960 + i * spacing - travel % spacing; particles(x, 540, radius, frame + i * 90, i % 2 === 0, .67); }
    line(0, 482, W, 482, .36); line(0, 608, W, 608, .36);
    maskText(copy.motion, 960, 545, 78, ease(progress(frame, 450, 474)), { alpha: 1 - progress(frame, 555, 570) });
  }
  function solidWorld(frame) {
    const arrival = ease(progress(frame, 570, 620)), x = mix(1320, 960, arrival), y = 540;
    const push = ease(progress(frame, 756, 780)), radius = mix(230, 1255, push);
    const cy = mix(y, 1640, push);
    line(0, 540, x - radius - 85, 540, .37); line(x + radius + 85, 540, W, 540, .37);
    if (frame < 756) { text(copy.journey, 960, 860, 28, { mono: true, alpha: ease(progress(frame, 598, 630)) }); text(copy.next, 190, 501, 17, { mono: true, align: 'left', alpha: arrival }); }
    globe(x, cy, radius, frame);
    if (frame >= 648 && frame < 742) {
      const scan = mix(x + radius, x, ease(progress(frame, 648, 690)));
      ctx.save(); ctx.beginPath(); ctx.rect(scan, cy - radius, radius * 2, radius * 2); ctx.clip(); ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(x, cy, radius, 0, TAU); ctx.fill(); particles(x, cy, radius, frame, true); ctx.restore();
      line(scan, cy - radius - 70, scan, cy + radius + 70, .65);
    }
    const ringAlpha = smooth(progress(frame, 630, 660)); ring(x, cy, radius + 32, ringAlpha * .42); ring(x, cy, radius + 49, ringAlpha * .12, gold);
    if (frame >= 742 && frame < 750) { ctx.save(); ctx.beginPath(); ctx.arc(x, cy, radius, 0, TAU); ctx.clip(); ctx.fillStyle = '#F7F5E9'; ctx.fillRect(x - radius, cy - radius, radius * 2, radius * 2); ctx.restore(); globe(x, cy, radius, frame, true, .63); }
    if (frame >= 750 && frame < 756) { ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(x, cy, radius, 0, TAU); ctx.fill(); particles(x, cy, radius, frame, true); }
  }
  function horizon(frame) {
    globe(960 - (frame - 780) * .7, 1640, 1255, frame);
    line(0, 326, 420, 326, .35); line(1500, 326, W, 326, .35);
    const index = frame < 840 ? 0 : frame < 900 ? 1 : 2, words = [copy.describe, copy.build, copy.launch], start = [780, 840, 900][index];
    const p = ease(progress(frame, start, start + 13));
    ctx.save(); ctx.beginPath(); ctx.rect(430, 216, 1060, 220); ctx.clip();
    text(words[index], 960, 326 + mix(95, 0, p), 112, { color: gold, alpha: p });
    if (index) text(words[index - 1], 960, 326 - p * 130, 112, { alpha: 1 - p }); ctx.restore();
  }
  function ending(frame) {
    const pull = ease(progress(frame, 948, 1010)), flatten = smooth(progress(frame, 1190, 1240));
    const recenter = ease(progress(frame, 1240, 1260)), radius = mix(mix(1255, 305, pull), 88, recenter), x = mix(mix(843.1, 960, pull), 650, recenter), y = mix(1640, 540, pull);
    const worldAlpha = 1 - flatten;
    globe(x, y, radius, frame, false, worldAlpha);
    if (flatten) { ctx.save(); ctx.globalAlpha = flatten * (1 - recenter); ctx.fillStyle = white; ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.fill(); ctx.restore(); ring(x, y, radius, flatten * recenter, gold, 2); }
    const labels = [copy.script, copy.storyboard, copy.video];
    for (let i = 0; i < 3; i++) {
      const born = 1020 + i * 60, appear = ease(progress(frame, born - 12, born));
      if (!appear || frame >= 1260) continue;
      const angle = -.95 + (frame - born) * .006 + i * 2.08, distance = radius + 105;
      const sx = x + Math.cos(angle) * distance, sy = y + Math.sin(angle) * distance * .65;
      ctx.save(); ctx.globalAlpha = appear * (1 - recenter);
      ctx.strokeStyle = '#FFFFFF24'; ctx.beginPath(); ctx.ellipse(x, y, distance, distance * .65, 0, 0, TAU); ctx.stroke();
      globe(sx, sy, (i === 0 ? 34 : 25) * appear, frame + i * 100, i === 1);
      text(labels[i], sx, sy - 60, 18, { mono: true, color: i ? white : gold }); ctx.restore();
    }
    if (frame >= 1190) { line(0, 350, W, 350, flatten * .18); line(0, 730, W, 730, flatten * .18); line(470, 180, 470, 900, flatten * .18); line(1460, 180, 1460, 900, flatten * .18); }
  }
  function mark(frame) {
    const p = ease(progress(frame, 1260, 1284));
    line(0, 350, W, 350, .18); line(0, 730, W, 730, .18); line(470, 180, 470, 900, .18); line(1460, 180, 1460, 900, .18);
    const x = 650, y = 540, radius = 88; ring(x, y, radius, 1, gold, 2);
    const height = radius * 2 * .74, width = height * logo.width / logo.height;
    ctx.save(); ctx.globalAlpha = p; ctx.drawImage(logo, x - width / 2, y - height / 2, width, height); ctx.restore();
    maskText(copy.brand, 1060, 532 + mix(24, 0, p), 146, p, { italic: true });
    text(copy.url, 1060, 674, 56, { mono: true, color: gold, alpha: p });
  }
  window.seekFullFrame = async frame => {
    if (!Number.isSafeInteger(frame) || frame < 0 || frame >= config.frames) throw Error('Invalid orbital native frame');
    base(frame);
    if (frame < 210) opening(frame);
    else if (frame < 434) world(frame);
    else if (frame < 570) conveyor(frame);
    else if (frame < 780) solidWorld(frame);
    else if (frame < 948) horizon(frame);
    else if (frame < 1260) ending(frame);
    else mark(frame);
    window.__fullEvidence.lastFrame = frame;
  };
  window.__fullEvidence = { adapter: 'Absolute 60fps Canvas/WebGL orbital composition', fontReady: document.fonts.status === 'loaded',
    proceduralAssets: true, borrowedFootage: false, deterministic: true, seed: 'fibonacci-6100-fixed', canonicalLogo: 'assets/logo.png', lastFrame: null };
  // Initialize text and WebGL compositing before the first externally visible frame.
  for (const frame of [365, 1388, 85, 0]) {
    await window.seekFullFrame(frame);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }
  window.__motionReady = true;
})().catch(error => { window.__motionError = error.message; });
