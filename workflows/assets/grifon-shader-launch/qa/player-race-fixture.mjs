// Independent lightweight state test. Does not substitute for actual browser playback.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../../..');
const builderFile = path.join(ROOT, 'tools/artifacts/build-grifon-shader-launch.mjs');
const builder = fs.readFileSync(builderFile, 'utf8');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
let fixed = builder.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(fixed, 'Player script template required');
const films = { landscape: { src: 'landscape', poster: '', dimensions: [1920, 1080] }, portrait: { src: 'portrait', poster: '', dimensions: [1080, 1920] } };
fixed = fixed.replace('${JSON.stringify(films)}', JSON.stringify(films)).replace('${spec.duration}', '31.2');
const replaceExact = (source, before, after) => {
  assert.equal(source.split(before).length, 2, `Exactly one known correction required: ${before}`);
  return source.replace(before, after);
};
// Reconstruct the inspected pre-fix callback/handler, leaving unrelated player logic intact.
let original = replaceExact(fixed, 'const restart=pendingRestart;pendingRestart=false;film.currentTime=restart?0:position;', 'film.currentTime=position;');
original = replaceExact(original, 'if(restart||resume&&playbackToken===attempt)start()', 'if(resume&&playbackToken===attempt)start()');
original = replaceExact(original, "if(loading){pendingRestart=true;status.textContent='Restarting the selected format.';return}", '');

function mount(script) {
  const elements = new Map();
  const make = id => ({ id, textContent: '', value: 0, dataset: {}, listeners: {}, setAttribute() {}, addEventListener(name, fn) { this.listeners[name] = fn; } });
  for (const id of ['film', 'scrub', 'time', 'status', 'play', 'audio', 'download', 'restart', 'dimensions']) elements.set(id, make(id));
  const film = elements.get('film');
  Object.assign(film, { currentTime: 0, paused: true, muted: false, pause() { this.paused = true; }, async play() { this.paused = false; }, load() {} });
  Object.defineProperty(film, 'src', { set(value) { this.source = value; this.currentTime = 0; this.paused = true; }, get() { return this.source; } });
  const context = vm.createContext({ document: { getElementById: id => elements.get(id), querySelectorAll: () => [] }, window: { addEventListener() {} }, requestAnimationFrame() {}, URL: {}, Uint8Array, Blob });
  vm.runInContext(script, context);
  film.onloadedmetadata();
  return { film, select: format => vm.runInContext(`select(${JSON.stringify(format)})`, context), restart: () => elements.get('restart').listeners.click() };
}

async function restartDuringLoad(script) {
  const player = mount(script);
  player.film.currentTime = 8;
  player.select('portrait');
  player.restart();
  player.film.onloadedmetadata();
  await Promise.resolve();
  return { currentTime: player.film.currentTime, paused: player.film.paused, result: player.film.currentTime === 0 && !player.film.paused ? 'PASS' : 'FAIL' };
}
const before = await restartDuringLoad(original), after = await restartDuringLoad(fixed);
assert.equal(before.result, 'FAIL', 'Pre-fix behavior must demonstrate the reported defect');
assert.equal(before.currentTime, 8, 'Pre-fix load callback overwrites Restart with the saved position');
assert.equal(after.result, 'PASS', 'Fixed handler must preserve and play the requested Restart');

const rapid = mount(fixed);
rapid.film.currentTime = 8;
rapid.select('portrait');
const obsoleteMetadata = rapid.film.onloadedmetadata;
rapid.restart();
rapid.select('landscape');
obsoleteMetadata();
rapid.film.onloadedmetadata();
await Promise.resolve();
assert.equal(rapid.film.currentTime, 0);
assert.equal(rapid.film.paused, false);
const report = {
  status: 'PASS',
  builderSha256: sha(builder),
  fixedScriptSha256: sha(fixed),
  reconstructedOriginalScriptSha256: sha(original),
  method: 'Execute the actual builder script template in a minimal DOM/media-state simulation; reconstruct only the inspected pre-fix Restart callback and handler.',
  originalFail: before,
  fixPass: after,
  rapidFormatSwitchWithObsoleteMetadata: { currentTime: rapid.film.currentTime, paused: rapid.film.paused, result: 'PASS' },
  limitations: ['This is a state-machine regression fixture, not browser playback, decode, sound, download, or device evidence.'],
};
fs.writeFileSync(path.join(HERE, 'player-race.json'), JSON.stringify(report, null, 2) + '\n');
console.log('PASS: inspected pre-fix Restart fails at 8 seconds; current fix starts at 0 and survives obsolete format metadata.');
