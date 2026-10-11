// Shared, renderer-independent timing contract. Choreography remains authored.
export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const EASINGS = {
  linear: value => value,
  smooth: value => value * value * (3 - 2 * value),
  outQuart: value => 1 - Math.pow(1 - value, 4),
};

export function validateSpec(spec) {
  const fail = message => { throw new Error(`Action specification: ${message}`); };
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const interval = (start, end, label) => {
    if (!finite(start) || !finite(end) || start < 0 || end > spec.duration || start >= end) fail(`${label} has an impossible interval`);
  };
  if (!finite(spec.duration) || spec.duration <= 0 || !Number.isInteger(spec.fps) || spec.fps <= 0) fail('invalid duration/fps');
  if (!Number.isInteger(spec.width) || !Number.isInteger(spec.height) || spec.width <= 0 || spec.height <= 0) fail('invalid dimensions');
  if (!Array.isArray(spec.scenes) || !spec.scenes.length || !Array.isArray(spec.actions) || !spec.actions.length) fail('scenes/actions required');
  if (!Array.isArray(spec.targets) || new Set(spec.targets).size !== spec.targets.length) fail('distinct target IDs required');
  const sceneIds = new Set();
  for (const [index, scene] of spec.scenes.entries()) {
    if (!scene.id || sceneIds.has(scene.id)) fail(`duplicate/missing scene ID ${scene.id}`);
    sceneIds.add(scene.id);
    if (typeof scene.purpose !== 'string' || !scene.purpose.trim()) fail(`missing purpose for ${scene.id}`);
    interval(scene.start, scene.end, scene.id);
    if (!Array.isArray(scene.readable) || scene.readable.length !== 2) fail(`readable interval required for ${scene.id}`);
    interval(...scene.readable, `${scene.id} readable`);
    if (scene.readable[0] < scene.start || scene.readable[1] > scene.end) fail(`readable interval escapes ${scene.id}`);
    if (!['cut', 'transition', 'fade'].includes(scene.exit?.kind)) fail(`exit required for ${scene.id}`);
    if (index === 0 && scene.start !== 0 || index > 0 && scene.start !== spec.scenes[index - 1].end) fail('scenes must cover time continuously');
  }
  if (spec.scenes.at(-1).end !== spec.duration) fail('scenes must end at duration');
  const ids = new Set();
  for (const action of spec.actions) {
    if (!action.id || ids.has(action.id)) fail(`duplicate/missing action ID ${action.id}`);
    ids.add(action.id);
    if (!spec.targets.includes(action.target)) fail(`unknown target ${action.target}`);
    interval(action.start, action.end, action.id);
    if (!Object.hasOwn(EASINGS, action.easing)) fail(`unknown easing for ${action.id}`);
    if (action.contact !== null && (!finite(action.contact) || action.contact <= action.start || action.contact > action.end)) fail(`impossible contact for ${action.id}`);
    if (action.soundFamily !== null && (typeof action.soundFamily !== 'string' || !action.soundFamily.trim() || action.contact === null)) fail(`sound family/contact required for ${action.id}`);
  }
  for (const scene of spec.scenes) if (scene.exit.kind !== 'cut') {
    const action = spec.actions.find(item => item.id === scene.exit.actionId);
    if (!action) fail(`unknown transition action ${scene.exit.actionId}`);
    if (action.start > scene.end || action.end < scene.end) fail(`exit action does not touch scene boundary ${scene.id}`);
  }
  if (!ids.has(spec.materialHoldActionId)) fail('unknown material hold action');
  if (spec.actions.find(action => action.id === spec.materialHoldActionId).contact === null) fail('material hold requires contact');
  const cueIds = new Set();
  for (const cue of spec.audio?.cues || []) {
    if (!cue.id || cueIds.has(cue.id)) fail(`duplicate/missing cue ID ${cue.id}`);
    cueIds.add(cue.id);
    const action = spec.actions.find(item => item.id === cue.actionId);
    if (!action || action.contact === null || !action.soundFamily) fail(`unknown or non-contact cue reference ${cue.actionId}`);
    if (!spec.audio.assets || !Object.hasOwn(spec.audio.assets, cue.assetId) || typeof spec.audio.assets[cue.assetId] !== 'string' || !spec.audio.assets[cue.assetId].trim()) fail(`unknown cue asset ${cue.assetId}`);
    if (!finite(cue.sourceIn) || !finite(cue.sourceOut) || !finite(cue.sourceContact) || cue.sourceIn < 0 || cue.sourceOut <= cue.sourceIn || cue.sourceContact < cue.sourceIn || cue.sourceContact > cue.sourceOut) fail(`impossible source contact for ${cue.id}`);
    if (!finite(cue.gainDb)) fail(`invalid gain for ${cue.id}`);
    const start = action.contact - (cue.sourceContact - cue.sourceIn);
    if (start < 0 || start + cue.sourceOut - cue.sourceIn > spec.duration) fail(`cue escapes timeline ${cue.id}`);
  }
  return spec;
}

export function actionMap(spec) {
  validateSpec(spec);
  return Object.fromEntries(spec.actions.map(action => [action.id, action]));
}

export function actionProgress(action, seconds) {
  // A contact is the visible landing, followed by a hold until the action ends.
  const linear = clamp((seconds - action.start) / ((action.contact ?? action.end) - action.start));
  return EASINGS[action.easing](linear);
}

export function cueManifest(spec) {
  const actions = actionMap(spec);
  return {
    schemaVersion: 1, specId: spec.id, duration: spec.duration,
    rights: 'PRIVATE REVIEW ONLY: existing selected ElevenLabs sources predate paid subscription.',
    providerCalls: 0, paidSpendUsd: 0,
    cues: spec.audio.cues.map(cue => {
      const action = actions[cue.actionId];
      return { ...cue, soundFamily: action.soundFamily, target: action.target,
        assetPath: spec.audio.assets[cue.assetId], timelineContact: action.contact,
        start: Number((action.contact - (cue.sourceContact - cue.sourceIn)).toFixed(6)) };
    }),
  };
}
