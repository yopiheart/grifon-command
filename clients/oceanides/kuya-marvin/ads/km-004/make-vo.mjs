#!/usr/bin/env node
// KM-004 VO — ang apat na beat na walang mukha, sa BOSES NI MARVIN.
//
//   node clients/oceanides/kuya-marvin/ads/km-004/make-vo.mjs [--probe]
//
// Apat na beat ang walang talking clip: dalawang b-roll at dalawang card.
// Sa GB-001 ay kinailangang bumili ng buong Veo roll para lang sa boses, kasi
// walang clone si Gabriel. May clone si Marvin — `jL41fXY8JXGEarmJ5g3f` — kaya
// TTS na lang sila, at yun ang buong dahilan kung bakit mas mura ang ad na to.
//
// ~180 karakter lahat ng apat. Kahit ang libreng tier ay 10,000 kada buwan.
// `--probe` = isang maikling linya lang muna, para malaman kung may credit nang
// hindi ginagastos ang lahat.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const AD = 'clients/oceanides/kuya-marvin/ads/km-004';
const VOICE = 'jL41fXY8JXGEarmJ5g3f';   // clone ni Marvin (SKILL.md aral 11)

for (const l of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}
const KEY = process.env.ELEVEN_LABS_API_KEY;
if (!KEY) { console.error('WALANG ELEVEN_LABS_API_KEY sa .env'); process.exit(2); }

// Ang linya ay VERBATIM sa script.spec.json. Ang beat 5 ay sinabi ng customer,
// kaya "yan ang sabi nila" ang dala — si Marvin pa rin ang nagsasalita.
const LINES = [
  { id: 'vo-b2', text: 'Kahit anong plunger, balik nang balik ang problema.' },
  { id: 'vo-b4', text: 'Isa ang presyo sa phone, iba na sa receipt.' },
  { id: 'vo-b5', text: 'Grabe daw ang singilan. Yan ang sabi nila.' },
  { id: 'vo-b8', text: 'Pati ang mga dagdag na itinatago ng iba.' },
];

const probe = process.argv.includes('--probe');
const jobs = probe ? LINES.slice(0, 1) : LINES;
const chars = jobs.reduce((a, j) => a + j.text.length, 0);
console.log(`${jobs.length} linya, ${chars} karakter${probe ? '  (PROBE — isa lang)' : ''}\n`);

mkdirSync(`${AD}/audio`, { recursive: true });

for (const j of jobs) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}`, {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text: j.text,
      model_id: 'eleven_multilingual_v2',
      // `natural` (0.50) sa halip na robust — PACING Fix 4 ng SKILL.md, para
      // buhay ang prosody. Ang mataas na stability ay pumapatay ng buhay.
      voice_settings: { stability: 0.5, similarity_boost: 0.85, style: 0.15, use_speaker_boost: true },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.log(` BAGSAK  ${j.id}  HTTP ${res.status}`);
    console.log(`         ${body.slice(0, 300)}`);
    if (res.status === 401 || res.status === 402) {
      console.log('\n🔴 HUMINTO. Walang credit o walang permission ang key.');
      console.log('   Ang cut ay matatapos pa rin — musika lang ang sasagot sa apat na beat,');
      console.log('   at dala ng caption at ng card ang mga salita. Sabihin kay Neil.');
    }
    process.exit(1);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(`${AD}/audio/${j.id}.mp3`, buf);
  console.log(`  OK  ${j.id}.mp3  ${(buf.length / 1024).toFixed(0)} KB  "${j.text}"`);
}

console.log(`\n${jobs.length} VO sa boses ni Marvin. ${chars} karakter ang nagamit.`);
