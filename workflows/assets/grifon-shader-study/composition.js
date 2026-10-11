const root = document.getElementById('root');
const query = new URLSearchParams(location.search);
const mode = query.get('mode') === 'before' ? 'before' : 'after';
const elements = Object.fromEntries([
  'material-background', 'orb-scene', 'orb-world', 'orb-glint', 'opening-copy',
  'opening-rule', 'glass-scene', 'glass-field', 'direction-copy', 'glass-card',
  'card-sheen', 'finish-scene', 'finish-aura', 'finish-light', 'brand', 'brand-url',
  'transition-light', 'end-fade'
].map(id => [id, document.getElementById(id)]));
const steps = [...document.querySelectorAll('.workflow-step')];
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const progress = (time, start, end) => clamp((time - start) / (end - start));
const smooth = value => value * value * (3 - 2 * value);
const out = value => 1 - Math.pow(1 - value, 4);
const mix = (a, b, value) => a + (b - a) * value;
const style = (id, values) => Object.assign(elements[id].style, values);
let spec;
let materials;
let ready;
let seekQueue = Promise.resolve();

window.__motionReady = false;
window.__motionError = null;
root.dataset.mode = mode;

function motionAt(seconds) {
  const t = clamp(Number(seconds) || 0, 0, spec.duration);
  const orbEnd = spec.timeline.orb.end;
  const glassEnd = spec.timeline.glass.end;
  const finish = spec.timeline.finish;
  const scene = t < orbEnd ? 'orb' : t < glassEnd ? 'glass' : 'finish';
  const orbReveal = out(progress(t, .05, .95));
  const openingReveal = out(progress(t, .30, .98));
  const orbPush = smooth(progress(t, .95, orbEnd));
  const cardReveal = out(progress(t, orbEnd, 3.03));
  const directionReveal = out(progress(t, 2.43, 2.98));
  const cardSweep = smooth(progress(t, 3.28, 4.75));
  const compress = smooth(progress(t, glassEnd, 5.70));
  const finishReveal = out(progress(t, 5.65, finish.settled));
  const transitionSweep = smooth(progress(t, 5.30, 6.18));
  const fade = smooth(progress(t, finish.holdUntil, finish.end));
  const sceneReveal = scene === 'orb' ? orbReveal : scene === 'glass' ? cardReveal : finishReveal;

  style('orb-scene', { visibility: scene === 'orb' ? 'visible' : 'hidden' });
  style('glass-scene', { visibility: scene === 'glass' || t < 5.72 && scene === 'finish' ? 'visible' : 'hidden' });
  style('finish-scene', { visibility: scene === 'finish' ? 'visible' : 'hidden' });
  style('orb-world', {
    opacity: String(orbReveal),
    transform: `translate(${mix(155, 0, orbReveal)}px,${mix(48, 0, orbReveal)}px) scale(${mix(.82, 1, orbReveal) + .035 * orbPush})`
  });
  style('orb-glint', {
    opacity: String(Math.sin(progress(t, .20, 1.85) * Math.PI) * .55),
    transform: `translate(${mix(-180, 250, smooth(progress(t, .20, 1.85)))}px,${mix(35, -12, orbReveal)}px) rotate(-24deg)`
  });
  style('opening-copy', {
    opacity: String(openingReveal),
    filter: `blur(${mix(10, 0, openingReveal)}px)`,
    transform: `translate(${mix(-42, 0, openingReveal)}px,${mix(28, 0, openingReveal)}px)`
  });
  style('opening-rule', { opacity: String(openingReveal), transform: `scaleX(${openingReveal})` });
  style('direction-copy', {
    opacity: String(directionReveal * (1 - progress(t, glassEnd, 5.44))),
    transform: `translateY(${mix(24, 0, directionReveal)}px)`,
    filter: `blur(${mix(6, 0, directionReveal)}px)`
  });
  style('glass-card', {
    opacity: String(cardReveal * (1 - progress(t, 5.61, 5.72))),
    transform: `perspective(1800px) translateY(${mix(56, 0, cardReveal) - 102 * compress}px) rotateX(${mix(12, 0, cardReveal)}deg) scale(${mix(.94, 1, cardReveal) * mix(1, .56, compress)},${mix(1, .026, compress)})`
  });
  style('glass-field', {
    opacity: String(.45 * cardReveal * (1 - compress)),
    transform: `translateX(${mix(-34, 34, cardSweep)}px) rotate(-11deg)`
  });
  style('card-sheen', { transform: `translateX(${mix(-80, 2220, cardSweep)}px) rotate(28deg)`, opacity: String(.65 * Math.sin(cardSweep * Math.PI)) });
  steps.forEach((element, index) => {
    const reveal = out(progress(t, 2.55 + index * .06, 2.92 + index * .06));
    element.style.opacity = String(reveal * (1 - progress(t, glassEnd, 5.40)));
    element.style.transform = `translateY(${mix(24, 0, reveal)}px)`;
  });
  style('brand', {
    opacity: String(finishReveal),
    transform: `translateY(${mix(30, 0, finishReveal)}px) scale(${mix(.96, 1, finishReveal)})`
  });
  style('brand-url', { opacity: String(out(progress(t, 5.97, finish.settled))) });
  style('finish-aura', { opacity: String(finishReveal) });
  style('finish-light', {
    opacity: String(Math.sin(progress(t, 5.55, finish.settled) * Math.PI) * .55),
    transform: `translateY(${mix(50, 120, transitionSweep)}px) scaleX(${mix(.42, 1, transitionSweep)})`
  });
  style('transition-light', {
    opacity: String(Math.sin(transitionSweep * Math.PI) * .55),
    transform: `translateX(${mix(-120, 2720, transitionSweep)}px) rotate(-19deg)`
  });
  style('material-background', { opacity: String(scene === 'finish' ? mix(1, .35, finishReveal) : 1) });
  style('end-fade', { opacity: String(fade) });

  return {
    time: t, scene, mode, materialTime: scene === 'finish' ? Math.min(t, finish.settled) : t,
    orbReveal, openingReveal, orbScale: mix(.82, 1, orbReveal) + .035 * orbPush,
    cardReveal, cardSweep, compress, finishReveal, transitionSweep, fade,
    reveal: sceneReveal, sweep: scene === 'glass' ? cardSweep : transitionSweep,
    finishAtmosphere: finishReveal
  };
}

async function renderAt(seconds) {
  const state = motionAt(seconds);
  if (materials) await materials.seek(state.materialTime, state.scene, state);
  window.__motionState = state;
  root.dataset.scene = state.scene;
  root.dataset.time = state.time.toFixed(6);
  return state;
}

window.seekComposition = seconds => {
  const result = seekQueue.then(async () => { await ready; return renderAt(seconds); });
  seekQueue = result.catch(() => {});
  return result;
};

ready = (async () => {
  const response = await fetch('./study.json');
  if (!response.ok) throw new Error(`Study specification failed to load (${response.status})`);
  spec = await response.json();
  window.__study = spec;
  document.getElementById('opening-copy').textContent = spec.copy.opening;
  const direction = document.getElementById('direction-copy');
  const splitAt = spec.copy.direction.indexOf(' a clear direction.');
  const lines = splitAt === -1 ? [spec.copy.direction] : [spec.copy.direction.slice(0, splitAt), spec.copy.direction.slice(splitAt + 1)];
  lines.forEach((text, index) => { if (index) direction.append(' '); const line = document.createElement('span'); line.className = 'direction-line'; line.textContent = text; direction.append(line); });
  direction.setAttribute('aria-label', spec.copy.direction);
  steps.forEach((element, index) => { element.querySelector('.step-title').textContent = spec.copy.steps[index]; });
  document.getElementById('brand-word').textContent = spec.copy.brand;
  document.getElementById('brand-url').textContent = spec.copy.website;
  const mark = document.getElementById('brand-mark');
  mark.src = spec.assets.logo;
  await Promise.all([document.fonts.load('900 164px InterBlack'), document.fonts.load('600 84px Inter'), mark.decode()]);
  if (mode === 'after') {
    await import('./shader-materials.js');
    materials = window.shaderMaterials;
    if (!materials?.init || !materials?.seek) throw new Error('The WebGPU material adapter is unavailable');
    await materials.init({
      mode, backgroundCanvas: 'shader-background', orbCanvas: 'shader-orb',
      glassCanvas: 'shader-glass', width: spec.width, height: spec.height
    });
  }
  await renderAt(0);
  window.__motionReady = true;
})().catch(error => {
  window.__motionError = error.message;
  console.error(error);
  throw error;
});
