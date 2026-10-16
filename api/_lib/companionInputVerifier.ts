import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import ffmpegPath from 'ffmpeg-static';
import { cloudReferenceLink, parseCloudReferenceManifest, type CloudReferenceMedia, type CloudReferenceReceipt } from '../../services/companionCloudReferences.js';
import { isReferenceDraft, type CompanionReferenceDraft, type ReferenceMedia, type ReferencePhoto } from '../../services/companionReferenceDraft.js';
import { fingerprintReferenceDraft } from '../../services/companionReferenceReview.js';
import { isFixtureJobIntent, isFixtureJobSnapshot, verifyFixtureJobIntent, type FixtureJobIntent } from '../../services/companionFixtureJobs.js';
import { FIXTURE_INPUT_DECODE_POLICY, type FixtureVerifiedMedia } from '../../services/companionInputVerification.js';

export class FixtureInputVerificationError extends Error {
  constructor(public code: string) { super(code); this.name = 'FixtureInputVerificationError'; }
}
function fail(code: string): never { throw new FixtureInputVerificationError(code); }
const sha = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const decodeTimeoutMs = 12_000, outputLimit = 1_048_576;
export interface FixtureInputProof {
  ownerId: string; requestId: string; sourceSaveId: string; inputHash: string; manifestSha256: string; planSnapshotSha256: string; verifiedMedia: FixtureVerifiedMedia[];
}

function imageChunks(bytes: Buffer, png: boolean): void {
  let offset = png ? 8 : 12, ended = false;
  while (offset < bytes.length) {
    if (offset + (png ? 12 : 8) > bytes.length) fail('FIXTURE_MEDIA_TRUNCATED');
    const size = png ? bytes.readUInt32BE(offset) : bytes.readUInt32LE(offset + 4), name = bytes.toString('ascii', offset + (png ? 4 : 0), offset + (png ? 8 : 4));
    if (['eXIf', 'acTL', 'EXIF', 'ANIM', 'ANMF'].includes(name)) fail('FIXTURE_MEDIA_ORIENTATION_OR_ANIMATION_UNSUPPORTED');
    offset += (png ? 12 : 8) + size + (png ? 0 : size % 2);
    if (offset > bytes.length) fail('FIXTURE_MEDIA_TRUNCATED');
    if (png && name === 'IEND') { ended = true; break; }
  }
  if (offset !== bytes.length || (png && !ended)) fail('FIXTURE_MEDIA_TRUNCATED');
}
function inputFormat(bytes: Buffer, mime: string): string {
  if (mime === 'image/png') {
    if (bytes.length < 33 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || bytes.toString('ascii', 12, 16) !== 'IHDR' || bytes.readUInt32BE(8) !== 13) fail('FIXTURE_MEDIA_SIGNATURE_MISMATCH');
    if (bytes.readUInt32BE(16) * bytes.readUInt32BE(20) > FIXTURE_INPUT_DECODE_POLICY.maxPixels) fail('FIXTURE_MEDIA_LIMIT_UNSUPPORTED');
    imageChunks(bytes, true); return 'png_pipe';
  }
  if (mime === 'image/jpeg') {
    if (bytes.length < 4 || bytes.readUInt16BE(0) !== 0xffd8 || bytes.readUInt16BE(bytes.length - 2) !== 0xffd9) fail('FIXTURE_MEDIA_SIGNATURE_MISMATCH');
    if (bytes.includes(Buffer.from('Exif\0\0'))) fail('FIXTURE_MEDIA_ORIENTATION_OR_ANIMATION_UNSUPPORTED');
    return 'jpeg_pipe';
  }
  if (mime === 'image/webp') {
    if (bytes.length < 20 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP' || bytes.readUInt32LE(4) + 8 !== bytes.length) fail('FIXTURE_MEDIA_SIGNATURE_MISMATCH');
    imageChunks(bytes, false); return 'webp_pipe';
  }
  if (mime === 'video/webm') {
    if (bytes.length < 16 || bytes.readUInt32BE(0) !== 0x1a45dfa3) fail('FIXTURE_MEDIA_SIGNATURE_MISMATCH');
    const head = bytes.subarray(0, Math.min(4096, bytes.length)), marker = head.indexOf(Buffer.from([0x42, 0x82]));
    if (marker < 0 || marker + 7 > head.length || head[marker + 2] !== 0x84 || head.toString('ascii', marker + 3, marker + 7) !== 'webm') fail('FIXTURE_MEDIA_SIGNATURE_MISMATCH');
    return 'matroska';
  }
  if (mime === 'video/mp4' || mime === 'video/quicktime') {
    if (bytes.length < 16 || bytes.toString('ascii', 4, 8) !== 'ftyp' || ((bytes.toString('ascii', 8, 12) === 'qt  ') !== (mime === 'video/quicktime'))) fail('FIXTURE_MEDIA_SIGNATURE_MISMATCH');
    let offset = 0, hasMoov = false;
    while (offset < bytes.length) {
      if (offset + 8 > bytes.length) fail('FIXTURE_MEDIA_TRUNCATED');
      const name = bytes.toString('ascii', offset + 4, offset + 8); let size = bytes.readUInt32BE(offset);
      if (size === 1) { if (offset + 16 > bytes.length) fail('FIXTURE_MEDIA_TRUNCATED'); const large = bytes.readBigUInt64BE(offset + 8); if (large > BigInt(bytes.length)) fail('FIXTURE_MEDIA_TRUNCATED'); size = Number(large); }
      else if (size === 0) size = bytes.length - offset;
      if (size < 8 || offset + size > bytes.length) fail('FIXTURE_MEDIA_TRUNCATED');
      if (name === 'moov') hasMoov = true;
      if (name === 'mdat' && !hasMoov) fail('FIXTURE_MEDIA_STREAMING_LAYOUT_UNSUPPORTED');
      offset += size;
    }
    if (!hasMoov) fail('FIXTURE_MEDIA_TRUNCATED');
    return 'mov';
  }
  return fail('FIXTURE_MEDIA_TYPE_UNSUPPORTED');
}

async function runDecoder(bytes: Buffer, format: string, deadlineAt: number, timeoutMs: number): Promise<{ stdout: string; stderr: string }> {
  if (!ffmpegPath) fail('FIXTURE_DECODER_UNAVAILABLE');
  const remaining = Math.min(timeoutMs, decodeTimeoutMs, deadlineAt - Date.now());
  if (remaining <= 0) fail('FIXTURE_VERIFICATION_DEADLINE');
  const args = ['-hide_banner', '-nostdin', '-loglevel', 'info', '-xerror', '-max_alloc', '67108864', '-protocol_whitelist', 'pipe',
    '-format_whitelist', format, '-codec_whitelist', 'h264,hevc,vp8,vp9,av1,mjpeg,png,webp,aac,opus,vorbis,mp3,pcm_s16le,pcm_s24le',
    '-probesize', '6000000', '-analyzeduration', '1000000', '-err_detect', 'explode', '-max_pixels', String(FIXTURE_INPUT_DECODE_POLICY.maxPixels), '-threads', '1',
    '-f', format, '-i', 'pipe:0', '-map', '0:v:0', '-map', '0:a:0?', '-threads', '1', '-filter_threads', '1', '-vf', 'showinfo=checksum=0', '-progress', 'pipe:1', '-f', 'null', 'pipe:1'];
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath!, args, { stdio: ['pipe', 'pipe', 'pipe'], shell: false, windowsHide: true, env: {} });
    let stdout = '', stderr = '', size = 0, failure: string | null = null;
    const stop = (code: string) => { if (failure) return; failure = code; child.stdin.destroy(); child.kill('SIGKILL'); };
    const timer = setTimeout(() => stop('FIXTURE_DECODER_TIMEOUT'), remaining);
    child.on('error', () => { clearTimeout(timer); reject(new FixtureInputVerificationError('FIXTURE_DECODER_UNAVAILABLE')); });
    child.stdout.on('data', (chunk: Buffer) => { size += chunk.length; if (size > outputLimit) stop('FIXTURE_DECODER_OUTPUT_LIMIT'); else stdout += chunk.toString('utf8'); });
    child.stderr.on('data', (chunk: Buffer) => { size += chunk.length; if (size > outputLimit) stop('FIXTURE_DECODER_OUTPUT_LIMIT'); else stderr += chunk.toString('utf8'); });
    child.stdin.on('error', () => { /* A decoder rejecting malformed input closes its pipe before all bytes arrive. */ });
    child.on('close', code => {
      clearTimeout(timer);
      if (failure || code !== 0 || /corrupt|invalid|error|premature|truncat|partial file|damaged|decode.*fail|Header missing/i.test(stderr)) reject(new FixtureInputVerificationError(failure ?? 'FIXTURE_MEDIA_DECODE_FAILED'));
      else resolve({ stdout, stderr });
    });
    child.stdin.end(bytes);
  });
}

export async function decodeFixtureInput(bytes: Buffer, expected: CloudReferenceMedia, options: { deadlineAt?: number; timeoutMs?: number } = {}): Promise<FixtureVerifiedMedia> {
  if (bytes.length < 1 || bytes.length > FIXTURE_INPUT_DECODE_POLICY.maxFileBytes || bytes.length !== expected.size || sha(bytes) !== expected.sha256) fail('FIXTURE_MEDIA_INTEGRITY_MISMATCH');
  if (expected.width * expected.height > FIXTURE_INPUT_DECODE_POLICY.maxPixels || (expected.slot === 'reference' && (expected.duration ?? Infinity) > FIXTURE_INPUT_DECODE_POLICY.maxReferenceSeconds)) fail('FIXTURE_MEDIA_LIMIT_UNSUPPORTED');
  const format = inputFormat(bytes, expected.type), decoded = await runDecoder(bytes, format, options.deadlineAt ?? Date.now() + 55_000, options.timeoutMs ?? decodeTimeoutMs);
  if (/displaymatrix|display matrix|\brotate\s*:/i.test(decoded.stderr)) fail('FIXTURE_MEDIA_ORIENTATION_OR_ANIMATION_UNSUPPORTED');
  const header = decoded.stderr.split('Stream mapping:')[0], videoStreams = header.match(/Stream #0:\d[^\r\n]*:\s*Video:/g) ?? [], audioStreams = header.match(/Stream #0:\d[^\r\n]*:\s*Audio:/g) ?? [];
  if (videoStreams.length !== 1 || audioStreams.length > 1 || /Stream #0:\d[^\r\n]*:\s*(Subtitle|Data|Attachment):/.test(header) || (expected.slot !== 'reference' && audioStreams.length)) fail('FIXTURE_MEDIA_STREAMS_UNSUPPORTED');
  const frames = [...decoded.stderr.matchAll(/\bn:\s*(\d+)\s+pts:\s*-?\d+\s+pts_time:([-+\d.e]+)\s+duration:\s*\d+\s+duration_time:([-+\d.e]+)[^\r\n]*?\bs:(\d+)x(\d+)/g)];
  if (!frames.length || frames.length > FIXTURE_INPUT_DECODE_POLICY.maxFrames || !decoded.stdout.includes('progress=end')) fail('FIXTURE_MEDIA_DECODE_INCOMPLETE');
  const width = Number(frames[0][4]), height = Number(frames[0][5]); let end = 0;
  for (const [index, frame] of frames.entries()) {
    const pts = Number(frame[2]), duration = Number(frame[3]);
    if (Number(frame[1]) !== index || !Number.isFinite(pts) || !Number.isFinite(duration) || duration <= 0 || pts < -0.001 || Number(frame[4]) !== width || Number(frame[5]) !== height) fail('FIXTURE_MEDIA_DECODE_INCOMPLETE');
    end = Math.max(end, pts + duration);
  }
  // The null muxer's final clock also covers fully decoded audio that outlasts the video.
  const clocks = [...decoded.stdout.matchAll(/(?:^|\n)out_time_us=(\d+)(?:\r?\n|$)/g)];
  if (clocks.length) end = Math.max(end, Number(clocks[clocks.length - 1][1]) / 1_000_000);
  if (width !== expected.width || height !== expected.height || width * height > FIXTURE_INPUT_DECODE_POLICY.maxPixels) fail('FIXTURE_MEDIA_METADATA_MISMATCH');
  if (expected.slot === 'reference') {
    const rate = /config in time_base:[^\r\n]*frame_rate:\s*(\d+)\/(\d+)/.exec(decoded.stderr);
    if (!rate || Number(rate[2]) === 0 || Number(rate[1]) / Number(rate[2]) > FIXTURE_INPUT_DECODE_POLICY.maxFps || Math.abs(Number(frames[0][2])) > 0.001 || end > FIXTURE_INPUT_DECODE_POLICY.maxReferenceSeconds + 0.001) fail('FIXTURE_MEDIA_TIMING_UNSUPPORTED');
    if (Math.abs(end - expected.duration!) > 0.001) fail('FIXTURE_MEDIA_METADATA_MISMATCH');
  } else if (frames.length !== 1) fail('FIXTURE_MEDIA_ORIENTATION_OR_ANIMATION_UNSUPPORTED');
  return { slot: expected.slot, mimeType: expected.type, sizeBytes: bytes.length, sha256: sha(bytes), width, height, durationSeconds: expected.slot === 'reference' ? end : null, frames: frames.length, decoded: true };
}

export async function verifySavedFixtureInputs(ownerId: string, requestId: string, job: unknown, saved: unknown,
  download: (path: string) => Promise<Blob>, options: { deadlineAt?: number } = {}): Promise<FixtureInputProof> {
  const deadlineAt = options.deadlineAt ?? Date.now() + 55_000;
  if (!record(job) || job.runtime !== 'supabase-cloud-fixture-v1' || typeof job.intentText !== 'string' || job.intentText.length > 131072 || !record(job.queue) || 'plan' in job.queue || job.queue.invalidated !== false || job.queue.actualCents !== 0) fail('FIXTURE_JOB_UNAVAILABLE');
  let intent: FixtureJobIntent;
  try { intent = JSON.parse(job.intentText); } catch { return fail('FIXTURE_JOB_UNAVAILABLE'); }
  if (!isFixtureJobIntent(intent) || !await verifyFixtureJobIntent(intent) || intent.ownerId !== ownerId || intent.requestId !== requestId || !intent.cloudReference) fail('FIXTURE_JOB_IDENTITY_MISMATCH');
  if (!isFixtureJobSnapshot({ version: 1, fixture: true, intent, queue: { ...job.queue, plan: intent.plan }, updatedAt: job.updatedAt, nextDueAt: job.nextDueAt }, intent)) fail('FIXTURE_JOB_UNAVAILABLE');
  if (!record(saved) || saved.runtime !== 'supabase-cloud-reference-v1' || saved.ownerId !== ownerId || saved.saveId !== intent.cloudReference.saveId || saved.committed !== true || typeof saved.manifestText !== 'string') fail('FIXTURE_SNAPSHOT_UNAVAILABLE');
  const receipt = saved as unknown as CloudReferenceReceipt, link = await cloudReferenceLink(receipt, ownerId), manifest = parseCloudReferenceManifest(JSON.parse(receipt.manifestText));
  if (link.inputHash !== intent.plan.inputHash || !manifest.media.length) fail('FIXTURE_INPUT_IDENTITY_MISMATCH');
  const restored = new Map<string, ReferenceMedia>(), evidence: FixtureVerifiedMedia[] = [];
  for (const media of manifest.media) {
    if (Date.now() >= deadlineAt) fail('FIXTURE_VERIFICATION_DEADLINE');
    const blob = await download(`${ownerId}/${receipt.saveId}/${media.slot}`);
    if (!(blob instanceof Blob) || blob.type !== media.type || blob.size !== media.size || blob.size > FIXTURE_INPUT_DECODE_POLICY.maxFileBytes) fail('FIXTURE_MEDIA_INTEGRITY_MISMATCH');
    evidence.push(await decodeFixtureInput(Buffer.from(await blob.arrayBuffer()), media, { deadlineAt }));
    const { slot: _, type: _type, size: _size, sha256: _sha, ...metadata } = media;
    restored.set(media.slot, { ...metadata, blob });
  }
  const draft: CompanionReferenceDraft = { ...manifest.draft, referenceVideo: manifest.draft.referenceVideo ? restored.get('reference')! : null, photos: manifest.draft.photos.map((_, index) => restored.get(`photo-${index}`) as ReferencePhoto) };
  if (!isReferenceDraft(draft) || await fingerprintReferenceDraft(draft) !== manifest.inputHash) fail('FIXTURE_INPUT_FINGERPRINT_MISMATCH');
  const facts = ['brief', 'brandName', 'productName', 'audience', 'offer', 'callToAction', 'instructions'].map((key, index) => ({ label: ['Brief', 'Brand', 'Product or service', 'Audience', 'Offer', 'Call to action', 'Instructions'][index], value: draft[key as keyof CompanionReferenceDraft] }));
  const factsMatch = intent.plan.facts.length === facts.length && intent.plan.facts.every((fact, index) => Object.keys(fact).length === 2 && fact.label === facts[index].label && fact.value === facts[index].value);
  const voice = intent.plan.voice, voiceMatches = voice === null ? draft.voice === null : draft.voice !== null && Object.keys(voice).length === 3 && voice.id === draft.voice.id && voice.name === draft.voice.name && voice.source === draft.voice.source;
  if (!factsMatch || !voiceMatches || intent.plan.outputLanguage !== draft.outputLanguage || intent.plan.adaptationMode !== (draft.adaptationMode ?? 'adapt') || intent.plan.speechMode !== (draft.speechMode ?? 'spoken')) fail('FIXTURE_INPUT_IDENTITY_MISMATCH');
  return { ownerId, requestId, sourceSaveId: receipt.saveId, inputHash: manifest.inputHash, manifestSha256: sha(receipt.manifestText), planSnapshotSha256: sha(intent.plan.confirmation!.planSnapshot), verifiedMedia: evidence };
}
