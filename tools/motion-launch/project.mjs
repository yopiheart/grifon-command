import { readFile, writeFile, mkdir, lstat, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { repository, templateFor } from './templates.mjs';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const json = bytes => JSON.parse(bytes.toString('utf8'));
export const jsonBytes = value => JSON.stringify(value, null, 2) + '\n';

export function contained(root, name) {
  if (typeof name !== 'string' || !name || name.includes('\\') || name.split('/').some(x => x === '..' || x === '.') || path.isAbsolute(name)) throw Error(`Unsafe project path ${name}`);
  const file = path.resolve(root, name);
  if (!file.startsWith(path.resolve(root) + path.sep)) throw Error(`Path escapes project: ${name}`);
  return file;
}

export async function safeFile(root, name) {
  const file = contained(root, name);
  const resolvedRoot = await realpath(root), resolvedFile = await realpath(file);
  if (!resolvedFile.startsWith(resolvedRoot + path.sep) || !(await lstat(file)).isFile()) throw Error(`Project file is not contained: ${name}`);
  return file;
}

export async function projectDirectory(root, name) {
  const directory = contained(root, name);
  let current = root;
  for (const segment of name.split('/')) {
    current = path.join(current, segment);
    let entry;
    try { entry = await lstat(current); } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      try { await mkdir(current); } catch (failure) { if (failure.code !== 'EEXIST') throw failure; }
      entry = await lstat(current);
    }
    if (entry.isSymbolicLink() || !entry.isDirectory()) throw Error(`Project output directory is not contained: ${name}`);
    const resolved = await realpath(current);
    if (!resolved.startsWith(await realpath(root) + path.sep)) throw Error(`Project output directory escapes root: ${name}`);
  }
  return directory;
}

async function sourceTree(root, folder = 'composition') {
  const files = [];
  for (const entry of (await readdir(contained(root, folder), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const name = `${folder}/${entry.name}`;
    if (entry.name.startsWith('.')) throw Error(`Hidden composition inputs are unsupported: ${name}`);
    if (entry.isSymbolicLink()) throw Error(`Project links are unsupported: ${name}`);
    if (entry.isDirectory()) files.push(...await sourceTree(root, name));
    else if (entry.isFile()) {
      if (!/\.(json|html|js|frag|png|ttf|txt|mp4)$/i.test(name)) throw Error(`Unsupported composition file ${name}`);
      const bytes = await readFile(await safeFile(root, name));
      files.push({ file: name, bytes: bytes.length, sha256: sha256(bytes) });
    } else throw Error(`Unsupported composition input ${name}`);
  }
  return files;
}

export async function initProject({ project, templateId, sourceRoot = repository }) {
  const template = templateFor(templateId), root = path.resolve(project);
  // Validate every input before reserving a fresh project directory.
  const inputs = await Promise.all(template.files.map(async item => ({ ...item, bytes: await readFile(path.join(sourceRoot, item.source)) })));
  const audioInputs = template.audio ? await Promise.all([
    readFile(path.join(sourceRoot, template.audio)),
    readFile(path.join(sourceRoot, 'workflows/assets/grifon-reference-full/assets/audio-v07/source-manifest.json')),
    readFile(path.join(sourceRoot, 'workflows/assets/grifon-reference-full/assets/audio-v07/SOURCES.md')),
  ]) : null;
  await mkdir(path.dirname(root), { recursive: true });
  await mkdir(root); // EEXIST deliberately refuses both files and existing directories.
  for (const input of inputs) {
    const destination = contained(root, input.target);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, input.bytes, { flag: 'wx' });
  }
  const job = { schemaVersion: 1, templateId, timeline: template.timeline, formats: template.formats, audioPlan: audioInputs ? 'audio-plan.json' : null };
  await writeFile(path.join(root, 'job.json'), jsonBytes(job), { flag: 'wx' });
  if (audioInputs) {
    const plan = json(audioInputs[0]);
    delete plan.video; delete plan.output; delete plan.sourceRoot;
    plan.sourceRegister = 'audio-source-manifest.json'; plan.sourceCredits = 'audio-source-credits.md';
    plan.rights = { usage: 'mixed-video', rawRedistribution: false };
    await writeFile(path.join(root, 'audio-plan.json'), jsonBytes(plan), { flag: 'wx' });
    await writeFile(path.join(root, 'audio-source-manifest.json'), audioInputs[1], { flag: 'wx' });
    await writeFile(path.join(root, 'audio-source-credits.md'), audioInputs[2], { flag: 'wx' });
  }
  await writeFile(path.join(root, 'provenance.json'), jsonBytes({ schemaVersion: 1, templateId,
    copied: inputs.map(({ source, target, bytes }) => ({ source, target, bytes: bytes.length, sha256: sha256(bytes) })),
    scope: 'Local authored templates; arbitrary reference analysis and automatic motion authoring are not implemented.',
    lockedPrefixFrames: template.lockedPrefixFrames, providerCalls: 0, paidSpendUsd: 0 }), { flag: 'wx' });
  return readProject(root);
}

export function validateWindow(job, { format = 'landscape', from = 0, frames = 48, profile = 'draft' } = {}) {
  if (!Object.hasOwn(job.formats, format)) throw Error(`Unsupported format ${format} for ${job.templateId}`);
  if (!['draft', 'final'].includes(profile)) throw Error(`Unknown profile ${profile}`);
  if (!Number.isSafeInteger(from) || !Number.isSafeInteger(frames) || from < 0 || frames < 1 || from + frames > job.timeline.frames) throw Error('Export window must contain whole native frames within the project timeline');
  if (profile === 'draft' && (frames > 120 || frames * job.timeline.fpsDenominator / job.timeline.fpsNumerator > 5)) throw Error('Draft preview is bounded to 120 native frames and five seconds');
  if (profile === 'final' && job.templateId === 'shader-reference' && from < 222 && !(from === 0 && frames === 932)) throw Error('Native final export preserves the locked encoded opening only for the complete shader timeline; use draft for an opening window or final from frame 222 onward');
  const size = job.formats[format], scale = profile === 'draft' ? 0.5 : 1;
  return { format, from, frames, profile, width: size.width * scale, height: size.height * scale };
}

export async function readProject(project) {
  const root = await realpath(path.resolve(project));
  const jobBytes = await readFile(await safeFile(root, 'job.json')), job = json(jobBytes), template = templateFor(job.templateId);
  const nativeTimeline = Object.keys(template.timeline).every(key => job.timeline?.[key] === template.timeline[key]);
  const nativeFormats = Object.keys(job.formats || {}).length === Object.keys(template.formats).length && Object.entries(template.formats).every(([key, size]) => job.formats?.[key]?.width === size.width && job.formats?.[key]?.height === size.height);
  if (job.schemaVersion !== 1 || !nativeTimeline || !nativeFormats) throw Error('Project timeline/formats differ from the native treatment contract; a changed duration/layout requires a separately authored treatment');
  if (job.audioPlan !== null && job.audioPlan !== 'audio-plan.json') throw Error('audioPlan must be audio-plan.json or null');
  const files = await sourceTree(root);
  for (const required of template.files) if (!files.some(row => row.file === required.target)) throw Error(`Missing composition input ${required.target}`);
  const config = json(await readFile(await safeFile(root, `composition/${template.config}`)));
  let shots;
  if (job.templateId === 'shader-reference') {
    if (config.frames !== 932 || config.prefixFrames !== 222 || config.width !== 1920 || config.height !== 1080 || config.fpsNumerator !== 30000 || config.fpsDenominator !== 1001 || config.prefixFile !== 'grifon-opening-pilot-silent.mp4') throw Error('Shader native timeline or locked opening contract changed');
    const prefix = files.find(row => row.file === `composition/${config.prefixFile}`);
    if (prefix.sha256 !== '6815c6e5143257c2d8b4fa368735677754b8d57cc0685ccb7d2ce380459a1c69' || config.prefixSha256 !== prefix.sha256) throw Error('Locked encoded opening changed');
    if (!Array.isArray(config.shots) || !config.shots.length) throw Error('Missing native shot table');
    let end = 222;
    for (const shot of config.shots) {
      if (typeof shot.key !== 'string' || !Number.isSafeInteger(shot.start) || !Number.isSafeInteger(shot.end) || shot.start !== end || shot.end <= shot.start) throw Error('Shot table contains gaps, overlaps or invalid frames');
      end = shot.end;
    }
    if (end !== 932) throw Error('Shot table does not cover the continuation');
    for (const key of ['capability', 'canvas', 'brand', 'disclosure', 'disclosureDetail']) if (typeof config.copy?.[key] !== 'string' || !config.copy[key].trim() || config.copy[key].length > 120) throw Error(`Invalid shader copy field ${key}`);
    shots = [{ key: 'locked-encoded-opening', start: 0, end: 222 }, ...config.shots];
  } else if (job.templateId === 'orbital-launch') {
    if (config.frames !== 1389 || config.fps !== 60 || config.width !== 1920 || config.height !== 1080) throw Error('Orbital launch native timeline/layout changed');
    for (const key of ['one', 'idea', 'title', 'next', 'script', 'storyboard', 'video', 'motion', 'journey', 'describe', 'build', 'launch', 'brand', 'url']) {
      if (typeof config.copy?.[key] !== 'string' || !config.copy[key].trim() || config.copy[key].length > 40) throw Error(`Invalid orbital copy field ${key}`);
    }
    if (!Array.isArray(config.shots) || !config.shots.length) throw Error('Missing orbital shot table');
    let end = 0;
    for (const shot of config.shots) {
      if (typeof shot.key !== 'string' || !Number.isSafeInteger(shot.start) || !Number.isSafeInteger(shot.end) || shot.start !== end || shot.end <= shot.start) throw Error('Orbital shot table contains gaps, overlaps or invalid frames');
      end = shot.end;
    }
    if (end !== 1389) throw Error('Orbital shot table does not cover the timeline');
    const boundaries = [0, 210, 434, 570, 780, 948, 1260, 1389];
    if (config.shots.length !== 7 || config.shots.some((shot, index) => shot.start !== boundaries[index] || shot.end !== boundaries[index + 1])) throw Error('Orbital shot boundaries are fixed to the authored native choreography');
    shots = config.shots;
  } else {
    if (config.duration !== 12 || config.fps !== 24 || Object.keys(config.formats || {}).length !== 2 || !Object.entries(template.formats).every(([key, size]) => config.formats?.[key]?.width === size.width && config.formats?.[key]?.height === size.height)) throw Error('Basic launch native duration/fps/layout changed');
    for (const value of Object.values(config.copy || {})) if (typeof value !== 'string' || !value.trim() || value.length > 24) throw Error('Basic copy must be nonempty and at most 24 characters per field');
    for (const key of ['brand', 'describe', 'build', 'launch', 'url']) if (!config.copy?.[key]) throw Error(`Missing copy field ${key}`);
    for (const key of ['background', 'accent', 'text']) if (!/^#[\da-f]{6}$/i.test(config.colors?.[key])) throw Error(`Invalid six-digit color ${key}`);
    shots = [{ key: 'brand', start: 0, end: 72 }, { key: 'describe', start: 72, end: 144 }, { key: 'build', start: 144, end: 216 }, { key: 'launch', start: 216, end: 288 }];
  }
  const visualJob = { schemaVersion: job.schemaVersion, templateId: job.templateId, timeline: job.timeline, formats: job.formats };
  const visualSourceKey = sha256(Buffer.from(JSON.stringify({ job: visualJob, files })));
  return { root, job, template, config, files, shots, visualSourceKey, jobSha256: sha256(jobBytes) };
}

export async function planProject(project) {
  const state = await readProject(project);
  let cues = [];
  if (state.job.audioPlan) {
    const audio = json(await readFile(await safeFile(state.root, state.job.audioPlan)));
    if (audio.videoFrames !== state.job.timeline.frames || audio.fpsNumerator !== state.job.timeline.fpsNumerator || audio.fpsDenominator !== state.job.timeline.fpsDenominator || audio.sampleFrames !== state.job.timeline.sampleFrames) throw Error('Audio plan timeline differs from project');
    cues = (audio.cues || []).map(cue => ({ id: cue.id, frame: cue.frame, role: cue.role }));
    if (cues.some(cue => !Number.isSafeInteger(cue.frame) || cue.frame < 0 || cue.frame >= state.job.timeline.frames)) throw Error('Audio cue outside project timeline');
  }
  return { schemaVersion: 1, templateId: state.job.templateId, timeline: state.job.timeline, formats: state.job.formats,
    entry: state.template.entry,
    visualSourceKey: state.visualSourceKey, inputs: state.files, shots: state.shots, cues,
    lockedPrefixFrames: state.template.lockedPrefixFrames,
    audioStatus: state.job.audioPlan ? 'AUTHORED_PLAN_NOT_LISTENING_ACCEPTANCE' : 'EXPLICIT_SILENT_PREVIEW',
    scope: 'Authored typography, logo, UI, camera moves, transitions and materials supported by this selected treatment. References are briefs; arbitrary video conversion and new effects need additional authoring/assets or another workflow.',
    branding: 'Defaults use existing Grifon copy and assets. Client branding requires explicit copy/logo/source replacement.',
    verdict: 'AUTHORED_TEMPLATE_PLAN', providerCalls: 0, paidSpendUsd: 0 };
}
