// Editorial review choices under Neil's explicit delegation; no provider calls.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../../..');
const file = path.join(HERE, 'selected-review-manifest.json');
if (fs.existsSync(file)) throw Error('Keep existing selections; do not overwrite');
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const catalogBytes = fs.readFileSync(path.join(HERE, 'history-candidates.json'));
if (hash(catalogBytes) !== '9a074cb1957d0beaff469a1dff6575e49c7a7c6cbaa4d884eab5b3fe8eb5366a') throw Error('Catalog changed');
const catalog = JSON.parse(catalogBytes);
const assets = [], audio = {}, cues = [];
const selection = [
  ['paper-swipe-2', 'A shared paper-textured screen pass, with a clean measured ceiling and a compact usable cut.'],
  ['rotation-air-2', 'Concentrate air on the fast middle of the turn; this variant has no full-scale samples.'],
  ['camera-contact-2', 'Separate lens and body contacts from the same mechanism texture; no full-scale samples.'],
  ['phone-contact-2', 'Defined measured transient with enough body for a short glass/plastic landing.'],
  ['laptop-contact-1', 'Measured early casing transient and a short retained decay; no full-scale samples.'],
  ['card-pop-2', 'Shortest measured isolated UI transient; use restrained slices for typing and card contacts.'],
  ['reverse-air-1', 'Use the closing buildup as anticipation; keep the cut separate from the landing body.'],
  ['orb-inward-1', 'Rounded pulse supplies the inward focus and final brand body; no full-scale samples.'],
  ['pencil-4', 'Retain the previously recorded valid four-candidate machine selection.'],
];
for (const [id, rationale] of selection) {
  const asset = catalog.candidates.find(a => a.id === id);
  const b = fs.readFileSync(path.join(ROOT, asset.path));
  if (hash(b) !== asset.sha256) throw Error(`Source changed: ${id}`);
  let data, fmt;
  for (let at = 12; at + 8 <= b.length;) {
    const n = b.readUInt32LE(at + 4), kind = b.toString('ascii', at, at + 4);
    if (kind === 'fmt ') fmt = b.subarray(at + 8, at + 8 + n);
    if (kind === 'data') data = b.subarray(at + 8, at + 8 + n);
    at += 8 + n + (n % 2);
  }
  if (!data || fmt.readUInt16LE(0) !== 1 || fmt.readUInt16LE(2) !== 2 || fmt.readUInt32LE(4) !== 48000 || fmt.readUInt16LE(14) !== 16) throw Error('Unexpected source format');
  audio[id] = Array.from({ length: data.length / 2 }, (_, i) => data.readInt16LE(i * 2) / 32768);
  assets.push({ id, path: asset.path, sha256: asset.sha256, sourceLabel: asset.sourceLabel, rationale, listeningStatus: id === 'pencil-4' ? 'Prior valid machine comparison; final-mix hearing pending' : 'Editorial choice from source brief and technical timing; auditory quality unverified' });
}
const round = n => Math.round(n * 48000) / 48000;
function cue(id, assetId, sourceIn, sourceOut, anchor, contact, targetDb, pan = 0) {
  const samples = audio[assetId], begin = Math.round(sourceIn * 48000) * 2, end = Math.round(sourceOut * 48000) * 2;
  if (begin < 0 || end > samples.length || end <= begin) throw Error(`Invalid cut ${id}`);
  let peakRms = 0;
  for (let i = begin; i < end; i += 1920) {
    let sum = 0; const stop = Math.min(end, i + 1920);
    for (let j = i; j < stop; j++) sum += samples[j] ** 2;
    peakRms = Math.max(peakRms, Math.sqrt(sum / (stop - i)));
  }
  cues.push({ id, assetId, sourceInSeconds: round(sourceIn), sourceOutSeconds: round(sourceOut), sourceContactSeconds: round(anchor), timelineContactSeconds: round(contact), startSeconds: round(contact - anchor + sourceIn), gainDb: Number((targetDb - 20 * Math.log10(peakRms)).toFixed(6)), pan, intended20msRmsDbfsBeforeDucking: targetDb });
}
// Type accents follow rendered letter frames; spaces stay quiet.
for (const [i, f] of [3,5,7,9,13,15,17,19,23,25,27].entries()) cue(`opening-key-${i+1}`, 'card-pop-2', .004, .056, .014, f/30, -25 + (i%3)*.7);
for (const [i, f] of [396,398,400,402,403,407,409,410,412].entries()) cue(`until-key-${i+1}`, 'card-pop-2', .004, .046, .014, f/30, -26 + (i%3)*.6);
for (const [i, start] of [2.16,5.03,8.08].entries()) cue(`screen-pass-${i+1}`, 'paper-swipe-2', 1.05, 1.70, 1.408, start+.358, -21.5, .12);
for (const [i, contact] of [3.22,6.24,9.20].entries()) cue(`device-turn-${i+1}`, 'rotation-air-2', .296, 1.03, .564, contact, -21, -.08);
cue('camera-body', 'camera-contact-2', .10, .42, .136, 3.82, -17.5);
cue('camera-focus', 'camera-contact-2', .119, .182, .136, 3.66, -25.5);
cue('phone-body', 'phone-contact-2', .145, .46, .180, 6.84, -18.5);
cue('laptop-body', 'laptop-contact-1', .23, .54, .268, 9.80, -17.5);
for (const [id, t] of [['launch-word',1.58],['story-word',4.69],['grow-word',7.68]]) cue(id, 'card-pop-2', .004, .056, .014, t, -26);
cue('problem-final-word', 'card-pop-2', .004, .056, .014, 11.04, -30);
cue('warm-pivot-pull', 'reverse-air-1', 1.236, 1.746, 1.646, 13.03, -22);
cue('orb-pull', 'reverse-air-1', 1.086, 1.68, 1.646, 14.83, -24);
cue('orb-focus-body', 'orb-inward-1', 0, .25, .056, 14.83, -20);
for (const [i, t] of [17.65,18.86,20.80].entries()) cue(`message-arrival-${i+1}`, 'card-pop-2', .004, .062, .014, t, -18.5);
cue('dialogue-exit', 'paper-swipe-2', 1.25, 1.57, 1.408, 22.638, -23);
cue('direction-final-word', 'card-pop-2', .004, .056, .014, 24.08, -28);
cue('outline-friction', 'pencil-4', 1.008, 1.940, 1.888, 26.18, -22.5);
cue('outline-complete', 'card-pop-2', .004, .056, .014, 26.18, -26);
cue('workflow-fan', 'paper-swipe-2', 1.10, 1.58, 1.408, 27.128, -25);
for (const [i, t] of [27.02,27.25,27.30].entries()) cue(`workflow-card-${i+1}`, 'card-pop-2', .004, .046, .014, t, -23.5, [0,-.15,.15][i]);
cue('brand-gather', 'reverse-air-1', 1.236, 1.69, 1.646, 29.28, -21.5);
cue('brand-contact', 'phone-contact-2', .145, .40, .180, 29.28, -20);
cue('brand-body-resolve', 'orb-inward-1', 0, .78, .056, 29.28, -19);
const manifest = {
  schemaVersion: 1, mode: 'new-only-sfx-replacement',
  output: 'workflows/assets/grifon-motion-upgrade/grifon-full-upgrade-elevenlabs-sfx-review-1080p.mp4',
  authorization: 'Neil: Bro ikaw nalng pumili, okay na yan. Nakakapagod kung pipili pa ko',
  scope: 'Agent-selected complete private review mix; no candidate-choice request to user; no new paid calls.',
  selectionEvidence: 'Pencil4 has a prior valid machine verdict. Other choices use creative brief, measured transients, available source character labels and short-tail fit. These are not claims of direct hearing or a completed four-way audible comparison.',
  substitutions: 'Existing card-pop provides tactile type accents; short camera mechanism slice accents lens focus; inward pulse and phone contact form the brand punctuation. No new family generation is needed for this review.',
  rights: 'Private review only: selected sources predate the paid ElevenLabs subscription.',
  auditoryQa: 'Not independently heard. User delegated selection; technical checks cannot establish taste.',
  assets, cues,
};
fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ manifest: path.relative(ROOT, file), assets: assets.length, cues: cues.length, paidCalls: 0 }));
