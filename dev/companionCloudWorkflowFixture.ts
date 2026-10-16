// DEV ONLY: shared HTTP seam for linked-workflow browser fixtures. No cloud/provider connection.
import type { CloudFixtureRpc } from '../services/companionCloudFixtures';
import type { VideoLibraryItem } from '../types';
import type { CloudFixtureResultReceipt } from '../services/companionFixtureResults';
import { verifyFixtureResultVideoBlob } from '../services/companionFixtureVideo';
import { readFixtureInputVerification, verifyFixtureInputs } from '../services/companionInputVerification';
import type { FixtureInputVerificationClient } from '../components/CompanionChat/CompanionCloudFixtureJobs';

export function cloudWorkflowFixtureInputVerification(ownerId: string): FixtureInputVerificationClient {
  return {
    simulation: true,
    read: intent => readFixtureInputVerification(intent, cloudWorkflowFixtureRpc(ownerId), async () => ownerId),
    verify: intent => verifyFixtureInputs(intent, async (_input, init) => fetch('/__fixture-cloud-workflow/verify-inputs', { ...init, headers: { 'x-fixture-owner': ownerId, 'content-type': 'application/json' } }), async () => ({ ownerId, accessToken: 'fixture-session' })),
  };
}

export function cloudWorkflowFixtureRpc(ownerId: string): CloudFixtureRpc {
  return async (name, args) => {
    const response = await fetch(`/__fixture-cloud-workflow/rpc/${encodeURIComponent(name)}`, {
      method: 'POST', headers: { 'x-fixture-owner': ownerId, 'content-type': 'application/json' },
      body: JSON.stringify(args ?? {}),
    });
    if (!response.ok) throw new Error('The shared linked-workflow fixture backend is unavailable.');
    return response.json();
  };
}

export function cloudWorkflowFixtureVideoLoader(ownerId: string) {
  return async (receipt: CloudFixtureResultReceipt, signal?: AbortSignal): Promise<Blob> => {
    if (receipt.ownerId !== ownerId || receipt.status !== 'READY') throw new Error('This fixture video is unavailable for the current preview account.');
    const response = await fetch(`/__fixture-cloud-workflow/video?p_request_id=${encodeURIComponent(receipt.requestId)}`, {
      headers: { 'x-fixture-owner': ownerId }, cache: 'no-store', signal,
    });
    if (!response.ok) throw new Error('The saved fixture video is unavailable. Refresh the result and try opening it again.');
    const blob = await verifyFixtureResultVideoBlob(await response.blob());
    if (signal?.aborted) throw new DOMException('The fixture video request was cancelled.', 'AbortError');
    return blob;
  };
}

export function cloudWorkflowFixtureVideoLibrary(ownerId: string) {
  return async (): Promise<VideoLibraryItem[]> => {
    const response = await fetch('/__fixture-cloud-workflow/library', { headers: { 'x-fixture-owner': ownerId }, cache: 'no-store' });
    if (!response.ok) throw new Error('The existing video library is unavailable.');
    return response.json();
  };
}
