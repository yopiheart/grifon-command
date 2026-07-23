import { isIP } from 'node:net';

function isBlockedIpv4(hostname: string): boolean {
  const octets = hostname.split('.').map(Number);
  const [a, b, c, d] = octets;
  return (
    a === 127 ||
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    (a === 0 && b === 0 && c === 0 && d === 0)
  );
}

function isBlockedIpv6(hostname: string): boolean {
  if (hostname === '::1') return true;

  const firstHextet = Number.parseInt(hostname.split(':', 1)[0], 16);
  if ((firstHextet & 0xffc0) === 0xfe80 || (firstHextet & 0xfe00) === 0xfc00) {
    return true;
  }

  const mapped = hostname.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (!mapped) return false;
  const high = Number.parseInt(mapped[1], 16);
  const low = Number.parseInt(mapped[2], 16);
  return isBlockedIpv4(
    `${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`
  );
}

function blocked(message: string): never {
  throw new Error(`ssrf_blocked: ${message}`);
}

export function assertSafeMediaUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    blocked('invalid URL');
  }

  if (parsed.protocol !== 'https:') blocked('non-https scheme');

  const hostname = parsed.hostname
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '')
    .toLowerCase();
  const ipVersion = isIP(hostname);
  if (
    (ipVersion === 4 && isBlockedIpv4(hostname)) ||
    (ipVersion === 6 && isBlockedIpv6(hostname)) ||
    hostname === 'localhost' ||
    hostname === 'metadata.google.internal' ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.local')
  ) {
    blocked('private/internal host');
  }

  const allowlist = (process.env.MEDIA_HOST_ALLOWLIST ?? '')
    .split(',')
    .map((suffix) => suffix.trim().replace(/\.$/, '').toLowerCase())
    .filter(Boolean);
  if (allowlist.length > 0 && !allowlist.some((suffix) => hostname.endsWith(suffix))) {
    blocked('host not in MEDIA_HOST_ALLOWLIST');
  }

  // This checks only the literal hostname, not its DNS-resolved IP. DNS
  // rebinding remains possible until a follow-up resolves and pins the IP.
}
