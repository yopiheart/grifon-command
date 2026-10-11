import { clamp, actionMap, actionProgress, cueManifest } from './action-spec.mjs';
import { validatePilotSpec } from './pilot-contract.mjs';
const root = document.getElementById('root');
const elements = Object.fromEntries([
  'material-background', 'orb-scene', 'orb-world', 'orb-glint', 'opening-copy',
  'opening-rule', 'glass-scene', 'glass-field', 'direction-copy', 'glass-card',
  'card-sheen', 'finish-scene', 'finish-aura', 'finish-light', 'brand', 'brand-url',
  'transition-light', 'end-fade',
].map(id => [id, document.getElementById(id)]));
const steps = [...document.querySelectorAll('.workflow-step')];
const mix = (a, b, value) => a + (b - a) * value;
const smooth = value => value * value * (3 - 2 * value);
const style = (id, values) => Object.assign(elements[id].style, values);
let spec, actions, materials, ready;
let seekQueue = Promise.resolve();
window.__motionReady = false;
window.__motionError = null;
root.dataset.mode = 'after';

function applySpec(next) {
  spec = validatePilotSpec(next);
  actions = actionMap(spec);
  window.__pilot = spec;
  window.__cueManifest = cueManifest(spec);
  document.getElementById('opening-copy').textContent = spec.copy.opening;
  const direction = document.getElementById('direction-copy');
  direction.replaceChildren();
  const splitAt = spec.copy.direction.indexOf(' a clear direction.');
  const lines = splitAt === -1 ? [spec.copy.direction] : [spec.copy.direction.slice(0, splitAt), spec.copy.direction.slice(splitAt + 1)];
  lines.forEach((text, index) => { if (index) direction.append(' '); const line = document.createElement('span'); line.className = 'direction-line'; line.textContent = text; direction.append(line); });
  direction.setAttribute('aria-label', spec.copy.direction);
  steps.forEach((element, index) => { element.querySelector('.step-title').textContent = spec.copy.steps[index]; });
  document.getElementById('brand-word').textContent = spec.copy.brand;
  document.getElementById('brand-url').textContent = spec.copy.website;
  document.getElementById('brand-mark').src = spec.assets.logo;
}

function motionAt(seconds) {
  const t = clamp(Number(seconds) || 0, 0, spec.duration);
  const scene = spec.scenes.find(item => t >= item.start && t < item.end)?.id || spec.scenes.at(-1).id;
  const values = Object.fromEntries(spec.actions.map(action => [action.id, actionProgress(action, t)]));
  const p = id => values[id];
  const orbReveal = p('orb-reveal'), openingReveal = p('opening-reveal'), orbPush = p('orb-push');
  const cardReveal = p('card-reveal'), directionReveal = p('direction-reveal'), cardSweep = p('card-sweep');
  const compress = p(spec.scenes[1].exit.actionId), finishReveal = p('brand-reveal'), transitionSweep = p('transition-sweep'), fade = p(spec.scenes[2].exit.actionId);
  style('orb-scene', { visibility: scene === 'orb' ? 'visible' : 'hidden' });
  style('glass-scene', { visibility: scene === 'glass' || scene === 'finish' && t < actions['card-hide'].end ? 'visible' : 'hidden' });
  style('finish-scene', { visibility: scene === 'finish' ? 'visible' : 'hidden' });
  style('orb-world', { opacity: String(orbReveal), transform: `translate(${mix(155, 0, orbReveal)}px,${mix(48, 0, orbReveal)}px) scale(${mix(.82, 1, orbReveal) + .035 * orbPush})` });
  style('orb-glint', { opacity: String(Math.sin(p('orb-glint') * Math.PI) * .55), transform: `translate(${mix(-180, 250, smooth(p('orb-glint')))}px,${mix(35, -12, orbReveal)}px) rotate(-24deg)` });
  style('opening-copy', { opacity: String(openingReveal), filter: `blur(${mix(10, 0, openingReveal)}px)`, transform: `translate(${mix(-42, 0, openingReveal)}px,${mix(28, 0, openingReveal)}px)` });
  style('opening-rule', { opacity: String(openingReveal), transform: `scaleX(${openingReveal})` });
  style('direction-copy', { opacity: String(directionReveal * (1 - p('direction-exit'))), transform: `translateY(${mix(24, 0, directionReveal)}px)`, filter: `blur(${mix(6, 0, directionReveal)}px)` });
  style('glass-card', { opacity: String(cardReveal * (1 - p('card-hide'))), transform: `perspective(1800px) translateY(${mix(56, 0, cardReveal) - 102 * compress}px) rotateX(${mix(12, 0, cardReveal)}deg) scale(${mix(.94, 1, cardReveal) * mix(1, .56, compress)},${mix(1, .026, compress)})` });
  style('glass-field', { opacity: String(.45 * cardReveal * (1 - compress)), transform: `translateX(${mix(-34, 34, cardSweep)}px) rotate(-11deg)` });
  style('card-sheen', { transform: `translateX(${mix(-80, 2220, cardSweep)}px) rotate(28deg)`, opacity: String(.65 * Math.sin(cardSweep * Math.PI)) });
  ['workflow-research', 'workflow-script', 'workflow-storyboard'].forEach((id, index) => { steps[index].style.opacity = String(p(id) * (1 - p('workflow-exit'))); steps[index].style.transform = `translateY(${mix(24, 0, p(id))}px)`; });
  style('brand', { opacity: String(finishReveal), transform: `translateY(${mix(30, 0, finishReveal)}px) scale(${mix(.96, 1, finishReveal)})` });
  style('brand-url', { opacity: String(p('brand-url-reveal')) });
  style('finish-aura', { opacity: String(finishReveal) });
  style('finish-light', { opacity: String(Math.sin(p('finish-light') * Math.PI) * .55), transform: `translateY(${mix(50, 120, transitionSweep)}px) scaleX(${mix(.42, 1, transitionSweep)})` });
  style('transition-light', { opacity: String(Math.sin(transitionSweep * Math.PI) * .55), transform: `translateX(${mix(-120, 2720, transitionSweep)}px) rotate(-19deg)` });
  style('material-background', { opacity: String(scene === 'finish' ? mix(1, .35, finishReveal) : 1) });
  style('end-fade', { opacity: String(fade) });
  return { time: t, scene, mode: 'after', actions: values,
    materialTime: scene === 'finish' ? Math.min(t, actions[spec.materialHoldActionId].contact) : t,
    orbReveal, openingReveal, orbScale: mix(.82, 1, orbReveal) + .035 * orbPush,
    cardReveal, cardSweep, compress, finishReveal, transitionSweep, fade,
    reveal: scene === 'orb' ? orbReveal : scene === 'glass' ? cardReveal : finishReveal,
    sweep: scene === 'glass' ? cardSweep : transitionSweep, finishAtmosphere: finishReveal };
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
window.setCompositionSpec = next => {
  const result = seekQueue.then(async () => { await ready; applySpec(next); return renderAt(window.__motionState.time); });
  seekQueue = result.catch(() => {});
  return result;
};
ready = (async () => {
  const response = await fetch('./pilot.json');
  if (!response.ok) throw new Error(`Pilot specification failed to load (${response.status})`);
  applySpec(await response.json());
  const mark = document.getElementById('brand-mark');
  await Promise.all([document.fonts.load('900 164px InterBlack'), document.fonts.load('600 84px Inter'), mark.decode()]);
  await import('./shader-materials.js');
  materials = window.shaderMaterials;
  if (!materials?.init || !materials?.seek) throw new Error('The WebGPU material adapter is unavailable');
  await materials.init({ mode: 'after', backgroundCanvas: 'shader-background', orbCanvas: 'shader-orb', glassCanvas: 'shader-glass', width: spec.width, height: spec.height });
  await renderAt(0);
  window.__motionReady = true;
})().catch(error => { window.__motionError = error.message; console.error(error); throw error; });
