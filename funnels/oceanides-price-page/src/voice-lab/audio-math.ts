/** Streaming linear resampler. Carries the fractional frame between worklet blocks. */
export class PcmResampler {
  private pending = new Float32Array(0);
  private position = 0;

  constructor(private readonly sourceRate: number, private readonly targetRate = 24000) {
    if (!(sourceRate > 0) || !(targetRate > 0)) throw new Error('Invalid audio sample rate');
  }

  push(input: Float32Array): Int16Array {
    const samples = new Float32Array(this.pending.length + input.length);
    samples.set(this.pending);
    samples.set(input, this.pending.length);
    const output: number[] = [];
    const step = this.sourceRate / this.targetRate;
    while (this.position + 1 < samples.length) {
      const index = Math.floor(this.position);
      const fraction = this.position - index;
      const sample = samples[index] * (1 - fraction) + samples[index + 1] * fraction;
      const clipped = Math.max(-1, Math.min(1, sample));
      output.push(Math.round(clipped * (clipped < 0 ? 32768 : 32767)));
      this.position += step;
    }
    const consumed = Math.min(Math.floor(this.position), samples.length);
    this.pending = samples.slice(consumed);
    this.position -= consumed;
    return Int16Array.from(output);
  }
}

export function pcm16ToBase64(samples: Int16Array): string {
  const bytes = new Uint8Array(samples.length * 2);
  const view = new DataView(bytes.buffer);
  for (let index = 0; index < samples.length; index++) view.setInt16(index * 2, samples[index], true);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 8192) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  }
  return btoa(binary);
}

export function base64ToFloat32(encoded: string): Float32Array {
  const binary = atob(encoded);
  if (binary.length % 2 !== 0) throw new Error('Invalid PCM16 audio frame');
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const view = new DataView(bytes.buffer);
  const output = new Float32Array(bytes.length / 2);
  for (let index = 0; index < output.length; index++) output[index] = view.getInt16(index * 2, true) / 32768;
  return output;
}

export function timingSummary(samples: number[]): { count: number; median: number | null; worst: number | null; p95: number | null } {
  const sorted = samples.filter((value) => Number.isFinite(value) && value >= 0).sort((a, b) => a - b);
  if (!sorted.length) return { count: 0, median: null, worst: null, p95: null };
  const middle = Math.floor(sorted.length / 2);
  return {
    count: sorted.length,
    median: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
    worst: sorted[sorted.length - 1],
    p95: sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)],
  };
}

/** Response IDs prevent late chunks from restarting an interrupted response. */
export class ResponseAudioGate {
  private cancelled = new Set<string>();
  private active: string | undefined;

  accept(responseId: string | undefined): boolean {
    if (responseId && this.cancelled.has(responseId)) return false;
    this.active = responseId;
    return true;
  }

  cancel(): void {
    if (this.active) this.cancelled.add(this.active);
  }

  reset(): void {
    this.cancelled.clear();
    this.active = undefined;
  }
}
