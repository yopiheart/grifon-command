import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const composition = path.resolve(here, '..');
const root = path.resolve(composition, '../../..');
const approvedAudioHash = '095701ccc7fe7292c70f888a1145c15736fa64648f98c71ef24f1f195d536998';
const approvedBaseline = 'workflows/assets/grifon-reference-full/exports/grifon-your-next-ad-v08-1080p.mp4';
const baseline = path.join(root, approvedBaseline);
const final = path.join(composition, 'grifon-full-upgrade-1080p.mp4');
const candidates = [process.env.MOTION_DEPENDENCY_ROOT, root, path.resolve(root, '..'), path.resolve(root, '../..'), path.resolve(root, '../../..')].filter(Boolean);
const dependencyRoot = candidates.find(candidate => fs.existsSync(path.join(candidate, 'node_modules/ffmpeg-static/ffmpeg.exe')));
const ffmpeg = dependencyRoot && path.join(dependencyRoot, 'node_modules/ffmpeg-static/ffmpeg.exe');
const ffprobe = dependencyRoot && path.join(dependencyRoot, '.tools/media-runtime/node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe');
const baselineOnly = process.argv.includes('--baseline-only');
const report = {
  status: 'NOT_RUN',
  scope: 'Objective preservation of accepted V08 audio; not a perceived-sound review or approval of new visuals.',
  approvedAudioPayloadSha256: approvedAudioHash,
  command: `node workflows/assets/grifon-motion-upgrade/qa/audio-preservation.mjs${baselineOnly ? ' --baseline-only' : ''}`,
  baselineFile: approvedBaseline,
  finalFile: 'workflows/assets/grifon-motion-upgrade/grifon-full-upgrade-1080p.mp4',
  errors: [],
  listening: 'PENDING: the agent cannot directly hear the available audio input.',
};

function run(executable, args) {
  const result = spawnSync(executable, args, { encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  if (result.error || result.status !== 0) {
    throw new Error(`${path.basename(executable)} exited ${result.status}: ${result.error?.message || result.stderr.slice(-5000)}`);
  }
  return result;
}

function equal(actual, expected) {
  if (Array.isArray(expected)) return Array.isArray(actual) && actual.length === expected.length && actual.every((value, index) => equal(value, expected[index]));
  return Number.isFinite(actual) && Math.abs(actual - expected) < 0.000001;
}

function cueAudit() {
  const demo = JSON.parse(fs.readFileSync(path.join(composition, 'demo.json'), 'utf8'));
  const source = path.join(root, 'workflows/assets/grifon-reference-full');
  const sheet = JSON.parse(fs.readFileSync(path.join(source, 'qa/sound-v08/cue-sheet.json'), 'utf8'));
  const cues = sheet.cues;
  const anchors = demo.cueAnchors;
  const checks = [];
  const add = (name, actual, expected) => checks.push({ name, actual, expected, matches: equal(actual, expected) });
  const times = event => cues.filter(cue => cue.event === event).map(cue => cue.start);
  const one = event => times(event)[0];
  const prefix = text => cues.filter(cue => cue.event.startsWith(text));
  const tracked = new Set();
  function compare(name, actual, selected) {
    selected.forEach(cue => tracked.add(cue));
    add(name, actual, selected.map(cue => cue.start));
  }

  if (demo.baseline !== approvedBaseline || demo.acceptedAudioPayloadSha256 !== approvedAudioHash) throw new Error('demo.json does not identify the accepted V08 audio source/hash.');
  add('duration', demo.duration, sheet.duration);
  add('frame rate', demo.fps, 30);
  add('approved cue count', cues.length, 99);

  for (const [name, key, label] of [['opening', 'typing', 'Opening character '], ['until now', 'untilTyping', 'Until now character ']]) {
    const selected = prefix(label);
    selected.forEach(cue => tracked.add(cue));
    add(`${name} typing start`, anchors[key].start, selected[0].start);
    add(`${name} typing end`, anchors[key].end, selected.at(-1).start);
    const text = name === 'opening' ? demo.copy.opening : demo.copy.turningPoint;
    const expected = [...text].flatMap((character, index) => character.trim() ? [anchors[key].start + (anchors[key].end - anchors[key].start) * index / (text.length - 1)] : []);
    add(`${name} character schedule`, expected, selected.map(cue => cue.start));
    const characters = selected.map(cue => cue.event.split(': ').at(-1));
    if (characters.join('') !== [...text].filter(character => character.trim()).join('')) throw new Error(`${name} text does not match the preserved character sounds.`);
  }

  for (const [index, label] of ['Launch', 'Story', 'Grow'].entries()) {
    compare(`${label} collage words`, [0, 0.12, 0.26, 0.45].map(offset => anchors.collages[index] + offset), prefix(`${label} collage word `));
  }
  compare('collage swipe contacts', anchors.swipes, cues.filter(cue => cue.event === 'Collage swipe left'));
  compare('hero rotation starts', anchors.heroes, ['Camera', 'Phone', 'Laptop'].map(label => cues.find(cue => cue.event === `${label} rotation`)));
  compare('hero landing contacts', anchors.heroContacts, ['Camera turn ends', 'Phone turn ends / screen detail', 'Laptop turn ends / hinge detail'].map(label => cues.find(cue => cue.event === label)));
  compare('problem phrase contacts', anchors.problem, prefix('Problem phrase '));
  compare('message card arrivals', anchors.messages, cues.filter(cue => cue.event === 'Message card arrives'));
  compare('closing word contacts', anchors.closingWords, prefix('Closing phrase '));
  compare('workflow card contacts', anchors.cards, cues.filter(cue => /^Workflow card \d arrives$/.test(cue.event)));

  for (const [key, event] of [
    ['lens', 'Lens settles into camera reveal'],
    ['warmCut', 'Warm reveal contact'],
    ['orb', 'Sphere expands'],
    ['dialogueExit', 'Dialogue exits'],
    ['outline', 'Outline traces'],
    ['compression', 'Workflow strip compresses to logo'],
    ['logo', 'Logo lands'],
  ]) {
    const selected = cues.find(cue => cue.event === event);
    tracked.add(selected);
    add(`${key} contact`, anchors[key], one(event));
  }

  const finishingSource = fs.readFileSync(path.join(source, 'audio-finish-v08.py'), 'utf8');
  const fade = finishingSource.match(/mix \*= envelope\(\[\(0, 1\), \(([\d.]+), 1\), \(([\d.]+), 0\), \(([\d.]+), 0\)\]\)/);
  if (!fade) throw new Error('Could not establish the original final fade from the accepted finishing source.');
  add('accepted final fade', anchors.fade, [Number(fade[1]), Number(fade[2])]);

  const messages = [
    [anchors.messages[0], 0.7, demo.copy.conversation[0].text],
    [anchors.messages[1], 1.22, demo.copy.conversation[1].text],
    [anchors.messages[2], 1.2, demo.copy.conversation[2].text],
  ];
  const messageKeys = prefix('Message character ');
  messageKeys.forEach(cue => tracked.add(cue));
  const expectedMessageKeys = messages.flatMap(([start, span, text]) => [...text].flatMap((character, index) => !character.trim() || index % 3 ? [] : [start + 0.11 + span * index / (text.length - 1)]));
  add('sparse message character schedule', expectedMessageKeys, messageKeys.map(cue => cue.start));

  return {
    status: checks.every(check => check.matches) ? 'PASS' : 'FAIL',
    originalCueCount: cues.length,
    directTimingCoverage: tracked.size,
    checks,
    unmappedSourceCues: cues.filter(cue => !tracked.has(cue)).map(({ start, event }) => ({ start, event })),
    visualOnlyAnchors: ['logoSettled', 'url'],
    limitation: 'This compares declared demo anchors with accepted audio cues; it does not prove that rendered objects contact at those anchors. Remaining authored texture cues are preserved by the exact AAC payload check.',
  };
}

function inspect(file) {
  const probe = JSON.parse(run(ffprobe, ['-v', 'error', '-show_entries', 'format=duration,size:stream=index,codec_type,codec_name,duration,start_time,sample_rate,channels,nb_frames', '-of', 'json', file]).stdout);
  const audioStreams = probe.streams.filter(stream => stream.codec_type === 'audio');
  const videoStreams = probe.streams.filter(stream => stream.codec_type === 'video');
  const audio = audioStreams[0];
  const video = videoStreams[0];
  const within = (value, expected, tolerance) => Number.isFinite(Number(value)) && Math.abs(Number(value) - expected) <= tolerance;
  if (audioStreams.length !== 1 || videoStreams.length !== 1 || !audio || !video || audio.codec_name !== 'aac' || audio.sample_rate !== '48000' || audio.channels !== 2 || !within(probe.format.duration, 32.9, 0.03) || !within(audio.duration, 32.9, 0.03) || !within(video.duration, 32.9, 0.03) || !within(audio.start_time, 0, 0.001) || !within(video.start_time, 0, 0.001)) {
    throw new Error(`${path.basename(file)} does not satisfy one AAC stream / stereo48k / 32.9s / zero-start audio.`);
  }
  const hashResult = run(ffmpeg, ['-v', 'error', '-i', file, '-map', '0:a:0', '-c', 'copy', '-f', 'hash', '-hash', 'sha256', '-']).stdout.trim();
  const audioPayloadSha256 = hashResult.match(/^SHA256=([a-f0-9]{64})$/)?.[1];
  if (audioPayloadSha256 !== approvedAudioHash) throw new Error(`${path.basename(file)} AAC payload differs from the approved V08 take: ${audioPayloadSha256}`);
  const decoded = run(ffmpeg, ['-v', 'error', '-xerror', '-i', file, '-f', 'null', '-']);
  if (decoded.stderr.trim()) throw new Error(`Media decoding reported errors: ${decoded.stderr.slice(-3000)}`);
  const meter = run(ffmpeg, ['-hide_banner', '-i', file, '-vn', '-af', 'loudnorm=I=-16:TP=-1.7:LRA=9:print_format=json', '-f', 'null', '-']).stderr.match(/\{\s*"input_i"[\s\S]*?\}/g);
  if (!meter) throw new Error('FFmpeg did not return input loudness measurements.');
  const levels = JSON.parse(meter.at(-1));
  const integratedLufs = Number(levels.input_i);
  const truePeakDbtp = Number(levels.input_tp);
  if (!Number.isFinite(integratedLufs) || !Number.isFinite(truePeakDbtp) || Math.abs(integratedLufs - -16.03) > 0.05 || Math.abs(truePeakDbtp - -1.35) > 0.05) throw new Error(`Accepted audio level identity failed: ${integratedLufs} LUFS / ${truePeakDbtp} dBTP.`);
  return {
    status: 'PASS',
    fileSha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
    audioPayloadSha256,
    probe,
    fullDecode: { exitCode: 0, videoAndAudio: true },
    measurement: { integratedLufs, truePeakDbtp, loudnessRangeLu: Number(levels.input_lra), method: 'FFmpeg loudnorm input measurement; no audio normalization or output rewrite.' },
  };
}

function save() {
  fs.writeFileSync(path.join(here, 'audio-preservation.json'), `${JSON.stringify(report, null, 2)}\n`);
  const details = [
    '# Accepted audio preservation',
    '',
    `Overall status: **${report.status}**.`,
    '',
    report.scope,
    '',
    `Command: \`${report.command}\`.`,
    '',
    `Approved AAC payload SHA256: \`${approvedAudioHash}\`.`,
    '',
    '| Check | Baseline V08 | New full upgrade |',
    '| --- | --- | --- |',
    `| Media identity/decode | ${report.baseline?.status || 'NOT CHECKED'} | ${report.final?.status || 'NOT CHECKED'} |`,
    `| Integrated loudness | ${report.baseline?.measurement.integratedLufs ?? '—'} LUFS | ${report.final?.measurement.integratedLufs ?? '—'} LUFS |`,
    `| True peak | ${report.baseline?.measurement.truePeakDbtp ?? '—'} dBTP | ${report.final?.measurement.truePeakDbtp ?? '—'} dBTP |`,
    '',
    `Declared cue-anchor audit: **${report.cueAudit?.status || 'NOT CHECKED'}**; directly checks ${report.cueAudit?.directTimingCoverage ?? 0} of ${report.cueAudit?.originalCueCount ?? 99} original cue placements, including character schedules, contact cues and final fade.`,
    '',
    report.cueAudit?.limitation || 'Cue-anchor audit did not complete.',
    '',
    report.listening,
    '',
    'No original media or source file is modified. The verifier writes only its JSON/Markdown evidence. Exact AAC identity and level measurements do not prove perceived excitement, taste, or picture synchronization.',
  ];
  if (report.errors.length) details.push('', 'Errors or pending checks:', '', ...report.errors.map(error => `- ${error}`));
  fs.writeFileSync(path.join(here, 'audio-preservation.md'), `${details.join('\n')}\n`);
}

try {
  if (process.argv.slice(2).some(argument => argument !== '--baseline-only')) throw new Error('Usage: node audio-preservation.mjs [--baseline-only]');
  if (!ffmpeg || !ffprobe || !fs.existsSync(ffprobe)) throw new Error('Existing desktop FFmpeg/FFprobe runtime missing; no automatic install.');
  report.cueAudit = cueAudit();
  if (report.cueAudit.status !== 'PASS') throw new Error('Declared cue anchors differ from the accepted V08 cue timing.');
  report.baseline = inspect(baseline);
  if (baselineOnly) {
    report.status = 'BASELINE_ONLY';
    report.errors.push('Final upgrade not checked in baseline-only mode. Overall preservation is pending.');
  } else if (!fs.existsSync(final)) {
    report.status = 'PENDING_FINAL';
    report.errors.push('Final upgrade MP4 missing. Overall preservation cannot pass.');
    process.exitCode = 1;
  } else {
    report.final = inspect(final);
    report.status = 'PASS';
  }
} catch (error) {
  report.status = 'FAIL';
  report.errors.push(error.message);
  process.exitCode = 1;
}
save();
console.log(`${report.status}: accepted audio preservation; baseline ${report.baseline?.status || 'not checked'}, final ${report.final?.status || 'not checked'}, cue anchors ${report.cueAudit?.status || 'not checked'}.`);
for (const error of report.errors) console.log(error);
