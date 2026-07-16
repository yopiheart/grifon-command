import { describe, it, expect } from 'vitest';
import { slimCheckpointInput } from '../../services/producerRunService.js';

// Transport-boundary guard for the checkpoint create bug (2026-07-14 try_on gate run):
// a RAW-read upload (2.6MB PNG → ~3.5MB data-URL) rode run.input and 413'd against
// api/producer/run's 2mb bodyParser cap → the run row was never created → the video
// stage died on run_not_found. slimCheckpointInput drops only strings that both start
// with 'data:' AND exceed 700KB; anything compressImageForUpload emits stays intact.

const fatDataUrl = 'data:image/png;base64,' + 'A'.repeat(800_000); // ~800kb — over the cap
const smallDataUrl = 'data:image/png;base64,' + 'A'.repeat(1_000); // ~1kb — a compressed upload

describe('slimCheckpointInput', () => {
  it('drops an oversized nested data-URL but keeps sibling fields', () => {
    const slim = slimCheckpointInput({
      brand: 'Grifon',
      avatar: { url: fatDataUrl, name: 'Presenter' },
    }) as any;

    expect(slim.avatar.url).toBeUndefined();
    expect(slim.avatar.name).toBe('Presenter');
    expect(slim.brand).toBe('Grifon');
  });

  it('keeps a small (compressed) data-URL untouched', () => {
    const slim = slimCheckpointInput({ hero: smallDataUrl }) as any;
    expect(slim.hero).toBe(smallDataUrl);
  });

  it('keeps long non-data-URL strings (e.g. a long prompt)', () => {
    const longPrompt = 'x'.repeat(900_000);
    const slim = slimCheckpointInput({ prompt: longPrompt }) as any;
    expect(slim.prompt).toBe(longPrompt);
  });

  it('is pure — never mutates the caller\'s input', () => {
    const input = { avatar: { url: fatDataUrl } };
    slimCheckpointInput(input);
    expect(input.avatar.url).toBe(fatDataUrl);
  });

  it('walks arrays — drops the fat url inside servicePhotos[] but keeps siblings', () => {
    const slim = slimCheckpointInput({
      servicePhotos: [{ url: fatDataUrl, slot: 'hero' }],
    }) as any;

    expect(slim.servicePhotos[0].url).toBeUndefined();
    expect(slim.servicePhotos[0].slot).toBe('hero');
  });
});
