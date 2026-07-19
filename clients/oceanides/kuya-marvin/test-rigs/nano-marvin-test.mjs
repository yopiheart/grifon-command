#!/usr/bin/env node
// Nano Banana 2 (gemini-3.1-flash-image-preview) Marvin close-up test — dev-time,
// direct Gemini API. Reference-anchored: body master + face ref as image parts.
// Usage: node .tmp/nano-marvin-test.mjs --prompt-file <txt> --out <png> [--model <id>]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';

for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}
if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing in .env');

const argv = process.argv.slice(2);
const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const promptFile = arg('--prompt-file');
const outPath = arg('--out');
const model = arg('--model') || 'gemini-3.1-flash-image-preview';
if (!promptFile || !outPath) throw new Error('need --prompt-file and --out');

const img = (p) => ({ inlineData: { mimeType: p.endsWith('.png') ? 'image/png' : 'image/jpeg', data: readFileSync(p).toString('base64') } });
const refArgs = [];
for (let i = 0; i < argv.length; i++) if (argv[i] === '--ref') refArgs.push(argv[++i]);
const REFS = refArgs.length ? refArgs : [
  'clients/oceanides/kuya-marvin/refs/marvin-ref-5-body-master.jpg',
  'clients/oceanides/kuya-marvin/refs/marvin-ref-1-front-neutral.jpg',
];

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const prompt = readFileSync(promptFile, 'utf8');

async function generate(imageSize) {
  return ai.models.generateContent({
    model,
    contents: { parts: [...REFS.map(img), { text: prompt }] },
    config: { imageConfig: { aspectRatio: '9:16', imageSize } },
  });
}

console.log(`[nano-test] model=${model} out=${outPath}`);
let response;
try { response = await generate('2K'); }
catch (e) { console.log(`[nano-test] 2K failed (${e.message?.slice(0, 120)}), retrying 1K`); response = await generate('1K'); }

let data = null;
for (const part of response.candidates?.[0]?.content?.parts ?? []) {
  if (part.inlineData?.data) { data = part.inlineData.data; break; }
}
if (!data) throw new Error(`no image in response: ${JSON.stringify(response.candidates?.[0]?.content ?? {}).slice(0, 500)}`);
mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, Buffer.from(data, 'base64'));
console.log(`[nano-test] ✓ saved ${outPath}`);
