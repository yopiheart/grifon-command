#!/usr/bin/env node
/**
 * Machine "listener" for the music-bed smoke. Sends each generated bed to a
 * Gemini multimodal model and verifies the HARD correctness gate: purely
 * instrumental, NO singing / vocal intro / human voice (the known ElevenLabs
 * Music failure — Neil heard a woman singing at the start of a bed, 2026-06-16).
 *
 * This does NOT replace Neil's ear — the TASTE call (invisible-under-VO, does it
 * lift the ad) is still human. It only objectively catches the one failure mode
 * a model can hear reliably: vocals where there must be none.
 *
 * Usage (PowerShell):
 *   $env:GEMINI_API_KEY='AIza...'; node tools/listen_music_bed.mjs
 * Usage (bash):
 *   GEMINI_API_KEY=AIza... node tools/listen_music_bed.mjs
 *
 * Reads:  .tmp/smoke-music-{mrbeast,temu,testimonial}.mp3  (from smoke_music_bed.mjs)
 * Prints: per-bed PASS/FAIL verdict + any vocal timestamps. Exit 1 if any FAIL.
 *
 * Mirrors the project's inlineData audio shape (services/geminiService.ts) and
 * model (researchTextModel = gemini-3.5-flash, multimodal).
 */

import { readFile, access } from 'node:fs/promises';
import { GoogleGenAI } from '@google/genai';

const MODEL = 'gemini-3.5-flash';
const STYLES = ['mrbeast', 'temu', 'testimonial'];
const OUT_DIR = '.tmp';

const PROMPT =
  'You are an audio QA listener for a direct-response ad music bed. The bed plays ' +
  'UNDER a spoken voiceover, so it MUST be purely instrumental. Listen to the ' +
  'entire clip carefully, especially the first 3 seconds (the known failure is a ' +
  'sung or vocal INTRO).\n\n' +
  'Report ANY of these as a vocal: singing, humming, "ooh"/"aah" vocal pads, ' +
  'choir, rapping, spoken words, or any human-voice sample/chop. Synthesized ' +
  'instruments and non-vocal sound design are FINE.\n\n' +
  'Return JSON only: {"instrumental": boolean, "vocalsDetected": [{"type": string, ' +
  '"approxTime": string}], "confidence": "high"|"medium"|"low", "notes": string}. ' +
  'instrumental=true ONLY if you hear zero vocals of any kind.';

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function listen(ai, style) {
  const path = `${OUT_DIR}/smoke-music-${style}.mp3`;
  if (!(await exists(path))) {
    return { style, skipped: true, reason: `missing ${path} — run smoke_music_bed.mjs first` };
  }
  const data = (await readFile(path)).toString('base64');
  const resp = await ai.models.generateContent({
    model: MODEL,
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType: 'audio/mpeg', data } },
        { text: PROMPT },
      ],
    }],
    config: { responseMimeType: 'application/json', temperature: 0 },
  });
  const raw = (resp.text ?? '').trim();
  let verdict;
  try {
    verdict = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ''));
  } catch {
    return { style, error: `unparseable model output: ${raw.slice(0, 200)}` };
  }
  return { style, verdict };
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('ERROR: set GEMINI_API_KEY in your environment first.');
    return 1;
  }
  const ai = new GoogleGenAI({ apiKey });

  let fails = 0;
  for (const style of STYLES) {
    const r = await listen(ai, style);
    if (r.skipped) { console.log(`[${style}] SKIPPED — ${r.reason}`); continue; }
    if (r.error) { console.error(`[${style}] ERROR — ${r.error}`); fails += 1; continue; }
    const v = r.verdict;
    const pass = v.instrumental === true;
    if (!pass) fails += 1;
    console.log(`\n[${style}] ${pass ? '✅ PASS (instrumental)' : '❌ FAIL (vocals heard)'}  · confidence: ${v.confidence}`);
    if (Array.isArray(v.vocalsDetected) && v.vocalsDetected.length) {
      for (const d of v.vocalsDetected) console.log(`    ⚠ ${d.type} @ ${d.approxTime}`);
    }
    if (v.notes) console.log(`    notes: ${v.notes}`);
  }

  console.log(
    fails
      ? `\n${fails} bed(s) FAILED the no-vocals gate — rerun those styles (smoke_music_bed.mjs) before judging taste.`
      : '\nAll beds PASS the no-vocals gate. Taste call (invisible-under-VO) is still Neil\'s ear.'
  );
  return fails ? 1 : 0;
}

process.exit(await main());
