import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ownDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(ownDirectory, '../../../..');
const pictureDirectory = path.dirname(ownDirectory);
const recipePath = path.join(ownDirectory, 'selection-recipe-v2.json');
const recipe = JSON.parse(readFileSync(recipePath, 'utf8'));
const toolkitRoot = path.join(root, '.tmp/codila-audio/sound-layer');
const toolkitCommit = 'c113911c9d47e050569521f97fb88971cd4b07a3';
if (execFileSync('git', ['-C', toolkitRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() !== toolkitCommit) throw new Error('Original toolkit pin changed');
execFileSync('git', ['-C', toolkitRoot, 'diff', '--quiet', 'HEAD', '--', 'PROMPT.md', 'scripts/mix.py', 'scripts/qa.py', 'scripts/sfx.py', 'scripts/kit.json']);
const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i += 2) {
  if (!['--out', '--music', '--kit'].includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--') || options[args[i]]) throw new Error('Use --out <new-private-directory> [--music <file>] [--kit <directory>]');
  options[args[i]] = args[i + 1];
}
if (!options['--out']) throw new Error('--out is required; existing output directories are never reused');
const output = path.resolve(root, options['--out']);
const privateRoot = realpathSync(path.join(root, '.tmp/codila-audio'));
if (!output.startsWith(privateRoot + path.sep)) throw new Error('Output must be a new directory beneath .tmp/codila-audio');
const parent = realpathSync(path.dirname(output));
if (parent !== privateRoot && !parent.startsWith(privateRoot + path.sep)) throw new Error('Output parent resolves outside the private task directory');

const bytes = file => readFileSync(file);
const sha256 = file => createHash('sha256').update(bytes(file)).digest('hex');
const relative = file => path.relative(root, file).split(path.sep).join('/');
const sources = ['pilot.json', 'full.json', 'pilot.js', 'surfaces.frag', 'full.js', 'full-surfaces.frag'].map(file => path.join(pictureDirectory, file));
const pilot = JSON.parse(readFileSync(sources[0], 'utf8'));
const full = JSON.parse(readFileSync(sources[1], 'utf8'));
const fullCode = readFileSync(path.join(pictureDirectory, 'full.js'), 'utf8');
const pilotCode = readFileSync(path.join(pictureDirectory, 'surfaces.frag'), 'utf8');
if (!pilotCode.includes('return x*x*(3.-2.*x);') || !fullCode.includes('return t*t*(3-2*t);') || !fullCode.includes('smooth(frames[i],frames[i+1],frame)')) throw new Error('Picture easing changed: inspect source before deriving cue timing');
if (pilot.frames !== full.prefixFrames || full.frames !== 932 || full.fpsNumerator !== 30000 || full.fpsDenominator !== 1001 || pilot.fpsNumerator !== full.fpsNumerator || pilot.fpsDenominator !== full.fpsDenominator) throw new Error('This recipe is only for the protected native Grifon timeline');
const fps = full.fpsNumerator / full.fpsDenominator;
const duration = recipe.sampleFrames / recipe.sampleRate;
const time = frame => frame * full.fpsDenominator / full.fpsNumerator;
const smooth = (a, b, value) => { const t = Math.max(0, Math.min(1, (value - a) / (b - a))); return t * t * (3 - 2 * t); };
const shot = key => { const value = full.shots.find(item => item.key === key); if (!value) throw new Error(`Missing shot ${key}`); return value; };
const keyframe = (frames, values, frame) => {
  let i = 0;
  while (i < frames.length - 2 && frame > frames[i + 1]) i++;
  return values[i] + (values[i + 1] - values[i]) * smooth(frames[i], frames[i + 1], frame);
};
function peak(start, end, value) {
  let frame = start + 1, derivative = -1;
  for (let f = start + 1; f <= end; f++) {
    const speed = Math.abs(value(f) - value(f - 1));
    if (speed > derivative + 1e-12) { frame = f; derivative = speed; }
  }
  if (!(derivative > 0)) throw new Error('No movement in the selected timing window');
  return { frame, actionWindow: [start, end], derivative, method: 'maximum absolute first discrete derivative; difference belongs to its arrival frame' };
}
const boundary = (frame, reference, method = 'authored action boundary') => ({ frame, reference, method });
function derive(timing) {
  if (timing.kind === 'pilot-cut') return [boundary(pilot.cuts[timing.key], `pilot.json#/cuts/${timing.key}`)];
  if (timing.kind === 'pilot-camera-peak') {
    const [start, end, from, to] = pilot.camera[timing.key];
    return [{ ...peak(start, end, f => from + (to - from) * smooth(start, end, f)), reference: `pilot.json#/camera/${timing.key}` }];
  }
  if (timing.kind === 'pilot-relief-materials') return pilot.relief.materialFrames.slice(1, -1).map((frame, index) => ({ ...boundary(frame, `pilot.json#/relief/materialFrames/${index + 1}`), suffix: `${index + 1}` }));
  if (timing.kind === 'full-shot') return [boundary(shot(timing.key).start, `full.json#/shots/${full.shots.findIndex(item => item.key === timing.key)}/start`)];
  if (timing.kind === 'full-camera-peak') {
    const frames = full.camera[timing.frames], values = full.camera[timing.values];
    const end = timing.phase === 'before-maximum' ? frames[values.indexOf(Math.max(...values))] : frames.at(-1);
    return [{ ...peak(frames[0], end, f => keyframe(frames, values, f)), reference: [`full.json#/camera/${timing.frames}`, `full.json#/camera/${timing.values}`] }];
  }
  if (timing.kind === 'full-glyph-materials') return full.shots.filter(item => item.key.startsWith('glyph-')).slice(1).map(item => ({ ...boundary(item.start, `full.json#/shots/${full.shots.indexOf(item)}/start`), suffix: item.key }));
  if (timing.kind === 'full-shot-peak') {
    const action = shot(timing.key);
    if (timing.key !== 'script-reflow' || !fullCode.includes(`smooth(${action.start},${action.end},frame)`)) throw new Error('Responsive source easing no longer matches its shot');
    return [{ ...peak(action.start, action.end, f => smooth(action.start, action.end, f)), reference: `full.json#/shots/${full.shots.indexOf(action)}`, sourceExpression: `smooth(${action.start},${action.end},frame)` }];
  }
  if (timing.kind === 'full-typing') {
    const action = shot('canvas-push-type');
    const expression = fullCode.match(/Math\.floor\(\(frame-(\d+)\)\*([.\d]+)\)\+(\d+)/);
    if (!expression || Number(expression[1]) !== action.start) throw new Error('Canvas typing source no longer matches its shot');
    const rate = Number(expression[2]), initial = Number(expression[3]);
    const count = f => Math.min(full.copy.canvas.length, Math.floor((f - action.start) * rate) + initial);
    const changes = [];
    for (let f = action.start + 1; f < action.end; f++) {
      for (let n = count(f - 1) + 1; n <= count(f); n++) {
        if (full.copy.canvas[n - 1] !== ' ' && timing.characterIndices.includes(n)) changes.push({ ...boundary(f, ['full.json#/copy/canvas', `full.json#/shots/${full.shots.indexOf(action)}`], 'first frame where the source character-count expression increases; only authored spaced character indices selected'), suffix: `${n}`, character: full.copy.canvas[n - 1], sourceExpression: expression[0] });
      }
    }
    return changes;
  }
  if (timing.kind === 'full-pullback-peak') {
    const action = shot('canvas-pullback');
    const expression = fullCode.match(/const pull=frame>=(\d+)\?1\.\+\(frame-(\d+)\)\*([.\d]+):1\.;/);
    if (!expression || Number(expression[1]) !== action.start || Number(expression[2]) !== action.start) throw new Error('Canvas pullback source no longer matches its shot');
    const rate = Number(expression[3]);
    return [{ ...peak(action.start, action.end - 1, f => 1 / (1 + (f - action.start) * rate)), reference: `full.json#/shots/${full.shots.indexOf(action)}`, sourceExpression: expression[0] }];
  }
  if (timing.kind === 'full-camera-land') return [boundary(full.camera[timing.key][1], `full.json#/camera/${timing.key}/1`, 'end of authored smooth onset; picture QA must confirm visual settling')];
  if (timing.kind === 'full-camera-opacity-peak') {
    const [start, end] = full.camera[timing.key];
    const expression = fullCode.match(/opacity=onset\*Math\.pow\(exit,([\d.]+)\)/);
    if (timing.key !== 'endExit' || !expression) throw new Error('Logo exit opacity source changed');
    const exponent = Number(expression[1]);
    return [{ ...peak(start, end, f => Math.pow(1 - smooth(start, end, f), exponent)), reference: `full.json#/camera/${timing.key}`, sourceExpression: expression[0], opacityExponent: exponent }];
  }
  if (timing.kind === 'full-camera-smooth-peak') {
    const [start, end] = full.camera[timing.key];
    return [{ ...peak(start, end, f => smooth(start, end, f)), reference: `full.json#/camera/${timing.key}` }];
  }
  throw new Error(`Unknown timing selector ${timing.kind}`);
}
const derived = recipe.cues.flatMap(entry => derive(entry.timing).map(timing => ({ ...timing, id: timing.suffix ? `${entry.id}-${timing.suffix}` : entry.id, role: entry.role, sound: entry.sound, weight: entry.weight || 'support', visual: entry.visual, pan: entry.pan || 0 })));
derived.sort((a, b) => a.frame - b.frame || a.id.localeCompare(b.id));
const types = Object.keys(JSON.parse(readFileSync(path.join(root, '.tmp/codila-audio/sound-layer/scripts/kit.json'), 'utf8')).sounds);
for (const cue of derived) {
  if (!Number.isInteger(cue.frame) || cue.frame < 1 || cue.frame >= full.frames || cue.sound.split('+').some(type => !types.includes(type)) || cue.sound.includes('synth:')) throw new Error(`Invalid recorded action cue ${cue.id}`);
}
if (new Set(derived.map(cue => cue.id)).size !== derived.length) throw new Error('Duplicate cue IDs');
const heroes = derived.filter(cue => cue.weight === 'hero');
const heroGaps = heroes.slice(1).map((cue, index) => time(cue.frame - heroes[index].frame));
if (heroes.length !== 6 || heroGaps.some(gap => gap < 3)) throw new Error('Hero spacing no longer matches the authored sparse treatment');
const music = path.resolve(root, options['--music'] || recipe.music);
const musicReceipt = { path: relative(music), bytes: bytes(music).length, sha256: sha256(music), timing: 'prepared source 0 to native audio duration; no loop' };
const kit = relative(path.resolve(root, options['--kit'] || recipe.kit));
const cues = {
  fps, duration_s: duration, energy: 'punchy', lufs: recipe.targetLufs, kit,
  music: { file: relative(music), start_s: 0, loop: false, fade_out_s: duration - time(full.camera.endExit[0]) },
  voice: [], silence_ok: [[time(shot('black-tail').start), duration]],
  cues: derived.map(cue => ({ id: cue.id, frame: cue.frame, sound: cue.sound, weight: cue.weight, align: 'peak', pan: cue.pan, visual: cue.visual, ...(cue.weight === 'hero' ? { stop_before: true, build: true } : {}) }))
};
const toolkit = ['PROMPT.md', 'scripts/mix.py', 'scripts/qa.py', 'scripts/sfx.py', 'scripts/kit.json'].map(file => path.join(root, '.tmp/codila-audio/sound-layer', file));
const provenance = {
  schemaVersion: 1, status: 'CUE_EXPORT_ONLY_NOT_MIXED_OR_LISTENED',
  recipe: { path: relative(recipePath), sha256: sha256(recipePath) },
  exporter: { path: relative(fileURLToPath(import.meta.url)), sha256: sha256(fileURLToPath(import.meta.url)) },
  pictureSources: sources.map(file => ({ path: relative(file), bytes: bytes(file).length, sha256: sha256(file) })),
  toolkit: { repository: 'https://github.com/Bodila51/opus-sound-layer', commit: toolkitCommit, sourceDiffAgainstPin: 'PASS', files: toolkit.map(file => ({ path: relative(file), sha256: sha256(file) })) },
  music: musicReceipt, kit: { path: kit, approval: 'Selected recording rights, sidecars and sheets are a separate root-owned gate; this exporter does not approve audio' },
  fpsNumerator: full.fpsNumerator, fpsDenominator: full.fpsDenominator, videoFrames: full.frames, sampleRate: recipe.sampleRate, sampleFrames: recipe.sampleFrames,
  heroGapsSeconds: heroGaps, meanHeroGapSeconds: heroGaps.reduce((sum, gap) => sum + gap, 0) / heroGaps.length,
  cues: derived.map(cue => ({ ...cue, seconds: time(cue.frame) })),
  warnings: ['A source action boundary is not proof of an encoded picture cut. Original qa.py must inspect the muxed film.', 'Logo settling and small typing/reflow actions may produce meaningful picture warnings or failures; retain and explain them.', 'Upstream QA and source verdicts do not establish auditory quality. A human must listen to the complete candidate.']
};
const checkpoints = [
  ['ring-arrival', 'Check the ring reveal: the recorded thump/tap should arrive with the clear scene change, after the lens camera air; listen for ringing or a double hit.'],
  ['relief-grayscale', 'Check the major grayscale change and the macro sequence that follows: a single hero should provide emphasis without tapping every shallow relief material shift.'],
  ['glyph-dark-gold', 'Check the dark-gold glyph reveal after the smaller capability and particle arrivals: main impacts should remain distinct from supporting contacts and camera air.'],
  ['storyboard-arrival', 'Check the UI sequence: earlier responsive reflow, storyboard arrival, then the two later non-space typing accents. Keys should stay smaller than the hero without a rapid cluster.'],
  ['logo-landing', 'Check logo settling, the long hold, exit and black tail: no repeated hero during the hold; music should fade smoothly without clipping or an abrupt ending.']
];
const listen = ['# LISTEN - Codila audio candidate', '', 'Status: cue plan only. No mixed candidate, encoded QA pass, sonic match or listening approval is claimed.', '', 'Listen to the whole film once before using these five checkpoints. The times below are generated from the protected picture sources.', '', ...checkpoints.map(([id, question], index) => { const cue = derived.find(item => item.id === id); return `${index + 1}. **${time(cue.frame).toFixed(3)} s / frame ${cue.frame} - ${id}**: ${question}`; }), '', 'Final human verdict: PENDING. Record playback device, complete-film observation and any changes needed.', ''];
mkdirSync(output);
for (const [name, value] of [['cues.json', cues], ['derived-timing.json', provenance]]) writeFileSync(path.join(output, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
writeFileSync(path.join(output, 'LISTEN.md'), listen.join('\n'), { flag: 'wx' });
console.log(JSON.stringify({ status: provenance.status, output: relative(output), cueCount: derived.length, heroCount: heroes.length, meanHeroGapSeconds: provenance.meanHeroGapSeconds, files: ['cues.json', 'derived-timing.json', 'LISTEN.md'] }));
