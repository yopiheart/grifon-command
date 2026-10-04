// Prepare the user-requested Aira/v4 voice brief. Local checks; no network/spend.
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
  ['opening', 'Your next ad.', 0.12, 1.09, '[curious]'],
  ['launch', 'To launch a product.', 1.22, 2.61, '[confident]'],
  ['story', 'To tell your story.', 4.15, 5.62],
  ['grow', 'To grow your business.', 7.12, 8.59],
  ['problem', "But there's never time to make it.", 10.12, 12.87, '[serious]'],
  ['pivot', 'Until now.', 13.18, 14.12, '[excited]'],
  ['introduce', 'Meet Grifon.', 15.05, 16.42, '[confident]'],
  ['conversation', 'Find the angle. Build the story.', 19.65, 22.35],
  ['direction', 'Give your next ad a clear direction.', 22.84, 25.55],
  ['workflow', 'Research. Script. Storyboard.', 26.80, 28.86],
  ['brand', 'Grifon dot A I.', 30.04, 31.73],
];
let offset = 0;
const segments = phrases.map(([id, text, start, end, directionTag = '']) => {
  const prefix = directionTag ? `${directionTag} ` : '';
  const inputText = prefix + text;
  const result = { id, text, inputText, directionTag, targetStart: start, latestEnd: end, characterStart: offset + prefix.length, characterEndExclusive: offset + inputText.length };
  offset += inputText.length + 1;
  return result;
});
const text = segments.map(s => s.inputText).join('\n');
const spokenText = segments.map(s => s.text).join('\n');
const preflight = JSON.parse(readFileSync(path.join(here, 'aira-preflight.json'), 'utf8'));
const selected = preflight.voices.find(v => v.voiceId === 'CkDT8SVS21XIVk5BcuDe' && v.source === 'public-library');
const model = preflight.models.find(m => m.id === 'eleven_v4');
if (selected?.rate !== 1 || !model?.canDoTextToSpeech || model.modelRates?.character_cost_multiplier !== 1 || model.modelRates?.cost_discount_multiplier !== 1) throw new Error('Exact Aira/v4/rate metadata unavailable; no fallback.');
const spec = {
  id: 'grifon-full-upgrade-english-vo-v02',
  approvalStatus: 'PROPOSED_NOT_AUTHORIZED_FOR_GENERATION',
  purpose: 'Add a restrained, natural English launch-film narrator to the human-approved 32.9-second Grifon film. Curious opening, confident pivot and closing. Preserve approved picture and action SFX.',
  provider: 'ElevenLabs direct API, existing desktop account',
  endpoint: '/v1/text-to-speech/CkDT8SVS21XIVk5BcuDe/with-timestamps?output_format=mp3_44100_128',
  casting: { voiceId: 'CkDT8SVS21XIVk5BcuDe', voiceName: 'Aira - Confident News Reporter', category: 'professional', accent: 'standard', gender: 'female', voiceTrainingLanguage: 'Filipino', scriptLanguage: 'English', observedLibraryCreditRate: 1 },
  request: { text, model_id: 'eleven_v4', language_code: 'en', voice_settings: { stability: 0.5, similarity_boost: 0.75 } },
  spokenText,
  delivery: { arc: 'Curious opening, confident possibilities, restrained seriousness at the problem, brief excitement at Until now, confident warm finish.', tags: ['[curious]', '[confident]', '[serious]', '[excited]'], limitation: 'Tags direct delivery, but effect/strength is voice-dependent and needs audition. Aira is trained on Filipino; v4 cross-language English handling does not guarantee a Filipino English accent. Do not add style/speed/SSML or native SFX tags.' },
  pronunciation: { target: 'GRIFF-on for Grifon; A and I spoken as separate letter names.', exactSubmittedBrandSpellings: ['Grifon', 'Grifon dot A I.'], limitation: 'Target is an audition criterion, not a guaranteed API pronunciation. No identity cloning, dictionary or phonetic respelling is submitted.' },
  assets: {
    picture: { path: '../grifon-full-upgrade-1080p.mp4', sha256: sha(path.join(project, 'grifon-full-upgrade-1080p.mp4')) },
    approvedPremaster: { path: `${stemFolder}/mix-v08.wav`, sha256: sha(`${stemFolder}/mix-v08.wav`) },
    approvedSfxStem: { path: `${stemFolder}/sfx-premaster.wav`, sha256: sha(`${stemFolder}/sfx-premaster.wav`) },
  },
  budget: {
    maxSynthesisRequests: 1, exactCharacters: text.length, exactWords: spokenText.split(/\s+/).length,
    maxCredits: 500, observedModelCreditMultiplier: 1,
    estimatedCreditsForExactRequest: text.length,
    observedVoiceCreditMultiplier: 1,
    creditEvidence: 'Read-only exact Aira public-library metadata rate=1 and v4 model tokenCostFactor=1, character_cost_multiplier=1, cost_discount_multiplier=1 on 2026-10-03. Conservative estimate counts every raw character, including emotion tags.',
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
    'All eleven spoken phrases present with usable timestamps, emotion tags not spoken aloud, no clipped speech, no phrase outside its window and no tempo greater than 1.12.',
    'Speech remains audible above the music; music-only ducking leaves original SFX samples and contacts unchanged.',
    'Voice finishes before the 31.96-second visual fade. Final black tail remains silent.',
    'Output is 1920x1080, 30fps, 987 frames, 32.900 seconds, H264yuv420p, stereo AAC48k, fully decodable with identical H264 payload to the approved film.',
    'Encoded mix measures -16 LUFS +/-1 and true peak no higher than -1 dBTP.',
    'Human audition required for premium delivery, clear wording, GRIFF-on and separate A/I pronunciation. Technical measurements cannot substitute for listening.',
  ],
  evidence: ['Spec SHA256 and safe single-attempt ledger in ignored local work folder', 'Provider character alignment, conservative credit estimate and explicit actual-debit-unknown status; no raw auth headers retained', 'Phrase timing/tempo report, voice/music/SFX levels, strict decode and video payload identity', 'Native full-film review MP4 and mobile download link after commit', 'Human listening approval remains separate from technical PASS'],
  sources: ['https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps/', 'https://elevenlabs.io/docs/eleven-creative/playground/text-to-speech', 'https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices#prompting-eleven-v4'],
};
writeFileSync(path.join(here, 'test-spec.json'), JSON.stringify(spec, null, 2) + '\n');
const rows = segments.map(s => `| ${s.targetStart.toFixed(2)}-${s.latestEnd.toFixed(2)}s | ${s.inputText} |`).join('\n');
writeFileSync(path.join(here, 'SCRIPT.md'), `# English voiceover - proposed Aira/v4 v02\n\nThe visuals and existing music/SFX were approved by Neil. He selected English, then specifically requested Aira and v4 emotion controls. This voice pass is not generated yet; the earlier George/v3 proposal is superseded.\n\n**Aira - Confident News Reporter**, Filipino female professional library voice, **eleven_v4** (stability0.50, similarity0.75). Curious opening, confident possibilities, serious problem, brief excitement at the pivot, then a confident warm finish. The five inline tag placements are direction for the model, not spoken copy. No cloning/upload is needed: the exact Aira already exists in the account.\n\n| Window | Exact API line (tags are direction) |\n| --- | --- |\n${rows}\n\nPronunciation target: **GRIFF-on**, then separate **A / I** letter names. The submitted spelling remains Grifon; pronunciation needs audition. English stays as selected; v4 cross-language generation does not guarantee carrying Aira's Filipino accent into English.\n\nOne request, **${text.length} raw characters / ${spec.budget.exactWords} spoken words**, conservatively estimated **${text.length} credits** including tags, at observed1x model and Aira rates; hard cap **500 credits**, no retries. Subscription/balance lookup is unavailable with the existing key (HTTP401), so no remaining balance or dollar estimate is claimed.\n\nLocal editing preserves the approved video payload and action SFX, ducks only music by6dB during speech, and exports a new VO version. Existing approved videos are preserved. See [the exact paid test spec](test-spec.json).\n\nReviewed official [v4 prompting guide](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices#prompting-eleven-v4). Delivery controls are voice-dependent; human audition is still required. No generation has occurred.\n`);
console.log(JSON.stringify({ mode: 'LOCAL_SPEC_ONLY', characters: text.length, words: spec.budget.exactWords, estimatedCredits: text.length, capCredits: 500, specSha256: sha(path.join(here, 'test-spec.json')) }));
