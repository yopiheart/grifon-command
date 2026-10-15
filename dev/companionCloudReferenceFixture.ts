// DEV ONLY: transport bridge for Playwright's shared fixture backend. No provider connection.
import type { CloudReferenceTransport } from '../services/companionCloudReferences';

const ROOT = '/__fixture-cloud-references';

export function cloudReferenceFixtureTransport(ownerId: string): CloudReferenceTransport {
  const headers = { 'x-fixture-owner': ownerId };
  return {
    rpc: async (name, args) => {
      const response = await fetch(`${ROOT}/rpc/${encodeURIComponent(name)}`, {
        method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify(args ?? {}),
      });
      if (!response.ok) throw new Error('The shared cloud reference fixture backend is unavailable.');
      return response.json();
    },
    upload: async (path, blob) => {
      const response = await fetch(`${ROOT}/storage/${encodeURIComponent(path)}`, {
        method: 'PUT', headers: { ...headers, 'content-type': blob.type }, body: blob,
      });
      if (!response.ok) return { error: { code: String(response.status), message: 'Fixture media upload was not confirmed.' } };
      return { error: null };
    },
    download: async path => {
      const response = await fetch(`${ROOT}/storage/${encodeURIComponent(path)}`, { headers });
      if (!response.ok) return { data: null, error: { code: String(response.status), message: 'Fixture media is unavailable.' } };
      return { data: await response.blob(), error: null };
    },
  };
}
