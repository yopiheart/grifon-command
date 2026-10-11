// Free, deterministic soundtrack pass. Licensed recordings and stems stay private.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ASSET = path.dirname(HERE);
const REPO = path.resolve(ASSET, '../../..');
const PRIMARY = 'C:/Users/ADMIN/Desktop/grifon-command';
const FFMPEG = path.join(PRIMARY, 'node_modules/ffmpeg-static/ffmpeg.exe');
const FFPROBE = path.join(PRIMARY, '.tools/media-runtime/node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe');
const SHA = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const hash = file => SHA(fs.readFileSync(file));
const relative = file => path.relative(ASSET, file).replaceAll('\\', '/');
const binding = file => ({ file: relative(file), bytes: fs.statSync(file).size, sha256: hash(file) });
const fail = message => { throw Error(message); };
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const canonicalSpec = path.join(HERE, 'sound-spec.json');
const args = process.argv.slice(2);
const mode = args.shift();
if (!['--validate', '--controls', '--build'].includes(mode)) fail('Use build-sound.mjs --validate|--controls|--build [--spec <file>]');
let specFile = canonicalSpec;
if (args.length) {
  if (args.length !== 2 || args[0] !== '--spec' || mode !== '--validate') fail('Only --validate accepts --spec <file>');
  specFile = path.resolve(args[1]);
}
const spec = json(specFile);
const initialRecipeSha256 = hash(specFile);
const initialScriptSha256 = hash(fileURLToPath(import.meta.url));
const registeredFiles = {
  'close-up.mp3': [3045294, 'a7f05a29d07a84d38072ccd2b35204bca812db86e75b2a837e71cc144d3e739b'],
  'digital-clouds.mp3': [3232566, '71cd4ea39edcc7532672bd97311abadfd318d00e7a828310a88b4f57fad9cd48'],
  'sweep.wav': [138746, 'ca5a0206a7e6b12893a5727cb98a9d43ab02893153465eb21d43fb7b9e6616c3'],
  'air-zoom.wav': [224908, '62d46c7faeaa2860f5ba94657be00d7604e8693f143b22291968d28043c70bfa'],
  'shutter.wav': [62562, '0a38265f932837141d9fc6a1da560a919139ed621d330418090d4ddf6cb8e824'],
  'lens.wav': [217348, 'f4bf440c8328691c630d3a9d017846bcf05cdfc288cbc0676b96cb8dac8bb9a3'],
  'tech-select.wav': [88930, '00270a1847195cddb82d1b10c9407880ce311f522284afaefdc218fbba70d3ed'],
  'key.wav': [58022, '04837e10d65b23aede5626d833e4e46001e90e908817200da1dcf21a51d36205'],
  'bubble.wav': [54050, 'd30ea323e13539d10bc054ed7c971078433314878ea5711a55d0aef63619552f'],
  'gear.wav': [200748, 'c05e7e46c1d5b9d18e9fe64161d1cc567ebfcfc2674959b6e3dd4947904cc2af']
};
const SR = 48000, N = 1495040;
const nativeSample = frame => Math.round(frame * 1001 / 30000 * SR);
const nativeSeconds = frame => frame * 1001 / 30000;
const finite = value => Number.isFinite(value);
const gain = db => 10 ** (db / 20);
const db = value => value > 0 ? 20 * Math.log10(value) : null;
const lerp = (a, b, ratio) => a + (b - a) * ratio;

function validate(candidate) {
  if (candidate.schemaVersion !== 1 || candidate.sampleRate !== SR || candidate.sampleFrames !== N || candidate.channels !== 2 || candidate.videoFrames !== 932 || candidate.fpsNumerator !== 30000 || candidate.fpsDenominator !== 1001 || candidate.providerCalls !== 0 || candidate.newSpendUsd !== 0) fail('Fixed native/free soundtrack contract differs');
  if (!Array.isArray(candidate.cues) || candidate.cues.length !== 47) fail('Exactly 47 authored SFX cue events are required; a music-only recipe is ineligible');
  if (candidate.music.file !== 'close-up.mp3' || candidate.music.sha256 !== registeredFiles['close-up.mp3'][1] || candidate.music.bytes !== registeredFiles['close-up.mp3'][0]) fail('Registered Close Up music binding differs');
  if (candidate.music.playbackRate !== 1 || candidate.music.sourceInSeconds !== 63.07 || Math.abs(candidate.music.sourceOutSeconds - (63.07 + N / SR)) > 1e-9 || !finite(candidate.music.gainDb)) fail('Continuous approved music region differs');
  if (candidate.video.file !== 'grifon-recreation-landscape-silent.mp4' || candidate.video.sha256 !== 'e57f2fae3a7a7b7ded9dcce63ed98cd9c88136fd595a1765cffa3669a878df3b' || candidate.output !== 'grifon-recreation-landscape-sound-v1.mp4') fail('Frozen silent picture or new output name differs');
  if (candidate.sourceRoot !== 'workflows/assets/grifon-reference-full/assets/audio-v07/sources' || candidate.sourceRegister !== 'workflows/assets/grifon-reference-full/assets/audio-v07/source-manifest.json' || candidate.sourceCredits !== 'workflows/assets/grifon-reference-full/assets/audio-v07/SOURCES.md') fail('Source paths differ from registered local assets');
  if (candidate.sfxPreparation.highpassHz !== 90 || candidate.sfxPreparation.lowpassHz !== 10500 || candidate.sfxPreparation.endTaperMilliseconds !== 4) fail('SFX preparation differs');
  const ids = new Set();
  for (const cue of candidate.cues) {
    if (ids.has(cue.id) || typeof cue.id !== 'string' || !Number.isInteger(cue.frame) || cue.frame < 0 || cue.frame > 931 || !Array.isArray(cue.layers) || !cue.layers.length) fail('Invalid or duplicate cue');
    ids.add(cue.id);
    for (const layer of cue.layers) {
      if (!(layer.source === 'sub' || Object.hasOwn(candidate.trim, layer.source) && Object.hasOwn(registeredFiles, `${layer.source}.wav`)) || !finite(layer.rate) || layer.rate < .7 || layer.rate > 1.4 || !finite(layer.gainDb) || layer.gainDb < -40 || layer.gainDb > -10 || !Array.isArray(layer.pan) || layer.pan.length !== 2 || layer.pan.some(value => !finite(value) || Math.abs(value) > .6) || layer.reverse !== undefined && typeof layer.reverse !== 'boolean') fail('Invalid SFX layer recipe');
    }
  }
  const expectedFrames = [26,57,82,91,97,104,111,119,126,132,145,209,222,229,238,258,307,344,357,377,391,397,400,403,407,417,445,459,471,483,496,514,547,567,586,590,596,600,603,608,626,636,637,638,639,665,834];
  if (JSON.stringify(candidate.cues.map(cue => cue.frame)) !== JSON.stringify(expectedFrames)) fail('Cue contacts differ from the inspected native-frame map');
  for (const [name, trim] of Object.entries(candidate.trim)) if (!Object.hasOwn(registeredFiles, `${name}.wav`) || !Array.isArray(trim) || trim.length !== 2 || trim.some(value => !finite(value)) || trim[0] < 0 || trim[1] <= trim[0]) fail('Invalid SFX trim');
  if (candidate.fades.openingSeconds !== .06 || candidate.fades.endStartFrame !== 834 || candidate.fades.endCurve !== 'quadratic' || candidate.fades.endSample !== N) fail('Native opening/end fade differs');
  if (!candidate.musicShape.every((item, index, items) => Array.isArray(item) && item.length === 2 && Number.isInteger(item[0]) && finite(item[1]) && item[1] <= 0 && item[1] >= -8 && (!index || item[0] > items[index - 1][0])) || candidate.musicShape[0][0] !== 0 || candidate.musicShape.at(-1)[0] !== 834) fail('Invalid music shape');
  const duck = candidate.ducking;
  if (![duck.attackSeconds, duck.holdSeconds, duck.releaseSeconds, duck.depthDb].every(finite) || duck.attackSeconds <= 0 || duck.releaseSeconds <= 0 || duck.holdSeconds < 0 || duck.depthDb < 2 || duck.depthDb > 4 || !duck.frames.every(frame => expectedFrames.includes(frame))) fail('Invalid main gesture duck');
  if (duck.gaps.length !== 2 || duck.gaps[0].startFrame !== 410 || duck.gaps[0].endFrame !== 417 || duck.gaps[1].startFrame !== 636 || duck.gaps[1].endFrame !== 648 || duck.gaps.some(item => ![item.depthDb,item.attackSeconds,item.releaseSeconds].every(finite) || item.depthDb < 8 || item.depthDb > 16 || item.attackSeconds <= 0 || item.releaseSeconds <= 0)) fail('Invalid brief breathing gaps');
  const sub = candidate.subImpact;
  if (![sub.durationSeconds,sub.frequencyStartHz,sub.frequencyEndHz,sub.attackSeconds,sub.decaySeconds,sub.endTaperSeconds,sub.phaseRadians].every(finite) || sub.durationSeconds !== .28 || sub.frequencyStartHz !== 92 || sub.frequencyEndHz !== 46 || sub.attackSeconds !== .006 || sub.decaySeconds !== .075 || sub.endTaperSeconds !== .018 || sub.phaseRadians !== 0) fail('Invalid deterministic sub recipe');
  const mastering = candidate.mastering;
  if (mastering.targetIntegratedLufs !== -15.2 || mastering.maximumMasterTruePeakDbtp !== -2.2 || mastering.minimumEncodedLufs !== -16.5 || mastering.maximumEncodedLufs !== -14 || mastering.maximumEncodedTruePeakDbtp !== -1.5 || mastering.aacBitrate !== '224k') fail('Master quality contract differs');
  const register = json(path.join(REPO, candidate.sourceRegister));
  for (const [file, [bytes, sha256]] of Object.entries(registeredFiles)) {
    const row = register.files.find(item => item.file === file);
    const source = path.join(PRIMARY, candidate.sourceRoot, file);
    if (!row || row.bytes !== bytes || row.sha256 !== sha256 || fs.lstatSync(source).isSymbolicLink() || fs.statSync(source).size !== bytes || hash(source) !== sha256) fail(`Registered source bytes differ: ${file}`);
  }
  if (hash(path.join(ASSET, candidate.video.file)) !== candidate.video.sha256) fail('Frozen silent picture bytes differ');
  return { cueCount: candidate.cues.length, sourcesChecked: 10, videoChecked: true };
}
const validated = validate(spec);
if (mode === '--validate') { console.log(JSON.stringify({ status: 'PASS', ...validated })); process.exit(0); }

fs.mkdirSync(path.join(HERE, 'qa'), { recursive: true });
if (mode === '--controls') {
  const folder = path.join(HERE, '.tmp/controls');
  if (fs.existsSync(folder) || fs.existsSync(path.join(HERE, 'qa/controls.json'))) fail('Controls history exists; refusing overwrite');
  fs.mkdirSync(folder, { recursive: true });
  const original = json(path.join(ASSET, 'audio.json'));
  const empty = structuredClone(spec); empty.cues = original.cues;
  const changed = structuredClone(spec); changed.music.sha256 = '0'.repeat(64);
  const controlRows = [];
  for (const [name, fixture, expected] of [['original-music-only-cues', empty, '47 authored SFX'], ['changed-source-binding', changed, 'music binding differs']]) {
    const file = path.join(folder, `${name}.json`); write(file, fixture);
    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--validate', '--spec', file], { encoding: 'utf8', timeout: 30000 });
    const rejects = result.status !== 0 && result.stderr.includes(expected);
    controlRows.push({ name, status: rejects ? 'PASS' : 'FAIL', actualExitCode: result.status, fixtureSha256: hash(file), error: result.stderr.slice(-1600), originalRecipeSha256: name.startsWith('original') ? hash(path.join(ASSET, 'audio.json')) : undefined, originalCueCount: name.startsWith('original') ? original.cues.length : undefined });
  }
  const receipt = { status: controlRows.every(row => row.status === 'PASS') ? 'PASS' : 'FAIL', scriptSha256: hash(fileURLToPath(import.meta.url)), recipeSha256: hash(canonicalSpec), controls: controlRows, method: 'Actual child-process validation of fixtures; empty cue array is taken from the preserved original music-only recipe. Changed hash mutates the recipe binding, not original source bytes.', providerCalls: 0, paidSpendUsd: 0 };
  write(path.join(HERE, 'qa/controls.json'), receipt);
  console.log(JSON.stringify(receipt)); if (receipt.status !== 'PASS') process.exitCode = 1;
  process.exit(process.exitCode || 0);
}

const work = path.join(HERE, '.tmp/build');
const output = path.join(ASSET, spec.output);
for (const file of [work, output, path.join(HERE, 'qa/media.json'), path.join(HERE, 'qa/mix-verification.json')]) if (fs.existsSync(file)) fail(`Existing output/history; refusing overwrite: ${relative(file)}`);
fs.mkdirSync(work, { recursive: true });
const startedAt = new Date().toISOString();
const commands = [];
function run(tool, arguments_, binary = false) {
  const result = spawnSync(tool, arguments_, { encoding: binary ? null : 'utf8', maxBuffer: 96 * 1024 * 1024, timeout: 60000 });
  commands.push({ tool: path.basename(tool), args: arguments_, exitCode: result.status });
  if (result.status !== 0) fail(`${path.basename(tool)} failed (${result.status}): ${result.stderr?.toString().slice(-3000)}`);
  return { stdout: result.stdout, stderr: result.stderr.toString() };
}
const ff = (arguments_, binary = false) => run(FFMPEG, ['-nostdin', '-hide_banner', ...arguments_], binary);
const probe = file => JSON.parse(run(FFPROBE, ['-v','error','-count_frames','-show_streams','-show_format','-show_data_hash','sha256','-of','json',file]).stdout);
const packets = (file, selector) => JSON.parse(run(FFPROBE, ['-v','error','-select_streams',selector,'-show_packets','-show_data_hash','sha256','-of','json',file]).stdout).packets;
const decode = (file, filter) => ff(['-v','error','-xerror','-i',file,'-map','0:a:0',...(filter ? ['-af',filter] : []),'-ar',String(SR),'-ac','2','-c:a','pcm_f32le','-f','f32le','pipe:1'],true).stdout;
const meter = file => { const text = ff(['-i',file,'-map','0:a:0','-af','loudnorm=I=-15.2:TP=-2.2:LRA=14:print_format=json','-f','null','-']).stderr; return JSON.parse(text.slice(text.lastIndexOf('{'),text.lastIndexOf('}')+1)); };
const publicWrite = (name, value) => write(path.join(HERE, 'qa', name), value);
const protectedNames = [spec.video.file,'grifon-recreation-landscape-provisional.mp4','audio.json','audio-mix.mjs',...Object.keys(json(path.join(ASSET,'qa/full-media.json')).sources)];
const protectedBinding = () => Object.fromEntries(protectedNames.map(name => [name,binding(path.join(ASSET,name))]));
const before = protectedBinding();
const sourceBinding = () => Object.fromEntries(Object.keys(registeredFiles).map(name => [name,{file:`${spec.sourceRoot}/${name}`,bytes:fs.statSync(path.join(PRIMARY,spec.sourceRoot,name)).size,sha256:hash(path.join(PRIMARY,spec.sourceRoot,name))}]));
const sourcesBefore = sourceBinding();
const musicDecoded = decode(path.join(PRIMARY,spec.sourceRoot,spec.music.file));
const sourceInSample = Math.round(spec.music.sourceInSeconds * SR);
if (musicDecoded.length / 8 < sourceInSample + N) fail('Music cannot supply the complete continuous region');
const musicSource = musicDecoded.subarray(sourceInSample * 8,(sourceInSample + N) * 8);
const music = new Float32Array(N*2), effects = new Float32Array(N*2), envelope = new Float32Array(N);
function shapeDb(frame) {
  const points = spec.musicShape;
  for (let index=1; index<points.length; index++) if (frame <= points[index][0]) return lerp(points[index-1][1],points[index][1],(frame-points[index-1][0])/(points[index][0]-points[index-1][0]));
  return points.at(-1)[1];
}
function pulseDuck(t, start, end, depth, attack, release) {
  if (t < start-attack || t > end+release) return 0;
  if (t < start) return depth * (.5-.5*Math.cos(Math.PI*(t-start+attack)/attack));
  if (t <= end) return depth;
  return depth * (.5+.5*Math.cos(Math.PI*(t-end)/release));
}
function fadeAt(sample) {
  const endStart = nativeSample(spec.fades.endStartFrame);
  let value = Math.min(1,sample/(spec.fades.openingSeconds*SR));
  if (sample >= endStart) value *= ((N-1-sample)/(N-1-endStart)) ** 2;
  return Math.max(0,value);
}
const duckRows = [];
for (let sample=0; sample<N; sample++) {
  const t=sample/SR, frame=t*30000/1001;
  let duck=0;
  for (const contact of spec.ducking.frames) duck=Math.max(duck,pulseDuck(t,nativeSeconds(contact),nativeSeconds(contact)+spec.ducking.holdSeconds,spec.ducking.depthDb,spec.ducking.attackSeconds,spec.ducking.releaseSeconds));
  for (const gap of spec.ducking.gaps) duck=Math.max(duck,pulseDuck(t,nativeSeconds(gap.startFrame),nativeSeconds(gap.endFrame),gap.depthDb,gap.attackSeconds,gap.releaseSeconds));
  const volume=gain(spec.music.gainDb+shapeDb(frame)-duck)*fadeAt(sample);
  envelope[sample]=volume;
  music[sample*2]=musicSource.readFloatLE(sample*8)*volume;
  music[sample*2+1]=musicSource.readFloatLE(sample*8+4)*volume;
  if (sample%480===0) duckRows.push({sample,seconds:t,shapeDb:shapeDb(frame),duckDb:duck,totalMusicGain:volume});
}
function monoPrepared(name) {
  const data=decode(path.join(PRIMARY,spec.sourceRoot,`${name}.wav`),`highpass=f=90,lowpass=f=10500`);
  const [a,b]=spec.trim[name].map(value=>Math.round(value*SR));
  if (b*8>data.length) fail(`SFX trim exceeds decoded source: ${name}`);
  const mono=new Float64Array(b-a); let peak=0;
  for(let index=0;index<mono.length;index++){mono[index]=(data.readFloatLE((a+index)*8)+data.readFloatLE((a+index)*8+4))*.5;peak=Math.max(peak,Math.abs(mono[index]));}
  if (!(peak>0)) fail(`Empty SFX recording: ${name}`);
  for(let index=0;index<mono.length;index++)mono[index]/=peak;
  return {mono,trimStartSample:a,trimEndSample:b,rawTrimPeak:peak,filteredDecodeSha256:SHA(data)};
}
const prepared=Object.fromEntries(Object.keys(spec.trim).map(name=>[name,monoPrepared(name)]));
const sub=new Float64Array(Math.round(spec.subImpact.durationSeconds*SR));
let phase=spec.subImpact.phaseRadians;
for(let sample=0;sample<sub.length;sample++) {
  const t=sample/SR, frequency=lerp(spec.subImpact.frequencyStartHz,spec.subImpact.frequencyEndHz,Math.min(1,t/.12));
  phase+=2*Math.PI*frequency/SR;
  const attack=Math.sin(Math.min(1,t/spec.subImpact.attackSeconds)*Math.PI/2)**2;
  const tail=Math.sin(Math.min(1,(sub.length-1-sample)/(spec.subImpact.endTaperSeconds*SR))*Math.PI/2)**2;
  sub[sample]=Math.sin(phase)*attack*Math.exp(-t/spec.subImpact.decaySeconds)*tail;
}
const subPeak=Math.max(...sub.map(Math.abs));
for(let sample=0;sample<sub.length;sample++)sub[sample]/=subPeak;
prepared.sub={mono:sub,selfAuthored:true};
const ledger=[];
for(const cue of spec.cues) {
  const contactSample=nativeSample(cue.frame), layers=[];
  for(let layerIndex=0;layerIndex<cue.layers.length;layerIndex++) {
    const layer=cue.layers[layerIndex], original=prepared[layer.source].mono;
    const count=Math.floor((original.length-1)/layer.rate)+1, stereo=new Float64Array(count*2);
    let peak=0,peakSample=0;
    for(let sample=0;sample<count;sample++) {
      let at=sample*layer.rate;if(layer.reverse)at=original.length-1-at;
      const first=Math.floor(at),fraction=at-first;
      const value=lerp(original[first],original[Math.min(first+1,original.length-1)],fraction);
      const taper=Math.sin(Math.min(1,sample/(.002*SR))*Math.PI/2)**2*Math.sin(Math.min(1,(count-1-sample)/(spec.sfxPreparation.endTaperMilliseconds/1000*SR))*Math.PI/2)**2;
      const pan=lerp(layer.pan[0],layer.pan[1],sample/(count-1));
      const angle=(pan+1)*Math.PI/4;
      stereo[sample*2]=value*taper*Math.cos(angle);stereo[sample*2+1]=value*taper*Math.sin(angle);
      const energy=Math.max(Math.abs(stereo[sample*2]),Math.abs(stereo[sample*2+1]));
      if(energy>peak){peak=energy;peakSample=sample;}
    }
    if(!(peak>0))fail(`Cue layer is empty: ${cue.id}`);
    const startSample=contactSample-peakSample;
    if(startSample<0||startSample+count>N)fail(`Cue outside film: ${cue.id}`);
    const scale=gain(layer.gainDb)/peak;
    const isolated=new Float32Array(count*2);
    for(let sample=0;sample<count;sample++)for(let channel=0;channel<2;channel++) {
      const value=stereo[sample*2+channel]*scale*fadeAt(startSample+sample);
      isolated[sample*2+channel]=value;
      effects[(startSample+sample)*2+channel]+=value;
    }
    const bytes=Buffer.from(isolated.buffer);
    fs.writeFileSync(path.join(work,`${cue.id}-${layerIndex}.f32le`),bytes,{flag:'wx'});
    layers.push({...layer,startSample,endSample:startSample+count,frames:count,localStrongestSample:peakSample,contactSample: startSample+peakSample,contactErrorSamples:0,contactQuantizationErrorSamples:contactSample-cue.frame*1001/30000*SR,preFadePeakGain:gain(layer.gainDb),isolatedPcmSha256:SHA(bytes),isolatedPcmBytes:bytes.length,fadeAtContact:fadeAt(contactSample),stereoPolicy:'Mono recording projection with continuous equal-power pan; no polarity inversion',strongestEvent:'Maximum absolute stereo sample after rate/reverse/pan/taper, before whole-film ending fade'});
  }
  ledger.push({id:cue.id,role:cue.role,frame:cue.frame,nativeSeconds:nativeSeconds(cue.frame),contactSample,layers});
}
const mixed=new Float32Array(N*2);
let nonfinite=0,maximumSample=0,maximumMusicEnvelopeError=0;
for(let index=0;index<mixed.length;index++) {
  mixed[index]=music[index]+effects[index];
  if(!finite(mixed[index]))nonfinite++;
  maximumSample=Math.max(maximumSample,Math.abs(mixed[index]));
  maximumMusicEnvelopeError=Math.max(maximumMusicEnvelopeError,Math.abs(music[index]-musicSource.readFloatLE(index*4)*envelope[Math.floor(index/2)]));
}
if(nonfinite||maximumSample>=1||maximumMusicEnvelopeError>1e-7)fail('Premix is clipped/nonfinite or music placement differs');
const pcmFiles={music:'music.f32le',effects:'sfx.f32le',mix:'premaster.f32le'};
for(const [key,pcm]of Object.entries({music,effects,mix:mixed}))fs.writeFileSync(path.join(work,pcmFiles[key]),Buffer.from(pcm.buffer),{flag:'wx'});
const premaster=path.join(work,'premaster.wav');
ff(['-v','error','-f','f32le','-ar',String(SR),'-ac','2','-i',path.join(work,pcmFiles.mix),'-c:a','pcm_f32le',premaster]);
const initial=meter(premaster);
const normalizationDb=Math.min(spec.mastering.targetIntegratedLufs-Number(initial.input_i),spec.mastering.maximumMasterTruePeakDbtp-Number(initial.input_tp));
if(Number(initial.input_i)+normalizationDb<spec.mastering.minimumEncodedLufs+.1)fail('Single linear master cannot reach loudness and headroom simultaneously');
const master=new Float32Array(mixed.length),scale=gain(normalizationDb);
for(let index=0;index<master.length;index++)master[index]=mixed[index]*scale;
const masterRaw=path.join(work,'master.f32le');fs.writeFileSync(masterRaw,Buffer.from(master.buffer),{flag:'wx'});
const masterWave=path.join(work,'master.wav');
ff(['-v','error','-f','f32le','-ar',String(SR),'-ac','2','-i',masterRaw,'-c:a','pcm_s24le',masterWave]);
const masterAac=path.join(work,'master.m4a');
ff(['-v','error','-i',masterWave,'-c:a','aac','-b:a',spec.mastering.aacBitrate,'-movflags','+faststart',masterAac]);
const stagedVideo=path.join(work,'candidate.mp4');
ff(['-v','error','-i',path.join(ASSET,spec.video.file),'-i',masterAac,'-map','0:v:0','-map','1:a:0','-c','copy','-movflags','+faststart',stagedVideo]);
ff(['-v','error','-xerror','-i',stagedVideo,'-f','null','-']);
const metadata=probe(stagedVideo),video=metadata.streams.find(item=>item.codec_type==='video'),audio=metadata.streams.find(item=>item.codec_type==='audio');
if(metadata.streams.length!==2||video.width!==1920||video.height!==1080||video.nb_read_frames!=='932'||video.avg_frame_rate!=='30000/1001'||video.r_frame_rate!=='30000/1001'||video.time_base!=='1/30000'||video.codec_name!=='h264'||video.pix_fmt!=='yuv420p'||audio.codec_name!=='aac'||audio.sample_rate!=='48000'||audio.channels!==2)fail('Native video/audio stream contract differs');
const originalVideoPackets=packets(path.join(ASSET,spec.video.file),'v:0'),finalVideoPackets=packets(stagedVideo,'v:0');
const packetFields=['pts','dts','duration','size','data_hash','flags'];
const videoPacketMismatches=[];
for(let index=0;index<Math.max(originalVideoPackets.length,finalVideoPackets.length);index++)if(packetFields.some(key=>originalVideoPackets[index]?.[key]!==finalVideoPackets[index]?.[key]))videoPacketMismatches.push(index);
if(originalVideoPackets.length!==932||videoPacketMismatches.length||video.extradata_hash!==probe(path.join(ASSET,spec.video.file)).streams[0].extradata_hash)fail('Video stream payload, timestamp or extradata preservation failed');
const frameMd5=file=>ff(['-v','error','-xerror','-i',file,'-map','0:v:0','-frames:v','222','-f','framemd5','pipe:1']).stdout;
const prefixA=frameMd5(path.join(ASSET,spec.video.file)),prefixB=frameMd5(stagedVideo);
if(prefixA!==prefixB||prefixA.split('\n').filter(line=>line.startsWith('0,')).length!==222)fail('Decoded opening prefix differs');
const masterPackets=packets(masterAac,'a:0'),filmPackets=packets(stagedVideo,'a:0');
if(masterPackets.length!==filmPackets.length||masterPackets.some((packet,index)=>packetFields.some(key=>packet[key]!==filmPackets[index][key])||JSON.stringify(packet.side_data_list)!==JSON.stringify(filmPackets[index].side_data_list)))fail('AAC master payload/timing/priming differs after mux');
const decoded=decode(stagedVideo),decodedMaster=decode(masterAac),decodedWave=decode(masterWave);
if(!decoded.equals(decodedMaster)||decoded.length!==N*8||decodedWave.length!==N*8)fail('Final AAC PCM count or master identity differs');
let maximumMasterLinearError=0,encodedNonfinite=0,encodedClips=0,encodedMaximum=0;
for(let index=0;index<N*2;index++) {
  maximumMasterLinearError=Math.max(maximumMasterLinearError,Math.abs(decodedWave.readFloatLE(index*4)-mixed[index]*scale));
  const value=decoded.readFloatLE(index*4); if(!finite(value))encodedNonfinite++;if(Math.abs(value)>=1)encodedClips++;encodedMaximum=Math.max(encodedMaximum,Math.abs(value));
}
const measured=meter(stagedVideo),measuredPcm=meter(masterWave);
if(Number(measured.input_i)<spec.mastering.minimumEncodedLufs||Number(measured.input_i)>spec.mastering.maximumEncodedLufs||Number(measured.input_tp)>spec.mastering.maximumEncodedTruePeakDbtp||encodedNonfinite||encodedClips||maximumMasterLinearError>4/8388608)fail('Encoded levels/samples or linear mastering outside contract');
function stats(pcm,first,last,raw=false) {
  let l2=0,r2=0,cross=0,mono2=0,peak=0;
  for(let sample=first;sample<last;sample++) {
    const l=raw?pcm.readFloatLE(sample*8):pcm[sample*2],r=raw?pcm.readFloatLE(sample*8+4):pcm[sample*2+1];
    l2+=l*l;r2+=r*r;cross+=l*r;mono2+=((l+r)*.5)**2;peak=Math.max(peak,Math.abs(l),Math.abs(r));
  }
  const count=last-first,energy=(l2+r2)/(count*2);
  return {firstSample:first,lastSample:last,rmsDbfs:db(Math.sqrt(energy)),peakDbfs:db(peak),leftRmsDbfs:db(Math.sqrt(l2/count)),rightRmsDbfs:db(Math.sqrt(r2/count)),zeroLagStereoCorrelation:l2*r2>0?cross/Math.sqrt(l2*r2):null,monoFoldEnergyRatio:energy>0?mono2/count/energy:null,monoFoldLossDb:energy>0?10*Math.log10(mono2/count/energy):null};
}
const windowRows=ledger.map(cue=>{const first=Math.max(0,cue.contactSample-Math.round(.07*SR)),last=Math.min(N,cue.contactSample+Math.round(.12*SR));return{id:cue.id,frame:cue.frame,music:stats(music,first,last),sfx:stats(effects,first,last),encoded:stats(decoded,first,last,true),note:'Energy windows measure cue presence, not perceived balance or hearing.'};});
const density=Array.from({length:Math.ceil(N/SR)},(_,second)=>({second,eventCount:ledger.filter(row=>row.nativeSeconds>=second&&row.nativeSeconds<second+1).length}));
const tailWindows=[stats(decoded,0,Math.round(.02*SR),true),stats(decoded,N-Math.round(.35*SR),N,true),stats(decoded,N-Math.round(.02*SR),N,true)];
if(tailWindows[1].rmsDbfs===null||tailWindows[1].rmsDbfs>-40||tailWindows[2].rmsDbfs===null||tailWindows[2].rmsDbfs>-70)fail('Encoded ending fade remains too energetic');
const masterStats=stats(master,0,N),musicStats=stats(music,0,N),sfxStats=stats(effects,0,N);
if(masterStats.monoFoldEnergyRatio<.35||sfxStats.monoFoldEnergyRatio<.8)fail('Stereo to mono energy cancellation is excessive');
const after=protectedBinding(),sourcesAfter=sourceBinding();
if(JSON.stringify(before)!==JSON.stringify(after)||JSON.stringify(sourcesBefore)!==JSON.stringify(sourcesAfter))fail('Frozen picture/source inputs changed during build');
validate(json(canonicalSpec));
if(hash(canonicalSpec)!==initialRecipeSha256||hash(fileURLToPath(import.meta.url))!==initialScriptSha256)fail('Recipe or producer changed during build');
fs.copyFileSync(stagedVideo,output,fs.constants.COPYFILE_EXCL);
if(hash(output)!==hash(stagedVideo))fail('Published candidate differs from verified staging file');
const result=binding(output),scriptSha256=hash(fileURLToPath(import.meta.url)),recipeSha256=hash(canonicalSpec);
publicWrite('sources.json',{register:binding(path.join(REPO,spec.sourceRegister)),credits:binding(path.join(REPO,spec.sourceCredits)),before:sourcesBefore,after:sourcesAfter,readAudioSources:['close-up.mp3',...Object.keys(spec.trim).map(name=>`${name}.wav`)],unusedRegisteredSource:'digital-clouds.mp3 (hash checked, not decoded)',musicRegion:{sourceInSample,sourceOutSample:sourceInSample+N,sourceInSeconds:sourceInSample/SR,sourceOutSeconds:(sourceInSample+N)/SR,continuous:true,playbackRate:1,sourceRegionPcmSha256:SHA(musicSource),maximumEnvelopeError:maximumMusicEnvelopeError},sfxPreparation:Object.fromEntries(Object.entries(prepared).filter(([key])=>key!=='sub').map(([key,value])=>[key,{trimStartSample:value.trimStartSample,trimEndSample:value.trimEndSample,rawTrimPeak:value.rawTrimPeak,filteredDecodeSha256:value.filteredDecodeSha256}])),providerCalls:0,paidSpendUsd:0});
publicWrite('cues.json',{recipeSha256,scriptSha256,sampleRate:SR,eventCount:ledger.length,layerCount:ledger.reduce((total,item)=>total+item.layers.length,0),contactMethod:spec.sfxPreparation.contact,ledger,duckEnvelope10ms:duckRows,density,windows:windowRows,interpretation:'Individual normalized recording contacts are aligned to their authored frame. Overlapping cues or music can have a different overall maximum. The frame834 cue is additionally attenuated by the final quadratic fade; no claim that its post-fade maximum stays at the same sample.'});
publicWrite('packets.json',{filmSha256:result.sha256,originalVideoPackets,finalVideoPackets,videoPacketMismatches,audioMasterPackets:masterPackets,finalAudioPackets:filmPackets,prefixDecodedFrameMd5Sha256:SHA(prefixA),prefixDecodedFramesVerified:222});
const verification={status:'TECHNICAL_SOUND_PASS_LISTENING_PENDING',startedAt,completedAt:new Date().toISOString(),recipeSha256,scriptSha256,mediaSha256:result.sha256,cueCount:ledger.length,layerCount:ledger.reduce((total,item)=>total+item.layers.length,0),sourceHashes:Object.fromEntries(Object.entries(sourcesBefore).map(([name,row])=>[name,row.sha256])),sourceBindingStatus:'PASS',frozenBefore:before,frozenAfter:after,sampleRate:SR,channels:2,pcmFrames:N,decodedAacFrames:decoded.length/8,aacPackets:filmPackets.length,decodedAacPcmSha256:SHA(decoded),pcmMaster:binding(masterWave),aacMaster:binding(masterAac),mastering:{firstPass:initial,normalizationDb,method:'Single sample-invariant linear gain, followed by 24-bit quantization and AAC encoding. No compressor, limiter, time stretch or music pitch changes.',maximumMasterLinearError,pcm:measuredPcm,encoded:measured},samples:{premasterMaximum:maximumSample,encodedMaximum,nonfinite:encodedNonfinite,clipped:encodedClips},stereoMono:{master:masterStats,music:musicStats,sfx:sfxStats,policy:'Music retains original stereo; authored SFX use same-polarity mono projection and equal-power pan. Energy preservation is measured, not a perceived headphone or speaker quality grade.'},fadeMeasurements:tailWindows,picturePreservation:{status:'PASS',sourceSilentSha256:spec.video.sha256,packetsVerified:932,packetFields,openingDecodedFramesVerified:222,prefixFrameMd5Sha256:SHA(prefixA)},providerCalls:0,newSpendUsd:0,paidSpendUsd:0,listening:'PENDING: no direct hearing is available. These checks establish technical integrity and authored timing, not sonic resemblance, perceived musical fit, SFX identity or competition ranking.'};
publicWrite('mix-verification.json',verification);
publicWrite('media.json',{file:spec.output,bytes:result.bytes,sha256:result.sha256,dimensions:[video.width,video.height],frames:932,fps:video.avg_frame_rate,duration:Number(metadata.format.duration),videoDuration:Number(video.duration),audioDuration:Number(audio.duration),logicalDecodedAudioDuration:decoded.length/8/SR,strictDecode:'PASS',codec:video.codec_name,pixFmt:video.pix_fmt,timeBase:video.time_base,picturePreservation:verification.picturePreservation,recipeSha256,scriptSha256,mixVerificationSha256:hash(path.join(HERE,'qa/mix-verification.json')),sonicStatus:'LISTENING_PENDING',providerCalls:0,paidSpendUsd:0});
publicWrite('commands.json',{scriptSha256,recipeSha256,commands,providerCalls:0,paidSpendUsd:0});
console.log(JSON.stringify({status:verification.status,...result,cueCount:ledger.length,pcmFrames:N,lufs:Number(measured.input_i),truePeakDbtp:Number(measured.input_tp),normalizationDb,providerCalls:0,paidSpendUsd:0}));
