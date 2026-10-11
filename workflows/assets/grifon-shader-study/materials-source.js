import { shaderRendererGPU, createGpuUniformsMap, rootPassthrough } from 'shaders/core';
import { createSharedDevice } from 'shaders/js';
import FlowingGradient from 'shaders/core/FlowingGradient';
import LiquidMetal from 'shaders/core/LiquidMetal';
import FlutedGlass from 'shaders/core/FlutedGlass';

const GOLD = '#d1ac55';
let gpu;
let layers;
let mode;
const errors = [];
const draws = [];

function add(renderer, id, definition, parent, values, order = 0) {
  const props = Object.fromEntries(Object.entries(definition.props).map(([name, spec]) => [name, values[name] ?? spec.default]));
  renderer.registerNode(id, definition.fragment, parent, { blendMode: 'normal', opacity: 1, renderOrder: order, id }, createGpuUniformsMap(definition, props, id), definition);
}

async function layer(elementId, setup) {
  const canvas = document.getElementById(elementId);
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error(`Missing canvas ${elementId}`);
  const width = canvas.width;
  const height = canvas.height;
  const renderer = shaderRendererGPU();
  renderer.setOnUnavailable((reason) => errors.push(`${elementId}: ${reason}`));
  await renderer.initialize({canvas, gpu, observeElement: false, forceFullFrameRate: true, colorSpace: 'srgb', toneMapping: 'linear', enablePerformanceTracking: true});
  renderer.stopAnimation();
  if (renderer.getFailureReason()) throw new Error(`${elementId}: ${renderer.getFailureReason()}`);
  renderer.resize(width, height);
  renderer.registerNode('root', rootPassthrough.fragment, null, null, {}, rootPassthrough);
  setup(renderer);
  await renderer.renderSyntheticFrame(0, {waitForGpu: true});
  if (renderer.getFailureReason()) throw new Error(`${elementId}: ${renderer.getFailureReason()}`);
  return {renderer, canvas, width, height};
}

async function init(options) {
  if (layers) throw new Error('shaderMaterials.init may run once per page');
  mode = options.mode;
  if (mode === 'before') {
    window.__shaderEngine = {package: 'shaders', version: '4.0.1', backend: 'css-before'};
    window.__shaderEvidence = {renderer:'CSS baseline',failure:null,materials:[]};
    return window.__shaderEngine;
  }
  gpu = await createSharedDevice({powerPreference: 'high-performance'});
  if (!gpu) throw new Error('WebGPU adapter/device unavailable');
  gpu.device.addEventListener('uncapturederror', (event) => errors.push(event.error.message));
  layers = {
    background: await layer(options.backgroundCanvas, (r) => add(r, 'flow', FlowingGradient, 'root', {colorA:'#090909', colorB:'#1e1b14', colorC:GOLD, colorD:'#171717', colorSpace:'linear', speed:0, distortion:0.7, seed:11})),
    orb: await layer(options.orbCanvas, (r) => add(r, 'metal', LiquidMetal, 'root', {origin:'center', center:{x:0.5,y:0.5}, lightColor:'#f6ebc8', darkColor:'#171717', speed:0, turbulence:0.45, ripple:2.2, warp:0.65, sharpness:0.8, environment:1.5, dispersion:0, scale:1, shape:{type:'sphere3D',radius:0.442}})),
    glass: await layer(options.glassCanvas, (r) => {
      add(r, 'flutes', FlutedGlass, 'root', {shape:'rounded', angle:0, frequency:16, softness:0.7, speed:0, refraction:1.3, aberration:0, highlight:0.45, highlightSoftness:0.32, highlightColor:'#faf4da', lightAngle:30, edges:'mirror'});
      add(r, 'glass-flow', FlowingGradient, 'flutes', {colorA:'#0b0b0b', colorB:'#2e2719', colorC:'#dbbb70', colorD:'#101010', colorSpace:'linear', speed:0, distortion:0.48, seed:7});
    })
  };
  await gpu.device.queue.onSubmittedWorkDone();
  if (errors.length) throw new Error(errors.join('\n'));
  const info = gpu.adapter.info;
  window.__shaderEngine = {package:'shaders', version:'4.0.1', backend:'webgpu', adapter:{vendor:info.vendor,architecture:info.architecture,device:info.device,description:info.description,isFallbackAdapter:info.isFallbackAdapter}, materials:['FlowingGradient','LiquidMetal','FlutedGlass'], resolution:Object.fromEntries(Object.entries(layers).map(([k,v])=>[k,[v.width,v.height]])), timing:'speed=0; absolute-time effect uniforms; renderSyntheticFrame(0, waitForGpu=true)'};
  window.__shaderEvidence = {renderer:'WebGPU',failure:null,...window.__shaderEngine};
  return window.__shaderEngine;
}

async function seek(t, scene, values = {}) {
  if (mode === 'before') return;
  if (!layers) throw new Error('shaderMaterials.init must complete before seek');
  const time = Math.max(0, Number(values.materialTime ?? Math.min(t, 6.4)));
  const sweep = Number(values.sweep ?? values.cardSweep ?? 0.5);
  const start = performance.now();
  const {background, orb, glass} = layers;
  background.renderer.updateUniformValue('flow','seed',11 + time * 0.14);
  await background.renderer.renderSyntheticFrame(0,{waitForGpu:true});
  if (scene === 'orb' || values.orbReveal > 0) {
    orb.renderer.updateUniformValue('metal','envRotation',time * 21);
    orb.renderer.updateUniformValue('metal','lightAngle',245 + time * 18);
    orb.renderer.updateUniformValue('metal','rotation',time * 7);
    orb.renderer.updateUniformValue('metal','ripple',2.2 + Math.sin(time * 1.4) * 0.15);
    await orb.renderer.renderSyntheticFrame(0,{waitForGpu:true});
  }
  if (scene === 'glass' || values.cardReveal > 0) {
    glass.renderer.updateUniformValue('glass-flow','seed',7 + time * 0.21);
    glass.renderer.updateUniformValue('flutes','angle',Math.sin(time * 0.4) * 4);
    glass.renderer.updateUniformValue('flutes','lightAngle',-35 + sweep * 90);
    await glass.renderer.renderSyntheticFrame(0,{waitForGpu:true});
  }
  await gpu.device.queue.onSubmittedWorkDone();
  if (errors.length) throw new Error(errors.join('\n'));
  for (const [name, item] of Object.entries(layers)) if (item.renderer.getFailureReason()) throw new Error(`${name}: ${item.renderer.getFailureReason()}`);
  draws.push(performance.now() - start);
  window.__shaderFrame = {time,scene,drawMilliseconds:draws.at(-1), completed:true};
}

function stats() {
  return {engine:window.__shaderEngine, errors:[...errors], draws:[...draws], renderers:layers && Object.fromEntries(Object.entries(layers).map(([k,v])=>[k,v.renderer.getPerformanceStats()]))};
}

window.shaderMaterials = {init, seek, stats};
