const INPUT_SAMPLE_RATE = 16_000;
// Ten seconds of the 24 kHz speaker stream, bounded before allocating decoded audio.
export const MAX_PCM16_SAMPLES = 240_000;

function toBase64(bytes: Uint8Array): string | undefined {
  if (!bytes.length) return undefined;
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768));
  }
  return btoa(binary);
}

function writeSample(view: DataView, offset: number, sample: number): void {
  const clipped = Math.max(-1, Math.min(1, sample));
  view.setInt16(offset, Math.round(clipped * (clipped < 0 ? 32_768 : 32_767)), true);
}

export class Pcm16Encoder {
  private carry = new Float32Array(0);
  private inputOffset = 0;
  private inputSamples = 0;
  private outputSamples = 0;

  constructor(private readonly sampleRate: number) {
    if (!Number.isFinite(sampleRate) || sampleRate <= 0) throw new Error('PCM16 input sample rate must be positive and finite.');
  }

  // Keep source carry and an absolute output clock across microphone callbacks.
  encode(samples: Float32Array): string | undefined {
    for (const sample of samples) {
      if (!Number.isFinite(sample)) throw new Error('PCM16 input samples must be finite.');
    }
    if (!samples.length) return undefined;
    const source = new Float32Array(this.carry.length + samples.length);
    source.set(this.carry);
    source.set(samples, this.carry.length);
    this.inputSamples += samples.length;
    const targetSamples = Math.floor(this.inputSamples * INPUT_SAMPLE_RATE / this.sampleRate);
    const bytes = new Uint8Array((targetSamples - this.outputSamples) * 2);
    const view = new DataView(bytes.buffer);
    let written = 0;
    while (this.outputSamples < targetSamples) {
      const position = this.outputSamples * this.sampleRate / INPUT_SAMPLE_RATE;
      const index = Math.floor(position) - this.inputOffset;
      const fraction = position - Math.floor(position);
      if (index >= source.length || (fraction > 0 && index + 1 >= source.length)) break;
      const sample = fraction ? source[index] + (source[index + 1] - source[index]) * fraction : source[index];
      writeSample(view, written, sample);
      written += 2;
      this.outputSamples++;
    }
    const consumed = Math.min(source.length, Math.floor(this.outputSamples * this.sampleRate / INPUT_SAMPLE_RATE) - this.inputOffset);
    this.carry = source.slice(consumed);
    this.inputOffset += consumed;
    return toBase64(bytes.subarray(0, written));
  }

  // Finish the interpolation tail and reset. Incomplete 16 kHz intervals are discarded.
  flush(): string | undefined {
    const targetSamples = Math.floor(this.inputSamples * INPUT_SAMPLE_RATE / this.sampleRate);
    const bytes = new Uint8Array((targetSamples - this.outputSamples) * 2);
    const view = new DataView(bytes.buffer);
    const last = this.carry[this.carry.length - 1] ?? 0;
    for (let offset = 0; offset < bytes.length; offset += 2) writeSample(view, offset, last);
    this.carry = new Float32Array(0);
    this.inputOffset = 0;
    this.inputSamples = 0;
    this.outputSamples = 0;
    return toBase64(bytes);
  }
}

export function encodePcm16(samples: Float32Array, sampleRate: number): string | undefined {
  const encoder = new Pcm16Encoder(sampleRate);
  const packet = encoder.encode(samples);
  const tail = encoder.flush();
  if (!tail) return packet;
  return btoa((packet ? atob(packet) : '') + atob(tail));
}

// The transport supplies raw mono PCM16; playback uses the separate 24 kHz rate.
export function decodePcm16(base64: string): Float32Array {
  if (typeof base64 !== 'string') throw new Error('Invalid PCM16 base64 packet.');
  if (base64.length > Math.ceil(MAX_PCM16_SAMPLES * 2 / 3) * 4) throw new Error('PCM16 packet is too large.');
  if (base64.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) throw new Error('Invalid PCM16 base64 packet.');
  let binary: string;
  try { binary = atob(base64); } catch { throw new Error('Invalid PCM16 base64 packet.'); }
  if (binary.length % 2 || btoa(binary) !== base64) throw new Error('Invalid PCM16 byte length or base64 packet.');
  if (binary.length > MAX_PCM16_SAMPLES * 2) throw new Error('PCM16 packet is too large.');
  const samples = new Float32Array(binary.length / 2);
  for (let index = 0; index < samples.length; index++) {
    const value = binary.charCodeAt(index * 2) | (binary.charCodeAt(index * 2 + 1) << 8);
    samples[index] = (value >= 0x8000 ? value - 0x10000 : value) / 32_768;
  }
  return samples;
}
