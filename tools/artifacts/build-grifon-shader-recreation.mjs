// Only the finished Grifon export is embedded. Reference footage stays private.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { finalize } from './_gates.mjs';
import { assertPlayerScriptSyntax } from '../../workflows/assets/grifon-motion-action-pilot/verify-player.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = path.join(ROOT, 'workflows/assets/grifon-shader-recreation');
const FILE = 'grifon-recreation-landscape-provisional.mp4';
const TEMPLATE = path.join(ROOT, 'tools/artifacts/grifon-shader-recreation.tpl.html');
const OUTPUT = path.join(ROOT, 'artifacts/grifon-shader-recreation.html');
const RECEIPT = path.join(DIR, 'qa/player-build.json');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = relative => fs.readFile(path.join(DIR, relative));

const [bytes, poster, mediaBytes, recipeBytes, audioBytes, templateBytes] = await Promise.all([
  read(FILE), read('qa/full-poster.png'), read('qa/full-media.json'),
  read('audio.json'), read('qa/audio-verification.json'), fs.readFile(TEMPLATE),
]);
const media = JSON.parse(mediaBytes);
const recipe = JSON.parse(recipeBytes);
const audioVerification = JSON.parse(audioBytes);
const fail = message => { throw Error(`Finished player input rejected: ${message}`); };
if (media.file !== FILE || media.bytes !== bytes.length || media.sha256 !== sha(bytes)) fail('media receipt does not match the finished MP4');
if (media.frames !== 932 || media.fps !== '30000/1001' || JSON.stringify(media.dimensions) !== '[1920,1080]') fail('native landscape contract does not match');
if (!Number.isFinite(media.duration) || Math.abs(media.duration - 31.146667) > .003) fail('container duration does not match');
if (!Number.isFinite(media.videoDuration) || Math.abs(media.videoDuration - 932 * 1001 / 30000) > .00001) fail('video duration does not match 932 native frames');
if (media.strictDecode !== 'PASS' || media.prefixFramesVerified !== 222) fail('strict decode or frozen opening verification is absent');
if (media.audio?.codec !== 'aac' || media.audio.sampleRate !== 48000 || media.audio.channels !== 2) fail('finished AAC soundtrack verification is absent');
if (media.audioProvenance?.sonicStatus !== 'SONIC_UNVERIFIED' || !/^[a-f0-9]{64}$/.test(media.audioProvenance.masterSha256 || '')) fail('provisional soundtrack provenance is absent');
if (recipe.status !== 'PROVISIONAL_SONIC_UNVERIFIED' || recipe.music?.id !== 'digital-clouds' || recipe.providerCalls !== 0 || recipe.newSpendUsd !== 0) fail('audio recipe is not the free provisional candidate');
if (audioVerification.status !== 'TECHNICAL_PASS_SONIC_UNVERIFIED' || audioVerification.recipeSha256 !== sha(recipeBytes) || audioVerification.aac?.find(item => item.file === 'assets/audio/mix-master.m4a')?.sha256 !== media.audioProvenance.masterSha256) fail('finished soundtrack is not bound to the verified full audio master');
if (poster.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || poster.readUInt32BE(16) !== 1920 || poster.readUInt32BE(20) !== 1080) fail('poster is not a native landscape PNG');

const film = {
  filename: FILE, bytes: bytes.length, sha256: sha(bytes), duration: media.duration,
  videoDuration: media.videoDuration, frames: media.frames, fps: media.fps,
  dimensions: media.dimensions, src: `data:video/mp4;base64,${bytes.toString('base64')}`,
  poster: `data:image/png;base64,${poster.toString('base64')}`,
};
const raw = templateBytes.toString('utf8').replace('__FILM_JSON__', JSON.stringify(film)).replaceAll('__DURATION__', media.duration.toFixed(2));
const html = finalize(raw, {
  label: 'grifon-shader-recreation',
  required: ['<meta charset="utf-8">', '<title>', 'class="ground"', 'class="grain"', 'id="film"', 'id="play"', 'id="restart"', 'id="audio"', 'id="download"', 'id="scrub"', '</html>'],
  leftover: [/__[A-Z_]+__/g],
  banned: [['external resource', /(?:src|href)=["']https?:/i]],
});
assertPlayerScriptSyntax(html);
if (Buffer.byteLength(html) > 95000000) throw Error('Standalone twin exceeds the safe GitHub file budget');
const receipt = JSON.stringify({
  artifact: 'artifacts/grifon-shader-recreation.html', bytes: Buffer.byteLength(html), sha256: sha(Buffer.from(html)),
  media: {file: FILE, bytes: film.bytes, sha256: film.sha256, dimensions: film.dimensions, frames: film.frames, fps: film.fps, duration: film.duration, videoDuration: film.videoDuration},
  inputs: {
    'tools/artifacts/build-grifon-shader-recreation.mjs': sha(await fs.readFile(fileURLToPath(import.meta.url))),
    'tools/artifacts/grifon-shader-recreation.tpl.html': sha(templateBytes),
    'tools/artifacts/_gates.mjs': sha(await fs.readFile(path.join(ROOT, 'tools/artifacts/_gates.mjs'))),
    'qa/full-media.json': sha(mediaBytes), 'qa/full-poster.png': sha(poster), 'audio.json': sha(recipeBytes), 'qa/audio-verification.json': sha(audioBytes),
  },
  embeddedMedia: 'Finished Grifon MP4 and its poster only',
  download: 'Original MP4 bytes, decoded from the same inline payload',
  soundtrack: 'PROVISIONAL_SONIC_UNVERIFIED',
  directListening: 'PENDING',
  externalRequests: 'Blocked by CSP; browser verification remains a separate gate',
}, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (await fs.readFile(OUTPUT, 'utf8') !== html || await fs.readFile(RECEIPT, 'utf8') !== receipt) throw Error('Player or receipt differs from its finished sources');
  console.log(`PASS: standalone twin and receipt reproduce exactly (${film.sha256}).`);
} else {
  await fs.writeFile(OUTPUT, html);
  await fs.writeFile(RECEIPT, receipt);
  console.log(`Built offline recreation player: ${Buffer.byteLength(html)} bytes, ${sha(Buffer.from(html))}`);
}
