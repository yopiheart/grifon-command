// Prepare the exact voice brief. Local file checks only; no network or spend.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.dirname(here);
const desktop = 'C:/Users/ADMIN/Desktop/grifon-command';
const stemFolder = `${desktop}/workflows/assets/grifon-reference-full/assets/audio-v08/work`;
const sha = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const phrases = [
  ['opening', 'Your next ad.', 0.12, 1.09],
  ['launch', 'To launch a product.', 1.22, 2.61],
  ['story', 'To tell your story.', 4.15, 5.62],
  ['grow', 'To grow your business.', 7.12, 8.59],
  ['problem', "But there's never time to make it.", 10.12, 12.87],
  ['pivot', 'Until now.', 13.18, 14.12],
  ['introduce', 'Meet Grifon.', 15.05, 16.42],
  ['conversation', 'Find the angle. Build the story.', 19.65, 22.35],
  ['direction', 'Give your next ad a clear direction.', 22.84, 25.55],
  ['workflow', 'Research. Script. Storyboard.', 26.80, 28.86],
  ['brand', 'Grifon dot A I.', 30.04, 31.73],
];
let offset = 0;
const segments = phrases.map(([id, text, start, end]) => {
  const result = { id, text, targetStart: start, latestEnd: end, characterStart: offset, characterEndExclusive: offset + text.length };
  offset += text.length + 1;
  return result;
});
const text = phrases.map(p => p[1]).join('\n');
const spec = {
  id: 'grifon-full-upgrade-english-vo-v01',
  approvalStatus: 'PROPOSED_NOT_AUTHORIZED_FOR_GENERATION',
  purpose: 'Add a restrained, natural English launch-film narrator to the human-approved 32.9-second Grifon film. Curious opening, confident pivot and closing. Preserve approved picture and action SFX.',
  provider: 'ElevenLabs direct API, existing desktop account',
  endpoint: '/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb/with-timestamps?output_format=mp3_44100_128',
  casting: { voiceId: 'JBFqnCBsd6RMkjVDRZzb', voiceName: 'George - Warm, Captivating Storyteller', category: 'premade', accent: 'British', gender: 'male', language: 'English' },
  request: { text, model_id: 'eleven_v3', language_code: 'en', voice_settings: { stability: 0.5, similarity_boost: 0.75 } },
  pronunciation: { target: 'GRIFF-on for Grifon; A and I spoken as separate letter names.', exactSubmittedBrandSpellings: ['Grifon', 'Grifon dot A I.'], limitation: 'Target is an audition criterion, not a guaranteed API pronunciation. No identity cloning, dictionary or phonetic respelling is submitted.' },
  assets: {
    picture: { path: '../grifon-full-upgrade-1080p.mp4', sha256: sha(path.join(project, 'grifon-full-upgrade-1080p.mp4')) },
    approvedPremaster: { path: `${stemFolder}/mix-v08.wav`, sha256: sha(`${stemFolder}/mix-v08.wav`) },
    approvedSfxStem: { path: `${stemFolder}/sfx-premaster.wav`, sha256: sha(`${stemFolder}/sfx-premaster.wav`) },
  },
  budget: {
    maxSynthesisRequests: 1, exactCharacters: text.length, exactWords: text.split(/\s+/).length,
    maxCredits: 500, observedModelCreditMultiplier: 1,
    estimatedCreditsForExactRequest: text.length,
    creditEvidence: 'Stock premade voice; read-only model catalog on 2026-10-03 reports tokenCostFactor=1, character_cost_multiplier=1, cost_discount_multiplier=1.',
    accountBalance: 'Unknown: the existing API key received HTTP 401 for read-only subscription data. No dollar conversion or remaining balance is asserted.',
    retryPolicy: 'No automatic retries or paid alignment calls. Mark the single attempt consumed before POST; timeout/unknown outcome also consumes it. New input, casting, model or second request needs a new approved spec.',
  },
  editing: {
    duration: 32.9, sampleRate: 48000, channels: 2, segments,
    maxPitchPreservingTempo: 1.12,
    timingPolicy: 'Use returned character timestamps to place whole phrases in these windows, including breath/consonant handles. Keep natural duration where possible; stop for a timing failure instead of clipping words or exceeding tempo cap.',
    musicDuckDb: -6, duckAttackSeconds: 0.10, duckReleaseSeconds: 0.24,
    bedReconstruction: 'Subtract the approved SFX stem, including its existing tail fade, from the approved mix premaster. This retains the authored music filtering and envelopes. Duck only recovered music; SFX contacts are not shifted.',
    export: 'New grifon-full-upgrade-english-vo-1080p.mp4; copy the accepted H264 video stream. Re-encode the new full mix as stereo AAC48k with faststart. Keep approved no-VO exports untouched.',
  },
  passFail: [
    'Exactly one provider synthesis request, exact approved body, credit estimate no higher than 500; no rerolls.',
    'All eleven phrases present with usable timestamps, no clipped speech, no phrase outside its window and no tempo greater than 1.12.',
    'Speech remains audible above the music; music-only ducking leaves original SFX samples and contacts unchanged.',
    'Voice finishes before the 31.96-second visual fade. Final black tail remains silent.',
    'Output is 1920x1080, 30fps, 987 frames, 32.900 seconds, H264yuv420p, stereo AAC48k, fully decodable with identical H264 payload to the approved film.',
    'Encoded mix measures -16 LUFS +/-1 and true peak no higher than -1 dBTP.',
    'Human audition required for premium delivery, clear wording, GRIFF-on and separate A/I pronunciation. Technical measurements cannot substitute for listening.',
  ],
  evidence: ['Spec SHA256 and safe single-attempt ledger in ignored local work folder', 'Provider character alignment, conservative credit estimate and explicit actual-debit-unknown status; no raw auth headers retained', 'Phrase timing/tempo report, voice/music/SFX levels, strict decode and video payload identity', 'Native full-film review MP4 and mobile download link after commit', 'Human listening approval remains separate from technical PASS'],
  sources: ['https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps/', 'https://elevenlabs.io/docs/eleven-creative/playground/text-to-speech'],
};
writeFileSync(path.join(here, 'test-spec.json'), JSON.stringify(spec, null, 2) + '\n');
const rows = segments.map(s => `| ${s.targetStart.toFixed(2)}-${s.latestEnd.toFixed(2)}s | ${s.text} |`).join('\n');
writeFileSync(path.join(here, 'SCRIPT.md'), `# English voiceover - proposed v01\n\nThe visuals and existing music/SFX were approved by Neil. This voice pass is not generated yet.\n\nStock **George**, warm British male, **eleven_v3 Natural** (stability0.50, similarity0.75). Opening should feel curious and conversational; the pivot and brand finish should feel clear and confident. The exact API input is plain text, without performance tags or voice cloning.\n\n| Window | Exact spoken text |\n| --- | --- |\n${rows}\n\nPronunciation target: **GRIFF-on**, then separate **A / I** letter names. The submitted spelling remains Grifon; pronunciation needs audition.\n\nOne request, **${text.length} characters / ${spec.budget.exactWords} words**, expected **${text.length} credits** at the observed1x model rate; hard cap **500 credits**, no retries. Subscription/balance lookup is unavailable with the existing key (HTTP401), so no remaining balance or dollar estimate is claimed.\n\nLocal editing preserves the approved video payload and action SFX, ducks only music by6dB during speech, and exports a new VO version. Existing approved videos are preserved. See [the exact paid test spec](test-spec.json).\n\nNo generation has occurred.\n`);
console.log(JSON.stringify({ mode: 'LOCAL_SPEC_ONLY', characters: text.length, words: spec.budget.exactWords, estimatedCredits: text.length, capCredits: 500, specSha256: sha(path.join(here, 'test-spec.json')) }));
