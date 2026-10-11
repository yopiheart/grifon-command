// Versioned offline player for the new authored soundtrack; original delivery is preserved.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {finalize} from './_gates.mjs';
import {assertPlayerScriptSyntax} from '../../workflows/assets/grifon-motion-action-pilot/verify-player.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(root, 'workflows/assets/grifon-shader-recreation');
const file = 'grifon-recreation-landscape-sound-v1.mp4';
const output = path.join(root, 'artifacts/grifon-shader-sound-v1.html');
const receiptFile = path.join(dir, 'qa/sound-v1-player-build.json');
const templateFile = path.join(root, 'tools/artifacts/grifon-shader-recreation.tpl.html');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = relative => fs.readFile(path.join(dir, relative));
const [bytes, poster, mediaBytes, recipeBytes, verificationBytes, packetBytes, templateBytes] = await Promise.all([
  read(file), read('qa/full-poster.png'), read('sound-v1/qa/media.json'),
  read('sound-v1/sound-spec.json'), read('sound-v1/qa/mix-verification.json'), read('sound-v1/qa/packets.json'), fs.readFile(templateFile),
]);
const media = JSON.parse(mediaBytes), recipe = JSON.parse(recipeBytes), verification = JSON.parse(verificationBytes);
const packets = JSON.parse(packetBytes);
const fail = message => {throw Error(`Sound player input rejected: ${message}`);};
if (media.file !== file || media.bytes !== bytes.length || media.sha256 !== hash(bytes)) fail('finished MP4 differs from its media receipt');
if (media.frames !== 932 || media.fps !== '30000/1001' || JSON.stringify(media.dimensions) !== '[1920,1080]') fail('native picture contract differs');
if (media.strictDecode !== 'PASS' || media.picturePreservation?.status !== 'PASS' || media.picturePreservation.packetsVerified !== 932 || media.picturePreservation.sourceSilentSha256 !== 'e57f2fae3a7a7b7ded9dcce63ed98cd9c88136fd595a1765cffa3669a878df3b') fail('frozen picture preservation is not verified');
if (packets.filmSha256 !== media.sha256 || media.timeBase !== '1/30000' || !Array.isArray(packets.originalVideoPackets) || !Array.isArray(packets.finalVideoPackets) || packets.originalVideoPackets.length !== 932 || packets.finalVideoPackets.length !== 932) fail('native packet receipt differs');
for (let n = 0; n < 932; n++) {
  const original = packets.originalVideoPackets[n], current = packets.finalVideoPackets[n];
  if (['pts','dts','duration','size','flags','data_hash'].some(key => original[key] !== current[key]) || Number(current.duration) !== 1001) fail(`preserved packet differs at ${n}`);
}
const firstTick = Math.min(...packets.finalVideoPackets.map(p => Number(p.pts)));
const endTick = Math.max(...packets.finalVideoPackets.map(p => Number(p.pts) + Number(p.duration)));
const nativeVideoDuration = (endTick - firstTick) / 30000;
if (firstTick !== 0 || endTick !== 932932 || !Number.isFinite(nativeVideoDuration) || Math.abs(nativeVideoDuration - 932 * 1001 / 30000) > .00001) fail('native packet timeline differs');
// MP4 track duration is rounded to milliseconds; native timing comes from copied packets.
if (!Number.isFinite(media.videoDuration) || media.videoDuration !== Math.round(nativeVideoDuration * 1000) / 1000 || !Number.isFinite(media.duration) || Math.abs(media.duration - 31.146667) > .003) fail('measured track/container duration differs');
if (verification.status !== 'TECHNICAL_SOUND_PASS_LISTENING_PENDING' || verification.recipeSha256 !== hash(recipeBytes) || verification.mediaSha256 !== media.sha256) fail('sound verification is not bound to the recipe and film');
if (!Array.isArray(recipe.cues) || recipe.cues.length < 20 || verification.cueCount !== recipe.cues.length || recipe.providerCalls !== 0 || recipe.newSpendUsd !== 0 || verification.providerCalls !== 0 || verification.paidSpendUsd !== 0) fail('authored free motion cues are missing');
if (poster.subarray(0,8).toString('hex') !== '89504e470d0a1a0a' || poster.readUInt32BE(16) !== 1920 || poster.readUInt32BE(20) !== 1080) fail('native poster differs');

const film = {filename:file, bytes:bytes.length, sha256:hash(bytes), duration:media.duration,
  videoDuration:nativeVideoDuration, measuredVideoTrackDuration:media.videoDuration, frames:media.frames, fps:media.fps, dimensions:media.dimensions,
  src:`data:video/mp4;base64,${bytes.toString('base64')}`, poster:`data:image/png;base64,${poster.toString('base64')}`};
const template = templateBytes.toString('utf8')
  .replace('Launch film recreation</title>', 'Launch film / Sound edit v1</title>')
  .replace('// GRIFON / PRIVATE REVIEW', '// GRIFON / SOUND EDIT V1')
  .replaceAll('grifon-recreation-landscape-provisional.mp4', file)
  .replace('Provisional soundtrack</strong>', 'Music + motion SFX</strong>')
  .replace('An alternate music mix is used for this review. Sound similarity and direct listening remain pending.', `Close Up music with ${recipe.cues.length} authored motion cues for camera moves, material cuts, UI actions and the Grifon reveal.`)
  .replaceAll('provisional soundtrack', 'new sound mix')
  .replaceAll('Provisional soundtrack', 'New sound mix')
  .replace('Actual Script and Storyboard views use manually prepared example content.', 'Actual Script and Storyboard views use manually prepared example content. The cropped G, R, a and C at 14.8-16.6 seconds are decorative material demonstrations; they are not an acronym.');
const raw = template.replace('__FILM_JSON__', JSON.stringify(film)).replaceAll('__DURATION__', media.duration.toFixed(2));
const html = finalize(raw, {label:'grifon-shader-sound-v1',
  required:['<meta charset="utf-8">','<title>','class="ground"','class="grain"','id="film"','id="play"','id="restart"','id="audio"','id="download"','id="scrub"','Music + motion SFX','</html>'],
  leftover:[/__[A-Z_]+__/g], banned:[['external resource',/(?:src|href)=["']https?:/i]],
});
assertPlayerScriptSyntax(html);
if (Buffer.byteLength(html) > 95000000) fail('standalone file exceeds GitHub file budget');
const receipt = JSON.stringify({artifact:'artifacts/grifon-shader-sound-v1.html',bytes:Buffer.byteLength(html),sha256:hash(Buffer.from(html)),
  media:{file,bytes:bytes.length,sha256:media.sha256,dimensions:media.dimensions,frames:media.frames,fps:media.fps,duration:media.duration,nativeVideoDuration,measuredVideoTrackDuration:media.videoDuration},
  inputs:{'tools/artifacts/build-grifon-shader-sound-v1.mjs':hash(await fs.readFile(fileURLToPath(import.meta.url))),
    'tools/artifacts/grifon-shader-recreation.tpl.html':hash(templateBytes),'tools/artifacts/_gates.mjs':hash(await fs.readFile(path.join(root,'tools/artifacts/_gates.mjs'))),
    'qa/full-poster.png':hash(poster),'sound-v1/qa/media.json':hash(mediaBytes),'sound-v1/sound-spec.json':hash(recipeBytes),'sound-v1/qa/mix-verification.json':hash(verificationBytes),'sound-v1/qa/packets.json':hash(packetBytes)},
  soundtrack:'AUTHORED_MUSIC_AND_MOTION_SFX',cueCount:recipe.cues.length,subjectiveListening:'PENDING_HUMAN_REVIEW',
  embeddedMedia:'Finished Grifon MP4 and existing poster only; raw music and isolated effects remain private',
  download:'Original MP4 bytes from the same inline payload',externalRequests:'Blocked by CSP; browser smoke is a separate gate'},null,2)+'\n';
if (process.argv.includes('--check')) {
  if (await fs.readFile(output,'utf8') !== html || await fs.readFile(receiptFile,'utf8') !== receipt) fail('player or receipt does not reproduce exactly');
  console.log(JSON.stringify({status:'PASS',mode:'check',filmSha256:media.sha256}));
} else {
  await fs.writeFile(output,html,{flag:'wx'});
  await fs.writeFile(receiptFile,receipt,{flag:'wx'});
  console.log(JSON.stringify({status:'BUILT',bytes:Buffer.byteLength(html),sha256:hash(Buffer.from(html)),filmSha256:media.sha256}));
}
