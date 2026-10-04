import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { asciiSafe, finalize } from './_gates.mjs';

const root = resolve(import.meta.dirname, '../..');
const media = resolve(root, 'assets/blender-reveal');
const run = JSON.parse(readFileSync(resolve(media, 'byteplus-motion-transfer-run.json'), 'utf8'));
const verification = JSON.parse(readFileSync(resolve(media, 'byteplus-output-verification.json'), 'utf8'));
const seedance = readFileSync(resolve(media, 'byteplus-motion-transfer.mp4'));
const seedanceHash = createHash('sha256').update(seedance).digest('hex');
const checks = verification.checks;
if (run.status !== 'succeeded' || run.model !== 'dreamina-seedance-2-0-260128' || run.paid_post_attempts !== 1 ||
    run.output?.path !== 'assets/blender-reveal/byteplus-motion-transfer.mp4' || run.output.bytes !== seedance.length || run.output.sha256 !== seedanceHash ||
    verification.asset !== run.output.path || verification.model !== run.model ||
    !['recorded_size_and_sha256', 'full_decode', 'native_dimensions', 'six_second_duration', 'frame_timing', 'no_audio'].every(key => checks?.[key]?.pass === true) ||
    !Object.values(checks).every(check => check?.pass === true) ||
    checks.recorded_size_and_sha256.bytes !== seedance.length || checks.recorded_size_and_sha256.sha256 !== seedanceHash ||
    checks.full_decode.exit_code !== 0 || checks.full_decode.mapped_all_streams !== true ||
    checks.native_dimensions.width !== 864 || checks.native_dimensions.height !== 496 ||
    checks.no_audio.input_audio_streams !== 0) {
  throw new Error('Seedance output must match the successful one-shot ledger and passing independent decode evidence');
}
const duration = checks.six_second_duration.decoded_seconds;
const fps = checks.frame_timing.fps;
if (!Number.isFinite(duration) || Math.abs(duration - 6) > 0.1 || !Number.isFinite(fps) || fps <= 0) {
  throw new Error('Seedance duration/frame-rate evidence is invalid');
}
if (verification.sampled_visual_review?.status !== 'PASS_SAMPLED_CAMERA_TRANSFER_WITH_IDENTITY_LIMITATIONS' ||
    verification.sampled_visual_review.camera_direction?.status !== 'PASS_SAMPLED' ||
    verification.sampled_visual_review.exact_product_identity?.status !== 'PARTIAL') {
  throw new Error('Viewer review copy requires the recorded sampled-camera verdict and product-identity limitations');
}
const cost = run.cost?.generation_from_reported_tokens;
const tokens = run.usage?.completion_tokens ?? run.usage?.total_tokens;
if (Number.isFinite(cost) && (!Number.isFinite(tokens) || tokens < 0 || run.cost.rate_usd_per_million_tokens !== 4.3 ||
    Math.abs(cost - tokens * 4.3 / 1_000_000) > 0.00000001)) {
  throw new Error('Reported-token cost estimate does not match the recorded usage and Seedance 2.0 rate');
}
const costNote = Number.isFinite(cost) && cost >= 0
  ? `Reported-token generation estimate: about $${cost.toFixed(2)} at $4.30/M tokens. Actual invoice unverified.`
  : 'Reported-token generation cost unavailable. Actual invoice unverified.';
const encode = (file, mime) => `data:${mime};base64,${readFileSync(resolve(media, file)).toString('base64')}`;
// Match HTML parser newline normalization before hashing inline CSP blocks.
const template = readFileSync(resolve(import.meta.dirname, 'blender-reveal.tpl.html'), 'utf8').replace(/\r\n?/g, '\n');
const replacements = {
  SEEDANCE_VIDEO: `data:video/mp4;base64,${seedance.toString('base64')}`,
  SEEDANCE_META: `${Number(duration.toFixed(3))} SEC / ${Number(fps.toFixed(3))} FPS / 864 x 496`,
  SEEDANCE_DURATION: String(Number(duration.toFixed(3))),
  SEEDANCE_COST_NOTE: costNote,
  FINAL_VIDEO: encode('noir-01-reveal.mp4', 'video/mp4'),
  REFERENCE_VIDEO: encode('camera-reference.mp4', 'video/mp4'),
  HERO_IMAGE: encode('hero.png', 'image/png'),
  START_IMAGE: encode('start.png', 'image/png'),
  MID_IMAGE: encode('mid.png', 'image/png'),
  EDITABLE_SCENE: encode('scene.blend', 'application/octet-stream'),
};
let html = template;
for (const [key, value] of Object.entries(replacements)) html = html.replaceAll(`{{${key}}}`, value);
html = asciiSafe(html, { label: 'blender-reveal' });
const hashBlock = tag => createHash('sha256').update(html.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))[1]).digest('base64');
const policy = `default-src 'none'; img-src data:; media-src data:; style-src 'sha256-${hashBlock('style')}'; script-src 'sha256-${hashBlock('script')}'; base-uri 'none'; form-action 'none'`;
html = html.replace('{{CONTENT_POLICY}}', policy);
html = finalize(html, {
  label: 'blender-reveal',
  required: ['<meta charset="utf-8">', 'class="ground"', 'id="film"', 'id="seedance"', 'NOIR', 'data:video/mp4;base64,'],
  leftover: [/\{\{[A-Z_]+\}\}/g],
});
mkdirSync(resolve(root, 'artifacts'), { recursive: true });
const output = resolve(root, 'artifacts/blender-reveal.html');
writeFileSync(output, html);
console.log(JSON.stringify({ output, bytes: Buffer.byteLength(html), selfContained: true, source: media }));
