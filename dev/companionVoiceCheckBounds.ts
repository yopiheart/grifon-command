export type CompanionVoiceCheckStopReason = 'ended' | 'deadline' | 'clock-invalid' | 'pcm-limit' | 'transcript-limit' | 'response-limit' | 'response-order' | 'usage-missing' | 'usage-invalid' | 'cost-limit' | 'output-token-limit';

export interface CompanionVoiceCheckSnapshot {
  stopped: boolean;
  stopReason: CompanionVoiceCheckStopReason | null;
  elapsedMs: number;
  pcmBytes: number;
  transcriptBytes: number;
  responseStarts: number;
  responseEnds: number;
  usageReports: number;
  usageTokens: number;
  outputTokens: number;
  outputTokensAvailable: boolean;
  estimatedCostUsd: number;
}

const usageKeys = ['totalTokenCount', 'promptTokenCount', 'responseTokenCount', 'thoughtsTokenCount', 'cachedContentTokenCount'] as const;
type UsageKey = typeof usageKeys[number];

class CompanionVoiceCheckBounds {
  private state: CompanionVoiceCheckSnapshot = { stopped: false, stopReason: null, elapsedMs: 0, pcmBytes: 0, transcriptBytes: 0, responseStarts: 0, responseEnds: 0, usageReports: 0, usageTokens: 0, outputTokens: 0, outputTokensAvailable: false, estimatedCostUsd: 0 };
  private startedAt = 0;
  private lastNow = 0;
  private activeResponse = false;
  private responseHasUsage = false;
  private responseHasOutputCount = false;
  private responseOutputTokens = 0;

  constructor(private now: () => number) {
    try {
      this.startedAt = this.lastNow = now();
      if (!Number.isFinite(this.startedAt) || this.startedAt < 0) this.halt('clock-invalid');
    } catch { this.halt('clock-invalid'); }
  }

  private halt(reason: CompanionVoiceCheckStopReason): false {
    if (!this.state.stopped) { this.state.stopped = true; this.state.stopReason = reason; }
    return false;
  }

  checkDeadline = (): boolean => {
    if (this.state.stopped) return false;
    let current: number;
    try { current = this.now(); } catch { return this.halt('clock-invalid'); }
    if (!Number.isFinite(current) || current < this.lastNow) return this.halt('clock-invalid');
    this.lastNow = current;
    this.state.elapsedMs = current - this.startedAt;
    return this.state.elapsedMs >= 45000 ? this.halt('deadline') : true;
  };

  allowPcm = (byteLength: number): boolean => {
    if (!this.checkDeadline()) return false;
    if (!Number.isSafeInteger(byteLength) || byteLength < 0 || byteLength > 1440000 - this.state.pcmBytes) return this.halt('pcm-limit');
    this.state.pcmBytes += byteLength;
    return true;
  };

  allowTranscript = (text: string): boolean => {
    if (!this.checkDeadline()) return false;
    if (typeof text !== 'string') return this.halt('transcript-limit');
    const bytes = new TextEncoder().encode(text).byteLength;
    if (bytes > 1024 - this.state.transcriptBytes) return this.halt('transcript-limit');
    this.state.transcriptBytes += bytes;
    return true;
  };

  startResponse = (): boolean => {
    if (!this.checkDeadline()) return false;
    if (this.activeResponse) return this.halt('response-order');
    if (this.state.responseStarts >= 2) return this.halt('response-limit');
    this.state.responseStarts++;
    this.activeResponse = true;
    this.state.outputTokensAvailable = this.responseHasOutputCount;
    return true;
  };

  recordUsage = (usage: unknown): boolean => {
    if (!this.checkDeadline()) return false;
    if (!usage || typeof usage !== 'object' || Array.isArray(usage)) return this.halt('usage-invalid');
    const counts: Partial<Record<UsageKey, number>> = {};
    try {
      for (const [key, count] of Object.entries(usage)) {
        if (!usageKeys.includes(key as UsageKey) || typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) return this.halt('usage-invalid');
        counts[key as UsageKey] = count;
      }
    } catch { return this.halt('usage-invalid'); }
    if (counts.totalTokenCount === undefined && (counts.promptTokenCount === undefined || counts.responseTokenCount === undefined)) return this.halt('usage-invalid');
    // Sum every report, including context billed again. Components can only
    // raise a report's total; cached/thought counts are conservatively included.
    const tokens = Math.max(counts.totalTokenCount ?? 0, (counts.promptTokenCount ?? 0) + (counts.responseTokenCount ?? 0) + (counts.thoughtsTokenCount ?? 0) + (counts.cachedContentTokenCount ?? 0));
    const outputTokens = counts.responseTokenCount ?? 0;
    if (!Number.isSafeInteger(tokens) || tokens <= 0 || !Number.isSafeInteger(this.state.usageTokens + tokens)) return this.halt('usage-invalid');
    this.state.usageReports++;
    this.state.usageTokens += tokens;
    this.state.outputTokens += outputTokens;
    this.state.estimatedCostUsd = this.state.usageTokens * 12 / 1000000;
    this.responseOutputTokens += outputTokens;
    this.responseHasUsage = true;
    this.responseHasOutputCount ||= counts.responseTokenCount !== undefined;
    this.state.outputTokensAvailable = this.responseHasOutputCount;
    if (this.state.usageTokens * 12 >= 1000000) return this.halt('cost-limit');
    if (this.responseOutputTokens > 512 || this.state.outputTokens > 1024) return this.halt('output-token-limit');
    return true;
  };

  endResponse = (): boolean => {
    if (!this.checkDeadline()) return false;
    if (!this.activeResponse) return this.halt('response-order');
    if (!this.responseHasUsage) return this.halt('usage-missing');
    if (!this.responseHasOutputCount) return this.halt('usage-invalid');
    this.state.responseEnds++;
    this.activeResponse = false;
    this.responseHasUsage = false;
    this.responseHasOutputCount = false;
    this.responseOutputTokens = 0;
    return true;
  };

  stop = (): false => {
    this.checkDeadline();
    return this.halt('ended');
  };

  snapshot = (): CompanionVoiceCheckSnapshot => {
    this.checkDeadline();
    return { ...this.state };
  };
}

export function createCompanionVoiceCheckBounds(options: { now?: () => number } = {}) {
  return new CompanionVoiceCheckBounds(options.now ?? (() => performance.now()));
}
