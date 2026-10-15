import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { FIXTURE_VIDEO_MANIFEST } from '../../services/companionFixtureVideo.js';

let shippedVideo: Promise<Buffer> | null = null;

// The bytes are part of the deployment, independent of temporary uploads and
// object-store cleanup. Never substitute a different file after a failed check.
export function loadFixtureVideoBytes(): Promise<Buffer> {
  if (!shippedVideo) {
    shippedVideo = readFile(resolve(process.cwd(), 'api/_lib/assets/fixtures/companion-video-v1.mp4')).then(bytes => {
      if (bytes.length !== FIXTURE_VIDEO_MANIFEST.sizeBytes || createHash('sha256').update(bytes).digest('hex') !== FIXTURE_VIDEO_MANIFEST.sha256) throw new Error('Fixture video integrity check failed.');
      return bytes;
    }).catch(error => { shippedVideo = null; throw error; });
  }
  return shippedVideo;
}
