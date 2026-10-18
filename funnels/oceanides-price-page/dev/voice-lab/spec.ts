import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { HARD_LIMITS } from './ledger';
import type { CriticalDetails } from '../../src/voice-lab/contracts';

export interface PaidSpec {
  model: 'grok-voice-3.0';
  voice: 'eve';
  turnDetection: { type: 'server_vad' };
  audio: Record<string, unknown>;
  instructions: string;
  tools: Array<{ type: string; name: string; description: string; parameters: Record<string, unknown> }>;
  sharedSyntheticLead: CriticalDetails;
  scenarios: Array<{ id: string; overrides: Partial<CriticalDetails>; callerLinesForReview: string[]; staffAction: string }>;
  limits: { maxAttempts: number; maxUsd: number; reservationUsd: number; sessionMs: number; maxTextInputs: number; maxTextCharacters: number; maxToolCalls: number };
}

export function loadLiveSpec(path: string, env: NodeJS.ProcessEnv = process.env) {
  const raw = readFileSync(path);
  const sha256 = createHash('sha256').update(raw).digest('hex');
  const spec = JSON.parse(raw.toString('utf8')) as PaidSpec;
  if (spec.model !== 'grok-voice-3.0' || spec.voice !== 'eve' || spec.turnDetection?.type !== 'server_vad' || typeof spec.instructions !== 'string' || !spec.instructions.trim()) throw new Error('invalid_voice_spec');
  const limits = spec.limits;
  if (!limits || !Number.isInteger(limits.maxAttempts) || limits.maxAttempts < 1 || limits.maxAttempts > HARD_LIMITS.maxAttempts || !Number.isFinite(limits.maxUsd) || limits.maxUsd <= 0 || limits.maxUsd > HARD_LIMITS.maxUsd || limits.reservationUsd !== HARD_LIMITS.reservationUsd || !Number.isInteger(limits.sessionMs) || limits.sessionMs <= 0 || limits.sessionMs > HARD_LIMITS.sessionMs || !Number.isInteger(limits.maxTextInputs) || limits.maxTextInputs <= 0 || limits.maxTextInputs > HARD_LIMITS.maxTextInputs || !Number.isInteger(limits.maxTextCharacters) || limits.maxTextCharacters <= 0 || limits.maxTextCharacters > 500 || !Number.isInteger(limits.maxToolCalls) || limits.maxToolCalls <= 0 || limits.maxToolCalls > 30) throw new Error('invalid_budget_spec');
  const allowed = new Set(['lookup_rate', 'update_details', 'confirm_details', 'create_service_request', 'get_dispatch', 'accept_booking', 'human_callback', 'decline']);
  if (!Array.isArray(spec.tools) || spec.tools.length !== allowed.size || spec.tools.some(t => t.type !== 'function' || !allowed.delete(t.name)) || !Array.isArray(spec.scenarios) || !spec.scenarios.length || !spec.sharedSyntheticLead) throw new Error('invalid_tools_or_scenarios');
  const blockedReason = env.OCEANIDES_VOICE_LIVE !== '1' ? 'Live tests are disabled. The exact draft and paid test need approval.' : env.OCEANIDES_VOICE_APPROVED_SPEC_SHA256 !== sha256 ? 'Exact current paid-spec SHA approval is missing.' : !env.XAI_API_KEY?.trim() ? 'Server credential is missing.' : null;
  return { spec, sha256, blockedReason, liveReady: blockedReason === null };
}
