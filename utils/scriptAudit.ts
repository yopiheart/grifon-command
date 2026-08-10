// Generated-script audit — deterministic, NON-TUNED, advisory-only.
//
// The word discipline in utils/scriptGuardrails.ts (hook ≤12 words / ≤2 sentences, body 7–12
// words/line) mirrors the TUNED server prompt, but until now it only ran against HUMAN input:
// validateBeat is wired solely into components/ExpertMode/ScriptStudio.tsx, the bring-your-own-
// script editor. Nothing ever checked whether the MODEL obeyed the caps its own prompt set.
//
// This module closes that half. It re-uses the same caps and the same validateBeat — no second
// source of truth — and reports where a generated (or user-edited) Script disagrees with them.
//
// Three hard boundaries:
//   1. ADVISORY ONLY. Nothing here blocks a step, rejects a script, or triggers a regeneration.
//      The tuned prompt stays the authority; this only surfaces the disagreement to the operator.
//   2. NEVER feeds back into a prompt. No auto-correct loop — tuned prompt content is off-limits
//      to automated edits, and a retry on this pipeline costs real money.
//   3. Pure + dependency-free (types + scriptGuardrails only), so the One-Shot / Concierge
//      producer path can adopt it later without pulling the heavy gemini/voice chain.

import type { Script } from '../types';
import {
  validateBeat,
  wordCount,
  totalEstSeconds,
  HOOK_WORD_CAP,
  HOOK_SENTENCE_CAP,
  BODY_WORD_CAP,
  BODY_WORD_MIN,
  type SceneBeat,
} from './scriptGuardrails';

/** Which block of the Script a finding came from. */
export type ScriptBlock = 'hook1' | 'hook2' | 'body';

export type ScriptAuditCode =
  | 'hook_over_words'
  | 'hook_over_sentences'
  | 'body_over_words'
  | 'body_under_words';

/**
 * `violation` — breaks a cap the tuned prompt states outright.
 * `advisory`  — breaks a soft bound scriptGuardrails itself marks as non-blocking (BODY_WORD_MIN).
 */
export type ScriptAuditSeverity = 'violation' | 'advisory';

export interface ScriptAuditFinding {
  block: ScriptBlock;
  /** Index within that block's line array. */
  lineIdx: number;
  line: string;
  code: ScriptAuditCode;
  severity: ScriptAuditSeverity;
  /** What the line actually measured (words, or sentences for the sentence cap). */
  actual: number;
  /** The cap it was measured against. */
  limit: number;
  /** One-line operator-facing summary. */
  message: string;
}

export interface ScriptAuditResult {
  findings: ScriptAuditFinding[];
  violations: number;
  advisories: number;
  /** True when there are zero findings of ANY severity. */
  clean: boolean;
  /** Estimated spoken seconds per block — hook1/hook2 are alternatives, so they don't sum. */
  estSeconds: { hook1: number; hook2: number; body: number };
}

const HOOK_BEAT: SceneBeat = {
  label: 'Hook',
  hint: '',
  wordCap: HOOK_WORD_CAP,
  sentenceCap: HOOK_SENTENCE_CAP,
};

const BODY_BEAT: SceneBeat = { label: 'Body', hint: '', wordCap: BODY_WORD_CAP };

/** Blank/whitespace lines are structure, not content — they never produce a finding. */
const isBlank = (line: string): boolean => !(line ?? '').trim();

const auditHookLine = (
  block: ScriptBlock,
  lineIdx: number,
  line: string
): ScriptAuditFinding[] => {
  const v = validateBeat(line, HOOK_BEAT);
  const out: ScriptAuditFinding[] = [];
  if (v.overWordCap) {
    out.push({
      block,
      lineIdx,
      line,
      code: 'hook_over_words',
      severity: 'violation',
      actual: v.wordCount,
      limit: HOOK_WORD_CAP,
      message: `Hook line is ${v.wordCount} words — the tuned cap is ${HOOK_WORD_CAP}.`,
    });
  }
  if (v.overSentenceCap) {
    out.push({
      block,
      lineIdx,
      line,
      code: 'hook_over_sentences',
      severity: 'violation',
      // validateBeat reports the boolean; recompute the count for the message.
      actual: line.trim().split(/[.!?…]+/).map((s) => s.trim()).filter(Boolean).length,
      limit: HOOK_SENTENCE_CAP,
      message: `Hook runs past ${HOOK_SENTENCE_CAP} sentences — it should land in one breath.`,
    });
  }
  return out;
};

const auditBodyLine = (lineIdx: number, line: string): ScriptAuditFinding[] => {
  const v = validateBeat(line, BODY_BEAT);
  const out: ScriptAuditFinding[] = [];
  if (v.overWordCap) {
    out.push({
      block: 'body',
      lineIdx,
      line,
      code: 'body_over_words',
      severity: 'violation',
      actual: v.wordCount,
      limit: BODY_WORD_CAP,
      message: `Body line is ${v.wordCount} words — the tuned cap is ${BODY_WORD_CAP}.`,
    });
  } else if (wordCount(line) < BODY_WORD_MIN) {
    // Soft bound: scriptGuardrails marks BODY_WORD_MIN advisory-only, so this never escalates.
    out.push({
      block: 'body',
      lineIdx,
      line,
      code: 'body_under_words',
      severity: 'advisory',
      actual: wordCount(line),
      limit: BODY_WORD_MIN,
      message: `Body line is ${wordCount(line)} words — under the ${BODY_WORD_MIN}-word floor; may read clipped.`,
    });
  }
  return out;
};

/**
 * Audit a generated (or user-edited) Script against the mirrored tuned caps.
 * Returns an empty, clean result for a null script so callers can render unconditionally.
 */
export const auditScript = (script: Script | null): ScriptAuditResult => {
  const findings: ScriptAuditFinding[] = [];

  if (script) {
    (['hook1', 'hook2'] as const).forEach((block) => {
      (script[block] ?? []).forEach((line, i) => {
        if (!isBlank(line)) findings.push(...auditHookLine(block, i, line));
      });
    });
    (script.body ?? []).forEach((line, i) => {
      if (!isBlank(line)) findings.push(...auditBodyLine(i, line));
    });
  }

  const violations = findings.filter((f) => f.severity === 'violation').length;

  return {
    findings,
    violations,
    advisories: findings.length - violations,
    clean: findings.length === 0,
    estSeconds: {
      hook1: totalEstSeconds(script?.hook1 ?? []),
      hook2: totalEstSeconds(script?.hook2 ?? []),
      body: totalEstSeconds(script?.body ?? []),
    },
  };
};

/** Findings for one block only — for rendering a badge beside a single hook column. */
export const findingsForBlock = (
  result: ScriptAuditResult,
  block: ScriptBlock
): ScriptAuditFinding[] => result.findings.filter((f) => f.block === block);
