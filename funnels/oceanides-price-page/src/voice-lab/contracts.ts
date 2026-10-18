export type RequestStatus = 'collecting' | 'awaiting_dispatch' | 'dispatch_approved' | 'booked' | 'human_needed' | 'declined' | 'failed';
export type SessionMode = 'mock' | 'live';
export interface CriticalDetails {
  name: string;
  contact: string;
  city: string;
  address: string;
  problem: string;
  access: string;
  preferredTime: string;
}
export interface TranscriptEntry { id: string; role: 'caller' | 'assistant' | 'system'; text: string; at: number }
export interface ToolEntry { id: string; name: string; input: unknown; result: unknown; at: number; ok: boolean }
export interface TimingSample { kind: 'ordinary' | 'tool' | 'interruption'; milliseconds: number; at: number }
export interface BudgetSummary { attempts: number; reservedUsd: number; maxAttempts: number; maxUsd: number; reservationUsd: number; liveReady: boolean; blockedReason: string | null; specSha256: string }
export interface DispatchDecision { version: number; decision: 'pending' | 'approved' | 'rejected'; pricePhp: number | null; slot: string; conditions: string }
export interface LabSnapshot {
  sessionId: string;
  mode: SessionMode;
  phase: 'preparing' | 'active' | 'closed';
  scenarioId: string;
  startedAt: number;
  expiresAt: number;
  scripted: boolean;
  requestStatus: RequestStatus;
  details: CriticalDetails;
  detailsConfirmed: boolean;
  dispatch: DispatchDecision;
  acceptedVersion: number | null;
  owner: 'Neil/Zam';
  nextStep: string;
  transcript: TranscriptEntry[];
  toolLog: ToolEntry[];
  timings: TimingSample[];
  budget: BudgetSummary;
}
export type ClientEvent =
  | { type: 'user_text'; text: string }
  | { type: 'audio'; data: string }
  | { type: 'interrupt' }
  | { type: 'playback_drained'; responseId?: string }
  | { type: 'dispatch'; decision: 'pending' | 'approved' | 'rejected'; pricePhp?: number; slot?: string; conditions?: string }
  | { type: 'customer_accept'; version: number }
  | { type: 'human_request' }
  | { type: 'stop' }
  | { type: 'timing'; kind: TimingSample['kind']; milliseconds: number };
export type ServerEvent =
  | { type: 'snapshot'; snapshot: LabSnapshot }
  | { type: 'state'; snapshot: LabSnapshot }
  | { type: 'transcript'; entry: TranscriptEntry }
  | { type: 'tool'; entry: ToolEntry }
  | { type: 'audio'; data: string; sampleRate: 24000; responseId: string }
  | { type: 'speech_started'; at: number }
  | { type: 'speech_stopped'; at: number }
  | { type: 'response_started'; responseId: string }
  | { type: 'response_end'; responseId: string; hasToolCalls?: boolean }
  | { type: 'error'; code: string; message: string }
  | { type: 'closed'; reason: string };
export interface LabStatus { active: boolean; budget: BudgetSummary; service: { area: string; ratePhp: number; capacityLiters: number; callbackHours: string }; mockNotice: string }
export interface SessionResponse { sessionId: string; wsPath: string; state: LabSnapshot }
export interface LabScenario { id: string; title: string; description: string; callerTurns: string[]; expected: string[]; initial: CriticalDetails }
