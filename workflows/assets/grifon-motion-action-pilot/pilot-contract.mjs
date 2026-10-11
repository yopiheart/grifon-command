import { validateSpec } from './action-spec.mjs';
// The reusable contract permits different action IDs; this authored renderer does not.
export const PILOT_BINDINGS = {
  'orb-reveal': 'orb-world', 'opening-reveal': 'opening-copy', 'orb-push': 'orb-world',
  'orb-glint': 'orb-glint', 'card-reveal': 'glass-card', 'direction-reveal': 'direction-copy',
  'card-sweep': 'card-sheen', 'workflow-research': 'workflow-research',
  'workflow-script': 'workflow-script', 'workflow-storyboard': 'workflow-storyboard',
  'direction-exit': 'direction-copy', 'workflow-exit': 'workflow-steps',
  'workflow-compress': 'glass-card', 'card-hide': 'glass-card', 'brand-reveal': 'brand',
  'brand-url-reveal': 'brand-url', 'finish-light': 'finish-light',
  'transition-sweep': 'transition-light', 'end-fade': 'end-fade',
};
export function validatePilotSpec(spec) {
  validateSpec(spec);
  for (const [id, target] of Object.entries(PILOT_BINDINGS)) {
    const action = spec.actions.find(item => item.id === id);
    if (!action || action.target !== target) throw Error(`Pilot binding required: ${id} -> ${target}`);
  }
  if (spec.scenes.map(scene => scene.id).join(',') !== 'orb,glass,finish') throw Error('Pilot requires orb,glass,finish scene bindings');
  const exits = [{ kind: 'cut' }, { kind: 'transition', actionId: 'workflow-compress' }, { kind: 'fade', actionId: 'end-fade' }];
  spec.scenes.forEach((scene, index) => {
    if (scene.exit.kind !== exits[index].kind || scene.exit.actionId !== exits[index].actionId) throw Error(`Pilot exit binding required for ${scene.id}`);
  });
  if (spec.materialHoldActionId !== 'brand-reveal') throw Error('Pilot material hold must bind to brand-reveal');
  return spec;
}
