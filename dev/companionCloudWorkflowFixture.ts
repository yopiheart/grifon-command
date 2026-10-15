// DEV ONLY: shared HTTP seam for linked-workflow browser fixtures. No cloud/provider connection.
import type { CloudFixtureRpc } from '../services/companionCloudFixtures';

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
