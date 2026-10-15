import type { VideoLibraryItem } from '../types';
import { getSupabase } from './supabaseClient';
import { FIXTURE_VIDEO_MANIFEST, verifyFixtureResultVideoBlob } from './companionFixtureVideo';
import { fixtureResultMediaPath, validateCloudFixtureResultReceipt, type CloudFixtureResultReceipt } from './companionFixtureResults';

const aborted = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new DOMException('The fixture video request was cancelled.', 'AbortError');
};

// Read the existing private video library. This never opens a generation flow.
export async function listCompanionVideoLibrary(): Promise<VideoLibraryItem[]> {
  const { listVideoLibrary } = await import('./geminiService');
  return listVideoLibrary();
}

// Fetch a private sample only for the current receipt owner. Object URLs belong to
// the mounted view and are never persisted in a chat, receipt or Assets record.
export async function loadFixtureResultVideo(receipt: CloudFixtureResultReceipt, signal?: AbortSignal): Promise<Blob> {
  aborted(signal);
  const client = getSupabase();
  const { data: { session } } = await client.auth.getSession();
  if (!session || session.user.id !== receipt.ownerId) throw new Error('Sign in to the account that owns this fixture video.');
  await validateCloudFixtureResultReceipt(receipt, session.user.id);
  if (receipt.status !== 'READY') throw new Error('This fixture video is not ready to open.');
  aborted(signal);
  const response = await fetch(fixtureResultMediaPath(receipt), {
    method: 'GET', headers: { Authorization: `Bearer ${session.access_token}` },
    cache: 'no-store', signal,
  });
  if (!response.ok) throw new Error('The saved fixture video is unavailable. Refresh the result and try opening it again.');
  if (response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== FIXTURE_VIDEO_MANIFEST.mimeType) throw new Error('The fixture video returned an unexpected file type.');
  const length = response.headers.get('content-length');
  if (length !== null && Number(length) !== FIXTURE_VIDEO_MANIFEST.sizeBytes) throw new Error('The fixture video did not match the saved sample.');
  const blob = await verifyFixtureResultVideoBlob(await response.blob());
  aborted(signal);
  const { data: { session: current } } = await client.auth.getSession();
  if (!current || current.user.id !== receipt.ownerId) throw new Error('The active account changed. Open this result again from the correct account.');
  return blob;
}
