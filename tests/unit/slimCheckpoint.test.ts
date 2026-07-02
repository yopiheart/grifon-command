import { describe, it, expect } from 'vitest';
import { slimCheckpointArtifacts } from '../../services/producerRunService.js';

// The transport-boundary guard for the checkpoint-size bug (2026-07-02 SIGLA smoke):
// multi-MB base64 scene images rode the artifacts jsonb TWICE (storyboard[] + scenes[]),
// blowing the 2mb parser cap / hitting statement timeouts → stale checkpoints → resume
// re-bought images. Base64 data-URLs must never reach the checkpoint POST; hosted/http
// urls (videos, final renders) must pass through untouched.

const DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg';

describe('slimCheckpointArtifacts', () => {
  it('strips base64 data-URL images from storyboard[] and scenes[] but keeps hosted urls', () => {
    const artifacts = {
      gate: 'storyboard',
      storyboard: [
        { scriptLine: 'Hook', imageUrl: DATA_URL, endFrameImageUrl: DATA_URL, transitionEffect: 'morph' },
        { scriptLine: 'L1', imageUrl: 'https://cdn.example/scene1.png' },
      ],
      scenes: [
        { sceneIdx: 0, status: 'done', imageUrl: DATA_URL, videoUrl: 'https://cdn.example/v0.mp4' },
        { sceneIdx: 1, status: 'pending' },
      ],
    };

    const slim = slimCheckpointArtifacts(artifacts) as any;

    expect(slim.storyboard[0].imageUrl).toBeUndefined();
    expect(slim.storyboard[0].endFrameImageUrl).toBeUndefined();
    expect(slim.storyboard[0].transitionEffect).toBe('morph'); // non-image fields survive
    expect(slim.storyboard[1].imageUrl).toBe('https://cdn.example/scene1.png'); // hosted url passes
    expect(slim.scenes[0].imageUrl).toBeUndefined();
    expect(slim.scenes[0].videoUrl).toBe('https://cdn.example/v0.mp4'); // videos untouched
    expect(slim.gate).toBe('storyboard');
  });

  it('filters base64 entries out of businessInfo.productImageUrls (durable copy lives in run input)', () => {
    const slim = slimCheckpointArtifacts({
      businessInfo: { product: 'Brew', productImageUrls: [DATA_URL, 'https://cdn.example/hero.png'] },
    }) as any;

    expect(slim.businessInfo.productImageUrls).toEqual(['https://cdn.example/hero.png']);
    expect(slim.businessInfo.product).toBe('Brew');
  });

  it('is pure — never mutates the caller\'s artifacts (the live in-memory run state)', () => {
    const artifacts = {
      storyboard: [{ imageUrl: DATA_URL }],
      scenes: [{ sceneIdx: 0, imageUrl: DATA_URL }],
      businessInfo: { productImageUrls: [DATA_URL] },
    };

    slimCheckpointArtifacts(artifacts);

    expect(artifacts.storyboard[0].imageUrl).toBe(DATA_URL);
    expect(artifacts.scenes[0].imageUrl).toBe(DATA_URL);
    expect(artifacts.businessInfo.productImageUrls).toEqual([DATA_URL]);
  });

  it('the slimmed checkpoint for an 8-scene run stays far under the 2mb parser cap', () => {
    const fatImage = 'data:image/png;base64,' + 'A'.repeat(400_000); // ~400kb per image
    const artifacts = {
      storyboard: Array.from({ length: 8 }, (_, i) => ({ scriptLine: `L${i}`, imageUrl: fatImage, endFrameImageUrl: i === 0 ? fatImage : undefined })),
      scenes: Array.from({ length: 8 }, (_, i) => ({ sceneIdx: i, status: 'done', imageUrl: fatImage })),
    };

    const slimBytes = JSON.stringify(slimCheckpointArtifacts(artifacts)).length;

    expect(JSON.stringify(artifacts).length).toBeGreaterThan(6_000_000); // the old payload: doomed
    expect(slimBytes).toBeLessThan(10_000); // the new payload: trivial
  });
});
