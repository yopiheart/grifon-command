import { AwsClient } from 'aws4fetch';

// Thin S3-compatible client for Cloudflare R2 (zero egress). Used by the
// MEDIA_STORE facade (api/_lib/mediaStore.ts) when MEDIA_STORE='r2'. R2 speaks
// the S3 API, so aws4fetch (~3 KB, no AWS SDK in the serverless bundle) signs
// requests with SigV4. Keys use the same `${uid}/...` scheme as the Supabase
// bucket, so ownership checks upstream are unchanged.
//
// This module is dormant until MEDIA_STORE='r2' is set and the R2_* env is
// populated (Phase 2 of workflows/r2_media_migration.md). With the default
// MEDIA_STORE='supabase', nothing here is invoked.

let _client: AwsClient | null = null;
let _config: { endpoint: string; bucket: string } | null = null;

interface R2Config {
  client: AwsClient;
  endpoint: string;
  bucket: string;
}

const getConfig = (): R2Config => {
  if (_client && _config) return { client: _client, ..._config };

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      'R2_NOT_CONFIGURED: set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET in env.'
    );
  }

  _client = new AwsClient({ accessKeyId, secretAccessKey, region: 'auto', service: 's3' });
  _config = { endpoint: `https://${accountId}.r2.cloudflarestorage.com`, bucket };
  return { client: _client, ..._config };
};

// Encode each path segment but keep the `/` separators so `${uid}/foo.mp4`
// addresses a nested key, not a single literal-slash object name.
const encodeKey = (key: string): string => key.split('/').map(encodeURIComponent).join('/');

const objectUrl = (key: string): string => {
  const { endpoint, bucket } = getConfig();
  return `${endpoint}/${bucket}/${encodeKey(key)}`;
};

// Hour-floored X-Amz-Date (YYYYMMDDTHHMMSSZ). Holding the signing timestamp
// constant for the whole hour makes the presigned URL byte-identical across
// requests, so the browser/CDN can serve cache hits instead of forcing fresh
// origin reads (the cached-egress win from the design doc, option 4b).
const hourBucketedAmzDate = (): string => {
  const d = new Date();
  d.setUTCMinutes(0, 0, 0);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
};

export const putObject = async (
  key: string,
  body: Buffer,
  contentType: string,
  cacheControl?: string
): Promise<void> => {
  const { client } = getConfig();
  const headers: Record<string, string> = { 'Content-Type': contentType };
  if (cacheControl) headers['Cache-Control'] = cacheControl;
  // A Node Buffer is a valid runtime fetch body, but TS's DOM BodyInit (with the
  // newer typed-array generics) doesn't accept Buffer/Uint8Array<ArrayBufferLike>.
  // Cast once — aws4fetch hashes the bytes for SigV4 either way.
  const res = await client.fetch(objectUrl(key), {
    method: 'PUT',
    body: body as unknown as BodyInit,
    headers,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`r2_put_failed_${res.status}:${detail.slice(0, 200)}`);
  }
};

// Presigned GET URL valid for `ttlSec` from now. The signing time is floored to
// the hour and the expiry is padded by an hour so the URL stays valid for the
// full requested window even when minted near the end of a bucket.
export const presignGet = async (
  key: string,
  ttlSec: number,
  downloadName?: string
): Promise<string> => {
  const { client } = getConfig();
  const url = new URL(objectUrl(key));
  url.searchParams.set('X-Amz-Expires', String(ttlSec + 3600));
  if (downloadName) {
    url.searchParams.set('response-content-disposition', `attachment; filename="${downloadName}"`);
  }
  const signed = await client.sign(url.toString(), {
    method: 'GET',
    aws: { signQuery: true, datetime: hourBucketedAmzDate() },
  });
  return signed.url;
};

export const getObjectText = async (key: string): Promise<string | null> => {
  const { client } = getConfig();
  const res = await client.fetch(objectUrl(key), { method: 'GET' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`r2_get_failed_${res.status}`);
  return res.text();
};

export const deleteObjects = async (keys: string[]): Promise<void> => {
  const { client } = getConfig();
  // R2 supports the batch DeleteObjects POST, but a per-key DELETE keeps the
  // client dependency-free of an XML builder and tolerates partial 404s (an
  // already-reaped object is not an error for our callers).
  await Promise.all(
    keys.map(async (k) => {
      const res = await client.fetch(objectUrl(k), { method: 'DELETE' });
      if (!res.ok && res.status !== 404) {
        throw new Error(`r2_delete_failed_${res.status}`);
      }
    })
  );
};

export interface R2ListEntry {
  key: string;
  size: number | null;
  lastModified: string | null;
}

export interface R2ListResult {
  objects: R2ListEntry[];
  prefixes: string[]; // CommonPrefixes (folder-like) when a delimiter is used
}

// ListObjectsV2 with a `/` delimiter so the result mirrors a directory listing:
// `objects` are the keys directly under `prefix`, `prefixes` are the sub-folders.
export const listPrefix = async (prefix: string, limit = 1000): Promise<R2ListResult> => {
  const { client, endpoint, bucket } = getConfig();
  const normalizedPrefix = prefix ? (prefix.endsWith('/') ? prefix : `${prefix}/`) : '';
  const qs = new URLSearchParams({
    'list-type': '2',
    'max-keys': String(limit),
    delimiter: '/',
  });
  if (normalizedPrefix) qs.set('prefix', normalizedPrefix);

  const res = await client.fetch(`${endpoint}/${bucket}?${qs.toString()}`, { method: 'GET' });
  if (!res.ok) throw new Error(`r2_list_failed_${res.status}`);
  const xml = await res.text();

  const objects: R2ListEntry[] = [];
  for (const block of xml.match(/<Contents>[\s\S]*?<\/Contents>/g) ?? []) {
    const key = block.match(/<Key>([\s\S]*?)<\/Key>/)?.[1];
    if (!key) continue;
    const size = block.match(/<Size>(\d+)<\/Size>/)?.[1];
    const lastModified = block.match(/<LastModified>([\s\S]*?)<\/LastModified>/)?.[1];
    objects.push({
      key,
      size: size ? Number(size) : null,
      lastModified: lastModified ?? null,
    });
  }

  const prefixes: string[] = [];
  for (const block of xml.match(/<CommonPrefixes>[\s\S]*?<\/CommonPrefixes>/g) ?? []) {
    const p = block.match(/<Prefix>([\s\S]*?)<\/Prefix>/)?.[1];
    if (p) prefixes.push(p);
  }

  return { objects, prefixes };
};
