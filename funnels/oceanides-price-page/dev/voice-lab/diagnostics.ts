export type ProviderPhase = 'connecting' | 'socket_open' | 'session_created' | 'configured';
const transportCodes = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ECONNRESET', 'EPIPE', 'ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT', 'ABORT_ERR', 'CERT_HAS_EXPIRED', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN', 'ERR_TLS_CERT_ALTNAME_INVALID', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY', 'CERT_UNTRUSTED']);
const providerCodes = new Set(['invalid_api_key', 'authentication_error', 'permission_denied', 'insufficient_quota', 'rate_limit_exceeded', 'model_not_found', 'invalid_request_error', 'unsupported_model', 'session_expired']);
export type TransportCategory = 'dns' | 'tls' | 'refused' | 'reset' | 'timeout' | 'unknown' | 'missing_credential' | 'invalid_credential_format' | 'invalid_response';
export interface ProviderDiagnostic { phase: ProviderPhase; elapsedMs: number; httpStatus: number | null; closeCode: number | null; transportCode: string | null; providerCode: string | null }
export interface ProviderCheck { httpStatus: number | null; transportCategory: TransportCategory | null; credentialFormatPlausible: boolean | null; keyBlocked: boolean | null; keyDisabled: boolean | null; teamBlocked: boolean | null; allModels: boolean | null; allEndpoints: boolean | null; pinnedModelAcl: boolean | null }

const object = (value: unknown): Record<string, unknown> | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
export function safeHttpStatus(value: unknown) { return typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599 ? value : null; }
export function safeCloseCode(value: unknown) { return typeof value === 'number' && Number.isInteger(value) && value >= 1000 && value <= 4999 ? value : null; }
export function safeTransportCode(error: unknown): string | null {
  try {
    const record = object(error);
    const code = record?.code ?? object(record?.cause)?.code;
    return typeof code === 'string' && transportCodes.has(code) ? code : null;
  } catch { return null; }
}
export function safeProviderCode(error: unknown): string | null {
  try { const code = object(error)?.code; return typeof code === 'string' && providerCodes.has(code) ? code : null; } catch { return null; }
}
export function transportCategory(error: unknown): TransportCategory {
  const code = safeTransportCode(error);
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'dns';
  if (code && ['CERT_HAS_EXPIRED', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN', 'ERR_TLS_CERT_ALTNAME_INVALID', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY', 'CERT_UNTRUSTED'].includes(code)) return 'tls';
  if (code === 'ECONNREFUSED') return 'refused';
  if (code === 'ECONNRESET' || code === 'EPIPE') return 'reset';
  if (code && ['ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT', 'ABORT_ERR'].includes(code)) return 'timeout';
  return 'unknown';
}
export function diagnosticMessage(value: ProviderDiagnostic) {
  return `Provider operation failed: phase=${value.phase}; elapsedMs=${value.elapsedMs}; httpStatus=${value.httpStatus ?? 'unknown'}; closeCode=${value.closeCode ?? 'unknown'}; transportCode=${value.transportCode ?? 'unclassified'}; providerCode=${value.providerCode ?? 'unclassified'}. No automatic retry or booking was made.`;
}

export function credentialFormatPlausible(key: string | undefined): boolean {
  const trimmed = key?.trim() ?? '';
  return trimmed.startsWith('xai-') && trimmed.length > 4 && !/[\s'"]/.test(trimmed);
}

const emptyCheck = (): ProviderCheck => ({ httpStatus: null, transportCategory: null, credentialFormatPlausible: null, keyBlocked: null, keyDisabled: null, teamBlocked: null, allModels: null, allEndpoints: null, pinnedModelAcl: null });
const boolean = (value: unknown) => typeof value === 'boolean' ? value : null;

async function limitedJson(response: Response) {
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > 65_536) { await reader.cancel(); return null; }
      chunks.push(chunk.value);
    }
    const data = Buffer.concat(chunks);
    try { return object(JSON.parse(data.toString('utf8'))); } finally { data.fill(0); }
  } finally { reader.releaseLock(); }
}

/** Explicit read-only account check. No generation, WebSocket, redirect or retry. */
export async function checkProviderKey(key: string | undefined, fetcher: typeof fetch = fetch): Promise<ProviderCheck> {
  const result = emptyCheck();
  if (!key?.trim()) return { ...result, transportCategory: 'missing_credential' };
  result.credentialFormatPlausible = credentialFormatPlausible(key);
  if (!result.credentialFormatPlausible) return { ...result, transportCategory: 'invalid_credential_format' };
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => { controller.abort(); reject(new Error()); }, 8000);
    if (typeof timeout !== 'number') timeout.unref();
  });
  try {
    const operation = (async () => {
      const response = await fetcher('https://api.x.ai/v1/api-key', { method: 'GET', headers: { Authorization: `Bearer ${key.trim()}`, Accept: 'application/json' }, redirect: 'error', signal: controller.signal });
      result.httpStatus = safeHttpStatus(response.status);
      if (response.status !== 200) { try { await response.body?.cancel(); } catch { /* Discard without inspecting the response. */ } return result; }
      const data = await limitedJson(response);
      if (!data) return { ...result, transportCategory: 'invalid_response' as const };
      result.keyBlocked = boolean(data.api_key_blocked);
      result.keyDisabled = boolean(data.api_key_disabled);
      result.teamBlocked = boolean(data.team_blocked);
      if (Array.isArray(data.acls)) {
        result.allModels = data.acls.includes('api-key:model:*');
        result.allEndpoints = data.acls.includes('api-key:endpoint:*');
        result.pinnedModelAcl = result.allModels || data.acls.includes('api-key:model:grok-voice-3.0');
      }
      return result;
    })();
    return await Promise.race([operation, deadline]);
  } catch (error) {
    return { ...result, transportCategory: controller.signal.aborted ? 'timeout' : transportCategory(error) };
  } finally { if (timeout !== undefined) clearTimeout(timeout); }
}
