import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { validateSpec, actionMap, actionProgress, cueManifest } from './action-spec.mjs';
import { validatePilotSpec } from './pilot-contract.mjs';
const original = JSON.parse(fs.readFileSync(new URL('./pilot.json', import.meta.url), 'utf8'));
const clone = () => structuredClone(original);
if (process.argv[2] === '--validate') {
  validateSpec(JSON.parse(fs.readFileSync(process.argv[3], 'utf8')));
  console.log('Valid scene/action specification.');
} else {
  test('valid specification derives native-transient contacts', () => {
    assert.equal(validateSpec(original), original);
    const manifest = cueManifest(original);
    for (const cue of manifest.cues) assert.ok(Math.abs(cue.start + cue.sourceContact - cue.sourceIn - cue.timelineContact) < 1e-9);
    assert.equal(manifest.cues.find(cue => cue.id === 'glass-contact').timelineContact, actionMap(original)['card-reveal'].contact);
  });
  for (const [label, change, match] of [
    ['duplicate action IDs', spec => spec.actions.push({ ...spec.actions[0] }), /duplicate\/missing action ID/],
    ['missing scene purpose', spec => spec.scenes[0].purpose = '', /missing purpose/],
    ['impossible action interval', spec => spec.actions[0].end = spec.actions[0].start, /impossible interval/],
    ['contact outside action', spec => spec.actions[0].contact = spec.actions[0].end + 1, /impossible contact/],
    ['unknown audio cue action', spec => spec.audio.cues[0].actionId = 'missing-action', /unknown or non-contact cue/],
    ['unknown visual target', spec => spec.actions[0].target = 'missing-target', /unknown target/],
    ['readable interval outside scene', spec => spec.scenes[0].readable[1] = spec.scenes[1].end, /readable interval escapes/],
    ['inherited easing name', spec => spec.actions[0].easing = 'toString', /unknown easing/],
    ['inherited audio asset name', spec => spec.audio.cues[0].assetId = 'toString', /unknown cue asset/],
    ['empty audio asset path', spec => spec.audio.assets[spec.audio.cues[0].assetId] = ' ', /unknown cue asset/],
    ['unrelated exit action', spec => spec.scenes[1].exit.actionId = 'orb-reveal', /exit action does not touch scene boundary/],
  ]) test(`rejects ${label}`, () => { const spec = clone(); change(spec); assert.throws(() => validateSpec(spec), match); });
  test('one contact edit shifts visible settle and associated cue, without shifting other actions', () => {
    const revised = clone(), edit = original.qa.contactMutation;
    const before = actionMap(original)[edit.actionId];
    revised.actions.find(action => action.id === edit.actionId).contact += edit.delta;
    const after = actionMap(revised)[edit.actionId];
    assert.equal(actionProgress(before, before.contact), 1);
    assert.ok(actionProgress(after, before.contact) < 1);
    assert.equal(actionProgress(after, after.contact), 1);
    const a = cueManifest(original), b = cueManifest(revised);
    a.cues.forEach((cue, index) => assert.ok(Math.abs(b.cues[index].timelineContact - cue.timelineContact - (cue.actionId === edit.actionId ? edit.delta : 0)) < 1e-9));
    revised.actions.find(action => action.id === edit.actionId).contact -= edit.delta;
    assert.deepEqual(revised, original);
  });
  test('copy-only edit preserves all motion/action/audio data', () => {
    const revised = clone(), edit = original.qa.copyMutation;
    revised.copy[edit.key] = edit.value;
    assert.deepEqual(revised.actions, original.actions);
    assert.deepEqual(revised.scenes, original.scenes);
    assert.deepEqual(cueManifest(revised), cueManifest(original));
  });
  test('pilot rejects generic-valid renamed action before creating NaN CSS', () => {
    const revised = clone();
    revised.actions.find(action => action.id === 'orb-reveal').id = 'renamed-orb';
    revised.audio.cues.filter(cue => cue.actionId === 'orb-reveal').forEach(cue => cue.actionId = 'renamed-orb');
    assert.equal(validateSpec(revised), revised);
    assert.throws(() => validatePilotSpec(revised), /Pilot binding required: orb-reveal/);
  });
  test('pilot rejects unsupported authored cut change', () => {
    const revised = clone();
    revised.scenes[1].exit = { kind: 'cut' };
    assert.equal(validateSpec(revised), revised);
    assert.throws(() => validatePilotSpec(revised), /Pilot exit binding required/);
  });
}
