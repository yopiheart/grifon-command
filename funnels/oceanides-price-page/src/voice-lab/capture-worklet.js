class VoiceLabCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.blocks = [];
    this.length = 0;
    this.batchSize = Math.round(sampleRate * 0.02);
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;
    this.blocks.push(new Float32Array(channel));
    this.length += channel.length;
    if (this.length >= this.batchSize) {
      const samples = new Float32Array(this.length);
      let offset = 0;
      let energy = 0;
      for (const block of this.blocks) {
        samples.set(block, offset);
        offset += block.length;
        for (const value of block) energy += value * value;
      }
      this.port.postMessage({ samples: samples.buffer, rms: Math.sqrt(energy / this.length), frames: this.length }, [samples.buffer]);
      this.blocks = [];
      this.length = 0;
    }
    return true;
  }
}

registerProcessor('voice-lab-capture', VoiceLabCapture);
