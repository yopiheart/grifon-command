// Immutable shipped sample bytes. This fixture is never generated from user inputs.
export const FIXTURE_VIDEO_MANIFEST = Object.freeze({
  id: 'grifon-companion-fixture-video-v1',
  version: 'v1',
  mimeType: 'video/mp4',
  durationSeconds: 8,
  width: 360,
  height: 640,
  sizeBytes: 19302,
  sha256: '18a1f643983fec42567a1fc31f59d1fcf386e6c927ca71c56fc7917029f5a7e2',
} as const);

export async function verifyFixtureResultVideoBlob(blob: Blob): Promise<Blob> {
  if (blob.type !== FIXTURE_VIDEO_MANIFEST.mimeType || blob.size !== FIXTURE_VIDEO_MANIFEST.sizeBytes) throw new Error('The fixture video did not match the saved sample.');
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  const sha256 = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  if (sha256 !== FIXTURE_VIDEO_MANIFEST.sha256) throw new Error('The fixture video did not match the saved sample.');
  return blob;
}
