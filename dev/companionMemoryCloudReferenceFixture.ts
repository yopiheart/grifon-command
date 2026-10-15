// DEV ONLY: isolated page-memory input service for the existing cloud-job RPC harness.
// This grants no real cloud, provider or spending authority. The native client still verifies input links.
import type { CloudReferenceTransport } from '../services/companionCloudReferences';

const receipts = new Map<string, Record<string, unknown>>();
const objects = new Map<string, Blob>();

export function memoryCloudReferenceFixtureTransport(ownerId: string): CloudReferenceTransport {
  return {
    rpc: async (name, args) => {
      const saveId = String(args?.p_save_id ?? ''), key = `${ownerId}:${saveId}`, existing = receipts.get(key);
      if (name === 'grifon_reference_reserve') {
        const receipt = existing ?? { runtime: 'supabase-cloud-reference-v1', ownerId, saveId, sourceChatId: args?.p_source_chat_id,
          manifestText: args?.p_manifest_text, createdAt: Date.now(), committed: false };
        receipts.set(key, receipt); return { data: receipt, error: null };
      }
      if (name === 'grifon_reference_commit' && existing) {
        const receipt = { ...existing, committed: true }; receipts.set(key, receipt); return { data: receipt, error: null };
      }
      if (name === 'grifon_reference_get') return { data: existing?.committed ? existing : null, error: null };
      if (name === 'grifon_reference_list') return { data: [...receipts.values()].filter(receipt => receipt.ownerId === ownerId && receipt.committed), error: null };
      return { data: null, error: { code: 'PGRST202' } };
    },
    upload: async (path, blob) => {
      if (!path.startsWith(ownerId + '/')) return { error: { code: '42501' } };
      if (objects.has(path)) return { error: { code: '409' } };
      objects.set(path, blob); return { error: null };
    },
    download: async path => {
      const blob = path.startsWith(ownerId + '/') ? objects.get(path) : null;
      return blob ? { data: blob, error: null } : { data: null, error: { code: '404' } };
    },
  };
}
