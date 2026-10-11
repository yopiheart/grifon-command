import { validateSpec } from '../grifon-motion-action-pilot/action-spec.mjs';

export const LAUNCH_BINDINGS = {
  'opening-reveal':'opening-copy','fragment-resolve':'fragment-field','opening-signal':'opening-signal','opening-exit':'opening-copy',
  'orb-reveal':'orb-world','orb-orbit':'orb-ring','product-reveal':'intent-copy','product-exit':'intent-copy','story-reveal':'intent-copy','story-exit':'intent-copy','business-reveal':'intent-copy','business-exit':'intent-copy',
  'research-reveal':'workflow-copy','research-signal':'workflow-signal','research-panel':'workflow-panel','research-exit':'workflow-exit',
  'script-reveal':'workflow-copy','script-signal':'workflow-signal','script-panel':'workflow-panel','script-exit':'workflow-exit',
  'storyboard-reveal':'workflow-copy','storyboard-signal':'workflow-signal','storyboard-panel':'workflow-panel','storyboard-exit':'workflow-exit',
  'research-screen-reveal':'screen-panel','research-screen-exit':'screen-panel','script-screen-reveal':'screen-panel','script-screen-exit':'screen-panel','storyboard-screen-reveal':'screen-panel','storyboard-screen-exit':'screen-panel',
  'direction-reveal':'direction-copy','direction-flow':'direction-field','direction-exit':'direction-copy','brand-reveal':'brand','brand-url-reveal':'brand-url','finish-light':'finish-light',
};
export const LAUNCH_SCENES = ['opening','product','story','business','research','script','storyboard','research-screen','script-screen','storyboard-screen','direction','finish'];

export function validateLaunchSpec(spec) {
  validateSpec(spec);
  const fail = message => { throw Error(`Launch contract: ${message}`); };
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  if (spec.duration !== 31.2 || spec.fps !== 30 || Math.round(spec.duration * spec.fps) !== 936) fail('requires 31.2s / 30fps / 936 frames');
  if (spec.scenes.map(scene => scene.id).join(',') !== LAUNCH_SCENES.join(',')) fail('scene bindings required');
  if (spec.actions.length !== Object.keys(LAUNCH_BINDINGS).length) fail('unexpected action binding');
  for (const [id,target] of Object.entries(LAUNCH_BINDINGS)) if (!spec.actions.some(action => action.id === id && action.target === target)) fail(`binding ${id} -> ${target} required`);
  const formats = {landscape:[1920,1080],portrait:[1080,1920]};
  for (const [name,[width,height]] of Object.entries(formats)) {
    if (spec.formats?.[name]?.width !== width || spec.formats[name].height !== height || !finite(spec.formats[name].safeMargin) || spec.formats[name].safeMargin < 60) fail(`invalid ${name} format`);
  }
  if (spec.width !== 1920 || spec.height !== 1080) fail('canonical dimensions required');
  for (const scene of spec.scenes) {
    const expectedIndex = ['product','story','business'].includes(scene.id) ? ['product','story','business'].indexOf(scene.id) : ['research','script','storyboard'].indexOf(scene.id.replace('-screen',''));
    const expectedMaterial = scene.id === 'opening' || scene.id === 'direction' ? 'contour' : ['product','story','business'].includes(scene.id) ? 'metal' : scene.id.endsWith('-screen') ? 'screen' : scene.id === 'finish' ? 'hold' : 'glass';
    const expectedReveal = scene.id === 'finish' ? 'brand-reveal' : `${scene.id}-reveal`;
    if (scene.revealActionId !== expectedReveal || scene.material !== expectedMaterial || expectedIndex >= 0 && scene.copyIndex !== expectedIndex || expectedIndex < 0 && scene.copyIndex !== undefined || ['opening','direction'].includes(scene.id) && scene.copyKey !== scene.id) fail(`scene copy/material/reveal binding required for ${scene.id}`);
    const reveal = spec.actions.find(action => action.id === scene.revealActionId);
    if (!reveal || reveal.contact === null || reveal.start < scene.start || reveal.contact > scene.readable[0]) fail(`readable interval precedes landing in ${scene.id}`);
    if (!Number.isFinite(scene.sample) || scene.sample < scene.readable[0] || scene.sample > scene.readable[1]) fail(`sample escapes readable interval in ${scene.id}`);
    if (scene.id === 'finish') { if (scene.exit.kind !== 'cut') fail('finish must hold to last frame'); }
    else if (scene.exit.actionId !== `${scene.id}-exit` || spec.actions.find(action => action.id === scene.exit.actionId)?.start < scene.readable[1]) fail(`exit invades readable interval in ${scene.id}`);
  }
  for (const key of ['opening','direction','brand','website','disclosure']) if (typeof spec.copy?.[key] !== 'string' || !spec.copy[key].trim()) fail(`missing copy ${key}`);
  for (const key of ['intents','steps','details']) if (!Array.isArray(spec.copy[key]) || spec.copy[key].length !== 3 || spec.copy[key].some(value => typeof value !== 'string' || !value.trim())) fail(`missing copy list ${key}`);
  if (spec.copy.brand !== 'GRIFON' || spec.copy.website !== 'grifon.ai' || spec.copy.disclosure !== 'Example project') fail('identity/disclosure required');
  if (spec.materialHoldActionId !== 'brand-url-reveal') fail('material hold binding required');
  if (!Array.isArray(spec.assets?.landscapeFraming) || spec.assets.landscapeFraming.length !== 3 || spec.assets.landscapeFraming.some(crop => ['left','top','width','height'].some(key => !finite(crop[key])) || crop.left < 0 || crop.top < 0 || crop.width <= 0 || crop.height <= 0)) fail('native capture framing required');
  for (const window of spec.qa?.motionWindows || []) if (!Object.hasOwn(LAUNCH_BINDINGS,window.actionId) || !Array.isArray(window.fraction) || window.fraction.length !== 2 || window.fraction.some(value => !finite(value)) || window.fraction[0] < 0 || window.fraction[1] > 1 || window.fraction[0] >= window.fraction[1]) fail('invalid motion window');
  if (!spec.qa?.motionWindows?.length || !Array.isArray(spec.qa.nonlinearSceneIds) || spec.qa.nonlinearSceneIds.join(',') !== LAUNCH_SCENES.join(',')) fail('complete QA scene coverage required');
  if (!finite(spec.audio?.music?.fadeOut) || spec.audio.music.fadeOut <= 0 || spec.audio.music.fadeOut >= spec.duration) fail('audio tail required');
  return spec;
}
